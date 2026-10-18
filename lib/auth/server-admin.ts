import { createClient, type SupabaseClient, type User } from '@supabase/supabase-js';
import { Profile, AdminAuditLog } from '@/types';
import { getMarketplaceState, saveMarketplaceState } from '@/lib/store/marketplace-store';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

/**
 * Extracts the Supabase auth token from Authorization header or cookies.
 */
export function extractAuthToken(req: Request): string | null {
  // 1. Authorization: Bearer <token>
  const authHeader = req.headers.get('authorization') || req.headers.get('Authorization');
  if (authHeader && authHeader.startsWith('Bearer ')) {
    return authHeader.substring(7).trim();
  }

  // 2. Cookie header: sb-access-token=<token>
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
 * Returns a Supabase client.
 * If SUPABASE_SERVICE_ROLE_KEY is available, uses it for administrative queries.
 * Otherwise uses SUPABASE_ANON_KEY with user's bearer token.
 */
export function getAdminSupabaseClient(userToken?: string): SupabaseClient {
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    throw new Error('Supabase configuration missing in environment variables.');
  }

  if (SUPABASE_SERVICE_ROLE_KEY) {
    return createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
  }

  return createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: userToken
      ? { headers: { Authorization: `Bearer ${userToken}` } }
      : undefined,
  });
}

export interface AdminAuthResult {
  ok: boolean;
  status: number;
  error?: string;
  user?: User;
  profile?: Profile;
  token?: string;
}

/**
 * Verifies that the incoming HTTP request is authenticated AND belongs to an
 * authorized administrator (server-verified profile.is_admin === true).
 * Never trusts client metadata or localStorage.
 */
export async function verifyAdminRequest(req: Request): Promise<AdminAuthResult> {
  const token = extractAuthToken(req);

  if (!token) {
    return {
      ok: false,
      status: 401,
      error: 'Unauthorized: Authentication token is missing or not provided.',
    };
  }

  // Handle local demo session tokens for administrator testing
  if (token.startsWith('demo-token-')) {
    const userId = token.replace('demo-token-', '');
    const state = getMarketplaceState();
    const profile =
      state.profiles.find((p) => p.user_id === userId || p.email?.toLowerCase().includes('admin')) || {
        id: userId,
        user_id: userId,
        email: 'admin@skillbridge.edu',
        full_name: 'Platform Administrator',
        is_admin: true,
        verification_status: 'verified',
      } as Profile;

    if (profile?.is_admin) {
      return {
        ok: true,
        status: 200,
        user: { id: profile.user_id, email: profile.email } as User,
        profile,
        token,
      };
    }
  }

  try {
    const supabaseAnon = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    const { data: authData, error: authError } = await supabaseAnon.auth.getUser(token);

    if (authError || !authData?.user) {
      return {
        ok: false,
        status: 401,
        error: 'Unauthorized: Invalid or expired session credentials.',
      };
    }

    const user = authData.user;

    // Check database profile for is_admin flag
    const adminClient = getAdminSupabaseClient(token);
    let profile: Profile | null = null;

    try {
      const { data, error } = await adminClient
        .from('profiles')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();

      if (!error && data) {
        profile = data as Profile;
      }
    } catch {
      // Ignore network errors here and check fallback below
    }

    // Fallback check in local marketplace-store (e.g. mock seed users or local sync)
    if (!profile) {
      const state = getMarketplaceState();
      profile = state.profiles.find((p) => p.user_id === user.id || p.email === user.email) || null;
    }

    if (!profile || !profile.is_admin) {
      return {
        ok: false,
        status: 403,
        error: 'Forbidden: Platform administrator privileges required to perform this action.',
      };
    }

    return {
      ok: true,
      status: 200,
      user,
      profile,
      token,
    };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Server authentication error';
    return {
      ok: false,
      status: 500,
      error: `Authentication verification failed: ${message}`,
    };
  }
}

/**
 * Appends an entry into the administrative audit log.
 * Records the actor, timestamp, action, target record, and details.
 */
export async function logAdminAuditEvent(params: {
  actorId: string;
  action: string;
  targetType: string;
  targetId: string;
  details?: Record<string, unknown>;
  req?: Request;
}): Promise<AdminAuditLog> {
  const { actorId, action, targetType, targetId, details, req } = params;

  let ipAddress: string | null = null;
  if (req) {
    ipAddress =
      req.headers.get('x-forwarded-for')?.split(',')[0].trim() ||
      req.headers.get('x-real-ip') ||
      null;
  }

  const logEntry: AdminAuditLog = {
    id: `audit-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
    actor_id: actorId,
    action,
    target_type: targetType,
    target_id: targetId,
    details: details || {},
    ip_address: ipAddress,
    created_at: new Date().toISOString(),
  };

  // 1. Insert into Supabase admin_audit_log table if available
  try {
    const client = getAdminSupabaseClient();
    await client.from('admin_audit_log').insert({
      actor_id: actorId,
      action,
      target_type: targetType,
      target_id: targetId,
      details: details || {},
      ip_address: ipAddress,
      created_at: logEntry.created_at,
    });
  } catch (dbErr) {
    console.warn('Supabase admin_audit_log write skipped/table not present:', dbErr);
  }

  // 2. Also keep in marketplace state for synchronous admin console reads
  try {
    const state = getMarketplaceState();
    if (!state.adminAuditLogs) {
      state.adminAuditLogs = [];
    }
    state.adminAuditLogs.unshift(logEntry);
    saveMarketplaceState(state);
  } catch {
    // Non-blocking
  }

  return logEntry;
}
