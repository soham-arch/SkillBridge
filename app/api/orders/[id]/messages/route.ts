import { NextResponse } from 'next/server';
import { extractAuthToken, getServerSupabaseClient } from '@/lib/auth/server-seller';
import { isValidUUID } from '@/lib/services/services';

/**
 * GET /api/orders/[id]/messages
 *
 * Retrieves persistent message history for an order.
 * Strictly restricted to order participants (buyer, seller) and platform admins.
 * Non-participants receive 403 Forbidden.
 */
export async function GET(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const token = extractAuthToken(req);
    const supabase = getServerSupabaseClient(token);

    // 1. Authenticate user
    const { data: { user }, error: authErr } = await supabase.auth.getUser();
    if (authErr || !user) {
      return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });
    }

    const orderId = params.id;
    if (!orderId || !isValidUUID(orderId)) {
      return NextResponse.json({ error: 'Invalid order identifier.' }, { status: 400 });
    }

    // 2. Authorize participant
    const { data: order, error: orderErr } = await supabase
      .from('orders')
      .select('id, buyer_id, seller_id')
      .eq('id', orderId)
      .maybeSingle();

    if (orderErr || !order) {
      return NextResponse.json({ error: 'Order not found.' }, { status: 404 });
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('is_admin')
      .eq('user_id', user.id)
      .maybeSingle();

    const isParticipant = order.buyer_id === user.id || order.seller_id === user.id;
    const isAdmin = Boolean(profile?.is_admin);

    if (!isParticipant && !isAdmin) {
      return NextResponse.json(
        { error: 'Forbidden: You do not have permission to view messages for this order.' },
        { status: 403 }
      );
    }

    // 3. Fetch messages
    const { data: messages, error: msgErr } = await supabase
      .from('order_messages')
      .select('*')
      .eq('order_id', orderId)
      .order('created_at', { ascending: true });

    if (msgErr) {
      return NextResponse.json({ error: msgErr.message }, { status: 500 });
    }

    return NextResponse.json({ messages: messages || [] });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Failed to fetch messages';
    console.error('Error in GET /api/orders/[id]/messages:', err);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

/**
 * POST /api/orders/[id]/messages
 *
 * Appends a message to the order conversation.
 * Strictly restricted to order participants.
 */
export async function POST(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const token = extractAuthToken(req);
    const supabase = getServerSupabaseClient(token);

    const { data: { user }, error: authErr } = await supabase.auth.getUser();
    if (authErr || !user) {
      return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });
    }

    const orderId = params.id;
    if (!orderId || !isValidUUID(orderId)) {
      return NextResponse.json({ error: 'Invalid order identifier.' }, { status: 400 });
    }

    // Fetch order to verify participation and determine recipient
    const { data: order, error: orderErr } = await supabase
      .from('orders')
      .select('id, buyer_id, seller_id, service:services(title)')
      .eq('id', orderId)
      .maybeSingle();

    if (orderErr || !order) {
      return NextResponse.json({ error: 'Order not found.' }, { status: 404 });
    }

    const isBuyer = order.buyer_id === user.id;
    const isSeller = order.seller_id === user.id;

    if (!isBuyer && !isSeller) {
      return NextResponse.json(
        { error: 'Forbidden: Only order participants can send messages in this order.' },
        { status: 403 }
      );
    }

    const receiverId = isBuyer ? order.seller_id : order.buyer_id;
    const body = await req.json();
    const { content, attachmentUrl, attachmentName } = body;

    const cleanContent = (content || '').trim();
    if (!cleanContent && !attachmentUrl) {
      return NextResponse.json(
        { error: 'Message content or attachment is required.' },
        { status: 400 }
      );
    }

    const now = new Date().toISOString();

    // Insert message into database
    const { data: newMessage, error: insertErr } = await supabase
      .from('order_messages')
      .insert({
        order_id: orderId,
        sender_id: user.id,
        receiver_id: receiverId,
        content: cleanContent,
        attachment_url: attachmentUrl || null,
        attachment_name: attachmentName || null,
        read: false,
      })
      .select('*')
      .single();

    if (insertErr || !newMessage) {
      return NextResponse.json(
        { error: insertErr?.message || 'Failed to insert message.' },
        { status: 500 }
      );
    }

    // Create in-app notification for receiver with deduplication key
    try {
      const { data: senderProfile } = await supabase
        .from('profiles')
        .select('full_name')
        .eq('user_id', user.id)
        .maybeSingle();

      const senderName = senderProfile?.full_name || (isBuyer ? 'Buyer' : 'Seller');

      await supabase.from('notifications').insert({
        user_id: receiverId,
        title: `New message from ${senderName}`,
        message: cleanContent.slice(0, 100) || 'Sent an attachment',
        type: 'new_message',
        link: `/orders/${orderId}`,
        dedup_key: `msg_notif_${newMessage.id}`,
        read: false,
      });
    } catch {
      // Non-fatal
    }

    return NextResponse.json({ success: true, message: newMessage });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Failed to send message';
    console.error('Error in POST /api/orders/[id]/messages:', err);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
