import Invoice, { IInvoice, InvoiceStatus } from "../models/invoice";
import Payment from "../models/payment";
import User from "../models/user";
import { Currency } from "../models/payment";
import PDFDocument from "pdfkit";
import { fileStorageService } from "./fileStorageService";

/**
 * Generate invoice for a payment
 */
export async function generateInvoiceForPayment(paymentId: string): Promise<IInvoice | null> {
    try {
        const payment = await Payment.findOne({ paymentId });

        if (!payment) {
            throw new Error("Payment not found");
        }

        // Check if invoice already exists
        const existingInvoice = await Invoice.findOne({ paymentId });
        if (existingInvoice) {
            return existingInvoice;
        }

        // Get payer and payee details
        const payer = await User.findById(payment.payerId);
        const payee = await User.findById(payment.payeeId);

        if (!payer || !payee) {
            throw new Error("Payer or payee not found");
        }

        // Prepare invoice items
        const items = [
            {
                description: `Payment for ${payment.paymentType.replace(/_/g, " ")}`,
                quantity: 1,
                unitPrice: payment.amount,
                total: payment.amount,
                taxRate: payment.taxPercentage,
                taxAmount: payment.taxAmount,
            },
        ];

        // Add platform fee as separate item if applicable
        if (payment.platformFee > 0) {
            items.push({
                description: "Platform Service Fee",
                quantity: 1,
                unitPrice: payment.platformFee,
                total: payment.platformFee,
                taxRate: 0,
                taxAmount: 0,
            });
        }

        // Calculate dates
        const issueDate = new Date();
        const dueDate = new Date(issueDate);
        dueDate.setDate(dueDate.getDate() + 30); // 30 days payment terms

        // Get billing address from payer
        const billingAddress = payer.addresses
            ? {
                  name: payer.businessInfo?.businessName || payer.name || "N/A",
                  address: payer.addresses.streetAddress || "",
                  city: payer.addresses.city || "",
                  state: payer.addresses.state || "",
                  country: payer.addresses.country || "India",
                  zipCode: payer.addresses.pinCode || "",
                  taxId: "", // GST/VAT number can be added to businessInfo schema if needed
              }
            : undefined;

        // Create invoice
        const invoice = new Invoice({
            issuerId: "platform", // Platform issues invoice
            issuerType: "platform",
            recipientId: payment.payerId,
            recipientType: payment.payerType,
            paymentId: payment.paymentId,
            dealId: payment.dealId,
            campaignId: payment.campaignId,
            items,
            subtotal: payment.subtotal,
            taxAmount: payment.taxAmount,
            taxPercentage: payment.taxPercentage,
            platformFee: payment.platformFee,
            totalAmount: payment.totalAmount,
            currency: payment.currency,
            issueDate,
            dueDate,
            status: payment.status === "completed" ? InvoiceStatus.PAID : InvoiceStatus.PENDING,
            billingAddress,
            paymentTerms: "Net 30",
            notes: payment.description,
        });

        await invoice.save();

        // Link invoice to payment
        payment.invoiceId = invoice.invoiceId;
        await payment.save();

        return invoice;
    } catch (error) {
        console.error("Error generating invoice:", error);
        return null;
    }
}

/**
 * Generate PDF for invoice using pdfkit
 */
export async function generateInvoicePDF(invoiceId: string): Promise<string | null> {
    return new Promise(async (resolve, reject) => {
    try {
            const invoice = await Invoice.findOne({ invoiceId }).populate('recipientId', 'name email phone addresses businessInfo').populate('issuerId', 'name email');

        if (!invoice) {
                reject(new Error("Invoice not found"));
                return;
            }

            // Get payer and payee details
            const payer = await User.findById(invoice.recipientId);
            const payee = invoice.paymentId 
                ? await Payment.findOne({ paymentId: invoice.paymentId }).then(async (payment) => {
                    if (payment) {
                        return await User.findById(payment.payeeId);
                    }
                    return null;
                })
                : null;

            // Create PDF document
            const doc = new PDFDocument({
                size: "A4",
                margins: { top: 50, bottom: 50, left: 50, right: 50 },
            });

            // Create a buffer to store PDF
            const chunks: Buffer[] = [];
            doc.on("data", (chunk) => chunks.push(chunk));
            doc.on("end", async () => {
                try {
                    const pdfBuffer = Buffer.concat(chunks);
                    
                    // Upload PDF to file storage
                    const fileName = `invoice_${invoiceId}_${Date.now()}.pdf`;
                    const fileUrl = await fileStorageService.uploadFile(
                        {
                            buffer: pdfBuffer,
                            originalname: fileName,
                            mimetype: "application/pdf",
                        },
                        "invoices"
                    );

                    invoice.pdfUrl = fileUrl;
        await invoice.save();

                    resolve(fileUrl);
                } catch (error: any) {
                    reject(new Error(`Failed to upload invoice PDF: ${error.message}`));
                }
            });
            doc.on("error", (error) => reject(error));

            // PDF Content
            // Header
            doc.fontSize(24).font("Helvetica-Bold").text("INVOICE", { align: "center" });
            doc.moveDown();

            // Invoice Number and Date
            doc.fontSize(10).font("Helvetica");
            doc.text(`Invoice Number: ${invoice.invoiceNumber}`, { align: "right" });
            doc.text(`Invoice ID: ${invoice.invoiceId}`, { align: "right" });
            doc.text(`Issue Date: ${new Date(invoice.issueDate).toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" })}`, { align: "right" });
            if (invoice.dueDate) {
                doc.text(`Due Date: ${new Date(invoice.dueDate).toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" })}`, { align: "right" });
            }
            doc.moveDown(2);

            // From (Platform)
            doc.fontSize(12).font("Helvetica-Bold").text("FROM:", { underline: true });
            doc.fontSize(10).font("Helvetica");
            doc.text("Influence-Me Platform");
            doc.text("Service Provider");
            doc.moveDown();

            // To (Payer)
            doc.fontSize(12).font("Helvetica-Bold").text("BILL TO:", { underline: true });
            doc.fontSize(10).font("Helvetica");
            if (payer) {
                doc.text(payer.businessInfo?.businessName || payer.name || "N/A");
                if (payer.addresses) {
                    if (payer.addresses.streetAddress) doc.text(payer.addresses.streetAddress);
                    const addressParts = [
                        payer.addresses.city,
                        payer.addresses.state,
                        payer.addresses.pinCode,
                    ].filter(Boolean);
                    if (addressParts.length > 0) doc.text(addressParts.join(", "));
                    if (payer.addresses.country) doc.text(payer.addresses.country);
                }
                if (payer.email) doc.text(`Email: ${payer.email}`);
                if (payer.phone) doc.text(`Phone: ${payer.phone}`);
            }
            doc.moveDown();

            // Service Provider (Payee)
            if (payee) {
                doc.fontSize(12).font("Helvetica-Bold").text("SERVICE PROVIDER:", { underline: true });
                doc.fontSize(10).font("Helvetica");
                doc.text(payee.businessInfo?.businessName || payee.name || "N/A");
                if (payee.addresses) {
                    if (payee.addresses.streetAddress) doc.text(payee.addresses.streetAddress);
                    const addressParts = [
                        payee.addresses.city,
                        payee.addresses.state,
                        payee.addresses.pinCode,
                    ].filter(Boolean);
                    if (addressParts.length > 0) doc.text(addressParts.join(", "));
                    if (payee.addresses.country) doc.text(payee.addresses.country);
                }
                if (payee.email) doc.text(`Email: ${payee.email}`);
                if (payee.phone) doc.text(`Phone: ${payee.phone}`);
                doc.moveDown(2);
            }

            // Items Table
            doc.fontSize(12).font("Helvetica-Bold").text("ITEMS:", { underline: true });
            doc.moveDown(0.5);

            // Table Header
            const tableTop = doc.y;
            doc.fontSize(10).font("Helvetica-Bold");
            doc.text("Description", 50, tableTop);
            doc.text("Qty", 350, tableTop);
            doc.text("Unit Price", 400, tableTop, { width: 80, align: "right" });
            doc.text("Total", 500, tableTop, { width: 50, align: "right" });

            // Table Rows
            let currentY = tableTop + 20;
            doc.fontSize(10).font("Helvetica");
            invoice.items.forEach((item) => {
                doc.text(item.description, 50, currentY, { width: 280 });
                doc.text(item.quantity.toString(), 350, currentY);
                doc.text(`${invoice.currency} ${item.unitPrice.toFixed(2)}`, 400, currentY, { width: 80, align: "right" });
                doc.text(`${invoice.currency} ${item.total.toFixed(2)}`, 500, currentY, { width: 50, align: "right" });
                currentY += 20;
            });

            // Totals
            currentY += 10;
            doc.fontSize(10).font("Helvetica");
            doc.text("Subtotal:", 400, currentY, { width: 80, align: "right" });
            doc.text(`${invoice.currency} ${invoice.subtotal.toFixed(2)}`, 500, currentY, { width: 50, align: "right" });
            currentY += 20;

            if (invoice.taxAmount > 0) {
                doc.text(`Tax (${invoice.taxPercentage}%):`, 400, currentY, { width: 80, align: "right" });
                doc.text(`${invoice.currency} ${invoice.taxAmount.toFixed(2)}`, 500, currentY, { width: 50, align: "right" });
                currentY += 20;
            }

            if (invoice.platformFee && invoice.platformFee > 0) {
                doc.text("Platform Fee:", 400, currentY, { width: 80, align: "right" });
                doc.text(`${invoice.currency} ${invoice.platformFee.toFixed(2)}`, 500, currentY, { width: 50, align: "right" });
                currentY += 20;
            }

            if (invoice.discount && invoice.discount > 0) {
                doc.text("Discount:", 400, currentY, { width: 80, align: "right" });
                doc.text(`-${invoice.currency} ${invoice.discount.toFixed(2)}`, 500, currentY, { width: 50, align: "right" });
                currentY += 20;
            }

            // Total
            currentY += 10;
            doc.fontSize(12).font("Helvetica-Bold");
            doc.text("TOTAL:", 400, currentY, { width: 80, align: "right" });
            doc.text(`${invoice.currency} ${invoice.totalAmount.toFixed(2)}`, 500, currentY, { width: 50, align: "right" });

            // Payment Terms and Notes
            currentY += 40;
            if (invoice.paymentTerms) {
                doc.fontSize(10).font("Helvetica-Bold").text("Payment Terms:", 50, currentY);
                doc.fontSize(10).font("Helvetica").text(invoice.paymentTerms, 50, currentY + 15);
                currentY += 35;
            }

            if (invoice.notes) {
                doc.fontSize(10).font("Helvetica-Bold").text("Notes:", 50, currentY);
                doc.fontSize(10).font("Helvetica").text(invoice.notes, 50, currentY + 15, { width: 500 });
                currentY += 35;
            }

            // Status
            doc.fontSize(10).font("Helvetica-Bold");
            const statusText = invoice.status.toUpperCase();
            const statusColor = invoice.status === InvoiceStatus.PAID ? '#008000' : '#CC6600';
            doc.fillColor(statusColor);
            doc.text(`Status: ${statusText}`, 50, currentY);
            doc.fillColor('#000000'); // Reset to black

            // Footer
            doc.fontSize(8).font("Helvetica");
            doc.text("This is a computer-generated invoice. No signature required.", 50, doc.page.height - 50, { align: "center" });

            // Finalize PDF
            doc.end();
        } catch (error: any) {
            reject(error);
        }
    });
}

/**
 * Mark invoice as paid
 */
export async function markInvoiceAsPaid(invoiceId: string, paymentId: string): Promise<IInvoice | null> {
    try {
        const invoice = await Invoice.findOne({ invoiceId });

        if (!invoice) {
            throw new Error("Invoice not found");
        }

        invoice.status = InvoiceStatus.PAID;
        invoice.paidDate = new Date();
        invoice.paymentId = paymentId;

        await invoice.save();

        return invoice;
    } catch (error) {
        console.error("Error marking invoice as paid:", error);
        return null;
    }
}

