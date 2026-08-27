// Vendor Review type definitions

export interface IVendorReview<T = string> {
    _id: T;
    vendorId: T; // Reference to vendor user
    reviewerId: T; // Brand or Influencer who gave the review
    reviewerRole: 'brand' | 'influencer'; // Role of the reviewer
    rating: number; // 1-5 stars
    reviewText: string; // Review content
    projectType?: string; // Type of service used (e.g., "Photography", "Event Planning")
    projectDate?: Date; // When the service was provided
    isVerified?: boolean; // If the review is from a verified collaboration
    helpful?: number; // Count of users who found this helpful
    response?: {
        text: string;
        respondedAt: Date;
    }; // Vendor's response to the review
    isActive?: boolean;
    createdAt: Date;
    updatedAt: Date;
}

export interface IVendorReviewStats {
    averageRating: number;
    totalReviews: number;
    ratingDistribution: {
        5: number;
        4: number;
        3: number;
        2: number;
        1: number;
    };
}

