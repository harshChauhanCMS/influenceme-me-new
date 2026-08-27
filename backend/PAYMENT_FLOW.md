# Payment Module — Setup & Flow

This documents how payments actually work end-to-end in this codebase, and lists every broken
connection found in the module and how it was fixed. Read this alongside the pre-existing
[`PAYMENT_SYSTEM_DOCUMENTATION.md`](./PAYMENT_SYSTEM_DOCUMENTATION.md), which covers the data model
in more depth.

## 1. Setup

### 1.1 Environment variables (`backend/.env`)

```env
RAZORPAY_KEY_ID=rzp_test_xxxxxxxxxxxx
RAZORPAY_KEY_SECRET=xxxxxxxxxxxxxxxxxxxx
RAZORPAY_WEBHOOK_SECRET=xxxxxxxxxxxxxxxxxxxx
```

- `RAZORPAY_KEY_ID` / `RAZORPAY_KEY_SECRET` — used to sign orders, fetch/capture payments, and
  process refunds via the Razorpay Node SDK (`services/razorpayService.ts`).
- `RAZORPAY_WEBHOOK_SECRET` — used to verify the `x-razorpay-signature` header on inbound webhooks
  (`routes/paymentWebhookRoutes.ts`). Configure the same secret in the Razorpay Dashboard when
  registering the webhook URL.

**Key precedence:** the gateway keys can also be set via the admin panel
(`PUT /api/admin/settings` → `paymentSettings.razorpayKeyId` / `razorpayKeySecret`, stored on the
`Settings` Mongo document). `.env` is the fallback used only when the DB fields are empty, so the
gateway works immediately after cloning without an admin having to visit the settings UI first.
Once an admin saves a value in the settings UI it takes priority over `.env`.

### 1.2 Registering the Razorpay webhook

In the Razorpay Dashboard → Webhooks, point it at:

```
POST https://<api-host>/api/webhooks/payment/razorpay
```

Subscribe to `payment.captured` at minimum. Use the same value as `RAZORPAY_WEBHOOK_SECRET`.

### 1.3 Route map

| Method | Path | Purpose |
|---|---|---|
| GET | `/api/settings/payment` | Public — returns Razorpay key id + tax/fee config for checkout |
| POST | `/api/payment/create` | Generic payment creation (brand→influencer, brand→vendor) |
| POST | `/api/payment/deal/create` | Influencer→vendor payment creation (separate flow, see §3) |
| GET | `/api/payment/deal/:dealId` | Fetch payment+invoice for a deal, auto-verifies if pending |
| POST | `/api/payment/razorpay/create-order` | Raw order creation (not tied to a Payment doc) |
| POST | `/api/payment/razorpay/verify` | Verify signature / capture, mark Payment completed |
| POST | `/api/payment/razorpay/verify-by-payment-id` | Verify without orderId/signature |
| POST | `/api/invoice/generate`, `GET /api/invoice/:id/pdf` | Invoice generation/download |
| POST | `/api/webhooks/payment/razorpay` | Server-to-server confirmation (signature-verified) |

## 2. End-to-end flow (brand pays influencer / brand pays vendor)

This is the flow actually wired to the UI, from `frontend/src/app/deals/influencer/[dealId]` and
`frontend/src/app/deals/vendor/[dealId]`, plus the `frontend/src/app/payments` dashboard.

```
1. Deal reaches an agreed state (finalTerms.agreedAmount set)
       │
2. Deal page loads → GET /api/payment/deal/:dealId
   (getDealPaymentAndInvoice: checks both VendorBrandDeal and
    InfluencerBrandDeal for the id, returns existing Payment if any,
    auto-verifies it with Razorpay if still pending)
       │
3. No payment yet → "Make Payment" → POST /api/payment/create
   paymentType: brand_to_influencer | brand_to_vendor
   → paymentCalculator computes tax + platform fee
   → Payment doc created (status: pending)
   → Razorpay order created via gateway, orderId saved on the Payment doc
       │
4. GET /api/settings/payment → razorpayKeyId for the client SDK
       │
5. Razorpay Checkout modal opens (checkout.razorpay.com/v1/checkout.js)
   user pays by card/UPI/etc.
       │
6a. Client-side: on success, handler fires with
    razorpay_payment_id/order_id/signature
    → POST /api/payment/razorpay/verify
    → HMAC signature checked, payment captured if only authorized,
      Payment doc → status: completed, Transaction docs created,
      invoice generated + PDF rendered, deal.finalTerms.paymentStatus
      flipped to "paid" (brand_to_vendor / influencer_to_vendor only —
      InfluencerBrandDeal has no paymentStatus field)
       │
6b. Server-side (belt and suspenders): Razorpay also POSTs
    payment.captured to /api/webhooks/payment/razorpay
    → same signature check + same completion logic, idempotent
      (no-ops if already completed)
       │
7. Invoice: POST /api/invoice/generate (if not already generated)
   → GET /api/invoice/:invoiceId/pdf → opened in a new tab
       │
8. /payments dashboard lists all payments (GET /api/payment/user),
   supports retrying a still-pending payment by re-opening Checkout
   against the SAME orderId already stored on the Payment doc
```

## 3. Separate flow: influencer pays vendor

`POST /api/payment/deal/create` + `GET /api/payment/deal/:dealId` also support a second flow
(`paymentType: influencer_to_vendor`) where an influencer pays a vendor for services on a
`VendorBrandDeal`, with the platform fee withheld from the vendor's payout rather than added to
the influencer's charge. The backend controller (`createPaymentFromDeal`) is fully implemented,
but **no frontend page currently calls it** — it isn't wired into any UI. Leave it in place for a
future vendor-payment screen, or remove it if it's confirmed dead.

## 4. Broken connections found and fixed

| # | Where | Problem | Fix |
|---|---|---|---|
| 1 | `services/razorpayService.ts` | Gateway keys were read **only** from the DB `Settings` document; `.env` values were never consulted, so a fresh clone had no working payment gateway until an admin manually saved keys in the settings UI. | `initialize()` now falls back to `process.env.RAZORPAY_KEY_ID` / `RAZORPAY_KEY_SECRET` when the DB fields are empty. |
| 2 | `routes/paymentWebhookRoutes.ts` | Webhook signature verification was commented out — **anyone** could POST a fake `payment.captured` event and mark an arbitrary payment as completed. | Added HMAC-SHA256 verification against `RAZORPAY_WEBHOOK_SECRET` using the raw request body; invalid/missing signatures are rejected with 400. |
| 3 | `server.ts` | `express.json()` had no `verify` callback, so no raw body was available to check a webhook signature against. | Added a `verify` callback that stashes the raw bytes on `req.rawBody`. |
| 4 | `controllers/paymentController.ts` — `getDealPaymentAndInvoice` (`GET /api/payment/deal/:dealId`) | Hardcoded to `VendorBrandDeal` + `paymentType: influencer_to_vendor`. Both frontend deal pages (influencer deal → `brand_to_influencer`, vendor deal → `brand_to_vendor`) call this endpoint, so it **never found the right deal or payment** — payment status/invoice never appeared on either deal page. | Now looks up the deal in both `VendorBrandDeal` and `InfluencerBrandDeal`, and queries `Payment.findOne({ dealId })` without restricting `paymentType` (a `dealId` is unique to one deal regardless of which payment type used it). |
| 5 | `controllers/paymentController.ts` / `razorpayController.ts` / `paymentWebhookRoutes.ts` | Deal-status flip to `"paid"` was gated to `paymentType === influencer_to_vendor` in five separate call sites, so `brand_to_vendor` payments never updated `deal.finalTerms.paymentStatus`, and the five copies could silently drift out of sync. | Extracted one shared `markDealAsPaidIfApplicable()` helper (exported from `paymentController.ts`) covering both `brand_to_vendor` and `influencer_to_vendor`; all five call sites now use it. |
| 6 | `frontend/src/app/payments/page.tsx` — `handleMakePayment` (retry from the Payments dashboard) | Called `razorpayService.createOrder()` to mint a **brand-new** Razorpay order instead of reusing the pending payment's existing order. The new order's id was never saved back onto the `Payment` doc, so the subsequent `/api/payment/razorpay/verify` call (`Payment.findOne({ orderId })`) 404'd — retrying a pending payment from the dashboard was broken. | Reuses `payment.orderId` (already returned by `GET /api/payment/user`) directly in `razorpayService.initializeCheckout()`; no new order is created. |
| 7 | `frontend/src/services/paymentService.ts` — `getUserPayments` | Backend returns `{ payments, pagination: { total, page, limit, totalPages } }`, but the frontend typed/read the response as a flat `{ payments, total, page, limit, totalPages }`. `total` and `totalPages` were always `undefined`, so pagination controls never rendered and the count shown was wrong. | Unwraps `pagination` and flattens it into the object the UI already expects. |
| 8 | `backend/controllers/invoiceController.ts` — `downloadInvoicePDF` | On first download (no `pdfUrl` yet), it generated the PDF but then returned the **stale in-memory** `invoice.pdfUrl` (still `null`) instead of the freshly generated URL — first-time invoice download returned a null URL. | Returns the URL from `generateInvoicePDF()`'s return value when one had to be generated. |

All backend and frontend TypeScript for the touched files compiles clean (`tsc --noEmit`) after
these fixes.

## 5. Still worth doing (not fixed, out of scope for this pass)

- `POST /api/payment/deal/create` / `checkAndAutoVerifyPayment` are unused by the current frontend
  (§3) — confirm whether they're needed for a future screen or should be removed.
- `frontend/src/services/paymentService.ts#verifyPayment` and
  `frontend/src/services/razorpayService.ts#verifyPayment` both hit
  `POST /api/payment/razorpay/verify` with the same payload in a different field order — harmless
  today, but worth consolidating into one client method.
- Balance tracking on `Transaction` docs is stubbed (`balanceBefore`/`balanceAfter` always `0`,
  marked `TODO` in `paymentController.ts`).
