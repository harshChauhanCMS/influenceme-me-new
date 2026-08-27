import { Request, Response } from "express";
import {errorResponse, successResponse} from "../utils/responseHelper";
import Campaign from "../models/campaign";
import {AuthenticatedRequest} from "../middleware/auth";
import InfluencerOffer from "../models/influencerOffer"; // NEW Import for Offer Model
import InfluencerBrandDeal from "../models/influencerBrandDeal"; // NEW Import for Deal Model
import InfluencerBid from "../models/influencerBid"; // NEW Import for Bid Model
import { fileStorageService } from '../services/fileStorageService';
import { notifyAllUsersWithFcmTokens } from '../services/notificationService';

// ✅ Create a new campaign
export const createCampaign = async (req: AuthenticatedRequest, res: Response) => {
    try {
        const userId = req.user?.id;
        const imageFile = req.file;

        // Image: use URL from body (e.g. from /api/file/upload) or upload file
        let imageUrl: string | null = null;
        if (req.body.image && typeof req.body.image === 'string' && req.body.image.trim()) {
            imageUrl = req.body.image.trim();
        } else if (imageFile) {
            try {
                imageUrl = await fileStorageService.uploadFile(imageFile, 'campaign_images');
            } catch (error: any) {
                console.error('Campaign image upload failed:', error.message);
                return errorResponse(res, `Campaign image upload failed: ${error.message}`, 500);
            }
        }

        const campaignData: any = {
            ...req.body,
            createdBy: userId,
            image: imageUrl,
            startDate: new Date(req.body.startDate),
            endDate: new Date(req.body.endDate),
        };

        // Parse stringified arrays
        if (typeof req.body.deliverables === "string") {
            campaignData.deliverables = JSON.parse(req.body.deliverables);
        }
        if (typeof req.body.locations === "string") {
            campaignData.locations = JSON.parse(req.body.locations);
        }

        // Parse number fields from FormData (they come as strings)
        if (req.body.budget) {
            campaignData.budget = parseInt(req.body.budget, 10);
        }
        if (req.body.minBid) {
            campaignData.minBid = parseInt(req.body.minBid, 10);
        }
        if (req.body.targetEngagement) {
            campaignData.targetEngagement = parseFloat(req.body.targetEngagement);
        }

        const campaign = await Campaign.create(campaignData);

        const status = (campaign as any).status;
        if (status === "active" || status === "upcoming") {
            const campaignName = (campaign as any).name || "New campaign";
            const campaignId = (campaign as any)._id?.toString();
            notifyAllUsersWithFcmTokens(
                "new_campaign",
                "New campaign available",
                campaignName,
                campaignId ? { campaignId } : undefined,
            ).catch((err) =>
                console.error("Failed to notify users of new campaign:", err),
            );
        }

        return successResponse(
            res,
            "Campaign created successfully",
            campaign,
        )
    } catch (error: any) {
        console.error("Error creating campaign:", error);
        return errorResponse(res, `Campaign creation failed: ${error}`, 500);
    }
};

// ✅ Update existing campaign
export const updateCampaign = async (req: AuthenticatedRequest, res: Response) => {
    try {
        const { id } = req.params;
        const userId = req.user?.id;
        const imageFile = req.file;

        // Image: use URL from body (e.g. from /api/file/upload) or upload file
        let imageUrl: string | null = null;
        if (req.body.image && typeof req.body.image === 'string' && req.body.image.trim()) {
            imageUrl = req.body.image.trim();
        } else if (imageFile) {
            try {
                imageUrl = await fileStorageService.uploadFile(imageFile, 'campaign_images');
            } catch (error: any) {
                console.error('Campaign image upload failed:', error.message);
                return errorResponse(res, `Campaign image upload failed: ${error.message}`, 500);
            }
        }

        const campaign = await Campaign.findOne({ _id: id, createdBy: userId });

        if (!campaign) {
            return errorResponse(res, `Campaign with id ${id} not found`);
        }

        const campaignData: any = {
            ...req.body,
        };

        if (req.body.startDate) campaignData.startDate = new Date(req.body.startDate);
        if (req.body.endDate) campaignData.endDate = new Date(req.body.endDate);
        if (imageUrl) {
            campaignData.image = imageUrl;
        }

        if (typeof req.body.deliverables === "string") {
            campaignData.deliverables = JSON.parse(req.body.deliverables);
        }
        if (typeof req.body.locations === "string") {
            campaignData.locations = JSON.parse(req.body.locations);
        }

        // Parse number fields from FormData (they come as strings)
        if (req.body.budget) {
            campaignData.budget = parseInt(req.body.budget, 10);
        }
        if (req.body.minBid) {
            campaignData.minBid = parseInt(req.body.minBid, 10);
        }
        if (req.body.targetEngagement) {
            campaignData.targetEngagement = parseFloat(req.body.targetEngagement);
        }

        const updatedCampaign = await Campaign.findByIdAndUpdate(id, campaignData, {
            new: true,
            runValidators: true,
        });

        return successResponse(res, `Campaign updated successfully successfully!`, updatedCampaign, 200);

    } catch (error: any) {
        console.error("Error updating campaign:", error);
        return errorResponse(res, `Campaign update failed: ${error}`, 500);
    }
};

// ✅ Get campaigns: admin sees all (or filter by createdBy); brand/vendor see only their own
export const getUserCampaigns = async (req: AuthenticatedRequest, res: Response) => {
    try {
        const userId = req.user?.id;
        const role = req.user?.role;
        const createdByQuery = req.query.createdBy as string | undefined;
        let filter: { createdBy?: string } = {};
        if (role === "admin") {
            if (createdByQuery) filter.createdBy = createdByQuery;
        } else {
            // Brand/vendor: only their own; ignore createdBy or enforce it equals self
            filter.createdBy = createdByQuery && createdByQuery === userId ? createdByQuery : userId;
        }
        const campaigns = await Campaign.find(filter).sort({ createdAt: -1 });

        console.log('📋 Backend getUserCampaigns - Found', campaigns.length, 'campaigns');
        if (campaigns.length > 0) {
            console.log('📋 First campaign sample:', {
                _id: campaigns[0]._id,
                name: campaigns[0].name,
                hasId: !!campaigns[0]._id
            });
        }

        return successResponse(
            res,
            "Campaign getUsers successfully",
            campaigns,
            200,
        );

    } catch (error: any) {
        console.error("Error fetching user campaigns:", error);
        res.status(500).json({
            success: false,
            message: error.message || "Failed to fetch campaigns",
        });
    }
};

// ✅ Get single campaign details (public access)
export const getCampaignDetails = async (req: Request, res: Response)=> {
    try {
        // NOTE: The userId here is expected to be the influencer ID checking their offer status.
        // It's generally safer to derive the ID from req.user?.id if the route is authenticated.
        const { id, userId } = req.body; // Campaign ID is 'id', Influencer ID is 'userId'

        if (!id) {
            return errorResponse(res, "Campaign ID is required.", 400);
        }

        // 1. Fetch Campaign Details
        const campaign = await Campaign.findById(id).populate("createdBy", "name email phone phoneCode profilePictureUrl businessInfo addresses instagram facebook twitter linkedin website youtube");

        if (!campaign) {
            return errorResponse(
                res,
                "Campaign not found",
                404
            );
        }

        const result: any = campaign.toObject();
        result.userOffer = null;
        result.userDeal = null;
        result.userBid = null;

        // 2. Check for existing Offer/Deal/Bid if a userId (Influencer) is provided
        if (userId) {
            // Find the active offer for this influencer on this campaign
            const offer = await InfluencerOffer.findOne({
                influencerId: userId,
                campaignId: id,
                isActive: true,
            });

            if (offer) {
                // Attach the basic offer details to the result
                result.userOffer = {
                    id: offer._id,
                    status: offer.status,
                    createdAt: offer.createdAt,
                    updatedAt: offer.updatedAt,
                    response: offer.response,
                    acceptedAt: offer.acceptedAt,
                    isActive: offer.isActive,
                };

                // If the offer has a linked deal (accepted), fetch and attach the deal details
                if (offer.deal) {
                    // Assuming offer.deal stores the ObjectId of the deal
                    const dealData = await InfluencerBrandDeal.findById(offer.deal).select('-__v');
                    if (dealData) {
                        result.userDeal = dealData.toObject();
                    }
                }
            }

            // Find the active bid for this influencer on this campaign
            const bid = await InfluencerBid.findOne({
                influencerId: userId,
                campaignId: id,
                isActive: true,
            });

            if (bid) {
                // Attach the bid details to the result
                result.userBid = {
                    id: bid._id,
                    bidAmount: bid.bidAmount,
                    proposedValue: bid.proposedValue,
                    message: bid.message,
                    status: bid.status,
                    brandResponse: bid.brandResponse,
                    createdAt: bid.createdAt,
                    updatedAt: bid.updatedAt,
                    isActive: bid.isActive,
                };
            }
        }

        return successResponse(res, "Successfully found", result, 200);

    } catch (error: any) {
        console.error("Error getting campaign details:", error);
        const statusCode = error.name === 'CastError' ? 400 : 500;
        return errorResponse(
            res,
            error.message || "Failed to fetch campaign details",
            statusCode
        );
    }
}

// ✅ Get all active campaigns (for influencers)
export const getAllCampaigns = async (req: Request, res: Response) => {
    try {
        const { 
            page = 1, 
            limit = 20, 
            type, 
            location, 
            minBudget, 
            maxBudget,
            search,
            compensationType,
            status
        } = req.query as any;

        const now = new Date();
        const showExpired = status === "expired";

        const filter: Record<string, any> = {
            status: status || { $in: ["active", "upcoming"] },
        };

        // For active/upcoming (default), only show campaigns that haven't ended
        if (!showExpired) {
            filter.endDate = { $gte: now };
        } else {
            // For expired tab: explicitly expired or past end date (still active/upcoming, not completed)
            filter.$or = [
                { status: "expired" },
                { endDate: { $lt: now }, status: { $in: ["active", "upcoming"] } },
            ];
            delete filter.status;
        }

        // Search functionality - search in name and description
        if (search && typeof search === 'string' && search.trim()) {
            filter.$or = [
                { name: { $regex: search.trim(), $options: 'i' } },
                { description: { $regex: search.trim(), $options: 'i' } }
            ];
        }

        // Filter by campaign type (standard, auction)
        if (type) filter.type = type;

        // Filter by compensation type (paid, barter)
        if (compensationType) filter.compensationType = compensationType;

        // Filter by location (search in locations array)
        if (location && typeof location === 'string' && location.trim()) {
            filter['locations.address'] = { $regex: location.trim(), $options: 'i' };
        }

        // Filter by budget range
        if (minBudget || maxBudget) {
            filter.budget = {};
            if (minBudget) filter.budget.$gte = parseFloat(minBudget);
            if (maxBudget) filter.budget.$lte = parseFloat(maxBudget);
        }

        console.log('📋 getAllCampaigns filter:', JSON.stringify(filter, null, 2));

        const campaigns = await Campaign.find(filter)
            .populate("createdBy", "name email businessInfo profilePictureUrl")
            .sort({ createdAt: -1 })
            .limit(Number(limit))
            .skip((Number(page) - 1) * Number(limit));

        const totalCount = await Campaign.countDocuments(filter);
        const totalPages = Math.ceil(totalCount / Number(limit));

        console.log(`✅ Found ${campaigns.length} campaigns (Total: ${totalCount})`);

        return successResponse(res, "Campaigns retrieved successfully", campaigns, 200, {
            currentPage: Number(page),
            totalPages,
            total: totalCount,
            hasNextPage: Number(page) < totalPages,
            hasPrevPage: Number(page) > 1,
        });
    } catch (error: any) {
        console.error("Error fetching all campaigns:", error);
        return errorResponse(res, error.message || "Failed to fetch campaigns", 500);
    }
};
