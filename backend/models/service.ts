import { Schema, model, Document, Model, Types } from 'mongoose';
import { IService } from '../../shared/types/vendor';

export type IServiceDocument = IService<Types.ObjectId> & Document;

export interface IServiceModel extends Model<IServiceDocument> {}

const serviceSchema = new Schema<IServiceDocument, IServiceModel>(
    {
        vendorId: {
            type: Schema.Types.ObjectId,
            ref: 'User',
            required: true,
            index: true,
        },
        serviceName: {
            type: String,
            required: true,
            trim: true,
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
                'venue',
                'transportation',
                'security',
                'printing',
                'graphic-design',
                'content-creation',
                'social-media-management',
                'other',
            ],
            index: true,
        },
        subCategory: {
            type: String,
            trim: true,
        },
        description: {
            type: String,
            required: true,
        },
        price: {
            type: Number,
        },
        priceType: {
            type: String,
            enum: ['fixed', 'hourly', 'daily', 'package', 'negotiable'],
            default: 'negotiable',
        },
        currency: {
            type: String,
            default: 'INR',
        },
        duration: {
            type: String,
        },
        images: [
            {
                type: String,
            },
        ],
        features: [
            {
                type: String,
            },
        ],
        tags: [
            {
                type: String,
            },
        ],
        isActive: {
            type: Boolean,
            default: true,
            index: true,
        },
        availability: {
            type: String,
            enum: ['available', 'busy', 'unavailable'],
            default: 'available',
        },
        location: {
            type: String,
        },
        rating: {
            type: Number,
            default: 0,
            min: 0,
            max: 5,
        },
        reviewCount: {
            type: Number,
            default: 0,
        },
    },
    {
        timestamps: true,
    }
);

// Indexes for better query performance
serviceSchema.index({ vendorId: 1, isActive: 1 });
serviceSchema.index({ category: 1, isActive: 1 });
serviceSchema.index({ location: 1, category: 1 });
serviceSchema.index({ serviceName: 'text', description: 'text' });

const Service = model<IServiceDocument, IServiceModel>('Service', serviceSchema);

export default Service;

