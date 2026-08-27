import { Request, Response } from "express";
import { successResponse, errorResponse } from "../utils/responseHelper";
import InfluencerBrandDeal, { IInfluencerBrandDeal } from "../models/influencerBrandDeal";
import User from "../models/user";
import Campaign from "../models/campaign";
import { AuthenticatedRequest } from "../middleware/auth";
import { Types } from "mongoose";
import mongoose from "mongoose";
import { fileStorageService } from '../services/fileStorageService';

// ---------------------------------------------------------
// ✅ GET USER DEALS (Brand/Influencer)
// ---------------------------------------------------------
export const getUserDeals = async (req: AuthenticatedRequest, res: Response) => {
    try {
        const userId = req.user?.id;
        const userRole = req.user?.role;
        const { page = "1", limit = "20", campaignId, status } = req.query;

        if (!userId || !userRole) {
            return errorResponse(res, "Unauthorized access", 403);
        }

        const query: Record<string, any> = {};

        // Filter based on user role (Deals should be specific to the user)
        if (userRole === "influencer") {
            query.influencerId = userId;
        } else if (["brand", "vendor", "admin"].includes(userRole)) {
            query.brandId = userId;
        } else {
            return errorResponse(res, "Role not authorized to view deals", 403);
        }

        if (campaignId) query.campaignId = campaignId;
        if (status) query.status = status;

        const skip = (parseInt(page) - 1) * parseInt(limit);

        const deals = await InfluencerBrandDeal.find(query)
            .sort({ dealAt: -1 })
            .skip(skip)
            .limit(parseInt(limit));

        const totalDeals = await InfluencerBrandDeal.countDocuments(query);
        const totalPages = Math.ceil(totalDeals / parseInt(limit));

        const transformedDeals = await Promise.all(
            deals.map(async (deal: IInfluencerBrandDeal) => {
                const influencerData = await User.findById(deal.influencerId).select('name email profilePictureUrl');
                const brandData = await User.findById(deal.brandId).select('name email businessInfo');
                const campaign = await Campaign.findById(deal.campaignId).select('name budget image');

                return {
                    ...deal.toObject(),
                    campaignName: campaign?.name || "N/A",
                    brandName: brandData?.businessInfo?.businessName || brandData?.name || "Unknown Brand",
                    influencerName: influencerData?.name || "Unknown Influencer",
                    influencerProfilePictureUrl: influencerData?.profilePictureUrl,
                    agreedAmount: deal.finalTerms?.agreedAmount,
                };
            })
        );

        return successResponse(res, "Deals retrieved successfully", transformedDeals, 200, {
            currentPage: parseInt(page),
            totalPages: totalPages,
            totalCount: totalDeals,
            hasNextPage: parseInt(page) < totalPages,
            hasPrevPage: parseInt(page) > 1,
        });

    } catch (error: any) {
        console.error("❌ Error fetching user deals:", error);
        return errorResponse(res, `Failed to fetch deals: ${error.message}`, 500);
    }
};

// ---------------------------------------------------------
// ✅ GET SINGLE DEAL DETAILS
// ---------------------------------------------------------
export const getDealDetails = async (req: AuthenticatedRequest, res: Response) => {
    try {
        const { id } = req.params;
        const userId = req.user?.id;

        const deal = await InfluencerBrandDeal.findById(id).lean();
        if (!deal) return errorResponse(res, "Deal not found", 404);

        // Security check: Only allow access to the deal participants
        if (deal.brandId !== userId && deal.influencerId !== userId) {
            return errorResponse(res, "Unauthorized to view this deal", 403);
        }

        // Batch fetch users with all necessary fields
        const userIds = new Set<string>();
        if (deal.brandId) userIds.add(deal.brandId.toString());
        if (deal.influencerId) userIds.add(deal.influencerId.toString());

        const objectIdUserIds: mongoose.Types.ObjectId[] = [];
        Array.from(userIds).forEach(id => {
            if (mongoose.Types.ObjectId.isValid(id)) {
                objectIdUserIds.push(new mongoose.Types.ObjectId(id));
            }
        });

        // Fetch users with all fields needed for brand profile
        const users = await User.find({ 
            _id: { $in: objectIdUserIds }
        })
            .select('name email phone profilePictureUrl role businessInfo addresses vendorInfo websiteUrl instagram facebook twitter linkedin youtube')
            .lean();

        // Create map for lookup
        const userMap = new Map<string, any>();
        users.forEach((u: any) => {
            const idString = u._id.toString();
            userMap.set(idString, u);
        });

        // Fetch campaign
        const campaign = await Campaign.findById(deal.campaignId).lean();

        // Get brand and influencer data
        const brandData = deal.brandId ? userMap.get(deal.brandId.toString()) : null;
        const influencerData = deal.influencerId ? userMap.get(deal.influencerId.toString()) : null;

        // Construct brandInfo object similar to vendor deal controller
        let brandInfoObj: any = null;
        if (brandData) {
            brandInfoObj = {
                _id: brandData._id?.toString() || brandData._id || null,
                name: brandData.name || null,
                email: brandData.email || null,
                phone: brandData.phone || null,
                profilePictureUrl: brandData.profilePictureUrl || null,
                role: brandData.role || null,
                businessInfo: brandData.businessInfo || null,
                addresses: brandData.addresses || null,
                websiteUrl: brandData.websiteUrl || null,
                instagram: brandData.instagram || null,
                facebook: brandData.facebook || null,
                twitter: brandData.twitter || null,
                linkedin: brandData.linkedin || null,
                youtube: brandData.youtube || null,
            };
        }

        // Construct influencerInfo object
        let influencerInfoObj: any = null;
        if (influencerData) {
            influencerInfoObj = {
                _id: influencerData._id?.toString() || influencerData._id || null,
                name: influencerData.name || null,
                email: influencerData.email || null,
                phone: influencerData.phone || null,
                profilePictureUrl: influencerData.profilePictureUrl || null,
                role: influencerData.role || null,
            };
        }

        return successResponse(res, "Deal details fetched successfully", {
            ...deal,
            campaign: campaign || null,
            brandInfo: brandInfoObj,
            influencerInfo: influencerInfoObj,
            brandName: brandData?.businessInfo?.businessName || brandData?.name || "Unknown Brand",
            influencerName: influencerData?.name || "Unknown Influencer",
            influencerEmail: influencerData?.email || "N/A",
        });

    } catch (error: any) {
        console.error("❌ Error fetching deal details:", error);
        return errorResponse(res, "Failed to fetch deal details", 500);
    }
};

// ---------------------------------------------------------
// ✅ UPDATE DEAL (General updates and Agreement File Upload)
// ---------------------------------------------------------
export const updateDeal = async (req: AuthenticatedRequest, res: Response) => {
    try {
        const { id } = req.params;
        const userId = req.user?.id;
        
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

        const deal = await InfluencerBrandDeal.findById(id);
        if (!deal) return errorResponse(res, "Deal not found", 404);

        // Security check: Only allow participants to update the deal
        if (deal.brandId !== userId && deal.influencerId !== userId) {
            return errorResponse(res, "Unauthorized to update this deal", 403);
        }

        const dealUpdates: Record<string, any> = { ...req.body };

        // Handle nested finalTerms update
        if (dealUpdates.finalTerms) {
            dealUpdates['finalTerms.agreedAmount'] = dealUpdates.finalTerms.agreedAmount;
            dealUpdates['finalTerms.agreedDeadline'] = dealUpdates.finalTerms.agreedDeadline ? new Date(dealUpdates.finalTerms.agreedDeadline) : undefined;
            dealUpdates['finalTerms.finalRequirements'] = dealUpdates.finalTerms.finalRequirements;
            dealUpdates['finalTerms.finalDeliverables'] = dealUpdates.finalTerms.finalDeliverables;
            delete dealUpdates.finalTerms; // Remove original nested object to prevent Mongoose overwrite issues
        }

        if (agreementFileUrl) {
            dealUpdates.agreementFile = agreementFileUrl;
            dealUpdates.agreementAt = new Date();
        }

        const updatedDeal = await InfluencerBrandDeal.findByIdAndUpdate(id, dealUpdates, {
            new: true,
            runValidators: true,
        });

        return successResponse(res, "Deal updated successfully", updatedDeal?.toObject());
    } catch (error: any) {
        console.error("❌ Error updating deal:", error);
        return errorResponse(res, `Deal update failed: ${error.message}`, 500);
    }
};

// ---------------------------------------------------------
// ✅ REQUEST DEAL COMPLETION (Influencer side)
// ---------------------------------------------------------
export const requestDealCompletion = async (req: AuthenticatedRequest, res: Response) => {
    try {
        const { id } = req.params;
        const userId = req.user?.id;

        const deal = await InfluencerBrandDeal.findById(id);
        if (!deal) return errorResponse(res, "Deal not found", 404);

        // Only influencer can request completion
        if (deal.influencerId !== userId) {
            return errorResponse(res, "Only influencer can request deal completion", 403);
        }

        if (deal.status === 'completed') {
            return successResponse(res, "Deal is already completed", deal.toObject());
        }

        if (deal.status === 'completion_requested') {
            return successResponse(res, "Completion request already pending brand approval", deal.toObject());
        }

        if (deal.status !== 'running') {
            return errorResponse(res, "Only running deals can be marked for completion", 400);
        }

        const updatedDeal = await InfluencerBrandDeal.findByIdAndUpdate(
            id,
            { status: 'completion_requested' },
            { new: true }
        );

        return successResponse(res, "Completion request sent to brand for approval", updatedDeal?.toObject());

    } catch (error: any) {
        console.error("❌ Error requesting deal completion:", error);
        return errorResponse(res, `Failed to request deal completion: ${error.message}`, 500);
    }
};

// ---------------------------------------------------------
// ✅ APPROVE DEAL COMPLETION (Brand side)
// ---------------------------------------------------------
export const approveDealCompletion = async (req: AuthenticatedRequest, res: Response) => {
    try {
        const { id } = req.params;
        const userId = req.user?.id;

        const deal = await InfluencerBrandDeal.findById(id);
        if (!deal) return errorResponse(res, "Deal not found", 404);

        // Only brand can approve completion
        if (deal.brandId !== userId) {
            return errorResponse(res, "Only brand can approve deal completion", 403);
        }

        if (deal.status === 'completed') {
            return successResponse(res, "Deal is already completed", deal.toObject());
        }

        if (deal.status !== 'completion_requested') {
            return errorResponse(res, "Deal completion must be requested first", 400);
        }

        const updatedDeal = await InfluencerBrandDeal.findByIdAndUpdate(
            id,
            { status: 'completed', completedAt: new Date() },
            { new: true }
        );

        // TODO: Optional: Trigger Campaign status update if all related deals are completed

        return successResponse(res, "Deal completion approved successfully", updatedDeal?.toObject());

    } catch (error: any) {
        console.error("❌ Error approving deal completion:", error);
        return errorResponse(res, `Failed to approve deal completion: ${error.message}`, 500);
    }
};

// ---------------------------------------------------------
// ✅ MARK DEAL AS COMPLETED (Legacy - kept for backward compatibility)
// ---------------------------------------------------------
export const markDealCompleted = async (req: AuthenticatedRequest, res: Response) => {
    try {
        const { id } = req.params;
        const userId = req.user?.id;

        const deal = await InfluencerBrandDeal.findById(id);
        if (!deal) return errorResponse(res, "Deal not found", 404);

        if (deal.brandId !== userId && deal.influencerId !== userId) {
            return errorResponse(res, "Unauthorized to complete this deal", 403);
        }

        if (deal.status === 'completed') {
            return successResponse(res, "Deal is already marked as completed", deal.toObject());
        }

        const updatedDeal = await InfluencerBrandDeal.findByIdAndUpdate(
            id,
            { status: 'completed', completedAt: new Date() },
            { new: true }
        );

        return successResponse(res, "Deal marked as completed successfully", updatedDeal?.toObject());

    } catch (error: any) {
        console.error("❌ Error completing deal:", error);
        return errorResponse(res, `Failed to complete deal: ${error.message}`, 500);
    }
};

// ---------------------------------------------------------
// ✅ CANCEL DEAL
// ---------------------------------------------------------
export const cancelDeal = async (req: AuthenticatedRequest, res: Response) => {
    try {
        const { id } = req.params;
        const userId = req.user?.id;

        const deal = await InfluencerBrandDeal.findById(id);
        if (!deal) return errorResponse(res, "Deal not found", 404);

        if (deal.brandId !== userId && deal.influencerId !== userId) {
            return errorResponse(res, "Unauthorized to cancel this deal", 403);
        }

        if (deal.status === 'cancelled') {
            return successResponse(res, "Deal is already cancelled", deal.toObject());
        }

        const updatedDeal = await InfluencerBrandDeal.findByIdAndUpdate(
            id,
            { status: 'cancelled' },
            { new: true }
        );

        // TODO: Optional: Trigger Campaign status update or notification

        return successResponse(res, "Deal cancelled successfully", updatedDeal?.toObject());

    } catch (error: any) {
        console.error("❌ Error cancelling deal:", error);
        return errorResponse(res, `Failed to cancel deal: ${error.message}`, 500);
    }
};