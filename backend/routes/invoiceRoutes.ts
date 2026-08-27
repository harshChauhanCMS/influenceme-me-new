import express from "express";
import {
    getUserInvoices,
    getInvoiceDetails,
    generateInvoice,
    downloadInvoicePDF,
} from "../controllers/invoiceController";
import { authenticate } from "../middleware/auth";

const router = express.Router();

// All routes require authentication
router.use(authenticate);

// Get user invoices
router.get("/user", getUserInvoices);

// Get invoice details
router.get("/:invoiceId", getInvoiceDetails);

// Generate invoice for payment
router.post("/generate", generateInvoice);

// Download invoice PDF
router.get("/:invoiceId/pdf", downloadInvoicePDF);

export default router;

