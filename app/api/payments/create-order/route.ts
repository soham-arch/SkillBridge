import { NextResponse } from 'next/server';
import { extractAuthToken, getServerSupabaseClient } from '@/lib/auth/server-seller';
import { createRazorpayOrder, RAZORPAY_KEY_ID } from '@/lib/payments/razorpay';
import { isValidUUID } from '@/lib/services/services';
import type { PaymentMethod } from '@/types';

/**
 * POST /api/payments/create-order
 *
 * Authoritatively creates a persistent payment order server-side:
 * 1. Authenticates caller session
 * 2. Validates service identifier and queries authoritative price/currency from database
 * 3. Enforces anti-self-booking (buyer_id <> seller_id)
 * 4. Generates server Razorpay Test Mode order in paise
 * 5. Persists order (status: pending_payment) and payment (status: pending) records
 */
export async function POST(req: Request) {
  try {
    const token = extractAuthToken(req);
    const supabase = getServerSupabaseClient(token);

    // 1. Authenticate user
    const { data: { user }, error: authErr } = await supabase.auth.getUser();
    if (authErr || !user) {
      return NextResponse.json(
        { error: 'Unauthorized. Please sign in to checkout.' },
        { status: 401 }
      );
    }

    const body = await req.json();
    const {
      serviceId,
      requirements,
      paymentMethod = 'upi',
      orderType = 'fixed_gig',
      consultationDetails,
    } = body;

    // 2. Validate service identifier
    if (!serviceId || !isValidUUID(serviceId)) {
      return NextResponse.json(
        { error: 'Valid service identifier is required.' },
        { status: 400 }
      );
    }

    // 3. Authoritatively fetch service from database
    const { data: service, error: svcErr } = await supabase
      .from('services')
      .select('id, provider_id, title, price, delivery_days, status, service_type')
      .eq('id', serviceId)
      .maybeSingle();

    if (svcErr || !service) {
      return NextResponse.json(
        { error: `Service listing not found for ID "${serviceId}".` },
        { status: 404 }
      );
    }

    // 4. Validate listing lifecycle status
    if (service.status !== 'published') {
      return NextResponse.json(
        { error: `Cannot checkout: This service listing is currently ${service.status}.` },
        { status: 400 }
      );
    }

    // 5. Anti-self-booking invariant: buyer cannot purchase their own listing
    if (service.provider_id === user.id) {
      return NextResponse.json(
        { error: 'Self-booking prohibited: You cannot purchase your own service listing.' },
        { status: 400 }
      );
    }

    // 6. Validate requirements
    const cleanRequirements = (requirements || '').trim();
    if (orderType === 'fixed_gig' && !cleanRequirements) {
      return NextResponse.json(
        { error: 'Please provide clear project requirements or deliverables description.' },
        { status: 400 }
      );
    }

    // 7. Authoritative price & currency from database (NEVER TRUST CLIENT AMOUNT)
    const verifiedPrice = Number(service.price);
    const currency = 'INR';
    const deliveryDays = service.delivery_days || 3;
    const dueDate = new Date(Date.now() + deliveryDays * 24 * 60 * 60 * 1000).toISOString();
    const now = new Date().toISOString();

    // 8. Create Razorpay Test Sandbox order
    const razorpayOrder = await createRazorpayOrder({
      amount: verifiedPrice,
      currency,
      receipt: `rcpt_${user.id.slice(0, 6)}_${Date.now()}`,
      notes: {
        service_id: service.id,
        buyer_id: user.id,
        seller_id: service.provider_id,
        order_type: orderType,
      },
    });

    const initialTimeline = [
      {
        status: 'pending_payment',
        title: 'Checkout Initiated',
        description: `Order created via Razorpay Test Sandbox (${razorpayOrder.id}). Awaiting buyer authorization.`,
        timestamp: now,
        actor_id: user.id,
      },
    ];

    // 9. Persist Order in database with status pending_payment
    const { data: order, error: orderErr } = await supabase
      .from('orders')
      .insert({
        service_id: service.id,
        buyer_id: user.id,
        seller_id: service.provider_id,
        price: verifiedPrice,
        requirements: cleanRequirements || 'Consultation Session Scheduled',
        delivery_days: deliveryDays,
        due_date: dueDate,
        status: 'pending_payment',
        payment_status: 'pending',
        payment_method: paymentMethod as PaymentMethod,
        order_type: orderType,
        consultation_details: consultationDetails || null,
        timeline: initialTimeline,
        service_snapshot: {
          id: service.id,
          title: service.title,
          price: verifiedPrice,
          currency,
          delivery_days: deliveryDays,
          service_type: service.service_type,
        },
        created_at: now,
        updated_at: now,
      })
      .select(`
        *,
        service:services(*, category:categories(*)),
        seller:profiles!orders_seller_id_fkey(id, full_name, avatar_url, college)
      `)
      .single();

    if (orderErr || !order) {
      console.error('Failed to persist order in database:', orderErr);
      return NextResponse.json(
        { error: 'Failed to create persistent order record in database.' },
        { status: 500 }
      );
    }

    // 10. Persist Payment record in database with status pending
    const { data: payment, error: payErr } = await supabase
      .from('payments')
      .insert({
        order_id: order.id,
        buyer_id: user.id,
        seller_id: service.provider_id,
        amount: verifiedPrice,
        currency,
        gateway_order_id: razorpayOrder.id,
        payment_method: paymentMethod,
        status: 'pending',
        metadata: {
          razorpay_order_id: razorpayOrder.id,
          amount_in_paise: razorpayOrder.amount,
          sandbox: true,
          created_at: now,
        },
        created_at: now,
      })
      .select('*')
      .single();

    if (payErr) {
      console.warn('Payment record insert warning:', payErr.message);
    }

    return NextResponse.json({
      success: true,
      orderId: order.id,
      razorpayOrderId: razorpayOrder.id,
      amount: verifiedPrice,
      amountInPaise: razorpayOrder.amount,
      currency,
      keyId: RAZORPAY_KEY_ID,
      paymentId: payment?.id,
      serviceSnapshot: {
        id: service.id,
        title: service.title,
        price: verifiedPrice,
        deliveryDays,
        provider: order.seller,
      },
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to create payment order.';
    console.error('Error in POST /api/payments/create-order:', err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
