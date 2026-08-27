// Interface for nested final terms object
export interface IFinalTerms {
    agreedAmount?: number;
    agreedDeadline?: Date;
    finalRequirements?: string[];
    finalDeliverables?: string[];
}

// Main Offer Interface
export interface IInfluencerBrandDeal<T = string> {
    _id: T;
    brandId: string;
    influencerId: string;
    campaignId: string;
    roomId: string;
    status:
        | "agreement-pending"
        | "running"
        | "completion_requested"
        | "completed"
        | "cancelled";
    message?: string;
    dealAt?: Date;
    finalTerms?: IFinalTerms;
    agreementFile?: string;
    agreementAt?: Date;
    completedAt?: Date;
    isActive: boolean;
    createdAt?: Date;
    updatedAt?: Date;
}