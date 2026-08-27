import axios from 'axios';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'https://api.influence-me.in';

export interface RazorpayOrderResponse {
  status: boolean;
  data: {
    orderId: string;
    amount: number;
    currency: string;
    keyId: string;
  };
  message: string;
}

export interface RazorpayVerifyResponse {
  status: boolean;
  data: {
    paymentId: string;
    orderId: string;
    amount: number;
    currency: string;
    status: string;
    paymentDetails: any;
  };
  message: string;
}

export interface PaymentSettings {
  razorpayKeyId: string;
  currency: string;
  paymentMethods: string[];
  platformFeePercentage: number;
  minWithdrawalAmount: number;
}

class RazorpayService {
  private apiClient = axios.create({
    baseURL: API_BASE_URL,
    headers: {
      'Content-Type': 'application/json',
    },
  });

  /**
   * Get payment settings (public key)
   */
  async getPaymentSettings(): Promise<PaymentSettings> {
    try {
      const response = await this.apiClient.get<{ status: boolean; data: PaymentSettings }>(
        '/api/settings/payment'
      );
      return response.data.data;
    } catch (error: any) {
      console.error('Failed to get payment settings:', error);
      throw new Error(error.response?.data?.message || 'Failed to get payment settings');
    }
  }

  /**
   * Create Razorpay order
   */
  async createOrder(
    amount: number,
    currency: string = 'INR',
    receipt?: string,
    notes?: Record<string, string>
  ): Promise<RazorpayOrderResponse> {
    try {
      const token = localStorage.getItem('token');
      const response = await this.apiClient.post<RazorpayOrderResponse>(
        '/api/payment/razorpay/create-order',
        {
          amount,
          currency,
          receipt,
          notes,
        },
        {
          headers: {
            Authorization: token ? `Bearer ${token}` : undefined,
          },
        }
      );
      return response.data;
    } catch (error: any) {
      console.error('Failed to create Razorpay order:', error);
      throw new Error(error.response?.data?.message || 'Failed to create order');
    }
  }

  /**
   * Verify Razorpay payment
   */
  async verifyPayment(
    orderId: string,
    paymentId: string,
    signature: string
  ): Promise<RazorpayVerifyResponse> {
    try {
      const token = localStorage.getItem('token');
      const response = await this.apiClient.post<RazorpayVerifyResponse>(
        '/api/payment/razorpay/verify',
        {
          orderId,
          paymentId,
          signature,
        },
        {
          headers: {
            Authorization: token ? `Bearer ${token}` : undefined,
          },
        }
      );
      return response.data;
    } catch (error: any) {
      console.error('Failed to verify Razorpay payment:', error);
      throw new Error(error.response?.data?.message || 'Failed to verify payment');
    }
  }

  /**
   * Initialize Razorpay checkout
   */
  async initializeCheckout(
    orderId: string,
    amount: number,
    currency: string,
    keyId: string,
    options: {
      name?: string;
      description?: string;
      prefill?: {
        name?: string;
        email?: string;
        contact?: string;
      };
      theme?: {
        color?: string;
      };
      handler?: (response: any) => void;
      modal?: {
        ondismiss?: () => void;
      };
    } = {}
  ): Promise<void> {
    return new Promise((resolve, reject) => {
      // Load Razorpay script dynamically
      const script = document.createElement('script');
      script.src = 'https://checkout.razorpay.com/v1/checkout.js';
      script.onload = () => {
        try {
          const Razorpay = (window as any).Razorpay;
          if (!Razorpay) {
            reject(new Error('Razorpay SDK not loaded'));
            return;
          }

          const razorpayOptions = {
            key: keyId,
            amount: amount * 100, // Convert to paise
            currency,
            name: options.name || 'InfluenceMe',
            description: options.description || 'Payment',
            order_id: orderId,
            prefill: options.prefill || {},
            theme: options.theme || {
              color: '#636B2F',
            },
            handler: (response: any) => {
              if (options.handler) {
                options.handler(response);
              }
              resolve();
            },
            modal: {
              ondismiss: () => {
                if (options.modal?.ondismiss) {
                  options.modal.ondismiss();
                }
                reject(new Error('Payment cancelled'));
              },
            },
          };

          const razorpay = new Razorpay(razorpayOptions);
          razorpay.open();
        } catch (error: any) {
          reject(error);
        }
      };
      script.onerror = () => {
        reject(new Error('Failed to load Razorpay SDK'));
      };
      document.body.appendChild(script);
    });
  }
}

export const razorpayService = new RazorpayService();
export default razorpayService;

