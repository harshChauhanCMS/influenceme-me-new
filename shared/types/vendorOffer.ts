// Vendor Offer Types
// Vendors send offers in response to requirements posted by Brand/Influencer

export type VendorOfferStatus = 'pending' | 'accepted' | 'declined' | 'negotiating' | 'withdrawn';

export interface IVendorOfferTerms {
    price: number;
    currency?: string;
    deliveryTime?: string; // e.g., "7 days", "2 weeks"
    includesRevisions?: boolean;
    numberOfRevisions?: number;
    description?: string;
    additionalServices?: string[];
}

export interface IVendorOffer {
    _id?: string;
    requirementId: string; // The requirement this offer is for
    vendorId: string; // Vendor who sent the offer
    userId: string; // Brand/Influencer who posted the requirement
    
    // Offer details
    message: string; // Cover letter / pitch
    proposedTerms: IVendorOfferTerms;
    status: VendorOfferStatus;
    
    // Negotiation history
    negotiationHistory?: {
        message: string;
        proposedTerms: IVendorOfferTerms;
        sender: 'vendor' | 'client'; // client = brand/influencer
        createdAt: Date;
    }[];
    
    // Response from client
    clientResponse?: {
        message: string;
        respondedAt: Date;
    };
    
    // Metadata
    attachments?: string[]; // Portfolio items, samples, etc.
    isShortlisted?: boolean; // Client can shortlist offers
    createdAt?: Date;
    updatedAt?: Date;
    
    // Populated fields for frontend display
    requirement?: {
        _id: string;
        title: string;
        category: string;
        budget?: number;
        status: string;
    };
    vendor?: {
        _id: string;
        name: string;
        profilePictureUrl?: string;
        vendorInfo?: {
            businessName?: string;
            rating?: number;
            totalReviews?: number;
            experience?: number;
        };
    };
    user?: {
        _id: string;
        name: string;
        profilePictureUrl?: string;
        role: 'brand' | 'influencer';
        businessInfo?: {
            businessName?: string;
        };
    };
}

