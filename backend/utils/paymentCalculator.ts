import { Currency } from "../models/payment";

// Tax Configuration Interface
export interface TaxConfig {
    gst?: number; // GST percentage (India)
    cgst?: number; // CGST percentage
    sgst?: number; // SGST percentage
    igst?: number; // IGST percentage
    tds?: number; // TDS percentage
    vat?: number; // VAT percentage (international)
    [key: string]: number | undefined;
}

// Platform Fee Configuration
export interface PlatformFeeConfig {
    percentage: number; // Platform fee percentage
    fixed?: number; // Fixed platform fee (optional)
    minFee?: number; // Minimum platform fee
    maxFee?: number; // Maximum platform fee
}

// Payment Calculation Result
export interface PaymentCalculation {
    amount: number; // Base amount
    currency: Currency;
    taxAmount: number;
    taxPercentage: number;
    taxBreakdown: TaxConfig;
    platformFee: number;
    platformFeePercentage: number;
    subtotal: number; // amount + taxAmount
    totalAmount: number; // subtotal + platformFee
}

/**
 * Calculate tax based on amount and tax configuration
 */
export function calculateTax(
    amount: number,
    taxConfig: TaxConfig,
    isInterState: boolean = false
): { taxAmount: number; taxPercentage: number; taxBreakdown: TaxConfig } {
    let totalTaxAmount = 0;
    let totalTaxPercentage = 0;
    const taxBreakdown: TaxConfig = {};

    // Check if individual components are set (prioritize over gst)
    const hasIndividualComponents = taxConfig.cgst || taxConfig.sgst || taxConfig.igst;

    // Individual tax components (prioritized)
    if (taxConfig.cgst) {
        const cgstAmount = (amount * taxConfig.cgst) / 100;
        totalTaxAmount += cgstAmount;
        totalTaxPercentage += taxConfig.cgst;
        taxBreakdown.cgst = taxConfig.cgst;
    }

    if (taxConfig.sgst) {
        const sgstAmount = (amount * taxConfig.sgst) / 100;
        totalTaxAmount += sgstAmount;
        totalTaxPercentage += taxConfig.sgst;
        taxBreakdown.sgst = taxConfig.sgst;
    }

    if (taxConfig.igst) {
        const igstAmount = (amount * taxConfig.igst) / 100;
        totalTaxAmount += igstAmount;
        totalTaxPercentage += taxConfig.igst;
        taxBreakdown.igst = taxConfig.igst;
    }

    // GST Calculation (India) - only if individual components are not set
    if (taxConfig.gst && !hasIndividualComponents) {
        const gstAmount = (amount * taxConfig.gst) / 100;
        totalTaxAmount += gstAmount;
        totalTaxPercentage += taxConfig.gst;

        if (isInterState) {
            // Inter-state: IGST
            taxBreakdown.igst = taxConfig.gst;
        } else {
            // Intra-state: CGST + SGST
            const halfGst = taxConfig.gst / 2;
            taxBreakdown.cgst = halfGst;
            taxBreakdown.sgst = halfGst;
        }
    }

    if (taxConfig.tds) {
        const tdsAmount = (amount * taxConfig.tds) / 100;
        totalTaxAmount += tdsAmount;
        totalTaxPercentage += taxConfig.tds;
        taxBreakdown.tds = taxConfig.tds;
    }

    if (taxConfig.vat) {
        const vatAmount = (amount * taxConfig.vat) / 100;
        totalTaxAmount += vatAmount;
        totalTaxPercentage += taxConfig.vat;
        taxBreakdown.vat = taxConfig.vat;
    }

    return {
        taxAmount: Math.round(totalTaxAmount * 100) / 100, // Round to 2 decimal places
        taxPercentage: totalTaxPercentage,
        taxBreakdown,
    };
}

/**
 * Calculate platform fee
 */
export function calculatePlatformFee(
    amount: number,
    feeConfig: PlatformFeeConfig
): number {
    let fee = 0;

    // Calculate percentage fee
    if (feeConfig.percentage) {
        fee = (amount * feeConfig.percentage) / 100;
    }

    // Add fixed fee if applicable
    if (feeConfig.fixed) {
        fee += feeConfig.fixed;
    }

    // Apply minimum fee
    if (feeConfig.minFee && fee < feeConfig.minFee) {
        fee = feeConfig.minFee;
    }

    // Apply maximum fee
    if (feeConfig.maxFee && fee > feeConfig.maxFee) {
        fee = feeConfig.maxFee;
    }

    return Math.round(fee * 100) / 100; // Round to 2 decimal places
}

/**
 * Get tax configuration from settings or default
 */
export async function getTaxConfigFromSettings(): Promise<{ taxConfig: TaxConfig; isInterState: boolean }> {
    try {
        const Settings = await import("../models/settings");
        const settings = await Settings.default.getSettings();
        
        if (settings.taxSettings) {
            const { gst, cgst, sgst, igst, isInterState } = settings.taxSettings;
            
            const taxConfig: TaxConfig = {};
            
            if (isInterState) {
                // Inter-state: Use IGST
                if (igst > 0) {
                    taxConfig.igst = igst;
                } else if (gst > 0) {
                    taxConfig.gst = gst;
                }
            } else {
                // Intra-state: Use CGST + SGST
                if (cgst > 0 && sgst > 0) {
                    taxConfig.cgst = cgst;
                    taxConfig.sgst = sgst;
                } else if (gst > 0) {
                    // If CGST/SGST not set, split GST equally
                    taxConfig.cgst = gst / 2;
                    taxConfig.sgst = gst / 2;
                }
            }
            
            // If no tax values are set (all are 0 or undefined), use default
            const hasTaxValues = Object.keys(taxConfig).length > 0 && 
                                 Object.values(taxConfig).some(val => val !== undefined && val > 0);
            
            if (hasTaxValues) {
                return { taxConfig, isInterState: isInterState || false };
            } else {
                console.warn("⚠️ No tax values configured in settings, using default tax config");
            }
        }
    } catch (error) {
        console.error("Error fetching tax config from settings:", error);
    }
    
    // Fallback to default
    return { taxConfig: getDefaultTaxConfig(), isInterState: false };
}

/**
 * Get default tax configuration based on country/region
 */
export function getDefaultTaxConfig(country: string = "IN"): TaxConfig {
    switch (country.toUpperCase()) {
        case "IN": // India
            return {
                gst: 18, // 18% GST (9% CGST + 9% SGST for intra-state, 18% IGST for inter-state)
            };
        case "US": // United States
            return {
                vat: 0, // Sales tax varies by state
            };
        case "GB": // United Kingdom
        case "UK":
            return {
                vat: 20, // 20% VAT
            };
        default:
            return {
                gst: 0,
            };
    }
}

/**
 * Get default platform fee configuration
 */
export function getDefaultPlatformFeeConfig(): PlatformFeeConfig {
    return {
        percentage: 5, // 5% platform fee
        minFee: 10, // Minimum ₹10
        maxFee: 5000, // Maximum ₹5000
    };
}

/**
 * Calculate complete payment breakdown
 */
export function calculatePayment(
    amount: number,
    currency: Currency = Currency.INR,
    options?: {
        taxConfig?: TaxConfig;
        platformFeeConfig?: PlatformFeeConfig;
        isInterState?: boolean;
        applyTax?: boolean;
        applyPlatformFee?: boolean;
    }
): PaymentCalculation {
    const {
        taxConfig = getDefaultTaxConfig(),
        platformFeeConfig = getDefaultPlatformFeeConfig(),
        isInterState = false,
        applyTax = true,
        applyPlatformFee = true,
    } = options || {};

    // Calculate tax
    const taxResult = applyTax
        ? calculateTax(amount, taxConfig, isInterState)
        : { taxAmount: 0, taxPercentage: 0, taxBreakdown: {} };

    // Calculate subtotal (amount + tax)
    const subtotal = amount + taxResult.taxAmount;

    // Calculate platform fee on subtotal
    const platformFee = applyPlatformFee
        ? calculatePlatformFee(subtotal, platformFeeConfig)
        : 0;

    // Calculate total amount
    const totalAmount = subtotal + platformFee;

    return {
        amount: Math.round(amount * 100) / 100,
        currency,
        taxAmount: taxResult.taxAmount,
        taxPercentage: taxResult.taxPercentage,
        taxBreakdown: taxResult.taxBreakdown,
        platformFee,
        platformFeePercentage: platformFeeConfig.percentage || 0,
        subtotal: Math.round(subtotal * 100) / 100,
        totalAmount: Math.round(totalAmount * 100) / 100,
    };
}

/**
 * Convert currency (simplified - in production, use real-time exchange rates)
 */
export function convertCurrency(
    amount: number,
    fromCurrency: Currency,
    toCurrency: Currency
): number {
    if (fromCurrency === toCurrency) {
        return amount;
    }

    // Exchange rates (hardcoded for now - in production, fetch from API)
    const exchangeRates: Record<string, number> = {
        "INR_USD": 0.012,
        "USD_INR": 83.33,
        "INR_EUR": 0.011,
        "EUR_INR": 90.91,
        "INR_GBP": 0.0095,
        "GBP_INR": 105.26,
        "USD_EUR": 0.92,
        "EUR_USD": 1.09,
        "USD_GBP": 0.79,
        "GBP_USD": 1.27,
        "EUR_GBP": 0.86,
        "GBP_EUR": 1.16,
    };

    const rateKey = `${fromCurrency}_${toCurrency}`;
    const rate = exchangeRates[rateKey] || 1;

    return Math.round(amount * rate * 100) / 100;
}

