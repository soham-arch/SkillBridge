'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  ShoppingBag,
  Inbox,
  Clock,
  CheckCircle2,
  AlertCircle,
  ChevronRight,
  ShieldCheck,
  Calendar,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useAuth } from '@/lib/auth/auth-context';
import { useRequireAuth } from '@/lib/auth/use-require-auth';
import { fetchUserOrders } from '@/lib/services/orders';
import { Order, OrderStatus } from '@/types';

const STATUS_BADGES: Record<OrderStatus, { label: string; class: string }> = {
  pending_payment: { label: 'Payment Pending', class: 'bg-amber-50 text-amber-700 border-amber-200' },
  paid: { label: 'Paid in Escrow', class: 'bg-blue-50 text-blue-700 border-blue-200' },
  seller_pending: { label: 'Awaiting Acceptance', class: 'bg-amber-50 text-amber-700 border-amber-200' },
  accepted: { label: 'Order Accepted', class: 'bg-blue-50 text-blue-700 border-blue-200' },
  in_progress: { label: 'In Progress', class: 'bg-indigo-50 text-indigo-700 border-indigo-200' },
  submitted: { label: 'Deliverable Ready', class: 'bg-purple-50 text-purple-700 border-purple-200' },
  revision_requested: { label: 'Revision Requested', class: 'bg-orange-50 text-orange-700 border-orange-200' },
  completed: { label: 'Completed', class: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  cancelled: { label: 'Cancelled', class: 'bg-gray-100 text-gray-600 border-gray-200' },
  rejected: { label: 'Declined & Refunded', class: 'bg-red-50 text-red-700 border-red-200' },
};

export default function OrdersPage() {
  const { session, user, loading: authLoading } = useRequireAuth({
    requireStudentVerified: false,
  });
  const userId = session?.user?.id || '';

  const [tab, setTab] = useState<'buyer' | 'seller'>('buyer');
  const [filter, setFilter] = useState<'all' | 'active' | 'completed'>('all');
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userId) return;
    setLoading(true);
    fetchUserOrders(userId, tab)
      .then(setOrders)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [userId, tab]);

  const filteredOrders = orders.filter((o) => {
    if (filter === 'active') {
      return o.status !== 'completed' && o.status !== 'cancelled';
    }
    if (filter === 'completed') {
      return o.status === 'completed';
    }
    return true;
  });

  return (
    <div className="mx-auto w-full max-w-screen-xl px-6 py-12">
      {/* Header */}
      <div className="mb-8 flex flex-wrap items-center justify-between gap-4">
        <div>
          <span className="text-xs font-semibold uppercase tracking-wider text-[#004ac6]">
            Marketplace Management
          </span>
          <h1 className="mt-1 text-3xl font-bold text-gray-900">Your Orders</h1>
          <p className="mt-1 text-sm text-gray-600">
            Track student skill orders, verify deliverables, and manage escrow payments.
          </p>
        </div>
        <Link href="/explore">
          <Button className="bg-[#004ac6] text-white hover:bg-[#003b9e]">
            Browse Marketplace →
          </Button>
        </Link>
      </div>

      {/* Role Tabs */}
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div className="flex rounded-xl border border-border bg-white p-1 shadow-sm">
          <button
            onClick={() => setTab('buyer')}
            className={`flex items-center gap-2 rounded-lg px-5 py-2 text-sm font-semibold transition-all ${
              tab === 'buyer'
                ? 'bg-[#004ac6] text-white shadow-sm'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            <ShoppingBag className="h-4 w-4" />
            Purchases (Buyer Mode)
          </button>
          <button
            onClick={() => setTab('seller')}
            className={`flex items-center gap-2 rounded-lg px-5 py-2 text-sm font-semibold transition-all ${
              tab === 'seller'
                ? 'bg-[#004ac6] text-white shadow-sm'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            <Inbox className="h-4 w-4" />
            Client Orders (Seller Mode)
          </button>
        </div>

        {/* Filter Pills */}
        <div className="flex gap-2">
          {(['all', 'active', 'completed'] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`rounded-full px-3.5 py-1 text-xs font-semibold capitalize transition-all ${
                filter === f
                  ? 'bg-gray-900 text-white'
                  : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'
              }`}
            >
              {f}
            </button>
          ))}
        </div>
      </div>

      {/* Order List */}
      {loading ? (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-32 animate-pulse rounded-2xl border border-border bg-white" />
          ))}
        </div>
      ) : filteredOrders.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-gray-300 bg-white py-24 text-center">
          <ShoppingBag className="h-12 w-12 text-gray-300 mb-3" />
          <p className="text-lg font-bold text-gray-700">No {filter} orders found</p>
          <p className="mt-1 text-xs text-gray-500 max-w-sm">
            {tab === 'buyer'
              ? 'You have not purchased any services in this view. Discover student talent on the explore page!'
              : 'You have no incoming client orders yet. Promote your skill listing to receive requests.'}
          </p>
          {tab === 'buyer' && (
            <Link href="/explore">
              <Button className="mt-6 bg-[#004ac6] text-white hover:bg-[#003b9e]">
                Explore Services
              </Button>
            </Link>
          )}
        </div>
      ) : (
        <div className="space-y-4">
          {filteredOrders.map((order) => {
            const counterpart = tab === 'buyer' ? order.seller : order.buyer;
            const initials = counterpart?.full_name
              ? counterpart.full_name
                  .split(' ')
                  .map((n) => n[0])
                  .slice(0, 2)
                  .join('')
                  .toUpperCase()
              : '?';

            const badge = STATUS_BADGES[order.status] ?? { label: order.status, class: 'bg-gray-100 text-gray-600' };

            return (
              <Link
                key={order.id}
                href={`/orders/${order.id}`}
                className="group flex flex-col sm:flex-row sm:items-center justify-between gap-4 rounded-2xl border border-border bg-white p-6 shadow-sm transition-all hover:border-[#004ac6]/40 hover:shadow-md"
              >
                <div className="flex items-start gap-4">
                  <Avatar className="h-12 w-12 border border-[#c3c6d7] shrink-0">
                    {counterpart?.avatar_url && <AvatarImage src={counterpart.avatar_url} />}
                    <AvatarFallback className="text-xs font-bold text-[#004ac6]">
                      {initials}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <div className="flex flex-wrap items-center gap-2 mb-1">
                      <span className="text-xs font-bold text-gray-400">
                        #{order.id.slice(-6).toUpperCase()}
                      </span>
                      {order.order_type === 'consultation' || order.consultation_details ? (
                        <span className="rounded-full border border-purple-200 bg-purple-50 px-2.5 py-0.5 text-[11px] font-semibold text-purple-700">
                          Consultation 📅
                        </span>
                      ) : null}
                      <span
                        className={`rounded-full border px-2.5 py-0.5 text-[11px] font-semibold ${badge.class}`}
                      >
                        {badge.label}
                      </span>
                      {order.payment_status === 'paid' && (
                        <span className="flex items-center gap-1 text-[11px] font-semibold text-emerald-700 bg-emerald-50 rounded-full px-2 py-0.5 border border-emerald-200/50">
                          <ShieldCheck className="h-3 w-3" /> Escrow
                        </span>
                      )}
                    </div>

                    <h3 className="text-base font-bold text-gray-900 group-hover:text-[#004ac6] transition-colors">
                      {order.service?.title ?? 'SkillBridge Service'}
                    </h3>

                    <p className="text-xs text-gray-500 mt-1 flex items-center gap-2">
                      <span>
                        {tab === 'buyer' ? 'Provider:' : 'Client:'}{' '}
                        <strong className="text-gray-700">{counterpart?.full_name}</strong>
                      </span>
                      {counterpart?.college && <span>· {counterpart.college}</span>}
                    </p>
                  </div>
                </div>

                <div className="flex items-center justify-between sm:justify-end gap-6 pt-3 sm:pt-0 border-t sm:border-t-0 border-gray-100">
                  <div className="text-left sm:text-right">
                    <p className="text-lg font-bold text-gray-900">
                      ₹{order.price.toLocaleString('en-IN')}
                    </p>
                    <p className="text-[11px] text-gray-400 flex items-center gap-1 sm:justify-end">
                      <Calendar className="h-3 w-3" />
                      Due {new Date(order.due_date).toLocaleDateString('en-IN', { month: 'short', day: 'numeric' })}
                    </p>
                  </div>
                  <div className="flex h-9 w-9 items-center justify-center rounded-full bg-gray-50 text-gray-400 group-hover:bg-[#f0f4ff] group-hover:text-[#004ac6] transition-colors">
                    <ChevronRight className="h-5 w-5" />
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
