import { NextResponse } from 'next/server';
import { verifyAdminRequest, logAdminAuditEvent, getAdminSupabaseClient } from '@/lib/auth/server-admin';
import { moderateServiceListing } from '@/lib/services/admin';

export async function POST(req: Request) {
  const auth = await verifyAdminRequest(req);
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  try {
    const body = await req.json();
    const { serviceId, status, notes } = body;

    if (!serviceId || !status) {
      return NextResponse.json(
        { error: 'Missing required parameters: serviceId and status.' },
        { status: 400 }
      );
    }

    const validStatuses = ['published', 'paused', 'archived', 'moderated'];
    if (!validStatuses.includes(status)) {
      return NextResponse.json(
        { error: `Invalid status "${status}". Allowed: ${validStatuses.join(', ')}.` },
        { status: 400 }
      );
    }

    const actorId = auth.user!.id;
    const supabase = getAdminSupabaseClient(auth.token);

    // Update in Supabase
    await supabase
      .from('services')
      .update({
        status,
        updated_at: new Date().toISOString(),
      })
      .eq('id', serviceId);

    // Update in local store
    await moderateServiceListing(serviceId, status);

    // Log administrative action
    await logAdminAuditEvent({
      actorId,
      action: `moderate_service_${status}`,
      targetType: 'service',
      targetId: serviceId,
      details: { status, notes: notes || null },
      req,
    });

    return NextResponse.json({
      success: true,
      serviceId,
      status,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to moderate service';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
