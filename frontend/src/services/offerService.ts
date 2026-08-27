// services/offerService.ts
import { GetServerSidePropsContext } from 'next';
import { createApiClient } from '@/config/api';
import { API_ENDPOINTS, ApiResponse } from '@/utils/network_utils';
import { IInfluencerOffer } from '../../../shared/types/influencerOffer';
import { IInfluencerBrandDeal } from '../../../shared/types/influencerBrandDeal';
import { ICampaign } from '../../../shared/types/campaign';

// Extended types with populated fields from backend
export interface InfluencerOfferExtended extends IInfluencerOffer {
    influencerName?: string;
    influencerEmail?: string;
    brandName?: string;
    brandEmail?: string;
    offerValue?: number;
    campaign?: ICampaign;
    sentDate?: string;
    responseMessage?: string;
}

export interface InfluencerBrandDealExtended extends IInfluencerBrandDeal {
    campaignName?: string;
    brandName?: string;
    influencerName?: string;
    influencerProfilePictureUrl?: string;
    agreedAmount?: number;
    campaign?: ICampaign;
}

interface PaginationResponse {
    currentPage: number;
    totalPages: number;
    totalCount: number;
    hasNextPage: boolean;
    hasPrevPage: boolean;
}

interface OffersResponse {
    offers: InfluencerOfferExtended[];
    pagination: PaginationResponse;
}

interface DealsResponse {
    deals: InfluencerBrandDealExtended[];
    pagination: PaginationResponse;
}

const offerService = {
    /**
     * Create a new offer to an influencer
     */
    createOffer: async (
        data: {
            brandId: string;
            influencerId: string;
            campaignId: string;
        },
        context?: GetServerSidePropsContext
    ): Promise<InfluencerOfferExtended | null> => {
        try {
            const apiClient = createApiClient(context);
            const response = await apiClient.post<ApiResponse<InfluencerOfferExtended>>(
                API_ENDPOINTS.CREATE_OFFER,
                data
            );
            return response.data.data || null;
        } catch (error) {
            console.error('Failed to create offer:', error);
            throw error;
        }
    },

    /**
     * Get all offers for the authenticated user
     */
    getUserOffers: async (
        params?: {
            page?: number;
            limit?: number;
            campaignId?: string;
            status?: string;
        },
        context?: GetServerSidePropsContext
    ): Promise<OffersResponse> => {
        try {
            const apiClient = createApiClient(context);
            const response = await apiClient.get<ApiResponse<InfluencerOfferExtended[]>>(
                API_ENDPOINTS.GET_USER_OFFERS,
                { params }
            );
            
            const paginationData = response.data.pagination as PaginationResponse | undefined;
            
            return {
                offers: response.data.data || [],
                pagination: paginationData || {
                    currentPage: 1,
                    totalPages: 1,
                    totalCount: 0,
                    hasNextPage: false,
                    hasPrevPage: false,
                },
            };
        } catch (error) {
            console.error('Failed to fetch offers:', error);
            return {
                offers: [],
                pagination: {
                    currentPage: 1,
                    totalPages: 1,
                    totalCount: 0,
                    hasNextPage: false,
                    hasPrevPage: false,
                },
            };
        }
    },

    /**
     * Get offer details by ID
     */
    getOfferDetails: async (
        id: string,
        context?: GetServerSidePropsContext
    ): Promise<InfluencerOfferExtended | null> => {
        try {
            const apiClient = createApiClient(context);
            const response = await apiClient.get<ApiResponse<InfluencerOfferExtended>>(
                `${API_ENDPOINTS.GET_OFFER_DETAILS}/${id}`
            );
            return response.data.data || null;
        } catch (error) {
            console.error('Failed to fetch offer details:', error);
            return null;
        }
    },

    /**
     * Delete an offer
     */
    deleteOffer: async (
        id: string,
        context?: GetServerSidePropsContext
    ): Promise<boolean> => {
        try {
            const apiClient = createApiClient(context);
            await apiClient.delete(`${API_ENDPOINTS.DELETE_OFFER}/${id}`);
            return true;
        } catch (error) {
            console.error('Failed to delete offer:', error);
            return false;
        }
    },

    /**
     * Get all deals for the authenticated user
     */
    getUserDeals: async (
        params?: {
            page?: number;
            limit?: number;
            campaignId?: string;
            status?: 'running' | 'completion_requested' | 'completed' | 'cancelled';
        },
        context?: GetServerSidePropsContext
    ): Promise<DealsResponse> => {
        try {
            const apiClient = createApiClient(context);
            const response = await apiClient.get<ApiResponse<InfluencerBrandDealExtended[]>>(
                API_ENDPOINTS.GET_USER_DEALS,
                { params }
            );
            
            const paginationData = response.data.pagination as PaginationResponse | undefined;
            
            return {
                deals: response.data.data || [],
                pagination: paginationData || {
                    currentPage: 1,
                    totalPages: 1,
                    totalCount: 0,
                    hasNextPage: false,
                    hasPrevPage: false,
                },
            };
        } catch (error) {
            console.error('Failed to fetch deals:', error);
            return {
                deals: [],
                pagination: {
                    currentPage: 1,
                    totalPages: 1,
                    totalCount: 0,
                    hasNextPage: false,
                    hasPrevPage: false,
                },
            };
        }
    },

    /**
     * Get deal details by ID
     */
    getDealDetails: async (
        id: string,
        context?: GetServerSidePropsContext
    ): Promise<InfluencerBrandDealExtended | null> => {
        try {
            const apiClient = createApiClient(context);
            const response = await apiClient.get<ApiResponse<InfluencerBrandDealExtended>>(
                `${API_ENDPOINTS.GET_DEAL_DETAILS}/${id}`
            );
            return response.data.data || null;
        } catch (error) {
            console.error('Failed to fetch deal details:', error);
            return null;
        }
    },

    /**
     * Update a deal
     */
    updateDeal: async (
        id: string,
        data: Partial<IInfluencerBrandDeal>,
        agreementFile?: File,
        context?: GetServerSidePropsContext
    ): Promise<InfluencerBrandDealExtended | null> => {
        try {
            const apiClient = createApiClient(context);
            const formData = new FormData();

            // Append fields
            Object.keys(data).forEach((key) => {
                const value = data[key as keyof IInfluencerBrandDeal];
                if (key === 'finalTerms' && value) {
                    formData.append(key, JSON.stringify(value));
                } else if (value !== undefined && value !== null) {
                    if (value instanceof Date) {
                        formData.append(key, value.toISOString());
                    } else {
                        formData.append(key, String(value));
                    }
                }
            });

            if (agreementFile) {
                formData.append('agreementFile', agreementFile);
            }

            const response = await apiClient.put<ApiResponse<InfluencerBrandDealExtended>>(
                `${API_ENDPOINTS.UPDATE_DEAL}/${id}`,
                formData,
                {
                    headers: {
                        'Content-Type': 'multipart/form-data',
                    },
                }
            );
            return response.data.data || null;
        } catch (error) {
            console.error('Failed to update deal:', error);
            throw error;
        }
    },

    /**
     * Approve deal completion (Brand side)
     */
    approveDealCompletion: async (
        id: string,
        context?: GetServerSidePropsContext
    ): Promise<InfluencerBrandDealExtended | null> => {
        try {
            const apiClient = createApiClient(context);
            const response = await apiClient.post<ApiResponse<InfluencerBrandDealExtended>>(
                `${API_ENDPOINTS.GET_DEAL_DETAILS}/${id}/approve-completion`
            );
            return response.data.data || null;
        } catch (error) {
            console.error('Failed to approve deal completion:', error);
            throw error;
        }
    },

    /**
     * Mark deal as completed (Legacy - kept for backward compatibility)
     */
    completeDeal: async (
        id: string,
        context?: GetServerSidePropsContext
    ): Promise<InfluencerBrandDealExtended | null> => {
        try {
            const apiClient = createApiClient(context);
            const response = await apiClient.post<ApiResponse<InfluencerBrandDealExtended>>(
                `${API_ENDPOINTS.GET_DEAL_DETAILS}/${id}/complete`
            );
            return response.data.data || null;
        } catch (error) {
            console.error('Failed to complete deal:', error);
            throw error;
        }
    },

    /**
     * Cancel a deal
     */
    cancelDeal: async (
        id: string,
        context?: GetServerSidePropsContext
    ): Promise<InfluencerBrandDealExtended | null> => {
        try {
            const apiClient = createApiClient(context);
            const response = await apiClient.put<ApiResponse<InfluencerBrandDealExtended>>(
                `${API_ENDPOINTS.CANCEL_DEAL}/${id}/cancel`
            );
            return response.data.data || null;
        } catch (error) {
            console.error('Failed to cancel deal:', error);
            throw error;
        }
    },
};

export default offerService;

