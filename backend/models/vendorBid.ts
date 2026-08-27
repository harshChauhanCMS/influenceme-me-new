import { Schema, model, Model } from 'mongoose';
import { IVendorBid, VendorBidStatus, IVendorBidTerms } from '../../shared/types/vendorBid';

const vendorBidTermsSchema = new Schema<IVendorBidTerms>(
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

const vendorBidSchema = new Schema<IVendorBid>(
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
      type: vendorBidTermsSchema,
      required: true,
    },
    status: {
      type: String,
      enum: ['pending', 'accepted', 'declined', 'withdrawn'] as VendorBidStatus[],
      default: 'pending',
      index: true,
    },
    clientResponse: {
      message: String,
      respondedAt: Date,
    },
    attachments: [String],
  },
  {
    timestamps: true,
  }
);

// Indexes for efficient querying
vendorBidSchema.index({ requirementId: 1, status: 1 });
vendorBidSchema.index({ vendorId: 1, status: 1 });
vendorBidSchema.index({ userId: 1, status: 1 });
vendorBidSchema.index({ createdAt: -1 });

// Prevent duplicate bids from same vendor for same requirement
vendorBidSchema.index({ requirementId: 1, vendorId: 1 }, { unique: true });

const VendorBid: Model<IVendorBid> = model<IVendorBid>('VendorBid', vendorBidSchema);

export default VendorBid;

