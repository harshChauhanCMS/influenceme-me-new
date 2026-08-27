// services/influencerBidService.ts
import { GetServerSidePropsContext } from 'next';
import { createApiClient } from '@/config/api';
import { ApiResponse } from '@/utils/network_utils';
import { IInfluencerBid } from '../../../shared/types/influencerBid';
import { ICampaign } from '../../../shared/types/campaign';

export interface InfluencerBidExtended extends IInfluencerBid {
    influencer?: {
        _id: string;
        name: string;
        email?: string;
        profilePictureUrl?: string;
    };
    campaign?: ICampaign;
}

interface BidsResponse {
    bids: InfluencerBidExtended[];
    pagination: {
        currentPage: number;
        totalPages: number;
        total: number;
    };
}

const influencerBidService = {
    /**
     * Get all bids for a campaign (for brand)
     */
    getCampaignBids: async (
        campaignId: string,
        params?: {
            page?: number;
            limit?: number;
            status?: string;
        },
        context?: GetServerSidePropsContext
    ): Promise<BidsResponse> => {
        try {
            const apiClient = createApiClient(context);
            const response = await apiClient.get<ApiResponse<InfluencerBidExtended[]>>(
                `/api/influencer-bid/campaign/${campaignId}/bids`,
                { params }
            );
            
            const paginationData = response.data.pagination as {
                currentPage?: number;
                totalPages?: number;
                total?: number;
            } | undefined;
            
            return {
                bids: response.data.data || [],
                pagination: paginationData || {
                    currentPage: 1,
                    totalPages: 1,
                    total: 0,
                },
            };
        } catch (error) {
            console.error('Failed to fetch campaign bids:', error);
            return {
                bids: [],
                pagination: {
                    currentPage: 1,
                    totalPages: 1,
                    total: 0,
                },
            };
        }
    },

    /**
     * Get bid details by ID
     */
    getBidDetails: async (
        bidId: string,
        context?: GetServerSidePropsContext
    ): Promise<InfluencerBidExtended | null> => {
        try {
            const apiClient = createApiClient(context);
            const response = await apiClient.get<ApiResponse<InfluencerBidExtended>>(
                `/api/influencer-bid/details/${bidId}`
            );
            return response.data.data || null;
        } catch (error) {
            console.error('Failed to fetch bid details:', error);
            return null;
        }
    },

    /**
     * Submit a bid/application for a campaign (for influencer)
     */
    submitBid: async (
        data: {
            campaignId: string;
            bidAmount?: number;
            message?: string;
            proposedValue?: string;
        },
        context?: GetServerSidePropsContext
    ): Promise<{ bidId: string; status: string; createdAt: Date }> => {
        try {
            const apiClient = createApiClient(context);
            const response = await apiClient.post<ApiResponse<{ bidId: string; status: string; createdAt: Date }>>(
                `/api/influencer-bid/submit`,
                data
            );
            return response.data.data || { bidId: '', status: 'pending', createdAt: new Date() };
        } catch (error) {
            console.error('Failed to submit bid:', error);
            throw error;
        }
    },

    /**
     * Check if user has bid for a campaign
     */
    checkUserBid: async (
        campaignId: string,
        context?: GetServerSidePropsContext
    ): Promise<{ hasBid: boolean; bid: InfluencerBidExtended | null }> => {
        try {
            const apiClient = createApiClient(context);
            const response = await apiClient.get<ApiResponse<{ hasBid: boolean; bid: InfluencerBidExtended | null }>>(
                `/api/influencer-bid/check/${campaignId}`
            );
            return response.data.data || { hasBid: false, bid: null };
        } catch (error) {
            console.error('Failed to check user bid:', error);
            return { hasBid: false, bid: null };
        }
    },

    /**
     * Respond to a bid (accept/reject/shortlist)
     */
    respondToBid: async (
        bidId: string,
        data: {
            responseType: 'accepted' | 'rejected' | 'shortlisted';
            message?: string;
        },
        context?: GetServerSidePropsContext
    ): Promise<InfluencerBidExtended | null> => {
        try {
            const apiClient = createApiClient(context);
            const response = await apiClient.post<ApiResponse<InfluencerBidExtended>>(
                `/api/influencer-bid/respond/${bidId}`,
                data
            );
            return response.data.data || null;
        } catch (error) {
            console.error('Failed to respond to bid:', error);
            throw error;
        }
    },

    /**
     * Create a deal from an accepted bid (brand only).
     * Returns the created deal; the bid will have dealId set after this.
     */
    createDealFromBid: async (
        bidId: string,
        context?: GetServerSidePropsContext
    ): Promise<{ _id: string; [key: string]: unknown } | null> => {
        try {
            const apiClient = createApiClient(context);
            const response = await apiClient.post<ApiResponse<{ _id: string; [key: string]: unknown }>>(
                `/api/influencer-bid/${bidId}/create-deal`
            );
            return response.data.data || null;
        } catch (error) {
            console.error('Failed to create deal from bid:', error);
            throw error;
        }
    },
};

export default influencerBidService;

