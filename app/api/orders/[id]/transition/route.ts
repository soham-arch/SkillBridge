import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://eldmwjkolqqdhfqcawvg.supabase.co';
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

function getSupabaseClient() {
  return createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
}

function extractToken(req: NextRequest): string | null {
  const authHeader = req.headers.get('authorization');
  if (authHeader?.startsWith('Bearer ')) {
    return authHeader.substring(7).trim();
  }
  const cookie = req.cookies.get('sb-access-token');
  return cookie?.value || null;
}

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = getSupabaseClient();
    const token = extractToken(req);

    if (!token) {
      return NextResponse.json(
        { error: 'Unauthorized: Authentication required.' },
        { status: 401 }
      );
    }

    const { data: { user }, error: authErr } = await supabase.auth.getUser(token);
    if (authErr || !user) {
      return NextResponse.json(
        { error: 'Unauthorized: Invalid authentication credentials.' },
        { status: 401 }
      );
    }

    const body = await req.json().catch(() => ({}));
    const { action, notes, fileUrl, reason } = body;

    if (!action) {
      return NextResponse.json(
        { error: 'Action parameter is required.' },
        { status: 400 }
      );
    }

    // Fetch existing order
    const { data: order, error: fetchErr } = await supabase
      .from('orders')
      .select('*')
      .eq('id', params.id)
      .maybeSingle();

    if (fetchErr || !order) {
      return NextResponse.json(
        { error: 'Order not found.' },
        { status: 404 }
      );
    }

    const isBuyer = order.buyer_id === user.id;
    const isSeller = order.seller_id === user.id;

    let isAdmin = false;
    if (!isBuyer && !isSeller) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('is_admin')
        .eq('user_id', user.id)
        .single();
      isAdmin = Boolean(profile?.is_admin);

      if (!isAdmin) {
        return NextResponse.json(
          { error: 'Forbidden: You are not authorized to perform actions on this order.' },
          { status: 403 }
        );
      }
    }

    // Try atomic RPC function `transition_order_state`
    const { data: rpcData, error: rpcErr } = await supabase.rpc('transition_order_state', {
      p_order_id: params.id,
      p_actor_id: user.id,
      p_action: action,
      p_notes: notes || '',
      p_file_url: fileUrl || null,
      p_reason: reason || '',
    });

    if (!rpcErr && rpcData?.success) {
      const { data: updatedOrder } = await supabase
        .from('orders')
        .select(`
          *,
          service:services(*, category:categories(*)),
          buyer:profiles!orders_buyer_id_fkey(id, user_id, full_name, avatar_url, college),
          seller:profiles!orders_seller_id_fkey(id, user_id, full_name, avatar_url, college)
        `)
        .eq('id', params.id)
        .single();

      return NextResponse.json({
        success: true,
        order: updatedOrder,
      });
    }

    // Direct state machine evaluation fallback
    const now = new Date().toISOString();
    let nextStatus = order.status;
    let nextPaymentStatus = order.payment_status;
    let timelineTitle = 'Order Updated';
    let timelineDesc = '';
    let revisionsCount = order.revisions_count || 0;
    const maxRevisions = order.max_revisions || 2;
    const updatePayload: Record<string, any> = { updated_at: now };

    switch (action) {
      case 'accept':
        if (!isSeller && !isAdmin) {
          return NextResponse.json({ error: 'Only the seller can accept this order.' }, { status: 403 });
        }
        if (order.status !== 'seller_pending' && order.status !== 'paid') {
          return NextResponse.json({ error: `Cannot accept order from status ${order.status}.` }, { status: 400 });
        }
        nextStatus = 'accepted';
        updatePayload.accepted_at = now;
        timelineTitle = 'Order Accepted';
        timelineDesc = 'Seller accepted the project requirements and scheduled delivery.';
        break;

      case 'reject':
        if (!isSeller && !isAdmin) {
          return NextResponse.json({ error: 'Only the seller can reject this order.' }, { status: 403 });
        }
        if (order.status !== 'seller_pending' && order.status !== 'paid') {
          return NextResponse.json({ error: `Cannot reject order from status ${order.status}.` }, { status: 400 });
        }
        nextStatus = 'rejected';
        nextPaymentStatus = 'refunded';
        updatePayload.cancelled_at = now;
        updatePayload.cancellation_reason = reason || 'Declined by seller.';
        timelineTitle = 'Order Rejected by Seller';
        timelineDesc = `Reason: ${reason || 'Provider unavailable'}. Escrow refunded.`;
        if (order.booking_id) {
          await supabase.from('bookings').update({ status: 'cancelled' }).eq('id', order.booking_id);
        }
        break;

      case 'start_work':
        if (!isSeller && !isAdmin) {
          return NextResponse.json({ error: 'Only the seller can start work.' }, { status: 403 });
        }
        if (order.status !== 'accepted') {
          return NextResponse.json({ error: 'Cannot start work before order is accepted.' }, { status: 400 });
        }
        nextStatus = 'in_progress';
        timelineTitle = 'Work In Progress';
        timelineDesc = 'Seller is actively working on the requested deliverables.';
        break;

      case 'submit_work':
        if (!isSeller && !isAdmin) {
          return NextResponse.json({ error: 'Only the seller can submit deliverables.' }, { status: 403 });
        }
        if (!['accepted', 'in_progress', 'revision_requested'].includes(order.status)) {
          return NextResponse.json({ error: `Cannot submit deliverables from status ${order.status}.` }, { status: 400 });
        }
        nextStatus = 'submitted';
        updatePayload.submitted_at = now;
        updatePayload.deliverables = {
          notes: notes || 'Completed deliverables submitted.',
          file_url: fileUrl || null,
          submitted_at: now,
        };
        timelineTitle = 'Work Delivered';
        timelineDesc = notes ? `Deliverables: ${notes}` : 'Seller submitted deliverables for inspection.';
        break;

      case 'request_revision':
        if (!isBuyer && !isAdmin) {
          return NextResponse.json({ error: 'Only the buyer can request revisions.' }, { status: 403 });
        }
        if (order.status !== 'submitted') {
          return NextResponse.json({ error: 'Revisions can only be requested after deliverables are submitted.' }, { status: 400 });
        }
        if (revisionsCount >= maxRevisions) {
          return NextResponse.json(
            { error: `Maximum revision limit (${maxRevisions}) reached for this order.` },
            { status: 400 }
          );
        }
        nextStatus = 'revision_requested';
        revisionsCount += 1;
        updatePayload.revisions_count = revisionsCount;
        updatePayload.revision_notes = notes || 'Adjustments requested.';
        timelineTitle = `Revision Requested (#${revisionsCount})`;
        timelineDesc = `Feedback: ${notes || 'Changes requested by buyer.'}`;
        break;

      case 'complete':
        if (!isBuyer && !isAdmin) {
          return NextResponse.json({ error: 'Only the buyer can approve completion and release payment.' }, { status: 403 });
        }
        const isConsult = order.order_type === 'consultation' || Boolean(order.consultation_details);
        const validCompleteStatuses = isConsult ? ['submitted', 'accepted', 'in_progress'] : ['submitted'];
        if (!validCompleteStatuses.includes(order.status)) {
          return NextResponse.json({ error: `Cannot complete order from status ${order.status}. Deliverables must be submitted first.` }, { status: 400 });
        }
        nextStatus = 'completed';
        nextPaymentStatus = 'paid';
        updatePayload.completed_at = now;
        timelineTitle = 'Order Completed & Escrow Released';
        timelineDesc = `Buyer confirmed completion. ₹${order.price.toLocaleString('en-IN')} payment released to seller.`;

        // Update seller completed orders count
        await supabase
          .from('services')
          .update({ completed_orders_count: (order.service?.completed_orders_count || 0) + 1 })
          .eq('id', order.service_id);

        if (order.booking_id) {
          await supabase.from('bookings').update({ status: 'completed' }).eq('id', order.booking_id);
        }
        break;

      case 'cancel':
        if (isBuyer) {
          const isOverdue = new Date(order.due_date).getTime() < Date.now();
          if (order.status !== 'seller_pending' && order.status !== 'pending_payment' && !isOverdue) {
            return NextResponse.json(
              { error: 'Cannot cancel order after seller has accepted unless delivery deadline has elapsed.' },
              { status: 400 }
            );
          }
        }
        nextStatus = 'cancelled';
        nextPaymentStatus = 'refunded';
        updatePayload.cancelled_at = now;
        updatePayload.cancellation_reason = reason || 'Cancelled by participant.';
        timelineTitle = 'Order Cancelled & Refunded';
        timelineDesc = `Reason: ${reason || 'Cancelled'}. Escrow refunded.`;
        if (order.booking_id) {
          await supabase.from('bookings').update({ status: 'cancelled' }).eq('id', order.booking_id);
        }
        break;

      default:
        return NextResponse.json({ error: `Unknown action: ${action}` }, { status: 400 });
    }

    updatePayload.status = nextStatus;
    updatePayload.payment_status = nextPaymentStatus;

    const existingTimeline = Array.isArray(order.timeline) ? order.timeline : [];
    updatePayload.timeline = [
      ...existingTimeline,
      {
        status: nextStatus,
        title: timelineTitle,
        description: timelineDesc,
        timestamp: now,
        actor_id: user.id,
      },
    ];

    const { data: updatedOrder, error: updateErr } = await supabase
      .from('orders')
      .update(updatePayload)
      .eq('id', params.id)
      .select(`
        *,
        service:services(*, category:categories(*)),
        buyer:profiles!orders_buyer_id_fkey(id, user_id, full_name, avatar_url, college),
        seller:profiles!orders_seller_id_fkey(id, user_id, full_name, avatar_url, college)
      `)
      .single();

    if (updateErr) {
      return NextResponse.json({ error: updateErr.message }, { status: 500 });
    }

    if (nextPaymentStatus === 'refunded') {
      await supabase.from('payments').update({ status: 'refunded' }).eq('order_id', params.id);
    }

    // Notify counterparty
    const notifyRecipient = user.id === order.buyer_id ? order.seller_id : order.buyer_id;
    await supabase.from('notifications').insert({
      user_id: notifyRecipient,
      title: timelineTitle,
      message: `Order #${params.id.slice(-6).toUpperCase()} updated to ${nextStatus}.`,
      type: `order_${action}`,
      link: `/orders/${params.id}`,
      read: false,
      created_at: now,
    });

    return NextResponse.json({
      success: true,
      order: updatedOrder,
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Transition failed';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
