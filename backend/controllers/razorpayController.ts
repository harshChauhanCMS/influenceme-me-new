import { Request, Response } from 'express';
import { successResponse, errorResponse } from '../utils/responseHelper';
import { AuthenticatedRequest } from '../middleware/auth';
import razorpayService from '../services/razorpayService';
import { markDealAsPaidIfApplicable } from './paymentController';

/**
 * @desc    Create Razorpay order
 * @route   POST /api/payment/razorpay/create-order
 * @access  Private
 */
export const createRazorpayOrder = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { amount, currency = 'INR', receipt, notes } = req.body;

    if (!amount || amount <= 0) {
      return errorResponse(res, 'Invalid amount', 400);
    }

    // Convert amount to paise (Razorpay uses smallest currency unit)
    const amountInPaise = Math.round(amount * 100);

    const order = await razorpayService.createOrder({
      amount: amountInPaise,
      currency,
      receipt: receipt || `order_${Date.now()}`,
      notes: notes || {},
    });

    return successResponse(res, 'Order created successfully', {
      orderId: order.id,
      amount: order.amount,
      currency: order.currency,
      keyId: await razorpayService.getPublicKey(),
    });
  } catch (error: any) {
    console.error('Create Razorpay order error:', error);
    return errorResponse(res, error.message || 'Failed to create order', 500);
  }
};

/**
 * @desc    Verify Razorpay payment and update database
 * @route   POST /api/payment/razorpay/verify
 * @access  Private
 */
export const verifyRazorpayPayment = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { orderId, paymentId, signature } = req.body;

    console.log('🔍 verifyRazorpayPayment called:', { orderId, paymentId, hasSignature: !!signature });

    if (!paymentId) {
      console.error('❌ Missing paymentId');
      return errorResponse(res, 'Missing required field: paymentId', 400);
    }

    // If signature is missing, we can still verify using paymentId directly
    if (!orderId || !signature) {
      console.log('⚠️ OrderId or signature missing, verifying with paymentId only...');
      // Get payment details from Razorpay first
      let razorpayPayment = await razorpayService.getPayment(paymentId);
      console.log('📋 Razorpay payment status:', razorpayPayment.status);
      console.log('📋 Razorpay payment order_id:', razorpayPayment.order_id);

      // If payment is authorized, capture it automatically
      if (razorpayPayment.status === 'authorized') {
        console.log('🔄 Payment is authorized, capturing it...');
        try {
          const capturedPayment = await razorpayService.capturePayment(paymentId, razorpayPayment.amount);
          razorpayPayment = capturedPayment;
          console.log('✅ Payment captured successfully, new status:', razorpayPayment.status);
        } catch (captureError: any) {
          console.error('❌ Failed to capture payment:', captureError);
          // If capture fails, still proceed with authorized status
          console.log('⚠️ Continuing with authorized status');
        }
      }

      if (razorpayPayment.status !== 'captured') {
        console.log('⚠️ Payment not captured yet. Status:', razorpayPayment.status);
        return successResponse(res, 'Payment not captured yet', {
          paymentId: razorpayPayment.id,
          orderId: razorpayPayment.order_id,
          amount: razorpayPayment.amount / 100,
          currency: razorpayPayment.currency,
          status: razorpayPayment.status,
          verified: false,
        });
      }

      // Find payment in our database by orderId from Razorpay
      const Payment = (await import('../models/payment')).default;
      const PaymentStatus = (await import('../models/payment')).PaymentStatus;
      const Transaction = (await import('../models/transaction')).default;
      const TransactionType = (await import('../models/transaction')).TransactionType;
      const { generateInvoiceForPayment } = await import('../services/invoiceService');
      const { generateInvoicePDF } = await import('../services/invoiceService');

      const orderIdFromRazorpay = razorpayPayment.order_id;
      const payment = await Payment.findOne({ orderId: orderIdFromRazorpay });

      if (!payment) {
        console.error('❌ Payment not found in database for orderId:', orderIdFromRazorpay);
        return errorResponse(res, 'Payment not found in database', 404);
      }

      // Check if payment is already completed
      if (payment.status === PaymentStatus.COMPLETED) {
        console.log('✅ Payment already verified:', payment.paymentId);
        return successResponse(res, 'Payment already verified', {
          paymentId: razorpayPayment.id,
          orderId: razorpayPayment.order_id,
          amount: razorpayPayment.amount / 100,
          currency: razorpayPayment.currency,
          status: 'captured',
          paymentDetails: razorpayPayment,
          verified: true,
        });
      }

      // Update payment status
      console.log('✅✅✅ Payment captured in Razorpay, updating database...');
      payment.status = PaymentStatus.COMPLETED;
      payment.transactionId = paymentId;
      payment.paidAt = new Date(razorpayPayment.created_at * 1000);
      payment.gatewayResponse = razorpayPayment;
      await payment.save();
      console.log('✅✅✅ Payment status updated to COMPLETED in database:', payment.paymentId);

      // Create transactions
      try {
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
      } catch (txError: any) {
        console.error('Error creating transactions:', txError);
      }

      // Generate invoice
      const invoice = await generateInvoiceForPayment(payment.paymentId);
      
      if (invoice) {
        await generateInvoicePDF(invoice.invoiceId);
        await markDealAsPaidIfApplicable(payment);
      }

      return successResponse(res, 'Payment verified successfully', {
        paymentId: razorpayPayment.id,
        orderId: razorpayPayment.order_id,
        amount: razorpayPayment.amount / 100,
        currency: razorpayPayment.currency,
        status: razorpayPayment.status,
        paymentDetails: razorpayPayment,
        verified: true,
      });
    }

    // Verify signature
    console.log('🔐 Verifying payment signature...');
    const isValid = await razorpayService.verifyPayment({
      orderId,
      paymentId,
      signature,
    });

    if (!isValid) {
      console.error('❌ Invalid payment signature');
      return errorResponse(res, 'Invalid payment signature', 400);
    }

    console.log('✅ Signature verified, fetching payment from Razorpay...');
    // Get payment details from Razorpay
    const razorpayPayment = await razorpayService.getPayment(paymentId);
    console.log('📋 Razorpay payment status:', razorpayPayment.status);

    // Find payment in our database by orderId
    const Payment = (await import('../models/payment')).default;
    const PaymentStatus = (await import('../models/payment')).PaymentStatus;
    const Transaction = (await import('../models/transaction')).default;
    const TransactionType = (await import('../models/transaction')).TransactionType;
    const { generateInvoiceForPayment } = await import('../services/invoiceService');
    const { generateInvoicePDF } = await import('../services/invoiceService');

    const payment = await Payment.findOne({ orderId });

    if (!payment) {
      console.error('❌ Payment not found in database for orderId:', orderId);
      return errorResponse(res, 'Payment not found in database', 404);
    }

    // Check if payment is already completed
    if (payment.status === PaymentStatus.COMPLETED) {
      console.log('✅ Payment already verified:', payment.paymentId);
      return successResponse(res, 'Payment already verified', {
        paymentId: razorpayPayment.id,
        orderId: razorpayPayment.order_id,
        amount: razorpayPayment.amount / 100,
        currency: razorpayPayment.currency,
        status: 'captured',
        paymentDetails: razorpayPayment,
        verified: true,
      });
    }

    // Update payment status if payment is captured
    if (razorpayPayment.status === 'captured') {
      console.log('✅✅✅ Payment captured in Razorpay, updating database...');
      console.log('📝 Payment details:', {
        ourPaymentId: payment.paymentId,
        razorpayPaymentId: paymentId,
        amount: razorpayPayment.amount,
        status: razorpayPayment.status,
        dealId: payment.dealId,
      });
      
      payment.status = PaymentStatus.COMPLETED;
      payment.transactionId = paymentId;
      payment.paidAt = new Date(razorpayPayment.created_at * 1000);
      payment.gatewayResponse = razorpayPayment;
      await payment.save();
      console.log('✅✅✅ Payment status updated to COMPLETED in database:', payment.paymentId);

      // Create transactions
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
      } catch (txError: any) {
        console.error('Error creating transactions:', txError);
      }

      // Generate invoice
      const invoice = await generateInvoiceForPayment(payment.paymentId);
      
      if (invoice) {
        await generateInvoicePDF(invoice.invoiceId);
        await markDealAsPaidIfApplicable(payment);
      }

      console.log('✅✅✅ Payment verified and updated successfully:', payment.paymentId);
    } else {
      console.log('⚠️ Payment not captured yet. Status:', razorpayPayment.status);
    }

    return successResponse(res, 'Payment verified successfully', {
      paymentId: razorpayPayment.id,
      orderId: razorpayPayment.order_id,
      amount: razorpayPayment.amount / 100,
      currency: razorpayPayment.currency,
      status: razorpayPayment.status,
      paymentDetails: razorpayPayment,
      verified: razorpayPayment.status === 'captured',
    });
  } catch (error: any) {
    console.error('Verify Razorpay payment error:', error);
    return errorResponse(res, error.message || 'Failed to verify payment', 500);
  }
};

/**
 * @desc    Verify payment using only paymentId (when orderId/signature are missing)
 * @route   POST /api/payment/razorpay/verify-by-payment-id
 * @access  Private
 */
export const verifyPaymentByPaymentId = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { paymentId, dealId } = req.body;

    console.log('🔍 verifyPaymentByPaymentId called:', { paymentId, dealId });

    if (!paymentId) {
      return errorResponse(res, 'Missing required field: paymentId', 400);
    }

    // Get payment details from Razorpay
    let razorpayPayment = await razorpayService.getPayment(paymentId);
    console.log('📋 Razorpay payment status:', razorpayPayment.status);
    console.log('📋 Razorpay payment order_id:', razorpayPayment.order_id);

    // If payment is authorized, capture it automatically
    if (razorpayPayment.status === 'authorized') {
      console.log('🔄 Payment is authorized, capturing it...');
      try {
        razorpayPayment = await razorpayService.capturePayment(paymentId, razorpayPayment.amount);
        console.log('✅ Payment captured successfully, new status:', razorpayPayment.status);
      } catch (captureError: any) {
        console.error('❌ Failed to capture payment:', captureError);
        // If capture fails, still proceed with authorized status
        console.log('⚠️ Continuing with authorized status');
      }
    }

    if (razorpayPayment.status !== 'captured') {
      console.log('⚠️ Payment not captured yet. Status:', razorpayPayment.status);
      return successResponse(res, 'Payment not captured yet', {
        paymentId: razorpayPayment.id,
        orderId: razorpayPayment.order_id,
        amount: razorpayPayment.amount / 100,
        currency: razorpayPayment.currency,
        status: razorpayPayment.status,
        verified: false,
      });
    }

    // Find payment in our database by orderId from Razorpay
    const Payment = (await import('../models/payment')).default;
    const PaymentStatus = (await import('../models/payment')).PaymentStatus;
    const Transaction = (await import('../models/transaction')).default;
    const TransactionType = (await import('../models/transaction')).TransactionType;
    const { generateInvoiceForPayment } = await import('../services/invoiceService');
    const { generateInvoicePDF } = await import('../services/invoiceService');

    const orderIdFromRazorpay = razorpayPayment.order_id;
    let payment = await Payment.findOne({ orderId: orderIdFromRazorpay });

    // If not found by orderId and dealId provided, try to find by dealId
    if (!payment && dealId) {
      payment = await Payment.findOne({
        dealId: dealId,
        status: PaymentStatus.PENDING,
      });
      if (payment) {
        console.log('✅ Found payment by dealId, updating orderId...');
        payment.orderId = orderIdFromRazorpay;
        await payment.save();
      }
    }

    if (!payment) {
      console.error('❌ Payment not found in database for orderId:', orderIdFromRazorpay);
      return errorResponse(res, 'Payment not found in database', 404);
    }

    // Check if payment is already completed
    if (payment.status === PaymentStatus.COMPLETED) {
      console.log('✅ Payment already verified:', payment.paymentId);
      return successResponse(res, 'Payment already verified', {
        paymentId: razorpayPayment.id,
        orderId: razorpayPayment.order_id,
        amount: razorpayPayment.amount / 100,
        currency: razorpayPayment.currency,
        status: 'captured',
        paymentDetails: razorpayPayment,
        verified: true,
      });
    }

    // Update payment status
    console.log('✅✅✅ Payment captured in Razorpay, updating database...');
    payment.status = PaymentStatus.COMPLETED;
    payment.transactionId = paymentId;
    payment.paidAt = new Date(razorpayPayment.created_at * 1000);
    payment.gatewayResponse = razorpayPayment;
    await payment.save();
    console.log('✅✅✅ Payment status updated to COMPLETED in database:', payment.paymentId);

    // Create transactions
    try {
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
    } catch (txError: any) {
      console.error('Error creating transactions:', txError);
    }

    // Generate invoice
    const invoice = await generateInvoiceForPayment(payment.paymentId);
    
    if (invoice) {
      await generateInvoicePDF(invoice.invoiceId);
      await markDealAsPaidIfApplicable(payment);
    }

    return successResponse(res, 'Payment verified successfully', {
      paymentId: razorpayPayment.id,
      orderId: razorpayPayment.order_id,
      amount: razorpayPayment.amount / 100,
      currency: razorpayPayment.currency,
      status: razorpayPayment.status,
      paymentDetails: razorpayPayment,
      verified: true,
    });
  } catch (error: any) {
    console.error('Verify payment by paymentId error:', error);
    return errorResponse(res, error.message || 'Failed to verify payment', 500);
  }
};

/**
 * @desc    Get Razorpay payment details
 * @route   GET /api/payment/razorpay/:paymentId
 * @access  Private
 */
export const getRazorpayPayment = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { paymentId } = req.params;

    if (!paymentId) {
      return errorResponse(res, 'Payment ID is required', 400);
    }

    const payment = await razorpayService.getPayment(String(paymentId));

    return successResponse(res, 'Payment details retrieved successfully', {
      paymentId: payment.id,
      orderId: payment.order_id,
      amount: payment.amount / 100, // Convert from paise
      currency: payment.currency,
      status: payment.status,
      paymentDetails: payment,
    });
  } catch (error: any) {
    console.error('Get Razorpay payment error:', error);
    return errorResponse(res, error.message || 'Failed to get payment details', 500);
  }
};

/**
 * @desc    Refund Razorpay payment
 * @route   POST /api/payment/razorpay/:paymentId/refund
 * @access  Private (Admin or payment owner)
 */
export const refundRazorpayPayment = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { paymentId } = req.params;
    const { amount, notes } = req.body;

    if (!paymentId) {
      return errorResponse(res, 'Payment ID is required', 400);
    }

    // Convert amount to paise if provided
    const amountInPaise = amount ? Math.round(amount * 100) : undefined;

    const refund = await razorpayService.refundPayment(String(paymentId), amountInPaise, notes);

    return successResponse(res, 'Refund processed successfully', {
      refundId: refund.id,
      paymentId: refund.payment_id,
      amount: refund.amount / 100, // Convert from paise
      currency: refund.currency,
      status: refund.status,
      refundDetails: refund,
    });
  } catch (error: any) {
    console.error('Refund Razorpay payment error:', error);
    return errorResponse(res, error.message || 'Failed to process refund', 500);
  }
};

