import { Response } from "express";
import { successResponse, errorResponse } from "../utils/responseHelper";
import { AuthenticatedRequest } from "../middleware/auth";
import Invoice from "../models/invoice";
import Payment from "../models/payment";
import {
    generateInvoiceForPayment,
    generateInvoicePDF,
    markInvoiceAsPaid,
} from "../services/invoiceService";

// ---------------------------------------------------------
// ✅ GET USER INVOICES
// ---------------------------------------------------------
export const getUserInvoices = async (req: AuthenticatedRequest, res: Response) => {
    try {
        const userId = req.user?._id?.toString();
        const { page = "1", limit = "20", status } = req.query;

        if (!userId) {
            return errorResponse(res, "User not authenticated", 401);
        }

        const query: Record<string, any> = {
            recipientId: userId,
        };

        if (status) query.status = status;

        const skip = (parseInt(page as string) - 1) * parseInt(limit as string);

        const invoices = await Invoice.find(query)
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(parseInt(limit as string));

        const total = await Invoice.countDocuments(query);

        return successResponse(
            res,
            "Invoices retrieved successfully",
            {
                invoices,
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
        console.error("Error getting user invoices:", error);
        return errorResponse(res, `Failed to get invoices: ${error.message}`, 500);
    }
};

// ---------------------------------------------------------
// ✅ GET INVOICE DETAILS
// ---------------------------------------------------------
export const getInvoiceDetails = async (req: AuthenticatedRequest, res: Response) => {
    try {
        const { invoiceId } = req.params;
        const userId = req.user?._id?.toString();

        if (!userId) {
            return errorResponse(res, "User not authenticated", 401);
        }

        const invoice = await Invoice.findOne({
            invoiceId,
            recipientId: userId,
        });

        if (!invoice) {
            return errorResponse(res, "Invoice not found", 404);
        }

        return successResponse(res, "Invoice retrieved successfully", { invoice });
    } catch (error: any) {
        console.error("Error getting invoice details:", error);
        return errorResponse(res, `Failed to get invoice details: ${error.message}`, 500);
    }
};

// ---------------------------------------------------------
// ✅ GENERATE INVOICE FOR PAYMENT
// ---------------------------------------------------------
export const generateInvoice = async (req: AuthenticatedRequest, res: Response) => {
    try {
        const { paymentId } = req.body;
        const userId = req.user?._id?.toString();

        if (!userId) {
            return errorResponse(res, "User not authenticated", 401);
        }

        // Verify payment belongs to user
        const payment = await Payment.findOne({
            paymentId,
            $or: [{ payerId: userId }, { payeeId: userId }],
        });

        if (!payment) {
            return errorResponse(res, "Payment not found", 404);
        }

        const invoice = await generateInvoiceForPayment(paymentId);

        if (!invoice) {
            return errorResponse(res, "Failed to generate invoice", 500);
        }

        return successResponse(res, "Invoice generated successfully", { invoice });
    } catch (error: any) {
        console.error("Error generating invoice:", error);
        return errorResponse(res, `Failed to generate invoice: ${error.message}`, 500);
    }
};

// ---------------------------------------------------------
// ✅ DOWNLOAD INVOICE PDF
// ---------------------------------------------------------
export const downloadInvoicePDF = async (req: AuthenticatedRequest, res: Response) => {
    try {
        const { invoiceId } = req.params;
        const userId = req.user?._id?.toString();

        if (!userId) {
            return errorResponse(res, "User not authenticated", 401);
        }

        const invoice = await Invoice.findOne({
            invoiceId,
            recipientId: userId,
        });

        if (!invoice) {
            return errorResponse(res, "Invoice not found", 404);
        }

        // Generate PDF if not exists
        let pdfUrl: string | null | undefined = invoice.pdfUrl;
        if (!pdfUrl) {
            pdfUrl = await generateInvoicePDF(String(invoiceId));
            if (!pdfUrl) {
                return errorResponse(res, "Failed to generate PDF", 500);
            }
        }

        return successResponse(res, "Invoice PDF URL", {
            pdfUrl,
            invoiceId: invoice.invoiceId,
        });
    } catch (error: any) {
        console.error("Error downloading invoice PDF:", error);
        return errorResponse(res, `Failed to download invoice PDF: ${error.message}`, 500);
    }
};

