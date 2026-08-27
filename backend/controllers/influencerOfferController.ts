import {Request, Response} from "express";
import {successResponse, errorResponse} from "../utils/responseHelper";
import InfluencerOffer, {
    getInfluencerOfferResponseList,
    IInfluencerOffer,
} from "../models/influencerOffer";
import User from "../models/user";
import Campaign from "../models/campaign";
import {AuthenticatedRequest} from "../middleware/auth";
import InfluencerBrandDeal from "../models/influencerBrandDeal";
import { fileStorageService } from '../services/fileStorageService';
import { ChatRoom, Message } from "../models/chat";
import { formatNegotiationMessage } from "../utils/negotiationHelper";
import mongoose from "mongoose";
import Agreement from "../models/agreement";
import { generateInfluencerBrandAgreement } from "../services/agreementService";
import { createAndSend } from "../services/notificationService";

// ---------------------------------------------------------
// ✅ CREATE OFFER
// ---------------------------------------------------------
export const createOffer = async (req: AuthenticatedRequest, res: Response) => {
    try {
        // NOTE: Removing unused `offerDetails` validation as it is not reflected in the mongoose schema
        // The first "offer" is implicit when the brand creates the document.
        const {brandId, influencerId, campaignId, status = "pending"} = req.body;

        if (!brandId || !influencerId || !campaignId) {
            return errorResponse(res, "Missing required fields: brandId, influencerId, campaignId", 400);
        }

        // Validate campaign exists and is still open for offers
        const campaign = await Campaign.findById(campaignId);
        if (!campaign) {
            return errorResponse(res, "Campaign not found", 404);
        }

        const now = new Date();
        if (
            campaign.status === "completed" ||
            campaign.status === "paused" ||
            campaign.status === "expired" ||
            (campaign.endDate && campaign.endDate < now)
        ) {
            return errorResponse(res, "Campaign is not accepting new offers.", 400);
        }

        // Validate brand & influencer existence
        const brand = await User.findById(brandId);
        if (!brand) return errorResponse(res, "Brand not found", 404);

        const influencer = await User.findById(influencerId);
        if (!influencer) return errorResponse(res, "Influencer not found", 404);

        console.log("💰 Creating new offer:", {brandId, influencerId, campaignId});

        // Create Offer
        const offer = new InfluencerOffer({
            brandId: brandId,
            influencerId: influencerId,
            campaignId: campaignId,
            status: status,
            isActive: true,
            // roomId is expected to be added via chat service or later update
        });

        const savedOffer = await offer.save();

        console.log("✅ Offer created successfully:", savedOffer._id);

        const brandName =
            (brand as any).businessInfo?.businessName || (brand as any).name || "A brand";
        createAndSend(
            influencerId,
            "influencer_offer_received",
            "New offer from a brand",
            `${brandName} sent you an offer for a campaign.`,
            {
                offerId: (savedOffer as any)._id?.toString(),
                campaignId: campaignId.toString(),
                brandId: brandId.toString(),
            },
        ).catch((err) =>
            console.error("Failed to send influencer offer notification:", err),
        );

        return successResponse(res, "Offer created successfully", savedOffer.toObject());
    } catch (error: any) {
        console.error("❌ Error creating offer:", error);
        return errorResponse(res, "Failed to create offer", 500);
    }
};

// ---------------------------------------------------------
// ✅ GET USER OFFERS
// ---------------------------------------------------------
export const getUserOffers = async (req: AuthenticatedRequest, res: Response) => {
    try {
        console.log('🚀🚀🚀 getUserOffers CALLED 🚀🚀🚀');
        const userId = req.user?.id;
        const userRole = req.user?.role;
        const {page = "1", limit = "20", campaignId} = req.query;

        if (!userId || !userRole) {
            return errorResponse(res, "Unauthorized access", 403);
        }

        const query: Record<string, any> = {};
        if (userRole === "influencer") {
            query.influencerId = userId;
        } else {
            query.brandId = userId;
        }

        if (campaignId) {
            query.campaignId = campaignId;
            console.log("🎯 Filtering offers by campaign:", campaignId);
        }

        console.log("🔍 Query:", query);

        const skip = (parseInt(page) - 1) * parseInt(limit);

        const offers = await InfluencerOffer.find(query)
            .sort({createdAt: -1})
            .skip(skip)
            .limit(parseInt(limit))
            .lean();

        console.log('🔍 Found', offers.length, 'offers');

        const totalOffers = await InfluencerOffer.countDocuments(query);
        const totalPages = Math.ceil(totalOffers / parseInt(limit));

        // Collect all unique user IDs and campaign IDs for batch querying (like vendorBrandDealController)
        const userIds = new Set<string>();
        const campaignIds = new Set<string>();
        
        offers.forEach((offer) => {
            if (offer.influencerId) userIds.add(offer.influencerId.toString());
            if (offer.brandId) userIds.add(offer.brandId.toString());
            if (offer.campaignId) campaignIds.add(offer.campaignId.toString());
        });

        console.log('🔍 Backend getUserOffers - Found', userIds.size, 'unique userIds and', campaignIds.size, 'campaignIds');

        // Convert to ObjectIds for batch query
        const objectIdUserIds: mongoose.Types.ObjectId[] = [];
        Array.from(userIds).forEach(id => {
            if (mongoose.Types.ObjectId.isValid(id)) {
                objectIdUserIds.push(new mongoose.Types.ObjectId(id));
            }
        });

        const objectIdCampaignIds: mongoose.Types.ObjectId[] = [];
        Array.from(campaignIds).forEach(id => {
            if (mongoose.Types.ObjectId.isValid(id)) {
                objectIdCampaignIds.push(new mongoose.Types.ObjectId(id));
            }
        });

        // Batch fetch all users and campaigns
        const users = await User.find({ 
            _id: { $in: objectIdUserIds }
        })
            .select('name email phone profilePictureUrl role businessInfo addresses vendorInfo')
            .lean();

        const campaigns = await Campaign.find({ 
            _id: { $in: objectIdCampaignIds }
        }).lean();

        console.log('🔍 Backend getUserOffers - Found', users.length, 'users and', campaigns.length, 'campaigns');
        console.log('🔍 Backend getUserOffers - User IDs found:', users.map((u: any) => u._id.toString()).join(', '));

        // Create maps for quick lookup
        const userMap = new Map<string, any>();
        users.forEach((u: any) => {
            const idString = u._id.toString();
            userMap.set(idString, u);
            console.log('🔍 Backend getUserOffers - Added to userMap:', idString, '->', u.name);
        });

        const campaignMap = new Map<string, any>();
        campaigns.forEach((c: any) => {
            const idString = c._id.toString();
            campaignMap.set(idString, c);
        });

        console.log('🔍 Backend getUserOffers - userMap size:', userMap.size);
        console.log('🔍 Backend getUserOffers - userMap keys:', Array.from(userMap.keys()).join(', '));

        const transformedOffers = offers.map((offer) => {
                // Lookup from maps
                const brandIdString = offer.brandId?.toString() || '';
                const influencerIdString = offer.influencerId?.toString() || '';
                
                console.log('🔍 Backend getUserOffers - Processing offer:', offer._id);
                console.log('🔍 Backend getUserOffers - offer.brandId (raw):', offer.brandId, 'type:', typeof offer.brandId);
                console.log('🔍 Backend getUserOffers - brandIdString:', brandIdString);
                console.log('🔍 Backend getUserOffers - userMap has brandId?', userMap.has(brandIdString));
                
                const influencerData = influencerIdString ? userMap.get(influencerIdString) : null;
                const brandData = brandIdString ? userMap.get(brandIdString) : null;
                const campaign = offer.campaignId ? campaignMap.get(offer.campaignId.toString()) : null;

                // Debug logging
                console.log('🔍 Backend getUserOffers - brandData exists?', !!brandData);
                if (brandData) {
                    console.log('✅ Backend getUserOffers - brandData found!');
                    console.log('🔍 Backend getUserOffers - brandData keys:', Object.keys(brandData));
                    console.log('🔍 Backend getUserOffers - brandData._id:', brandData._id);
                    console.log('🔍 Backend getUserOffers - brandData.name:', brandData.name);
                    console.log('🔍 Backend getUserOffers - brandData.businessInfo:', brandData.businessInfo);
                } else {
                    console.log('❌ Backend getUserOffers - brandData is NULL! User.findById failed for:', offer.brandId);
                }

                // Ensure brandData is properly serialized
                let brandDataObj = null;
                if (brandData) {
                    try {
                        brandDataObj = JSON.parse(JSON.stringify(brandData));
                        console.log('✅ Backend getUserOffers - brandDataObj serialized successfully');
                        console.log('🔍 Backend getUserOffers - brandDataObj type:', typeof brandDataObj);
                    } catch (e) {
                        console.log('❌ Backend getUserOffers - Failed to serialize brandData:', e);
                    }
                }

                const influencerDataObj = influencerData ? JSON.parse(JSON.stringify(influencerData)) : null;
                const campaignObj = campaign ? JSON.parse(JSON.stringify(campaign)) : null;

                // CRITICAL: Manually construct brandId object EXACTLY like vendorBrandDealController does
                let finalBrandId: any = offer.brandId; // Default to string
                if (brandData) {
                    // Always construct as object with all fields explicitly
                    finalBrandId = {
                        _id: brandData._id?.toString() || brandData._id || offer.brandId,
                        name: brandData.name || null,
                        email: brandData.email || null,
                        phone: brandData.phone || null,
                        profilePictureUrl: brandData.profilePictureUrl || null,
                        role: brandData.role || null,
                        businessInfo: brandData.businessInfo || null,
                        addresses: brandData.addresses || null,
                        vendorInfo: brandData.vendorInfo || null,
                    };
                    console.log('✅ Backend getUserOffers - Constructed brandId as object with name:', finalBrandId.name);
                } else {
                    console.log('❌ Backend getUserOffers - brandData is NULL, keeping brandId as string:', offer.brandId);
                }

                // Construct influencerId object
                let finalInfluencerId: any = offer.influencerId; // Default to string
                if (influencerData) {
                    finalInfluencerId = {
                        _id: influencerData._id?.toString() || influencerData._id || offer.influencerId,
                        name: influencerData.name || null,
                        email: influencerData.email || null,
                        phone: influencerData.phone || null,
                        profilePictureUrl: influencerData.profilePictureUrl || null,
                        role: influencerData.role || null,
                        businessInfo: influencerData.businessInfo || null,
                        addresses: influencerData.addresses || null,
                        vendorInfo: influencerData.vendorInfo || null,
                    };
                }

                console.log('🔍 Backend getUserOffers - finalBrandId type:', typeof finalBrandId);
                console.log('🔍 Backend getUserOffers - finalBrandId is object?', typeof finalBrandId === 'object' && finalBrandId !== null && !Array.isArray(finalBrandId));

                // Create the response object - build it manually WITHOUT toObject() to prevent brandId override
                const responseObj: any = {
                    _id: offer._id?.toString() || offer._id,
                    // CRITICAL: Set brandId as object - manually constructed above
                    brandId: finalBrandId,
                    influencerId: finalInfluencerId,
                    campaignId: offer.campaignId?.toString() || offer.campaignId,
                    roomId: offer.roomId?.toString() || offer.roomId,
                    status: offer.status,
                    response: offer.response,
                    deal: offer.deal,
                    acceptedAt: offer.acceptedAt,
                    isActive: offer.isActive,
                    createdAt: offer.createdAt,
                    updatedAt: offer.updatedAt,
                    // Keep flat fields for backward compatibility
                    influencerName: influencerData?.name || "Unknown Influencer",
                    influencerEmail: influencerData?.email || "Not Specified",
                    brandName: brandData?.businessInfo?.businessName || brandData?.name || "Unknown Brand",
                    brandEmail: brandData?.businessInfo?.businessEmail || brandData?.email || "Not Specified",
                    offerValue: campaign?.budget || null,
                    campaign: campaignObj || null,
                    sentDate: offer.createdAt
                        ? new Date(offer.createdAt).toLocaleDateString("en-US", {
                            year: "numeric",
                            month: "short",
                            day: "numeric",
                        })
                        : "Recently",
                    // Correctly access message from the nested response object
                    responseMessage: offer.response?.message || null,
                };

                // Final verification before sending
                console.log('🔍 Backend getUserOffers - responseObj.brandId type:', typeof responseObj.brandId);
                console.log('🔍 Backend getUserOffers - responseObj.brandId is object?', typeof responseObj.brandId === 'object' && responseObj.brandId !== null);
                if (typeof responseObj.brandId === 'object' && responseObj.brandId !== null) {
                    console.log('✅ Backend getUserOffers - SENDING brandId as OBJECT with _id:', responseObj.brandId._id);
                } else {
                    console.log('❌ Backend getUserOffers - SENDING brandId as STRING:', responseObj.brandId);
                }

                return responseObj;
        });

        return successResponse(res, "Offers retrieved successfully", transformedOffers, 200, {
            currentPage: parseInt(page),
            totalPages: totalPages,
            totalCount: totalOffers,
            hasNextPage: parseInt(page) < totalPages,
            hasPrevPage: parseInt(page) > 1,
        });
    } catch (error: any) {
        console.error("❌ Error fetching offers:", error);
        return errorResponse(res, `Failed to fetch offers: ${error.message}`, 500);
    }
};

// ---------------------------------------------------------
// ✅ DELETE OFFER
// ---------------------------------------------------------
export const deleteOffer = async (req: AuthenticatedRequest, res: Response) => {
    try {
        const {id} = req.params;

        console.log("📋 Deleting offer with ID:", id);

        const offer = await InfluencerOffer.findById(id);
        if (!offer) return errorResponse(res, "Offer not found", 404);

        // Optional: Check if the offer is in a deletable state (e.g., draft/pending/declined, not accepted/running deal)

        await InfluencerOffer.deleteOne({_id: id});
        // Optional: Also delete related InfluencerBrandDeal if it exists (though it shouldn't if the status check above is in place)

        return successResponse(res, "Offer deleted successfully", { id });
    } catch (error: any) {
        console.error("❌ Error deleting offer:", error);
        return errorResponse(res, "Failed to delete offer", 500);
    }
};

// ---------------------------------------------------------
// ✅ GET OFFER DETAILS
// ---------------------------------------------------------
export const getOfferDetails = async (req: AuthenticatedRequest, res: Response) => {
    try {
        const {id} = req.params;

        const offer = await InfluencerOffer.findById(id);
        if (!offer) return errorResponse(res, "Offer not found", 404);

        // Batch query approach (same as getUserOffers)
        const userIds = new Set<string>();
        if (offer.influencerId) userIds.add(offer.influencerId.toString());
        if (offer.brandId) userIds.add(offer.brandId.toString());

        const objectIdUserIds: mongoose.Types.ObjectId[] = [];
        Array.from(userIds).forEach(id => {
            if (mongoose.Types.ObjectId.isValid(id)) {
                objectIdUserIds.push(new mongoose.Types.ObjectId(id));
            }
        });

        // Batch fetch users
        const users = await User.find({ 
            _id: { $in: objectIdUserIds }
        })
            .select('name email phone profilePictureUrl role businessInfo addresses vendorInfo')
            .lean();

        // Create map for lookup
        const userMap = new Map<string, any>();
        users.forEach((u: any) => {
            const idString = u._id.toString();
            userMap.set(idString, u);
        });

        // Fetch campaign
        let campaign = null;
        if (mongoose.Types.ObjectId.isValid(offer.campaignId)) {
            const campaignObjectId = new mongoose.Types.ObjectId(offer.campaignId);
            const campaignResults = await Campaign.find({ _id: campaignObjectId }).lean();
            campaign = campaignResults.length > 0 ? campaignResults[0] : null;
        }

        // Lookup from map
        const influencerData = offer.influencerId ? userMap.get(offer.influencerId.toString()) : null;
        const brandData = offer.brandId ? userMap.get(offer.brandId.toString()) : null;

        // Debug logging
        console.log('🔍 Backend getOfferDetails - offer.brandId:', offer.brandId);
        console.log('🔍 Backend getOfferDetails - brandData exists?', !!brandData);
        if (brandData) {
            console.log('✅ Backend getOfferDetails - brandData found!');
            console.log('🔍 Backend getOfferDetails - brandData keys:', Object.keys(brandData));
            console.log('🔍 Backend getOfferDetails - brandData._id:', brandData._id);
            console.log('🔍 Backend getOfferDetails - brandData.name:', brandData.name);
            console.log('🔍 Backend getOfferDetails - brandData.businessInfo:', brandData.businessInfo);
        } else {
            console.log('❌ Backend getOfferDetails - brandData is NULL! User.findById failed for:', offer.brandId);
        }

        // Ensure brandData is properly serialized
        let brandDataObj = null;
        if (brandData) {
            try {
                brandDataObj = JSON.parse(JSON.stringify(brandData));
                console.log('✅ Backend getOfferDetails - brandDataObj serialized successfully');
                console.log('🔍 Backend getOfferDetails - brandDataObj type:', typeof brandDataObj);
            } catch (e) {
                console.log('❌ Backend getOfferDetails - Failed to serialize brandData:', e);
            }
        }

        const influencerDataObj = influencerData ? JSON.parse(JSON.stringify(influencerData)) : null;
        const campaignObj = campaign ? JSON.parse(JSON.stringify(campaign)) : null;

        // CRITICAL: Manually construct brandId object EXACTLY like vendorBrandDealController does
        let finalBrandId: any = offer.brandId; // Default to string
        if (brandData) {
            finalBrandId = {
                _id: brandData._id?.toString() || brandData._id || offer.brandId,
                name: brandData.name || null,
                email: brandData.email || null,
                phone: brandData.phone || null,
                profilePictureUrl: brandData.profilePictureUrl || null,
                role: brandData.role || null,
                businessInfo: brandData.businessInfo || null,
                addresses: brandData.addresses || null,
                vendorInfo: brandData.vendorInfo || null,
            };
            console.log('✅ Backend getOfferDetails - Constructed brandId as object with name:', finalBrandId.name);
        } else {
            console.log('❌ Backend getOfferDetails - brandData is NULL, keeping brandId as string');
        }

        // Construct influencerId object
        let finalInfluencerId: any = offer.influencerId; // Default to string
        if (influencerData) {
            finalInfluencerId = {
                _id: influencerData._id?.toString() || influencerData._id || offer.influencerId,
                name: influencerData.name || null,
                email: influencerData.email || null,
                phone: influencerData.phone || null,
                profilePictureUrl: influencerData.profilePictureUrl || null,
                role: influencerData.role || null,
                businessInfo: influencerData.businessInfo || null,
                addresses: influencerData.addresses || null,
                vendorInfo: influencerData.vendorInfo || null,
            };
        }

        console.log('🔍 Backend getOfferDetails - finalBrandId type:', typeof finalBrandId);
        console.log('🔍 Backend getOfferDetails - finalBrandId is object?', typeof finalBrandId === 'object' && finalBrandId !== null);

        // Create the response object - build it manually WITHOUT toObject()
        const responseObj: any = {
            _id: offer._id?.toString() || offer._id,
            // CRITICAL: Set brandId as object - manually constructed above
            brandId: finalBrandId,
            influencerId: finalInfluencerId,
            campaignId: offer.campaignId?.toString() || offer.campaignId,
            roomId: offer.roomId?.toString() || offer.roomId,
            status: offer.status,
            response: offer.response,
            deal: offer.deal?.toString() || offer.deal,
            acceptedAt: offer.acceptedAt,
            isActive: offer.isActive,
            createdAt: offer.createdAt,
            updatedAt: offer.updatedAt,
            // Keep flat fields for backward compatibility
            influencerName: influencerData?.name || "Unknown Influencer",
            influencerEmail: influencerData?.email || "Not Specified",
            brandName: brandData?.businessInfo?.businessName || brandData?.name || "Unknown Brand",
            brandEmail: brandData?.businessInfo?.businessEmail || brandData?.email || "Not Specified",
            offerValue: campaign?.budget || null,
            campaign: campaignObj || null,
            sentDate: offer.createdAt
                ? new Date(offer.createdAt).toLocaleDateString("en-US", {
                    year: "numeric",
                    month: "short",
                    day: "numeric",
                })
                : "Recently",
            // Correctly access message from the nested response object
            responseMessage: offer.response?.message || null,
        };

        // Final verification before sending
        console.log('🔍 Backend getOfferDetails - responseObj.brandId type:', typeof responseObj.brandId);
        console.log('🔍 Backend getOfferDetails - responseObj.brandId is object?', typeof responseObj.brandId === 'object' && responseObj.brandId !== null);

        return successResponse(res, "Offer details fetched successfully", responseObj);
    } catch (error: any) {
        console.error("❌ Error fetching offer details:", error);
        return errorResponse(res, "Failed to fetch offer details", 500);
    }
};

// ---------------------------------------------------------
// ✅ RESPOND TO OFFER (Accept, Negotiate, Decline)
// ---------------------------------------------------------
export const influencerOfferResponse = async (req: AuthenticatedRequest, res: Response) => {
    try {
        const {id} = req.params;
        let savedDeal = null;

        // Extract uploaded file if present and upload to file storage microservice
        const agreementFile = req.file;
        let agreementFileUrl: string | null = null;
        if (agreementFile) {
            try {
                agreementFileUrl = await fileStorageService.uploadFile(agreementFile, 'agreements');
            } catch (error: any) {
                console.error('Agreement file upload failed:', error.message);
                return errorResponse(res, `Agreement file upload failed: ${error.message}`, 500);
            }
        }

        const offer = await InfluencerOffer.findById(id);
        if (!offer) return errorResponse(res, "Offer not found", 404);

        const {responseType, message, negotiationDetails, finalTerms} = req.body;

        if (!responseType) return errorResponse(res, "Missing required field: responseType", 400);
        if (!getInfluencerOfferResponseList().includes(responseType)) return errorResponse(res, "Invalid responseType", 400);

        // Base response object (will be updated regardless of responseType)
        const newResponse = {
            responseType: responseType,
            message: message,
            respondedAt: new Date(),
        };

        if (responseType === "accepted") {
            // --- ACCEPTED LOGIC: Create Deal ---

            if (!finalTerms || !finalTerms.agreedDeadline) {
                return errorResponse(res, "Final agreed deadline is mandatory for acceptance.", 400);
            }

            // 1. Get campaign to extract deliverables
            const campaign = await Campaign.findById(offer.campaignId).lean();
            if (!campaign) {
                return errorResponse(res, "Campaign not found", 404);
            }

            // 2. Prepare deliverables from campaign (story, posts, etc.)
            const campaignDeliverables = campaign.deliverables || [];
            const deliverablesList = campaignDeliverables.map((del: any) => 
                `${del.quantity} ${del.type}${del.description ? `: ${del.description}` : ''}`
            );

            // Merge campaign deliverables with any additional finalDeliverables from request
            const allDeliverables = finalTerms.finalDeliverables || [];
            if (deliverablesList.length > 0) {
                deliverablesList.forEach(del => {
                    if (!allDeliverables.includes(del)) {
                        allDeliverables.push(del);
                    }
                });
            }

            // 3. Prepare requirements - use from request or default from campaign description
            let finalRequirements = finalTerms.finalRequirements || [];
            if (finalRequirements.length === 0) {
                // If no requirements provided, use campaign description as default requirement
                if (campaign.description && campaign.description.trim().length > 0) {
                    finalRequirements = [campaign.description.trim()];
                } else {
                    // Fallback: create a default requirement based on deliverables
                    if (deliverablesList.length > 0) {
                        finalRequirements = [`Complete all deliverables: ${deliverablesList.join(', ')}`];
                    } else {
                        finalRequirements = ['Complete campaign requirements'];
                    }
                }
            }

            // 4. Update Offer Status and Date
            offer.status = "accepted";
            offer.acceptedAt = new Date();
            offer.set("response", {...newResponse}); // Set final acceptance message

            // 5. Create Influencer Brand Deal with all deliverables
            const dealData = {
                brandId: offer.brandId,
                influencerId: offer.influencerId,
                campaignId: offer.campaignId,
                roomId: offer.roomId,
                status: "agreement-pending", // Initial status - will change to "running" when both parties agree
                message: message || "Offer accepted, deal established.",
                finalTerms: {
                    agreedAmount: finalTerms.agreedAmount || campaign.budget,
                    agreedDeadline: new Date(finalTerms.agreedDeadline),
                    finalRequirements: finalRequirements,
                    finalDeliverables: allDeliverables.length > 0 ? allDeliverables : deliverablesList,
                },
                dealAt: offer.acceptedAt,
                agreementAt: offer.acceptedAt,
                isActive: true,
            };

            const newDeal = new InfluencerBrandDeal(dealData);
            savedDeal = await newDeal.save();

            // 6. Generate Agreement PDF automatically
            try {
                const agreementFileUrl = await generateInfluencerBrandAgreement(savedDeal._id.toString());
                
                // Create Agreement record
                const agreement = new Agreement({
                    dealId: savedDeal._id,
                    dealType: "influencer-brand",
                    agreementFile: agreementFileUrl,
                    brandAgreed: false,
                    influencerAgreed: false,
                    isActive: true,
                });
                await agreement.save();

                // Update deal with agreement file
                savedDeal.agreementFile = agreementFileUrl;
                savedDeal.agreementAt = new Date();
                await savedDeal.save();
            } catch (agreementError: any) {
                console.error("❌ Error generating agreement:", agreementError);
                // Don't fail the deal creation if agreement generation fails
            }

            // 7. Link Deal to Offer
            offer.set("deal", savedDeal._id);

        } else if (responseType === "negotiate") {
            // --- NEGOTIATE LOGIC: Send as Chat Message ---

            if (!negotiationDetails) {
                return errorResponse(res, "Negotiation details are required for responseType 'negotiate'.", 400);
            }

            // CRITICAL: DO NOT CHANGE OFFER STATUS - Keep it as-is (should be "pending")
            // Status will only change to "accepted" when both parties agree via acceptNegotiation endpoint
            // Use updateOne to update ONLY the response field, NOT the status
            const responseData = {
                ...newResponse,
                negotiationDetails: negotiationDetails,
            };
            
            // Update ONLY the response field using updateOne - this won't touch status
            await InfluencerOffer.updateOne(
                { _id: offer._id },
                { 
                    $set: { 
                        response: responseData
                    } 
                }
            );
            
            // Reload offer to get updated response (but status remains unchanged)
            await offer.populate('response');
            offer.set("response", responseData);

            // Get or create chat room
            let room = await ChatRoom.findOne({
                participants: { $all: [offer.brandId, offer.influencerId] },
                chatType: 'influencer-brand',
                isActive: true,
            });

            if (!room && offer.roomId) {
                room = await ChatRoom.findById(offer.roomId);
            }

            if (!room) {
                // Create chat room if it doesn't exist
                const brand = await User.findById(offer.brandId);
                const influencer = await User.findById(offer.influencerId);
                
                if (!brand || !influencer) {
                    return errorResponse(res, "Brand or influencer not found", 404);
                }

                room = new ChatRoom({
                    participants: [offer.brandId, offer.influencerId],
                    participantRoles: [brand.role as any, influencer.role as any],
                    chatType: 'influencer-brand',
                    isActive: true,
                });
                await room.save();

                // Update offer with roomId using updateOne - this won't touch status
                const roomIdStr = (room._id as mongoose.Types.ObjectId).toString();
                await InfluencerOffer.updateOne(
                    { _id: offer._id },
                    { $set: { roomId: roomIdStr } }
                );
                offer.roomId = roomIdStr;
            }

            // Format negotiation message
            const negotiationMessage = formatNegotiationMessage(
                message || 'I would like to negotiate the terms of this offer',
                negotiationDetails,
                offer.campaignId
            );

            // Send negotiation as chat message
            const chatMessage = new Message({
                roomId: room._id as mongoose.Types.ObjectId,
                senderId: req.user!._id,
                senderRole: req.user!.role as any,
                content: negotiationMessage,
                messageType: 'text',
                attachments: [JSON.stringify({
                    type: 'negotiation',
                    offerId: offer._id.toString(),
                    negotiationDetails: negotiationDetails,
                })],
                isRead: false,
                readBy: [req.user!._id],
            });

            await chatMessage.save();

            // Update room's last message
            await room.updateLastMessage(chatMessage._id as mongoose.Types.ObjectId);

            // Increment unread count for the other participant
            const otherParticipantId = req.user!._id.toString() === offer.brandId 
                ? offer.influencerId 
                : offer.brandId;
            await room.incrementUnreadCount(otherParticipantId);

            // Populate sender info for socket emission
            await chatMessage.populate('senderId', 'name profilePictureUrl role');

            // Emit socket event for real-time update
            const socketService = require('../services/socketService').default;
            if (socketService.io) {
                const senderInfo = chatMessage.senderId as any;
                const roomIdStr = String(room._id);
                
                const messagePayload = {
                    message: {
                        _id: String(chatMessage._id),
                        roomId: roomIdStr,
                        senderId: senderInfo ? {
                            _id: String(senderInfo._id || senderInfo.id),
                            name: senderInfo.name,
                            profilePictureUrl: senderInfo.profilePictureUrl,
                            role: senderInfo.role,
                        } : String(chatMessage.senderId),
                        senderRole: chatMessage.senderRole,
                        content: chatMessage.content,
                        messageType: chatMessage.messageType,
                        attachments: chatMessage.attachments || [],
                        isRead: chatMessage.isRead,
                        createdAt: chatMessage.createdAt instanceof Date 
                            ? chatMessage.createdAt.toISOString() 
                            : chatMessage.createdAt,
                        updatedAt: chatMessage.updatedAt instanceof Date 
                            ? chatMessage.updatedAt.toISOString() 
                            : chatMessage.updatedAt,
                    },
                };
                
                // CRITICAL: Emit to room - this is the primary way messages are delivered
                socketService.io.to(`room:${roomIdStr}`).emit('new_message', messagePayload);
                
                // Also emit to sender's socket directly (they might not be in room yet)
                // Find all sockets for the sender user
                const allSockets = await socketService.io.fetchSockets();
                const senderSockets = allSockets.filter((socket: any) => {
                    return socket.user && socket.user._id && socket.user._id.toString() === req.user!._id.toString();
                });
                
                senderSockets.forEach((socket: any) => {
                    socket.emit('new_message', messagePayload);
                });
                
                // Also emit to receiver's socket directly
                const receiverId = otherParticipantId;
                const receiverSockets = allSockets.filter((socket: any) => {
                    return socket.user && socket.user._id && socket.user._id.toString() === receiverId;
                });
                
                receiverSockets.forEach((socket: any) => {
                    socket.emit('new_message', messagePayload);
                });
                
                console.log(`📤 Emitted negotiation message to room:${roomIdStr}`);
                console.log(`📤 Sender sockets: ${senderSockets.length}, Receiver sockets: ${receiverSockets.length}`);
                console.log(`📤 Message attachments: ${JSON.stringify(chatMessage.attachments)}`);
                console.log(`📤 Full message payload: ${JSON.stringify(messagePayload).substring(0, 500)}`);
            } else {
                console.error('❌ Socket service not initialized - negotiation message not emitted');
            }

        } else if (responseType === "decline") {
            // --- DECLINE LOGIC: Update Response ---
            offer.status = "declined";
            offer.set("response", {...newResponse});
        }

        // CRITICAL: For negotiate, DO NOT save the offer - status should remain unchanged
        // Only save if it's accept or decline
        let finalOffer;
        if (responseType === "negotiate") {
            // For negotiation, fetch fresh offer from DB to ensure status is correct
            // We used updateOne which only updated response field, status should be unchanged
            const freshOffer = await InfluencerOffer.findById(offer._id).lean();
            if (!freshOffer) {
                return errorResponse(res, "Offer not found after update", 404);
            }
            
            // CRITICAL: Verify status hasn't changed
            if (freshOffer.status !== offer.status) {
                console.error(`❌ CRITICAL: Status changed from ${offer.status} to ${freshOffer.status}! Reverting...`);
                // Force status back to original
                await InfluencerOffer.updateOne(
                    { _id: offer._id },
                    { $set: { status: offer.status } }
                );
                freshOffer.status = offer.status;
            }
            
            finalOffer = freshOffer;
            console.log(`✅ Negotiation sent - Offer status verified: ${finalOffer.status}`);
        } else {
            // For accept/decline, save the offer
            const updatedOffer = await offer.save();
            finalOffer = updatedOffer.toObject();
        }

        const responsePayload = {
            offer: finalOffer,
            deal: savedDeal ? savedDeal.toObject() : null,
        };

        return successResponse(res, `Offer ${responseType} successfully`, responsePayload, 200);

    } catch (error: any) {
        console.error("❌ Error responding to offer:", error);
        // Better error message if validation failed
        if (error.name === 'ValidationError') {
            return errorResponse(res, `Validation failed: ${error.message}`, 400);
        }
        return errorResponse(res, `Failed to update offer details: ${error.message}`, 500);
    }
}

// ---------------------------------------------------------
// ✅ ACCEPT NEGOTIATION FROM CHAT
// ---------------------------------------------------------
export const acceptNegotiation = async (req: AuthenticatedRequest, res: Response) => {
    try {
        const userId = req.user?._id?.toString();
        const { offerId, negotiationDetails, message } = req.body;

        if (!userId) {
            return errorResponse(res, "User not authenticated", 401);
        }

        if (!offerId) {
            return errorResponse(res, "Offer ID is required", 400);
        }

        const offer = await InfluencerOffer.findById(offerId);
        if (!offer) {
            return errorResponse(res, "Offer not found", 404);
        }

        // Verify user is authorized (brand can accept influencer's negotiation, influencer can accept brand's negotiation)
        const isBrand = offer.brandId === userId;
        const isInfluencer = offer.influencerId === userId;
        
        if (!isBrand && !isInfluencer) {
            return errorResponse(res, "You are not authorized to accept this negotiation", 403);
        }
        
        // Determine who is accepting (opposite of who sent the negotiation)
        const isBrandAccepting = isBrand;

        // Verify offer has negotiation details
        if (!offer.response?.negotiationDetails && !negotiationDetails) {
            return errorResponse(res, "No negotiation details found", 400);
        }

        const finalNegotiationDetails = negotiationDetails || offer.response?.negotiationDetails;
        const campaign = await Campaign.findById(offer.campaignId);
        if (!campaign) {
            return errorResponse(res, "Campaign not found", 404);
        }

        // Get deliverables from campaign
        const deliverablesList = campaign.deliverables?.map((d: any) => {
            if (typeof d === 'string') return d;
            return d.type || d.description || String(d);
        }).filter(Boolean) || [];

        // Prepare final terms from negotiation
        const finalTerms = {
            agreedAmount: finalNegotiationDetails.proposedAmount || campaign.budget,
            agreedDeadline: finalNegotiationDetails.proposedDeadline 
                ? new Date(finalNegotiationDetails.proposedDeadline)
                : campaign.endDate 
                    ? new Date(campaign.endDate)
                    : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days from now
            finalRequirements: finalNegotiationDetails.counterRequirements || [campaign.description || 'Complete campaign requirements'],
            finalDeliverables: deliverablesList.length > 0 ? deliverablesList : ['Complete all campaign deliverables'],
        };

        // CRITICAL: Update offer status to "accepted" only when both parties agree
        // One party sent the negotiation (status remained "pending")
        // Now the other party is accepting it, so both parties have agreed
        // This is the only time status changes from "pending" to "accepted"
        offer.status = "accepted";
        offer.acceptedAt = new Date();
        offer.set("response", {
            responseType: "accepted",
            message: message || "Negotiation accepted, deal created",
            respondedAt: new Date(),
            negotiationDetails: finalNegotiationDetails,
        });

        // Get or create chat room
        let room = await ChatRoom.findOne({
            participants: { $all: [offer.brandId, offer.influencerId] },
            chatType: 'influencer-brand',
            isActive: true,
        });

        if (!room && offer.roomId) {
            room = await ChatRoom.findById(offer.roomId);
        }

        if (!room) {
            const brand = await User.findById(offer.brandId);
            const influencer = await User.findById(offer.influencerId);
            
            if (!brand || !influencer) {
                return errorResponse(res, "Brand or influencer not found", 404);
            }

            room = new ChatRoom({
                participants: [offer.brandId, offer.influencerId],
                participantRoles: [brand.role as any, influencer.role as any],
                chatType: 'influencer-brand',
                isActive: true,
            });
            await room.save();
        }

        // Create InfluencerBrandDeal
        const dealData = {
            brandId: offer.brandId,
            influencerId: offer.influencerId,
            campaignId: offer.campaignId,
            roomId: (room._id as mongoose.Types.ObjectId).toString(),
            status: "agreement-pending", // Initial status - will change to "running" when both parties agree
            message: message || "Negotiation accepted, deal created",
            finalTerms: finalTerms,
            dealAt: new Date(),
            agreementAt: new Date(),
            isActive: true,
        };

        const newDeal = new InfluencerBrandDeal(dealData);
        const savedDeal = await newDeal.save();

        // Generate Agreement PDF automatically
        try {
            const agreementFileUrl = await generateInfluencerBrandAgreement(savedDeal._id.toString());
            
            // Create Agreement record
            const agreement = new Agreement({
                dealId: savedDeal._id,
                dealType: "influencer-brand",
                agreementFile: agreementFileUrl,
                brandAgreed: false,
                influencerAgreed: false,
                isActive: true,
            });
            await agreement.save();

            // Update deal with agreement file
            savedDeal.agreementFile = agreementFileUrl;
            savedDeal.agreementAt = new Date();
            await savedDeal.save();
        } catch (agreementError: any) {
            console.error("❌ Error generating agreement:", agreementError);
            // Don't fail the deal creation if agreement generation fails
        }

        // Link deal to offer
        offer.set("deal", savedDeal._id);
        offer.roomId = (room._id as mongoose.Types.ObjectId).toString();
        await offer.save();

        // Send acceptance message to chat
        const acceptanceMessage = new Message({
            roomId: room._id as mongoose.Types.ObjectId,
            senderId: userId,
            senderRole: req.user!.role as any,
            content: `✅ Negotiation accepted! Deal created successfully.\n\n📋 **Deal Terms:**\n💰 Amount: ₹${finalTerms.agreedAmount?.toLocaleString('en-IN')}\n📅 Deadline: ${finalTerms.agreedDeadline.toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}`,
            messageType: 'text',
            isRead: false,
            readBy: [userId],
        });

        await acceptanceMessage.save();
        await room.updateLastMessage(acceptanceMessage._id as mongoose.Types.ObjectId);
        await room.incrementUnreadCount(offer.influencerId);

        // Populate sender info for socket emission
        await acceptanceMessage.populate('senderId', 'name profilePictureUrl role');

        // Emit socket event for real-time update
        const socketService = require('../services/socketService').default;
        if (socketService.io) {
            const senderInfo = acceptanceMessage.senderId as any;
            const messagePayload = {
                message: {
                    _id: String(acceptanceMessage._id),
                    roomId: String(acceptanceMessage.roomId),
                    senderId: senderInfo ? {
                        _id: String(senderInfo._id || senderInfo.id),
                        name: senderInfo.name,
                        profilePictureUrl: senderInfo.profilePictureUrl,
                        role: senderInfo.role,
                    } : String(acceptanceMessage.senderId),
                    senderRole: acceptanceMessage.senderRole,
                    content: acceptanceMessage.content,
                    messageType: acceptanceMessage.messageType,
                    attachments: acceptanceMessage.attachments || [],
                    isRead: acceptanceMessage.isRead,
                    createdAt: acceptanceMessage.createdAt instanceof Date 
                        ? acceptanceMessage.createdAt.toISOString() 
                        : acceptanceMessage.createdAt,
                    updatedAt: acceptanceMessage.updatedAt instanceof Date 
                        ? acceptanceMessage.updatedAt.toISOString() 
                        : acceptanceMessage.updatedAt,
                },
            };
            
            socketService.io.to(`room:${room._id}`).emit('new_message', messagePayload);
            console.log(`📤 Emitted acceptance message to room: ${room._id}`);
        }

        return successResponse(res, "Negotiation accepted and deal created successfully", {
            offer: offer.toObject(),
            deal: savedDeal.toObject(),
        }, 200);

    } catch (error: any) {
        console.error("❌ Error accepting negotiation:", error);
        return errorResponse(res, `Failed to accept negotiation: ${error.message}`, 500);
    }
}