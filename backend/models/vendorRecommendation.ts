import { Schema, model, Document, Model, Types } from 'mongoose';

export interface IVendorRecommendation {
  vendorId: Types.ObjectId;
  /** Business or service name */
  businessName: string;
  description: string;
  location?: string;
  images: string[];
  /** Optional: link to an existing service (recommending that service) */
  serviceId?: Types.ObjectId;
}

export interface IVendorRecommendationDocument extends IVendorRecommendation, Document {
  createdAt: Date;
  updatedAt: Date;
}

const vendorRecommendationSchema = new Schema<IVendorRecommendationDocument>(
  {
    vendorId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    businessName: {
      type: String,
      required: true,
      trim: true,
    },
    description: {
      type: String,
      required: true,
    },
    location: {
      type: String,
      trim: true,
    },
    images: {
      type: [String],
      default: [],
    },
    serviceId: {
      type: Schema.Types.ObjectId,
      ref: 'Service',
      default: null,
    },
  },
  { timestamps: true }
);

vendorRecommendationSchema.index({ vendorId: 1, createdAt: -1 });

const VendorRecommendation = model<IVendorRecommendationDocument>(
  'VendorRecommendation',
  vendorRecommendationSchema
);

export default VendorRecommendation;
