import { getSupabaseClient } from '@/lib/supabase/client';
import {
  getAllServices,
  getServiceDetail,
  createNewService,
  getMarketplaceState,
} from '@/lib/store/marketplace-store';
import type { Service, ServiceStatus } from '@/types';

export interface ServiceInput {
  provider_id: string;
  title: string;
  description: string;
  price: number;
  location: string;
  category_id: string | null;
  status: ServiceStatus;
  delivery_days?: number;
  tags?: string[];
  skills?: string[];
}

export async function createService(input: ServiceInput): Promise<Service> {
  try {
    const supabase = getSupabaseClient();
    const { data, error } = await supabase
      .from('services')
      .insert({
        provider_id: input.provider_id,
        title: input.title,
        description: input.description,
        price: input.price,
        location: input.location || null,
        category_id: input.category_id,
        status: input.status,
      })
      .select('*')
      .single();

    if (!error && data) {
      return data as Service;
    }
  } catch {
    // Fall back to local store
  }

  // Use resilient store
  return createNewService({
    provider_id: input.provider_id,
    title: input.title,
    description: input.description,
    price: input.price,
    location: input.location || null,
    category_id: input.category_id,
    status: input.status,
    delivery_days: input.delivery_days ?? 3,
    tags: input.tags ?? ['Student Talent'],
    skills: input.skills ?? [],
  });
}

export async function getServiceById(id: string): Promise<Service | null> {
  try {
    const supabase = getSupabaseClient();
    const { data, error } = await supabase
      .from('services')
      .select(
        `*,
        category:categories(*),
        provider:profiles!services_provider_id_fkey(id, full_name, avatar_url, college, location)`
      )
      .eq('id', id)
      .maybeSingle();

    if (!error && data) {
      return data as Service;
    }
  } catch {
    // Fall back to local store
  }

  return getServiceDetail(id);
}

export async function getMyServices(): Promise<Service[]> {
  try {
    const supabase = getSupabaseClient();
    const { data: { session } } = await supabase.auth.getSession();
    if (session?.user?.id) {
      const { data, error } = await supabase
        .from('services')
        .select(`*, category:categories(*)`)
        .eq('provider_id', session.user.id)
        .order('created_at', { ascending: false });

      if (!error && data && data.length > 0) {
        return data as Service[];
      }
    }
  } catch {
    // Fall back to local store
  }

  const state = getMarketplaceState();
  // By default, show Alex Sharma's (demo seller) services or current logged in user
  const userId = '10000000-0000-0000-0000-000000000001';
  return state.services
    .filter((s) => s.provider_id === userId)
    .map((s) => ({
      ...s,
      category: state.categories.find((c) => c.id === s.category_id) ?? null,
    }));
}

export interface ExploreFilters {
  query?: string;
  category_id?: string | null;
  sort?: 'newest' | 'price_low' | 'price_high' | 'rating';
  verifiedOnly?: boolean;
}

export async function getPublishedServices(filters: ExploreFilters = {}): Promise<Service[]> {
  try {
    const supabase = getSupabaseClient();
    let q = supabase
      .from('services')
      .select(
        `*,
        category:categories(*),
        provider:profiles!services_provider_id_fkey(id, full_name, avatar_url, college, location)`
      )
      .eq('status', 'published');

    if (filters.query) {
      q = q.or(`title.ilike.%${filters.query}%,description.ilike.%${filters.query}%`);
    }

    if (filters.category_id) {
      q = q.eq('category_id', filters.category_id);
    }

    switch (filters.sort) {
      case 'price_low':
        q = q.order('price', { ascending: true });
        break;
      case 'price_high':
        q = q.order('price', { ascending: false });
        break;
      default:
        q = q.order('created_at', { ascending: false });
    }

    const { data, error } = await q.limit(50);

    if (!error && data && data.length > 0) {
      return data as Service[];
    }
  } catch {
    // Fall back to local store
  }

  // Use resilient store
  return getAllServices({
    query: filters.query,
    categoryId: filters.category_id,
    sort: filters.sort,
    verifiedOnly: filters.verifiedOnly,
  });
}
