'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  Briefcase,
  ShoppingBag,
  TrendingUp,
  Clock,
  CheckCircle2,
  AlertCircle,
  PlusCircle,
  Search,
  ChevronRight,
  ShieldCheck,
  Star,
  Sparkles,
  DollarSign,
  CalendarCheck,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useAuth } from '@/lib/auth/auth-context';
import { fetchSellerEarnings, fetchUserOrders } from '@/lib/services/orders';
import { VerifiedBadge } from '@/components/trust/verified-badge';
import { VerificationModal } from '@/components/trust/verification-modal';
import { getMarketplaceState } from '@/lib/store/marketplace-store';
import { Order, SellerEarnings, Service } from '@/types';

export default function DashboardPage() {
  const { profile, session } = useAuth();
  const userId = session?.user?.id ?? '10000000-0000-0000-0000-000000000001'; // Alex Sharma

  const [roleMode, setRoleMode] = useState<'seller' | 'buyer'>('seller');
  const [earnings, setEarnings] = useState<SellerEarnings | null>(null);
  const [orders, setOrders] = useState<Order[]>([]);
  const [myServices, setMyServices] = useState<Service[]>([]);
  const [verificationOpen, setVerificationOpen] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const [earn, ords] = await Promise.all([
          fetchSellerEarnings(userId),
          fetchUserOrders(userId, roleMode),
        ]);
        setEarnings(earn);
        setOrders(ords);

        const state = getMarketplaceState();
        setMyServices(state.services.filter((s) => s.provider_id === userId));
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [userId, roleMode]);

  const firstName = profile?.full_name?.split(' ')[0] ?? 'Alex';
  const isVerified = profile?.verification_status === 'verified' || true;

  return (
    <div className="mx-auto w-full max-w-screen-xl px-6 py-12">
      {/* Welcome Bar with Mode Switcher */}
      <div className="mb-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-bold uppercase tracking-wider text-[#004ac6]">
              Interactive Student Dashboard
            </span>
            <VerifiedBadge college={profile?.college ?? 'MIT World Peace University'} size="sm" />
          </div>
          <h1 className="text-3xl font-extrabold text-gray-900">
            Welcome back, {firstName} 👋
          </h1>
          <p className="mt-1 text-sm text-gray-600">
            Manage your peer skill offerings, active orders, escrow balances, and campus client requests.
          </p>
        </div>

        {/* Adaptive Mode Switcher */}
        <div className="flex items-center rounded-2xl border border-border bg-white p-1.5 shadow-sm">
          <button
            onClick={() => setRoleMode('seller')}
            className={`flex items-center gap-2 rounded-xl px-5 py-2.5 text-xs font-bold transition-all ${
              roleMode === 'seller'
                ? 'bg-[#004ac6] text-white shadow-sm'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            <Briefcase className="h-4 w-4" />
            Seller Mode (My Services)
          </button>
          <button
            onClick={() => setRoleMode('buyer')}
            className={`flex items-center gap-2 rounded-xl px-5 py-2.5 text-xs font-bold transition-all ${
              roleMode === 'buyer'
                ? 'bg-[#004ac6] text-white shadow-sm'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            <ShoppingBag className="h-4 w-4" />
            Buyer Mode (Purchases)
          </button>
        </div>
      </div>

      {/* SELLER MODE VIEW */}
      {roleMode === 'seller' && (
        <div className="space-y-8 animate-in fade-in">
          {/* Earnings Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {/* Total Earned */}
            <div className="rounded-2xl border border-border bg-white p-6 shadow-sm">
              <div className="flex items-center justify-between text-gray-400 mb-2">
                <span className="text-xs font-bold uppercase tracking-wider">Total Earned</span>
                <span className="rounded-lg bg-emerald-50 p-2 text-emerald-600">
                  <TrendingUp className="h-4 w-4" />
                </span>
              </div>
              <p className="text-3xl font-black text-gray-900">
                ₹{(earnings?.total_earned ?? 2700).toLocaleString('en-IN')}
              </p>
              <p className="text-[11px] text-emerald-600 font-semibold mt-1">
                Completed & Released Payouts
              </p>
            </div>

            {/* In Escrow */}
            <div className="rounded-2xl border border-border bg-white p-6 shadow-sm">
              <div className="flex items-center justify-between text-gray-400 mb-2">
                <span className="text-xs font-bold uppercase tracking-wider">Held in Escrow</span>
                <span className="rounded-lg bg-blue-50 p-2 text-[#004ac6]">
                  <Clock className="h-4 w-4" />
                </span>
              </div>
              <p className="text-3xl font-black text-[#004ac6]">
                ₹{(earnings?.in_escrow ?? 1500).toLocaleString('en-IN')}
              </p>
              <p className="text-[11px] text-gray-500 font-medium mt-1">
                Active Client Orders in Progress
              </p>
            </div>

            {/* Completed Orders */}
            <div className="rounded-2xl border border-border bg-white p-6 shadow-sm">
              <div className="flex items-center justify-between text-gray-400 mb-2">
                <span className="text-xs font-bold uppercase tracking-wider">Completed Orders</span>
                <span className="rounded-lg bg-purple-50 p-2 text-purple-600">
                  <CheckCircle2 className="h-4 w-4" />
                </span>
              </div>
              <p className="text-3xl font-black text-gray-900">
                {earnings?.completed_orders ?? 18}
              </p>
              <p className="text-[11px] text-gray-500 font-medium mt-1">
                100% On-time delivery rate
              </p>
            </div>

            {/* Active Offerings */}
            <div className="rounded-2xl border border-border bg-white p-6 shadow-sm">
              <div className="flex items-center justify-between text-gray-400 mb-2">
                <span className="text-xs font-bold uppercase tracking-wider">Listed Services</span>
                <span className="rounded-lg bg-amber-50 p-2 text-amber-600">
                  <Briefcase className="h-4 w-4" />
                </span>
              </div>
              <p className="text-3xl font-black text-gray-900">{myServices.length || 2}</p>
              <Link href="/services/create" className="text-[11px] text-[#004ac6] font-bold mt-1 block hover:underline">
                + Create New Service
              </Link>
            </div>
          </div>

          {/* Action Needed Banner if pending orders */}
          {orders.some((o) => o.status === 'seller_pending' || o.status === 'revision_requested') && (
            <div className="rounded-2xl border border-amber-200 bg-amber-50/70 p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-start gap-3">
                <AlertCircle className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
                <div>
                  <h4 className="text-sm font-bold text-amber-900">Incoming Orders Awaiting Action</h4>
                  <p className="text-xs text-amber-700 mt-0.5">
                    You have client orders requiring review or deliverable submission.
                  </p>
                </div>
              </div>
              <Link href="/orders">
                <Button size="sm" className="bg-amber-600 text-white hover:bg-amber-700 text-xs font-bold">
                  View Orders →
                </Button>
              </Link>
            </div>
          )}

          {/* Active Orders List */}
          <div className="rounded-2xl border border-border bg-white p-6 sm:p-8 shadow-sm">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-bold text-gray-900">Recent Client Orders</h2>
              <Link href="/orders" className="text-xs font-bold text-[#004ac6] hover:underline">
                View All ({orders.length}) →
              </Link>
            </div>

            {orders.length === 0 ? (
              <p className="text-xs text-gray-400 py-6 text-center">No incoming client orders yet.</p>
            ) : (
              <div className="space-y-3">
                {orders.slice(0, 3).map((o) => (
                  <Link
                    key={o.id}
                    href={`/orders/${o.id}`}
                    className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 rounded-xl border border-gray-100 bg-[#fafafa] p-4 hover:border-[#004ac6]/30 transition-colors"
                  >
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-xs font-bold text-gray-400">#{o.id.slice(-6).toUpperCase()}</span>
                        <Badge variant="secondary" className="text-[10px] font-bold uppercase">
                          {o.status.replace('_', ' ')}
                        </Badge>
                      </div>
                      <p className="text-sm font-bold text-gray-900">{o.service?.title ?? 'Service'}</p>
                      <p className="text-xs text-gray-500 mt-0.5">Client: {o.buyer?.full_name}</p>
                    </div>

                    <div className="text-left sm:text-right">
                      <p className="text-base font-bold text-[#004ac6]">₹{o.price.toLocaleString('en-IN')}</p>
                      <span className="text-xs font-semibold text-gray-500 hover:text-[#004ac6]">
                        Manage Order →
                      </span>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* BUYER MODE VIEW */}
      {roleMode === 'buyer' && (
        <div className="space-y-8 animate-in fade-in">
          {/* Buyer Quick Stats */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
            <div className="rounded-2xl border border-border bg-white p-6 shadow-sm">
              <span className="text-xs text-gray-400 font-semibold block">Purchased Services</span>
              <p className="text-3xl font-black text-gray-900 mt-1">{orders.length}</p>
              <p className="text-[11px] text-gray-500 mt-1">Student Services Hired</p>
            </div>

            <div className="rounded-2xl border border-border bg-white p-6 shadow-sm">
              <span className="text-xs text-gray-400 font-semibold block">In Progress</span>
              <p className="text-3xl font-black text-[#004ac6] mt-1">
                {orders.filter((o) => o.status === 'in_progress' || o.status === 'submitted').length}
              </p>
              <p className="text-[11px] text-emerald-600 font-semibold mt-1">Escrow Protected</p>
            </div>

            <div className="rounded-2xl border border-border bg-white p-6 shadow-sm">
              <span className="text-xs text-gray-400 font-semibold block">Completed</span>
              <p className="text-3xl font-black text-emerald-600 mt-1">
                {orders.filter((o) => o.status === 'completed').length}
              </p>
              <p className="text-[11px] text-gray-500 mt-1">Deliverables Received</p>
            </div>
          </div>

          {/* Active Purchases */}
          <div className="rounded-2xl border border-border bg-white p-6 sm:p-8 shadow-sm">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-bold text-gray-900">Your Active Purchases</h2>
              <Link href="/explore">
                <Button size="sm" className="bg-[#004ac6] text-white hover:bg-[#003b9e] text-xs">
                  Find More Skills →
                </Button>
              </Link>
            </div>

            {orders.length === 0 ? (
              <div className="text-center py-12 space-y-3">
                <ShoppingBag className="h-10 w-10 text-gray-300 mx-auto" />
                <p className="text-sm font-semibold text-gray-700">You haven&apos;t hired any students yet.</p>
                <Link href="/explore">
                  <Button className="bg-[#004ac6] text-white">Explore Marketplace</Button>
                </Link>
              </div>
            ) : (
              <div className="space-y-3">
                {orders.map((o) => (
                  <Link
                    key={o.id}
                    href={`/orders/${o.id}`}
                    className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 rounded-xl border border-gray-100 bg-[#fafafa] p-4 hover:border-[#004ac6]/30 transition-colors"
                  >
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-xs font-bold text-gray-400">#{o.id.slice(-6).toUpperCase()}</span>
                        <Badge variant="secondary" className="text-[10px] font-bold uppercase">
                          {o.status.replace('_', ' ')}
                        </Badge>
                      </div>
                      <p className="text-sm font-bold text-gray-900">{o.service?.title}</p>
                      <p className="text-xs text-gray-500 mt-0.5">Provider: {o.seller?.full_name}</p>
                    </div>

                    <div className="text-left sm:text-right">
                      <p className="text-base font-bold text-[#004ac6]">₹{o.price.toLocaleString('en-IN')}</p>
                      <span className="text-xs font-semibold text-[#004ac6]">Track Deliverable →</span>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Trust & Profile Verification Card */}
      <div className="mt-8 rounded-2xl border border-border bg-white p-6 sm:p-8 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6">
          <div className="flex items-start gap-4">
            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600">
              <ShieldCheck className="h-8 w-8" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-lg font-bold text-gray-900">Student Trust & Verification</h3>
                <VerifiedBadge college={profile?.college} />
              </div>
              <p className="text-xs text-gray-600 mt-1 max-w-xl">
                SkillBridge verifies student status through university emails (.edu / .ac.in) and student ID cards. Verified badges appear on all your service listings and profile.
              </p>
            </div>
          </div>

          <Button
            onClick={() => setVerificationOpen(true)}
            variant="outline"
            className="border-gray-200 text-xs font-bold text-gray-700 hover:bg-gray-50 shrink-0"
          >
            Update College Verification
          </Button>
        </div>
      </div>

      {/* Verification Modal */}
      <VerificationModal
        userId={userId}
        currentCollege={profile?.college}
        open={verificationOpen}
        onClose={() => setVerificationOpen(false)}
      />
    </div>
  );
}