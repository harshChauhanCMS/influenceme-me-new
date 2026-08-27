import express from "express";
import crypto from "crypto";
import Payment from "../models/payment";
import { PaymentGatewayFactory } from "../services/paymentGatewayService";
import { generateInvoiceForPayment } from "../services/invoiceService";
import Transaction, { TransactionType } from "../models/transaction";
import { PaymentStatus } from "../models/payment";
import { markDealAsPaidIfApplicable } from "../controllers/paymentController";

const router = express.Router();

function verifyRazorpayWebhookSignature(req: express.Request): boolean {
    const secret = process.env.RAZORPAY_WEBHOOK_SECRET;
    const signature = req.headers["x-razorpay-signature"] as string | undefined;
    const rawBody = (req as any).rawBody as Buffer | undefined;

    if (!secret) {
        console.error("❌ RAZORPAY_WEBHOOK_SECRET is not configured; rejecting webhook");
        return false;
    }
    if (!signature || !rawBody) {
        return false;
    }

    const expectedSignature = crypto.createHmac("sha256", secret).update(rawBody).digest("hex");

    try {
        return crypto.timingSafeEqual(Buffer.from(expectedSignature), Buffer.from(signature));
    } catch {
        // Buffers of different length -> definitely not equal
        return false;
    }
}

// Razorpay webhook handler
router.post("/razorpay", async (req, res) => {
    try {
        if (!verifyRazorpayWebhookSignature(req)) {
            console.error("❌ Invalid Razorpay webhook signature");
            return res.status(400).json({ error: "Invalid signature" });
        }

        const { event, payload } = req.body;

        if (event === "payment.captured") {
            console.log("🎉🎉🎉 RAZORPAY WEBHOOK: payment.captured event received!");
            const paymentId = payload.payment.entity.id;
            const orderId = payload.payment.entity.order_id;
            
            console.log("📋 Webhook payment details:", {
                paymentId,
                orderId,
                amount: payload.payment.entity.amount,
                status: payload.payment.entity.status,
            });

            // Find payment by orderId
            const payment = await Payment.findOne({ orderId });

            if (!payment) {
                console.error("❌ Payment not found for orderId:", orderId);
                return res.status(404).json({ error: "Payment not found" });
            }

            console.log("✅ Found payment in database:", payment.paymentId);
            console.log("📝 Current payment status:", payment.status);

            // Update payment status
            payment.status = PaymentStatus.COMPLETED;
            payment.transactionId = paymentId;
            payment.paidAt = new Date();
            payment.gatewayResponse = payload.payment.entity;
            await payment.save();

            console.log("✅✅✅ Payment status updated to COMPLETED via webhook:", payment.paymentId);

            // Create transactions
            await createTransactions(payment);

            // Generate invoice
            const invoice = await generateInvoiceForPayment(payment.paymentId);
            
            if (invoice) {
                const { generateInvoicePDF } = await import("../services/invoiceService");
                await generateInvoicePDF(invoice.invoiceId);

                // Update deal payment status (applies to brand_to_vendor and influencer_to_vendor)
                await markDealAsPaidIfApplicable(payment);
            }
        }

        res.status(200).json({ received: true });
    } catch (error: any) {
        console.error("Razorpay webhook error:", error);
        res.status(500).json({ error: error.message });
    }
});

// Stripe webhook handler
router.post("/stripe", async (req, res) => {
    try {
        const event = req.body;

        // Verify webhook signature (implement signature verification)
        // const signature = req.headers["stripe-signature"];
        // if (!verifyStripeSignature(req.body, signature)) {
        //     return res.status(400).json({ error: "Invalid signature" });
        // }

        if (event.type === "payment_intent.succeeded") {
            const paymentIntent = event.data.object;
            const paymentId = paymentIntent.metadata?.paymentId;

            if (!paymentId) {
                console.error("Payment ID not found in metadata");
                return res.status(400).json({ error: "Payment ID not found" });
            }

            const payment = await Payment.findOne({ paymentId });

            if (!payment) {
                console.error("Payment not found:", paymentId);
                return res.status(404).json({ error: "Payment not found" });
            }

            // Update payment status
            payment.status = PaymentStatus.COMPLETED;
            payment.transactionId = paymentIntent.id;
            payment.paidAt = new Date();
            payment.gatewayResponse = paymentIntent;
            await payment.save();

            // Create transactions
            await createTransactions(payment);

            // Generate invoice
            await generateInvoiceForPayment(payment.paymentId);
        }

        res.status(200).json({ received: true });
    } catch (error: any) {
        console.error("Stripe webhook error:", error);
        res.status(500).json({ error: error.message });
    }
});

// Helper function to create transactions
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
            balanceBefore: 0,
            balanceAfter: 0,
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
            amount: payment.amount,
            currency: payment.currency,
            balanceBefore: 0,
            balanceAfter: 0,
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

export default router;

