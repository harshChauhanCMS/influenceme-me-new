import mongoose, {Document, Schema, Model, Types} from "mongoose";
import {
    IInfluencerOffer as ISharedInfluencerOffer,
    IResponse,
} from '../../shared/types/influencerOffer';

// Main Influencer Offer Interface
export type IInfluencerOffer = ISharedInfluencerOffer<Types.ObjectId> & Document & {};

export function getInfluencerOfferStatusList() {
    return [
        "pending",
        "accepted",
        "declined",
        "negotiated",
        "completed",
        "cancelled",
    ];
}

export function getInfluencerOfferResponseList() {
    return ["accepted", "decline", "negotiate"];
}

// Sub-schema for negotiation details
const negotiationDetailsSchema = new Schema({
    proposedAmount: Number,
    proposedDeadline: Date,
    counterRequirements: [String],
}, { _id: false });

// Sub-schema for response
const responseSchema = new Schema<IResponse>({
    responseType: {
        type: String,
        enum: getInfluencerOfferResponseList(),
        required: true,
    },
    message: {
        type: String,
    },
    respondedAt: {
        type: Date,
        default: Date.now,
    },
    // Reflecting the nested structure from shared types
    negotiationDetails: negotiationDetailsSchema,
}, { _id: false });


const influencerOfferSchema = new Schema<IInfluencerOffer>(
    {
        brandId: {
            type: String, // Keeping as String per your original structure
            required: true,
        },
        influencerId: {
            type: String, // Keeping as String per your original structure
            required: true,
        },
        campaignId: {
            type: String, // Keeping as String per your original structure
            required: true,
            index: true,
        },
        roomId: {
            type: String,
            required: false,
            index: true,
        },
        status: {
            type: String,
            enum: getInfluencerOfferStatusList(),
            default: "pending",
        },
        // The response object now uses the sub-schema for proper nesting
        response: responseSchema,

        // Link to the resulting deal when accepted
        deal: {
            type: Schema.Types.ObjectId,
            ref: "InfluencerBrandDeal",
        },

        acceptedAt: Date,
        isActive: {
            type: Boolean,
            default: true,
        },
        createdAt: Date,
        updatedAt: Date
    },
    {
        timestamps: true,
    }
);

influencerOfferSchema.index({brandId: 1, influencerId: 1});
influencerOfferSchema.index({status: 1});

const InfluencerOffer: Model<IInfluencerOffer> = mongoose.model<IInfluencerOffer>(
    "InfluencerOffer",
    influencerOfferSchema
);

export default InfluencerOffer;
