import { NextResponse } from 'next/server';
import { verifyAdminRequest, getAdminSupabaseClient } from '@/lib/auth/server-admin';
import { fetchAllOrdersAdmin } from '@/lib/services/admin';

export async function GET(req: Request) {
  const auth = await verifyAdminRequest(req);
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  try {
    const supabase = getAdminSupabaseClient(auth.token);
    const { data, error } = await supabase
      .from('orders')
      .select(`
        *,
        buyer:profiles!orders_buyer_id_fkey(
          id,
          full_name,
          email,
          college
        ),
        seller:profiles!orders_seller_id_fkey(
          id,
          full_name,
          email,
          college
        ),
        service:services!orders_service_id_fkey(
          id,
          title,
          price
        )
      `)
      .order('created_at', { ascending: false });

    if (!error && data && data.length > 0) {
      return NextResponse.json({ success: true, orders: data });
    }

    const orders = await fetchAllOrdersAdmin();
    return NextResponse.json({ success: true, orders });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to fetch platform orders';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
