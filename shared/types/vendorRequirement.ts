// Vendor Requirement Types
// Brand/Influencer posts requirements, Vendors send offers

export type RequirementStatus = 'open' | 'in-progress' | 'completed' | 'cancelled' | 'closed' | 'inactive' | 'expired';
export type RequirementPriority = 'low' | 'medium' | 'high' | 'urgent';
export type ServiceCategory = 
    | 'photography' 
    | 'videography' 
    | 'event-planning' 
    | 'makeup-artist' 
    | 'hair-stylist' 
    | 'catering' 
    | 'decoration' 
    | 'sound-system' 
    | 'lighting' 
    | 'content-creation' 
    | 'graphic-design' 
    | 'social-media-management' 
    | 'other';

export interface IVendorRequirement {
    _id?: string;
    userId: string; // Brand or Influencer who posted the requirement
    title: string;
    description: string;
    category: ServiceCategory;
    budget?: number;
    budgetCurrency?: string;
    location?: string;
    city?: string;
    state?: string;
    country?: string;
    latitude?: string;
    longitude?: string;
    deadline?: Date;
    startDate?: Date;
    endDate?: Date;
    priority?: RequirementPriority;
    status: RequirementStatus;
    attachments?: string[]; // URLs to images/documents
    tags?: string[];
    requirements?: string[]; // Specific requirements/deliverables
    selectedVendorId?: string; // ID of the vendor who was selected
    totalOffers?: number; // Count of offers received
    totalBids?: number; // Count of bids received
    createdAt?: Date;
    updatedAt?: Date;
    
    // Populated fields for frontend display
    user?: {
        _id: string;
        name: string;
        profilePictureUrl?: string;
        role: 'brand' | 'influencer';
        businessInfo?: {
            businessName?: string;
        };
    };
    selectedVendor?: {
        _id: string;
        name: string;
        profilePictureUrl?: string;
        vendorInfo?: {
            businessName?: string;
            rating?: number;
        };
    };
}

