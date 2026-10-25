import { NextResponse } from 'next/server';
import { extractAuthToken, getServerSupabaseClient, verifyUserRequest } from '@/lib/auth/server-seller';
import { isValidUUID } from '@/lib/services/services';

/**
 * POST /api/orders/[id]/messages/read
 *
 * Marks all incoming messages for the requesting user on this order as read.
 */
export async function POST(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const auth = await verifyUserRequest(req);
    if (!auth.ok || !auth.user) {
      return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });
    }
    const user = auth.user;
    const token = auth.token || extractAuthToken(req);
    const supabase = getServerSupabaseClient(token);

    const orderId = params.id;
    if (!orderId || !isValidUUID(orderId)) {
      return NextResponse.json({ error: 'Invalid order identifier.' }, { status: 400 });
    }

    const { error: updateErr } = await supabase
      .from('order_messages')
      .update({ read: true })
      .eq('order_id', orderId)
      .eq('receiver_id', user.id)
      .eq('read', false);

    if (updateErr) {
      return NextResponse.json({ error: updateErr.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Failed to mark messages read';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
