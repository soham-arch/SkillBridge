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
  ArrowRight,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useAuth } from '@/lib/auth/auth-context';
import { useRequireAuth } from '@/lib/auth/use-require-auth';
import { fetchUserOrders } from '@/lib/services/orders';
import { Order, OrderStatus } from '@/types';

const STATUS_BADGES: Record<OrderStatus, { label: string; class: string }> = {
  pending_payment: { label: 'Payment Pending', class: 'bg-amber-50 text-amber-800 border-amber-200' },
  paid: { label: 'Paid in Escrow', class: 'bg-blue-50 text-[#004ac6] border-blue-200' },
  seller_pending: { label: 'Awaiting Acceptance', class: 'bg-amber-50 text-amber-800 border-amber-200' },
  accepted: { label: 'Order Accepted', class: 'bg-blue-50 text-[#004ac6] border-blue-200' },
  in_progress: { label: 'In Progress', class: 'bg-indigo-50 text-indigo-800 border-indigo-200' },
  submitted: { label: 'Deliverable Ready', class: 'bg-purple-50 text-purple-800 border-purple-200' },
  revision_requested: { label: 'Revision Requested', class: 'bg-orange-50 text-orange-800 border-orange-200' },
  completed: { label: 'Completed', class: 'bg-emerald-50 text-emerald-800 border-emerald-200' },
  cancelled: { label: 'Cancelled', class: 'bg-neutral-100 text-neutral-600 border-neutral-200' },
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
    <div className="mx-auto w-full max-w-7xl px-6 sm:px-8 lg:px-12 py-12 sm:py-16">
      {/* Editorial Header */}
      <div className="mb-10 flex flex-col md:flex-row md:items-end justify-between gap-6 pb-8 border-b border-neutral-200/80">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <span className="text-xs font-mono font-bold uppercase tracking-widest text-[#004ac6]">
              // Escrow Vault & Contracts
            </span>
          </div>
          <h1 className="text-3xl sm:text-5xl font-black tracking-tight text-neutral-950">
            Orders & Escrow.
          </h1>
          <p className="mt-2 text-sm text-neutral-500 font-normal">
            Track student skill orders, review milestones, and manage escrow disbursements.
          </p>
        </div>
        <Link href="/explore">
          <Button className="rounded-xl bg-neutral-950 text-white hover:bg-black font-bold text-xs h-11 px-5 shadow-xs">
            Browse Catalog
            <ArrowRight className="h-4 w-4 ml-1.5" />
          </Button>
        </Link>
      </div>

      {/* Role Tabs & Filter Controls */}
      <div className="mb-8 flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-neutral-200/80">
        {/* Mode Toggle */}
        <div className="flex rounded-2xl border border-neutral-200 bg-white p-1 shadow-2xs">
          <button
            onClick={() => setTab('buyer')}
            className={`flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-bold transition-all ${
              tab === 'buyer'
                ? 'bg-neutral-950 text-white shadow-xs'
                : 'text-neutral-500 hover:text-neutral-900'
            }`}
          >
            <ShoppingBag className="h-3.5 w-3.5" />
            Purchases (Hiring)
          </button>
          <button
            onClick={() => setTab('seller')}
            className={`flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-bold transition-all ${
              tab === 'seller'
                ? 'bg-neutral-950 text-white shadow-xs'
                : 'text-neutral-500 hover:text-neutral-900'
            }`}
          >
            <Inbox className="h-3.5 w-3.5" />
            Client Orders (Selling)
          </button>
        </div>

        {/* Filter Pills */}
        <div className="flex gap-2">
          {(['all', 'active', 'completed'] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`rounded-xl px-3.5 py-1.5 text-xs font-bold capitalize transition-all ${
                filter === f
                  ? 'bg-neutral-950 text-white shadow-xs'
                  : 'bg-white border border-neutral-200 text-neutral-600 hover:border-neutral-900'
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
            <div key={i} className="h-32 animate-pulse rounded-3xl border border-neutral-200 bg-white" />
          ))}
        </div>
      ) : filteredOrders.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-3xl border border-dashed border-neutral-200 bg-white py-24 text-center px-6">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-neutral-100 text-neutral-400 mb-4">
            <ShoppingBag className="h-6 w-6" />
          </div>
          <p className="text-xl font-bold text-neutral-950">No {filter} orders found</p>
          <p className="mt-2 text-xs text-neutral-500 max-w-sm leading-relaxed">
            {tab === 'buyer'
              ? 'You have not purchased any services in this view. Discover verified student talent on the catalog!'
              : 'You have no incoming client orders yet. Promote your skill listing to receive requests.'}
          </p>
          {tab === 'buyer' && (
            <Link href="/explore">
              <Button className="mt-6 rounded-xl bg-neutral-950 text-white hover:bg-black font-bold text-xs h-11 px-6">
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
              : 'SB';

            const badge = STATUS_BADGES[order.status] ?? {
              label: order.status,
              class: 'bg-neutral-100 text-neutral-600',
            };

            return (
              <Link
                key={order.id}
                href={`/orders/${order.id}`}
                className="group flex flex-col sm:flex-row sm:items-center justify-between gap-5 rounded-3xl border border-neutral-200 bg-white p-7 shadow-xs hover:border-neutral-900 transition-all duration-300"
              >
                <div className="flex items-start gap-5">
                  <Avatar className="h-12 w-12 border border-neutral-200 shrink-0">
                    {counterpart?.avatar_url && <AvatarImage src={counterpart.avatar_url} />}
                    <AvatarFallback className="text-xs font-bold text-neutral-900 bg-neutral-100">
                      {initials}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <div className="flex flex-wrap items-center gap-2 mb-1.5">
                      <span className="text-xs font-mono font-bold text-neutral-400">
                        #{order.id.slice(-6).toUpperCase()}
                      </span>
                      {order.order_type === 'consultation' || order.consultation_details ? (
                        <span className="rounded-full border border-purple-200 bg-purple-50 px-2.5 py-0.5 text-[10px] font-bold text-purple-800">
                          Consultation 📅
                        </span>
                      ) : null}
                      <span
                        className={`rounded-full border px-2.5 py-0.5 text-[10px] font-bold ${badge.class}`}
                      >
                        {badge.label}
                      </span>
                      {order.payment_status === 'paid' && (
                        <span className="flex items-center gap-1 text-[10px] font-bold text-emerald-800 bg-emerald-50 rounded-full px-2.5 py-0.5 border border-emerald-200">
                          <ShieldCheck className="h-3 w-3" /> Escrow Locked
                        </span>
                      )}
                    </div>

                    <h3 className="text-lg font-bold text-neutral-950 group-hover:text-[#004ac6] transition-colors leading-snug">
                      {order.service?.title ?? 'SkillBridge Service'}
                    </h3>

                    <p className="text-xs text-neutral-500 mt-1 flex items-center gap-2">
                      <span>
                        {tab === 'buyer' ? 'Provider:' : 'Client:'}{' '}
                        <strong className="text-neutral-800">{counterpart?.full_name}</strong>
                      </span>
                      {counterpart?.college && <span>• {counterpart.college}</span>}
                    </p>
                  </div>
                </div>

                <div className="flex items-center justify-between sm:justify-end gap-6 pt-4 sm:pt-0 border-t sm:border-t-0 border-neutral-100">
                  <div className="text-left sm:text-right">
                    <p className="text-xl font-black text-neutral-950 font-mono">
                      ₹{order.price.toLocaleString('en-IN')}
                    </p>
                    <p className="text-[11px] text-neutral-400 flex items-center gap-1 sm:justify-end mt-0.5">
                      <Calendar className="h-3 w-3" />
                      Due {new Date(order.due_date).toLocaleDateString('en-IN', { month: 'short', day: 'numeric' })}
                    </p>
                  </div>
                  <div className="flex h-9 w-9 items-center justify-center rounded-full bg-neutral-100 text-neutral-500 group-hover:bg-[#004ac6] group-hover:text-white transition-colors">
                    <ChevronRight className="h-4 w-4" />
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
