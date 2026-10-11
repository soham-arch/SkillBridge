import { NextResponse } from 'next/server';
import {
  verifyServiceOwnership,
  getServerSupabaseClient,
} from '@/lib/auth/server-seller';
import type { ServiceStatus } from '@/types';

export async function POST(req: Request, { params }: { params: { id: string } }) {
  const ownership = await verifyServiceOwnership(req, params.id);
  if (!ownership.ok) {
    return NextResponse.json({ error: ownership.error }, { status: ownership.status });
  }

  try {
    const body = await req.json();
    const { status } = body;

    const validStatuses: ServiceStatus[] = ['draft', 'published', 'paused', 'archived'];
    if (!status || !validStatuses.includes(status)) {
      return NextResponse.json(
        {
          error: `Invalid status "${status}". Allowed values: ${validStatuses.join(', ')}.`,
        },
        { status: 400 }
      );
    }

    const supabase = getServerSupabaseClient(ownership.token);

    const { data: updated, error } = await supabase
      .from('services')
      .update({
        status,
        updated_at: new Date().toISOString(),
      })
      .eq('id', params.id)
      .select(`
        *,
        category:categories(*),
        provider:profiles!services_provider_id_fkey(id, full_name, avatar_url, college, location, verification_status)
      `)
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      serviceId: params.id,
      status,
      service: updated,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to change listing status';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
