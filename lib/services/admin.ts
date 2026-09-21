import { getMarketplaceState, saveMarketplaceState } from '@/lib/store/marketplace-store';
import { Service, Order, Profile, VerificationRequest } from '@/types';

export interface PlatformMetrics {
  totalUsers: number;
  verifiedStudents: number;
  totalServices: number;
  totalOrders: number;
  completedOrders: number;
  grossMarketplaceVolume: number;
  pendingVerifications: number;
}

export async function fetchPlatformMetrics(): Promise<PlatformMetrics> {
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

export async function fetchAllUsers(): Promise<Profile[]> {
  const state = getMarketplaceState();
  return state.profiles;
}

export async function toggleUserStatus(userId: string, action: 'verify' | 'suspend' | 'reset'): Promise<Profile | null> {
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

export async function moderateServiceListing(serviceId: string, status: 'published' | 'paused' | 'archived'): Promise<Service | null> {
  const state = getMarketplaceState();
  const svc = state.services.find((s) => s.id === serviceId);
  if (!svc) return null;

  svc.status = status;
  saveMarketplaceState(state);
  return svc;
}

export async function fetchAllOrdersAdmin(): Promise<Order[]> {
  const state = getMarketplaceState();
  return state.orders;
}
