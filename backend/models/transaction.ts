import mongoose, { Document, Schema, Model } from "mongoose";
import { PaymentStatus, PaymentMethod, Currency } from "./payment";

// Transaction Type Enum
export enum TransactionType {
    DEBIT = "debit", // Money going out
    CREDIT = "credit", // Money coming in
    REFUND = "refund",
    CHARGEBACK = "chargeback",
}

// Transaction Interface
export interface ITransaction extends Document {
    // Transaction Details
    transactionId: string; // Unique transaction ID
    paymentId: string; // Reference to Payment
    
    // User
    userId: string; // User ID (payer or payee depending on type)
    userType: "brand" | "influencer" | "vendor";
    
    // Transaction Type
    type: TransactionType;
    
    // Amount Details
    amount: number;
    currency: Currency;
    
    // Balance Tracking
    balanceBefore: number; // Balance before this transaction
    balanceAfter: number; // Balance after this transaction
    
    // Payment Method
    paymentMethod: PaymentMethod;
    
    // Status
    status: PaymentStatus;
    
    // Description
    description?: string;
    notes?: string;
    
    // Metadata
    metadata?: Record<string, any>;
    
    // Timestamps
    processedAt?: Date;
    createdAt: Date;
    updatedAt: Date;
}

// Transaction Schema
const transactionSchema = new Schema<ITransaction>(
    {
        transactionId: {
            type: String,
            required: true,
            unique: true,
            index: true,
        },
        paymentId: {
            type: String,
            required: true,
            index: true,
        },
        userId: {
            type: String,
            required: true,
            index: true,
        },
        userType: {
            type: String,
            enum: ["brand", "influencer", "vendor"],
            required: true,
        },
        type: {
            type: String,
            enum: Object.values(TransactionType),
            required: true,
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
        balanceBefore: {
            type: Number,
            required: true,
            default: 0,
        },
        balanceAfter: {
            type: Number,
            required: true,
            default: 0,
        },
        paymentMethod: {
            type: String,
            enum: Object.values(PaymentMethod),
            required: true,
        },
        status: {
            type: String,
            enum: Object.values(PaymentStatus),
            default: PaymentStatus.PENDING,
            index: true,
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
        processedAt: {
            type: Date,
        },
    },
    {
        timestamps: true,
    }
);

// Indexes
transactionSchema.index({ userId: 1, type: 1 });
transactionSchema.index({ userId: 1, createdAt: -1 });
transactionSchema.index({ paymentId: 1 });
transactionSchema.index({ status: 1 });

// Generate unique transaction ID before saving
transactionSchema.pre("save", async function (next) {
    if (!this.transactionId) {
        const timestamp = Date.now();
        const random = Math.floor(Math.random() * 10000).toString().padStart(4, "0");
        this.transactionId = `TXN${timestamp}${random}`;
    }
    next();
});

const Transaction: Model<ITransaction> = mongoose.model<ITransaction>("Transaction", transactionSchema);

export default Transaction;

