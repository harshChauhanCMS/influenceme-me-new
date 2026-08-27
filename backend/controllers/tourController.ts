import { Request, Response } from "express";
import Tour from "../models/tour";
import User from "../models/user";
import Campaign from "../models/campaign";
import { successResponse, errorResponse } from "../utils/responseHelper";
import { AuthenticatedRequest } from "../middleware/auth";
import * as jwt from "jsonwebtoken";

/** Check if campaign date range overlaps with tour date range */
function datesOverlap(
    campaignStart: Date,
    campaignEnd: Date,
    tourStart: Date,
    tourEnd: Date
): boolean {
    return campaignStart <= tourEnd && campaignEnd >= tourStart;
}

/**
 * Check if campaign locations match tour location (city, country, or address).
 * If campaign has no locations or empty, treat as match (campaign is location-agnostic).
 */
function locationMatches(
    campaignLocations: Array<{ address?: string; latitude?: number; longitude?: number }> | undefined,
    tourLocation: { address?: string; city?: string; state?: string; country?: string }
): boolean {
    if (!campaignLocations || campaignLocations.length === 0) return true;
    const addr = (tourLocation.address || "").toLowerCase().trim();
    const city = (tourLocation.city || "").toLowerCase().trim();
    const country = (tourLocation.country || "").toLowerCase().trim();
    const state = (tourLocation.state || "").toLowerCase().trim();
    const tourParts = [addr, city, state, country].filter(Boolean);
    if (tourParts.length === 0) return true;
    return campaignLocations.some((loc) => {
        const locAddr = (loc.address || "").toLowerCase().trim();
        if (!locAddr) return true;
        return tourParts.some((part) => part && (locAddr.includes(part) || part.includes(locAddr)));
    });
}

/**
 * Create a new tour
 * POST /api/tour
 */
export const createTour = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
        const userId = req.user?.id;
        if (!userId) {
            errorResponse(res, "Authentication required", 401);
            return;
        }

        // Verify user is an influencer
        const user = await User.findById(userId);
        if (!user || user.role !== "influencer") {
            errorResponse(res, "Only influencers can create tours", 403);
            return;
        }

        const { title, description, location, startDate, endDate, isActive } = req.body;

        // Validate required fields
        if (!title || !location || !startDate || !endDate) {
            errorResponse(res, "Title, location, start date, and end date are required", 400);
            return;
        }

        // Validate dates
        const start = new Date(startDate);
        const end = new Date(endDate);
        if (end < start) {
            errorResponse(res, "End date must be after start date", 400);
            return;
        }

        const tour = new Tour({
            influencerId: userId,
            title,
            description,
            location,
            startDate: start,
            endDate: end,
            isActive: isActive !== undefined ? isActive : true,
        });

        await tour.save();

        // Populate influencer info
        await tour.populate("influencerId", "name profilePictureUrl influencerInfo");

        successResponse(res, "Tour created successfully", tour, 201);
    } catch (error: any) {
        console.error("Error creating tour:", error);
        errorResponse(res, error.message || "Failed to create tour", 500);
    }
};

/**
 * Get all tours (for brands to see influencer tours)
 * GET /api/tour
 * Query params: location, city, country, startDate, endDate, influencerId
 */
export const getAllTours = async (req: Request, res: Response): Promise<void> => {
    try {
        const { location, city, country, startDate, endDate, influencerId, page = "1", limit = "50" } = req.query;

        const query: any = { isActive: true };

        // Filter by location
        if (location) {
            query["location.address"] = { $regex: location, $options: "i" };
        }

        // Filter by city
        if (city) {
            query["location.city"] = { $regex: city, $options: "i" };
        }

        // Filter by country
        if (country) {
            query["location.country"] = { $regex: country, $options: "i" };
        }

        // Filter by influencer
        if (influencerId) {
            query.influencerId = influencerId;
        }

        // Filter by date range
        if (startDate || endDate) {
            query.$or = [];
            if (startDate) {
                query.$or.push({ endDate: { $gte: new Date(startDate as string) } });
            }
            if (endDate) {
                query.$or.push({ startDate: { $lte: new Date(endDate as string) } });
            }
        }

        const pageNum = parseInt(page as string, 10);
        const limitNum = parseInt(limit as string, 10);
        const skip = (pageNum - 1) * limitNum;

        const tours = await Tour.find(query)
            .populate("influencerId", "name profilePictureUrl influencerInfo email phone")
            .sort({ startDate: 1 })
            .skip(skip)
            .limit(limitNum);

        const total = await Tour.countDocuments(query);

        successResponse(
            res,
            "Tours fetched successfully",
            tours,
            200,
            {
                page: pageNum,
                limit: limitNum,
                total,
                totalPages: Math.ceil(total / limitNum),
            }
        );
    } catch (error: any) {
        console.error("Error fetching tours:", error);
        errorResponse(res, error.message || "Failed to fetch tours", 500);
    }
};

/**
 * Get tours for a specific influencer
 * GET /api/tour/influencer/:influencerId
 */
export const getInfluencerTours = async (req: Request, res: Response): Promise<void> => {
    try {
        const { influencerId } = req.params;
        const { page = "1", limit = "50" } = req.query;

        const pageNum = parseInt(page as string, 10);
        const limitNum = parseInt(limit as string, 10);
        const skip = (pageNum - 1) * limitNum;

        const query: any = { influencerId };

        const tours = await Tour.find(query)
            .populate("influencerId", "name profilePictureUrl influencerInfo")
            .sort({ startDate: 1 })
            .skip(skip)
            .limit(limitNum);

        const total = await Tour.countDocuments(query);

        successResponse(
            res,
            "Tours fetched successfully",
            tours,
            200,
            {
                page: pageNum,
                limit: limitNum,
                total,
                totalPages: Math.ceil(total / limitNum),
            }
        );
    } catch (error: any) {
        console.error("Error fetching influencer tours:", error);
        errorResponse(res, error.message || "Failed to fetch tours", 500);
    }
};

/**
 * Get current user's tours (for influencers)
 * GET /api/tour/my-tours
 */
export const getMyTours = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
        const userId = req.user?.id;
        if (!userId) {
            errorResponse(res, "Authentication required", 401);
            return;
        }

        const { page = "1", limit = "50" } = req.query;
        const pageNum = parseInt(page as string, 10);
        const limitNum = parseInt(limit as string, 10);
        const skip = (pageNum - 1) * limitNum;

        const tours = await Tour.find({ influencerId: userId })
            .sort({ startDate: 1 })
            .skip(skip)
            .limit(limitNum);

        const total = await Tour.countDocuments({ influencerId: userId });

        successResponse(
            res,
            "Tours fetched successfully",
            tours,
            200,
            {
                page: pageNum,
                limit: limitNum,
                total,
                totalPages: Math.ceil(total / limitNum),
            }
        );
    } catch (error: any) {
        console.error("Error fetching my tours:", error);
        errorResponse(res, error.message || "Failed to fetch tours", 500);
    }
};

/**
 * Get influencer's calendar: their tours + campaigns that match (location + time).
 * GET /api/tour/calendar-with-campaigns
 * Query: startDate, endDate (optional)
 */
export const getCalendarWithMatchingCampaigns = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
        const userId = req.user?.id;
        if (!userId) {
            errorResponse(res, "Authentication required", 401);
            return;
        }

        const user = await User.findById(userId);
        if (!user || user.role !== "influencer") {
            errorResponse(res, "Only influencers can view calendar with campaigns", 403);
            return;
        }

        const { startDate: qStart, endDate: qEnd } = req.query;
        const query: any = { influencerId: userId, isActive: true };
        if (qStart || qEnd) {
            query.$and = [];
            if (qStart) query.$and.push({ endDate: { $gte: new Date(qStart as string) } });
            if (qEnd) query.$and.push({ startDate: { $lte: new Date(qEnd as string) } });
        }

        const tours = await Tour.find(query).sort({ startDate: 1 }).lean();
        if (tours.length === 0) {
            successResponse(res, "Calendar with matching campaigns", {
                tours: [],
                matchingCampaigns: [],
            });
            return;
        }

        const campaignStatuses = ["active", "upcoming"];
        const campaigns = await Campaign.find({
            status: { $in: campaignStatuses },
            $or: tours.map((t) => ({
                startDate: { $lte: (t as any).endDate },
                endDate: { $gte: (t as any).startDate },
            })),
        })
            .populate("createdBy", "name profilePictureUrl")
            .lean();

        const matchingCampaigns: Array<{
            campaign: any;
            matchedTourId: string;
            matchedTour: any;
        }> = [];
        const seenCampaignIds = new Set<string>();

        for (const campaign of campaigns) {
            const c = campaign as any;
            const campStart = new Date(c.startDate);
            const campEnd = new Date(c.endDate);
            const campLocs = c.locations || [];
            for (const tour of tours) {
                const t = tour as any;
                const tourStart = new Date(t.startDate);
                const tourEnd = new Date(t.endDate);
                if (!datesOverlap(campStart, campEnd, tourStart, tourEnd)) continue;
                if (!locationMatches(campLocs, t.location || {})) continue;
                if (!seenCampaignIds.has(c._id.toString())) {
                    seenCampaignIds.add(c._id.toString());
                    matchingCampaigns.push({
                        campaign: c,
                        matchedTourId: t._id.toString(),
                        matchedTour: t,
                    });
                }
                break;
            }
        }

        successResponse(res, "Calendar with matching campaigns", {
            tours,
            matchingCampaigns,
        });
        return;
    } catch (error: any) {
        console.error("Error fetching calendar with campaigns:", error);
        errorResponse(res, error.message || "Failed to fetch calendar with campaigns", 500);
    }
};

/**
 * Get tour by ID
 * GET /api/tour/:id
 */
export const getTourById = async (req: Request, res: Response): Promise<void> => {
    try {
        const { id } = req.params;

        const tour = await Tour.findById(id).populate(
            "influencerId",
            "name profilePictureUrl influencerInfo email phone instagram youtube"
        );

        if (!tour) {
            errorResponse(res, "Tour not found", 404);
            return;
        }

        successResponse(res, "Tour fetched successfully", tour);
    } catch (error: any) {
        console.error("Error fetching tour:", error);
        errorResponse(res, error.message || "Failed to fetch tour", 500);
    }
};

/**
 * Update tour
 * PUT /api/tour/:id
 */
export const updateTour = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
        const userId = req.user?.id;
        if (!userId) {
            errorResponse(res, "Authentication required", 401);
            return;
        }

        const { id } = req.params;
        const tour = await Tour.findById(id);

        if (!tour) {
            errorResponse(res, "Tour not found", 404);
            return;
        }

        // Verify user owns the tour
        if (tour.influencerId.toString() !== userId.toString()) {
            errorResponse(res, "You can only update your own tours", 403);
            return;
        }

        const { title, description, location, startDate, endDate, isActive } = req.body;

        // Update fields
        if (title) tour.title = title;
        if (description !== undefined) tour.description = description;
        if (location) tour.location = location;
        if (startDate) tour.startDate = new Date(startDate);
        if (endDate) tour.endDate = new Date(endDate);
        if (isActive !== undefined) tour.isActive = isActive;

        // Validate dates
        if (tour.endDate < tour.startDate) {
            errorResponse(res, "End date must be after start date", 400);
            return;
        }

        await tour.save();
        await tour.populate("influencerId", "name profilePictureUrl influencerInfo");

        successResponse(res, "Tour updated successfully", tour);
    } catch (error: any) {
        console.error("Error updating tour:", error);
        errorResponse(res, error.message || "Failed to update tour", 500);
    }
};

/**
 * Delete tour
 * DELETE /api/tour/:id
 */
export const deleteTour = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
        const userId = req.user?.id;
        if (!userId) {
            errorResponse(res, "Authentication required", 401);
            return;
        }

        const { id } = req.params;
        const tour = await Tour.findById(id);

        if (!tour) {
            errorResponse(res, "Tour not found", 404);
            return;
        }

        // Verify user owns the tour
        if (tour.influencerId.toString() !== userId.toString()) {
            errorResponse(res, "You can only delete your own tours", 403);
            return;
        }

        await Tour.findByIdAndDelete(id);

        successResponse(res, "Tour deleted successfully");
    } catch (error: any) {
        console.error("Error deleting tour:", error);
        errorResponse(res, error.message || "Failed to delete tour", 500);
    }
};

