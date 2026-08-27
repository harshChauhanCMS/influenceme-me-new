import axios from 'axios';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'https://api.influence-me.in';

export type PayoutMilestoneStatus = 'locked' | 'pending' | 'requested' | 'paid' | 'rejected';

export interface PayoutMilestone {
  _id: string;
  paymentId: string;
  dealId: string;
  payerId: string;
  payeeId: string;
  payeeType: 'influencer' | 'vendor';
  milestoneNumber: 1 | 2 | 3;
  percentage: 30 | 40;
  amount: number;
  currency: string;
  status: PayoutMilestoneStatus;
  workNote?: string;
  adminNote?: string;
  requestedAt?: string;
  reviewedAt?: string;
  paidAt?: string;
  createdAt: string;
  updatedAt: string;
}

class PayoutMilestoneService {
  private apiClient = axios.create({
    baseURL: API_BASE_URL,
    headers: {
      'Content-Type': 'application/json',
    },
  });

  private getAuthToken(): string | null {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('token');
    }
    return null;
  }

  private authHeaders() {
    const token = this.getAuthToken();
    return {
      Authorization: token ? `Bearer ${token}` : undefined,
    };
  }

  /**
   * Get the 3 payout milestones for a payment (payer or payee only).
   */
  async getMilestonesForPayment(paymentId: string): Promise<PayoutMilestone[]> {
    try {
      const response = await this.apiClient.get<{ status: boolean; data: { milestones: PayoutMilestone[] }; message: string }>(
        `/api/payment/milestones/payment/${paymentId}`,
        { headers: this.authHeaders() }
      );
      if (!response.data.status) {
        throw new Error(response.data.message || 'Failed to get milestones');
      }
      return response.data.data.milestones;
    } catch (error: any) {
      console.error('Failed to get payout milestones:', error);
      throw new Error(error.response?.data?.message || 'Failed to get milestones');
    }
  }

  /**
   * Request release of a milestone (payee only).
   */
  async requestMilestoneRelease(milestoneId: string, workNote: string): Promise<PayoutMilestone> {
    try {
      const response = await this.apiClient.post<{ status: boolean; data: { milestone: PayoutMilestone }; message: string }>(
        `/api/payment/milestones/${milestoneId}/request`,
        { workNote },
        { headers: this.authHeaders() }
      );
      if (!response.data.status) {
        throw new Error(response.data.message || 'Failed to request milestone release');
      }
      return response.data.data.milestone;
    } catch (error: any) {
      console.error('Failed to request milestone release:', error);
      throw new Error(error.response?.data?.message || 'Failed to request milestone release');
    }
  }
}

export const payoutMilestoneService = new PayoutMilestoneService();
export default payoutMilestoneService;
