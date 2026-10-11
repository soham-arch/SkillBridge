import { NextResponse } from 'next/server';
import { extractAuthToken, getServerSupabaseClient } from '@/lib/auth/server-seller';
import { isValidUUID } from '@/lib/services/services';

/**
 * POST /api/payments/cancel
 *
 * Handles checkout cancellation or buyer abandonment:
 * 1. Authenticates buyer session
 * 2. Verifies order is in pending_payment state
 * 3. Transitions payment record to 'cancelled'
 * 4. Transitions order to 'cancelled' with cancellation reason
 * 5. Frees any locked calendar consultation slot
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
    const { orderId, reason = 'Buyer cancelled payment before authorization.' } = body;

    if (!orderId || !isValidUUID(orderId)) {
      return NextResponse.json(
        { error: 'Valid order identifier is required.' },
        { status: 400 }
      );
    }

    // 2. Fetch order
    const { data: order, error: orderErr } = await supabase
      .from('orders')
      .select('*')
      .eq('id', orderId)
      .maybeSingle();

    if (orderErr || !order) {
      return NextResponse.json(
        { error: 'Order not found.' },
        { status: 404 }
      );
    }

    if (order.buyer_id !== user.id) {
      return NextResponse.json(
        { error: 'Forbidden: Only the buyer can cancel an unconfirmed checkout.' },
        { status: 403 }
      );
    }

    // 3. Prevent cancelling an already-paid order through checkout cancellation
    if (order.payment_status === 'paid') {
      return NextResponse.json(
        { error: 'Cannot cancel an order through checkout cancellation once payment has been confirmed. Use standard order cancellation.' },
        { status: 400 }
      );
    }

    // 4. Try atomic cancellation RPC
    const { data: rpcData, error: rpcErr } = await supabase.rpc('cancel_payment_order', {
      p_order_id: orderId,
      p_buyer_id: user.id,
      p_reason: reason,
    });

    if (!rpcErr && rpcData?.success) {
      return NextResponse.json({
        success: true,
        orderId: order.id,
        status: 'cancelled',
        paymentStatus: 'failed',
      });
    }

    // Fallback direct database update
    const now = new Date().toISOString();
    const newTimelineEntry = {
      status: 'cancelled',
      title: 'Checkout Cancelled',
      description: reason,
      timestamp: now,
      actor_id: user.id,
    };

    await supabase
      .from('orders')
      .update({
        status: 'cancelled',
        payment_status: 'failed',
        cancellation_reason: reason,
        cancelled_at: now,
        timeline: [...(order.timeline || []), newTimelineEntry],
        updated_at: now,
      })
      .eq('id', orderId);

    await supabase
      .from('payments')
      .update({
        status: 'cancelled',
        error_message: reason,
      })
      .eq('order_id', orderId);

    if (order.booking_id) {
      await supabase
        .from('bookings')
        .update({ status: 'cancelled' })
        .eq('id', order.booking_id);
    }

    return NextResponse.json({
      success: true,
      orderId: order.id,
      status: 'cancelled',
      paymentStatus: 'failed',
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to cancel checkout.';
    console.error('Error in POST /api/payments/cancel:', err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
