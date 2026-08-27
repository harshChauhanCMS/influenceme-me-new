import { Response } from "express";
import { successResponse, errorResponse } from "../utils/responseHelper";
import { AuthenticatedRequest } from "../middleware/auth";
import Payment, { PaymentStatus, PaymentMethod, PaymentType, Currency } from "../models/payment";
import Transaction, { TransactionType } from "../models/transaction";
import Invoice, { InvoiceStatus } from "../models/invoice";
import User from "../models/user";
import InfluencerBrandDeal from "../models/influencerBrandDeal";
import VendorBrandDeal from "../models/vendorBrandDeal";
import PayoutMilestone, { PayoutMilestoneStatus } from "../models/payoutMilestone";
import {
    calculatePayment,
    getDefaultTaxConfig,
    getDefaultPlatformFeeConfig,
    convertCurrency,
} from "../utils/paymentCalculator";
import {
    PaymentGatewayFactory,
    IPaymentGatewayService,
} from "../services/paymentGatewayService";
import {
    generateInvoiceForPayment,
    generateInvoicePDF,
    markInvoiceAsPaid,
} from "../services/invoiceService";

// Payment types that are settled against a VendorBrandDeal's finalTerms.paymentStatus,
// and that get released to the payee via the 30/30/40 milestone flow.
// (InfluencerBrandDeal has no paymentStatus field — the influencer flow relies on the
// Payment record's own status instead, so nothing to update there.)
const VENDOR_DEAL_PAYMENT_TYPES = [PaymentType.BRAND_TO_VENDOR, PaymentType.INFLUENCER_TO_VENDOR];
const MILESTONE_ELIGIBLE_PAYMENT_TYPES = [PaymentType.BRAND_TO_INFLUENCER, PaymentType.BRAND_TO_VENDOR];

/**
 * Flip the related deal's finalTerms.paymentStatus to "paid" once a payment completes.
 * Shared by every place that marks a payment COMPLETED (manual verify, auto-verify,
 * webhook) so the call sites can't drift out of sync again.
 */
export async function markDealAsPaidIfApplicable(payment: any): Promise<void> {
    if (payment.dealId && VENDOR_DEAL_PAYMENT_TYPES.includes(payment.paymentType)) {
        const deal = await VendorBrandDeal.findById(payment.dealId);
        if (deal && deal.finalTerms) {
            deal.finalTerms.paymentStatus = "paid";
            await deal.save();
        }
    }
    await createMilestonesForPayment(payment);
}

/**
 * Split a completed payment's payee-owed amount (base amount, tax/platform fee
 * excluded — the same base the credit Transaction already uses) into 3 fixed
 * payout milestones (30/30/40), released sequentially. Idempotent: safe to call
 * more than once for the same payment.
 */
async function createMilestonesForPayment(payment: any): Promise<void> {
    if (!payment.dealId || !MILESTONE_ELIGIBLE_PAYMENT_TYPES.includes(payment.paymentType)) {
        return;
    }

    const alreadyExists = await PayoutMilestone.exists({ paymentId: payment.paymentId });
    if (alreadyExists) return;

    const round2 = (n: number) => Math.round(n * 100) / 100;
    const milestone1Amount = round2(payment.amount * 0.3);
    const milestone2Amount = round2(payment.amount * 0.3);
    const milestone3Amount = round2(payment.amount - milestone1Amount - milestone2Amount);

    const base = {
        paymentId: payment.paymentId,
        dealId: payment.dealId,
        payerId: payment.payerId,
        payeeId: payment.payeeId,
        payeeType: payment.payeeType,
        currency: payment.currency,
    };

    try {
        await PayoutMilestone.create([
            { ...base, milestoneNumber: 1, percentage: 30, amount: milestone1Amount, status: PayoutMilestoneStatus.PENDING },
            { ...base, milestoneNumber: 2, percentage: 30, amount: milestone2Amount, status: PayoutMilestoneStatus.LOCKED },
            { ...base, milestoneNumber: 3, percentage: 40, amount: milestone3Amount, status: PayoutMilestoneStatus.LOCKED },
        ]);
    } catch (error: any) {
        // Unique index on (paymentId, milestoneNumber) — ignore duplicate-key races
        // from a concurrent completion path, otherwise rethrow.
        if (error?.code !== 11000) throw error;
    }
}

// ---------------------------------------------------------
// ✅ CREATE PAYMENT (Initiate Payment)
// ---------------------------------------------------------
export const createPayment = async (req: AuthenticatedRequest, res: Response) => {
    try {
        const userId = req.user?._id?.toString();
        const userRole = req.user?.role;

        if (!userId || !userRole) {
            return errorResponse(res, "User not authenticated", 401);
        }

        const {
            payeeId,
            payeeType,
            paymentType,
            amount,
            currency = Currency.INR,
            dealId,
            campaignId,
            paymentMethod = PaymentMethod.RAZORPAY,
            description,
            notes,
            metadata,
            taxConfig,
            platformFeeConfig,
            isInterState = false,
        } = req.body;

        // Validation
        if (!payeeId || !payeeType || !paymentType || !amount || amount <= 0) {
            return errorResponse(res, "Missing required fields", 400);
        }

        // Validate payment type and user role
        if (
            (paymentType === PaymentType.BRAND_TO_INFLUENCER && userRole !== "brand") ||
            (paymentType === PaymentType.BRAND_TO_VENDOR && userRole !== "brand") ||
            (paymentType === PaymentType.INFLUENCER_TO_VENDOR && userRole !== "influencer")
        ) {
            return errorResponse(res, "Unauthorized payment type for your role", 403);
        }

        // Validate payee exists
        const payee = await User.findById(payeeId);
        if (!payee) {
            return errorResponse(res, "Payee not found", 404);
        }

        // Get tax configuration from settings if not provided
        let finalTaxConfig = taxConfig;
        let finalIsInterState = isInterState;
        
        if (!finalTaxConfig) {
            const { getTaxConfigFromSettings } = await import("../utils/paymentCalculator");
            const taxSettings = await getTaxConfigFromSettings();
            finalTaxConfig = taxSettings.taxConfig;
            finalIsInterState = taxSettings.isInterState;
        }

        // Calculate payment breakdown
        const paymentCalculation = calculatePayment(amount, currency, {
            taxConfig: finalTaxConfig,
            platformFeeConfig: platformFeeConfig || getDefaultPlatformFeeConfig(),
            isInterState: finalIsInterState,
            applyTax: true,
            applyPlatformFee: true,
        });

        // Create payment record
        const payment = new Payment({
            payerId: userId,
            payerType: userRole as "brand" | "influencer",
            payeeId,
            payeeType: payeeType as "influencer" | "vendor",
            paymentType,
            dealId,
            campaignId,
            amount: paymentCalculation.amount,
            currency: paymentCalculation.currency,
            taxAmount: paymentCalculation.taxAmount,
            taxPercentage: paymentCalculation.taxPercentage,
            taxBreakdown: paymentCalculation.taxBreakdown,
            platformFee: paymentCalculation.platformFee,
            platformFeePercentage: paymentCalculation.platformFeePercentage,
            subtotal: paymentCalculation.subtotal,
            totalAmount: paymentCalculation.totalAmount,
            paymentMethod,
            status: PaymentStatus.PENDING,
            description,
            notes,
            metadata,
        });

        await payment.save();

        // Create order with payment gateway
        let gatewayResponse;
        try {
            const gateway = PaymentGatewayFactory.createGateway(paymentMethod);
            gatewayResponse = await gateway.createOrder(
                paymentCalculation.totalAmount,
                currency,
                payment.paymentId,
                description || `Payment for ${paymentType}`,
                {
                    paymentId: payment.paymentId,
                    dealId: dealId || "",
                    campaignId: campaignId || "",
                    ...metadata,
                }
            );

            if (gatewayResponse.success && gatewayResponse.orderId) {
                payment.orderId = gatewayResponse.orderId;
                payment.transactionId = gatewayResponse.transactionId;
                payment.gatewayResponse = gatewayResponse.gatewayResponse;
                await payment.save();
            } else {
                payment.status = PaymentStatus.FAILED;
                payment.failureReason = gatewayResponse.error || "Gateway error";
                await payment.save();
                return errorResponse(res, gatewayResponse.error || "Failed to create payment order", 500);
            }
        } catch (gatewayError: any) {
            payment.status = PaymentStatus.FAILED;
            payment.failureReason = gatewayError.message;
            await payment.save();
            return errorResponse(res, `Payment gateway error: ${gatewayError.message}`, 500);
        }

        // Razorpay public key for the frontend Checkout widget. Fetched via the
        // dedicated razorpayService (same account/credentials the gateway used
        // above via PaymentGatewayFactory) rather than duplicating key lookup here.
        let razorpayBlock: { orderId?: string; keyId: string; amount: number; currency: string } | undefined;
        if (paymentMethod === PaymentMethod.RAZORPAY) {
            const razorpayService = await import("../services/razorpayService");
            const keyId = await razorpayService.default.getPublicKey();
            razorpayBlock = {
                orderId: payment.orderId,
                keyId,
                amount: payment.totalAmount,
                currency: payment.currency,
            };
        }

        return successResponse(
            res,
            "Payment order created successfully",
            {
                payment: {
                    paymentId: payment.paymentId,
                    orderId: payment.orderId,
                    amount: payment.totalAmount,
                    currency: payment.currency,
                    status: payment.status,
                    redirectUrl: gatewayResponse.redirectUrl,
                },
                razorpay: razorpayBlock,
            },
            201
        );
    } catch (error: any) {
        console.error("Error creating payment:", error);
        return errorResponse(res, `Failed to create payment: ${error.message}`, 500);
    }
};

// ---------------------------------------------------------
// ✅ VERIFY PAYMENT (Webhook/Callback Handler)
// ---------------------------------------------------------
export const verifyPayment = async (req: AuthenticatedRequest, res: Response) => {
    try {
        const { paymentId, orderId, signature } = req.body;

        if (!paymentId || !orderId) {
            return errorResponse(res, "Missing paymentId or orderId", 400);
        }

        const payment = await Payment.findOne({ paymentId });

        if (!payment) {
            return errorResponse(res, "Payment not found", 404);
        }

        // Verify with payment gateway
        const gateway = PaymentGatewayFactory.createGateway(payment.paymentMethod);
        const verificationResult = await gateway.verifyPayment(orderId, paymentId, signature);

        if (!verificationResult.success) {
            payment.status = PaymentStatus.FAILED;
            payment.failureReason = verificationResult.error || "Verification failed";
            await payment.save();
            return errorResponse(res, verificationResult.error || "Payment verification failed", 400);
        }

        // Update payment status
        payment.status = PaymentStatus.COMPLETED;
        payment.transactionId = verificationResult.transactionId;
        payment.paidAt = new Date();
        payment.gatewayResponse = verificationResult.gatewayResponse;
        await payment.save();

        // Create transactions
        await createTransactions(payment);

        // Generate invoice
        const invoice = await generateInvoiceForPayment(payment.paymentId);
        
        // Generate invoice PDF if invoice was created
        if (invoice) {
            await generateInvoicePDF(invoice.invoiceId);
            await markDealAsPaidIfApplicable(payment);
        }

        return successResponse(res, "Payment verified successfully", {
            payment: {
                paymentId: payment.paymentId,
                status: payment.status,
                amount: payment.totalAmount,
            },
        });
    } catch (error: any) {
        console.error("Error verifying payment:", error);
        return errorResponse(res, `Failed to verify payment: ${error.message}`, 500);
    }
};

// ---------------------------------------------------------
// ✅ GET PAYMENT STATUS
// ---------------------------------------------------------
export const getPaymentStatus = async (req: AuthenticatedRequest, res: Response) => {
    try {
        const { paymentId } = req.params;
        const userId = req.user?._id?.toString();

        if (!userId) {
            return errorResponse(res, "User not authenticated", 401);
        }

        const payment = await Payment.findOne({
            paymentId,
            $or: [{ payerId: userId }, { payeeId: userId }],
        });

        if (!payment) {
            return errorResponse(res, "Payment not found", 404);
        }

        return successResponse(res, "Payment status retrieved", {
            payment: {
                paymentId: payment.paymentId,
                orderId: payment.orderId,
                transactionId: payment.transactionId,
                amount: payment.amount,
                totalAmount: payment.totalAmount,
                currency: payment.currency,
                status: payment.status,
                paymentMethod: payment.paymentMethod,
                paidAt: payment.paidAt,
                failureReason: payment.failureReason,
            },
        });
    } catch (error: any) {
        console.error("Error getting payment status:", error);
        return errorResponse(res, `Failed to get payment status: ${error.message}`, 500);
    }
};

// ---------------------------------------------------------
// ✅ GET USER PAYMENTS
// ---------------------------------------------------------
export const getUserPayments = async (req: AuthenticatedRequest, res: Response) => {
    try {
        const userId = req.user?._id?.toString();
        const { page = "1", limit = "20", status, paymentType } = req.query;

        if (!userId) {
            return errorResponse(res, "User not authenticated", 401);
        }

        const query: Record<string, any> = {
            $or: [{ payerId: userId }, { payeeId: userId }],
        };

        if (status) query.status = status;
        if (paymentType) query.paymentType = paymentType;

        const skip = (parseInt(page as string) - 1) * parseInt(limit as string);

        const payments = await Payment.find(query)
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(parseInt(limit as string));

        const total = await Payment.countDocuments(query);

        return successResponse(
            res,
            "Payments retrieved successfully",
            {
                payments,
                pagination: {
                    total,
                    page: parseInt(page as string),
                    limit: parseInt(limit as string),
                    totalPages: Math.ceil(total / parseInt(limit as string)),
                },
            },
            200
        );
    } catch (error: any) {
        console.error("Error getting user payments:", error);
        return errorResponse(res, `Failed to get payments: ${error.message}`, 500);
    }
};

// ---------------------------------------------------------
// ✅ REFUND PAYMENT
// ---------------------------------------------------------
export const refundPayment = async (req: AuthenticatedRequest, res: Response) => {
    try {
        const userId = req.user?._id?.toString();
        const { paymentId, amount, reason } = req.body;

        if (!userId) {
            return errorResponse(res, "User not authenticated", 401);
        }

        const payment = await Payment.findOne({
            paymentId,
            payerId: userId, // Only payer can request refund
        });

        if (!payment) {
            return errorResponse(res, "Payment not found", 404);
        }

        if (payment.status !== PaymentStatus.COMPLETED) {
            return errorResponse(res, "Only completed payments can be refunded", 400);
        }

        const refundAmount = amount || payment.totalAmount;

        if (refundAmount > payment.totalAmount) {
            return errorResponse(res, "Refund amount cannot exceed payment amount", 400);
        }

        // Process refund through gateway
        const gateway = PaymentGatewayFactory.createGateway(payment.paymentMethod);
        const refundResult = await gateway.refundPayment(
            payment.transactionId || payment.paymentId,
            refundAmount,
            reason
        );

        if (!refundResult.success) {
            return errorResponse(res, refundResult.error || "Refund failed", 500);
        }

        // Update payment status
        if (refundAmount === payment.totalAmount) {
            payment.status = PaymentStatus.REFUNDED;
        } else {
            payment.status = PaymentStatus.PARTIALLY_REFUNDED;
        }
        payment.refundedAt = new Date();
        await payment.save();

        // Create refund transaction
        await createRefundTransaction(payment, refundAmount);

        return successResponse(res, "Refund processed successfully", {
            refund: {
                paymentId: payment.paymentId,
                refundAmount,
                status: payment.status,
            },
        });
    } catch (error: any) {
        console.error("Error processing refund:", error);
        return errorResponse(res, `Failed to process refund: ${error.message}`, 500);
    }
};

// ---------------------------------------------------------
// ✅ CREATE PAYMENT FROM DEAL (Influencer to Vendor)
// ---------------------------------------------------------
export const createPaymentFromDeal = async (req: AuthenticatedRequest, res: Response) => {
    try {
        const userId = req.user?._id?.toString();
        const userRole = req.user?.role;

        if (!userId || !userRole) {
            return errorResponse(res, "User not authenticated", 401);
        }

        if (userRole !== "influencer") {
            return errorResponse(res, "Only influencers can pay vendors", 403);
        }

        const { dealId } = req.body;

        if (!dealId) {
            return errorResponse(res, "Deal ID is required", 400);
        }

        // Get deal details
        const deal = await VendorBrandDeal.findById(dealId);

        if (!deal) {
            return errorResponse(res, "Deal not found", 404);
        }

        // Verify user is the brand (influencer) in this deal
        if (deal.brandId !== userId) {
            return errorResponse(res, "Unauthorized: You are not the client in this deal", 403);
        }

        // Check if payment can be created
        // Allow payment if:
        // 1. Deal is active AND status is running, OR
        // 2. Payment status is pending (even if deal is completed or inactive)
        const paymentStatus = deal.finalTerms?.paymentStatus;
        const isPaymentPending = paymentStatus === 'pending' || paymentStatus === null;
        const isDealRunning = deal.status === 'running';
        
        // Allow payment if:
        // - Deal is active AND running, OR
        // - Payment is pending (regardless of deal status or isActive)
        if (!isPaymentPending && (!deal.isActive || !isDealRunning)) {
            return errorResponse(res, "Deal is not active or payment is already completed", 400);
        }

        // Check if payment already exists for this deal
        const existingPayment = await Payment.findOne({
            dealId: dealId,
            paymentType: PaymentType.INFLUENCER_TO_VENDOR,
        });

        if (existingPayment) {
            // If payment is completed, don't allow creating a new one
            if (existingPayment.status === PaymentStatus.COMPLETED) {
                return errorResponse(res, "Payment already completed for this deal", 400);
            }
            
            // If payment is pending or processing, return the existing payment with Razorpay order
            if (existingPayment.status === PaymentStatus.PENDING || existingPayment.status === PaymentStatus.PROCESSING) {
                // Get Razorpay public key for frontend
                const razorpayService = await import("../services/razorpayService");
                const keyId = await razorpayService.default.getPublicKey();
                
                return successResponse(
                    res,
                    "Payment order already exists",
                    {
                        payment: {
                            paymentId: existingPayment.paymentId,
                            orderId: existingPayment.orderId,
                            amount: Number(existingPayment.amount), // Service charge (base amount) - ensure it's a number
                            taxAmount: Number(existingPayment.taxAmount), // Tax amount - ensure it's a number
                            taxBreakdown: existingPayment.taxBreakdown || {}, // CGST, SGST, IGST breakdown
                            totalAmount: Number(existingPayment.totalAmount), // Service Charge + Tax (no platform fee) - ensure it's a number
                            currency: existingPayment.currency,
                            status: existingPayment.status,
                        },
                        razorpay: {
                            orderId: existingPayment.orderId,
                            keyId: keyId,
                            amount: Number(existingPayment.totalAmount), // Charge: Service Charge + Tax only (in rupees, frontend will convert to paise)
                            currency: existingPayment.currency,
                        },
                    },
                    200
                );
            }
            
            // If payment is failed or cancelled, allow creating a new one (continue below)
        }

        // Get vendor details
        const vendor = await User.findById(deal.vendorId);
        if (!vendor) {
            return errorResponse(res, "Vendor not found", 404);
        }

        // Validate vendor has bank account
        const bankAccount = (vendor as any).bankAccount;
        if (!bankAccount || !bankAccount.accountNumber) {
            return errorResponse(
                res,
                "Vendor has not linked a bank account. Please contact the vendor.",
                400
            );
        }

        // Get agreed amount from deal
        const agreedAmount = deal.finalTerms?.agreedAmount;
        if (!agreedAmount || agreedAmount <= 0) {
            return errorResponse(res, "Deal amount is not set", 400);
        }

        const currency = (deal.finalTerms?.currency as Currency) || Currency.INR;

        // Get tax configuration from settings
        const { getTaxConfigFromSettings } = await import("../utils/paymentCalculator");
        const { taxConfig, isInterState } = await getTaxConfigFromSettings();

        console.log("💰 Payment Calculation Debug:", {
            agreedAmount,
            currency,
            taxConfig,
            isInterState,
        });

        // Calculate payment breakdown
        // For influencer-to-vendor payments:
        // - Platform fee is NOT charged to influencer (will be deducted from vendor withdrawal later)
        // - Influencer pays: Service Charge + Tax only
        const paymentCalculation = calculatePayment(agreedAmount, currency, {
            taxConfig: taxConfig,
            platformFeeConfig: getDefaultPlatformFeeConfig(),
            isInterState: isInterState,
            applyTax: true,
            applyPlatformFee: true, // Calculate platform fee for record keeping, but don't add to total
        });
        
        console.log("💰 Payment Calculation Result:", {
            amount: paymentCalculation.amount,
            taxAmount: paymentCalculation.taxAmount,
            taxBreakdown: paymentCalculation.taxBreakdown,
            subtotal: paymentCalculation.subtotal,
            totalAmount: paymentCalculation.totalAmount,
            platformFee: paymentCalculation.platformFee,
        });
        
        // For influencer display: totalAmount = subtotal (amount + tax) without platform fee
        // Platform fee will be deducted from vendor's withdrawal amount later
        const influencerTotalAmount = paymentCalculation.subtotal; // Service Charge + Tax only
        
        console.log("💰 Influencer Total Amount (subtotal):", influencerTotalAmount);

        // Generate unique payment ID
        const timestamp = Date.now();
        const random = Math.floor(Math.random() * 10000).toString().padStart(4, "0");
        const paymentId = `PAY${timestamp}${random}`;

        // Create payment record
        // Note: totalAmount stored is what influencer pays (subtotal without platform fee)
        // Platform fee is stored separately and will be deducted from vendor withdrawal
        const payment = new Payment({
            paymentId: paymentId, // Generate paymentId before saving
            payerId: userId,
            payerType: "influencer",
            payeeId: deal.vendorId,
            payeeType: "vendor",
            paymentType: PaymentType.INFLUENCER_TO_VENDOR,
            dealId: dealId,
            amount: paymentCalculation.amount,
            currency: paymentCalculation.currency,
            taxAmount: paymentCalculation.taxAmount,
            taxPercentage: paymentCalculation.taxPercentage,
            taxBreakdown: paymentCalculation.taxBreakdown,
            platformFee: paymentCalculation.platformFee, // Stored for vendor withdrawal deduction
            platformFeePercentage: paymentCalculation.platformFeePercentage,
            subtotal: paymentCalculation.subtotal,
            totalAmount: influencerTotalAmount, // Influencer pays: Service Charge + Tax only
            paymentMethod: PaymentMethod.RAZORPAY,
            status: PaymentStatus.PENDING,
            description: `Payment for vendor service - Deal ${dealId}`,
            notes: `Payment for deal: ${dealId}`,
            metadata: {
                dealId: dealId,
                requirementId: deal.requirementId,
            },
        });

        await payment.save();

        // Create order with Razorpay
        let gatewayResponse;
        try {
            const gateway = PaymentGatewayFactory.createGateway(PaymentMethod.RAZORPAY);
            // Charge influencer: Service Charge + Tax only (platform fee not included)
            gatewayResponse = await gateway.createOrder(
                influencerTotalAmount,
                currency,
                payment.paymentId,
                `Payment for vendor service - Deal ${dealId}`,
                {
                    paymentId: payment.paymentId,
                    dealId: dealId,
                    requirementId: deal.requirementId || "",
                }
            );

            if (gatewayResponse.success && gatewayResponse.orderId) {
                payment.orderId = gatewayResponse.orderId;
                payment.transactionId = gatewayResponse.transactionId;
                payment.gatewayResponse = gatewayResponse.gatewayResponse;
                await payment.save();
            } else {
                payment.status = PaymentStatus.FAILED;
                payment.failureReason = gatewayResponse.error || "Gateway error";
                await payment.save();
                return errorResponse(res, gatewayResponse.error || "Failed to create payment order", 500);
            }
        } catch (gatewayError: any) {
            payment.status = PaymentStatus.FAILED;
            payment.failureReason = gatewayError.message;
            await payment.save();
            return errorResponse(res, `Payment gateway error: ${gatewayError.message}`, 500);
        }

        // Get Razorpay public key for frontend
        const razorpayService = await import("../services/razorpayService");
        const keyId = await razorpayService.default.getPublicKey();

        const responseData = {
            payment: {
                paymentId: payment.paymentId,
                orderId: payment.orderId,
                amount: Number(payment.amount), // Service charge (base amount) - ensure it's a number
                taxAmount: Number(payment.taxAmount), // Tax amount - ensure it's a number
                taxBreakdown: payment.taxBreakdown || {}, // CGST, SGST breakdown
                totalAmount: Number(payment.totalAmount), // Service Charge + Tax (no platform fee) - ensure it's a number
                currency: payment.currency,
                status: payment.status,
            },
            razorpay: {
                orderId: payment.orderId,
                keyId: keyId,
                amount: Number(payment.totalAmount), // Charge: Service Charge + Tax only (in rupees, frontend will convert to paise)
                currency: payment.currency,
            },
        };

        console.log("💰 Final Response Data:", JSON.stringify(responseData, null, 2));

        return successResponse(
            res,
            "Payment order created successfully",
            responseData,
            201
        );
    } catch (error: any) {
        console.error("Error creating payment from deal:", error);
        return errorResponse(res, `Failed to create payment: ${error.message}`, 500);
    }
};

// ---------------------------------------------------------
// ✅ GET DEAL PAYMENT AND INVOICE (with auto-verification)
// ---------------------------------------------------------
export const getDealPaymentAndInvoice = async (req: AuthenticatedRequest, res: Response) => {
    try {
        const userId = req.user?._id?.toString();
        const { dealId } = req.params;

        if (!userId) {
            return errorResponse(res, "User not authenticated", 401);
        }

        if (!dealId) {
            return errorResponse(res, "Deal ID is required", 400);
        }

        // The dealId can belong to either deal model depending on which flow the
        // frontend page came from (vendor deal vs. influencer deal) - try both.
        const vendorDeal = await VendorBrandDeal.findById(dealId);
        const influencerDeal = vendorDeal ? null : await InfluencerBrandDeal.findById(dealId);
        const deal = vendorDeal || influencerDeal;

        if (!deal) {
            return errorResponse(res, "Deal not found", 404);
        }

        // Verify user has access to this deal
        const hasAccess = vendorDeal
            ? (vendorDeal.brandId === userId || vendorDeal.vendorId === userId)
            : (influencerDeal!.brandId === userId || influencerDeal!.influencerId === userId);
        if (!hasAccess) {
            return errorResponse(res, "Unauthorized access to this deal", 403);
        }

        // Get the most recent payment for this deal, regardless of which
        // paymentType it was created under (brand_to_influencer, brand_to_vendor,
        // or influencer_to_vendor all use the same dealId field).
        let payment = await Payment.findOne({ dealId: dealId }).sort({ createdAt: -1 });

        // Auto-verify payment if it's pending and has orderId
        if (payment && payment.status === PaymentStatus.PENDING && payment.orderId && payment.paymentMethod === PaymentMethod.RAZORPAY) {
            try {
                console.log("🔄 Auto-verifying pending payment:", payment.paymentId);
                await autoVerifyPayment(payment);
                // Reload payment after verification
                payment = await Payment.findOne({ paymentId: payment.paymentId });
            } catch (verifyError: any) {
                console.error("Auto-verification error:", verifyError);
                // Continue with original payment data if verification fails
            }
        }

        let invoice = null;
        if (payment && payment.invoiceId) {
            invoice = await Invoice.findOne({ invoiceId: payment.invoiceId });
        }

        return successResponse(res, "Payment and invoice retrieved", {
            payment: payment
                ? {
                      paymentId: payment.paymentId,
                      orderId: payment.orderId,
                      transactionId: payment.transactionId,
                      amount: payment.amount,
                      totalAmount: payment.totalAmount,
                      currency: payment.currency,
                      status: payment.status,
                      paymentMethod: payment.paymentMethod,
                      paidAt: payment.paidAt,
                      createdAt: payment.createdAt,
                  }
                : null,
            invoice: invoice
                ? {
                      invoiceId: invoice.invoiceId,
                      invoiceNumber: invoice.invoiceNumber,
                      totalAmount: invoice.totalAmount,
                      currency: invoice.currency,
                      status: invoice.status,
                      pdfUrl: invoice.pdfUrl,
                      issueDate: invoice.issueDate,
                      dueDate: invoice.dueDate,
                      paidDate: invoice.paidDate,
                  }
                : null,
        });
    } catch (error: any) {
        console.error("Error getting deal payment and invoice:", error);
        return errorResponse(res, `Failed to get payment and invoice: ${error.message}`, 500);
    }
};

// ---------------------------------------------------------
// ✅ CHECK AND AUTO-VERIFY PAYMENT
// ---------------------------------------------------------
export const checkAndAutoVerifyPayment = async (req: AuthenticatedRequest, res: Response) => {
    try {
        const userId = req.user?._id?.toString();
        const { dealId } = req.body;

        if (!userId) {
            return errorResponse(res, "User not authenticated", 401);
        }

        if (!dealId) {
            return errorResponse(res, "Deal ID is required", 400);
        }

        // Get payment for this deal
        const payment = await Payment.findOne({
            dealId: dealId,
            paymentType: PaymentType.INFLUENCER_TO_VENDOR,
        });

        if (!payment) {
            return successResponse(res, "No payment found", {
                verified: false,
                message: "No payment found for this deal",
            });
        }

        // If payment is already completed, return success
        if (payment.status === PaymentStatus.COMPLETED) {
            return successResponse(res, "Payment already verified", {
                verified: true,
                paymentId: payment.paymentId,
                status: payment.status,
            });
        }

        // Auto-verify if payment is pending
        if (payment.status === PaymentStatus.PENDING && payment.orderId && payment.paymentMethod === PaymentMethod.RAZORPAY) {
            console.log("🔄 Attempting auto-verification for payment:", payment.paymentId);
            
            // First, try to verify using the order directly if we can get paymentId from Razorpay
            const wasVerified = await autoVerifyPayment(payment);
            
            if (wasVerified) {
                // Reload payment to get updated status
                const updatedPayment = await Payment.findOne({ paymentId: payment.paymentId });
                return successResponse(res, "Payment auto-verified successfully", {
                    verified: true,
                    paymentId: payment.paymentId,
                    status: updatedPayment?.status || PaymentStatus.COMPLETED,
                });
            } else {
                console.log("⚠️ Auto-verification failed, payment still pending");
            }
        }

        return successResponse(res, "Payment verification check completed", {
            verified: false,
            paymentId: payment.paymentId,
            status: payment.status,
        });
    } catch (error: any) {
        console.error("Error checking and auto-verifying payment:", error);
        return errorResponse(res, `Failed to check payment: ${error.message}`, 500);
    }
};

// ---------------------------------------------------------
// ✅ AUTO-VERIFY PAYMENT HELPER
// ---------------------------------------------------------
async function autoVerifyPayment(payment: any): Promise<boolean> {
    try {
        if (!payment.orderId || payment.paymentMethod !== PaymentMethod.RAZORPAY) {
            return false;
        }

        console.log("🔄 Auto-verifying payment:", {
            paymentId: payment.paymentId,
            orderId: payment.orderId,
            status: payment.status,
        });

        // Try multiple approaches to verify payment
        const razorpayService = await import("../services/razorpayService");
        let razorpayPayment;
        let razorpayPaymentId: string | null = null;

        // Approach 1: If we have transactionId stored, use it directly
        if (payment.transactionId) {
            console.log("🔍 Using stored transactionId:", payment.transactionId);
            try {
                razorpayPayment = await razorpayService.default.getPayment(payment.transactionId);
                razorpayPaymentId = payment.transactionId;
                console.log("✅ Found payment using transactionId, status:", razorpayPayment.status);
            } catch (error: any) {
                console.log("⚠️ Payment not found with transactionId, trying order lookup...");
            }
        }
        
        // Approach 1.5: Try to find payment by querying Razorpay with orderId and checking all payments
        // This helps when payment was just captured but not yet linked to order
        if (!razorpayPayment) {
            try {
                // Get order to see if it has any payments
                const orderDetails = await razorpayService.default.getOrder(payment.orderId);
                console.log("📋 Order details:", {
                    orderId: orderDetails.id,
                    status: orderDetails.status,
                    amount: orderDetails.amount,
                });
                
                // If order status is paid, try to get payments
                if (orderDetails.status === 'paid' || orderDetails.status === 'attempted') {
                    const payments = await razorpayService.default.getPaymentsByOrderId(payment.orderId);
                    console.log("📋 Found payments for order:", payments.length);
                    
                    if (payments && payments.length > 0) {
                        // Find captured payment
                        const captured = payments.find((p: any) => p.status === 'captured');
                        if (captured) {
                            razorpayPaymentId = captured.id;
                            razorpayPayment = captured;
                            console.log("✅ Found captured payment:", razorpayPaymentId);
                        }
                    }
                }
            } catch (error: any) {
                console.log("⚠️ Could not check order details:", error.message);
            }
        }

        // Approach 2: Get order details and check its status
        if (!razorpayPayment) {
            try {
                // First, try to get order details to see if it has payments
                const orderDetails = await razorpayService.default.getOrder(payment.orderId);
                console.log("📋 Order details from Razorpay:", {
                    orderId: orderDetails.id,
                    status: orderDetails.status,
                    amount: orderDetails.amount,
                });

                // Try to get payments by order ID
                const payments = await razorpayService.default.getPaymentsByOrderId(payment.orderId);
                console.log("📋 Fetched payments from Razorpay:", payments.length, "payments found");
                
                if (payments && payments.length > 0) {
                    // Find the first captured payment
                    const capturedPayment = payments.find((p: any) => p.status === "captured");
                    
                    if (capturedPayment) {
                        razorpayPaymentId = capturedPayment.id;
                        razorpayPayment = capturedPayment;
                        console.log("✅ Found captured payment in Razorpay:", razorpayPaymentId);
                    } else {
                        console.log("⚠️ No captured payment found. Payment statuses:", payments.map((p: any) => p.status));
                        // Try to get the first payment anyway to check its status
                        if (payments[0] && payments[0].id) {
                            const firstPaymentId = payments[0].id;
                            razorpayPaymentId = firstPaymentId;
                            razorpayPayment = await razorpayService.default.getPayment(firstPaymentId);
                            console.log("📋 Checking first payment status:", razorpayPayment.status);
                        }
                    }
                } else {
                    console.log("⚠️ No payments found in Razorpay order yet. Order status:", orderDetails.status);
                    // If order is paid but no payments found, it might be a timing issue
                    // Return false to retry later
                    return false;
                }
            } catch (paymentError: any) {
                console.error("❌ Failed to fetch Razorpay payments:", paymentError.message);
                return false;
            }
        }

        if (!razorpayPayment || !razorpayPaymentId) {
            console.log("⚠️ Could not find payment in Razorpay");
            return false;
        }

        // Get full payment details from Razorpay if not already fetched
        if (!razorpayPayment.id || razorpayPayment.id !== razorpayPaymentId) {
            try {
                razorpayPayment = await razorpayService.default.getPayment(razorpayPaymentId);
            } catch (paymentError: any) {
                console.error("❌ Failed to fetch Razorpay payment details:", paymentError);
                return false;
            }
        }
        
        // If payment is authorized, capture it first
        if (razorpayPayment.status === "authorized") {
            console.log("🔄 Payment is authorized, capturing it...");
            try {
                razorpayPayment = await razorpayService.default.capturePayment(razorpayPaymentId, razorpayPayment.amount);
                razorpayPaymentId = razorpayPayment.id;
                console.log("✅ Payment captured successfully, new status:", razorpayPayment.status);
            } catch (captureError: any) {
                console.error("❌ Failed to capture payment:", captureError);
                // Continue with authorized status - treat as successful
                console.log("⚠️ Treating authorized payment as successful");
            }
        }

        if (razorpayPayment.status === "captured" || razorpayPayment.status === "authorized") {
            console.log("✅✅✅ Payment is captured/authorized in Razorpay, updating database...");
            console.log("📝 Payment details:", {
                ourPaymentId: payment.paymentId,
                razorpayPaymentId: razorpayPaymentId,
                amount: razorpayPayment.amount,
                status: razorpayPayment.status,
                dealId: payment.dealId,
            });
            
            // Payment is successful, update our database
            payment.status = PaymentStatus.COMPLETED;
            payment.transactionId = razorpayPaymentId;
            payment.paidAt = new Date(razorpayPayment.created_at * 1000); // Convert Unix timestamp to Date
            payment.gatewayResponse = razorpayPayment;
            await payment.save();
            console.log("✅✅✅ Payment status updated to COMPLETED:", payment.paymentId);

            // Create transactions
            await createTransactions(payment);

            // Generate invoice
            const invoice = await generateInvoiceForPayment(payment.paymentId);
            
            if (invoice) {
                await generateInvoicePDF(invoice.invoiceId);
                await markDealAsPaidIfApplicable(payment);
            }

            console.log("✅ Payment auto-verified successfully:", payment.paymentId);
            return true;
        }

        console.log("⚠️ Payment not captured yet. Status:", razorpayPayment.status);
        return false;
    } catch (error: any) {
        console.error("❌ Error in auto-verify payment:", error);
        return false;
    }
}

// ---------------------------------------------------------
// ✅ HELPER FUNCTIONS
// ---------------------------------------------------------

/**
 * Create transactions for completed payment
 */
async function createTransactions(payment: any): Promise<void> {
    try {
        // Debit transaction for payer
        const debitTransaction = new Transaction({
            paymentId: payment.paymentId,
            userId: payment.payerId,
            userType: payment.payerType,
            type: TransactionType.DEBIT,
            amount: payment.totalAmount,
            currency: payment.currency,
            balanceBefore: 0, // TODO: Get actual balance from user account
            balanceAfter: 0, // TODO: Calculate new balance
            paymentMethod: payment.paymentMethod,
            status: PaymentStatus.COMPLETED,
            description: `Payment to ${payment.payeeType}`,
            processedAt: new Date(),
        });
        await debitTransaction.save();

        // Credit transaction for payee
        const creditTransaction = new Transaction({
            paymentId: payment.paymentId,
            userId: payment.payeeId,
            userType: payment.payeeType,
            type: TransactionType.CREDIT,
            amount: payment.amount, // Payee receives base amount (platform fee deducted)
            currency: payment.currency,
            balanceBefore: 0, // TODO: Get actual balance
            balanceAfter: 0, // TODO: Calculate new balance
            paymentMethod: payment.paymentMethod,
            status: PaymentStatus.COMPLETED,
            description: `Payment from ${payment.payerType}`,
            processedAt: new Date(),
        });
        await creditTransaction.save();
    } catch (error) {
        console.error("Error creating transactions:", error);
    }
}

/**
 * Create refund transaction
 */
async function createRefundTransaction(payment: any, refundAmount: number): Promise<void> {
    try {
        // Credit transaction for payer (refund)
        const refundTransaction = new Transaction({
            paymentId: payment.paymentId,
            userId: payment.payerId,
            userType: payment.payerType,
            type: TransactionType.REFUND,
            amount: refundAmount,
            currency: payment.currency,
            balanceBefore: 0,
            balanceAfter: 0,
            paymentMethod: payment.paymentMethod,
            status: PaymentStatus.REFUNDED,
            description: `Refund for payment ${payment.paymentId}`,
            processedAt: new Date(),
        });
        await refundTransaction.save();
    } catch (error) {
        console.error("Error creating refund transaction:", error);
    }
}

