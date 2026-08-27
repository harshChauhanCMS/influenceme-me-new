import mongoose, { Document, Schema, Model, Types } from "mongoose";

// Payment Status Enum
export enum PaymentStatus {
    PENDING = "pending",
    PROCESSING = "processing",
    COMPLETED = "completed",
    FAILED = "failed",
    REFUNDED = "refunded",
    PARTIALLY_REFUNDED = "partially_refunded",
    CANCELLED = "cancelled",
}

// Payment Method Enum
export enum PaymentMethod {
    RAZORPAY = "razorpay",
    STRIPE = "stripe",
    BANK_TRANSFER = "bank_transfer",
    UPI = "upi",
    WALLET = "wallet",
    CASH = "cash",
}

// Payment Type Enum
export enum PaymentType {
    BRAND_TO_INFLUENCER = "brand_to_influencer",
    BRAND_TO_VENDOR = "brand_to_vendor",
    INFLUENCER_TO_VENDOR = "influencer_to_vendor",
    REFUND = "refund",
    PLATFORM_FEE = "platform_fee",
}

// Currency Enum
export enum Currency {
    INR = "INR",
    USD = "USD",
    EUR = "EUR",
    GBP = "GBP",
}

// Payment Interface
export interface IPayment extends Document {
    // Payment Details
    paymentId: string; // Unique payment ID (generated)
    orderId?: string; // Gateway order ID
    transactionId?: string; // Gateway transaction ID
    
    // Parties
    payerId: string; // User ID who is paying (brand/influencer)
    payerType: "brand" | "influencer";
    payeeId: string; // User ID receiving payment (influencer/vendor)
    payeeType: "influencer" | "vendor";
    
    // Payment Type
    paymentType: PaymentType;
    
    // Related Entities
    dealId?: string; // InfluencerBrandDeal or VendorBrandDeal ID
    campaignId?: string; // Campaign ID (if applicable)
    invoiceId?: string; // Invoice ID
    
    // Amount Details
    amount: number; // Base amount
    currency: Currency;
    exchangeRate?: number; // Exchange rate if currency conversion applied
    
    // Tax Details
    taxAmount: number;
    taxPercentage: number;
    taxBreakdown?: {
        gst?: number;
        cgst?: number;
        sgst?: number;
        igst?: number;
        tds?: number;
        [key: string]: number | undefined;
    };
    
    // Platform Charges
    platformFee: number;
    platformFeePercentage: number;
    
    // Final Amounts
    subtotal: number; // amount + taxAmount
    totalAmount: number; // subtotal + platformFee
    
    // Payment Method
    paymentMethod: PaymentMethod;
    gatewayResponse?: any; // Gateway-specific response data
    
    // Status
    status: PaymentStatus;
    failureReason?: string;
    
    // Metadata
    description?: string;
    notes?: string;
    metadata?: Record<string, any>;
    
    // Timestamps
    paidAt?: Date;
    refundedAt?: Date;
    createdAt: Date;
    updatedAt: Date;
}

// Payment Schema
const paymentSchema = new Schema<IPayment>(
    {
        paymentId: {
            type: String,
            required: true,
            unique: true,
            index: true,
        },
        orderId: {
            type: String,
            index: true,
        },
        transactionId: {
            type: String,
            index: true,
        },
        payerId: {
            type: String,
            required: true,
            index: true,
        },
        payerType: {
            type: String,
            enum: ["brand", "influencer"],
            required: true,
        },
        payeeId: {
            type: String,
            required: true,
            index: true,
        },
        payeeType: {
            type: String,
            enum: ["influencer", "vendor"],
            required: true,
        },
        paymentType: {
            type: String,
            enum: Object.values(PaymentType),
            required: true,
            index: true,
        },
        dealId: {
            type: String,
            index: true,
        },
        campaignId: {
            type: String,
            index: true,
        },
        invoiceId: {
            type: String,
            index: true,
        },
        amount: {
            type: Number,
            required: true,
            min: 0,
        },
        currency: {
            type: String,
            enum: Object.values(Currency),
            default: Currency.INR,
        },
        exchangeRate: {
            type: Number,
            min: 0,
        },
        taxAmount: {
            type: Number,
            required: true,
            default: 0,
            min: 0,
        },
        taxPercentage: {
            type: Number,
            required: true,
            default: 0,
            min: 0,
            max: 100,
        },
        taxBreakdown: {
            type: Schema.Types.Mixed,
        },
        platformFee: {
            type: Number,
            required: true,
            default: 0,
            min: 0,
        },
        platformFeePercentage: {
            type: Number,
            required: true,
            default: 0,
            min: 0,
            max: 100,
        },
        subtotal: {
            type: Number,
            required: true,
            min: 0,
        },
        totalAmount: {
            type: Number,
            required: true,
            min: 0,
        },
        paymentMethod: {
            type: String,
            enum: Object.values(PaymentMethod),
            required: true,
        },
        gatewayResponse: {
            type: Schema.Types.Mixed,
        },
        status: {
            type: String,
            enum: Object.values(PaymentStatus),
            default: PaymentStatus.PENDING,
            index: true,
        },
        failureReason: {
            type: String,
        },
        description: {
            type: String,
        },
        notes: {
            type: String,
        },
        metadata: {
            type: Schema.Types.Mixed,
        },
        paidAt: {
            type: Date,
        },
        refundedAt: {
            type: Date,
        },
    },
    {
        timestamps: true,
    }
);

// Indexes for efficient querying
paymentSchema.index({ payerId: 1, status: 1 });
paymentSchema.index({ payeeId: 1, status: 1 });
paymentSchema.index({ dealId: 1 });
paymentSchema.index({ paymentType: 1, status: 1 });
paymentSchema.index({ createdAt: -1 });

// Generate unique payment ID before saving
paymentSchema.pre("save", async function (next) {
    if (!this.paymentId) {
        const timestamp = Date.now();
        const random = Math.floor(Math.random() * 10000).toString().padStart(4, "0");
        this.paymentId = `PAY${timestamp}${random}`;
    }
    next();
});

const Payment: Model<IPayment> = mongoose.model<IPayment>("Payment", paymentSchema);

export default Payment;

