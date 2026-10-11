import { NextResponse } from 'next/server';
import { verifyAdminRequest, getAdminSupabaseClient } from '@/lib/auth/server-admin';
import { getAllServices } from '@/lib/store/marketplace-store';

export async function GET(req: Request) {
  const auth = await verifyAdminRequest(req);
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  try {
    const supabase = getAdminSupabaseClient(auth.token);
    const { data, error } = await supabase
      .from('services')
      .select(`
        *,
        provider:profiles!services_provider_id_fkey(
          id,
          full_name,
          avatar_url,
          college,
          verification_status
        ),
        category:categories!services_category_id_fkey(
          id,
          name,
          slug,
          icon
        )
      `)
      .order('created_at', { ascending: false });

    if (!error && data && data.length > 0) {
      return NextResponse.json({ success: true, services: data });
    }

    const services = getAllServices();
    return NextResponse.json({ success: true, services });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to fetch services';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
