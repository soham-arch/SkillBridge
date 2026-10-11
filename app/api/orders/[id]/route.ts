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

export async function GET(
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

    // Fetch the order
    const { data: order, error: orderErr } = await supabase
      .from('orders')
      .select(`
        *,
        service:services(*, category:categories(*)),
        buyer:profiles!orders_buyer_id_fkey(id, user_id, full_name, avatar_url, college),
        seller:profiles!orders_seller_id_fkey(id, user_id, full_name, avatar_url, college)
      `)
      .eq('id', params.id)
      .maybeSingle();

    if (orderErr) {
      return NextResponse.json({ error: orderErr.message }, { status: 500 });
    }

    if (!order) {
      return NextResponse.json({ error: 'Order not found.' }, { status: 404 });
    }

    // Verify participant authority (Buyer, Seller, or Admin)
    const isBuyer = order.buyer_id === user.id;
    const isSeller = order.seller_id === user.id;

    if (!isBuyer && !isSeller) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('is_admin')
        .eq('user_id', user.id)
        .single();

      if (!profile?.is_admin) {
        return NextResponse.json(
          { error: 'Forbidden: You do not have permission to view this order.' },
          { status: 403 }
        );
      }
    }

    // Fetch review for this order if present
    const { data: review } = await supabase
      .from('reviews')
      .select(`
        *,
        reviewer:profiles!reviews_reviewer_id_fkey(id, user_id, full_name, avatar_url, college)
      `)
      .eq('order_id', params.id)
      .maybeSingle();

    return NextResponse.json({
      success: true,
      order: {
        ...order,
        review: review || null,
      },
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Failed to fetch order';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
