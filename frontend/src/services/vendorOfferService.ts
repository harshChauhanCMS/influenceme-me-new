import { createApiClient } from '@/config/api';
import { API_ENDPOINTS, ApiResponse } from '@/utils/network_utils';
import { IVendorOffer, IVendorOfferTerms } from '../../../shared/types/vendorOffer';

const vendorOfferService = {
    /**
     * Create a new vendor offer
     */
    async createOffer(data: {
        requirementId: string;
        message: string;
        proposedTerms: IVendorOfferTerms;
        attachments?: string[];
    }): Promise<IVendorOffer> {
        const apiClient = createApiClient();
        const response = await apiClient.post<ApiResponse<IVendorOffer>>(
            API_ENDPOINTS.CREATE_VENDOR_OFFER,
            data
        );
        return response.data.data!;
    },

    /**
     * Get offers for a specific requirement
     */
    async getOffersByRequirement(requirementId: string): Promise<IVendorOffer[]> {
        const apiClient = createApiClient();
        const response = await apiClient.get<ApiResponse<IVendorOffer[]>>(
            `${API_ENDPOINTS.GET_OFFERS_BY_REQUIREMENT}/${requirementId}`
        );
        return response.data.data || [];
    },

    /**
     * Get vendor's sent offers
     */
    async getVendorSentOffers(params?: {
        page?: number;
        limit?: number;
        status?: string;
    }): Promise<{ offers: IVendorOffer[]; pagination: any }> {
        const apiClient = createApiClient();
        const response = await apiClient.get<ApiResponse<IVendorOffer[]>>(
            API_ENDPOINTS.GET_VENDOR_SENT_OFFERS,
            { params }
        );
        return {
            offers: response.data.data || [],
            pagination: response.data.pagination || {},
        };
    },

    /**
     * Get user's received offers (for brands/influencers - offers they sent to vendors)
     */
    async getUserReceivedOffers(params?: {
        page?: number;
        limit?: number;
        status?: string;
        requirementId?: string;
    }): Promise<{ offers: IVendorOffer[]; pagination: any }> {
        const apiClient = createApiClient();
        const response = await apiClient.get<ApiResponse<IVendorOffer[]>>(
            API_ENDPOINTS.GET_USER_RECEIVED_OFFERS,
            { params }
        );
        return {
            offers: response.data.data || [],
            pagination: response.data.pagination || {},
        };
    },

    /**
     * Accept an offer
     */
    async acceptOffer(offerId: string, message?: string): Promise<IVendorOffer> {
        const apiClient = createApiClient();
        const response = await apiClient.post<ApiResponse<IVendorOffer>>(
            `${API_ENDPOINTS.ACCEPT_VENDOR_OFFER}/${offerId}`,
            { message }
        );
        return response.data.data!;
    },

    /**
     * Decline an offer
     */
    async declineOffer(offerId: string, message?: string): Promise<IVendorOffer> {
        const apiClient = createApiClient();
        const response = await apiClient.post<ApiResponse<IVendorOffer>>(
            `${API_ENDPOINTS.DECLINE_VENDOR_OFFER}/${offerId}`,
            { message }
        );
        return response.data.data!;
    },

    /**
     * Negotiate / Counter-offer
     */
    async negotiateOffer(
        offerId: string,
        data: {
            message: string;
            proposedTerms: IVendorOfferTerms;
        }
    ): Promise<IVendorOffer> {
        const apiClient = createApiClient();
        const response = await apiClient.post<ApiResponse<IVendorOffer>>(
            `${API_ENDPOINTS.NEGOTIATE_VENDOR_OFFER}/${offerId}`,
            data
        );
        return response.data.data!;
    },

    /**
     * Withdraw an offer (vendor only)
     */
    async withdrawOffer(offerId: string): Promise<IVendorOffer> {
        const apiClient = createApiClient();
        const response = await apiClient.post<ApiResponse<IVendorOffer>>(
            `${API_ENDPOINTS.WITHDRAW_VENDOR_OFFER}/${offerId}`
        );
        return response.data.data!;
    },

    /**
     * Shortlist/unshortlist an offer
     */
    async shortlistOffer(offerId: string): Promise<IVendorOffer> {
        const apiClient = createApiClient();
        const response = await apiClient.post<ApiResponse<IVendorOffer>>(
            `${API_ENDPOINTS.SHORTLIST_VENDOR_OFFER}/${offerId}`
        );
        return response.data.data!;
    },
};

export default vendorOfferService;

