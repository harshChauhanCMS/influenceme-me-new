// Vendor-related type definitions

export interface IVendorInfo {
    vendorSince?: string;
    vendorType?: string; // e.g., "Photographer", "Videographer", "Event Planner", etc.
    businessName?: string;
    businessRegistrationNumber?: string;
    taxId?: string;
    description?: string;
    experience?: number; // years of experience
    servicesOffered?: string[]; // Array of service IDs
    serviceAreas?: string[]; // Cities/regions where they provide services
    availability?: 'full-time' | 'part-time' | 'on-demand';
    rating?: number; // Average rating
    totalReviews?: number;
    completedProjects?: number;
    website?: string;
    portfolio?: string[]; // Array of portfolio image URLs
    certifications?: string[]; // Professional certifications
    languages?: string[];
    isVerified?: boolean;
    priceRange?: {
        min: number;
        max: number;
        currency: string;
    };
}

export interface IService<T = string> {
    _id: T;
    vendorId: T; // Reference to User with role 'vendor'
    serviceName: string;
    category: ServiceCategory;
    subCategory?: string;
    description: string;
    price?: number;
    priceType?: 'fixed' | 'hourly' | 'daily' | 'package' | 'negotiable';
    currency?: string;
    duration?: string; // e.g., "2 hours", "1 day"
    images?: string[]; // Service images
    features?: string[]; // Key features/inclusions
    tags?: string[];
    isActive?: boolean;
    availability?: 'available' | 'busy' | 'unavailable';
    location?: string;
    rating?: number;
    reviewCount?: number;
    createdAt: Date;
    updatedAt: Date;
}

export interface IVendorRequirement<T = string> {
    _id: T;
    createdBy: T; // Brand or Influencer user ID
    createdByRole: 'brand' | 'influencer';
    title: string;
    category: ServiceCategory;
    description: string;
    eventType?: string; // e.g., "Product Launch", "Brand Photoshoot", "Exhibition"
    eventDate?: Date;
    location?: {
        address?: string;
        city?: string;
        state?: string;
        latitude?: number;
        longitude?: number;
    };
    budget?: {
        min?: number;
        max?: number;
        currency?: string;
    };
    requirements?: string[]; // Specific requirements
    duration?: string;
    numberOfVendorsNeeded?: number;
    preferredVendors?: T[]; // Array of vendor IDs
    status: RequirementStatus;
    applicants?: {
        vendorId: T;
        appliedAt: Date;
        proposal?: string;
        quotedPrice?: number;
        status: 'pending' | 'accepted' | 'rejected';
    }[];
    selectedVendor?: T;
    completionDate?: Date;
    isActive?: boolean;
    createdAt: Date;
    updatedAt: Date;
}

// Enums
export enum ServiceCategory {
    PHOTOGRAPHY = 'photography',
    VIDEOGRAPHY = 'videography',
    EVENT_PLANNING = 'event-planning',
    MAKEUP_ARTIST = 'makeup-artist',
    HAIR_STYLIST = 'hair-stylist',
    CATERING = 'catering',
    DECORATION = 'decoration',
    SOUND_SYSTEM = 'sound-system',
    LIGHTING = 'lighting',
    VENUE = 'venue',
    TRANSPORTATION = 'transportation',
    SECURITY = 'security',
    PRINTING = 'printing',
    GRAPHIC_DESIGN = 'graphic-design',
    CONTENT_CREATION = 'content-creation',
    SOCIAL_MEDIA_MANAGEMENT = 'social-media-management',
    OTHER = 'other',
}

export enum RequirementStatus {
    OPEN = 'open',
    IN_PROGRESS = 'in-progress',
    COMPLETED = 'completed',
    CANCELLED = 'cancelled',
    CLOSED = 'closed',
}

