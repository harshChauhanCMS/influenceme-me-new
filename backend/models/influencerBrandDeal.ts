import mongoose, {Document, Schema, Model, Types} from "mongoose";
import {
    IInfluencerBrandDeal as ISharedIInfluencerBrandDeal,
} from '../../shared/types/influencerBrandDeal';

// Main Influencer Offer Interface
export type IInfluencerBrandDeal = ISharedIInfluencerBrandDeal<Types.ObjectId> & Document & {};

// Sub-schema for final terms
const finalTermsSchema = new Schema({
    agreedAmount: Number,
    agreedDeadline: Date,
    finalRequirements: [String],
    finalDeliverables: [String],
}, { _id: false });

const influencerBrandDealSchema = new Schema<IInfluencerBrandDeal>(
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
            enum: [
                "agreement-pending",
                "running",
                "completion_requested",
                "completed",
                "cancelled",
            ],
            default: "agreement-pending",
        },
        message: {
            type: String,
        },
        // Using the defined sub-schema
        finalTerms: finalTermsSchema,

        dealAt: Date, // Renamed from agreementAt in your index to match the shared type structure
        agreementFile: String,
        agreementAt: Date,
        completedAt: Date,
        isActive: {
            type: Boolean,
            default: true,
        },
    },
    {
        timestamps: true,
    }
);

influencerBrandDealSchema.index({brandId: 1, influencerId: 1});
influencerBrandDealSchema.index({status: 1});
influencerBrandDealSchema.index({dealAt: 1}); // Corrected index key

const InfluencerBrandDeal: Model<IInfluencerBrandDeal> = mongoose.model<IInfluencerBrandDeal>(
    "InfluencerBrandDeal",
    influencerBrandDealSchema
);

export default InfluencerBrandDeal;