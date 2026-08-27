import mongoose, { Schema, Document, Model } from 'mongoose';

export type CMSPageType = 'privacy_policy' | 'terms_conditions' | 'about_us';

export interface ICMSPage extends Document {
    pageType: CMSPageType;
    title: string;
    content: string; // HTML or Markdown content
    metaTitle?: string;
    metaDescription?: string;
    lastUpdatedBy?: mongoose.Types.ObjectId;
    version: number;
    isActive: boolean;
    createdAt: Date;
    updatedAt: Date;
}

const cmsPageSchema = new Schema<ICMSPage>(
    {
        pageType: {
            type: String,
            enum: ['privacy_policy', 'terms_conditions', 'about_us'],
            required: true,
            unique: true,
        },
        title: {
            type: String,
            required: true,
            trim: true,
        },
        content: {
            type: String,
            required: true,
        },
        metaTitle: {
            type: String,
            trim: true,
        },
        metaDescription: {
            type: String,
            trim: true,
        },
        lastUpdatedBy: {
            type: Schema.Types.ObjectId,
            ref: 'User',
        },
        version: {
            type: Number,
            default: 1,
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

// Index for fast lookups
cmsPageSchema.index({ pageType: 1, isActive: 1 });

const CMSPage: Model<ICMSPage> = mongoose.model<ICMSPage>('CMSPage', cmsPageSchema);

export default CMSPage;

