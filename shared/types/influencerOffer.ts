import {IInfluencerBrandDeal} from "./influencerBrandDeal";

export interface IResponse {
    responseType: "accepted" | "decline" | "negotiate";
    message?: string;
    respondedAt?: Date;
    negotiationDetails: {
        proposedAmount: Number,
        proposedDeadline: Date,
        counterRequirements: [String],
    }
}

// Main Offer Interface
export interface IInfluencerOffer<T = string> {
    _id: T;
    brandId: string;
    influencerId: string;
    campaignId: string;
    roomId: string;
    status:
        | "pending"
        | "accepted"
        | "declined"
        | "negotiated"
        | "completed"
        | "cancelled";
    response?: IResponse;
    deal?: IInfluencerBrandDeal;
    createdAt?: Date;
    updatedAt?: Date;
    acceptedAt?: Date;
    isActive: boolean;
}