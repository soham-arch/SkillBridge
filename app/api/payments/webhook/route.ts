import { NextResponse } from 'next/server';
import { getServerSupabaseClient } from '@/lib/auth/server-seller';
import { verifyWebhookSignature } from '@/lib/payments/razorpay';

// In-memory processed cache for fast deduplication
const processedEventIds = new Set<string>();

/**
 * POST /api/payments/webhook
 *
 * Handles asynchronous server-to-server webhook callbacks from Razorpay:
 * 1. Validates webhook signature using RAZORPAY_WEBHOOK_SECRET
 * 2. Deduplicates events for idempotent processing
 * 3. Handles 'payment.captured', 'order.paid', 'payment.failed'
 * 4. Authoritatively syncs payments and orders tables
 */
export async function POST(req: Request) {
  try {
    const signature = req.headers.get('x-razorpay-signature') || '';
    const rawBody = await req.text();

    // 1. Authoritative Webhook Signature Verification
    const isValid = verifyWebhookSignature(rawBody, signature);
    if (!isValid) {
      console.warn('SECURITY ALERT: Rejected invalid Razorpay webhook signature');
      return NextResponse.json(
        { error: 'Invalid webhook signature.' },
        { status: 400 }
      );
    }

    let event: any;
    try {
      event = JSON.parse(rawBody);
    } catch {
      return NextResponse.json({ error: 'Malformed JSON payload.' }, { status: 400 });
    }

    const eventId = event?.event_id || event?.id || `evt_${Date.now()}`;
    const eventType = event?.event || 'payment.captured';

    // 2. Idempotency Check
    if (processedEventIds.has(eventId)) {
      return NextResponse.json({
        received: true,
        status: 'already_processed',
        eventId,
      });
    }

    const supabase = getServerSupabaseClient();
    const now = new Date().toISOString();

    // Check database deduplication if payment_webhook_events table exists
    try {
      const { data: existing } = await supabase
        .from('payment_webhook_events')
        .select('id')
        .eq('event_id', eventId)
        .maybeSingle();

      if (existing) {
        processedEventIds.add(eventId);
        return NextResponse.json({
          received: true,
          status: 'already_processed',
          eventId,
        });
      }

      await supabase.from('payment_webhook_events').insert({
        event_id: eventId,
        event_type: eventType,
        provider: 'razorpay',
        payload: event,
        processed: true,
        processed_at: now,
      });
    } catch {
      // Table may not yet be provisioned; in-memory deduplication continues
    }

    processedEventIds.add(eventId);

    // 3. Process Event Payload
    const paymentEntity = event?.payload?.payment?.entity;
    const orderEntity = event?.payload?.order?.entity;

    const gatewayOrderId = paymentEntity?.order_id || orderEntity?.id;
    const gatewayPaymentId = paymentEntity?.id;
    const paymentMethod = paymentEntity?.method || 'upi';

    if (eventType === 'payment.captured' || eventType === 'order.paid') {
      if (gatewayOrderId) {
        // Find payment by gateway_order_id
        const { data: paymentRecord } = await supabase
          .from('payments')
          .select('id, order_id, status, gateway_payment_id')
          .eq('gateway_order_id', gatewayOrderId)
          .maybeSingle();

        if (paymentRecord && paymentRecord.status !== 'paid') {
          await supabase
            .from('payments')
            .update({
              status: 'paid',
              gateway_payment_id: gatewayPaymentId || paymentRecord.gateway_payment_id,
              paid_at: now,
            })
            .eq('id', paymentRecord.id);

          await supabase
            .from('orders')
            .update({
              status: 'seller_pending',
              payment_status: 'paid',
              payment_id: gatewayPaymentId,
              payment_method: paymentMethod,
              updated_at: now,
            })
            .eq('id', paymentRecord.order_id);
        }
      }
    } else if (eventType === 'payment.failed') {
      if (gatewayOrderId) {
        const errorDesc = paymentEntity?.error_description || 'Payment failed';
        await supabase
          .from('payments')
          .update({
            status: 'failed',
            error_message: errorDesc,
          })
          .eq('gateway_order_id', gatewayOrderId);

        const { data: pRec } = await supabase
          .from('payments')
          .select('order_id')
          .eq('gateway_order_id', gatewayOrderId)
          .maybeSingle();

        if (pRec?.order_id) {
          await supabase
            .from('orders')
            .update({
              payment_status: 'failed',
              updated_at: now,
            })
            .eq('id', pRec.order_id);
        }
      }
    }

    return NextResponse.json({
      received: true,
      processed: true,
      eventId,
      eventType,
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Webhook error';
    console.error('Error in POST /api/payments/webhook:', err);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
