import mongoose, { Document, Schema, Model, Types } from "mongoose";
import {
    IVendorBrandDeal as ISharedVendorBrandDeal,
} from '../../shared/types/vendorBrandDeal';

// Main Vendor Brand Deal Interface
export type IVendorBrandDeal = ISharedVendorBrandDeal<Types.ObjectId> & Document & {};

// Sub-schema for final terms
const finalTermsSchema = new Schema({
    agreedAmount: Number,
    currency: {
        type: String,
        default: 'INR',
    },
    agreedDeadline: Date,
    deliveryTime: String, // Negotiated delivery time (e.g., "7 days", "2 weeks")
    serviceStatus: {
        type: String,
        enum: ['pending', 'in-progress', 'pending_verification', 'completed', 'cancelled'],
        default: 'pending',
    },
    paymentStatus: {
        type: String,
        enum: ['pending', 'paid', 'partial', 'refunded'],
        default: 'pending',
    },
    finalRequirements: [String],
    finalDeliverables: [String],
    // Negotiated terms from offer
    includesRevisions: Boolean,
    numberOfRevisions: Number,
    additionalServices: [String],
    description: String, // Negotiated description/scope
}, { _id: false });

const vendorBrandDealSchema = new Schema<IVendorBrandDeal>(
    {
        brandId: {
            type: String, // Brand or Influencer who sent the offer
            required: true,
            ref: 'User',
        },
        vendorId: {
            type: String, // Vendor who accepted the offer
            required: true,
            ref: 'User',
        },
        requirementId: {
            type: String, // The requirement this deal is based on
            required: true,
            index: true,
        },
        offerId: {
            type: String, // The original vendor offer ID (the offer sent BY brand TO vendor)
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
                "running",
                "completed",
                "cancelled",
            ],
            default: "running",
        },
        message: {
            type: String,
        },
        // Using the defined sub-schema
        finalTerms: finalTermsSchema,

        dealAt: Date,
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

vendorBrandDealSchema.index({ brandId: 1, vendorId: 1 });
vendorBrandDealSchema.index({ status: 1 });
vendorBrandDealSchema.index({ dealAt: 1 });
vendorBrandDealSchema.index({ requirementId: 1 });
vendorBrandDealSchema.index({ offerId: 1 });

const VendorBrandDeal: Model<IVendorBrandDeal> = mongoose.model<IVendorBrandDeal>(
    "VendorBrandDeal",
    vendorBrandDealSchema
);

export default VendorBrandDeal;

