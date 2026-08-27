import { createApiClient } from '@/config/api';
import { API_ENDPOINTS, ApiResponse } from '@/utils/network_utils';
import { IVendorBrandDeal } from '../../../shared/types/vendorBrandDeal';

const vendorDealService = {
    /**
     * Get user's vendor-brand deals (for brands/influencers or vendors)
     */
    async getUserDeals(params?: {
        page?: number;
        limit?: number;
        status?: 'running' | 'completed' | 'cancelled';
        requirementId?: string;
    }): Promise<{ deals: IVendorBrandDeal[]; pagination: any }> {
        const apiClient = createApiClient();
        const response = await apiClient.get<ApiResponse<IVendorBrandDeal[]>>(
            API_ENDPOINTS.GET_VENDOR_BRAND_DEALS,
            { params }
        );
        return {
            deals: response.data.data || [],
            pagination: response.data.pagination || {},
        };
    },

    /**
     * Get deal details by ID
     */
    async getDealDetails(dealId: string): Promise<IVendorBrandDeal> {
        const apiClient = createApiClient();
        const response = await apiClient.get<ApiResponse<IVendorBrandDeal>>(
            `${API_ENDPOINTS.GET_VENDOR_BRAND_DEAL_DETAILS}/${dealId}`
        );
        return response.data.data!;
    },

    /**
     * Verify service completion (client only - brand/influencer)
     * This approves the vendor's completion request
     */
    async verifyServiceCompletion(dealId: string): Promise<IVendorBrandDeal> {
        const apiClient = createApiClient();
        const response = await apiClient.patch<ApiResponse<IVendorBrandDeal>>(
            `${API_ENDPOINTS.VERIFY_SERVICE_COMPLETION}/${dealId}/verify-completion`
        );
        return response.data.data!;
    },
};

export default vendorDealService;

