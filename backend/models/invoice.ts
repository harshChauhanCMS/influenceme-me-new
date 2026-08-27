import mongoose, { Document, Schema, Model } from "mongoose";
import { Currency } from "./payment";

// Invoice Status Enum
export enum InvoiceStatus {
    DRAFT = "draft",
    PENDING = "pending",
    SENT = "sent",
    PAID = "paid",
    OVERDUE = "overdue",
    CANCELLED = "cancelled",
}

// Invoice Interface
export interface IInvoice extends Document {
    // Invoice Details
    invoiceId: string; // Unique invoice ID
    invoiceNumber: string; // Human-readable invoice number (e.g., INV-2025-001)
    
    // Parties
    issuerId: string; // User ID issuing invoice (platform)
    issuerType: "platform" | "brand" | "influencer" | "vendor";
    recipientId: string; // User ID receiving invoice
    recipientType: "brand" | "influencer" | "vendor";
    
    // Related Entities
    paymentId?: string; // Payment ID (if invoice is for a payment)
    dealId?: string; // Deal ID
    campaignId?: string; // Campaign ID
    
    // Invoice Items
    items: Array<{
        description: string;
        quantity: number;
        unitPrice: number;
        total: number;
        taxRate?: number;
        taxAmount?: number;
    }>;
    
    // Amount Details
    subtotal: number; // Sum of item totals
    taxAmount: number;
    taxPercentage: number;
    discount?: number;
    platformFee?: number;
    totalAmount: number; // subtotal + taxAmount - discount + platformFee
    
    // Currency
    currency: Currency;
    
    // Dates
    issueDate: Date;
    dueDate: Date;
    paidDate?: Date;
    
    // Status
    status: InvoiceStatus;
    
    // Billing Address
    billingAddress?: {
        name: string;
        address: string;
        city?: string;
        state?: string;
        country: string;
        zipCode?: string;
        taxId?: string; // GST/VAT number
    };
    
    // Payment Terms
    paymentTerms?: string; // e.g., "Net 30", "Due on receipt"
    
    // Notes
    notes?: string;
    termsAndConditions?: string;
    
    // PDF URL
    pdfUrl?: string;
    
    // Metadata
    metadata?: Record<string, any>;
    
    // Timestamps
    createdAt: Date;
    updatedAt: Date;
}

// Invoice Schema
const invoiceItemSchema = new Schema(
    {
        description: {
            type: String,
            required: true,
        },
        quantity: {
            type: Number,
            required: true,
            min: 1,
        },
        unitPrice: {
            type: Number,
            required: true,
            min: 0,
        },
        total: {
            type: Number,
            required: true,
            min: 0,
        },
        taxRate: {
            type: Number,
            min: 0,
            max: 100,
        },
        taxAmount: {
            type: Number,
            min: 0,
        },
    },
    { _id: false }
);

const billingAddressSchema = new Schema(
    {
        name: {
            type: String,
            required: true,
        },
        address: {
            type: String,
            required: true,
        },
        city: String,
        state: String,
        country: {
            type: String,
            required: true,
        },
        zipCode: String,
        taxId: String,
    },
    { _id: false }
);

const invoiceSchema = new Schema<IInvoice>(
    {
        invoiceId: {
            type: String,
            required: true,
            unique: true,
            index: true,
        },
        invoiceNumber: {
            type: String,
            required: true,
            unique: true,
            index: true,
        },
        issuerId: {
            type: String,
            required: true,
            index: true,
        },
        issuerType: {
            type: String,
            enum: ["platform", "brand", "influencer", "vendor"],
            required: true,
        },
        recipientId: {
            type: String,
            required: true,
            index: true,
        },
        recipientType: {
            type: String,
            enum: ["brand", "influencer", "vendor"],
            required: true,
        },
        paymentId: {
            type: String,
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
        items: {
            type: [invoiceItemSchema],
            required: true,
            validate: {
                validator: (items: any[]) => items.length > 0,
                message: "Invoice must have at least one item",
            },
        },
        subtotal: {
            type: Number,
            required: true,
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
        discount: {
            type: Number,
            min: 0,
        },
        platformFee: {
            type: Number,
            min: 0,
        },
        totalAmount: {
            type: Number,
            required: true,
            min: 0,
        },
        currency: {
            type: String,
            enum: Object.values(Currency),
            default: Currency.INR,
        },
        issueDate: {
            type: Date,
            required: true,
            default: Date.now,
        },
        dueDate: {
            type: Date,
            required: true,
        },
        paidDate: {
            type: Date,
        },
        status: {
            type: String,
            enum: Object.values(InvoiceStatus),
            default: InvoiceStatus.DRAFT,
            index: true,
        },
        billingAddress: {
            type: billingAddressSchema,
        },
        paymentTerms: {
            type: String,
        },
        notes: {
            type: String,
        },
        termsAndConditions: {
            type: String,
        },
        pdfUrl: {
            type: String,
        },
        metadata: {
            type: Schema.Types.Mixed,
        },
    },
    {
        timestamps: true,
    }
);

// Indexes
invoiceSchema.index({ recipientId: 1, status: 1 });
invoiceSchema.index({ issuerId: 1 });
invoiceSchema.index({ paymentId: 1 });
invoiceSchema.index({ dealId: 1 });
invoiceSchema.index({ dueDate: 1, status: 1 });
invoiceSchema.index({ createdAt: -1 });

// Generate unique invoice ID and number before saving
invoiceSchema.pre("save", async function (next) {
    if (!this.invoiceId) {
        const timestamp = Date.now();
        const random = Math.floor(Math.random() * 10000).toString().padStart(4, "0");
        this.invoiceId = `INV${timestamp}${random}`;
    }
    
    if (!this.invoiceNumber) {
        const year = new Date().getFullYear();
        const count = await mongoose.model("Invoice").countDocuments({
            invoiceNumber: new RegExp(`^INV-${year}-`),
        });
        this.invoiceNumber = `INV-${year}-${String(count + 1).padStart(4, "0")}`;
    }
    
    next();
});

const Invoice: Model<IInvoice> = mongoose.model<IInvoice>("Invoice", invoiceSchema);

export default Invoice;

