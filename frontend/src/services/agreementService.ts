import { createApiClient } from '@/config/api';

export interface IAgreement {
    _id: string;
    dealId: string;
    dealType: 'influencer-brand' | 'vendor-brand';
    agreementFile: string;
    brandAgreed: boolean;
    influencerAgreed?: boolean;
    vendorAgreed?: boolean;
    brandAgreedAt?: string;
    influencerAgreedAt?: string;
    vendorAgreedAt?: string;
    isActive: boolean;
    createdAt: string;
    updatedAt: string;
}

class AgreementService {
    /**
     * Get agreement for a deal
     */
    async getAgreement(dealId: string, dealType: 'influencer-brand' | 'vendor-brand'): Promise<IAgreement> {
        const apiClient = createApiClient();
        const response = await apiClient.get(`/api/agreement/${dealId}`, {
            params: { dealType },
        });
        return response.data.data;
    }

    /**
     * Agree to agreement
     */
    async agreeToAgreement(dealId: string, dealType: 'influencer-brand' | 'vendor-brand'): Promise<{ agreement: IAgreement; bothPartiesAgreed: boolean }> {
        const apiClient = createApiClient();
        const response = await apiClient.post(`/api/agreement/${dealId}/agree`, {
            dealType,
        });
        return response.data.data;
    }

    /**
     * Generate agreement for existing deal
     */
    async generateAgreement(dealId: string, dealType: 'influencer-brand' | 'vendor-brand'): Promise<IAgreement> {
        const apiClient = createApiClient();
        const response = await apiClient.post(`/api/agreement/${dealId}/generate`, {
            dealType,
        });
        return response.data.data;
    }
}

const agreementService = new AgreementService();
export default agreementService;

