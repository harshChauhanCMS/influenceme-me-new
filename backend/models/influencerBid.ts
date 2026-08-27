import mongoose, { Document, Schema, Model, Types } from "mongoose";
import { IInfluencerBid as ISharedInfluencerBid } from '../../shared/types/influencerBid';

// Main Influencer Bid Interface
export type IInfluencerBid = ISharedInfluencerBid<Types.ObjectId> & Document;

export function getInfluencerBidStatusList() {
    return ["pending", "accepted", "rejected", "shortlisted", "withdrawn"];
}

export function getBrandResponseTypeList() {
    return ["accepted", "rejected", "shortlisted"];
}

// Sub-schema for brand response
const brandResponseSchema = new Schema({
    responseType: {
        type: String,
        enum: getBrandResponseTypeList(),
        required: true,
    },
    message: String,
    respondedAt: {
        type: Date,
        default: Date.now,
    },
}, { _id: false });

const influencerBidSchema = new Schema<IInfluencerBid>(
    {
        campaignId: {
            type: String,
            required: true,
            index: true,
        },
        influencerId: {
            type: String,
            required: true,
            index: true,
        },
        brandId: {
            type: String,
            required: true,
            index: true,
        },
        bidAmount: {
            type: Number,
            required: false, // Only for auction campaigns
        },
        proposedValue: {
            type: String,
            required: false,
        },
        message: {
            type: String,
            required: false,
        },
        status: {
            type: String,
            enum: getInfluencerBidStatusList(),
            default: "pending",
            index: true,
        },
        brandResponse: brandResponseSchema,
        withdrawnAt: Date,
        dealId: { type: Schema.Types.ObjectId, ref: 'InfluencerBrandDeal', required: false },
        isActive: {
            type: Boolean,
            default: true,
        },
        createdAt: Date,
        updatedAt: Date,
    },
    {
        timestamps: true,
    }
);

// Compound indexes for efficient queries
influencerBidSchema.index({ campaignId: 1, influencerId: 1 });
influencerBidSchema.index({ brandId: 1, status: 1 });
influencerBidSchema.index({ influencerId: 1, status: 1 });
influencerBidSchema.index({ campaignId: 1, status: 1 });

// Ensure only one active bid per influencer per campaign
influencerBidSchema.index(
    { campaignId: 1, influencerId: 1, isActive: 1 },
    { unique: true, partialFilterExpression: { isActive: true } }
);

const InfluencerBid: Model<IInfluencerBid> = mongoose.model<IInfluencerBid>(
    "InfluencerBid",
    influencerBidSchema
);

export default InfluencerBid;
















