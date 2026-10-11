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

    // Fetch live metrics from Supabase
    const [profilesRes, servicesRes, ordersRes, verificationsRes] = await Promise.all([
      supabase.from('profiles').select('id, verification_status', { count: 'exact' }),
      supabase.from('services').select('id', { count: 'exact' }),
      supabase.from('orders').select('id, status, price, payment_status'),
      supabase.from('verification_requests').select('id, status'),
    ]);

    let totalUsers = profilesRes.count ?? 0;
    let verifiedStudents = 0;
    if (profilesRes.data) {
      verifiedStudents = profilesRes.data.filter((p) => p.verification_status === 'verified').length;
    }

    let totalServices = servicesRes.count ?? 0;
    let totalOrders = ordersRes.data?.length ?? 0;
    let completedOrders = 0;
    let grossMarketplaceVolume = 0;

    if (ordersRes.data) {
      completedOrders = ordersRes.data.filter((o) => o.status === 'completed').length;
      grossMarketplaceVolume = ordersRes.data
        .filter((o) => o.payment_status === 'paid')
        .reduce((sum, o) => sum + (o.price || 0), 0);
    }

    let pendingVerifications = 0;
    if (verificationsRes.data) {
      pendingVerifications = verificationsRes.data.filter((v) => v.status === 'pending').length;
    }

    // Fallback if database table returned 0 because it's populated locally
    if (totalUsers === 0 && totalServices === 0) {
      const state = getMarketplaceState();
      totalUsers = state.profiles.length;
      verifiedStudents = state.profiles.filter((p) => p.verification_status === 'verified').length;
      totalServices = state.services.length;
      totalOrders = state.orders.length;
      completedOrders = state.orders.filter((o) => o.status === 'completed').length;
      grossMarketplaceVolume = state.orders
        .filter((o) => o.payment_status === 'paid')
        .reduce((sum, o) => sum + (o.price || 0), 0);
      pendingVerifications = state.verifications.filter((v) => v.status === 'pending').length;
    }

    return NextResponse.json({
      success: true,
      metrics: {
        totalUsers,
        verifiedStudents,
        totalServices,
        totalOrders,
        completedOrders,
        grossMarketplaceVolume,
        pendingVerifications,
      },
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to fetch platform metrics';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
