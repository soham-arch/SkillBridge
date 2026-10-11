import { NextResponse } from 'next/server';
import { verifyAdminRequest, getAdminSupabaseClient } from '@/lib/auth/server-admin';
import { getMarketplaceState } from '@/lib/store/marketplace-store';

export async function GET(req: Request) {
  const auth = await verifyAdminRequest(req);
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  try {
    const supabase = getAdminSupabaseClient(auth.token);
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .order('created_at', { ascending: false });

    if (!error && data && data.length > 0) {
      return NextResponse.json({ success: true, users: data });
    }

    const state = getMarketplaceState();
    return NextResponse.json({ success: true, users: state.profiles });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to fetch platform users';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
