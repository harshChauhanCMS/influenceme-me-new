import express from "express";
import {
    createPayment,
    verifyPayment,
    getPaymentStatus,
    getUserPayments,
    refundPayment,
    createPaymentFromDeal,
    getDealPaymentAndInvoice,
    checkAndAutoVerifyPayment,
} from "../controllers/paymentController";
import {
    createRazorpayOrder,
    verifyRazorpayPayment,
    verifyPaymentByPaymentId,
    getRazorpayPayment,
    refundRazorpayPayment,
} from "../controllers/razorpayController";
import { authenticate } from "../middleware/auth";

const router = express.Router();

// All routes require authentication
router.use(authenticate);

// Create payment order
router.post("/create", createPayment);

// Verify payment (webhook/callback)
router.post("/verify", verifyPayment);

// Get payment status
router.get("/status/:paymentId", getPaymentStatus);

// Get user payments
router.get("/user", getUserPayments);

// Refund payment
router.post("/refund", refundPayment);

// Razorpay specific routes
router.post("/razorpay/create-order", createRazorpayOrder);
router.post("/razorpay/verify", verifyRazorpayPayment);
router.post("/razorpay/verify-by-payment-id", verifyPaymentByPaymentId);
router.get("/razorpay/:paymentId", getRazorpayPayment);
router.post("/razorpay/:paymentId/refund", refundRazorpayPayment);

// Deal-specific payment routes
router.post("/deal/create", createPaymentFromDeal);
router.get("/deal/:dealId", getDealPaymentAndInvoice);
router.post("/deal/check-and-verify", checkAndAutoVerifyPayment);

export default router;

