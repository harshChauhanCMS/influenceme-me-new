import PDFDocument from "pdfkit";
import InfluencerBrandDeal from "../models/influencerBrandDeal";
import VendorBrandDeal from "../models/vendorBrandDeal";
import {
  isFirebaseStorageConfigured,
  uploadBufferToFirebase,
} from "../config/firebaseStorage";

/** Firebase Storage folder for generated agreement PDFs (separate from general file-uploads). */
const FIREBASE_AGREEMENTS_FOLDER = "influenceme/agreements";

interface PartyDetails {
  name: string;
  email: string;
  phone?: string;
  address?: string;
  businessName?: string;
}

interface DealDetails {
  dealId: string;
  dealType: "influencer-brand" | "vendor-brand";
  amount: number;
  deadline: Date;
  requirements: string[];
  deliverables: string[];
  brandDetails: PartyDetails;
  influencerDetails?: PartyDetails;
  vendorDetails?: PartyDetails;
}

/**
 * Generate Agreement PDF with dummy content and party details
 */
export async function generateAgreementPDF(
  dealDetails: DealDetails,
): Promise<string> {
  return new Promise(async (resolve, reject) => {
    try {
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
          const fileName = `agreement_${dealDetails.dealId}_${Date.now()}.pdf`;

          if (!isFirebaseStorageConfigured()) {
            return reject(
              new Error(
                "Firebase Storage is not configured. Set FIREBASE_PROJECT_ID and GOOGLE_APPLICATION_CREDENTIALS (or Firebase credentials) to generate agreements.",
              ),
            );
          }

          const result = await uploadBufferToFirebase(
            pdfBuffer,
            "application/pdf",
            FIREBASE_AGREEMENTS_FOLDER,
            fileName,
          );
          resolve(result.url);
        } catch (error: any) {
          reject(new Error(`Failed to upload agreement PDF: ${error.message}`));
        }
      });
      doc.on("error", (error) => reject(error));

      // PDF Content
      const {
        brandDetails,
        influencerDetails,
        vendorDetails,
        amount,
        deadline,
        requirements,
        deliverables,
      } = dealDetails;

      // Header
      doc
        .fontSize(20)
        .font("Helvetica-Bold")
        .text("COLLABORATION AGREEMENT", { align: "center" });
      doc.moveDown();

      // Agreement Date
      doc
        .fontSize(10)
        .font("Helvetica")
        .text(
          `Date: ${new Date().toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" })}`,
          { align: "right" },
        );
      doc.moveDown(2);

      // Parties Section
      doc
        .fontSize(14)
        .font("Helvetica-Bold")
        .text("PARTIES", { underline: true });
      doc.moveDown();

      // Brand Details
      doc.fontSize(12).font("Helvetica-Bold").text("PARTY 1 - BRAND:");
      doc.fontSize(10).font("Helvetica");
      doc.text(`Name: ${brandDetails.name}`);
      if (brandDetails.businessName) {
        doc.text(`Business Name: ${brandDetails.businessName}`);
      }
      doc.text(`Email: ${brandDetails.email}`);
      if (brandDetails.phone) {
        doc.text(`Phone: ${brandDetails.phone}`);
      }
      if (brandDetails.address) {
        doc.text(`Address: ${brandDetails.address}`);
      }
      doc.moveDown();

      // Influencer/Vendor Details
      if (influencerDetails) {
        doc.fontSize(12).font("Helvetica-Bold").text("PARTY 2 - INFLUENCER:");
        doc.fontSize(10).font("Helvetica");
        doc.text(`Name: ${influencerDetails.name}`);
        doc.text(`Email: ${influencerDetails.email}`);
        if (influencerDetails.phone) {
          doc.text(`Phone: ${influencerDetails.phone}`);
        }
        if (influencerDetails.address) {
          doc.text(`Address: ${influencerDetails.address}`);
        }
      } else if (vendorDetails) {
        doc.fontSize(12).font("Helvetica-Bold").text("PARTY 2 - VENDOR:");
        doc.fontSize(10).font("Helvetica");
        doc.text(`Name: ${vendorDetails.name}`);
        if (vendorDetails.businessName) {
          doc.text(`Business Name: ${vendorDetails.businessName}`);
        }
        doc.text(`Email: ${vendorDetails.email}`);
        if (vendorDetails.phone) {
          doc.text(`Phone: ${vendorDetails.phone}`);
        }
        if (vendorDetails.address) {
          doc.text(`Address: ${vendorDetails.address}`);
        }
      }
      doc.moveDown(2);

      // Terms Section
      doc
        .fontSize(14)
        .font("Helvetica-Bold")
        .text("TERMS AND CONDITIONS", { underline: true });
      doc.moveDown();

      // Dummy Content
      doc.fontSize(11).font("Helvetica");
      doc.text(
        'This Collaboration Agreement ("Agreement") is entered into between the parties mentioned above.',
        { align: "justify" },
      );
      doc.moveDown();

      doc.fontSize(12).font("Helvetica-Bold").text("1. SCOPE OF WORK");
      doc.fontSize(11).font("Helvetica");
      doc.text(
        "The parties agree to collaborate on the following deliverables:",
        { align: "justify" },
      );
      doc.moveDown(0.5);
      deliverables.forEach((deliverable, index) => {
        doc.text(`${index + 1}. ${deliverable}`, { indent: 20 });
      });
      doc.moveDown();

      doc.fontSize(12).font("Helvetica-Bold").text("2. REQUIREMENTS");
      doc.fontSize(11).font("Helvetica");
      requirements.forEach((requirement, index) => {
        doc.text(`${index + 1}. ${requirement}`, { indent: 20 });
      });
      doc.moveDown();

      doc.fontSize(12).font("Helvetica-Bold").text("3. COMPENSATION");
      doc.fontSize(11).font("Helvetica");
      doc.text(
        `The total compensation for this collaboration is ₹${amount.toLocaleString("en-IN")}.`,
        { align: "justify" },
      );
      doc.text(
        "Payment terms and schedule will be as agreed upon by both parties.",
        { align: "justify" },
      );
      doc.moveDown();

      doc.fontSize(12).font("Helvetica-Bold").text("4. DEADLINE");
      doc.fontSize(11).font("Helvetica");
      doc.text(
        `All deliverables must be completed by ${deadline.toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" })}.`,
        { align: "justify" },
      );
      doc.moveDown();

      doc.fontSize(12).font("Helvetica-Bold").text("5. INTELLECTUAL PROPERTY");
      doc.fontSize(11).font("Helvetica");
      doc.text(
        "All content created as part of this collaboration shall remain the property of the Brand, subject to the Influencer/Vendor's right to use such content for portfolio purposes.",
        { align: "justify" },
      );
      doc.moveDown();

      doc.fontSize(12).font("Helvetica-Bold").text("6. CONFIDENTIALITY");
      doc.fontSize(11).font("Helvetica");
      doc.text(
        "Both parties agree to maintain confidentiality regarding the terms of this Agreement and any proprietary information shared during the collaboration.",
        { align: "justify" },
      );
      doc.moveDown();

      doc.fontSize(12).font("Helvetica-Bold").text("7. TERMINATION");
      doc.fontSize(11).font("Helvetica");
      doc.text(
        "Either party may terminate this Agreement with written notice. In case of termination, compensation for completed work shall be paid as agreed.",
        { align: "justify" },
      );
      doc.moveDown();

      doc.fontSize(12).font("Helvetica-Bold").text("8. GOVERNING LAW");
      doc.fontSize(11).font("Helvetica");
      doc.text(
        "This Agreement shall be governed by and construed in accordance with the laws of India.",
        { align: "justify" },
      );
      doc.moveDown(2);

      // Signatures Section
      doc
        .fontSize(14)
        .font("Helvetica-Bold")
        .text("SIGNATURES", { underline: true });
      doc.moveDown(3);

      // Brand Signature
      doc.fontSize(10).font("Helvetica");
      doc.text("_________________________", { align: "left" });
      doc.text(`${brandDetails.name}`, { align: "left" });
      doc.text("Brand", { align: "left" });
      doc.text(`Date: ${new Date().toLocaleDateString("en-IN")}`, {
        align: "left",
      });
      doc.moveDown(2);

      // Influencer/Vendor Signature
      if (influencerDetails) {
        doc.text("_________________________", { align: "left" });
        doc.text(`${influencerDetails.name}`, { align: "left" });
        doc.text("Influencer", { align: "left" });
        doc.text(`Date: ${new Date().toLocaleDateString("en-IN")}`, {
          align: "left",
        });
      } else if (vendorDetails) {
        doc.text("_________________________", { align: "left" });
        doc.text(`${vendorDetails.name}`, { align: "left" });
        doc.text("Vendor", { align: "left" });
        doc.text(`Date: ${new Date().toLocaleDateString("en-IN")}`, {
          align: "left",
        });
      }

      // Finalize PDF
      doc.end();
    } catch (error: any) {
      reject(error);
    }
  });
}

/**
 * Generate agreement for an influencer-brand deal
 */
export async function generateInfluencerBrandAgreement(
  dealId: string,
): Promise<string> {
  try {
    const deal = await InfluencerBrandDeal.findById(dealId)
      .populate("brandId", "name email phone businessInfo addresses")
      .populate("influencerId", "name email phone addresses")
      .lean();

    if (!deal) {
      throw new Error("Deal not found");
    }

    const brand = deal.brandId as any;
    const influencer = deal.influencerId as any;

    const dealDetails: DealDetails = {
      dealId: deal._id.toString(),
      dealType: "influencer-brand",
      amount: deal.finalTerms?.agreedAmount || 0,
      deadline: deal.finalTerms?.agreedDeadline || new Date(),
      requirements: deal.finalTerms?.finalRequirements || [],
      deliverables: deal.finalTerms?.finalDeliverables || [],
      brandDetails: {
        name: brand.name || "N/A",
        email: brand.email || "N/A",
        phone: brand.phone || undefined,
        address:
          brand.addresses?.[0]?.address ||
          brand.businessInfo?.address ||
          undefined,
        businessName: brand.businessInfo?.businessName || undefined,
      },
      influencerDetails: {
        name: influencer.name || "N/A",
        email: influencer.email || "N/A",
        phone: influencer.phone || undefined,
        address: influencer.addresses?.[0]?.address || undefined,
      },
    };

    return await generateAgreementPDF(dealDetails);
  } catch (error: any) {
    throw new Error(
      `Failed to generate influencer-brand agreement: ${error.message}`,
    );
  }
}

/**
 * Generate agreement for a vendor-brand deal
 */
export async function generateVendorBrandAgreement(
  dealId: string,
): Promise<string> {
  try {
    const deal = await VendorBrandDeal.findById(dealId)
      .populate("brandId", "name email phone businessInfo addresses")
      .populate("vendorId", "name email phone vendorInfo addresses")
      .lean();

    if (!deal) {
      throw new Error("Deal not found");
    }

    const brand = deal.brandId as any;
    const vendor = deal.vendorId as any;

    const dealDetails: DealDetails = {
      dealId: deal._id.toString(),
      dealType: "vendor-brand",
      amount: deal.finalTerms?.agreedAmount || 0,
      deadline: deal.finalTerms?.agreedDeadline
        ? new Date(deal.finalTerms.agreedDeadline)
        : new Date(),
      requirements: deal.finalTerms?.finalRequirements || [],
      deliverables: deal.finalTerms?.finalDeliverables || [],
      brandDetails: {
        name: brand.name || "N/A",
        email: brand.email || "N/A",
        phone: brand.phone || undefined,
        address:
          brand.addresses?.[0]?.address ||
          brand.businessInfo?.address ||
          undefined,
        businessName: brand.businessInfo?.businessName || undefined,
      },
      vendorDetails: {
        name: vendor.name || "N/A",
        email: vendor.email || "N/A",
        phone: vendor.phone || undefined,
        address:
          vendor.addresses?.[0]?.address ||
          vendor.vendorInfo?.address ||
          undefined,
        businessName: vendor.vendorInfo?.businessName || undefined,
      },
    };

    return await generateAgreementPDF(dealDetails);
  } catch (error: any) {
    throw new Error(
      `Failed to generate vendor-brand agreement: ${error.message}`,
    );
  }
}
