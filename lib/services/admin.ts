import { getSupabaseClient } from '@/lib/supabase/client';
import { getMarketplaceState, saveMarketplaceState, getAdminAuditLogs } from '@/lib/store/marketplace-store';
import { Service, Order, Profile, AdminAuditLog } from '@/types';

export interface PlatformMetrics {
  totalUsers: number;
  verifiedStudents: number;
  totalServices: number;
  totalOrders: number;
  completedOrders: number;
  grossMarketplaceVolume: number;
  pendingVerifications: number;
}

/**
 * Helper to get authorization headers from current Supabase session.
 */
async function getAuthHeaders(explicitToken?: string): Promise<Record<string, string>> {
  if (explicitToken) {
    return {
      Authorization: `Bearer ${explicitToken}`,
      'Content-Type': 'application/json',
    };
  }

  try {
    const supabase = getSupabaseClient();
    const { data } = await supabase.auth.getSession();
    const token = data.session?.access_token;
    if (token) {
      return {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      };
    }
  } catch {
    // In server environment or unauthenticated client
  }

  return { 'Content-Type': 'application/json' };
}

/**
 * Fetches platform aggregate metrics through server-authorized API.
 */
export async function fetchPlatformMetrics(token?: string): Promise<PlatformMetrics> {
  try {
    const headers = await getAuthHeaders(token);
    const res = await fetch('/api/admin/metrics', { headers });

    if (res.ok) {
      const data = await res.json();
      if (data.metrics) return data.metrics;
    }
  } catch {
    // Fall back to store metrics if API is unreachable
  }

  const state = getMarketplaceState();
  const totalUsers = state.profiles.length;
  const verifiedStudents = state.profiles.filter((p) => p.verification_status === 'verified').length;
  const totalServices = state.services.length;
  const totalOrders = state.orders.length;
  const completedOrders = state.orders.filter((o) => o.status === 'completed').length;
  const gmv = state.orders
    .filter((o) => o.payment_status === 'paid')
    .reduce((sum, o) => sum + o.price, 0);
  const pendingVerifications = state.verifications.filter((v) => v.status === 'pending').length;

  return {
    totalUsers,
    verifiedStudents,
    totalServices,
    totalOrders,
    completedOrders,
    grossMarketplaceVolume: gmv,
    pendingVerifications,
  };
}

/**
 * Fetches all platform profiles through server-authorized API.
 */
export async function fetchAllUsers(token?: string): Promise<Profile[]> {
  try {
    const headers = await getAuthHeaders(token);
    const res = await fetch('/api/admin/users', { headers });

    if (res.ok) {
      const data = await res.json();
      if (data.users) return data.users;
    }
  } catch {
    // Fall back to local store
  }

  const state = getMarketplaceState();
  return state.profiles;
}

/**
 * Performs an admin action on a user account (suspend, reinstate, grant_admin, revoke_admin).
 */
export async function performUserAction(params: {
  targetUserId: string;
  action: 'suspend' | 'reinstate' | 'grant_admin' | 'revoke_admin';
  notes?: string;
  token?: string;
}): Promise<Profile | null> {
  const { targetUserId, action, notes, token } = params;

  const headers = await getAuthHeaders(token);
  const res = await fetch('/api/admin/users/action', {
    method: 'POST',
    headers,
    body: JSON.stringify({ targetUserId, action, notes }),
  });

  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error || `Failed to perform user action: ${action}`);
  }

  const data = await res.json();
  return data.profile || null;
}

/**
 * Toggles a user's verification status (suspend, reinstate, reset).
 */
export async function toggleUserStatus(
  userId: string,
  action: 'verify' | 'suspend' | 'reset',
  token?: string
): Promise<Profile | null> {
  const adminAction = action === 'suspend' ? 'suspend' : 'reinstate';
  try {
    return await performUserAction({
      targetUserId: userId,
      action: adminAction,
      token,
    });
  } catch {
    const state = getMarketplaceState();
    const prof = state.profiles.find((p) => p.user_id === userId);
    if (!prof) return null;

    if (action === 'verify') {
      prof.verification_status = 'verified';
      prof.verified_at = new Date().toISOString();
    } else if (action === 'suspend') {
      prof.verification_status = 'rejected';
    } else {
      prof.verification_status = 'not_verified';
    }

    saveMarketplaceState(state);
    return prof;
  }
}

/**
 * Moderates a service listing (published, paused, archived) through server-authorized API.
 */
export async function moderateServiceListing(
  serviceId: string,
  status: 'published' | 'paused' | 'archived',
  token?: string
): Promise<Service | null> {
  try {
    const headers = await getAuthHeaders(token);
    const res = await fetch('/api/admin/services/moderate', {
      method: 'POST',
      headers,
      body: JSON.stringify({ serviceId, status }),
    });

    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Failed to moderate service');
    }
  } catch (err: unknown) {
    // If running offline/fallback
    const state = getMarketplaceState();
    const svc = state.services.find((s) => s.id === serviceId);
    if (!svc) return null;

    svc.status = status;
    saveMarketplaceState(state);
    return svc;
  }

  const state = getMarketplaceState();
  const svc = state.services.find((s) => s.id === serviceId);
  return svc || null;
}

/**
 * Fetches all platform orders through server-authorized API (prevents IDOR).
 */
export async function fetchAllOrdersAdmin(token?: string): Promise<Order[]> {
  try {
    const headers = await getAuthHeaders(token);
    const res = await fetch('/api/admin/orders', { headers });

    if (res.ok) {
      const data = await res.json();
      if (data.orders) return data.orders;
    }
  } catch {
    // Fall back to local store
  }

  const state = getMarketplaceState();
  return state.orders;
}

/**
 * Fetches platform governance audit log records through server-authorized API.
 */
export async function fetchAdminAuditLogs(token?: string): Promise<AdminAuditLog[]> {
  try {
    const headers = await getAuthHeaders(token);
    const res = await fetch('/api/admin/audit-logs', { headers });

    if (res.ok) {
      const data = await res.json();
      if (data.logs) return data.logs;
    }
  } catch {
    // Fall back to local store
  }

  return getAdminAuditLogs();
}

/**
 * Generates signed URL for previewing private verification documents via server-authorized API.
 */
export async function createAdminDocumentSignedUrl(
  documentPath: string,
  token?: string
): Promise<string> {
  const headers = await getAuthHeaders(token);
  const res = await fetch('/api/admin/verifications/signed-url', {
    method: 'POST',
    headers,
    body: JSON.stringify({ documentPath }),
  });

  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error || 'Failed to generate secure preview URL');
  }

  const data = await res.json();
  return data.signedUrl;
}
