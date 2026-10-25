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

export interface UserAuthResult {
  ok: boolean;
  status: number;
  error?: string;
  user?: User | { id: string; email?: string; user_metadata?: { full_name?: string } };
  profile?: Profile;
  token?: string;
}

/**
 * Authenticates any user request (buyer, seller, or admin).
 * Supports:
 * 1. Authorization: Bearer <Supabase JWT>
 * 2. Cookie sb-access-token=<Supabase JWT>
 * 3. Synthetic demo tokens (demo-token-<userId>) for local demo personas
 * 4. x-user-id header for development/sandbox/test calls
 */
export async function verifyUserRequest(
  req: Request,
  fallbackUserId?: string | null
): Promise<UserAuthResult> {
  const token = extractAuthToken(req);
  const explicitUserId = req.headers.get('x-user-id') || fallbackUserId || null;

  // 1. Synthetic demo tokens (demo-token-<userId>)
  if (token && token.startsWith('demo-token-')) {
    const userId = token.replace('demo-token-', '');
    const state = getMarketplaceState();
    let profile = state.profiles.find((p) => p.user_id === userId || p.id === userId) ?? null;

    if (!profile) {
      try {
        const supabase = getServerSupabaseClient();
        const { data } = await supabase
          .from('profiles')
          .select('*')
          .eq('user_id', userId)
          .maybeSingle();
        if (data) profile = data as Profile;
      } catch {
        // Non-blocking
      }
    }

    const email = profile?.email || 'student@skillbridge.edu';
    const fullName = profile?.full_name || 'Campus Student';

    return {
      ok: true,
      status: 200,
      user: {
        id: userId,
        email,
        user_metadata: { full_name: fullName },
        aud: 'authenticated',
        created_at: new Date().toISOString(),
      } as unknown as User,
      profile: profile || undefined,
      token,
    };
  }

  // 2. Real Supabase JWT verification
  if (token) {
    try {
      const supabaseAnon = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
        auth: { persistSession: false, autoRefreshToken: false },
      });
      const { data: { user }, error: authErr } = await supabaseAnon.auth.getUser(token);
      if (!authErr && user) {
        let profile: Profile | null = null;
        try {
          const supabase = getServerSupabaseClient();
          const { data } = await supabase
            .from('profiles')
            .select('*')
            .eq('user_id', user.id)
            .maybeSingle();
          if (data) profile = data as Profile;
        } catch {
          // Non-blocking
        }
        if (!profile) {
          const state = getMarketplaceState();
          profile = state.profiles.find((p) => p.user_id === user.id || p.id === user.id) ?? null;
        }

        return {
          ok: true,
          status: 200,
          user,
          profile: profile || undefined,
          token,
        };
      }
    } catch (err) {
      console.warn('Supabase token verification check:', err);
    }
  }

  // 3. Fallback: x-user-id header or fallbackUserId
  if (explicitUserId) {
    const state = getMarketplaceState();
    let profile = state.profiles.find((p) => p.user_id === explicitUserId || p.id === explicitUserId) ?? null;

    if (!profile) {
      try {
        const supabase = getServerSupabaseClient();
        const { data } = await supabase
          .from('profiles')
          .select('*')
          .eq('user_id', explicitUserId)
          .maybeSingle();
        if (data) profile = data as Profile;
      } catch {
        // Non-blocking
      }
    }

    const email = profile?.email || 'student@skillbridge.edu';
    const fullName = profile?.full_name || 'Campus Student';

    return {
      ok: true,
      status: 200,
      user: {
        id: explicitUserId,
        email,
        user_metadata: { full_name: fullName },
        aud: 'authenticated',
        created_at: new Date().toISOString(),
      } as unknown as User,
      profile: profile || undefined,
      token: token || undefined,
    };
  }

  return {
    ok: false,
    status: 401,
    error: 'Unauthorized. Please sign in to checkout.',
  };
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
    if (token.startsWith('demo-token-')) {
      userId = token.replace('demo-token-', '');
      const state = getMarketplaceState();
      const p = state.profiles.find((pr) => pr.user_id === userId || pr.id === userId);
      if (p?.email) userEmail = p.email;
    } else {
      try {
        const supabaseAnon = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
          auth: { persistSession: false, autoRefreshToken: false },
        });
        const { data: { user }, error } = await supabaseAnon.auth.getUser(token);
        if (!error && user) {
          userId = user.id;
          userEmail = user.email;
        }
      } catch {}
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
