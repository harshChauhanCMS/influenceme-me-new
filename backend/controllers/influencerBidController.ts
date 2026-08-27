import { Request, Response } from "express";
import mongoose from "mongoose";
import InfluencerBid from "../models/influencerBid";
import Campaign from "../models/campaign";
import User from "../models/user";
import { ChatRoom, Message } from "../models/chat";
import InfluencerBrandDeal from "../models/influencerBrandDeal";
import Agreement from "../models/agreement";
import { generateInfluencerBrandAgreement } from "../services/agreementService";
import { errorResponse, successResponse } from "../utils/responseHelper";
import { createAndSend } from "../services/notificationService";

/**
 * Submit a bid/application for a campaign
 * POST /api/influencer-bid/submit
 */
export const submitBid = async (req: Request, res: Response) => {
    try {
        const { campaignId, bidAmount, proposedValue, message } = req.body;
        const influencerId = req.user?.id;

        if (!influencerId) {
            return errorResponse(res, "Unauthorized. Please login.", 401);
        }

        if (!campaignId) {
            return errorResponse(res, "Campaign ID is required.", 400);
        }

        // 1. Fetch campaign to validate and get brand ID
        const campaign = await Campaign.findById(campaignId);
        if (!campaign) {
            return errorResponse(res, "Campaign not found.", 404);
        }

        // 2. Check if campaign is still accepting bids
        const now = new Date();
        if (
            campaign.status === "completed" ||
            campaign.status === "paused" ||
            campaign.status === "expired" ||
            (campaign.endDate && campaign.endDate < now)
        ) {
            return errorResponse(res, "Campaign is not accepting bids.", 400);
        }

        // 3. Validate bid amount for auction campaigns
        if (campaign.type === "auction") {
            if (!bidAmount) {
                return errorResponse(res, "Bid amount is required for auction campaigns.", 400);
            }
            if (campaign.minBid && bidAmount < campaign.minBid) {
                return errorResponse(
                    res,
                    `Bid amount must be at least ₹${campaign.minBid}.`,
                    400
                );
            }
            // Validate bid amount must be less than campaign budget
            if (campaign.budget && bidAmount >= campaign.budget) {
                return errorResponse(
                    res,
                    `Bid amount must be less than the campaign budget (₹${campaign.budget.toLocaleString('en-IN')}).`,
                    400
                );
            }
        }

        // 4. Check if influencer already has an active bid for this campaign
        const existingBid = await InfluencerBid.findOne({
            campaignId,
            influencerId,
            isActive: true,
        });

        if (existingBid) {
            return errorResponse(
                res,
                "You have already submitted a bid for this campaign.",
                400
            );
        }

        // 5. Create the bid
        const bid = await InfluencerBid.create({
            campaignId,
            influencerId,
            brandId: campaign.createdBy.toString(),
            bidAmount: campaign.type === "auction" ? bidAmount : undefined,
            proposedValue,
            message,
            status: "pending",
            isActive: true,
        });

        console.log(`✅ Bid submitted: Influencer ${influencerId} → Campaign ${campaignId}`);

        // Notify brand about the new application
        const influencerName = (req as any).user?.name ?? (await User.findById(influencerId).select("name").lean())?.name ?? "An influencer";
        const campaignName = (campaign as any).name || "Your campaign";
        const brandId = new mongoose.Types.ObjectId(campaign.createdBy.toString());
        createAndSend(
            brandId,
            "campaign_application_received",
            "New application for your campaign",
            `${influencerName} applied to "${campaignName}".`,
            { campaignId: String(campaignId), bidId: String(bid._id) },
        ).catch((err) => console.error("Failed to send campaign application notification", err));

        return successResponse(
            res,
            "Bid submitted successfully!",
            {
                bidId: bid._id,
                status: bid.status,
                createdAt: bid.createdAt,
            },
            201
        );
    } catch (error: any) {
        console.error("Error submitting bid:", error);
        return errorResponse(res, error.message || "Failed to submit bid.", 500);
    }
};

/**
 * Get all bids for an influencer (my bids)
 * GET /api/influencer-bid/my-bids
 */
export const getMyBids = async (req: Request, res: Response) => {
    try {
        const influencerId = req.user?.id;
        const { page = 1, limit = 20, status } = req.query as any;

        if (!influencerId) {
            return errorResponse(res, "Unauthorized. Please login.", 401);
        }

        const filter: any = {
            influencerId,
            isActive: true,
        };

        if (status) {
            filter.status = status;
        }

        const bids = await InfluencerBid.find(filter)
            .sort({ createdAt: -1 })
            .limit(Number(limit))
            .skip((Number(page) - 1) * Number(limit));

        const total = await InfluencerBid.countDocuments(filter);

        // Populate campaign details
        const bidsWithCampaigns = await Promise.all(
            bids.map(async (bid) => {
                const campaign = await Campaign.findById(bid.campaignId).select(
                    "name image type compensationType budget minBid status"
                );
                return {
                    ...bid.toObject(),
                    campaign,
                };
            })
        );

        return successResponse(
            res,
            "Bids retrieved successfully.",
            bidsWithCampaigns,
            200,
            {
                currentPage: Number(page),
                totalPages: Math.ceil(total / Number(limit)),
                total,
            }
        );
    } catch (error: any) {
        console.error("Error fetching my bids:", error);
        return errorResponse(res, error.message || "Failed to fetch bids.", 500);
    }
};

/**
 * Get bid details by ID
 * GET /api/influencer-bid/details/:bidId
 */
export const getBidDetails = async (req: Request, res: Response) => {
    try {
        const { bidId } = req.params;
        const userId = req.user?.id;

        if (!userId) {
            return errorResponse(res, "Unauthorized. Please login.", 401);
        }

        const bid = await InfluencerBid.findById(bidId);
        if (!bid) {
            return errorResponse(res, "Bid not found.", 404);
        }

        // Check authorization
        if (bid.influencerId !== userId && bid.brandId !== userId) {
            return errorResponse(res, "Unauthorized to view this bid.", 403);
        }

        // Populate campaign details
        const campaign = await Campaign.findById(bid.campaignId).populate(
            "createdBy",
            "name email businessInfo profilePictureUrl"
        );

        return successResponse(res, "Bid details retrieved.", {
            ...bid.toObject(),
            campaign,
        });
    } catch (error: any) {
        console.error("Error fetching bid details:", error);
        return errorResponse(res, error.message || "Failed to fetch bid details.", 500);
    }
};

/**
 * Withdraw a bid
 * POST /api/influencer-bid/withdraw/:bidId
 */
export const withdrawBid = async (req: Request, res: Response) => {
    try {
        const { bidId } = req.params;
        const influencerId = req.user?.id;

        if (!influencerId) {
            return errorResponse(res, "Unauthorized. Please login.", 401);
        }

        if (!bidId || !/^[0-9a-fA-F]{24}$/.test(bidId)) {
            return errorResponse(res, "Invalid bid ID.", 400);
        }

        const bid = await InfluencerBid.findById(bidId);
        if (!bid) {
            return errorResponse(res, "Bid not found.", 404);
        }

        // Check authorization (normalize to string for reliable comparison)
        if (String(bid.influencerId) !== String(influencerId)) {
            return errorResponse(res, "Unauthorized to withdraw this bid.", 403);
        }

        // Check if bid can be withdrawn
        if (bid.status === "accepted") {
            return errorResponse(res, "Cannot withdraw an accepted bid.", 400);
        }

        if (bid.status === "withdrawn") {
            return successResponse(res, "Bid is already withdrawn.", {
                bidId: bid._id,
                status: bid.status,
            });
        }

        // Update bid status
        bid.status = "withdrawn";
        bid.isActive = false;
        bid.withdrawnAt = new Date();
        await bid.save();

        console.log(`✅ Bid withdrawn: ${bidId}`);

        return successResponse(res, "Bid withdrawn successfully.", {
            bidId: bid._id,
            status: bid.status,
        });
    } catch (error: any) {
        console.error("Error withdrawing bid:", error);
        return errorResponse(res, error.message || "Failed to withdraw bid.", 500);
    }
};

/**
 * Get all bids for a campaign (for brand)
 * GET /api/influencer-bid/campaign/:campaignId/bids
 */
export const getCampaignBids = async (req: Request, res: Response) => {
    try {
        const { campaignId } = req.params;
        const brandId = req.user?.id;
        const { page = 1, limit = 20, status } = req.query as any;

        console.log('🔍 getCampaignBids called:', { campaignId, brandId, page, limit, status });

        if (!brandId) {
            return errorResponse(res, "Unauthorized. Please login.", 401);
        }

        if (!campaignId) {
            return errorResponse(res, "Campaign ID is required.", 400);
        }

        // Verify campaign ownership
        const campaign = await Campaign.findById(campaignId);
        if (!campaign) {
            return errorResponse(res, "Campaign not found.", 404);
        }

        if (campaign.createdBy.toString() !== brandId) {
            return errorResponse(res, "Unauthorized to view these bids.", 403);
        }

        const filter: any = {
            campaignId,
            isActive: true,
        };

        if (status) {
            filter.status = status;
        }

        const bids = await InfluencerBid.find(filter)
            .sort({ createdAt: -1 })
            .limit(Number(limit))
            .skip((Number(page) - 1) * Number(limit))
            .lean();

        const total = await InfluencerBid.countDocuments(filter);

        console.log(`📊 Found ${bids.length} bids, total: ${total}`);

        // If no bids, return empty array
        if (bids.length === 0) {
            return successResponse(
                res,
                "Campaign bids retrieved successfully.",
                [],
                200,
                {
                    currentPage: Number(page),
                    totalPages: 0,
                    total: 0,
                }
            );
        }

        // Try to populate influencer data, but don't fail if it errors
        let bidsWithInfluencer = bids;
        try {
            // Collect all unique influencer IDs
            const userIds = new Set<string>();
            bids.forEach((bid: any) => {
                if (bid.influencerId) {
                    userIds.add(bid.influencerId.toString());
                }
            });

            console.log(`👥 Collecting influencer data for ${userIds.size} unique influencers`);

            // Convert string IDs to ObjectIds for MongoDB query (same pattern as other controllers)
            const objectIdUserIds: mongoose.Types.ObjectId[] = [];
            Array.from(userIds).forEach(id => {
                try {
                    if (mongoose.Types.ObjectId.isValid(id)) {
                        objectIdUserIds.push(new mongoose.Types.ObjectId(id));
                    } else {
                        console.warn(`⚠️ Invalid ObjectId format for influencer: ${id}`);
                    }
                } catch (error) {
                    console.warn(`⚠️ Error converting influencer ID to ObjectId: ${id}`, error);
                }
            });

            // Fetch all influencers in one query
            let influencers: any[] = [];
            if (objectIdUserIds.length > 0) {
                influencers = await User.find({ 
                    _id: { $in: objectIdUserIds }
                })
                .select('name email profilePictureUrl')
                .lean();
                
                console.log(`✅ Fetched ${influencers.length} influencers for ${objectIdUserIds.length} IDs`);
            }

            // Create a map for quick lookup (using string IDs as keys)
            const influencerMap = new Map<string, any>();
            influencers.forEach((inf: any) => {
                const idString = inf._id.toString();
                influencerMap.set(idString, inf);
            });

            // Transform bids to include influencer data
            bidsWithInfluencer = bids.map((bid: any) => {
                const bidObj = { ...bid };
                const influencerIdString = bid.influencerId ? String(bid.influencerId) : null;
                const influencer = influencerIdString ? influencerMap.get(influencerIdString) : null;
                
                if (influencer) {
                    bidObj.influencer = {
                        _id: influencer._id.toString(),
                        name: influencer.name,
                        email: influencer.email,
                        profilePictureUrl: influencer.profilePictureUrl,
                    };
                }
                return bidObj;
            });
        } catch (populateError: any) {
            console.error('❌ Error populating influencer data, returning bids without influencer info:', populateError);
            // Return bids without influencer data if population fails
            bidsWithInfluencer = bids;
        }

        console.log(`✅ Returning ${bidsWithInfluencer.length} bids for campaign ${campaignId}`);

        return successResponse(
            res,
            "Campaign bids retrieved successfully.",
            bidsWithInfluencer,
            200,
            {
                currentPage: Number(page),
                totalPages: Math.ceil(total / Number(limit)),
                total,
            }
        );
    } catch (error: any) {
        console.error("❌ Error fetching campaign bids:", error);
        console.error("Error stack:", error.stack);
        return errorResponse(res, error.message || "Failed to fetch campaign bids.", 500);
    }
};

/**
 * Respond to a bid (for brand)
 * POST /api/influencer-bid/respond/:bidId
 */
export const respondToBid = async (req: Request, res: Response) => {
    try {
        const { bidId } = req.params;
        const { responseType, message } = req.body;
        const brandId = req.user?.id;

        if (!brandId) {
            return errorResponse(res, "Unauthorized. Please login.", 401);
        }

        if (!responseType || !["accepted", "rejected", "shortlisted"].includes(responseType)) {
            return errorResponse(
                res,
                "Invalid response type. Must be 'accepted', 'rejected', or 'shortlisted'.",
                400
            );
        }

        const bid = await InfluencerBid.findById(bidId);
        if (!bid) {
            return errorResponse(res, "Bid not found.", 404);
        }

        // Check authorization
        if (bid.brandId !== brandId) {
            return errorResponse(res, "Unauthorized to respond to this bid.", 403);
        }

        // Check if bid is still pending
        if (bid.status !== "pending" && bid.status !== "shortlisted") {
            return errorResponse(
                res,
                `Cannot respond to a bid with status '${bid.status}'.`,
                400
            );
        }

        // Update bid
        bid.status = responseType;
        bid.brandResponse = {
            responseType,
            message,
            respondedAt: new Date(),
        };
        await bid.save();

        console.log(`✅ Brand responded to bid ${bidId}: ${responseType}`);

        // Notify influencer about the response
        const campaign = await Campaign.findById(bid.campaignId).select("name").lean();
        const campaignName = (campaign as any)?.name || "the campaign";
        const influencerIdObj = new mongoose.Types.ObjectId(bid.influencerId);
        const notifType =
            responseType === "accepted"
                ? "campaign_bid_accepted"
                : responseType === "rejected"
                  ? "campaign_bid_rejected"
                  : "campaign_bid_shortlisted";
        const notifTitle =
            responseType === "accepted"
                ? "Your bid was accepted"
                : responseType === "rejected"
                  ? "Your bid was declined"
                  : "You were shortlisted";
        const notifMessage =
            responseType === "accepted"
                ? `Your application to "${campaignName}" was accepted.`
                : responseType === "rejected"
                  ? `Your application to "${campaignName}" was declined.`
                  : `You were shortlisted for "${campaignName}".`;
        createAndSend(influencerIdObj, notifType, notifTitle, notifMessage, {
            bidId: String(bid._id),
            campaignId: String(bid.campaignId),
            responseType,
        }).catch((err) => console.error("Failed to send bid response notification", err));

        return successResponse(res, "Response submitted successfully.", {
            bidId: bid._id,
            status: bid.status,
            brandResponse: bid.brandResponse,
        });
    } catch (error: any) {
        console.error("Error responding to bid:", error);
        return errorResponse(res, error.message || "Failed to respond to bid.", 500);
    }
};

/**
 * Check if user has bid for a campaign
 * GET /api/influencer-bid/check/:campaignId
 */
export const checkUserBid = async (req: Request, res: Response) => {
    try {
        const { campaignId } = req.params;
        const influencerId = req.user?.id;

        if (!influencerId) {
            return errorResponse(res, "Unauthorized. Please login.", 401);
        }

        const bid = await InfluencerBid.findOne({
            campaignId,
            influencerId,
            isActive: true,
        });

        return successResponse(res, "Bid check completed.", {
            hasBid: !!bid,
            bid: bid || null,
        });
    } catch (error: any) {
        console.error("Error checking user bid:", error);
        return errorResponse(res, error.message || "Failed to check bid.", 500);
    }
};

/**
 * Create a deal from an accepted bid (brand only)
 * POST /api/influencer-bid/:bidId/create-deal
 */
export const createDealFromBid = async (req: Request, res: Response) => {
    try {
        const { bidId } = req.params;
        const brandId = req.user?.id;

        if (!brandId) {
            return errorResponse(res, "Unauthorized. Please login.", 401);
        }

        const bid = await InfluencerBid.findById(bidId);
        if (!bid) {
            return errorResponse(res, "Bid not found.", 404);
        }

        if (bid.brandId !== brandId) {
            return errorResponse(res, "Only the campaign owner can create a deal from this bid.", 403);
        }

        if (bid.status !== "accepted") {
            return errorResponse(res, "Deal can only be created from an accepted bid.", 400);
        }

        const existingDealId = (bid as any).dealId;
        if (existingDealId) {
            const existingDeal = await InfluencerBrandDeal.findById(existingDealId).lean();
            return successResponse(res, "Deal already created for this bid.", existingDeal || { _id: existingDealId });
        }

        const campaign = await Campaign.findById(bid.campaignId).lean();
        if (!campaign) {
            return errorResponse(res, "Campaign not found.", 404);
        }

        const brand = await User.findById(bid.brandId).select("role").lean();
        const influencer = await User.findById(bid.influencerId).select("role").lean();
        if (!brand || !influencer) {
            return errorResponse(res, "Brand or influencer not found.", 404);
        }

        const brandOid = new mongoose.Types.ObjectId(bid.brandId);
        const influencerOid = new mongoose.Types.ObjectId(bid.influencerId);
        const roomQuery = { chatType: "influencer-brand" as const, isActive: true };

        let room = await ChatRoom.findOne({
            ...roomQuery,
            participants: { $all: [bid.brandId, bid.influencerId] },
        });
        if (!room) {
            room = await ChatRoom.findOne({
                ...roomQuery,
                participants: { $all: [brandOid, influencerOid] },
            });
        }

        if (!room) {
            room = new ChatRoom({
                participants: [bid.brandId, bid.influencerId],
                participantRoles: [brand.role as any, influencer.role as any],
                chatType: "influencer-brand",
                isActive: true,
            });
            try {
                await room.save();
            } catch (saveError: any) {
                if (saveError.code === 11000 || saveError.message?.includes("duplicate")) {
                    room = await ChatRoom.findOne({
                        ...roomQuery,
                        participants: { $all: [brandOid, influencerOid] },
                    });
                    if (!room) {
                        room = await ChatRoom.findOne({
                            ...roomQuery,
                            participants: { $all: [bid.brandId, bid.influencerId] },
                        });
                    }
                    if (!room) {
                        room = (await ChatRoom.find({ participants: { $all: [brandOid, influencerOid] }, isActive: true }).limit(1))[0] || null;
                    }
                    if (!room) {
                        room = (await ChatRoom.find({ participants: { $all: [bid.brandId, bid.influencerId] }, isActive: true }).limit(1))[0] || null;
                    }
                    if (!room) throw saveError;
                } else {
                    throw saveError;
                }
            }
        }

        const campaignAny = campaign as any;
        const agreedAmount = bid.bidAmount ?? campaignAny.budget;
        const agreedDeadline = campaignAny.endDate ? new Date(campaignAny.endDate) : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
        const finalDeliverables = bid.proposedValue ? [bid.proposedValue] : (campaignAny.deliverables?.map((d: any) => d.description).filter(Boolean) ?? []);

        const dealData = {
            brandId: bid.brandId,
            influencerId: bid.influencerId,
            campaignId: bid.campaignId,
            roomId: (room._id as mongoose.Types.ObjectId).toString(),
            status: "agreement-pending",
            message: (bid.brandResponse as any)?.message || "Deal created from accepted bid.",
            finalTerms: {
                agreedAmount,
                agreedDeadline,
                finalRequirements: [],
                finalDeliverables,
            },
            dealAt: new Date(),
            isActive: true,
        };

        const newDeal = new InfluencerBrandDeal(dealData);
        const savedDeal = await newDeal.save();

        try {
            const agreementFileUrl = await generateInfluencerBrandAgreement(savedDeal._id.toString());
            const agreement = new Agreement({
                dealId: savedDeal._id,
                dealType: "influencer-brand",
                agreementFile: agreementFileUrl,
                brandAgreed: false,
                influencerAgreed: false,
                isActive: true,
            });
            await agreement.save();
            savedDeal.agreementFile = agreementFileUrl;
            savedDeal.agreementAt = new Date();
            await savedDeal.save();
        } catch (agreementError: any) {
            console.error("Error generating agreement for bid deal:", agreementError);
        }

        bid.set("dealId", savedDeal._id);
        await bid.save();

        const campaignName = campaignAny.name || "the campaign";
        createAndSend(
            new mongoose.Types.ObjectId(bid.influencerId),
            "campaign_deal_created",
            "Deal ready for agreement",
            `A deal has been created for "${campaignName}". Review and agree to the agreement to start the collaboration.`,
            { bidId: String(bid._id), campaignId: String(bid.campaignId), dealId: String(savedDeal._id) },
        ).catch((err) => console.error("Failed to send deal created notification", err));

        const dealPojo = await InfluencerBrandDeal.findById(savedDeal._id).lean();
        return successResponse(res, "Deal created successfully. Both parties can now review and agree to the agreement.", dealPojo, 201);
    } catch (error: any) {
        console.error("Error creating deal from bid:", error);
        return errorResponse(res, error.message || "Failed to create deal.", 500);
    }
};



