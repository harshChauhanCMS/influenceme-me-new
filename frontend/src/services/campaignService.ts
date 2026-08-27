// services/campaignService.ts
import { GetServerSidePropsContext } from 'next';
import { createApiClient } from '@/config/api';
import { API_ENDPOINTS, ApiResponse } from '@/utils/network_utils';
import { ICampaign } from '../../../shared/types/campaign';

interface CampaignsResponse {
    campaigns: ICampaign[];
    pagination: {
        page?: number;
        total?: number;
        limit?: number;
    };
}

const campaignService = {
    /**
     * Get all campaigns for the authenticated user
     */
    getUserCampaigns: async (context?: GetServerSidePropsContext): Promise<ICampaign[]> => {
        try {
            const apiClient = createApiClient(context);
            console.log('📡 Fetching campaigns from:', API_ENDPOINTS.GET_USER_CAMPAIGNS);
            const response = await apiClient.get<ApiResponse<ICampaign[]>>(API_ENDPOINTS.GET_USER_CAMPAIGNS);
            console.log('📡 Campaign API Response:', {
                status: response.data.status,
                code: response.data.code,
                message: response.data.message,
                dataLength: response.data.data?.length || 0,
                data: response.data.data
            });
            
            if (response.data.status && response.data.data) {
                return response.data.data;
            } else {
                console.warn('⚠️ API returned unsuccessful response:', response.data);
                return [];
            }
        } catch (error: any) {
            console.error('❌ Failed to fetch user campaigns:', error);
            console.error('Error details:', {
                message: error.message,
                response: error.response?.data,
                status: error.response?.status,
            });
            throw error; // Re-throw to let the component handle it
        }
    },

    /**
     * Get all active campaigns (for influencers)
     */
    getAllCampaigns: async (params?: {
        page?: number;
        limit?: number;
        type?: string;
        location?: string;
        minBudget?: number;
        maxBudget?: number;
    }, context?: GetServerSidePropsContext): Promise<CampaignsResponse> => {
        try {
            const apiClient = createApiClient(context);
            const response = await apiClient.get<ApiResponse<ICampaign[]>>(API_ENDPOINTS.GET_ALL_CAMPAIGNS, {
                params,
            });
            return {
                campaigns: response.data.data || [],
                pagination: response.data.pagination || { page: 1, total: 0, limit: 10 },
            };
        } catch (error) {
            console.error('Failed to fetch all campaigns:', error);
            return { campaigns: [], pagination: { page: 1, total: 0, limit: 10 } };
        }
    },

    /**
     * Get campaign details by ID
     */
    getCampaignById: async (id: string, userId?: string, context?: GetServerSidePropsContext): Promise<ICampaign | null> => {
        try {
            const apiClient = createApiClient(context);
            const response = await apiClient.post<ApiResponse<ICampaign>>(API_ENDPOINTS.GET_CAMPAIGN_DETAILS, {
                id,
                userId,
            });
            return response.data.data || null;
        } catch (error) {
            console.error('Failed to fetch campaign details:', error);
            return null;
        }
    },

    /**
     * Create a new campaign
     */
    createCampaign: async (campaignData: Partial<ICampaign>, imageFile?: File, context?: GetServerSidePropsContext): Promise<ICampaign | null> => {
        try {
            const apiClient = createApiClient(context);
            const formData = new FormData();

            // Append all campaign fields
            Object.keys(campaignData).forEach((key) => {
                const value = campaignData[key as keyof ICampaign];

                if (key === 'deliverables' || key === 'locations') {
                    formData.append(key, JSON.stringify(value));
                } else if (value !== undefined && value !== null) {
                    if (value instanceof Date) {
                        formData.append(key, value.toISOString());
                    } else {
                        formData.append(key, String(value));
                    }
                }
            });

            // Append image if provided
            if (imageFile) {
                formData.append('image', imageFile);
            }

            const response = await apiClient.post<ApiResponse<ICampaign>>(API_ENDPOINTS.CREATE_CAMPAIGN, formData, {
                headers: {
                    'Content-Type': 'multipart/form-data',
                },
            });

            return response.data.data || null;
        } catch (error) {
            console.error('Failed to create campaign:', error);
            return null;
        }
    },

    /**
     * Update an existing campaign
     */
    updateCampaign: async (
        id: string,
        campaignData: Partial<ICampaign>,
        imageFile?: File,
        context?: GetServerSidePropsContext
    ): Promise<ICampaign | null> => {
        try {
            const apiClient = createApiClient(context);
            const formData = new FormData();

            // Append all campaign fields
            Object.keys(campaignData).forEach((key) => {
                const value = campaignData[key as keyof ICampaign];

                if (key === 'deliverables' || key === 'locations') {
                    formData.append(key, JSON.stringify(value));
                } else if (value !== undefined && value !== null) {
                    if (value instanceof Date) {
                        formData.append(key, value.toISOString());
                    } else {
                        formData.append(key, String(value));
                    }
                }
            });

            // Append image if provided
            if (imageFile) {
                formData.append('image', imageFile);
            }

            const response = await apiClient.put<ApiResponse<ICampaign>>(`${API_ENDPOINTS.UPDATE_CAMPAIGN}/${id}`, formData, {
                headers: {
                    'Content-Type': 'multipart/form-data',
                },
            });

            return response.data.data || null;
        } catch (error) {
            console.error('Failed to update campaign:', error);
            return null;
        }
    },

    /**
     * Delete a campaign
     */
    deleteCampaign: async (id: string, context?: GetServerSidePropsContext): Promise<boolean> => {
        try {
            const apiClient = createApiClient(context);
            await apiClient.delete(`${API_ENDPOINTS.DELETE_CAMPAIGN}/${id}`);
            return true;
        } catch (error) {
            console.error('Failed to delete campaign:', error);
            return false;
        }
    },
};

export default campaignService;