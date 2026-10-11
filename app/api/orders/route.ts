import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://eldmwjkolqqdhfqcawvg.supabase.co';
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

function getSupabaseClient() {
  return createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
}

export async function POST(req: NextRequest) {
  try {
    const supabase = getSupabaseClient();
    const body = await req.json().catch(() => ({}));

    const {
      serviceId,
      buyerId,
      orderType = 'fixed_gig',
      requirements = '',
      paymentMethod = 'upi',
      bookingDate,
      startTime,
      endTime,
      note = '',
      simulateSuccess = true,
    } = body;

    // 1. Validate required fields
    if (!serviceId || !buyerId) {
      return NextResponse.json(
        { error: 'serviceId and buyerId are required.' },
        { status: 400 }
      );
    }

    // 2. Fetch service listing to verify ownership & status
    const { data: service, error: svcErr } = await supabase
      .from('services')
      .select('id, provider_id, title, description, price, delivery_days, service_type, location, status')
      .eq('id', serviceId)
      .single();

    if (svcErr || !service) {
      return NextResponse.json(
        { error: 'Service listing not found.' },
        { status: 404 }
      );
    }

    // 3. Status check: Only published services can be ordered or booked
    if (service.status !== 'published') {
      return NextResponse.json(
        { error: `This service is currently ${service.status} and cannot accept new bookings or orders.` },
        { status: 400 }
      );
    }

    // 4. Anti-Self-Booking validation
    if (service.provider_id === buyerId) {
      return NextResponse.json(
        { error: 'You cannot hire or book your own service listing.' },
        { status: 400 }
      );
    }

    // 5. Try atomic PostgreSQL RPC `create_unified_booking_order`
    const { data: rpcData, error: rpcErr } = await supabase.rpc('create_unified_booking_order', {
      p_service_id: serviceId,
      p_buyer_id: buyerId,
      p_order_type: orderType,
      p_requirements: requirements,
      p_payment_method: paymentMethod,
      p_booking_date: bookingDate || null,
      p_start_time: startTime || null,
      p_end_time: endTime || null,
      p_note: note || '',
      p_simulate_success: simulateSuccess !== false,
    });

    if (!rpcErr && rpcData?.order_id) {
      return NextResponse.json(
        {
          success: true,
          orderId: rpcData.order_id,
          bookingId: rpcData.booking_id,
          paymentId: rpcData.payment_id,
          status: rpcData.order_status,
          paymentStatus: rpcData.payment_status,
        },
        { status: 201 }
      );
    }

    // 6. Direct fallback handling if RPC is pending migration execution
    let bookingId: string | null = null;
    let consultationDetails: any = null;
    const now = new Date().toISOString();

    if (orderType === 'consultation') {
      if (!bookingDate || !startTime || !endTime) {
        return NextResponse.json(
          { error: 'Consultations require bookingDate, startTime, and endTime.' },
          { status: 400 }
        );
      }

      const todayStr = new Date().toISOString().split('T')[0];
      if (bookingDate < todayStr) {
        return NextResponse.json(
          { error: 'Cannot book a consultation date in the past.' },
          { status: 400 }
        );
      }

      // Check slot availability and conflicting bookings
      const { data: conflicts } = await supabase
        .from('bookings')
        .select('id')
        .eq('provider_id', service.provider_id)
        .eq('booking_date', bookingDate)
        .eq('start_time', startTime)
        .eq('status', 'confirmed');

      if (conflicts && conflicts.length > 0) {
        return NextResponse.json(
          { error: 'This time slot has already been booked. Please choose another.' },
          { status: 409 }
        );
      }

      // Create booking record
      const { data: newBooking, error: bookingErr } = await supabase
        .from('bookings')
        .insert({
          service_id: serviceId,
          customer_id: buyerId,
          provider_id: service.provider_id,
          booking_date: bookingDate,
          start_time: startTime,
          end_time: endTime,
          status: 'confirmed',
          note: note || requirements || '',
        })
        .select('id')
        .single();

      if (!bookingErr && newBooking) {
        bookingId = newBooking.id;
      }

      consultationDetails = {
        booking_date: bookingDate,
        start_time: startTime,
        end_time: endTime,
        location: service.location,
        note: note || requirements,
      };
    }

    const deliveryDays = service.delivery_days || 3;
    const dueDate = orderType === 'consultation'
      ? `${bookingDate}T${endTime}:00Z`
      : new Date(Date.now() + deliveryDays * 24 * 60 * 60 * 1000).toISOString();

    const orderStatus = simulateSuccess !== false ? 'seller_pending' : 'pending_payment';
    const paymentStatus = simulateSuccess !== false ? 'paid' : 'failed';
    const paymentId = 'pay_rzp_' + Math.random().toString(36).substring(2, 9);

    const timeline = [
      {
        status: 'pending_payment',
        title: orderType === 'consultation' ? 'Consultation Scheduled' : 'Order Placed',
        description: orderType === 'consultation'
          ? `Session reserved for ${bookingDate} at ${startTime}`
          : 'Requirements submitted by buyer',
        timestamp: now,
        actor_id: buyerId,
      },
      ...(simulateSuccess !== false
        ? [
            {
              status: 'paid',
              title: 'Payment Secured in Escrow',
              description: `₹${service.price.toLocaleString('en-IN')} held in SkillBridge Escrow via ${paymentMethod.toUpperCase()}`,
              timestamp: now,
            },
          ]
        : []),
    ];

    const serviceSnapshot = {
      id: service.id,
      title: service.title,
      description: service.description,
      price: service.price,
      delivery_days: deliveryDays,
      service_type: service.service_type || 'digital',
      location: service.location,
    };

    const { data: newOrder, error: orderErr } = await supabase
      .from('orders')
      .insert({
        service_id: service.id,
        buyer_id: buyerId,
        seller_id: service.provider_id,
        price: service.price,
        requirements: requirements || note || '',
        delivery_days: deliveryDays,
        due_date: dueDate,
        status: orderStatus,
        payment_status: paymentStatus,
        payment_id: paymentId,
        payment_method: paymentMethod,
        order_type: orderType,
        booking_id: bookingId,
        consultation_details: consultationDetails,
        service_snapshot: serviceSnapshot,
        timeline,
        created_at: now,
        updated_at: now,
      })
      .select('*')
      .single();

    if (orderErr || !newOrder) {
      return NextResponse.json(
        { error: orderErr?.message || 'Failed to persist order record.' },
        { status: 500 }
      );
    }

    // Insert payment record
    try {
      await supabase.from('payments').insert({
        order_id: newOrder.id,
        buyer_id: buyerId,
        seller_id: service.provider_id,
        amount: service.price,
        currency: 'INR',
        gateway_order_id: 'order_rzp_' + newOrder.id.slice(0, 8),
        gateway_payment_id: paymentId,
        payment_method: paymentMethod,
        status: paymentStatus,
        created_at: now,
        paid_at: simulateSuccess !== false ? now : null,
      });
    } catch {
      // Non-fatal payment record insert
    }

    // Send notification
    try {
      await supabase.from('notifications').insert({
        user_id: service.provider_id,
        title: orderType === 'consultation' ? 'New Consultation Booking! 📅' : 'New Order Received! 🚀',
        message: `New booking for "${service.title}". ₹${service.price} held in escrow.`,
        type: 'order_created',
        link: `/orders/${newOrder.id}`,
        read: false,
        created_at: now,
      });
    } catch {
      // Non-fatal notification
    }

    return NextResponse.json(
      {
        success: true,
        orderId: newOrder.id,
        bookingId,
        status: orderStatus,
        paymentStatus,
      },
      { status: 201 }
    );
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Order creation failed';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
