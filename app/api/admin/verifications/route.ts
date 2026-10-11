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
      .from('verification_requests')
      .select(`
        *,
        user:profiles!verification_requests_user_id_fkey(
          id,
          full_name,
          avatar_url,
          email,
          college
        )
      `)
      .order('submitted_at', { ascending: false });

    if (!error && data && data.length > 0) {
      return NextResponse.json({ success: true, verifications: data });
    }

    // Fallback to store verifications
    const state = getMarketplaceState();
    return NextResponse.json({ success: true, verifications: state.verifications });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to fetch verification requests';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
