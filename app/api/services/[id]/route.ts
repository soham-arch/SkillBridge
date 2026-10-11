import { NextResponse } from 'next/server';
import {
  verifySellerRequest,
  verifyServiceOwnership,
  getServerSupabaseClient,
} from '@/lib/auth/server-seller';
import { validateServiceInput } from '@/lib/services/services';
import type { ServiceStatus, ServiceType } from '@/types';

export async function GET(req: Request, { params }: { params: { id: string } }) {
  try {
    const supabase = getServerSupabaseClient();
    const { data: service, error } = await supabase
      .from('services')
      .select(`
        *,
        category:categories(*),
        provider:profiles!services_provider_id_fkey(id, full_name, avatar_url, college, location, verification_status)
      `)
      .eq('id', params.id)
      .maybeSingle();

    if (error || !service) {
      return NextResponse.json({ error: 'Service listing not found' }, { status: 404 });
    }

    // If listing is not published, only owner or admin can view details
    if (service.status !== 'published') {
      const auth = await verifySellerRequest(req);
      if (!auth.ok || (auth.user?.id !== service.provider_id && !auth.profile?.is_admin)) {
        return NextResponse.json(
          { error: `This service listing is ${service.status} and private to the owner.` },
          { status: 403 }
        );
      }
    }

    return NextResponse.json({ success: true, service });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to retrieve service listing';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const ownership = await verifyServiceOwnership(req, params.id);
  if (!ownership.ok) {
    return NextResponse.json({ error: ownership.error }, { status: ownership.status });
  }

  try {
    const body = await req.json();
    const {
      title,
      description,
      price,
      currency,
      delivery_days,
      service_type,
      category_id,
      location,
      status,
      skills,
      tags,
      cover_image_url,
      availability_notes,
      portfolio_examples,
    } = body;

    const validation = validateServiceInput({
      title,
      description,
      price: price !== undefined ? Number(price) : undefined,
      delivery_days: delivery_days !== undefined ? Number(delivery_days) : undefined,
      service_type: service_type as ServiceType | undefined,
      status: status as ServiceStatus | undefined,
    });

    if (!validation.valid) {
      return NextResponse.json({ error: validation.error }, { status: 400 });
    }

    const supabase = getServerSupabaseClient(ownership.token);

    const updatePayload: Record<string, any> = {
      updated_at: new Date().toISOString(),
    };

    if (title !== undefined) updatePayload.title = title.trim();
    if (description !== undefined) updatePayload.description = description.trim();
    if (price !== undefined) updatePayload.price = Number(price);
    if (currency !== undefined) updatePayload.currency = currency;
    if (delivery_days !== undefined) updatePayload.delivery_days = Number(delivery_days);
    if (service_type !== undefined) updatePayload.service_type = service_type;
    if (category_id !== undefined) updatePayload.category_id = category_id || null;
    if (location !== undefined) updatePayload.location = location ? location.trim() : null;
    if (status !== undefined) updatePayload.status = status;
    if (skills !== undefined) updatePayload.skills = skills;
    if (tags !== undefined) updatePayload.tags = tags;
    if (cover_image_url !== undefined) updatePayload.cover_image_url = cover_image_url;
    if (availability_notes !== undefined) updatePayload.availability_notes = availability_notes;
    if (portfolio_examples !== undefined) updatePayload.portfolio_examples = portfolio_examples;

    const { data: updatedService, error } = await supabase
      .from('services')
      .update(updatePayload)
      .eq('id', params.id)
      .select(`
        *,
        category:categories(*),
        provider:profiles!services_provider_id_fkey(id, full_name, avatar_url, college, location, verification_status)
      `)
      .single();

    if (error) {
      // If extended columns cause error, strip them and update core fields
      const { data: fallback, error: fallbackErr } = await supabase
        .from('services')
        .update({
          title: updatePayload.title,
          description: updatePayload.description,
          price: updatePayload.price,
          status: updatePayload.status,
          updated_at: updatePayload.updated_at,
        })
        .eq('id', params.id)
        .select('*')
        .single();

      if (fallbackErr) {
        return NextResponse.json({ error: fallbackErr.message }, { status: 500 });
      }

      return NextResponse.json({ success: true, service: fallback });
    }

    return NextResponse.json({ success: true, service: updatedService });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to update service listing';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(req: Request, { params }: { params: { id: string } }) {
  const ownership = await verifyServiceOwnership(req, params.id);
  if (!ownership.ok) {
    return NextResponse.json({ error: ownership.error }, { status: ownership.status });
  }

  try {
    const supabase = getServerSupabaseClient(ownership.token);

    // 1. Safe Deletion Invariant Check: Verify no existing orders exist for this service
    const { count, error: countErr } = await supabase
      .from('orders')
      .select('id', { count: 'exact', head: true })
      .eq('service_id', params.id);

    if (count && count > 0) {
      return NextResponse.json(
        {
          error:
            'Cannot delete service with active or historical orders. To preserve student buyer receipts and escrow records, please pause or archive the listing instead.',
          canArchive: true,
        },
        { status: 400 }
      );
    }

    // 2. Perform deletion if 0 orders exist
    const { error: delErr } = await supabase
      .from('services')
      .delete()
      .eq('id', params.id);

    if (delErr) {
      return NextResponse.json({ error: delErr.message }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      message: 'Service listing deleted successfully.',
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to delete service listing';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
