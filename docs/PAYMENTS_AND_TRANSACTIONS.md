# SkillBridge Feature 08: Functional Payments & Transaction Management

## 1. Architectural Overview

SkillBridge implements an end-to-end payment workflow tailored for an Indian college marketplace context using **Razorpay Test Mode (Sandbox)**, backed authoritatively by Supabase PostgreSQL.

The system enforces **Zero Trust** for client-side pricing, requires server-side cryptographic HMAC-SHA256 signature verification for every transaction, and safeguards seller earnings calculations against client tampering.

```
[Buyer on Checkout Page / Modal]
               │
               ▼  1. POST /api/payments/create-order { serviceId, requirements }
[SkillBridge Server API]
       ├── Validates UUID syntax & queries public.services table
       ├── Enforces Anti-Self-Booking: buyer_id <> seller_id
       ├── Extracts authoritative DB price (INR) and converts to Paise (price * 100)
       ├── Inserts Order (status: pending_payment, payment_status: pending)
       ├── Inserts Payment attempt (status: pending, gateway_order_id)
       └── Generates Razorpay Order (order_rzp_...)
               │
               ▼  2. Returns { orderId, razorpayOrderId, amountInPaise, keyId }
[Razorpay Sandbox Client Authorization]
               │
               ▼  3. POST /api/payments/verify { orderId, razorpayOrderId, razorpayPaymentId, razorpaySignature }
[SkillBridge Server API]
       ├── Computes HMAC_SHA256(orderId + "|" + paymentId, RAZORPAY_KEY_SECRET)
       ├── Verifies signature using constant-time comparison
       ├── IF INVALID: Marks payment 'failed', returns 400 Bad Request
       └── IF VALID:
             ├── Idempotency check: prevents duplicate confirmations
             ├── Transitions Order to 'seller_pending' & payment_status to 'paid'
             ├── Records gateway_payment_id & signature in public.payments
             └── Notifies seller to review & accept project
               │
               ▼  4. Order Workspace (/orders/[id]) Unlocked
```

---

## 2. Root Cause Analysis: "Service Not Found" Resolution

### The Actual Root Cause
During investigation of the reported "service not found" error, two underlying causes were uncovered:

1. **Unchecked Non-UUID Strings in PostgreSQL PostgREST Queries**:
   When legacy mock IDs (such as `srv-1`, `srv-test-101`) or malformed parameters were passed to `getServiceById(id)`, PostgREST queried `services.id = id` directly on a PostgreSQL `uuid` column. This triggered PostgreSQL error **`22P02: invalid input syntax for type uuid`**. The client layer treated this error as `data: null`, falling back to `getServiceDetail(id)` which returned `null`, rendering the "Service not found" UI.
2. **Missing Dedicated Checkout Page Route**:
   When users refreshed, bookmarked, or navigated directly to `/checkout?serviceId=...`, Next.js returned a **404 Not Found** because checkout only existed as an in-page modal without a corresponding App Router page.

### The Fix
1. **UUID Syntax Validation**:
   Introduced `isValidUUID` regex check in [`lib/services/services.ts`](file:///e:/MITWPU/Engineering/3rd%20Year/SEM/Project/project/lib/services/services.ts) that verifies standard 36-character UUID format before making database calls. Malformed or mock strings gracefully fall back without causing PostgreSQL `22P02` exceptions.
2. **Dedicated `/checkout` Page**:
   Created [`app/(main)/checkout/page.tsx`](file:///e:/MITWPU/Engineering/3rd%20Year/SEM/Project/project/app/(main)/checkout/page.tsx) to handle `?serviceId=...` queries directly, validate listing existence and published status, prevent self-booking, and execute the payment flow.

---

## 3. Provider Configuration & Environment Variables

The payment integration operates in **Razorpay Test Mode (Sandbox)**. Configure the following environment variables:

```env
# Razorpay Payment Sandbox Configuration (Test Mode Only)
NEXT_PUBLIC_RAZORPAY_KEY_ID=rzp_test_skillbridge_sandbox
RAZORPAY_KEY_ID=rzp_test_skillbridge_sandbox
RAZORPAY_KEY_SECRET=sk_test_mock_secret_sbx_99214
RAZORPAY_WEBHOOK_SECRET=whsec_skillbridge_webhook_secret_9921
```

> [!IMPORTANT]
> - `NEXT_PUBLIC_RAZORPAY_KEY_ID`: Exposed to the browser to initialize the client checkout widget.
> - `RAZORPAY_KEY_SECRET`: **NEVER exposed to the browser**. Used exclusively on the server to cryptographically sign and verify payment signatures.
> - `RAZORPAY_WEBHOOK_SECRET`: **NEVER exposed to the browser**. Used to verify Razorpay webhook payloads.

---

## 4. Cryptographic Server Verification Engine

Client-side requests can **never** mark payments as `paid` or release escrow funds. All verification occurs server-side via [`app/api/payments/verify/route.ts`](file:///e:/MITWPU/Engineering/3rd%20Year/SEM/Project/project/app/api/payments/verify/route.ts):

### Formula:
$$\text{Expected Signature} = \text{HMAC-SHA256}(\text{razorpay\_order\_id} + \text{"|"} + \text{razorpay\_payment\_id}, \text{RAZORPAY\_KEY\_SECRET})$$

```typescript
export function verifyPaymentSignature(params: VerifySignatureParams): boolean {
  const { razorpayOrderId, razorpayPaymentId, razorpaySignature } = params;
  const payload = `${razorpayOrderId}|${razorpayPaymentId}`;
  const expected = crypto
    .createHmac('sha256', RAZORPAY_KEY_SECRET)
    .update(payload)
    .digest('hex');

  if (expected.length !== razorpaySignature.length) return false;
  return crypto.timingSafeEqual(Buffer.from(expected, 'utf8'), Buffer.from(razorpaySignature, 'utf8'));
}
```

If an altered or spoofed signature is submitted:
1. Server returns `400 Bad Request`.
2. Payment record in `public.payments` is marked `status = 'failed'`.
3. Order in `public.orders` is marked `payment_status = 'failed'`.

---

## 5. Webhook Handling & Idempotency

Asynchronous server-to-server callbacks from Razorpay are processed at [`POST /api/payments/webhook`](file:///e:/MITWPU/Engineering/3rd%20Year/SEM/Project/project/app/api/payments/webhook/route.ts):

1. **Signature Validation**: Checks `x-razorpay-signature` header against the raw request body using `RAZORPAY_WEBHOOK_SECRET`.
2. **Deduplication**: Tracks processed event IDs in `public.payment_webhook_events` to prevent duplicate processing.
3. **Supported Events**:
   - `payment.captured` / `order.paid`: Confirms payment and advances order to `seller_pending`.
   - `payment.failed`: Records failure reason and marks order `payment_status = 'failed'`.
   - `refund.processed`: Marks payment `status = 'refunded'`.

---

## 6. Accounting & Seller Earnings Consistency

Authoritative seller balances are dynamically calculated from database orders in [`lib/services/orders.ts`](file:///e:/MITWPU/Engineering/3rd%20Year/SEM/Project/project/lib/services/orders.ts):

| Financial Field | Authoritative Calculation | Excluded States |
| :--- | :--- | :--- |
| **Total Earned** | $\sum \text{price}$ where `status = 'completed'` AND `payment_status = 'paid'` | Cancelled, rejected, failed, pending, active |
| **Held in Escrow** | $\sum \text{price}$ where `payment_status = 'paid'` AND `status NOT IN ('completed', 'cancelled', 'rejected')` | Unpaid, completed, cancelled, rejected |
| **Available Payout**| Equals Total Earned | Any funds still in escrow |

---

## 7. Important Financial Limitations & Disclaimers

> [!WARNING]
> ### Student Project Sandbox Disclaimer
> 1. **Test Mode Only**: SkillBridge operates strictly with test credentials (`rzp_test_...`). No real money is debited or credited during any checkout.
> 2. **Platform Escrow Hold vs Legal Escrow**: SkillBridge's "escrow" is an **internal peer milestone hold** managed by database state transitions (`paid` $\rightarrow$ `seller_pending` $\rightarrow$ `completed` $\rightarrow$ released). It is **not** a legally certified banking escrow account under RBI regulations.
> 3. **Production Readiness**: Deploying to real campus transactions requires upgrading to a Razorpay Live Account with formal KYC, merchant onboarding, and an approved Route / Split payment integration.
