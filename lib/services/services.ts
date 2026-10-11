import { getSupabaseClient } from '@/lib/supabase/client';
import {
  getAllServices,
  getServiceDetail,
  getMarketplaceState,
  saveMarketplaceState,
} from '@/lib/store/marketplace-store';
import type { Service, ServiceStatus, ServiceType, PortfolioItem, Review } from '@/types';

export interface ServiceInput {
  provider_id: string;
  title: string;
  description: string;
  price: number;
  currency?: string;
  delivery_days?: number;
  service_type?: ServiceType;
  location?: string | null;
  category_id: string | null;
  status: ServiceStatus;
  tags?: string[];
  skills?: string[];
  cover_image_url?: string | null;
  availability_notes?: string | null;
  portfolio_examples?: PortfolioItem[];
}

/**
 * Validates service input fields against platform constraints.
 */
export function validateServiceInput(input: Partial<ServiceInput>): { valid: boolean; error?: string } {
  if (input.title !== undefined) {
    const title = input.title.trim();
    if (!title) return { valid: false, error: 'Service title is required.' };
    if (title.length < 5) return { valid: false, error: 'Service title must be at least 5 characters long.' };
    if (title.length > 100) return { valid: false, error: 'Service title cannot exceed 100 characters.' };
  }

  if (input.description !== undefined) {
    const desc = input.description.trim();
    if (!desc) return { valid: false, error: 'Service description is required.' };
    if (desc.length < 20) {
      return { valid: false, error: 'Please provide a descriptive scope (minimum 20 characters).' };
    }
  }

  if (input.price !== undefined) {
    if (typeof input.price !== 'number' || isNaN(input.price)) {
      return { valid: false, error: 'Price must be a valid number.' };
    }
    if (input.price < 50) {
      return { valid: false, error: 'Minimum service price is ₹50.' };
    }
    if (input.price > 100000) {
      return { valid: false, error: 'Price exceeds maximum campus marketplace threshold (₹1,00,000).' };
    }
  }

  if (input.delivery_days !== undefined) {
    if (
      typeof input.delivery_days !== 'number' ||
      isNaN(input.delivery_days) ||
      input.delivery_days < 1 ||
      input.delivery_days > 60
    ) {
      return { valid: false, error: 'Delivery turnaround must be between 1 and 60 days.' };
    }
  }

  if (input.service_type !== undefined) {
    if (!['digital', 'in_person', 'hybrid'].includes(input.service_type)) {
      return { valid: false, error: 'Invalid service delivery type.' };
    }
  }

  if (input.status !== undefined) {
    if (!['draft', 'published', 'paused', 'archived', 'moderated'].includes(input.status)) {
      return { valid: false, error: 'Invalid service status.' };
    }
  }

  return { valid: true };
}

/**
 * Creates a new student service listing in Supabase with validation.
 */
export async function createService(input: ServiceInput): Promise<Service> {
  const validation = validateServiceInput(input);
  if (!validation.valid) {
    throw new Error(validation.error);
  }

  const supabase = getSupabaseClient();
  const insertPayload = {
    provider_id: input.provider_id,
    title: input.title.trim(),
    description: input.description.trim(),
    price: input.price,
    currency: input.currency ?? 'INR',
    location: input.location || null,
    category_id: input.category_id,
    status: input.status,
    delivery_days: input.delivery_days ?? 3,
    service_type: input.service_type ?? 'digital',
    skills: input.skills ?? [],
    tags: input.tags ?? input.skills ?? ['Student Talent'],
    cover_image_url: input.cover_image_url || null,
    availability_notes: input.availability_notes || null,
    portfolio_examples: input.portfolio_examples ?? [],
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

  if (!error && data) {
    return data as Service;
  }

  if (error) {
    // If extended columns are missing, attempt core insert fallback
    const { data: fallbackData, error: fallbackErr } = await supabase
      .from('services')
      .insert({
        provider_id: input.provider_id,
        title: input.title.trim(),
        description: input.description.trim(),
        price: input.price,
        location: input.location || null,
        category_id: input.category_id,
        status: input.status,
      })
      .select('*')
      .single();

    if (!fallbackErr && fallbackData) {
      return {
        ...fallbackData,
        delivery_days: input.delivery_days ?? 3,
        service_type: input.service_type ?? 'digital',
        currency: input.currency ?? 'INR',
        skills: input.skills ?? [],
        tags: input.tags ?? [],
        cover_image_url: input.cover_image_url || null,
      } as Service;
    }

    throw new Error(error.message || 'Failed to create service in database');
  }

  throw new Error('Failed to create service');
}

/**
 * Updates an existing service listing in Supabase with validation and ownership check.
 */
export async function updateService(
  serviceId: string,
  input: Partial<ServiceInput>,
  userId?: string
): Promise<Service> {
  const validation = validateServiceInput(input);
  if (!validation.valid) {
    throw new Error(validation.error);
  }

  const supabase = getSupabaseClient();

  // 1. Verify service exists and check ownership if userId provided
  const { data: existing, error: fetchErr } = await supabase
    .from('services')
    .select('*')
    .eq('id', serviceId)
    .maybeSingle();

  if (fetchErr || !existing) {
    throw new Error('Service listing could not be found.');
  }

  if (userId && existing.provider_id !== userId) {
    throw new Error('Unauthorized: You cannot edit another seller’s service listing.');
  }

  const updatePayload: Record<string, any> = {
    updated_at: new Date().toISOString(),
  };

  if (input.title !== undefined) updatePayload.title = input.title.trim();
  if (input.description !== undefined) updatePayload.description = input.description.trim();
  if (input.price !== undefined) updatePayload.price = input.price;
  if (input.currency !== undefined) updatePayload.currency = input.currency;
  if (input.delivery_days !== undefined) updatePayload.delivery_days = input.delivery_days;
  if (input.service_type !== undefined) updatePayload.service_type = input.service_type;
  if (input.category_id !== undefined) updatePayload.category_id = input.category_id || null;
  if (input.location !== undefined) updatePayload.location = input.location ? input.location.trim() : null;
  if (input.status !== undefined) updatePayload.status = input.status;
  if (input.skills !== undefined) updatePayload.skills = input.skills;
  if (input.tags !== undefined) updatePayload.tags = input.tags;
  if (input.cover_image_url !== undefined) updatePayload.cover_image_url = input.cover_image_url;
  if (input.availability_notes !== undefined) updatePayload.availability_notes = input.availability_notes;
  if (input.portfolio_examples !== undefined) updatePayload.portfolio_examples = input.portfolio_examples;

  const { data, error } = await supabase
    .from('services')
    .update(updatePayload)
    .eq('id', serviceId)
    .select(`
      *,
      category:categories(*),
      provider:profiles!services_provider_id_fkey(id, full_name, avatar_url, college, location, verification_status)
    `)
    .single();

  if (!error && data) {
    return data as Service;
  }

  if (error) {
    // Core fallback update
    const { data: fbData, error: fbErr } = await supabase
      .from('services')
      .update({
        title: updatePayload.title,
        description: updatePayload.description,
        price: updatePayload.price,
        status: updatePayload.status,
        updated_at: updatePayload.updated_at,
      })
      .eq('id', serviceId)
      .select('*')
      .single();

    if (!fbErr && fbData) {
      return fbData as Service;
    }
    throw new Error(error.message || 'Failed to update service listing');
  }

  throw new Error('Failed to update service listing');
}

/**
 * Changes a service listing's lifecycle status (published, paused, draft, archived).
 */
export async function changeServiceStatus(
  serviceId: string,
  newStatus: ServiceStatus,
  userId?: string
): Promise<Service> {
  return updateService(serviceId, { status: newStatus }, userId);
}

/**
 * Deletes a service listing safely.
 * If orders exist for this service, prevents deletion to preserve order history and buyer records.
 */
export async function deleteService(
  serviceId: string,
  userId?: string
): Promise<{ success: boolean; message: string }> {
  const supabase = getSupabaseClient();

  // 1. Verify existence and ownership
  const { data: existing, error: fetchErr } = await supabase
    .from('services')
    .select('id, provider_id, title')
    .eq('id', serviceId)
    .maybeSingle();

  if (fetchErr || !existing) {
    throw new Error('Service listing could not be found.');
  }

  if (userId && existing.provider_id !== userId) {
    throw new Error('Unauthorized: You cannot delete another seller’s service listing.');
  }

  // 2. SAFE DELETION INVARIANT: Check if any orders exist referencing this service
  const { count, error: countErr } = await supabase
    .from('orders')
    .select('id', { count: 'exact', head: true })
    .eq('service_id', serviceId);

  if (count && count > 0) {
    throw new Error(
      `Cannot delete "${existing.title}" because it has historical or active orders. To preserve student buyer receipts and escrow records, please pause or archive the listing instead.`
    );
  }

  // 3. Perform safe deletion
  const { error: delErr } = await supabase
    .from('services')
    .delete()
    .eq('id', serviceId);

  if (delErr) {
    throw new Error(delErr.message || 'Failed to delete service listing.');
  }

  return {
    success: true,
    message: 'Service listing has been deleted successfully.',
  };
}

/**
 * Uploads a service cover image or portfolio asset to Supabase Storage.
 * Enforces file format (JPEG, PNG, WebP) and maximum 5MB size limit.
 */
export async function uploadServiceCoverImage(file: File, userId: string): Promise<string> {
  const allowedTypes = ['image/jpeg', 'image/png', 'image/webp'];
  if (!allowedTypes.includes(file.type)) {
    throw new Error('Invalid file format. Please upload a JPEG, PNG, or WebP image.');
  }

  const maxSize = 5 * 1024 * 1024; // 5MB
  if (file.size > maxSize) {
    throw new Error('Image file is too large. Maximum allowed size is 5MB.');
  }

  const supabase = getSupabaseClient();
  const fileExt = file.name.split('.').pop() || 'png';
  const fileName = `${Date.now()}-${Math.random().toString(36).substring(2, 8)}.${fileExt}`;
  const filePath = `covers/${userId}/${fileName}`;

  // Try service-media bucket first, then portfolio-media fallback
  let bucketName = 'service-media';
  let { error: uploadError } = await supabase.storage
    .from(bucketName)
    .upload(filePath, file, { upsert: true, contentType: file.type });

  if (uploadError) {
    bucketName = 'portfolio-media';
    const { error: fbUploadErr } = await supabase.storage
      .from(bucketName)
      .upload(filePath, file, { upsert: true, contentType: file.type });

    if (fbUploadErr) {
      throw new Error(`Upload failed: ${uploadError.message || fbUploadErr.message}`);
    }
  }

  const { data } = supabase.storage.from(bucketName).getPublicUrl(filePath);
  if (!data?.publicUrl) {
    throw new Error('Failed to generate public URL for uploaded media.');
  }

  return data.publicUrl;
}

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Validates whether a given string is a valid UUID format.
 * Prevents PostgreSQL 22P02 "invalid input syntax for type uuid" errors.
 */
export function isValidUUID(id?: string | null): boolean {
  if (!id || typeof id !== 'string') return false;
  return UUID_REGEX.test(id.trim());
}

/**
 * Fetches a service by ID from Supabase with joined Category and Provider profile.
 * Validates identifier syntax before querying database to prevent query crashes.
 */
export async function getServiceById(id: string): Promise<Service | null> {
  const cleanId = id ? id.trim() : '';
  if (!cleanId) return null;

  try {
    const supabase = getSupabaseClient();

    // Query database directly if ID conforms to standard UUID
    if (isValidUUID(cleanId)) {
      const { data, error } = await supabase
        .from('services')
        .select(
          `*,
          category:categories(*),
          provider:profiles!services_provider_id_fkey(id, full_name, avatar_url, college, location, verification_status)`
        )
        .eq('id', cleanId)
        .maybeSingle();

      if (!error && data) {
        return data as Service;
      }
    }
  } catch (err) {
    console.warn('Database query error in getServiceById:', err);
  }

  // Graceful fallback to seed detail for legacy or mock identifiers
  return getServiceDetail(cleanId);
}


/**
 * Fetches all services owned by the current authenticated seller.
 */
export async function getMyServices(): Promise<Service[]> {
  try {
    const supabase = getSupabaseClient();
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user?.id) {
      return [];
    }

    const { data, error } = await supabase
      .from('services')
      .select(`*, category:categories(*)`)
      .eq('provider_id', session.user.id)
      .order('created_at', { ascending: false });

    if (!error && data) {
      return data as Service[];
    }
  } catch {
    // Handled below
  }
  return [];
}

/**
 * Fetches all reviews for a specific service from Supabase.
 */
export async function getServiceReviews(serviceId: string): Promise<Review[]> {
  try {
    const supabase = getSupabaseClient();
    const { data, error } = await supabase
      .from('reviews')
      .select(`
        *,
        reviewer:profiles!reviews_reviewer_id_fkey(id, full_name, avatar_url, college)
      `)
      .eq('service_id', serviceId)
      .order('created_at', { ascending: false });

    if (!error && data) {
      return data as Review[];
    }
  } catch (err) {
    console.error('Failed to fetch service reviews:', err);
  }
  return [];
}

export interface ExploreFilters {
  query?: string;
  category_id?: string | null;
  min_price?: number;
  max_price?: number;
  service_type?: 'digital' | 'in_person' | 'hybrid';
  sort?: 'newest' | 'price_low' | 'price_high' | 'rating';
  verifiedOnly?: boolean;
}

/**
 * Fetches published services matching search, category, and sorting filters from Supabase.
 * Strictly filters out draft, paused, archived, and moderated listings from public discovery.
 */
export async function getPublishedServices(filters: ExploreFilters = {}): Promise<Service[]> {
  try {
    const supabase = getSupabaseClient();
    let q = supabase
      .from('services')
      .select(
        `*,
        category:categories(*),
        provider:profiles!services_provider_id_fkey(id, full_name, avatar_url, college, location, verification_status)`
      )
      .eq('status', 'published');

    if (filters.query && filters.query.trim()) {
      const trimmed = filters.query.trim();
      q = q.or(`title.ilike.%${trimmed}%,description.ilike.%${trimmed}%`);
    }

    if (filters.category_id) {
      q = q.eq('category_id', filters.category_id);
    }

    if (filters.min_price !== undefined && !isNaN(filters.min_price)) {
      q = q.gte('price', filters.min_price);
    }

    if (filters.max_price !== undefined && !isNaN(filters.max_price)) {
      q = q.lte('price', filters.max_price);
    }

    if (filters.service_type) {
      q = q.eq('service_type', filters.service_type);
    }

    switch (filters.sort) {
      case 'price_low':
        q = q.order('price', { ascending: true });
        break;
      case 'price_high':
        q = q.order('price', { ascending: false });
        break;
      case 'rating':
        q = q.order('rating', { ascending: false, nullsFirst: false });
        break;
      default:
        q = q.order('created_at', { ascending: false });
    }

    const { data, error } = await q.limit(60);

    // If query succeeded without error, treat data (even empty array) as authoritative database result
    if (!error && data !== null) {
      if (filters.verifiedOnly) {
        return (data as Service[]).filter((s) => s.provider?.verification_status === 'verified');
      }
      return data as Service[];
    }
  } catch {
    // Fall back to seed services only if Supabase is completely offline
  }

  // Use seed catalog only when database is unreachable
  return getAllServices({
    query: filters.query,
    categoryId: filters.category_id,
    sort: filters.sort,
    verifiedOnly: filters.verifiedOnly,
    minPrice: filters.min_price,
    maxPrice: filters.max_price,
  });
}
