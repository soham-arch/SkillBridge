import { NextResponse } from 'next/server';
import { verifySellerRequest, getServerSupabaseClient } from '@/lib/auth/server-seller';
import { validateServiceInput } from '@/lib/services/services';
import type { ServiceStatus, ServiceType } from '@/types';

export async function POST(req: Request) {
  const auth = await verifySellerRequest(req);
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  try {
    const body = await req.json();
    const {
      title,
      description,
      price,
      currency = 'INR',
      delivery_days = 3,
      service_type = 'digital',
      category_id,
      location = 'Online / Campus',
      status = 'published',
      skills = [],
      tags = [],
      cover_image_url,
      availability_notes,
      portfolio_examples = [],
    } = body;

    const validation = validateServiceInput({
      title,
      description,
      price: Number(price),
      delivery_days: Number(delivery_days),
      service_type: service_type as ServiceType,
      status: status as ServiceStatus,
    });

    if (!validation.valid) {
      return NextResponse.json({ error: validation.error }, { status: 400 });
    }

    const supabase = getServerSupabaseClient(auth.token);
    const userId = auth.user!.id;

    const insertPayload = {
      provider_id: userId,
      title: title.trim(),
      description: description.trim(),
      price: Number(price),
      currency: currency || 'INR',
      delivery_days: Number(delivery_days) || 3,
      service_type: service_type || 'digital',
      category_id: category_id || null,
      location: location.trim(),
      status: status as ServiceStatus,
      skills: Array.isArray(skills) ? skills : [],
      tags: Array.isArray(tags) && tags.length > 0 ? tags : Array.isArray(skills) ? skills : [],
      cover_image_url: cover_image_url || null,
      availability_notes: availability_notes || null,
      portfolio_examples: Array.isArray(portfolio_examples) ? portfolio_examples : [],
    };

    const { data, error } = await supabase
      .from('services')
      .insert(insertPayload)
      .select(`
        *,
        category:categories(*),
        provider:profiles!services_provider_id_fkey(id, full_name, avatar_url, college, location, verification_status)
      `)
      .single();

    if (error) {
      // Fallback if extended schema columns not yet present in live db
      const { data: fallbackData, error: fallbackErr } = await supabase
        .from('services')
        .insert({
          provider_id: userId,
          title: title.trim(),
          description: description.trim(),
          price: Number(price),
          category_id: category_id || null,
          location: location.trim(),
          status: status as ServiceStatus,
        })
        .select('*')
        .single();

      if (fallbackErr) {
        return NextResponse.json({ error: fallbackErr.message }, { status: 500 });
      }

      return NextResponse.json(
        {
          success: true,
          service: {
            ...fallbackData,
            service_type,
            currency,
            delivery_days: Number(delivery_days) || 3,
            skills,
            tags,
            cover_image_url,
          },
        },
        { status: 201 }
      );
    }

    return NextResponse.json({ success: true, service: data }, { status: 201 });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to create service listing.';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
