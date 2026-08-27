import { Request, Response } from "express";
import VendorBid from "../models/vendorBid";
import VendorRequirement from "../models/vendorRequirement";
import VendorBrandDeal from "../models/vendorBrandDeal";
import User from "../models/user";
import {
  successResponse,
  errorResponse,
  paginatedResponse,
  Pagination,
} from "../utils/responseHelper";
import { AuthenticatedRequest } from "../middleware/auth";
import { createAndSend } from "../services/notificationService";
import mongoose from "mongoose";

/**
 * @desc    Submit a bid for a vendor requirement
 * @route   POST /api/vendor-bid/submit
 * @access  Private (Vendor only)
 */
export const submitBid = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user?._id;
    const userRole = req.user?.role;

    if (!userId) {
      return errorResponse(res, "User not authenticated", 401);
    }

    // Only vendors can submit bids
    if (userRole !== "vendor") {
      return errorResponse(res, "Only vendors can submit bids", 403);
    }

    const { requirementId, bidAmount, deliveryTime, message } = req.body;

    if (!requirementId) {
      return errorResponse(res, "Requirement ID is required", 400);
    }

    if (!bidAmount || isNaN(parseFloat(bidAmount))) {
      return errorResponse(res, "Valid bid amount is required", 400);
    }

    const requirement = await VendorRequirement.findById(requirementId);

    if (!requirement) {
      return errorResponse(res, "Vendor requirement not found", 404);
    }

    // Check if requirement is open and accepting bids
    // Cannot submit bids for inactive or expired requirements
    if (requirement.status !== "open") {
      if (requirement.status === "inactive") {
        return errorResponse(
          res,
          "This requirement is no longer accepting bids. A deal has already been created for this requirement.",
          400,
        );
      }
      if (requirement.status === "expired") {
        return errorResponse(
          res,
          "This requirement has expired and is no longer accepting bids.",
          400,
        );
      }
      return errorResponse(
        res,
        "This requirement is no longer accepting bids",
        400,
      );
    }

    // Check if vendor already submitted a bid
    const existingBid = await VendorBid.findOne({
      requirementId,
      vendorId: userId.toString(),
    });

    if (existingBid) {
      return errorResponse(
        res,
        "You have already submitted a bid for this requirement",
        400,
      );
    }

    // Create bid
    const bid = await VendorBid.create({
      requirementId,
      vendorId: userId.toString(),
      userId: requirement.userId, // The requirement owner (brand/influencer)
      message: message || "Bid submitted",
      proposedTerms: {
        price: parseFloat(bidAmount),
        currency: "INR",
        deliveryTime: deliveryTime || undefined,
      },
      status: "pending",
    });

    // Update requirement total bids count
    await VendorRequirement.findByIdAndUpdate(requirementId, {
      $inc: { totalBids: 1 },
    });

    // Notify requirement owner (brand/influencer) about the new bid
    const vendorName =
      (req.user as any)?.vendorInfo?.businessName ||
      (req.user as any)?.name ||
      "A vendor";
    const requirementTitle = (requirement as any).title || "Your requirement";
    const amountStr = `₹${Number(bidAmount).toLocaleString("en-IN")}`;
    const ownerId = new mongoose.Types.ObjectId(requirement.userId);
    createAndSend(
      ownerId,
      "vendor_bid_received",
      "New bid on your requirement",
      `${vendorName} placed a bid of ${amountStr} on "${requirementTitle}".`,
      {
        requirementId: String(requirementId),
        bidId: String(bid._id),
        vendorId: String(userId),
      },
    ).catch((err) =>
      console.error("Failed to send vendor bid notification", err),
    );

    // Populate bid for response
    const populatedBid = await VendorBid.findById(bid._id)
      .populate("requirementId", "title category budget status")
      .populate("userId", "name profilePictureUrl role businessInfo")
      .lean();

    return successResponse(
      res,
      "Bid submitted successfully. The client will review your bid.",
      populatedBid,
    );
  } catch (error: unknown) {
    console.error("Submit bid error:", error);
    if (error instanceof Error) {
      return errorResponse(res, error.message, 500);
    }
    return errorResponse(res, "Failed to submit bid", 500);
  }
};

/**
 * @desc    Get vendor's bids (bids sent by vendor)
 * @route   GET /api/vendor-bid/vendor/bids
 * @access  Private (Vendor)
 */
export const getVendorBids = async (
  req: AuthenticatedRequest,
  res: Response,
) => {
  try {
    const vendorId = req.user?._id;

    if (!vendorId) {
      return errorResponse(res, "User not authenticated", 401);
    }

    if (req.user?.role !== "vendor") {
      return errorResponse(res, "Only vendors can view their bids", 403);
    }

    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const skip = (page - 1) * limit;

    const filter: any = { vendorId: vendorId.toString() };

    if (req.query.status) {
      filter.status = req.query.status;
    }

    const total = await VendorBid.countDocuments(filter);

    const bids = await VendorBid.find(filter)
      .populate("requirementId", "title category budget status location")
      .populate("userId", "name profilePictureUrl role businessInfo addresses")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean();

    const pagination: Pagination = {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    };

    return paginatedResponse(
      res,
      "Bids fetched successfully",
      bids,
      pagination,
    );
  } catch (error: unknown) {
    console.error("Get vendor bids error:", error);
    if (error instanceof Error) {
      return errorResponse(res, error.message, 500);
    }
    return errorResponse(res, "Failed to fetch bids", 500);
  }
};

/**
 * @desc    Get vendor's bid for a specific requirement
 * @route   GET /api/vendor-bid/vendor/requirement/:requirementId
 * @access  Private (Vendor)
 */
export const getVendorBidForRequirement = async (
  req: AuthenticatedRequest,
  res: Response,
) => {
  try {
    const vendorId = req.user?._id;
    const { requirementId } = req.params;

    if (!vendorId) {
      return errorResponse(res, "User not authenticated", 401);
    }

    const bid = await VendorBid.findOne({
      requirementId,
      vendorId: vendorId.toString(),
    })
      .populate("requirementId", "title category budget status")
      .populate("userId", "name profilePictureUrl role businessInfo")
      .lean();

    if (!bid) {
      return successResponse(res, "No bid found for this requirement", null);
    }

    return successResponse(res, "Bid fetched successfully", bid);
  } catch (error: unknown) {
    console.error("Get vendor bid for requirement error:", error);
    if (error instanceof Error) {
      return errorResponse(res, error.message, 500);
    }
    return errorResponse(res, "Failed to fetch bid", 500);
  }
};

/**
 * @desc    Get bids for a requirement (for brand/influencer to see all bids)
 * @route   GET /api/vendor-bid/requirement/:requirementId
 * @access  Private (Requirement owner)
 */
export const getBidsByRequirement = async (
  req: AuthenticatedRequest,
  res: Response,
) => {
  try {
    const { requirementId } = req.params;
    const userId = req.user?._id;

    if (!userId) {
      return errorResponse(res, "User not authenticated", 401);
    }

    // Check if requirement exists
    const requirement = await VendorRequirement.findById(requirementId);

    if (!requirement) {
      return errorResponse(res, "Requirement not found", 404);
    }

    // Only the requirement owner can see all bids
    if (requirement.userId !== userId.toString()) {
      return errorResponse(
        res,
        "You are not authorized to view these bids",
        403,
      );
    }

    const bids = await VendorBid.find({ requirementId })
      .populate("vendorId", "name profilePictureUrl vendorInfo")
      .sort({ createdAt: -1 })
      .lean();

    return successResponse(res, "Bids fetched successfully", bids);
  } catch (error: unknown) {
    console.error("Get bids by requirement error:", error);
    if (error instanceof Error) {
      return errorResponse(res, error.message, 500);
    }
    return errorResponse(res, "Failed to fetch bids", 500);
  }
};

/**
 * @desc    Accept a bid (brand/influencer accepts vendor bid)
 * @route   POST /api/vendor-bid/accept/:bidId
 * @access  Private (Requirement owner)
 */
export const acceptBid = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { bidId } = req.params;
    const userId = req.user?._id;
    const { message } = req.body;

    if (!userId) {
      return errorResponse(res, "User not authenticated", 401);
    }

    const bid = await VendorBid.findById(bidId);

    if (!bid) {
      return errorResponse(res, "Bid not found", 404);
    }

    // Check if user is the requirement owner
    if (bid.userId !== userId.toString()) {
      return errorResponse(
        res,
        "You are not authorized to accept this bid",
        403,
      );
    }

    if (bid.status !== "pending") {
      return errorResponse(res, "This bid cannot be accepted", 400);
    }

    // Update bid status
    bid.status = "accepted";
    bid.clientResponse = {
      message: message || "Your bid has been accepted",
      respondedAt: new Date(),
    };
    await bid.save();

    // Get requirement and vendor info
    const requirement = await VendorRequirement.findById(bid.requirementId);
    const vendorUser = await User.findById(bid.vendorId)
      .select("name email phone profilePictureUrl vendorInfo businessInfo")
      .lean();

    if (!requirement) {
      return errorResponse(res, "Requirement not found", 404);
    }

    if (!vendorUser) {
      return errorResponse(res, "Vendor not found", 404);
    }

    // Create VendorBrandDeal when bid is accepted
    // Note: VendorBrandDeal uses offerId field, we'll store bidId there
    const dealData: any = {
      brandId: bid.userId.toString(), // Brand/Influencer who owns the requirement
      vendorId: bid.vendorId.toString(), // Vendor who placed the bid
      requirementId: bid.requirementId.toString(),
      offerId: bid._id.toString(), // Store bidId in offerId field (deal can come from either offer or bid)
      status: "running",
      message: message || "Bid accepted, deal established",
      dealAt: new Date(),
      finalTerms: {
        agreedAmount: bid.proposedTerms.price,
        currency: bid.proposedTerms.currency || "INR",
        deliveryTime: bid.proposedTerms.deliveryTime || undefined,
        serviceStatus: "pending",
        paymentStatus: "pending",
        finalRequirements: requirement.requirements || [],
        finalDeliverables: [bid.proposedTerms.description || ""],
        includesRevisions: bid.proposedTerms.includesRevisions || false,
        numberOfRevisions: bid.proposedTerms.numberOfRevisions || undefined,
        additionalServices: bid.proposedTerms.additionalServices || [],
        description: bid.proposedTerms.description || undefined,
      },
      isActive: true,
    };

    const deal = await VendorBrandDeal.create(dealData);

    // Update requirement to mark vendor as selected and set status to 'inactive'
    // This prevents more offers and hides the requirement from public listings
    await VendorRequirement.findByIdAndUpdate(bid.requirementId, {
      selectedVendorId: bid.vendorId.toString(),
      status: "inactive",
    });

    // Notify vendor that their bid was accepted
    const requirementTitle = (requirement as any).title || "Requirement";
    createAndSend(
      new mongoose.Types.ObjectId(bid.vendorId),
      "vendor_bid_accepted",
      "Your bid was accepted",
      `Your bid on "${requirementTitle}" has been accepted. A deal has been created.`,
      {
        bidId: String(bid._id),
        requirementId: String(bid.requirementId),
        dealId: String(deal._id),
      },
    ).catch((err) =>
      console.error("Failed to send vendor bid accepted notification", err),
    );

    // Populate bid for response
    const populatedBid = await VendorBid.findById(bid._id)
      .populate("requirementId", "title category budget status location")
      .populate("userId", "name profilePictureUrl role businessInfo addresses")
      .lean();

    return successResponse(res, "Bid accepted successfully. Deal created.", {
      bid: populatedBid,
      deal: deal,
    });
  } catch (error: unknown) {
    console.error("Accept bid error:", error);
    if (error instanceof Error) {
      return errorResponse(res, error.message, 500);
    }
    return errorResponse(res, "Failed to accept bid", 500);
  }
};

/**
 * @desc    Decline a bid (brand/influencer declines vendor bid)
 * @route   POST /api/vendor-bid/decline/:bidId
 * @access  Private (Requirement owner)
 */
export const declineBid = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { bidId } = req.params;
    const userId = req.user?._id;
    const { message } = req.body;

    if (!userId) {
      return errorResponse(res, "User not authenticated", 401);
    }

    const bid = await VendorBid.findById(bidId);

    if (!bid) {
      return errorResponse(res, "Bid not found", 404);
    }

    // Check if user is the requirement owner
    if (bid.userId !== userId.toString()) {
      return errorResponse(
        res,
        "You are not authorized to decline this bid",
        403,
      );
    }

    if (bid.status !== "pending") {
      return errorResponse(res, "This bid cannot be declined", 400);
    }

    // Update bid status
    bid.status = "declined";
    bid.clientResponse = {
      message: message || "Your bid has been declined",
      respondedAt: new Date(),
    };
    await bid.save();

    // Notify vendor that their bid was declined
    const requirement = await VendorRequirement.findById(bid.requirementId)
      .select("title")
      .lean();
    const requirementTitle = (requirement as any)?.title || "Requirement";
    createAndSend(
      new mongoose.Types.ObjectId(bid.vendorId),
      "vendor_bid_declined",
      "Your bid was declined",
      `Your bid on "${requirementTitle}" has been declined.`,
      { bidId: String(bid._id), requirementId: String(bid.requirementId) },
    ).catch((err) =>
      console.error("Failed to send vendor bid declined notification", err),
    );

    // Populate bid for response
    const populatedBid = await VendorBid.findById(bid._id)
      .populate("requirementId", "title category budget status location")
      .populate("userId", "name profilePictureUrl role businessInfo addresses")
      .lean();

    return successResponse(res, "Bid declined successfully", populatedBid);
  } catch (error: unknown) {
    console.error("Decline bid error:", error);
    if (error instanceof Error) {
      return errorResponse(res, error.message, 500);
    }
    return errorResponse(res, "Failed to decline bid", 500);
  }
};

/**
 * @desc    Get bid details by ID
 * @route   GET /api/vendor-bid/:bidId
 * @access  Private
 */
export const getBidDetails = async (
  req: AuthenticatedRequest,
  res: Response,
) => {
  try {
    const { bidId } = req.params;
    const userId = req.user?._id;

    if (!userId) {
      return errorResponse(res, "User not authenticated", 401);
    }

    const bid = await VendorBid.findById(bidId)
      .populate(
        "requirementId",
        "title category budget status location description requirements",
      )
      .populate("vendorId", "name profilePictureUrl vendorInfo")
      .populate("userId", "name profilePictureUrl role businessInfo addresses")
      .lean();

    if (!bid) {
      return errorResponse(res, "Bid not found", 404);
    }

    // Check authorization - vendor can see their own bid, requirement owner can see all bids for their requirement
    const isVendor = bid.vendorId === userId.toString();
    const requirement = await VendorRequirement.findById(bid.requirementId);
    const isRequirementOwner =
      requirement && requirement.userId === userId.toString();

    if (!isVendor && !isRequirementOwner) {
      return errorResponse(res, "You are not authorized to view this bid", 403);
    }

    return successResponse(res, "Bid details fetched successfully", bid);
  } catch (error: unknown) {
    console.error("Get bid details error:", error);
    if (error instanceof Error) {
      return errorResponse(res, error.message, 500);
    }
    return errorResponse(res, "Failed to fetch bid details", 500);
  }
};
