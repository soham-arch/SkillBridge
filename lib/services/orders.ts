import { getSupabaseClient } from '@/lib/supabase/client';
import { createNotification } from '@/lib/services/notifications';
import { sendOrderNotificationEmail } from '@/lib/services/email';
import {
  Order,
  OrderStatus,
  PaymentMethod,
  PaymentRecord,
  PaymentStatus,
  Review,
  SellerEarnings,
} from '@/types';

/**
 * Fetches an order by its unique ID from Supabase.
 * Includes joined Service, Buyer, and Seller profile records, and any submitted review.
 */
export async function fetchOrderById(id: string): Promise<Order | null> {
  try {
    const supabase = getSupabaseClient();
    const { data, error } = await supabase
      .from('orders')
      .select(`
        *,
        service:services(*, category:categories(*)),
        buyer:profiles!orders_buyer_id_fkey(id, user_id, full_name, avatar_url, college),
        seller:profiles!orders_seller_id_fkey(id, user_id, full_name, avatar_url, college)
      `)
      .eq('id', id)
      .maybeSingle();

    if (error) {
      console.warn('Database error in fetchOrderById:', error.message);
      return null;
    }

    if (!data) return null;

    // Fetch review for this order if present
    const { data: reviewData } = await supabase
      .from('reviews')
      .select(`
        *,
        reviewer:profiles!reviews_reviewer_id_fkey(id, user_id, full_name, avatar_url, college)
      `)
      .eq('order_id', id)
      .maybeSingle();

    return {
      ...data,
      review: reviewData || null,
    } as Order;
  } catch (err) {
    console.error('Failed to fetch order by ID:', err);
    return null;
  }
}

/**
 * Fetches all orders for an authenticated user, optionally filtered by role ('buyer' or 'seller').
 */
export async function fetchUserOrders(userId: string, role?: 'buyer' | 'seller'): Promise<Order[]> {
  try {
    const supabase = getSupabaseClient();
    let query = supabase
      .from('orders')
      .select(`
        *,
        service:services(*, category:categories(*)),
        buyer:profiles!orders_buyer_id_fkey(id, user_id, full_name, avatar_url, college),
        seller:profiles!orders_seller_id_fkey(id, user_id, full_name, avatar_url, college)
      `);

    if (role === 'buyer') {
      query = query.eq('buyer_id', userId);
    } else if (role === 'seller') {
      query = query.eq('seller_id', userId);
    } else {
      query = query.or(`buyer_id.eq.${userId},seller_id.eq.${userId}`);
    }

    const { data, error } = await query.order('created_at', { ascending: false });

    if (error) {
      console.warn('Database error in fetchUserOrders:', error.message);
      return [];
    }

    const ordersList = (data as Order[]) || [];
    if (ordersList.length > 0) {
      try {
        const orderIds = ordersList.map((o) => o.id);
        const { data: reviewsData } = await supabase
          .from('reviews')
          .select('id, order_id, rating, comment')
          .in('order_id', orderIds);

        if (reviewsData && reviewsData.length > 0) {
          const reviewMap = new Map(reviewsData.map((r: any) => [r.order_id, r]));
          ordersList.forEach((o) => {
            if (!o.review) {
              o.review = (reviewMap.get(o.id) as any) || null;
            }
          });
        }
      } catch {
        // Non-fatal review join fallback
      }
    }

    return ordersList;
  } catch (err) {
    console.error('Failed to fetch user orders:', err);
    return [];
  }
}

/**
 * Places an order atomically with escrow payment in Supabase.
 * Invokes the atomic PostgreSQL function `create_order_with_escrow`.
 */
export async function placeOrderWithEscrow(params: {
  serviceId: string;
  buyerId: string;
  requirements: string;
  paymentMethod: PaymentMethod;
  paymentSuccess?: boolean;
}): Promise<{ order: Order; payment: PaymentRecord }> {
  const supabase = getSupabaseClient();
  const isSuccess = params.paymentSuccess !== false;

  // 1. Try atomic PostgreSQL RPC
  const { data: rpcData, error: rpcError } = await supabase.rpc('create_order_with_escrow', {
    p_service_id: params.serviceId,
    p_buyer_id: params.buyerId,
    p_requirements: params.requirements,
    p_payment_method: params.paymentMethod,
    p_simulate_success: isSuccess,
  });

  if (!rpcError && rpcData?.order_id) {
    const order = await fetchOrderById(rpcData.order_id);
    if (!order) {
      throw new Error('Order was created but failed to retrieve record.');
    }

    const payment: PaymentRecord = {
      id: rpcData.payment_id,
      order_id: rpcData.order_id,
      buyer_id: params.buyerId,
      seller_id: order.seller_id,
      amount: order.price,
      currency: 'INR',
      gateway_order_id: 'order_rzp_' + rpcData.order_id.slice(0, 8),
      gateway_payment_id: order.payment_id || undefined,
      payment_method: params.paymentMethod,
      status: rpcData.payment_status as PaymentStatus,
      created_at: new Date().toISOString(),
    };

    return { order, payment };
  }

  // 2. Direct database tables fallback if RPC is not yet installed in Supabase
  const { data: service, error: svcErr } = await supabase
    .from('services')
    .select('id, provider_id, price, delivery_days, title')
    .eq('id', params.serviceId)
    .single();

  if (svcErr || !service) {
    throw new Error('Service listing could not be found.');
  }

  if (service.provider_id === params.buyerId) {
    throw new Error('You cannot buy your own service listing.');
  }

  const now = new Date().toISOString();
  const deliveryDays = service.delivery_days || 3;
  const dueDate = new Date(Date.now() + deliveryDays * 24 * 60 * 60 * 1000).toISOString();
  const paymentId = 'pay_rzp_' + Math.random().toString(36).substring(2, 9);
  const orderStatus: OrderStatus = isSuccess ? 'seller_pending' : 'pending_payment';
  const paymentStatus: PaymentStatus = isSuccess ? 'paid' : 'failed';

  const initialTimeline = [
    {
      status: 'pending_payment' as OrderStatus,
      title: 'Order Placed',
      description: 'Requirements submitted by buyer',
      timestamp: now,
      actor_id: params.buyerId,
    },
    ...(isSuccess
      ? [
          {
            status: 'paid' as OrderStatus,
            title: 'Payment Secured in Escrow',
            description: `₹${service.price.toLocaleString('en-IN')} held in SkillBridge Escrow via ${params.paymentMethod.toUpperCase()}`,
            timestamp: now,
          },
        ]
      : [
          {
            status: 'pending_payment' as OrderStatus,
            title: 'Payment Failed',
            description: 'Payment authorization declined in test simulation',
            timestamp: now,
          },
        ]),
  ];

  // Insert Order into Supabase
  const { data: newOrder, error: orderErr } = await supabase
    .from('orders')
    .insert({
      service_id: service.id,
      buyer_id: params.buyerId,
      seller_id: service.provider_id,
      price: service.price,
      requirements: params.requirements,
      delivery_days: deliveryDays,
      due_date: dueDate,
      status: orderStatus,
      payment_status: paymentStatus,
      payment_id: paymentId,
      payment_method: params.paymentMethod,
      timeline: initialTimeline,
      service_snapshot: {
        id: service.id,
        title: service.title,
        price: service.price,
        delivery_days: deliveryDays,
      },
      created_at: now,
      updated_at: now,
    })
    .select(`
      *,
      service:services(*, category:categories(*)),
      buyer:profiles!orders_buyer_id_fkey(id, user_id, full_name, avatar_url, college),
      seller:profiles!orders_seller_id_fkey(id, user_id, full_name, avatar_url, college)
    `)
    .single();

  if (orderErr || !newOrder) {
    throw new Error(orderErr?.message || 'Failed to persist order in database.');
  }

  // Insert Payment record into Supabase
  const paymentRecord: PaymentRecord = {
    id: 'pay-' + Date.now(),
    order_id: newOrder.id,
    buyer_id: params.buyerId,
    seller_id: service.provider_id,
    amount: service.price,
    currency: 'INR',
    gateway_order_id: 'order_rzp_' + newOrder.id.slice(0, 8),
    gateway_payment_id: paymentId,
    payment_method: params.paymentMethod,
    status: paymentStatus,
    created_at: now,
    paid_at: isSuccess ? now : null,
  };

  try {
    await supabase.from('payments').insert({
      order_id: newOrder.id,
      buyer_id: params.buyerId,
      seller_id: service.provider_id,
      amount: service.price,
      currency: 'INR',
      gateway_order_id: paymentRecord.gateway_order_id,
      gateway_payment_id: paymentId,
      payment_method: params.paymentMethod,
      status: paymentStatus,
      created_at: now,
      paid_at: isSuccess ? now : null,
    });
  } catch {
    // Non-fatal payment record insert
  }

  // Send In-App Notification and Email to Seller
  if (isSuccess) {
    try {
      await createNotification({
        userId: service.provider_id,
        title: 'New Order Received! 🚀',
        message: `New order placed for "${service.title}". ₹${service.price} held in escrow.`,
        type: 'order_created',
        link: `/orders/${newOrder.id}`,
        dedupKey: `order-${newOrder.id}-created`,
      });
    } catch {
      // Non-fatal notification insert
    }

    try {
      if (newOrder.seller?.email) {
        await sendOrderNotificationEmail({
          to: newOrder.seller.email,
          recipientName: newOrder.seller.full_name || 'Seller',
          subject: `New Order Received for "${service.title}"! 🚀`,
          title: 'New Service Booking / Order Placed',
          message: `A buyer placed an order for "${service.title}". ₹${service.price} is secured in SkillBridge escrow. Please review and accept the request.`,
          orderId: newOrder.id,
        });
      }
    } catch {
      // Non-fatal email send
    }
  }

  return {
    order: newOrder as Order,
    payment: paymentRecord,
  };
}

/**
 * Determines whether a service is a scheduled consultation session.
 */
export function isConsultationService(service: {
  service_type?: string;
  category?: { name?: string } | null;
  title?: string;
}): boolean {
  if (service.service_type === 'consultation' || service.service_type === 'in_person' || service.service_type === 'hybrid') {
    return true;
  }
  return false;
}

/**
 * Determines whether a service is a fixed-scope deliverable gig.
 */
export function isFixedGig(service: { service_type?: string }): boolean {
  return !isConsultationService(service);
}

/**
 * Schedules a consultation session atomically with calendar slot locking and escrow order creation.
 */
export async function bookConsultationOrder(params: {
  serviceId: string;
  buyerId: string;
  bookingDate: string;
  startTime: string;
  endTime: string;
  note?: string;
  paymentMethod: PaymentMethod;
  paymentSuccess?: boolean;
}): Promise<{ order: Order; payment: PaymentRecord; bookingId: string }> {
  const supabase = getSupabaseClient();
  const isSuccess = params.paymentSuccess !== false;

  // 1. Try atomic PostgreSQL RPC `create_unified_booking_order`
  const { data: rpcData, error: rpcError } = await supabase.rpc('create_unified_booking_order', {
    p_service_id: params.serviceId,
    p_buyer_id: params.buyerId,
    p_order_type: 'consultation',
    p_requirements: params.note || '',
    p_payment_method: params.paymentMethod,
    p_booking_date: params.bookingDate,
    p_start_time: params.startTime,
    p_end_time: params.endTime,
    p_note: params.note || '',
    p_simulate_success: isSuccess,
  });

  if (!rpcError && rpcData?.order_id) {
    const order = await fetchOrderById(rpcData.order_id);
    if (!order) {
      throw new Error('Consultation order was created but failed to retrieve record.');
    }

    const payment: PaymentRecord = {
      id: rpcData.payment_id,
      order_id: rpcData.order_id,
      buyer_id: params.buyerId,
      seller_id: order.seller_id,
      amount: order.price,
      currency: 'INR',
      gateway_order_id: 'order_rzp_' + rpcData.order_id.slice(0, 8),
      gateway_payment_id: order.payment_id || undefined,
      payment_method: params.paymentMethod,
      status: rpcData.payment_status as PaymentStatus,
      created_at: new Date().toISOString(),
    };

    return { order, payment, bookingId: rpcData.booking_id };
  }

  // 2. Direct fallback
  const { data: service, error: svcErr } = await supabase
    .from('services')
    .select('id, provider_id, price, delivery_days, title, service_type, location')
    .eq('id', params.serviceId)
    .single();

  if (svcErr || !service) {
    throw new Error('Service listing not found.');
  }

  if (service.provider_id === params.buyerId) {
    throw new Error('You cannot book your own service listing.');
  }

  const todayStr = new Date().toISOString().split('T')[0];
  if (params.bookingDate < todayStr) {
    throw new Error('Cannot book a consultation date in the past.');
  }

  // Check conflicts
  const { data: conflicts } = await supabase
    .from('bookings')
    .select('id')
    .eq('provider_id', service.provider_id)
    .eq('booking_date', params.bookingDate)
    .eq('start_time', params.startTime)
    .eq('status', 'confirmed');

  if (conflicts && conflicts.length > 0) {
    throw new Error('This time slot has already been booked. Please choose another.');
  }

  const now = new Date().toISOString();
  let bookingId = 'book-' + Date.now();

  const { data: newBooking, error: bookingErr } = await supabase
    .from('bookings')
    .insert({
      service_id: service.id,
      customer_id: params.buyerId,
      provider_id: service.provider_id,
      booking_date: params.bookingDate,
      start_time: params.startTime,
      end_time: params.endTime,
      status: 'confirmed',
      note: params.note || '',
    })
    .select('id')
    .single();

  if (!bookingErr && newBooking) {
    bookingId = newBooking.id;
  }

  const dueDate = `${params.bookingDate}T${params.endTime}:00Z`;
  const paymentId = 'pay_rzp_' + Math.random().toString(36).substring(2, 9);
  const orderStatus: OrderStatus = isSuccess ? 'seller_pending' : 'pending_payment';
  const paymentStatus: PaymentStatus = isSuccess ? 'paid' : 'failed';

  const initialTimeline = [
    {
      status: 'pending_payment' as OrderStatus,
      title: 'Consultation Scheduled',
      description: `Session reserved for ${params.bookingDate} at ${params.startTime}`,
      timestamp: now,
      actor_id: params.buyerId,
    },
    ...(isSuccess
      ? [
          {
            status: 'paid' as OrderStatus,
            title: 'Payment Secured in Escrow',
            description: `₹${service.price.toLocaleString('en-IN')} held in SkillBridge Escrow via ${params.paymentMethod.toUpperCase()}`,
            timestamp: now,
          },
        ]
      : []),
  ];

  const consultationDetails = {
    booking_date: params.bookingDate,
    start_time: params.startTime,
    end_time: params.endTime,
    location: service.location,
    note: params.note || '',
  };

  const { data: newOrder, error: orderErr } = await supabase
    .from('orders')
    .insert({
      service_id: service.id,
      buyer_id: params.buyerId,
      seller_id: service.provider_id,
      price: service.price,
      requirements: params.note || '',
      delivery_days: 1,
      due_date: dueDate,
      status: orderStatus,
      payment_status: paymentStatus,
      payment_id: paymentId,
      payment_method: params.paymentMethod,
      order_type: 'consultation',
      booking_id: bookingId,
      consultation_details: consultationDetails,
      service_snapshot: {
        id: service.id,
        title: service.title,
        price: service.price,
        delivery_days: 1,
        service_type: service.service_type || 'consultation',
        location: service.location,
      },
      timeline: initialTimeline,
      created_at: now,
      updated_at: now,
    })
    .select(`
      *,
      service:services(*, category:categories(*)),
      buyer:profiles!orders_buyer_id_fkey(id, user_id, full_name, avatar_url, college),
      seller:profiles!orders_seller_id_fkey(id, user_id, full_name, avatar_url, college)
    `)
    .single();

  if (orderErr || !newOrder) {
    throw new Error(orderErr?.message || 'Failed to create consultation order.');
  }

  const paymentRecord: PaymentRecord = {
    id: 'pay-' + Date.now(),
    order_id: newOrder.id,
    buyer_id: params.buyerId,
    seller_id: service.provider_id,
    amount: service.price,
    currency: 'INR',
    gateway_order_id: 'order_rzp_' + newOrder.id.slice(0, 8),
    gateway_payment_id: paymentId,
    payment_method: params.paymentMethod,
    status: paymentStatus,
    created_at: now,
    paid_at: isSuccess ? now : null,
  };

  try {
    await supabase.from('payments').insert(paymentRecord);
  } catch {
    // Non-fatal
  }

  // Send In-App Notification and Email to Provider
  if (isSuccess) {
    try {
      await createNotification({
        userId: service.provider_id,
        title: 'New Consultation Booking! 📅',
        message: `Consultation session scheduled for "${service.title}" on ${params.bookingDate} at ${params.startTime}.`,
        type: 'order_created',
        link: `/orders/${newOrder.id}`,
        dedupKey: `booking-${newOrder.id}-created`,
      });
    } catch {
      // Non-fatal notification
    }

    try {
      if (newOrder.seller?.email) {
        await sendOrderNotificationEmail({
          to: newOrder.seller.email,
          recipientName: newOrder.seller.full_name || 'Provider',
          subject: `Consultation Booked for "${service.title}" 📅`,
          title: 'Consultation Appointment Confirmed',
          message: `A client has booked a consultation for "${service.title}" on ${params.bookingDate} at ${params.startTime} - ${params.endTime}. ₹${service.price} is secured in escrow.`,
          orderId: newOrder.id,
        });
      }
    } catch {
      // Non-fatal email
    }
  }

  return {
    order: newOrder as Order,
    payment: paymentRecord,
    bookingId,
  };
}

/**
 * Transitions order lifecycle state with atomic timeline tracking and party notifications.
 */
export async function transitionOrderStatus(
  orderId: string,
  action: 'accept' | 'reject' | 'start_work' | 'submit_work' | 'request_revision' | 'complete' | 'cancel',
  payload?: { notes?: string; fileUrl?: string; reason?: string }
): Promise<Order> {
  const supabase = getSupabaseClient();
  const existing = await fetchOrderById(orderId);
  if (!existing) throw new Error('Order not found');

  const now = new Date().toISOString();
  let nextStatus: OrderStatus = existing.status;
  const updateFields: Record<string, any> = { updated_at: now };
  let timelineEntry: any = null;

  switch (action) {
    case 'accept':
      nextStatus = 'accepted';
      updateFields.status = nextStatus;
      updateFields.accepted_at = now;
      timelineEntry = {
        status: 'accepted',
        title: 'Order Accepted',
        description: 'Seller accepted the project requirements and started scheduling.',
        timestamp: now,
      };
      break;

    case 'reject':
      nextStatus = 'rejected';
      updateFields.status = nextStatus;
      updateFields.cancelled_at = now;
      updateFields.cancellation_reason = payload?.reason ?? 'Declined by seller.';
      updateFields.payment_status = 'refunded';
      timelineEntry = {
        status: 'rejected',
        title: 'Order Rejected by Seller',
        description: `Reason: ${payload?.reason ?? 'Provider unavailable'}. Escrow refunded.`,
        timestamp: now,
      };
      if (existing.booking_id) {
        try {
          await supabase.from('bookings').update({ status: 'cancelled' }).eq('id', existing.booking_id);
        } catch {}
      }
      break;

    case 'start_work':
      nextStatus = 'in_progress';
      updateFields.status = nextStatus;
      timelineEntry = {
        status: 'in_progress',
        title: 'Work In Progress',
        description: 'Seller is actively working on the deliverables.',
        timestamp: now,
      };
      break;

    case 'submit_work':
      nextStatus = 'submitted';
      updateFields.status = nextStatus;
      updateFields.submitted_at = now;
      updateFields.deliverables = {
        notes: payload?.notes ?? 'Completed project deliverables.',
        file_url: payload?.fileUrl,
        submitted_at: now,
      };
      timelineEntry = {
        status: 'submitted',
        title: 'Work Delivered',
        description: payload?.notes ? `Deliverable: ${payload.notes}` : 'Seller submitted final deliverables for review.',
        timestamp: now,
      };
      break;

    case 'request_revision': {
      const currentRevs = existing.revisions_count ?? 0;
      const maxRevs = existing.max_revisions ?? 2;
      if (currentRevs >= maxRevs) {
        throw new Error(`Maximum revisions limit (${maxRevs}) reached for this order.`);
      }
      nextStatus = 'revision_requested';
      updateFields.status = nextStatus;
      updateFields.revisions_count = currentRevs + 1;
      updateFields.revision_notes = payload?.notes ?? 'Requested revision.';
      timelineEntry = {
        status: 'revision_requested',
        title: `Revision Requested (#${currentRevs + 1})`,
        description: `Feedback: ${payload?.notes ?? 'Changes requested'}`,
        timestamp: now,
      };
      break;
    }

    case 'complete':
      nextStatus = 'completed';
      updateFields.status = nextStatus;
      updateFields.completed_at = now;
      timelineEntry = {
        status: 'completed',
        title: 'Order Completed & Escrow Released',
        description: `Buyer approved completion. ₹${existing.price.toLocaleString('en-IN')} escrow released to seller.`,
        timestamp: now,
      };
      if (existing.booking_id) {
        try {
          await supabase.from('bookings').update({ status: 'completed' }).eq('id', existing.booking_id);
        } catch {}
      }
      break;

    case 'cancel':
      nextStatus = 'cancelled';
      updateFields.status = nextStatus;
      updateFields.cancelled_at = now;
      updateFields.cancellation_reason = payload?.reason ?? 'Order cancelled.';
      updateFields.payment_status = 'refunded';
      timelineEntry = {
        status: 'cancelled',
        title: 'Order Cancelled & Refunded',
        description: `Reason: ${payload?.reason ?? 'Cancelled by user'}. Escrow refunded.`,
        timestamp: now,
      };
      if (existing.booking_id) {
        try {
          await supabase.from('bookings').update({ status: 'cancelled' }).eq('id', existing.booking_id);
        } catch {}
      }
      break;
  }

  const existingTimeline = Array.isArray(existing.timeline) ? existing.timeline : [];
  if (timelineEntry) {
    updateFields.timeline = [...existingTimeline, timelineEntry];
  }

  const { data: updated, error } = await supabase
    .from('orders')
    .update(updateFields)
    .eq('id', orderId)
    .select(`
      *,
      service:services(*, category:categories(*)),
      buyer:profiles!orders_buyer_id_fkey(id, user_id, full_name, avatar_url, college),
      seller:profiles!orders_seller_id_fkey(id, user_id, full_name, avatar_url, college)
    `)
    .single();

  if (error || !updated) {
    throw new Error(error?.message || 'Failed to update order in database');
  }

  // Update seller completed orders count if completed
  if (action === 'complete') {
    try {
      await supabase.rpc('complete_order_and_release_escrow', {
        p_order_id: orderId,
        p_actor_id: existing.buyer_id,
      });
    } catch {
      // Non-fatal completion RPC
    }
  }

  // Send In-App Notification to Counterparty with Deduplication
  let notifyRecipient: string;
  let notifTitle: string;
  let notifMsg: string;
  let notifType: string;

  if (action === 'accept') {
    notifyRecipient = existing.buyer_id;
    notifTitle = 'Order Accepted! ⚡';
    notifMsg = `Seller has accepted your order for "${existing.service?.title ?? 'Service'}". Work has commenced.`;
    notifType = 'order_accepted';
  } else if (action === 'reject') {
    notifyRecipient = existing.buyer_id;
    notifTitle = 'Order Declined ❌';
    notifMsg = `Your order for "${existing.service?.title ?? 'Service'}" was declined by the provider. Escrow has been refunded.`;
    notifType = 'order_rejected';
  } else if (action === 'start_work') {
    notifyRecipient = existing.buyer_id;
    notifTitle = 'Work In Progress 🔨';
    notifMsg = `The provider has marked your order for "${existing.service?.title ?? 'Service'}" as in progress.`;
    notifType = 'order_accepted';
  } else if (action === 'submit_work') {
    notifyRecipient = existing.buyer_id;
    notifTitle = 'Deliverables Submitted! 📦';
    notifMsg = `Deliverables submitted for "${existing.service?.title ?? 'Service'}". Please review and approve.`;
    notifType = 'work_submitted';
  } else if (action === 'request_revision') {
    notifyRecipient = existing.seller_id;
    notifTitle = 'Revision Requested ✍️';
    notifMsg = `Buyer requested a revision on "${existing.service?.title ?? 'Service'}": ${payload?.notes || 'Please see order notes.'}`;
    notifType = 'revision_requested';
  } else if (action === 'complete') {
    notifyRecipient = existing.seller_id;
    notifTitle = 'Order Completed & Escrow Released! 💰';
    notifMsg = `Buyer approved completion for "${existing.service?.title ?? 'Service'}". ₹${existing.price.toLocaleString('en-IN')} escrow has been released!`;
    notifType = 'order_completed';
  } else {
    // cancel
    notifyRecipient = existing.buyer_id;
    notifTitle = 'Order Cancelled ⚠️';
    notifMsg = `Order for "${existing.service?.title ?? 'Service'}" was cancelled: ${payload?.reason || 'Cancelled'}.`;
    notifType = 'order_cancelled';
  }

  const dedupKey = `order-${orderId}-${action}-${action === 'request_revision' ? existing.revisions_count ?? 0 : '1'}`;

  try {
    await createNotification({
      userId: notifyRecipient,
      title: notifTitle,
      message: notifMsg,
      type: notifType,
      link: `/orders/${orderId}`,
      dedupKey,
    });
  } catch {
    // Non-fatal notification
  }

  // Trigger Transactional Email
  try {
    const recipientUser = notifyRecipient === existing.buyer_id ? existing.buyer : existing.seller;
    const recipientEmail = (recipientUser as any)?.email;
    if (recipientEmail) {
      await sendOrderNotificationEmail({
        to: recipientEmail,
        recipientName: recipientUser?.full_name || 'SkillBridge User',
        subject: `${notifTitle} — Order #${orderId.slice(-6).toUpperCase()}`,
        title: notifTitle,
        message: notifMsg,
        orderId,
      });
    }
  } catch {
    // Non-fatal email
  }

  return updated as Order;
}

/**
 * Submits a rating & review for a completed order in Supabase.
 */
export async function submitOrderReview(params: {
  orderId: string;
  serviceId: string;
  reviewerId: string;
  revieweeId: string;
  rating: number;
  comment: string;
}): Promise<Review> {
  const supabase = getSupabaseClient();
  const now = new Date().toISOString();

  const { data, error } = await supabase
    .from('reviews')
    .insert({
      order_id: params.orderId,
      service_id: params.serviceId,
      reviewer_id: params.reviewerId,
      reviewee_id: params.revieweeId,
      rating: params.rating,
      comment: params.comment,
      created_at: now,
      updated_at: now,
    })
    .select(`
      *,
      reviewer:profiles!reviews_reviewer_id_fkey(id, user_id, full_name, avatar_url, college)
    `)
    .single();

  if (error || !data) {
    throw new Error(error?.message || 'Failed to submit review');
  }

  // Send Notification to Reviewee
  try {
    await createNotification({
      userId: params.revieweeId,
      title: 'New Review Received! ⭐',
      message: `Received ${params.rating} stars: "${params.comment.slice(0, 60)}..."`,
      type: 'review_received',
      link: `/orders/${params.orderId}`,
      dedupKey: `review-${params.orderId}`,
    });
  } catch {
    // Non-fatal notification
  }

  return data as Review;
}

/**
 * Computes authoritative seller earnings directly from PostgreSQL database orders.
 * Never stores or trusts client localStorage balances.
 */
export async function fetchSellerEarnings(sellerId: string): Promise<SellerEarnings> {
  try {
    const supabase = getSupabaseClient();
    const { data: orders, error } = await supabase
      .from('orders')
      .select('id, price, status, payment_status')
      .eq('seller_id', sellerId);

    if (error || !orders) {
      return {
        total_earned: 0,
        in_escrow: 0,
        available_for_payout: 0,
        completed_orders: 0,
        pending_orders: 0,
      };
    }

    const completed = orders.filter((o) => o.status === 'completed' && o.payment_status === 'paid');
    const escrow = orders.filter(
      (o) => o.payment_status === 'paid' && o.status !== 'completed' && o.status !== 'cancelled' && o.status !== 'rejected'
    );

    const totalEarned = completed.reduce((sum, o) => sum + Number(o.price || 0), 0);
    const inEscrow = escrow.reduce((sum, o) => sum + Number(o.price || 0), 0);

    return {
      total_earned: totalEarned,
      in_escrow: inEscrow,
      available_for_payout: totalEarned,
      completed_orders: completed.length,
      pending_orders: escrow.length,
    };
  } catch (err) {
    console.error('Failed to compute seller earnings from database:', err);
    return {
      total_earned: 0,
      in_escrow: 0,
      available_for_payout: 0,
      completed_orders: 0,
      pending_orders: 0,
    };
  }
}
