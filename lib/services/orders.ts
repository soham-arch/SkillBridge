import {
  getOrder,
  getOrdersForUser,
  createOrderWithEscrow,
  updateOrderStatusAction,
  createReview,
  getSellerEarnings,
} from '@/lib/store/marketplace-store';
import { Order, PaymentMethod, Review, SellerEarnings } from '@/types';

export async function fetchOrderById(id: string): Promise<Order | null> {
  return getOrder(id);
}

export async function fetchUserOrders(userId: string, role?: 'buyer' | 'seller'): Promise<Order[]> {
  return getOrdersForUser(userId, role);
}

export async function placeOrderWithEscrow(params: {
  serviceId: string;
  buyerId: string;
  requirements: string;
  paymentMethod: PaymentMethod;
  paymentSuccess?: boolean;
}) {
  return createOrderWithEscrow(params);
}

export async function transitionOrderStatus(
  orderId: string,
  action: 'accept' | 'start_work' | 'submit_work' | 'request_revision' | 'complete' | 'cancel',
  payload?: { notes?: string; fileUrl?: string; reason?: string }
): Promise<Order> {
  return updateOrderStatusAction(orderId, action, payload);
}

export async function submitOrderReview(params: {
  orderId: string;
  serviceId: string;
  reviewerId: string;
  revieweeId: string;
  rating: number;
  comment: string;
}): Promise<Review> {
  return createReview(params);
}

export async function fetchSellerEarnings(sellerId: string): Promise<SellerEarnings> {
  return getSellerEarnings(sellerId);
}
