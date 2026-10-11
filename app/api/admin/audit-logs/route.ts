import { NextResponse } from 'next/server';
import { verifyAdminRequest, getAdminSupabaseClient } from '@/lib/auth/server-admin';
import { getAdminAuditLogs } from '@/lib/store/marketplace-store';

export async function GET(req: Request) {
  const auth = await verifyAdminRequest(req);
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  try {
    const supabase = getAdminSupabaseClient(auth.token);
    const { data, error } = await supabase
      .from('admin_audit_log')
      .select(`
        *,
        actor:profiles!admin_audit_log_actor_id_fkey(
          id,
          full_name,
          email
        )
      `)
      .order('created_at', { ascending: false })
      .limit(100);

    if (!error && data && data.length > 0) {
      return NextResponse.json({ success: true, logs: data });
    }

    const logs = getAdminAuditLogs();
    return NextResponse.json({ success: true, logs });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to fetch administrative audit logs';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
