import { Response } from "express";
import { AuthenticatedRequest } from "../middleware/auth";
import Agreement from "../models/agreement";
import InfluencerBrandDeal from "../models/influencerBrandDeal";
import VendorBrandDeal from "../models/vendorBrandDeal";
import {
    generateInfluencerBrandAgreement,
    generateVendorBrandAgreement,
} from "../services/agreementService";
import { successResponse, errorResponse } from "../utils/responseHelper";

/**
 * @desc    Get agreement for a deal
 * @route   GET /api/agreement/:dealId
 * @access  Private
 */
export const getAgreement = async (req: AuthenticatedRequest, res: Response) => {
    try {
        const { dealId } = req.params;
        const { dealType } = req.query;
        const userId = req.user?._id?.toString();

        if (!userId) {
            return errorResponse(res, "User not authenticated", 401);
        }

        if (!dealType || (dealType !== "influencer-brand" && dealType !== "vendor-brand")) {
            return errorResponse(res, "Invalid or missing dealType parameter", 400);
        }

        // Find agreement
        const agreement = await Agreement.findOne({
            dealId,
            dealType,
            isActive: true,
        });

        if (!agreement) {
            return errorResponse(res, "Agreement not found", 404);
        }

        // Verify user has access to this deal
        let deal;
        if (dealType === "influencer-brand") {
            deal = await InfluencerBrandDeal.findById(dealId);
            if (!deal) {
                return errorResponse(res, "Deal not found", 404);
            }
            if (deal.brandId !== userId && deal.influencerId !== userId) {
                return errorResponse(res, "Unauthorized to view this agreement", 403);
            }
        } else {
            deal = await VendorBrandDeal.findById(dealId);
            if (!deal) {
                return errorResponse(res, "Deal not found", 404);
            }
            if (deal.brandId !== userId && deal.vendorId !== userId) {
                return errorResponse(res, "Unauthorized to view this agreement", 403);
            }
        }

        return successResponse(res, "Agreement retrieved successfully", agreement.toObject());
    } catch (error: any) {
        console.error("Error getting agreement:", error);
        return errorResponse(res, `Failed to get agreement: ${error.message}`, 500);
    }
};

/**
 * @desc    Agree to agreement
 * @route   POST /api/agreement/:dealId/agree
 * @access  Private
 */
export const agreeToAgreement = async (req: AuthenticatedRequest, res: Response) => {
    try {
        const { dealId } = req.params;
        const { dealType } = req.body;
        const userId = req.user?._id?.toString();
        const userRole = req.user?.role;

        if (!userId || !userRole) {
            return errorResponse(res, "User not authenticated", 401);
        }

        if (!dealType || (dealType !== "influencer-brand" && dealType !== "vendor-brand")) {
            return errorResponse(res, "Invalid or missing dealType parameter", 400);
        }

        // Find agreement
        let agreement = await Agreement.findOne({
            dealId,
            dealType,
            isActive: true,
        });

        if (!agreement) {
            return errorResponse(res, "Agreement not found", 404);
        }

        // Verify user has access and determine which party they are
        let deal;
        let isBrand = false;
        let isInfluencer = false;
        let isVendor = false;

        if (dealType === "influencer-brand") {
            deal = await InfluencerBrandDeal.findById(dealId);
            if (!deal) {
                return errorResponse(res, "Deal not found", 404);
            }
            isBrand = deal.brandId === userId;
            isInfluencer = deal.influencerId === userId;

            if (!isBrand && !isInfluencer) {
                return errorResponse(res, "Unauthorized to agree to this agreement", 403);
            }

            // Update agreement
            if (isBrand && !agreement.brandAgreed) {
                agreement.brandAgreed = true;
                agreement.brandAgreedAt = new Date();
            } else if (isInfluencer && !agreement.influencerAgreed) {
                agreement.influencerAgreed = true;
                agreement.influencerAgreedAt = new Date();
            } else {
                return errorResponse(res, "You have already agreed to this agreement", 400);
            }

            // Check if both parties agreed
            if (agreement.brandAgreed && agreement.influencerAgreed) {
                // Update deal status to "running" when both parties agree
                deal.status = "running";
                await deal.save();
            }
        } else {
            deal = await VendorBrandDeal.findById(dealId);
            if (!deal) {
                return errorResponse(res, "Deal not found", 404);
            }
            isBrand = deal.brandId === userId;
            isVendor = deal.vendorId === userId;

            if (!isBrand && !isVendor) {
                return errorResponse(res, "Unauthorized to agree to this agreement", 403);
            }

            // Update agreement
            if (isBrand && !agreement.brandAgreed) {
                agreement.brandAgreed = true;
                agreement.brandAgreedAt = new Date();
            } else if (isVendor && !agreement.vendorAgreed) {
                agreement.vendorAgreed = true;
                agreement.vendorAgreedAt = new Date();
            } else {
                return errorResponse(res, "You have already agreed to this agreement", 400);
            }

            // Check if both parties agreed
            if (agreement.brandAgreed && agreement.vendorAgreed) {
                // Update deal status - vendor deals might have different status flow
                // For now, keep as "running"
                deal.status = "running";
                await deal.save();
            }
        }

        await agreement.save();

        // Populate agreement for response
        const updatedAgreement = await Agreement.findById(agreement._id).lean();

        return successResponse(res, "Agreement accepted successfully", {
            agreement: updatedAgreement,
            bothPartiesAgreed: dealType === "influencer-brand"
                ? agreement.brandAgreed && agreement.influencerAgreed
                : agreement.brandAgreed && agreement.vendorAgreed,
        });
    } catch (error: any) {
        console.error("Error agreeing to agreement:", error);
        return errorResponse(res, `Failed to agree to agreement: ${error.message}`, 500);
    }
};

/**
 * @desc    Generate agreement for existing deal
 * @route   POST /api/agreement/:dealId/generate
 * @access  Private
 */
export const generateAgreement = async (req: AuthenticatedRequest, res: Response) => {
    try {
        const { dealId } = req.params;
        const { dealType } = req.body;
        const userId = req.user?._id?.toString();

        if (!userId) {
            return errorResponse(res, "User not authenticated", 401);
        }

        if (!dealType || (dealType !== "influencer-brand" && dealType !== "vendor-brand")) {
            return errorResponse(res, "Invalid or missing dealType parameter", 400);
        }

        // Verify user has access to this deal
        let deal;
        if (dealType === "influencer-brand") {
            deal = await InfluencerBrandDeal.findById(dealId);
            if (!deal) {
                return errorResponse(res, "Deal not found", 404);
            }
            if (deal.brandId !== userId && deal.influencerId !== userId) {
                return errorResponse(res, "Unauthorized to generate agreement for this deal", 403);
            }
        } else {
            deal = await VendorBrandDeal.findById(dealId);
            if (!deal) {
                return errorResponse(res, "Deal not found", 404);
            }
            if (deal.brandId !== userId && deal.vendorId !== userId) {
                return errorResponse(res, "Unauthorized to generate agreement for this deal", 403);
            }
        }

        // Check if agreement already exists
        let agreement = await Agreement.findOne({
            dealId,
            dealType,
            isActive: true,
        });

        if (agreement) {
            return successResponse(res, "Agreement already exists", agreement.toObject());
        }

        // Generate PDF
        let agreementFileUrl: string;
        if (dealType === "influencer-brand") {
            agreementFileUrl = await generateInfluencerBrandAgreement(String(dealId));
        } else {
            agreementFileUrl = await generateVendorBrandAgreement(String(dealId));
        }

        // Create agreement record
        agreement = new Agreement({
            dealId,
            dealType,
            agreementFile: agreementFileUrl,
            brandAgreed: false,
            influencerAgreed: dealType === "influencer-brand" ? false : undefined,
            vendorAgreed: dealType === "vendor-brand" ? false : undefined,
            isActive: true,
        });

        await agreement.save();

        // Update deal with agreement file
        if (dealType === "influencer-brand") {
            await InfluencerBrandDeal.findByIdAndUpdate(dealId, {
                agreementFile: agreementFileUrl,
                agreementAt: new Date(),
            });
        } else {
            await VendorBrandDeal.findByIdAndUpdate(dealId, {
                agreementFile: agreementFileUrl,
                agreementAt: new Date(),
            });
        }

        return successResponse(res, "Agreement generated successfully", agreement.toObject());
    } catch (error: any) {
        console.error("Error generating agreement:", error);
        return errorResponse(res, `Failed to generate agreement: ${error.message}`, 500);
    }
};

