import { Schema, model, Model, models } from 'mongoose';
import { IVendorRequirement, RequirementStatus, RequirementPriority, ServiceCategory } from '../../shared/types/vendorRequirement';

const vendorRequirementSchema = new Schema<IVendorRequirement>(
  {
    userId: {
      type: String,
      ref: 'User',
      required: true,
      index: true,
    },
    title: {
      type: String,
      required: true,
      trim: true,
    },
    description: {
      type: String,
      required: true,
    },
    category: {
      type: String,
      required: true,
      enum: [
        'photography',
        'videography',
        'event-planning',
        'makeup-artist',
        'hair-stylist',
        'catering',
        'decoration',
        'sound-system',
        'lighting',
        'content-creation',
        'graphic-design',
        'social-media-management',
        'other',
      ] as ServiceCategory[],
    },
    budget: {
      type: Number,
      required: false,
    },
    budgetCurrency: {
      type: String,
      default: 'INR',
    },
    location: {
      type: String,
      required: false,
    },
    city: {
      type: String,
      required: false,
    },
    state: {
      type: String,
      required: false,
    },
    country: {
      type: String,
      required: false,
    },
    latitude: {
      type: String,
      required: false,
    },
    longitude: {
      type: String,
      required: false,
    },
    deadline: {
      type: Date,
      required: false,
    },
    startDate: {
      type: Date,
      required: false,
    },
    endDate: {
      type: Date,
      required: false,
    },
    priority: {
      type: String,
      enum: ['low', 'medium', 'high', 'urgent'] as RequirementPriority[],
      default: 'medium',
    },
    status: {
      type: String,
      enum: ['open', 'in-progress', 'completed', 'cancelled', 'closed', 'inactive', 'expired'] as RequirementStatus[],
      default: 'open',
      index: true,
    },
    attachments: {
      type: [String],
      default: [],
    },
    tags: {
      type: [String],
      default: [],
    },
    requirements: {
      type: [String],
      default: [],
    },
    selectedVendorId: {
      type: String,
      ref: 'User',
      required: false,
    },
    totalOffers: {
      type: Number,
      default: 0,
    },
    totalBids: {
      type: Number,
      default: 0,
    },
  },
  {
    timestamps: true,
  }
);

// Indexes for efficient querying
vendorRequirementSchema.index({ userId: 1, status: 1 });
vendorRequirementSchema.index({ category: 1, status: 1 });
vendorRequirementSchema.index({ createdAt: -1 });

// Use existing model if it exists (for hot reloading), otherwise create new one
const VendorRequirement: Model<IVendorRequirement> = 
  models.VendorRequirement || model<IVendorRequirement>('VendorRequirement', vendorRequirementSchema);

export default VendorRequirement;
