import { Schema, model, Document, Model, Types } from 'mongoose';
import { IVendorReview } from '../../shared/types/vendorReview';

export type IVendorReviewDocument = IVendorReview<Types.ObjectId> & Document;

export interface IVendorReviewModel extends Model<IVendorReviewDocument> {}

const vendorReviewSchema = new Schema<IVendorReviewDocument, IVendorReviewModel>(
    {
        vendorId: {
            type: Schema.Types.ObjectId,
            ref: 'User',
            required: true,
            index: true,
        },
        reviewerId: {
            type: Schema.Types.ObjectId,
            ref: 'User',
            required: true,
            index: true,
        },
        reviewerRole: {
            type: String,
            enum: ['brand', 'influencer'],
            required: true,
        },
        rating: {
            type: Number,
            required: true,
            min: 1,
            max: 5,
        },
        reviewText: {
            type: String,
            required: true,
            trim: true,
        },
        projectType: {
            type: String,
            trim: true,
        },
        projectDate: {
            type: Date,
        },
        isVerified: {
            type: Boolean,
            default: false,
        },
        helpful: {
            type: Number,
            default: 0,
        },
        response: {
            text: String,
            respondedAt: Date,
        },
        isActive: {
            type: Boolean,
            default: true,
            index: true,
        },
    },
    {
        timestamps: true,
    }
);

// Indexes for better query performance
vendorReviewSchema.index({ vendorId: 1, isActive: 1, createdAt: -1 });
vendorReviewSchema.index({ reviewerId: 1, vendorId: 1 }); // Check if user already reviewed
vendorReviewSchema.index({ rating: 1 });

// Prevent duplicate reviews from the same user to the same vendor
vendorReviewSchema.index({ vendorId: 1, reviewerId: 1 }, { unique: true });

const VendorReview = model<IVendorReviewDocument, IVendorReviewModel>(
    'VendorReview',
    vendorReviewSchema
);

export default VendorReview;

