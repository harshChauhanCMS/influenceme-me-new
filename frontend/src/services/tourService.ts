// services/tourService.ts
import { GetServerSidePropsContext } from 'next';
import { createApiClient } from '@/config/api';
import { ApiResponse } from '@/utils/network_utils';
import { ITour } from '../../../../shared/types/tour';

interface ToursResponse {
    tours: ITour[];
    pagination: {
        page: number;
        limit: number;
        total: number;
        totalPages: number;
    };
}

const tourService = {
    /**
     * Get all tours (for brands)
     */
    getAllTours: async (
        params?: {
            page?: number;
            limit?: number;
            location?: string;
            city?: string;
            country?: string;
            startDate?: string;
            endDate?: string;
            influencerId?: string;
        },
        context?: GetServerSidePropsContext
    ): Promise<ToursResponse> => {
        try {
            const apiClient = createApiClient(context);
            const response = await apiClient.get<ApiResponse<ITour[]>>('/api/tour', {
                params,
            });
            // Backend returns tours array directly in data, with pagination in response.pagination
            const tours = Array.isArray(response.data.data) ? response.data.data : [];
            const pagination = response.data.pagination || { page: 1, limit: 50, total: 0, totalPages: 0 };
            return { tours, pagination };
        } catch (error) {
            console.error('Failed to fetch tours:', error);
            return { tours: [], pagination: { page: 1, limit: 50, total: 0, totalPages: 0 } };
        }
    },

    /**
     * Get tours for a specific influencer
     */
    getInfluencerTours: async (
        influencerId: string,
        params?: {
            page?: number;
            limit?: number;
        },
        context?: GetServerSidePropsContext
    ): Promise<ToursResponse> => {
        try {
            const apiClient = createApiClient(context);
            const response = await apiClient.get<ApiResponse<ITour[]>>(
                `/api/tour/influencer/${influencerId}`,
                { params }
            );
            const tours = Array.isArray(response.data.data) ? response.data.data : [];
            const pagination = response.data.pagination || { page: 1, limit: 50, total: 0, totalPages: 0 };
            return { tours, pagination };
        } catch (error) {
            console.error('Failed to fetch influencer tours:', error);
            return { tours: [], pagination: { page: 1, limit: 50, total: 0, totalPages: 0 } };
        }
    },

    /**
     * Get current user's tours (for influencers)
     */
    getMyTours: async (
        params?: {
            page?: number;
            limit?: number;
        },
        context?: GetServerSidePropsContext
    ): Promise<ToursResponse> => {
        try {
            const apiClient = createApiClient(context);
            const response = await apiClient.get<ApiResponse<ITour[]>>('/api/tour/my-tours', {
                params,
            });
            const tours = Array.isArray(response.data.data) ? response.data.data : [];
            const pagination = response.data.pagination || { page: 1, limit: 50, total: 0, totalPages: 0 };
            return { tours, pagination };
        } catch (error) {
            console.error('Failed to fetch my tours:', error);
            return { tours: [], pagination: { page: 1, limit: 50, total: 0, totalPages: 0 } };
        }
    },

    /**
     * Get tour by ID
     */
    getTourById: async (id: string, context?: GetServerSidePropsContext): Promise<ITour | null> => {
        try {
            const apiClient = createApiClient(context);
            const response = await apiClient.get<ApiResponse<ITour>>(`/api/tour/${id}`);
            return response.data.data || null;
        } catch (error) {
            console.error('Failed to fetch tour:', error);
            return null;
        }
    },

    /**
     * Create a new tour
     */
    createTour: async (
        tourData: {
            title: string;
            description?: string;
            location: {
                address: string;
                city?: string;
                state?: string;
                country?: string;
                latitude?: number;
                longitude?: number;
            };
            startDate: Date | string;
            endDate: Date | string;
            isActive?: boolean;
        },
        context?: GetServerSidePropsContext
    ): Promise<ITour | null> => {
        try {
            const apiClient = createApiClient(context);
            const response = await apiClient.post<ApiResponse<ITour>>('/api/tour', tourData);
            return response.data.data || null;
        } catch (error) {
            console.error('Failed to create tour:', error);
            return null;
        }
    },

    /**
     * Update tour
     */
    updateTour: async (
        id: string,
        tourData: Partial<{
            title: string;
            description: string;
            location: {
                address: string;
                city?: string;
                state?: string;
                country?: string;
                latitude?: number;
                longitude?: number;
            };
            startDate: Date | string;
            endDate: Date | string;
            isActive: boolean;
        }>,
        context?: GetServerSidePropsContext
    ): Promise<ITour | null> => {
        try {
            const apiClient = createApiClient(context);
            const response = await apiClient.put<ApiResponse<ITour>>(`/api/tour/${id}`, tourData);
            return response.data.data || null;
        } catch (error) {
            console.error('Failed to update tour:', error);
            return null;
        }
    },

    /**
     * Delete tour
     */
    deleteTour: async (id: string, context?: GetServerSidePropsContext): Promise<boolean> => {
        try {
            const apiClient = createApiClient(context);
            await apiClient.delete(`/api/tour/${id}`);
            return true;
        } catch (error) {
            console.error('Failed to delete tour:', error);
            return false;
        }
    },
};

export default tourService;

