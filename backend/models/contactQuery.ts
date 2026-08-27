import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IContactQuery extends Document {
    firstName: string;
    lastName: string;
    email: string;
    phone?: string;
    phoneCode?: string;
    message: string;
    userId?: mongoose.Types.ObjectId; // Optional - if user is logged in
    userRole?: 'influencer' | 'brand' | 'vendor' | 'admin';
    status: 'pending' | 'in_progress' | 'resolved' | 'closed';
    adminResponse?: string;
    respondedBy?: mongoose.Types.ObjectId; // Admin who responded
    respondedAt?: Date;
    createdAt: Date;
    updatedAt: Date;
}

const contactQuerySchema = new Schema<IContactQuery>(
    {
        firstName: {
            type: String,
            required: true,
            trim: true,
        },
        lastName: {
            type: String,
            required: true,
            trim: true,
        },
        email: {
            type: String,
            required: true,
            trim: true,
            lowercase: true,
        },
        phone: {
            type: String,
            trim: true,
        },
        phoneCode: {
            type: String,
            trim: true,
        },
        message: {
            type: String,
            required: true,
            trim: true,
        },
        userId: {
            type: Schema.Types.ObjectId,
            ref: 'User',
            default: null,
        },
        userRole: {
            type: String,
            enum: ['influencer', 'brand', 'vendor', 'admin'],
        },
        status: {
            type: String,
            enum: ['pending', 'in_progress', 'resolved', 'closed'],
            default: 'pending',
        },
        adminResponse: {
            type: String,
            trim: true,
        },
        respondedBy: {
            type: Schema.Types.ObjectId,
            ref: 'User',
        },
        respondedAt: {
            type: Date,
        },
    },
    {
        timestamps: true,
    }
);

// Indexes for efficient querying
contactQuerySchema.index({ status: 1, createdAt: -1 });
contactQuerySchema.index({ userId: 1 });
contactQuerySchema.index({ email: 1 });

const ContactQuery: Model<IContactQuery> = mongoose.model<IContactQuery>('ContactQuery', contactQuerySchema);

export default ContactQuery;

