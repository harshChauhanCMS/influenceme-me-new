import mongoose, { Document, Schema, Model } from "mongoose";
import { Currency } from "./payment";

// A Payment (once completed) is split into 3 fixed-percentage payout
// milestones released sequentially to the payee (influencer/vendor) as
// work progresses. Money is captured by the platform up front; these
// milestones only track when/how much of it gets manually paid out.
export enum PayoutMilestoneStatus {
    LOCKED = "locked", // an earlier milestone isn't paid yet
    PENDING = "pending", // unlocked, payee can request release
    REQUESTED = "requested", // payee asked for release, awaiting admin review
    PAID = "paid", // admin approved and manually transferred the money
    REJECTED = "rejected", // admin declined the request (returns to pending)
}

export interface IPayoutMilestone extends Document {
    paymentId: string;
    dealId: string;
    payerId: string;
    payeeId: string;
    payeeType: "influencer" | "vendor";
    milestoneNumber: 1 | 2 | 3;
    percentage: 30 | 40;
    amount: number;
    currency: Currency;
    status: PayoutMilestoneStatus;
    workNote?: string;
    adminNote?: string;
    requestedAt?: Date;
    reviewedAt?: Date;
    reviewedBy?: string;
    paidAt?: Date;
    createdAt: Date;
    updatedAt: Date;
}

const payoutMilestoneSchema = new Schema<IPayoutMilestone>(
    {
        paymentId: { type: String, required: true, index: true },
        dealId: { type: String, required: true, index: true },
        payerId: { type: String, required: true },
        payeeId: { type: String, required: true, index: true },
        payeeType: { type: String, enum: ["influencer", "vendor"], required: true },
        milestoneNumber: { type: Number, enum: [1, 2, 3], required: true },
        percentage: { type: Number, enum: [30, 40], required: true },
        amount: { type: Number, required: true },
        currency: { type: String, enum: Object.values(Currency), default: Currency.INR },
        status: {
            type: String,
            enum: Object.values(PayoutMilestoneStatus),
            default: PayoutMilestoneStatus.LOCKED,
        },
        workNote: String,
        adminNote: String,
        requestedAt: Date,
        reviewedAt: Date,
        reviewedBy: String,
        paidAt: Date,
    },
    { timestamps: true }
);

payoutMilestoneSchema.index({ paymentId: 1, milestoneNumber: 1 }, { unique: true });
payoutMilestoneSchema.index({ status: 1 });

const PayoutMilestone: Model<IPayoutMilestone> = mongoose.model<IPayoutMilestone>(
    "PayoutMilestone",
    payoutMilestoneSchema
);

export default PayoutMilestone;
