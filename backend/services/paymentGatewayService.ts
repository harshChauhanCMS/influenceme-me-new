import axios from "axios";
import { PaymentMethod, PaymentStatus, Currency } from "../models/payment";

// Payment Gateway Response Interface
export interface PaymentGatewayResponse {
  success: boolean;
  orderId?: string;
  transactionId?: string;
  paymentId?: string;
  amount: number;
  currency: Currency;
  status: PaymentStatus;
  gatewayResponse?: any;
  error?: string;
  redirectUrl?: string; // For payment gateway redirect
}

// Payment Gateway Service Interface
export interface IPaymentGatewayService {
  createOrder(
    amount: number,
    currency: Currency,
    orderId: string,
    description?: string,
    metadata?: Record<string, any>,
  ): Promise<PaymentGatewayResponse>;

  verifyPayment(
    orderId: string,
    paymentId: string,
    signature?: string,
  ): Promise<PaymentGatewayResponse>;

  refundPayment(
    paymentId: string,
    amount: number,
    reason?: string,
  ): Promise<PaymentGatewayResponse>;

  getPaymentStatus(paymentId: string): Promise<PaymentGatewayResponse>;
}

/**
 * Razorpay Payment Gateway Service
 */
export class RazorpayService implements IPaymentGatewayService {
  private keyId: string;
  private keySecret: string;
  private baseUrl: string;

  constructor() {
    // Try to get from environment variables first (for backward compatibility)
    this.keyId = process.env.RAZORPAY_KEY_ID || "";
    this.keySecret = process.env.RAZORPAY_KEY_SECRET || "";
    this.baseUrl =
      process.env.RAZORPAY_BASE_URL || "https://api.razorpay.com/v1";

    // If not in env, will be loaded from settings when needed
    if (!this.keyId || !this.keySecret) {
      console.warn(
        "⚠️ Razorpay credentials not configured in environment. Will use settings from database.",
      );
    }
  }

  /**
   * Load credentials from database settings
   */
  async loadCredentialsFromSettings(): Promise<void> {
    try {
      const Settings = (await import("../models/settings")).default;
      const settings = await Settings.getSettings();
      const { razorpayKeyId, razorpayKeySecret } = settings.paymentSettings;

      if (razorpayKeyId && razorpayKeySecret) {
        this.keyId = razorpayKeyId;
        this.keySecret = razorpayKeySecret;
      } else if (!this.keyId || !this.keySecret) {
        throw new Error("Razorpay credentials not configured in settings");
      }
    } catch (error: any) {
      console.error(
        "Failed to load Razorpay credentials from settings:",
        error,
      );
      throw error;
    }
  }

  private getAuthHeader(): string {
    const credentials = Buffer.from(`${this.keyId}:${this.keySecret}`).toString(
      "base64",
    );
    return `Basic ${credentials}`;
  }

  async createOrder(
    amount: number,
    currency: Currency,
    orderId: string,
    description?: string,
    metadata?: Record<string, any>,
  ): Promise<PaymentGatewayResponse> {
    try {
      // Load credentials from settings if not already loaded
      if (!this.keyId || !this.keySecret) {
        await this.loadCredentialsFromSettings();
      }

      if (!this.keyId || !this.keySecret) {
        throw new Error("Razorpay credentials not configured");
      }

      // Convert amount to paise (Razorpay uses smallest currency unit)
      const amountInPaise = Math.round(amount * 100);

      const response = await axios.post(
        `${this.baseUrl}/orders`,
        {
          amount: amountInPaise,
          currency: currency,
          receipt: orderId,
          notes: metadata || {},
        },
        {
          headers: {
            Authorization: this.getAuthHeader(),
            "Content-Type": "application/json",
          },
        },
      );

      return {
        success: true,
        orderId: response.data.id,
        amount: amount,
        currency: currency,
        status: PaymentStatus.PENDING,
        gatewayResponse: response.data,
      };
    } catch (error: any) {
      console.error("Razorpay createOrder error:", error);
      return {
        success: false,
        amount,
        currency,
        status: PaymentStatus.FAILED,
        error: error.response?.data?.error?.description || error.message,
      };
    }
  }

  async verifyPayment(
    orderId: string,
    paymentId: string,
    signature?: string,
  ): Promise<PaymentGatewayResponse> {
    try {
      if (!this.keyId || !this.keySecret) {
        throw new Error("Razorpay credentials not configured");
      }

      const response = await axios.get(
        `${this.baseUrl}/payments/${paymentId}`,
        {
          headers: {
            Authorization: this.getAuthHeader(),
          },
        },
      );

      const payment = response.data;

      // Verify signature if provided
      if (signature) {
        const crypto = require("crypto");
        const text = `${orderId}|${paymentId}`;
        const generatedSignature = crypto
          .createHmac("sha256", this.keySecret)
          .update(text)
          .digest("hex");

        if (generatedSignature !== signature) {
          return {
            success: false,
            orderId,
            transactionId: paymentId,
            amount: payment.amount / 100, // Convert from paise
            currency: payment.currency as Currency,
            status: PaymentStatus.FAILED,
            error: "Invalid signature",
          };
        }
      }

      const status =
        payment.status === "captured"
          ? PaymentStatus.COMPLETED
          : payment.status === "failed"
            ? PaymentStatus.FAILED
            : PaymentStatus.PENDING;

      return {
        success: status === PaymentStatus.COMPLETED,
        orderId: payment.order_id,
        transactionId: payment.id,
        paymentId: payment.id,
        amount: payment.amount / 100, // Convert from paise
        currency: payment.currency as Currency,
        status,
        gatewayResponse: payment,
      };
    } catch (error: any) {
      console.error("Razorpay verifyPayment error:", error);
      return {
        success: false,
        orderId,
        transactionId: paymentId,
        amount: 0,
        currency: Currency.INR,
        status: PaymentStatus.FAILED,
        error: error.response?.data?.error?.description || error.message,
      };
    }
  }

  async refundPayment(
    paymentId: string,
    amount: number,
    reason?: string,
  ): Promise<PaymentGatewayResponse> {
    try {
      if (!this.keyId || !this.keySecret) {
        throw new Error("Razorpay credentials not configured");
      }

      const amountInPaise = Math.round(amount * 100);

      const response = await axios.post(
        `${this.baseUrl}/payments/${paymentId}/refund`,
        {
          amount: amountInPaise,
          notes: {
            reason: reason || "Refund requested",
          },
        },
        {
          headers: {
            Authorization: this.getAuthHeader(),
            "Content-Type": "application/json",
          },
        },
      );

      return {
        success: true,
        transactionId: response.data.id,
        paymentId: paymentId,
        amount: response.data.amount / 100,
        currency: response.data.currency as Currency,
        status: PaymentStatus.REFUNDED,
        gatewayResponse: response.data,
      };
    } catch (error: any) {
      console.error("Razorpay refundPayment error:", error);
      return {
        success: false,
        paymentId,
        amount,
        currency: Currency.INR,
        status: PaymentStatus.FAILED,
        error: error.response?.data?.error?.description || error.message,
      };
    }
  }

  async getPaymentStatus(paymentId: string): Promise<PaymentGatewayResponse> {
    try {
      if (!this.keyId || !this.keySecret) {
        throw new Error("Razorpay credentials not configured");
      }

      const response = await axios.get(
        `${this.baseUrl}/payments/${paymentId}`,
        {
          headers: {
            Authorization: this.getAuthHeader(),
          },
        },
      );

      const payment = response.data;
      const status =
        payment.status === "captured"
          ? PaymentStatus.COMPLETED
          : payment.status === "failed"
            ? PaymentStatus.FAILED
            : PaymentStatus.PENDING;

      return {
        success: status === PaymentStatus.COMPLETED,
        orderId: payment.order_id,
        transactionId: payment.id,
        paymentId: payment.id,
        amount: payment.amount / 100,
        currency: payment.currency as Currency,
        status,
        gatewayResponse: payment,
      };
    } catch (error: any) {
      console.error("Razorpay getPaymentStatus error:", error);
      return {
        success: false,
        paymentId,
        amount: 0,
        currency: Currency.INR,
        status: PaymentStatus.FAILED,
        error: error.response?.data?.error?.description || error.message,
      };
    }
  }
}

/**
 * Stripe Payment Gateway Service
 */
export class StripeService implements IPaymentGatewayService {
  private apiKey: string;
  private baseUrl: string;

  constructor() {
    this.apiKey = process.env.STRIPE_SECRET_KEY || "";
    this.baseUrl = "https://api.stripe.com/v1";

    if (!this.apiKey) {
      console.warn("⚠️ Stripe credentials not configured");
    }
  }

  async createOrder(
    amount: number,
    currency: Currency,
    orderId: string,
    description?: string,
    metadata?: Record<string, any>,
  ): Promise<PaymentGatewayResponse> {
    try {
      if (!this.apiKey) {
        throw new Error("Stripe credentials not configured");
      }

      // Convert amount to cents (Stripe uses smallest currency unit)
      const amountInCents = Math.round(amount * 100);

      const response = await axios.post(
        `${this.baseUrl}/payment_intents`,
        {
          amount: amountInCents,
          currency: currency.toLowerCase(),
          description: description || `Payment for order ${orderId}`,
          metadata: {
            orderId,
            ...metadata,
          },
        },
        {
          headers: {
            Authorization: `Bearer ${this.apiKey}`,
            "Content-Type": "application/x-www-form-urlencoded",
          },
        },
      );

      return {
        success: true,
        orderId: response.data.id,
        transactionId: response.data.id,
        amount: amount,
        currency: currency,
        status: PaymentStatus.PENDING,
        gatewayResponse: response.data,
        redirectUrl: response.data.next_action?.redirect_to_url?.url,
      };
    } catch (error: any) {
      console.error("Stripe createOrder error:", error);
      return {
        success: false,
        amount,
        currency,
        status: PaymentStatus.FAILED,
        error: error.response?.data?.error?.message || error.message,
      };
    }
  }

  async verifyPayment(
    orderId: string,
    paymentId: string,
    signature?: string,
  ): Promise<PaymentGatewayResponse> {
    try {
      if (!this.apiKey) {
        throw new Error("Stripe credentials not configured");
      }

      const response = await axios.get(
        `${this.baseUrl}/payment_intents/${paymentId}`,
        {
          headers: {
            Authorization: `Bearer ${this.apiKey}`,
          },
        },
      );

      const payment = response.data;
      const status =
        payment.status === "succeeded"
          ? PaymentStatus.COMPLETED
          : payment.status === "failed"
            ? PaymentStatus.FAILED
            : PaymentStatus.PENDING;

      return {
        success: status === PaymentStatus.COMPLETED,
        orderId: payment.id,
        transactionId: payment.id,
        paymentId: payment.id,
        amount: payment.amount / 100,
        currency: payment.currency.toUpperCase() as Currency,
        status,
        gatewayResponse: payment,
      };
    } catch (error: any) {
      console.error("Stripe verifyPayment error:", error);
      return {
        success: false,
        orderId,
        transactionId: paymentId,
        amount: 0,
        currency: Currency.USD,
        status: PaymentStatus.FAILED,
        error: error.response?.data?.error?.message || error.message,
      };
    }
  }

  async refundPayment(
    paymentId: string,
    amount: number,
    reason?: string,
  ): Promise<PaymentGatewayResponse> {
    try {
      if (!this.apiKey) {
        throw new Error("Stripe credentials not configured");
      }

      const amountInCents = Math.round(amount * 100);

      const response = await axios.post(
        `${this.baseUrl}/refunds`,
        {
          payment_intent: paymentId,
          amount: amountInCents,
          reason: reason || "requested_by_customer",
        },
        {
          headers: {
            Authorization: `Bearer ${this.apiKey}`,
            "Content-Type": "application/x-www-form-urlencoded",
          },
        },
      );

      return {
        success: true,
        transactionId: response.data.id,
        paymentId: paymentId,
        amount: response.data.amount / 100,
        currency: response.data.currency.toUpperCase() as Currency,
        status: PaymentStatus.REFUNDED,
        gatewayResponse: response.data,
      };
    } catch (error: any) {
      console.error("Stripe refundPayment error:", error);
      return {
        success: false,
        paymentId,
        amount,
        currency: Currency.USD,
        status: PaymentStatus.FAILED,
        error: error.response?.data?.error?.message || error.message,
      };
    }
  }

  async getPaymentStatus(paymentId: string): Promise<PaymentGatewayResponse> {
    return this.verifyPayment("", paymentId);
  }
}

/**
 * Payment Gateway Factory
 */
export class PaymentGatewayFactory {
  static createGateway(method: PaymentMethod): IPaymentGatewayService {
    switch (method) {
      case PaymentMethod.RAZORPAY:
        return new RazorpayService();
      case PaymentMethod.STRIPE:
        return new StripeService();
      default:
        throw new Error(`Unsupported payment method: ${method}`);
    }
  }
}
