import mongoose, {Document, Schema, Model, Types} from "mongoose";
import {CampaignStatus, CampaignType, CompensationType, DeliverableType} from "../../shared/enums/enums";
import {IDeliverable, ILocation, ICampaign as ISharedCampaign} from "../../shared/types/campaign";

export type ICampaign = ISharedCampaign<Types.ObjectId> & Document &  {
    createdBy: mongoose.Types.ObjectId;
}

/**
 * SUBSCHEMAS
 */
const deliverableSchema = new Schema<IDeliverable>({
    type: {
        type: String,
        required: true,
        enum: Object.values(DeliverableType),
    },
    quantity: {
        type: Number,
        required: true,
        min: 1,
    },
    description: {
        type: String,
        default: "",
    },
});

const locationSchema = new Schema<ILocation>({
    address: { type: String },
    latitude: { type: Number },
    longitude: { type: Number },
});

/**
 * MAIN CAMPAIGN SCHEMA
 */
const campaignSchema = new Schema<ICampaign>(
    {
        name: {
            type: String,
            required: [true, "Campaign name is required"],
            trim: true,
        },
        image: {
            type: String,
            default: "",
        },
        type: {
            type: String,
            required: true,
            enum: Object.values(CampaignType),
            default: CampaignType.STANDARD,
        },
        compensationType: {
            type: String,
            required: true,
            enum: Object.values(CompensationType),
            default: CompensationType.PAID,
        },
        status: {
            type: String,
            required: true,
            enum: Object.values(CampaignStatus),
            default: CampaignStatus.DRAFT,
        },
        budget: {
            type: Number,
            required: function (this: ICampaign) {
                return this.compensationType === CompensationType.PAID;
            },
        },
        startDate: {
            type: Date,
            required: [true, "Start date is required"],
        },
        endDate: {
            type: Date,
            required: [true, "End date is required"],
        },
        minBid: {
            type: Number,
            required: function (this: ICampaign) {
                return (
                    this.type === CampaignType.AUCTION &&
                    this.compensationType === CompensationType.PAID
                );
            },
        },
        targetEngagement: {
            type: Number,
            required: function (this: ICampaign) {
                return this.type === CampaignType.STANDARD;
            },
        },
        description: {
            type: String,
            default: "",
        },
        barterDetails: {
            type: String,
            required: function (this: ICampaign) {
                return this.compensationType === CompensationType.BARTER;
            },
        },
        locations: [locationSchema],
        deliverables: {
            type: [deliverableSchema],
            default: [],
        },
        createdBy: {
            type: Schema.Types.ObjectId,
            ref: "User",
            required: true,
        },
    },
    {
        timestamps: true,
        toJSON: {
            virtuals: true,
            transform(doc, ret: Record<string, any>) {
                ret.id = ret._id;
                delete ret._id;
                delete ret.__v;
                return ret;
            },
        },
    }
);

/**
 * VALIDATION HOOKS
 */
campaignSchema.pre<ICampaign>("validate", function (next) {
    if (this.startDate && this.endDate && this.endDate <= this.startDate) {
        this.invalidate("endDate", "End date must be after start date");
    }
    next();
});

/**
 * MODEL EXPORT
 */
export const Campaign: Model<ICampaign> = mongoose.model<ICampaign>(
    "Campaign",
    campaignSchema
);

export default Campaign;