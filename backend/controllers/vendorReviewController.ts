import { Request, Response } from 'express';
import { successResponse, errorResponse } from '../utils/responseHelper';
import VendorReview from '../models/vendorReview';
import User from '../models/user';
import { AuthenticatedRequest } from '../middleware/auth';

/**
 * @desc    Create a review for a vendor
 * @route   POST /api/vendor-review/create
 * @access  Private (Brand/Influencer only)
 */
export const createReview = async (req: AuthenticatedRequest, res: Response) => {
    try {
        const userId = req.user?.id;
        const userRole = req.user?.role;

        if (!userId || (userRole !== 'brand' && userRole !== 'influencer')) {
            return errorResponse(res, 'Only brands and influencers can create reviews', 403);
        }

        const { vendorId, rating, reviewText, projectType, projectDate } = req.body;

        if (!vendorId || !rating || !reviewText) {
            return errorResponse(res, 'Vendor ID, rating, and review text are required', 400);
        }

        // Validate rating
        if (rating < 1 || rating > 5) {
            return errorResponse(res, 'Rating must be between 1 and 5', 400);
        }

        // Check if vendor exists
        const vendor = await User.findOne({ _id: vendorId, role: 'vendor' });
        if (!vendor) {
            return errorResponse(res, 'Vendor not found', 404);
        }

        // Check if user already reviewed this vendor
        const existingReview = await VendorReview.findOne({
            vendorId,
            reviewerId: userId,
        });

        if (existingReview) {
            return errorResponse(res, 'You have already reviewed this vendor', 400);
        }

        // Create review
        const review = new VendorReview({
            vendorId,
            reviewerId: userId,
            reviewerRole: userRole,
            rating: parseFloat(rating),
            reviewText,
            projectType,
            projectDate,
            isActive: true,
        });

        const savedReview = await review.save();

        // Update vendor's rating
        await updateVendorRating(vendorId);

        // Populate reviewer info
        const populatedReview = await VendorReview.findById(savedReview._id).populate(
            'reviewerId',
            'name profilePictureUrl businessInfo'
        );

        return successResponse(res, 'Review created successfully', populatedReview?.toObject(), 201);
    } catch (error: unknown) {
        console.error('Error creating review:', error);
        if ((error as any).code === 11000) {
            return errorResponse(res, 'You have already reviewed this vendor', 400);
        }
        return errorResponse(res, 'Failed to create review', 500);
    }
};

/**
 * @desc    Get all reviews for a vendor
 * @route   GET /api/vendor-review/vendor/:vendorId
 * @access  Public
 */
export const getVendorReviews = async (req: Request, res: Response) => {
    try {
        const { vendorId } = req.params;
        const { page = '1', limit = '10', rating } = req.query;

        const query: any = {
            vendorId,
            isActive: true,
        };

        if (rating) {
            query.rating = parseInt(rating as string);
        }

        const skip = (parseInt(page as string) - 1) * parseInt(limit as string);

        const reviews = await VendorReview.find(query)
            .populate('reviewerId', 'name profilePictureUrl businessInfo influencerInfo')
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(parseInt(limit as string));

        const total = await VendorReview.countDocuments(query);

        // Get rating stats
        const stats = await getVendorReviewStats(String(vendorId));

        return successResponse(
            res,
            'Reviews fetched successfully',
            {
                reviews,
                stats,
            },
            200,
            {
                page: parseInt(page as string),
                limit: parseInt(limit as string),
                total,
                totalPages: Math.ceil(total / parseInt(limit as string)),
            }
        );
    } catch (error: unknown) {
        console.error('Error fetching reviews:', error);
        return errorResponse(res, 'Failed to fetch reviews', 500);
    }
};

/**
 * @desc    Get review statistics for a vendor
 * @route   GET /api/vendor-review/vendor/:vendorId/stats
 * @access  Public
 */
export const getReviewStats = async (req: Request, res: Response) => {
    try {
        const { vendorId } = req.params;

        const stats = await getVendorReviewStats(String(vendorId));

        return successResponse(res, 'Review stats fetched successfully', stats);
    } catch (error: unknown) {
        console.error('Error fetching review stats:', error);
        return errorResponse(res, 'Failed to fetch review stats', 500);
    }
};

/**
 * @desc    Update a review
 * @route   PUT /api/vendor-review/:id
 * @access  Private (Review owner only)
 */
export const updateReview = async (req: AuthenticatedRequest, res: Response) => {
    try {
        const userId = req.user?.id;
        const { id } = req.params;
        const { rating, reviewText, projectType, projectDate } = req.body;

        if (!userId) {
            return errorResponse(res, 'Unauthorized', 403);
        }

        const review = await VendorReview.findById(id);

        if (!review) {
            return errorResponse(res, 'Review not found', 404);
        }

        if (review.reviewerId.toString() !== userId) {
            return errorResponse(res, 'You can only update your own reviews', 403);
        }

        if (rating !== undefined) {
            if (rating < 1 || rating > 5) {
                return errorResponse(res, 'Rating must be between 1 and 5', 400);
            }
            review.rating = parseFloat(rating);
        }
        if (reviewText) review.reviewText = reviewText;
        if (projectType !== undefined) review.projectType = projectType;
        if (projectDate !== undefined) review.projectDate = projectDate;

        const updatedReview = await review.save();

        // Update vendor's rating
        await updateVendorRating(review.vendorId.toString());

        const populatedReview = await VendorReview.findById(updatedReview._id).populate(
            'reviewerId',
            'name profilePictureUrl businessInfo'
        );

        return successResponse(res, 'Review updated successfully', populatedReview?.toObject());
    } catch (error: unknown) {
        console.error('Error updating review:', error);
        return errorResponse(res, 'Failed to update review', 500);
    }
};

/**
 * @desc    Delete a review
 * @route   DELETE /api/vendor-review/:id
 * @access  Private (Review owner only)
 */
export const deleteReview = async (req: AuthenticatedRequest, res: Response) => {
    try {
        const userId = req.user?.id;
        const { id } = req.params;

        if (!userId) {
            return errorResponse(res, 'Unauthorized', 403);
        }

        const review = await VendorReview.findById(id);

        if (!review) {
            return errorResponse(res, 'Review not found', 404);
        }

        if (review.reviewerId.toString() !== userId) {
            return errorResponse(res, 'You can only delete your own reviews', 403);
        }

        const vendorId = review.vendorId.toString();
        await VendorReview.findByIdAndDelete(id);

        // Update vendor's rating
        await updateVendorRating(vendorId);

        return successResponse(res, 'Review deleted successfully', null);
    } catch (error: unknown) {
        console.error('Error deleting review:', error);
        return errorResponse(res, 'Failed to delete review', 500);
    }
};

/**
 * @desc    Mark review as helpful
 * @route   POST /api/vendor-review/:id/helpful
 * @access  Private
 */
export const markHelpful = async (req: AuthenticatedRequest, res: Response) => {
    try {
        const { id } = req.params;

        const review = await VendorReview.findById(id);

        if (!review) {
            return errorResponse(res, 'Review not found', 404);
        }

        review.helpful = (review.helpful || 0) + 1;
        await review.save();

        return successResponse(res, 'Review marked as helpful', { helpful: review.helpful });
    } catch (error: unknown) {
        console.error('Error marking review as helpful:', error);
        return errorResponse(res, 'Failed to mark review as helpful', 500);
    }
};

/**
 * @desc    Reply to a review (Vendor only)
 * @route   POST /api/vendor-review/:id/reply
 * @access  Private (Vendor only)
 */
export const replyToReview = async (req: AuthenticatedRequest, res: Response) => {
    try {
        const userId = req.user?.id;
        const userRole = req.user?.role;
        const { id } = req.params;
        const { text } = req.body;

        if (!userId || userRole !== 'vendor') {
            return errorResponse(res, 'Only vendors can reply to reviews', 403);
        }

        if (!text || text.trim().length === 0) {
            return errorResponse(res, 'Reply text is required', 400);
        }

        const review = await VendorReview.findById(id);

        if (!review) {
            return errorResponse(res, 'Review not found', 404);
        }

        // Check if this review is for the vendor
        if (review.vendorId.toString() !== userId) {
            return errorResponse(res, 'You can only reply to reviews for your business', 403);
        }

        // Update or add reply
        review.response = {
            text: text.trim(),
            respondedAt: new Date(),
        };

        const updatedReview = await review.save();

        // Populate reviewer info
        const populatedReview = await VendorReview.findById(updatedReview._id)
            .populate('reviewerId', 'name profilePictureUrl businessInfo influencerInfo')
            .lean();

        return successResponse(res, 'Reply added successfully', populatedReview);
    } catch (error: unknown) {
        console.error('Error replying to review:', error);
        return errorResponse(res, 'Failed to reply to review', 500);
    }
};

/**
 * @desc    Update reply to a review (Vendor only)
 * @route   PUT /api/vendor-review/:id/reply
 * @access  Private (Vendor only)
 */
export const updateReply = async (req: AuthenticatedRequest, res: Response) => {
    try {
        const userId = req.user?.id;
        const userRole = req.user?.role;
        const { id } = req.params;
        const { text } = req.body;

        if (!userId || userRole !== 'vendor') {
            return errorResponse(res, 'Only vendors can update replies', 403);
        }

        if (!text || text.trim().length === 0) {
            return errorResponse(res, 'Reply text is required', 400);
        }

        const review = await VendorReview.findById(id);

        if (!review) {
            return errorResponse(res, 'Review not found', 404);
        }

        // Check if this review is for the vendor
        if (review.vendorId.toString() !== userId) {
            return errorResponse(res, 'You can only update replies for your business reviews', 403);
        }

        // Update reply
        if (!review.response) {
            return errorResponse(res, 'No reply found to update', 404);
        }

        review.response.text = text.trim();
        review.response.respondedAt = new Date();

        const updatedReview = await review.save();

        // Populate reviewer info
        const populatedReview = await VendorReview.findById(updatedReview._id)
            .populate('reviewerId', 'name profilePictureUrl businessInfo influencerInfo')
            .lean();

        return successResponse(res, 'Reply updated successfully', populatedReview);
    } catch (error: unknown) {
        console.error('Error updating reply:', error);
        return errorResponse(res, 'Failed to update reply', 500);
    }
};

/**
 * @desc    Delete reply to a review (Vendor only)
 * @route   DELETE /api/vendor-review/:id/reply
 * @access  Private (Vendor only)
 */
export const deleteReply = async (req: AuthenticatedRequest, res: Response) => {
    try {
        const userId = req.user?.id;
        const userRole = req.user?.role;
        const { id } = req.params;

        if (!userId || userRole !== 'vendor') {
            return errorResponse(res, 'Only vendors can delete replies', 403);
        }

        const review = await VendorReview.findById(id);

        if (!review) {
            return errorResponse(res, 'Review not found', 404);
        }

        // Check if this review is for the vendor
        if (review.vendorId.toString() !== userId) {
            return errorResponse(res, 'You can only delete replies for your business reviews', 403);
        }

        // Remove reply
        review.response = undefined;
        await review.save();

        // Populate reviewer info
        const populatedReview = await VendorReview.findById(review._id)
            .populate('reviewerId', 'name profilePictureUrl businessInfo influencerInfo')
            .lean();

        return successResponse(res, 'Reply deleted successfully', populatedReview);
    } catch (error: unknown) {
        console.error('Error deleting reply:', error);
        return errorResponse(res, 'Failed to delete reply', 500);
    }
};

/**
 * Helper function to update vendor's overall rating
 */
async function updateVendorRating(vendorId: string) {
    try {
        const stats = await getVendorReviewStats(vendorId);

        await User.findByIdAndUpdate(vendorId, {
            'vendorInfo.rating': stats.averageRating,
            'vendorInfo.totalReviews': stats.totalReviews,
        });
    } catch (error) {
        console.error('Error updating vendor rating:', error);
    }
}

/**
 * Helper function to get vendor review statistics
 * OPTIMIZED: Uses MongoDB aggregation for better performance (calculates in database)
 */
async function getVendorReviewStats(vendorId: string) {
    // Use MongoDB aggregation to calculate everything in database (much faster)
    const stats = await VendorReview.aggregate([
        { $match: { vendorId, isActive: true } },
        {
            $group: {
                _id: null,
                totalReviews: { $sum: 1 },
                totalRating: { $sum: '$rating' },
                rating5: { $sum: { $cond: [{ $eq: ['$rating', 5] }, 1, 0] } },
                rating4: { $sum: { $cond: [{ $eq: ['$rating', 4] }, 1, 0] } },
                rating3: { $sum: { $cond: [{ $eq: ['$rating', 3] }, 1, 0] } },
                rating2: { $sum: { $cond: [{ $eq: ['$rating', 2] }, 1, 0] } },
                rating1: { $sum: { $cond: [{ $eq: ['$rating', 1] }, 1, 0] } },
            }
        }
    ]);

    if (!stats || stats.length === 0) {
        return {
            averageRating: 0,
            totalReviews: 0,
            ratingDistribution: { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 },
        };
    }

    const result = stats[0];
    const totalReviews = result.totalReviews;
    const averageRating = totalReviews > 0 ? parseFloat((result.totalRating / totalReviews).toFixed(1)) : 0;

    return {
        averageRating,
        totalReviews,
        ratingDistribution: {
            5: result.rating5 || 0,
            4: result.rating4 || 0,
            3: result.rating3 || 0,
            2: result.rating2 || 0,
            1: result.rating1 || 0,
        },
    };
}

