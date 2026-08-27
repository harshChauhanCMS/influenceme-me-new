import { Schema, model, Model } from 'mongoose';
import { IVendorOffer, VendorOfferStatus, IVendorOfferTerms } from '../../shared/types/vendorOffer';

const vendorOfferTermsSchema = new Schema<IVendorOfferTerms>(
  {
    price: {
      type: Number,
      required: true,
    },
    currency: {
      type: String,
      default: 'INR',
    },
    deliveryTime: String,
    includesRevisions: Boolean,
    numberOfRevisions: Number,
    description: String,
    additionalServices: [String],
  },
  { _id: false }
);

const negotiationHistorySchema = new Schema(
  {
    message: String,
    proposedTerms: vendorOfferTermsSchema,
    sender: {
      type: String,
      enum: ['vendor', 'client'],
      required: true,
    },
    createdAt: {
      type: Date,
      default: Date.now,
    },
  },
  { _id: false }
);

const vendorOfferSchema = new Schema<IVendorOffer>(
  {
    requirementId: {
      type: String,
      ref: 'VendorRequirement',
      required: true,
      index: true,
    },
    vendorId: {
      type: String,
      ref: 'User',
      required: true,
      index: true,
    },
    userId: {
      type: String,
      ref: 'User',
      required: true,
      index: true,
    },
    message: {
      type: String,
      required: true,
    },
    proposedTerms: {
      type: vendorOfferTermsSchema,
      required: true,
    },
    status: {
      type: String,
      enum: ['pending', 'accepted', 'declined', 'negotiating', 'withdrawn'] as VendorOfferStatus[],
      default: 'pending',
      index: true,
    },
    negotiationHistory: [negotiationHistorySchema],
    clientResponse: {
      message: String,
      respondedAt: Date,
    },
    attachments: [String],
    isShortlisted: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  }
);

// Indexes for efficient querying
vendorOfferSchema.index({ requirementId: 1, status: 1 });
vendorOfferSchema.index({ vendorId: 1, status: 1 });
vendorOfferSchema.index({ userId: 1, status: 1 });
vendorOfferSchema.index({ createdAt: -1 });

// Prevent duplicate offers from same vendor for same requirement
vendorOfferSchema.index({ requirementId: 1, vendorId: 1 }, { unique: true });

const VendorOffer: Model<IVendorOffer> = model<IVendorOffer>('VendorOffer', vendorOfferSchema);

export default VendorOffer;

