import mongoose, { Document, Schema, Model, Types, model } from "mongoose";
import { ITour, ITourLocation } from "../../shared/types/tour";

export type ITourDocument = ITour<Types.ObjectId> & Document & {
    influencerId: Types.ObjectId;
}

export interface ITourModel extends Model<ITourDocument> {}

const tourLocationSchema = new Schema<ITourLocation>({
    address: { type: String, required: true },
    city: { type: String },
    state: { type: String },
    country: { type: String },
    latitude: { type: Number },
    longitude: { type: Number },
}, { _id: false });

const tourSchema = new Schema<ITourDocument>(
    {
        influencerId: {
            type: Schema.Types.ObjectId,
            ref: "User",
            required: [true, "Influencer ID is required"],
        },
        title: {
            type: String,
            required: [true, "Tour title is required"],
            trim: true,
        },
        description: {
            type: String,
            trim: true,
        },
        location: {
            type: tourLocationSchema,
            required: [true, "Location is required"],
        },
        startDate: {
            type: Date,
            required: [true, "Start date is required"],
        },
        endDate: {
            type: Date,
            required: [true, "End date is required"],
            validate: {
                validator: function(this: ITourDocument, value: Date) {
                    return value >= this.startDate;
                },
                message: "End date must be after start date",
            },
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

// Indexes for efficient queries
tourSchema.index({ influencerId: 1 });
tourSchema.index({ "location.city": 1 });
tourSchema.index({ "location.country": 1 });
tourSchema.index({ startDate: 1, endDate: 1 });
tourSchema.index({ isActive: 1 });

const Tour: ITourModel = model<ITourDocument>("Tour", tourSchema);

export default Tour;

