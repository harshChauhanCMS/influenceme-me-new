# 💳 Payment System Documentation

## Overview

A comprehensive payment system supporting multiple payment flows, gateways, tax calculations, platform fees, currency conversion, and invoice generation.

---

## 🏗️ Architecture

### Payment Flows

1. **Brand → Influencer**: Brand pays influencer for campaign collaboration
2. **Brand → Vendor**: Brand pays vendor for services
3. **Influencer → Vendor**: Influencer pays vendor for services
4. **Refunds**: Full or partial refunds for any payment

### Components

- **Payment Models**: Payment, Transaction, Invoice
- **Payment Gateways**: Razorpay, Stripe (extensible)
- **Payment Calculator**: Tax, platform fees, currency conversion
- **Invoice Service**: Automatic invoice generation
- **Webhook Handlers**: Gateway callbacks

---

## 📁 File Structure

```
backend/
├── models/
│   ├── payment.ts          # Payment model
│   ├── transaction.ts      # Transaction model
│   └── invoice.ts          # Invoice model
├── controllers/
│   ├── paymentController.ts    # Payment CRUD operations
│   └── invoiceController.ts    # Invoice operations
├── services/
│   ├── paymentGatewayService.ts # Gateway integrations
│   └── invoiceService.ts        # Invoice generation
├── utils/
│   └── paymentCalculator.ts     # Tax, fees, currency calculations
└── routes/
    ├── paymentRoutes.ts         # Payment API routes
    ├── invoiceRoutes.ts         # Invoice API routes
    └── paymentWebhookRoutes.ts  # Webhook handlers
```

---

## 🔧 Setup

### Environment Variables

Add to `.env`:

```env
# Razorpay
RAZORPAY_KEY_ID=your_razorpay_key_id
RAZORPAY_KEY_SECRET=your_razorpay_key_secret
RAZORPAY_BASE_URL=https://api.razorpay.com/v1

# Stripe
STRIPE_SECRET_KEY=your_stripe_secret_key
```

### Install Dependencies

No additional dependencies needed! The system uses:
- `axios` (already installed) for HTTP requests
- `crypto` (Node.js built-in) for signature verification

---

## 📊 Models

### Payment Model

```typescript
{
  paymentId: string;           // Unique payment ID
  payerId: string;            // User ID paying
  payeeId: string;            // User ID receiving
  paymentType: PaymentType;    // brand_to_influencer, etc.
  amount: number;              // Base amount
  currency: Currency;          // INR, USD, EUR, GBP
  taxAmount: number;           // Calculated tax
  platformFee: number;        // Platform commission
  totalAmount: number;         // Final amount
  paymentMethod: PaymentMethod; // razorpay, stripe, etc.
  status: PaymentStatus;       // pending, completed, etc.
}
```

### Transaction Model

Tracks individual debit/credit transactions for accounting.

### Invoice Model

Automatic invoice generation with PDF support.

---

## 🚀 API Endpoints

### Payment Endpoints

#### Create Payment
```http
POST /api/payment/create
Authorization: Bearer <token>
Content-Type: application/json

{
  "payeeId": "user_id",
  "payeeType": "influencer",
  "paymentType": "brand_to_influencer",
  "amount": 10000,
  "currency": "INR",
  "dealId": "deal_id",
  "campaignId": "campaign_id",
  "paymentMethod": "razorpay",
  "description": "Payment for campaign collaboration"
}
```

#### Verify Payment
```http
POST /api/payment/verify
Authorization: Bearer <token>
Content-Type: application/json

{
  "paymentId": "PAY1234567890",
  "orderId": "order_xyz",
  "signature": "signature_hash"
}
```

#### Get Payment Status
```http
GET /api/payment/status/:paymentId
Authorization: Bearer <token>
```

#### Get User Payments
```http
GET /api/payment/user?page=1&limit=20&status=completed
Authorization: Bearer <token>
```

#### Refund Payment
```http
POST /api/payment/refund
Authorization: Bearer <token>
Content-Type: application/json

{
  "paymentId": "PAY1234567890",
  "amount": 5000,
  "reason": "Service not delivered"
}
```

### Invoice Endpoints

#### Get User Invoices
```http
GET /api/invoice/user?page=1&limit=20&status=paid
Authorization: Bearer <token>
```

#### Get Invoice Details
```http
GET /api/invoice/:invoiceId
Authorization: Bearer <token>
```

#### Generate Invoice
```http
POST /api/invoice/generate
Authorization: Bearer <token>
Content-Type: application/json

{
  "paymentId": "PAY1234567890"
}
```

#### Download Invoice PDF
```http
GET /api/invoice/:invoiceId/pdf
Authorization: Bearer <token>
```

### Webhook Endpoints

#### Razorpay Webhook
```http
POST /api/webhooks/payment/razorpay
Content-Type: application/json
X-Razorpay-Signature: <signature>
```

#### Stripe Webhook
```http
POST /api/webhooks/payment/stripe
Content-Type: application/json
Stripe-Signature: <signature>
```

---

## 💰 Payment Calculation

### Tax Calculation

Supports multiple tax types:
- **GST** (India): 18% (9% CGST + 9% SGST intra-state, 18% IGST inter-state)
- **VAT** (International): Configurable percentage
- **TDS**: Tax deducted at source

### Platform Fees

Default configuration:
- **Percentage**: 5%
- **Minimum**: ₹10
- **Maximum**: ₹5000

### Currency Conversion

Supported currencies:
- INR (Indian Rupee)
- USD (US Dollar)
- EUR (Euro)
- GBP (British Pound)

Exchange rates are hardcoded (update with real-time API in production).

---

## 🔐 Security

### Webhook Signature Verification

**TODO**: Implement signature verification for webhooks:

```typescript
// Razorpay
const crypto = require('crypto');
const signature = crypto
  .createHmac('sha256', RAZORPAY_KEY_SECRET)
  .update(JSON.stringify(req.body))
  .digest('hex');

// Stripe
const stripe = require('stripe')(STRIPE_SECRET_KEY);
const event = stripe.webhooks.constructEvent(
  req.body,
  req.headers['stripe-signature'],
  STRIPE_WEBHOOK_SECRET
);
```

---

## 📝 Payment Flow Example

### Brand Pays Influencer

1. **Create Payment Order**
   ```typescript
   POST /api/payment/create
   {
     "payeeId": "influencer_id",
     "payeeType": "influencer",
     "paymentType": "brand_to_influencer",
     "amount": 10000,
     "dealId": "deal_id"
   }
   ```

2. **Payment Gateway Redirect**
   - User redirected to Razorpay/Stripe checkout
   - User completes payment

3. **Webhook Callback**
   - Gateway sends webhook to `/api/webhooks/payment/razorpay`
   - Payment status updated to `completed`
   - Transactions created (debit payer, credit payee)
   - Invoice generated automatically

4. **Verify Payment** (Alternative)
   ```typescript
   POST /api/payment/verify
   {
     "paymentId": "PAY123",
     "orderId": "order_xyz",
     "signature": "sig_hash"
   }
   ```

---

## 🧪 Testing

### Test Payment Flow

1. Create a test payment
2. Use Razorpay test keys
3. Use test card: `4111 1111 1111 1111`
4. Verify payment status
5. Check invoice generation

### Test Webhooks

Use tools like:
- **ngrok** for local webhook testing
- **Razorpay Dashboard** webhook simulator
- **Stripe CLI** for webhook testing

---

## 📋 TODO / Future Enhancements

1. **Real-time Exchange Rates**: Integrate with currency API
2. **PDF Generation**: Integrate PDF library (pdfkit/puppeteer)
3. **Email Invoices**: Send invoices via email
4. **Payment Plans**: Installment payments
5. **Escrow System**: Hold payments until service completion
6. **Multi-currency Wallets**: User wallet balances
7. **Payment Analytics**: Dashboard with payment insights
8. **Automated Refunds**: Auto-refund on deal cancellation
9. **Payment Reminders**: Notify overdue payments
10. **Tax Reports**: Generate tax reports for users

---

## 🐛 Troubleshooting

### Payment Not Completing

1. Check gateway credentials in `.env`
2. Verify webhook URL is accessible
3. Check payment status in database
4. Review gateway logs

### Invoice Not Generating

1. Ensure payment status is `completed`
2. Check invoice service logs
3. Verify payment has required fields

### Webhook Not Receiving

1. Check webhook URL configuration in gateway dashboard
2. Verify server is accessible (use ngrok for local)
3. Check signature verification

---

## 📞 Support

For payment-related issues:
1. Check payment status via API
2. Review transaction logs
3. Contact payment gateway support if needed

---

## 🔄 Version History

- **v1.0.0** (Current)
  - Initial payment system implementation
  - Razorpay and Stripe integration
  - Tax and platform fee calculation
  - Invoice generation
  - Webhook handlers

---

## 📄 License

ISC

