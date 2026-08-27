// Vendor Brand Deal Types
// Similar to InfluencerBrandDeal but for vendor-brand/influencer deals

// Interface for nested final terms object
export interface IVendorDealFinalTerms {
    agreedAmount?: number;
    currency?: string;
    agreedDeadline?: Date;
    deliveryTime?: string; // Negotiated delivery time (e.g., "7 days", "2 weeks")
    serviceStatus?: 'pending' | 'in-progress' | 'pending_verification' | 'completed' | 'cancelled';
    paymentStatus?: 'pending' | 'paid' | 'partial' | 'refunded';
    finalRequirements?: string[];
    finalDeliverables?: string[];
    // Negotiated terms from offer
    includesRevisions?: boolean;
    numberOfRevisions?: number;
    additionalServices?: string[];
    description?: string; // Negotiated description/scope
}

// Main Vendor Brand Deal Interface
export interface IVendorBrandDeal<T = string> {
    _id: T;
    brandId: string; // Brand or Influencer who sent the offer
    vendorId: string; // Vendor who accepted the offer
    requirementId: string; // The requirement this deal is based on
    offerId: string; // The original vendor offer ID
    roomId?: string; // Chat room ID if applicable
    status: 'running' | 'completed' | 'cancelled';
    message?: string;
    dealAt?: Date;
    finalTerms?: IVendorDealFinalTerms;
    agreementFile?: string;
    agreementAt?: Date;
    completedAt?: Date;
    isActive: boolean;
    createdAt?: Date;
    updatedAt?: Date;
}

