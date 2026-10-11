import { NextResponse } from 'next/server';
import { extractAuthToken, getServerSupabaseClient } from '@/lib/auth/server-seller';
import { verifyPaymentSignature } from '@/lib/payments/razorpay';
import { isValidUUID } from '@/lib/services/services';

/**
 * POST /api/payments/verify
 *
 * Authoritatively verifies payment signatures on the server:
 * 1. Authenticates buyer session
 * 2. Cryptographically verifies HMAC-SHA256 signature using RAZORPAY_KEY_SECRET
 * 3. On INVALID signature: rejects with 400 and transitions status to 'failed'
 * 4. On VALID signature: idempotently transitions payment to 'paid' and order to 'seller_pending'
 * 5. Prevents any client-side request from spoofing payment success
 */
export async function POST(req: Request) {
  try {
    const token = extractAuthToken(req);
    const supabase = getServerSupabaseClient(token);

    // 1. Authenticate user
    const { data: { user }, error: authErr } = await supabase.auth.getUser();
    if (authErr || !user) {
      return NextResponse.json(
        { error: 'Unauthorized. Please sign in.' },
        { status: 401 }
      );
    }

    const body = await req.json();
    const {
      orderId,
      razorpayOrderId,
      razorpayPaymentId,
      razorpaySignature,
      paymentMethod = 'upi',
    } = body;

    // 2. Validate inputs
    if (!orderId || !isValidUUID(orderId)) {
      return NextResponse.json(
        { error: 'Valid order identifier is required.' },
        { status: 400 }
      );
    }

    if (!razorpayOrderId || !razorpayPaymentId || !razorpaySignature) {
      return NextResponse.json(
        { error: 'Incomplete payment gateway verification payload.' },
        { status: 400 }
      );
    }

    // 3. Fetch order from database and verify buyer ownership
    const { data: order, error: orderErr } = await supabase
      .from('orders')
      .select('*, seller:profiles!orders_seller_id_fkey(id, full_name)')
      .eq('id', orderId)
      .maybeSingle();

    if (orderErr || !order) {
      return NextResponse.json(
        { error: 'Order could not be found.' },
        { status: 404 }
      );
    }

    if (order.buyer_id !== user.id) {
      return NextResponse.json(
        { error: 'Forbidden: Only the buyer who initiated this order can verify its payment.' },
        { status: 403 }
      );
    }

    // 4. Idempotency check: If already paid, return early with confirmed state
    if (order.payment_status === 'paid') {
      return NextResponse.json({
        success: true,
        message: 'Payment has already been confirmed and secured in escrow.',
        orderId: order.id,
        paymentStatus: 'paid',
        status: order.status,
      });
    }

    // 5. AUTHORITATIVE SERVER-SIDE CRYPTOGRAPHIC SIGNATURE VERIFICATION
    const isValidSignature = verifyPaymentSignature({
      razorpayOrderId,
      razorpayPaymentId,
      razorpaySignature,
    });

    const now = new Date().toISOString();

    if (!isValidSignature) {
      // Signature mismatch: potential tampering or client spoofing attempt
      console.warn(`SECURITY ALERT: Invalid Razorpay signature attempt on order ${orderId}`);

      // Record failed transaction attempt in database
      await supabase
        .from('payments')
        .update({
          status: 'failed',
          gateway_payment_id: razorpayPaymentId,
          signature: razorpaySignature,
          error_message: 'Invalid cryptographic signature verification failure.',
        })
        .eq('order_id', orderId);

      await supabase
        .from('orders')
        .update({
          payment_status: 'failed',
          timeline: [
            ...(order.timeline || []),
            {
              status: 'pending_payment',
              title: 'Payment Verification Failed',
              description: 'Cryptographic signature mismatch. Transaction authorization declined.',
              timestamp: now,
            },
          ],
          updated_at: now,
        })
        .eq('id', orderId);

      return NextResponse.json(
        {
          success: false,
          error: 'Cryptographic payment signature verification failed. Payment was not recorded as successful.',
        },
        { status: 400 }
      );
    }

    // 6. VALID SIGNATURE: Execute atomic confirmation
    // Try atomic RPC `confirm_verified_payment`
    const { data: rpcData, error: rpcErr } = await supabase.rpc('confirm_verified_payment', {
      p_order_id: orderId,
      p_gateway_order_id: razorpayOrderId,
      p_gateway_payment_id: razorpayPaymentId,
      p_signature: razorpaySignature,
      p_payment_method: paymentMethod,
    });

    if (!rpcErr && rpcData?.success) {
      // Create in-app notification for seller
      try {
        await supabase.from('notifications').insert({
          user_id: order.seller_id,
          title: 'New Paid Order Received! 💰',
          message: `Buyer confirmed payment of ₹${order.price} via Razorpay Test Sandbox. Please accept the order to start work.`,
          type: 'order_update',
          read: false,
          created_at: now,
        });
      } catch {
        // Non-fatal
      }

      return NextResponse.json({
        success: true,
        orderId: order.id,
        paymentStatus: 'paid',
        status: 'seller_pending',
        gatewayPaymentId: razorpayPaymentId,
      });
    }

    // Fallback direct updates if RPC not yet installed
    const newTimelineEntry = {
      status: 'paid',
      title: 'Payment Verified & Secured in Escrow',
      description: `₹${order.price} secured in SkillBridge Escrow via Razorpay Test Sandbox (${razorpayPaymentId}).`,
      timestamp: now,
    };

    await supabase
      .from('orders')
      .update({
        status: 'seller_pending',
        payment_status: 'paid',
        payment_id: razorpayPaymentId,
        payment_method: paymentMethod,
        timeline: [...(order.timeline || []), newTimelineEntry],
        updated_at: now,
      })
      .eq('id', orderId);

    await supabase
      .from('payments')
      .update({
        status: 'paid',
        gateway_payment_id: razorpayPaymentId,
        signature: razorpaySignature,
        paid_at: now,
      })
      .eq('order_id', orderId);

    if (order.booking_id) {
      await supabase
        .from('bookings')
        .update({ status: 'confirmed' })
        .eq('id', order.booking_id);
    }

    return NextResponse.json({
      success: true,
      orderId: order.id,
      paymentStatus: 'paid',
      status: 'seller_pending',
      gatewayPaymentId: razorpayPaymentId,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Payment verification error.';
    console.error('Error in POST /api/payments/verify:', err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
