// Influencer Bid Interface
// When influencers apply/bid for campaigns

export interface IInfluencerBid<T = string> {
    _id: T;
    campaignId: string;
    influencerId: string;
    brandId: string; // Campaign owner
    
    // Bid details
    bidAmount?: number; // Only for auction campaigns
    proposedValue?: string; // For non-auction campaigns, what value they bring
    message?: string; // Cover letter / application message
    
    // Status
    status: "pending" | "accepted" | "rejected" | "shortlisted" | "withdrawn";
    
    // Response from brand
    brandResponse?: {
        responseType: "accepted" | "rejected" | "shortlisted";
        message?: string;
        respondedAt?: Date;
    };
    
    // Link to deal when brand creates one from this accepted bid
    dealId?: string;

    // Metadata
    createdAt?: Date;
    updatedAt?: Date;
    withdrawnAt?: Date;
    isActive: boolean;
}
















