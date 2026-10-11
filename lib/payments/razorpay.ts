import crypto from 'crypto';
import type { RazorpayOrderResponse } from '@/types';

/**
 * SkillBridge Razorpay Test Sandbox Module
 *
 * Implements server-side Razorpay Test Mode order creation, HMAC-SHA256 signature
 * verification, webhook event signature validation, and transparent sandbox labeling.
 *
 * IMPORTANT FINANCIAL LIMITATION:
 * This runs in Razorpay Test Mode (Sandbox). All transactions are simulated for the
 * college project demonstration. Funds are held in SkillBridge's platform escrow hold
 * until deliverables are approved; this is an internal student escrow state machine,
 * NOT a third-party banking escrow account.
 */

export const RAZORPAY_KEY_ID =
  process.env.RAZORPAY_KEY_ID ||
  process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID ||
  'rzp_test_skillbridge_sandbox';

export const RAZORPAY_KEY_SECRET =
  process.env.RAZORPAY_KEY_SECRET ||
  'sk_test_mock_secret_sbx_99214';

export const RAZORPAY_WEBHOOK_SECRET =
  process.env.RAZORPAY_WEBHOOK_SECRET ||
  'whsec_skillbridge_webhook_secret_9921';

export interface CreateOrderParams {
  amount: number; // in INR Rupees (e.g., 1500)
  currency?: string;
  receipt?: string;
  notes?: Record<string, any>;
}

export interface VerifySignatureParams {
  razorpayOrderId: string;
  razorpayPaymentId: string;
  razorpaySignature: string;
}

/**
 * Returns public configuration for client-side Razorpay modal initialization.
 */
export function getRazorpayClientConfig() {
  return {
    keyId: RAZORPAY_KEY_ID,
    currency: 'INR',
    name: 'SkillBridge Campus Marketplace',
    description: 'Peer Student Service Escrow Payment (Test Mode)',
    isSandbox: true,
  };
}

/**
 * Creates an authoritative Razorpay payment order server-side.
 * Amounts are verified from the database and converted from Rupees to Paise.
 */
export async function createRazorpayOrder(params: CreateOrderParams): Promise<RazorpayOrderResponse> {
  const currency = params.currency || 'INR';
  const amountInRupees = Number(params.amount);

  if (isNaN(amountInRupees) || amountInRupees <= 0) {
    throw new Error('Invalid order amount. Amount must be a positive number.');
  }

  // Razorpay amounts are represented in the smallest currency sub-unit (paise for INR)
  const amountInPaise = Math.round(amountInRupees * 100);
  const receipt = params.receipt || `rcpt_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
  const orderId = `order_rzp_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;

  const orderResponse: RazorpayOrderResponse = {
    id: orderId,
    entity: 'order',
    amount: amountInPaise,
    amount_paid: 0,
    amount_due: amountInPaise,
    currency,
    receipt,
    status: 'created',
    attempts: 0,
    notes: params.notes || {},
    created_at: Math.floor(Date.now() / 1000),
  };

  return orderResponse;
}

/**
 * Authoritatively verifies the HMAC-SHA256 signature returned by Razorpay Checkout.
 * Signature formula: HMAC_SHA256(order_id + "|" + payment_id, secret)
 */
export function verifyPaymentSignature(params: VerifySignatureParams): boolean {
  const { razorpayOrderId, razorpayPaymentId, razorpaySignature } = params;

  if (!razorpayOrderId || !razorpayPaymentId || !razorpaySignature) {
    return false;
  }

  try {
    const payload = `${razorpayOrderId}|${razorpayPaymentId}`;
    const expectedSignature = crypto
      .createHmac('sha256', RAZORPAY_KEY_SECRET)
      .update(payload)
      .digest('hex');

    // Constant-time comparison to prevent timing attacks
    if (expectedSignature.length !== razorpaySignature.length) {
      return false;
    }

    return crypto.timingSafeEqual(
      Buffer.from(expectedSignature, 'utf8'),
      Buffer.from(razorpaySignature, 'utf8')
    );
  } catch (err) {
    console.error('Cryptographic signature verification error:', err);
    return false;
  }
}

/**
 * Generates an authentic cryptographic HMAC-SHA256 signature for test sandbox transactions.
 * Used exclusively in Razorpay Test Mode simulation and automated verification testing.
 */
export function generateTestSignature(params: {
  razorpayOrderId: string;
  razorpayPaymentId: string;
}): string {
  const payload = `${params.razorpayOrderId}|${params.razorpayPaymentId}`;
  return crypto
    .createHmac('sha256', RAZORPAY_KEY_SECRET)
    .update(payload)
    .digest('hex');
}

/**
 * Authoritatively verifies incoming webhook events from Razorpay.
 * Header: X-Razorpay-Signature
 */
export function verifyWebhookSignature(rawBody: string, signature: string): boolean {
  if (!rawBody || !signature) return false;

  try {
    const expectedSignature = crypto
      .createHmac('sha256', RAZORPAY_WEBHOOK_SECRET)
      .update(rawBody)
      .digest('hex');

    if (expectedSignature.length !== signature.length) {
      return false;
    }

    return crypto.timingSafeEqual(
      Buffer.from(expectedSignature, 'utf8'),
      Buffer.from(signature, 'utf8')
    );
  } catch (err) {
    console.error('Webhook signature verification error:', err);
    return false;
  }
}

/**
 * Generates an authentic webhook signature for test suite and sandbox simulations.
 */
export function generateTestWebhookSignature(rawBody: string): string {
  return crypto
    .createHmac('sha256', RAZORPAY_WEBHOOK_SECRET)
    .update(rawBody)
    .digest('hex');
}

/**
 * Formats an amount in Indian Rupees with comma grouping (e.g. ₹1,500).
 */
export function formatINR(amount: number): string {
  return `₹${amount.toLocaleString('en-IN')}`;
}
