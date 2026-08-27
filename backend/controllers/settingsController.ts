import { Request, Response } from 'express';
import Settings from '../models/settings';
import { successResponse, errorResponse } from '../utils/responseHelper';
import { AuthenticatedRequest } from '../middleware/auth';
import { Currency } from '../models/payment';

/**
 * @desc    Get all settings
 * @route   GET /api/admin/settings
 * @access  Private (Admin only)
 */
export const getSettings = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const settings = await Settings.getSettings();
    return successResponse(res, 'Settings retrieved successfully', settings);
  } catch (error: any) {
    console.error('Get settings error:', error);
    return errorResponse(res, error.message || 'Failed to retrieve settings', 500);
  }
};

/**
 * @desc    Update settings
 * @route   PUT /api/admin/settings
 * @access  Private (Admin only)
 */
export const updateSettings = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const updates = req.body;
    
    // Validate that user is admin
    if (req.user?.role !== 'admin') {
      return errorResponse(res, 'Unauthorized. Admin access required.', 403);
    }

    const settings = await Settings.updateSettings(updates);
    
    // If Razorpay keys are updated, reinitialize the service
    if (updates.paymentSettings?.razorpayKeyId || updates.paymentSettings?.razorpayKeySecret) {
      try {
        const { razorpayService } = await import('../services/razorpayService');
        await razorpayService.initialize();
      } catch (razorpayError: any) {
        console.error('Razorpay reinitialization error:', razorpayError);
        // Don't fail the request, just log the error
      }
    }

    return successResponse(res, 'Settings updated successfully', settings);
  } catch (error: any) {
    console.error('Update settings error:', error);
    return errorResponse(res, error.message || 'Failed to update settings', 500);
  }
};

/**
 * @desc    Get payment settings (public - for frontend to get Razorpay key)
 * @route   GET /api/settings/payment
 * @access  Public
 */
export const getPaymentSettings = async (req: Request, res: Response) => {
  try {
    const settings = await Settings.getSettings();
    const { paymentSettings } = settings;
    
    // Only return public key, not secret
    return successResponse(res, 'Payment settings retrieved successfully', {
      razorpayKeyId: paymentSettings.razorpayKeyId,
      currency: paymentSettings.currency,
      paymentMethods: paymentSettings.paymentMethods,
      platformFeePercentage: paymentSettings.platformFeePercentage,
      minWithdrawalAmount: paymentSettings.minWithdrawalAmount,
    });
  } catch (error: any) {
    console.error('Get payment settings error:', error);
    return errorResponse(res, error.message || 'Failed to retrieve payment settings', 500);
  }
};

/**
 * @desc    Test tax configuration (admin only - for verification)
 * @route   GET /api/admin/settings/test-tax
 * @access  Private (Admin only)
 */
export const testTaxConfiguration = async (req: AuthenticatedRequest, res: Response) => {
  try {
    // Validate that user is admin
    if (req.user?.role !== 'admin') {
      return errorResponse(res, 'Unauthorized. Admin access required.', 403);
    }

    const { getTaxConfigFromSettings, calculatePayment } = await import('../utils/paymentCalculator');
    const { taxConfig, isInterState } = await getTaxConfigFromSettings();
    
    // Test calculation with sample amount
    const testAmount = 10000; // ₹10,000
    const testCalculation = calculatePayment(testAmount, Currency.INR, {
      taxConfig,
      isInterState,
      applyTax: true,
      applyPlatformFee: false, // Don't include platform fee in test
    });

    return successResponse(res, 'Tax configuration test successful', {
      taxSettings: {
        taxConfig,
        isInterState,
      },
      testCalculation: {
        baseAmount: testAmount,
        taxAmount: testCalculation.taxAmount,
        taxPercentage: testCalculation.taxPercentage,
        taxBreakdown: testCalculation.taxBreakdown,
        totalAmount: testCalculation.subtotal, // Amount + Tax
      },
      message: `For ₹${testAmount.toLocaleString()}, tax of ₹${testCalculation.taxAmount.toLocaleString()} (${testCalculation.taxPercentage}%) will be applied.`,
    });
  } catch (error: any) {
    console.error('Test tax configuration error:', error);
    return errorResponse(res, error.message || 'Failed to test tax configuration', 500);
  }
};

