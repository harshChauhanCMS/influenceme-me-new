import axios from 'axios';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'https://api.influence-me.in';

export interface PaymentData {
  paymentId: string;
  orderId?: string;
  amount: number;
  taxAmount: number;
  taxBreakdown?: {
    cgst?: number;
    sgst?: number;
    igst?: number;
    gst?: number;
  };
  totalAmount: number;
  currency: string;
  status: string;
  paymentMethod: string;
  payerId: string;
  payeeId: string;
  paymentType: string;
  dealId?: string;
  campaignId?: string;
  createdAt: string;
  updatedAt: string;
  invoiceId?: string;
}

export interface RazorpayData {
  orderId: string;
  amount: number;
  currency: string;
  keyId: string;
}

export interface PaymentResponse {
  payment: PaymentData;
  razorpay?: RazorpayData;
}

export interface PaymentListResponse {
  payments: PaymentData[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface InvoiceData {
  invoiceId: string;
  paymentId: string;
  pdfUrl?: string;
  status: string;
  createdAt: string;
}

class PaymentService {
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

  /**
   * Create payment from influencer-brand deal
   */
  async createPaymentFromInfluencerDeal(dealId: string): Promise<PaymentResponse> {
    try {
      // First, fetch deal details to get influencerId and amount
      const { default: offerService } = await import('./offerService');
      const deal = await offerService.getDealDetails(dealId);
      
      if (!deal) {
        throw new Error('Deal not found');
      }

      const influencerId = typeof deal.influencerId === 'string' ? deal.influencerId : deal.influencerId?._id || deal.influencerId;
      const amount = deal.finalTerms?.agreedAmount || deal.agreedAmount || 0;

      if (!influencerId || !amount) {
        throw new Error('Deal information incomplete');
      }

      const token = this.getAuthToken();
      const response = await this.apiClient.post<{ status: boolean; data: PaymentResponse; message: string }>(
        '/api/payment/create',
        {
          payeeId: influencerId,
          payeeType: 'influencer',
          paymentType: 'brand_to_influencer',
          amount,
          dealId,
          campaignId: deal.campaignId,
        },
        {
          headers: {
            Authorization: token ? `Bearer ${token}` : undefined,
          },
        }
      );
      if (!response.data.status) {
        throw new Error(response.data.message || 'Failed to create payment');
      }
      return response.data.data;
    } catch (error: any) {
      console.error('Failed to create payment from influencer deal:', error);
      throw new Error(error.response?.data?.message || error.message || 'Failed to create payment');
    }
  }

  /**
   * Create payment from vendor-brand deal
   */
  async createPaymentFromVendorDeal(dealId: string): Promise<PaymentResponse> {
    try {
      // First, fetch deal details to get vendorId and amount
      const { default: vendorDealService } = await import('./vendorDealService');
      const deal = await vendorDealService.getDealDetails(dealId);
      
      if (!deal) {
        throw new Error('Deal not found');
      }

      const vendorId = typeof deal.vendorId === 'string' ? deal.vendorId : deal.vendorId?._id || deal.vendorId;
      const amount = deal.finalTerms?.agreedAmount || deal.agreedAmount || 0;

      if (!vendorId || !amount) {
        throw new Error('Deal information incomplete');
      }

      const token = this.getAuthToken();
      const response = await this.apiClient.post<{ status: boolean; data: PaymentResponse; message: string }>(
        '/api/payment/create',
        {
          payeeId: vendorId,
          payeeType: 'vendor',
          paymentType: 'brand_to_vendor',
          amount,
          dealId,
          requirementId: deal.requirementId,
        },
        {
          headers: {
            Authorization: token ? `Bearer ${token}` : undefined,
          },
        }
      );
      if (!response.data.status) {
        throw new Error(response.data.message || 'Failed to create payment');
      }
      return response.data.data;
    } catch (error: any) {
      console.error('Failed to create payment from vendor deal:', error);
      throw new Error(error.response?.data?.message || error.message || 'Failed to create payment');
    }
  }

  /**
   * Get payment and invoice for a deal
   */
  async getDealPaymentAndInvoice(dealId: string): Promise<{ payment: PaymentData | null; invoice: InvoiceData | null }> {
    try {
      const token = this.getAuthToken();
      const response = await this.apiClient.get<{ status: boolean; data: { payment: PaymentData | null; invoice: InvoiceData | null }; message: string }>(
        `/api/payment/deal/${dealId}`,
        {
          headers: {
            Authorization: token ? `Bearer ${token}` : undefined,
          },
        }
      );
      if (!response.data.status) {
        throw new Error(response.data.message || 'Failed to get payment');
      }
      return response.data.data;
    } catch (error: any) {
      console.error('Failed to get deal payment:', error);
      throw new Error(error.response?.data?.message || 'Failed to get payment');
    }
  }

  /**
   * Get user payments with filters
   */
  async getUserPayments(params: {
    page?: number;
    limit?: number;
    status?: string;
    paymentType?: string;
  } = {}): Promise<PaymentListResponse> {
    try {
      const token = this.getAuthToken();
      const queryParams = new URLSearchParams();
      if (params.page) queryParams.append('page', params.page.toString());
      if (params.limit) queryParams.append('limit', params.limit.toString());
      if (params.status) queryParams.append('status', params.status);
      if (params.paymentType) queryParams.append('paymentType', params.paymentType);

      const response = await this.apiClient.get<{ status: boolean; data: PaymentListResponse; message: string }>(
        `/api/payment/user?${queryParams.toString()}`,
        {
          headers: {
            Authorization: token ? `Bearer ${token}` : undefined,
          },
        }
      );
      if (!response.data.status) {
        throw new Error(response.data.message || 'Failed to get payments');
      }
      return response.data.data;
    } catch (error: any) {
      console.error('Failed to get user payments:', error);
      throw new Error(error.response?.data?.message || 'Failed to get payments');
    }
  }

  /**
   * Verify payment
   */
  async verifyPayment(paymentId: string, orderId: string, signature: string): Promise<PaymentData> {
    try {
      const token = this.getAuthToken();
      const response = await this.apiClient.post<{ status: boolean; data: { payment: PaymentData }; message: string }>(
        '/api/payment/razorpay/verify',
        {
          paymentId,
          orderId,
          signature,
        },
        {
          headers: {
            Authorization: token ? `Bearer ${token}` : undefined,
          },
        }
      );
      if (!response.data.status) {
        throw new Error(response.data.message || 'Failed to verify payment');
      }
      return response.data.data.payment;
    } catch (error: any) {
      console.error('Failed to verify payment:', error);
      throw new Error(error.response?.data?.message || 'Failed to verify payment');
    }
  }

  /**
   * Get invoice PDF URL
   */
  async getInvoicePDF(invoiceId: string): Promise<string> {
    try {
      const token = this.getAuthToken();
      const response = await this.apiClient.get<{ status: boolean; data: { pdfUrl: string }; message: string }>(
        `/api/invoice/${invoiceId}/pdf`,
        {
          headers: {
            Authorization: token ? `Bearer ${token}` : undefined,
          },
        }
      );
      if (!response.data.status) {
        throw new Error(response.data.message || 'Failed to get invoice PDF');
      }
      return response.data.data.pdfUrl;
    } catch (error: any) {
      console.error('Failed to get invoice PDF:', error);
      throw new Error(error.response?.data?.message || 'Failed to get invoice PDF');
    }
  }

  /**
   * Generate invoice for payment
   */
  async generateInvoiceForPayment(paymentId: string): Promise<InvoiceData> {
    try {
      const token = this.getAuthToken();
      const response = await this.apiClient.post<{ status: boolean; data: { invoice: InvoiceData }; message: string }>(
        '/api/invoice/generate',
        {
          paymentId,
        },
        {
          headers: {
            Authorization: token ? `Bearer ${token}` : undefined,
          },
        }
      );
      if (!response.data.status) {
        throw new Error(response.data.message || 'Failed to generate invoice');
      }
      return response.data.data.invoice;
    } catch (error: any) {
      console.error('Failed to generate invoice:', error);
      throw new Error(error.response?.data?.message || 'Failed to generate invoice');
    }
  }
}

export const paymentService = new PaymentService();
export default paymentService;
