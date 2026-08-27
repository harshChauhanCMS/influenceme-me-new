import { Response } from "express";
import { successResponse, errorResponse } from "../utils/responseHelper";
import { AuthenticatedRequest } from "../middleware/auth";
import PayoutMilestone, { PayoutMilestoneStatus } from "../models/payoutMilestone";
import Payment from "../models/payment";
import { notifyAdmins } from "../services/notificationService";

// ---------------------------------------------------------
// ✅ GET MILESTONES FOR A PAYMENT (payer or payee only)
// ---------------------------------------------------------
export const getMilestonesForPayment = async (req: AuthenticatedRequest, res: Response) => {
    try {
        const userId = req.user?._id?.toString();
        const { paymentId } = req.params;

        if (!userId) {
            return errorResponse(res, "User not authenticated", 401);
        }

        const payment = await Payment.findOne({ paymentId });
        if (!payment) {
            return errorResponse(res, "Payment not found", 404);
        }

        if (payment.payerId !== userId && payment.payeeId !== userId) {
            return errorResponse(res, "Unauthorized access to this payment", 403);
        }

        const milestones = await PayoutMilestone.find({ paymentId }).sort({ milestoneNumber: 1 });

        return successResponse(res, "Milestones retrieved successfully", { milestones });
    } catch (error: any) {
        console.error("Error getting payout milestones:", error);
        return errorResponse(res, `Failed to get milestones: ${error.message}`, 500);
    }
};

// ---------------------------------------------------------
// ✅ REQUEST MILESTONE RELEASE (payee only)
// ---------------------------------------------------------
export const requestMilestoneRelease = async (req: AuthenticatedRequest, res: Response) => {
    try {
        const userId = req.user?._id?.toString();
        const { milestoneId } = req.params;
        const { workNote } = req.body;

        if (!userId) {
            return errorResponse(res, "User not authenticated", 401);
        }

        const milestone = await PayoutMilestone.findById(milestoneId);
        if (!milestone) {
            return errorResponse(res, "Milestone not found", 404);
        }

        if (milestone.payeeId !== userId) {
            return errorResponse(res, "Only the payee can request this milestone's release", 403);
        }

        if (milestone.status !== PayoutMilestoneStatus.PENDING) {
            return errorResponse(res, `Milestone cannot be requested from status "${milestone.status}"`, 400);
        }

        milestone.status = PayoutMilestoneStatus.REQUESTED;
        milestone.workNote = workNote;
        milestone.requestedAt = new Date();
        await milestone.save();

        await notifyAdmins(
            "payout_milestone_requested",
            "Payout milestone release requested",
            `Milestone ${milestone.milestoneNumber} (${milestone.percentage}%, ${milestone.currency} ${milestone.amount}) requested for payment ${milestone.paymentId}.`,
            {
                milestoneId: String(milestone._id),
                paymentId: milestone.paymentId,
                dealId: milestone.dealId,
            }
        );

        return successResponse(res, "Milestone release requested", { milestone });
    } catch (error: any) {
        console.error("Error requesting milestone release:", error);
        return errorResponse(res, `Failed to request milestone release: ${error.message}`, 500);
    }
};

// ---------------------------------------------------------
// ✅ ADMIN: LIST PENDING MILESTONE REQUESTS
// ---------------------------------------------------------
export const getPendingMilestoneRequests = async (req: AuthenticatedRequest, res: Response) => {
    try {
        const milestones = await PayoutMilestone.find({ status: PayoutMilestoneStatus.REQUESTED }).sort({
            requestedAt: 1,
        });

        return successResponse(res, "Pending milestone requests retrieved", { milestones });
    } catch (error: any) {
        console.error("Error getting pending milestone requests:", error);
        return errorResponse(res, `Failed to get pending milestone requests: ${error.message}`, 500);
    }
};

// ---------------------------------------------------------
// ✅ ADMIN: APPROVE MILESTONE (mark as paid after manual transfer)
// ---------------------------------------------------------
export const approveMilestone = async (req: AuthenticatedRequest, res: Response) => {
    try {
        const adminId = req.user?._id?.toString();
        const { milestoneId } = req.params;
        const { adminNote } = req.body;

        const milestone = await PayoutMilestone.findById(milestoneId);
        if (!milestone) {
            return errorResponse(res, "Milestone not found", 404);
        }

        if (milestone.status !== PayoutMilestoneStatus.REQUESTED) {
            return errorResponse(res, `Only requested milestones can be approved (current status: "${milestone.status}")`, 400);
        }

        milestone.status = PayoutMilestoneStatus.PAID;
        milestone.adminNote = adminNote;
        milestone.reviewedAt = new Date();
        milestone.reviewedBy = adminId;
        milestone.paidAt = new Date();
        await milestone.save();

        // Unlock the next milestone in the sequence, if any.
        if (milestone.milestoneNumber < 3) {
            await PayoutMilestone.updateOne(
                {
                    paymentId: milestone.paymentId,
                    milestoneNumber: milestone.milestoneNumber + 1,
                    status: PayoutMilestoneStatus.LOCKED,
                },
                { $set: { status: PayoutMilestoneStatus.PENDING } }
            );
        }

        return successResponse(res, "Milestone approved and marked as paid", { milestone });
    } catch (error: any) {
        console.error("Error approving milestone:", error);
        return errorResponse(res, `Failed to approve milestone: ${error.message}`, 500);
    }
};

// ---------------------------------------------------------
// ✅ ADMIN: REJECT MILESTONE (returns to pending for re-request)
// ---------------------------------------------------------
export const rejectMilestone = async (req: AuthenticatedRequest, res: Response) => {
    try {
        const adminId = req.user?._id?.toString();
        const { milestoneId } = req.params;
        const { adminNote } = req.body;

        if (!adminNote || !String(adminNote).trim()) {
            return errorResponse(res, "adminNote is required when rejecting a milestone", 400);
        }

        const milestone = await PayoutMilestone.findById(milestoneId);
        if (!milestone) {
            return errorResponse(res, "Milestone not found", 404);
        }

        if (milestone.status !== PayoutMilestoneStatus.REQUESTED) {
            return errorResponse(res, `Only requested milestones can be rejected (current status: "${milestone.status}")`, 400);
        }

        milestone.status = PayoutMilestoneStatus.PENDING;
        milestone.adminNote = adminNote;
        milestone.reviewedAt = new Date();
        milestone.reviewedBy = adminId;
        await milestone.save();

        return successResponse(res, "Milestone request rejected", { milestone });
    } catch (error: any) {
        console.error("Error rejecting milestone:", error);
        return errorResponse(res, `Failed to reject milestone: ${error.message}`, 500);
    }
};
