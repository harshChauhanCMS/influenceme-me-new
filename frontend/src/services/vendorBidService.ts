import { createApiClient } from '@/config/api';
import { API_ENDPOINTS, ApiResponse } from '@/utils/network_utils';
import { IVendorBid } from '../../../shared/types/vendorBid';

const vendorBidService = {
    /**
     * Submit a bid for a requirement (vendor only)
     */
    async submitBid(data: {
        requirementId: string;
        bidAmount: number;
        deliveryTime?: string;
        message?: string;
    }): Promise<IVendorBid> {
        const apiClient = createApiClient();
        const response = await apiClient.post<ApiResponse<IVendorBid>>(
            '/api/vendor-bid/submit',
            data
        );
        return response.data.data!;
    },

    /**
     * Get bids for a requirement (for brand/influencer to see all bids)
     */
    async getBidsByRequirement(requirementId: string): Promise<IVendorBid[]> {
        const apiClient = createApiClient();
        const response = await apiClient.get<ApiResponse<IVendorBid[]>>(
            `/api/vendor-bid/requirement/${requirementId}`
        );
        return response.data.data || [];
    },

    /**
     * Get vendor's bids (bids sent by vendor)
     */
    async getVendorBids(params?: {
        page?: number;
        limit?: number;
        status?: string;
    }): Promise<{ bids: IVendorBid[]; pagination: any }> {
        const apiClient = createApiClient();
        const response = await apiClient.get<ApiResponse<IVendorBid[]>>(
            '/api/vendor-bid/vendor/bids',
            { params }
        );
        return {
            bids: response.data.data || [],
            pagination: response.data.pagination || {},
        };
    },

    /**
     * Get vendor's bid for a specific requirement
     */
    async getVendorBidForRequirement(requirementId: string): Promise<IVendorBid | null> {
        const apiClient = createApiClient();
        const response = await apiClient.get<ApiResponse<IVendorBid | null>>(
            `/api/vendor-bid/vendor/requirement/${requirementId}`
        );
        return response.data.data || null;
    },

    /**
     * Get bid details by ID
     */
    async getBidDetails(bidId: string): Promise<IVendorBid> {
        const apiClient = createApiClient();
        const response = await apiClient.get<ApiResponse<IVendorBid>>(
            `/api/vendor-bid/${bidId}`
        );
        return response.data.data!;
    },

    /**
     * Accept a bid (brand/influencer accepts vendor bid)
     */
    async acceptBid(bidId: string, message?: string): Promise<IVendorBid> {
        const apiClient = createApiClient();
        const response = await apiClient.post<ApiResponse<IVendorBid>>(
            `/api/vendor-bid/accept/${bidId}`,
            { message }
        );
        return response.data.data!;
    },

    /**
     * Decline a bid (brand/influencer declines vendor bid)
     */
    async declineBid(bidId: string, message?: string): Promise<IVendorBid> {
        const apiClient = createApiClient();
        const response = await apiClient.post<ApiResponse<IVendorBid>>(
            `/api/vendor-bid/decline/${bidId}`,
            { message }
        );
        return response.data.data!;
    },
};

export default vendorBidService;

