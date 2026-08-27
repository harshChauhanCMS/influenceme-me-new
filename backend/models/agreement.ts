import mongoose, { Document, Schema, Model } from "mongoose";

export interface IAgreement extends Document {
    dealId: mongoose.Types.ObjectId;
    dealType: "influencer-brand" | "vendor-brand";
    agreementFile: string; // URL to PDF file
    brandAgreed: boolean;
    influencerAgreed?: boolean; // For influencer-brand deals
    vendorAgreed?: boolean; // For vendor-brand deals
    brandAgreedAt?: Date;
    influencerAgreedAt?: Date;
    vendorAgreedAt?: Date;
    isActive: boolean;
    createdAt: Date;
    updatedAt: Date;
}

const agreementSchema = new Schema<IAgreement>(
    {
        dealId: {
            type: Schema.Types.ObjectId,
            required: true,
            refPath: "dealType",
        },
        dealType: {
            type: String,
            enum: ["influencer-brand", "vendor-brand"],
            required: true,
        },
        agreementFile: {
            type: String,
            required: true,
        },
        brandAgreed: {
            type: Boolean,
            default: false,
        },
        influencerAgreed: {
            type: Boolean,
            default: false,
        },
        vendorAgreed: {
            type: Boolean,
            default: false,
        },
        brandAgreedAt: {
            type: Date,
        },
        influencerAgreedAt: {
            type: Date,
        },
        vendorAgreedAt: {
            type: Date,
        },
        isActive: {
            type: Boolean,
            default: true,
        },
    },
    {
        timestamps: true,
    }
);

agreementSchema.index({ dealId: 1, dealType: 1 }, { unique: true });
agreementSchema.index({ brandAgreed: 1, influencerAgreed: 1 });
agreementSchema.index({ brandAgreed: 1, vendorAgreed: 1 });

const Agreement: Model<IAgreement> = mongoose.model<IAgreement>(
    "Agreement",
    agreementSchema
);

export default Agreement;

