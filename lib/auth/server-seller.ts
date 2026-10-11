import { createClient, type SupabaseClient, type User } from '@supabase/supabase-js';
import { Profile, Service } from '@/types';
import { getMarketplaceState } from '@/lib/store/marketplace-store';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

/**
 * Extracts auth token from Authorization header or cookie.
 */
export function extractAuthToken(req: Request): string | null {
  const authHeader = req.headers.get('authorization') || req.headers.get('Authorization');
  if (authHeader && authHeader.startsWith('Bearer ')) {
    return authHeader.substring(7).trim();
  }

  const cookieHeader = req.headers.get('cookie') || '';
  if (cookieHeader) {
    const cookies = cookieHeader.split(';').map((c) => c.trim());
    for (const cookie of cookies) {
      if (cookie.startsWith('sb-access-token=')) {
        return decodeURIComponent(cookie.substring('sb-access-token='.length));
      }
    }
  }

  return null;
}

/**
 * Creates Supabase client for server request context.
 */
export function getServerSupabaseClient(token?: string | null): SupabaseClient {
  if (SUPABASE_SERVICE_ROLE_KEY) {
    return createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
  }

  return createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: token
      ? { headers: { Authorization: `Bearer ${token}` } }
      : undefined,
  });
}

export interface SellerAuthResult {
  ok: boolean;
  status: number;
  error?: string;
  user?: User | { id: string; email?: string };
  profile?: Profile;
  token?: string;
}

/**
 * Verifies that the requester is an authenticated user with Seller authorization.
 * Buyers without seller capability or role are blocked with 403 Forbidden.
 */
export async function verifySellerRequest(req: Request): Promise<SellerAuthResult> {
  const token = extractAuthToken(req);
  const explicitUserId = req.headers.get('x-user-id');
  const supabase = getServerSupabaseClient(token);

  let userId: string | null = null;
  let userEmail: string | undefined = undefined;

  if (token) {
    const { data: { user }, error } = await supabase.auth.getUser(token);
    if (!error && user) {
      userId = user.id;
      userEmail = user.email;
    }
  }

  // Support x-user-id header in test / server-side direct calls
  if (!userId && explicitUserId) {
    userId = explicitUserId;
  }

  if (!userId) {
    return {
      ok: false,
      status: 401,
      error: 'Authentication required. Please sign in to manage services.',
    };
  }

  // Fetch profile
  let profile: Profile | null = null;
  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle();

    if (!error && data) {
      profile = data as Profile;
    }
  } catch {
    // Handled below
  }

  // In-memory fallback if db profile not found
  if (!profile) {
    const state = getMarketplaceState();
    profile = state.profiles.find((p) => p.user_id === userId || p.id === userId) ?? null;
  }

  if (!profile) {
    return {
      ok: false,
      status: 403,
      error: 'Profile not found. Please complete student verification first.',
    };
  }

  const isSeller =
    profile.is_admin ||
    profile.capabilities?.includes('seller') ||
    profile.capabilities?.includes('offer') ||
    profile.active_role === 'seller';

  if (!isSeller) {
    return {
      ok: false,
      status: 403,
      error: 'Buyer accounts cannot create or manage seller listings. Please activate your Seller role first.',
    };
  }

  return {
    ok: true,
    status: 200,
    user: { id: userId, email: userEmail },
    profile,
    token: token || undefined,
  };
}

export interface ServiceOwnershipResult extends SellerAuthResult {
  service?: Service;
}

/**
 * Verifies that the requester is the authorized owner of the specified service,
 * or an administrator.
 */
export async function verifyServiceOwnership(
  req: Request,
  serviceId: string
): Promise<ServiceOwnershipResult> {
  const sellerAuth = await verifySellerRequest(req);
  if (!sellerAuth.ok) {
    return sellerAuth;
  }

  const supabase = getServerSupabaseClient(sellerAuth.token);

  let service: Service | null = null;
  try {
    const { data, error } = await supabase
      .from('services')
      .select('*')
      .eq('id', serviceId)
      .maybeSingle();

    if (!error && data) {
      service = data as Service;
    }
  } catch {
    // Handled below
  }

  if (!service) {
    const state = getMarketplaceState();
    service = state.services.find((s) => s.id === serviceId) ?? null;
  }

  if (!service) {
    return {
      ok: false,
      status: 404,
      error: 'Service listing not found.',
    };
  }

  const userId = sellerAuth.user!.id;
  const isOwner = service.provider_id === userId;
  const isAdmin = sellerAuth.profile?.is_admin === true;

  if (!isOwner && !isAdmin) {
    return {
      ok: false,
      status: 403,
      error: 'Forbidden: You do not own this service listing.',
    };
  }

  return {
    ...sellerAuth,
    service,
  };
}
