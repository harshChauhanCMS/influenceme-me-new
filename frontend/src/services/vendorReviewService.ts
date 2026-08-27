import { GetServerSidePropsContext } from 'next';
import { createApiClient } from '@/config/api';
import { API_ENDPOINTS, ApiResponse } from '@/utils/network_utils';
import { IVendorReview, IVendorReviewStats } from '../../../shared/types/vendorReview';

interface PaginationResponse {
    currentPage?: number;
    page?: number;
    totalPages?: number;
    total?: number;
    totalCount?: number;
}

interface ReviewsResponse {
    reviews: IVendorReview[];
    stats: IVendorReviewStats;
    pagination: PaginationResponse;
}

const vendorReviewService = {
    /**
     * Create a review for a vendor
     */
    createReview: async (
        data: {
            vendorId: string;
            rating: number;
            reviewText: string;
            projectType?: string;
            projectDate?: string;
        },
        context?: GetServerSidePropsContext
    ): Promise<IVendorReview | null> => {
        try {
            const apiClient = createApiClient(context);
            const response = await apiClient.post<ApiResponse<IVendorReview>>(
                API_ENDPOINTS.CREATE_VENDOR_REVIEW,
                data
            );
            return response.data.data || null;
        } catch (error) {
            console.error('Failed to create review:', error);
            throw error;
        }
    },

    /**
     * Get all reviews for a vendor
     */
    getVendorReviews: async (
        vendorId: string,
        params?: { page?: number; limit?: number; rating?: number },
        context?: GetServerSidePropsContext
    ): Promise<ReviewsResponse> => {
        try {
            const apiClient = createApiClient(context);
            const response = await apiClient.get<
                ApiResponse<{ reviews: IVendorReview[]; stats: IVendorReviewStats }>
            >(`${API_ENDPOINTS.GET_VENDOR_REVIEWS}/${vendorId}`, { params });

            const responseData = response.data.data;
            const paginationData = response.data.pagination as PaginationResponse | undefined;

            return {
                reviews: responseData?.reviews || [],
                stats: responseData?.stats || {
                    averageRating: 0,
                    totalReviews: 0,
                    ratingDistribution: { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 },
                },
                pagination: paginationData || {
                    page: 1,
                    total: 0,
                    totalPages: 1,
                },
            };
        } catch (error) {
            console.error('Failed to fetch reviews:', error);
            return {
                reviews: [],
                stats: {
                    averageRating: 0,
                    totalReviews: 0,
                    ratingDistribution: { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 },
                },
                pagination: { page: 1, total: 0, totalPages: 1 },
            };
        }
    },

    /**
     * Get review statistics for a vendor
     */
    getReviewStats: async (
        vendorId: string,
        context?: GetServerSidePropsContext
    ): Promise<IVendorReviewStats> => {
        try {
            const apiClient = createApiClient(context);
            const response = await apiClient.get<ApiResponse<IVendorReviewStats>>(
                `${API_ENDPOINTS.GET_VENDOR_REVIEW_STATS}/${vendorId}/stats`
            );
            return (
                response.data.data || {
                    averageRating: 0,
                    totalReviews: 0,
                    ratingDistribution: { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 },
                }
            );
        } catch (error) {
            console.error('Failed to fetch review stats:', error);
            return {
                averageRating: 0,
                totalReviews: 0,
                ratingDistribution: { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 },
            };
        }
    },

    /**
     * Update a review
     */
    updateReview: async (
        reviewId: string,
        data: {
            rating?: number;
            reviewText?: string;
            projectType?: string;
            projectDate?: string;
        },
        context?: GetServerSidePropsContext
    ): Promise<IVendorReview | null> => {
        try {
            const apiClient = createApiClient(context);
            const response = await apiClient.put<ApiResponse<IVendorReview>>(
                `${API_ENDPOINTS.UPDATE_VENDOR_REVIEW}/${reviewId}`,
                data
            );
            return response.data.data || null;
        } catch (error) {
            console.error('Failed to update review:', error);
            throw error;
        }
    },

    /**
     * Delete a review
     */
    deleteReview: async (
        reviewId: string,
        context?: GetServerSidePropsContext
    ): Promise<boolean> => {
        try {
            const apiClient = createApiClient(context);
            await apiClient.delete(`${API_ENDPOINTS.DELETE_VENDOR_REVIEW}/${reviewId}`);
            return true;
        } catch (error) {
            console.error('Failed to delete review:', error);
            throw error;
        }
    },

    /**
     * Mark a review as helpful
     */
    markHelpful: async (
        reviewId: string,
        context?: GetServerSidePropsContext
    ): Promise<{ helpful: number } | null> => {
        try {
            const apiClient = createApiClient(context);
            const response = await apiClient.post<ApiResponse<{ helpful: number }>>(
                `${API_ENDPOINTS.MARK_REVIEW_HELPFUL}/${reviewId}/helpful`
            );
            return response.data.data || null;
        } catch (error) {
            console.error('Failed to mark review as helpful:', error);
            throw error;
        }
    },
};

export default vendorReviewService;

