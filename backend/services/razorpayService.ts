import Razorpay from "razorpay";
import crypto from "crypto";
import axios from "axios";
import Settings from "../models/settings";

interface RazorpayConfig {
  keyId: string;
  keySecret: string;
}

interface CreateOrderParams {
  amount: number; // Amount in paise (smallest currency unit)
  currency?: string;
  receipt?: string;
  notes?: Record<string, string>;
}

interface VerifyPaymentParams {
  orderId: string;
  paymentId: string;
  signature: string;
}

class RazorpayService {
  private razorpayInstance: Razorpay | null = null;
  private config: RazorpayConfig | null = null;

  /**
   * Initialize Razorpay with keys from settings
   */
  async initialize(): Promise<void> {
    try {
      const settings = await Settings.getSettings();
      const { razorpayKeyId, razorpayKeySecret } = settings.paymentSettings;

      if (!razorpayKeyId || !razorpayKeySecret) {
        throw new Error("Razorpay keys not configured. Please configure in admin settings.");
      }

      this.config = {
        keyId: razorpayKeyId,
        keySecret: razorpayKeySecret,
      };

      this.razorpayInstance = new Razorpay({
        key_id: razorpayKeyId,
        key_secret: razorpayKeySecret,
      });

      console.log("✅ Razorpay initialized successfully");
    } catch (error: any) {
      console.error("❌ Razorpay initialization error:", error);
      throw new Error(`Failed to initialize Razorpay: ${error.message}`);
    }
  }

  /**
   * Get Razorpay instance (initialize if needed)
   */
  private async getInstance(): Promise<Razorpay> {
    if (!this.razorpayInstance) {
      await this.initialize();
    }
    if (!this.razorpayInstance) {
      throw new Error("Razorpay instance not available");
    }
    return this.razorpayInstance;
  }

  /**
   * Create a Razorpay order
   */
  async createOrder(params: CreateOrderParams): Promise<any> {
    try {
      const instance = await this.getInstance();
      
      const orderParams: any = {
        amount: params.amount, // Amount in paise
        currency: params.currency || "INR",
      };

      if (params.receipt) {
        orderParams.receipt = params.receipt;
      }

      if (params.notes) {
        orderParams.notes = params.notes;
      }

      const order = await instance.orders.create(orderParams);
      return order;
    } catch (error: any) {
      console.error("❌ Razorpay create order error:", error);
      throw new Error(`Failed to create Razorpay order: ${error.message}`);
    }
  }

  /**
   * Verify payment signature
   */
  async verifyPayment(params: VerifyPaymentParams): Promise<boolean> {
    try {
      if (!this.config) {
        await this.initialize();
      }
      if (!this.config) {
        throw new Error("Razorpay config not available");
      }

      const { orderId, paymentId, signature } = params;
      const text = `${orderId}|${paymentId}`;
      const generatedSignature = crypto
        .createHmac("sha256", this.config.keySecret)
        .update(text)
        .digest("hex");

      return generatedSignature === signature;
    } catch (error: any) {
      console.error("❌ Razorpay verify payment error:", error);
      return false;
    }
  }

  /**
   * Get payment details
   */
  async getPayment(paymentId: string): Promise<any> {
    try {
      const instance = await this.getInstance();
      const payment = await instance.payments.fetch(paymentId);
      return payment;
    } catch (error: any) {
      console.error("❌ Razorpay get payment error:", error);
      throw new Error(`Failed to fetch payment: ${error.message}`);
    }
  }

  /**
   * Get order details
   */
  async getOrder(orderId: string): Promise<any> {
    try {
      const instance = await this.getInstance();
      const order = await instance.orders.fetch(orderId);
      return order;
    } catch (error: any) {
      console.error("❌ Razorpay get order error:", error);
      throw new Error(`Failed to fetch order: ${error.message}`);
    }
  }

  /**
   * Get payments by order ID using Razorpay REST API
   */
  async getPaymentsByOrderId(orderId: string): Promise<any[]> {
    try {
      // Ensure config is loaded
      if (!this.config) {
        await this.initialize();
      }

      if (!this.config || !this.config.keyId || !this.config.keySecret) {
        throw new Error("Razorpay credentials not configured");
      }

      // Use Razorpay REST API directly
      const credentials = Buffer.from(`${this.config.keyId}:${this.config.keySecret}`).toString("base64");
      const response = await axios.get(
        `https://api.razorpay.com/v1/payments?order_id=${orderId}`,
        {
          headers: {
            Authorization: `Basic ${credentials}`,
            "Content-Type": "application/json",
          },
        }
      );

      return response.data.items || [];
    } catch (error: any) {
      console.error("❌ Razorpay get payments by order ID error:", error);
      throw new Error(`Failed to fetch payments: ${error.message}`);
    }
  }

  /**
   * Capture payment (convert authorized to captured)
   */
  async capturePayment(paymentId: string, amount?: number): Promise<any> {
    try {
      const instance = await this.getInstance();
      
      console.log(`🔄 Capturing Razorpay payment: ${paymentId}, amount: ${amount}`);
      
      // Get payment to get currency and amount if not provided
      const payment = await this.getPayment(paymentId);
      const currency = payment.currency || 'INR';
      const captureAmount = amount || payment.amount; // Use provided amount or full payment amount
      
      console.log(`📋 Capture details: amount=${captureAmount}, currency=${currency}`);
      
      // Razorpay capture method signature: payments.capture(paymentId, amount, currency)
      const capturedPayment = await instance.payments.capture(paymentId, captureAmount, currency);
      console.log(`✅ Payment captured successfully: ${paymentId}`);
      return capturedPayment;
    } catch (error: any) {
      console.error("❌ Razorpay capture error:", error);
      throw new Error(`Failed to capture payment: ${error.message}`);
    }
  }

  /**
   * Refund payment
   */
  async refundPayment(paymentId: string, amount?: number, notes?: Record<string, string>): Promise<any> {
    try {
      const instance = await this.getInstance();
      const refundParams: any = {};
      
      if (amount) {
        refundParams.amount = amount; // Amount in paise
      }

      if (notes) {
        refundParams.notes = notes;
      }

      const refund = await instance.payments.refund(paymentId, refundParams);
      return refund;
    } catch (error: any) {
      console.error("❌ Razorpay refund error:", error);
      throw new Error(`Failed to process refund: ${error.message}`);
    }
  }

  /**
   * Get refund details
   */
  async getRefund(refundId: string): Promise<any> {
    try {
      const instance = await this.getInstance();
      const refund = await instance.refunds.fetch(refundId);
      return refund;
    } catch (error: any) {
      console.error("❌ Razorpay get refund error:", error);
      throw new Error(`Failed to fetch refund: ${error.message}`);
    }
  }

  /**
   * Get public key (for frontend)
   */
  async getPublicKey(): Promise<string> {
    try {
      if (!this.config) {
        await this.initialize();
      }
      if (!this.config) {
        throw new Error("Razorpay config not available");
      }
      return this.config.keyId;
    } catch (error: any) {
      console.error("❌ Razorpay get public key error:", error);
      throw new Error(`Failed to get Razorpay key: ${error.message}`);
    }
  }
}

// Export singleton instance
export const razorpayService = new RazorpayService();
export default razorpayService;

