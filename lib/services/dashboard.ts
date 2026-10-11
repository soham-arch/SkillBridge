import { fetchUserOrders, fetchSellerEarnings } from '@/lib/services/orders';
import { getMyServices } from '@/lib/services/services';
import { getMyBookingsAsCustomer, getMyBookingsAsProvider } from '@/lib/services/bookings';
import { fetchNotifications } from '@/lib/services/notifications';
import { Order, Service, Booking, NotificationItem, SellerEarnings } from '@/types';

export interface BuyerDashboardData {
  orders: Order[];
  activeOrders: Order[];
  completedOrders: Order[];
  awaitingReviewOrders: Order[];
  consultations: Booking[];
  notifications: NotificationItem[];
  metrics: {
    activeOrdersCount: number;
    inEscrow: number;
    completedOrdersCount: number;
    upcomingConsultationsCount: number;
    awaitingReviewCount: number;
  };
}

export interface SellerDashboardData {
  orders: Order[];
  incomingRequests: Order[];
  ongoingWork: Order[];
  completedOrders: Order[];
  consultations: Booking[];
  services: Service[];
  earnings: SellerEarnings;
  metrics: {
    totalEarned: number;
    inEscrow: number;
    completedOrdersCount: number;
    activeListingsCount: number;
    pendingRequestsCount: number;
  };
}

/**
 * Computes authoritative buyer dashboard data strictly from live database records.
 * Excludes all hardcoded fallbacks and estimates.
 */
export async function fetchBuyerDashboardData(userId: string): Promise<BuyerDashboardData> {
  const [orders, consultations, notifications] = await Promise.all([
    fetchUserOrders(userId, 'buyer'),
    getMyBookingsAsCustomer().catch(() => []),
    fetchNotifications(userId).catch(() => []),
  ]);

  const activeOrders = orders.filter(
    (o) =>
      o.status === 'seller_pending' ||
      o.status === 'accepted' ||
      o.status === 'in_progress' ||
      o.status === 'submitted' ||
      o.status === 'revision_requested'
  );

  const completedOrders = orders.filter((o) => o.status === 'completed');
  const awaitingReviewOrders = completedOrders.filter((o) => !o.review);

  // Escrow balance: sum of paid active orders only (strictly disjoint from completed/cancelled)
  const inEscrow = orders
    .filter(
      (o) =>
        o.payment_status === 'paid' &&
        o.status !== 'completed' &&
        o.status !== 'cancelled' &&
        o.status !== 'rejected'
    )
    .reduce((sum, o) => sum + Number(o.price || 0), 0);

  const upcomingConsultationsCount = consultations.filter((c) => c.status === 'confirmed').length;

  return {
    orders,
    activeOrders,
    completedOrders,
    awaitingReviewOrders,
    consultations,
    notifications: notifications.slice(0, 5),
    metrics: {
      activeOrdersCount: activeOrders.length,
      inEscrow,
      completedOrdersCount: completedOrders.length,
      upcomingConsultationsCount,
      awaitingReviewCount: awaitingReviewOrders.length,
    },
  };
}

/**
 * Computes authoritative seller dashboard data strictly from live database records.
 * Excludes all hardcoded fallbacks and estimates.
 */
export async function fetchSellerDashboardData(userId: string): Promise<SellerDashboardData> {
  const [earnings, orders, services, consultations] = await Promise.all([
    fetchSellerEarnings(userId),
    fetchUserOrders(userId, 'seller'),
    getMyServices().catch(() => []),
    getMyBookingsAsProvider().catch(() => []),
  ]);

  const incomingRequests = orders.filter(
    (o) => o.status === 'seller_pending' || o.status === 'pending_payment'
  );

  const ongoingWork = orders.filter(
    (o) =>
      o.status === 'accepted' ||
      o.status === 'in_progress' ||
      o.status === 'submitted' ||
      o.status === 'revision_requested'
  );

  const completedOrders = orders.filter((o) => o.status === 'completed');
  const activeListingsCount = services.filter((s) => s.status === 'published').length;

  return {
    orders,
    incomingRequests,
    ongoingWork,
    completedOrders,
    consultations,
    services,
    earnings,
    metrics: {
      totalEarned: earnings.total_earned,
      inEscrow: earnings.in_escrow,
      completedOrdersCount: earnings.completed_orders,
      activeListingsCount,
      pendingRequestsCount: incomingRequests.length,
    },
  };
}
