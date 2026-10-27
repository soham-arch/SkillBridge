'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useSearchParams, useRouter } from 'next/navigation';
import {
  Briefcase,
  ShoppingBag,
  TrendingUp,
  Clock,
  CheckCircle2,
  AlertCircle,
  PlusCircle,
  Search,
  ShieldCheck,
  Star,
  Sparkles,
  Calendar,
  AlertTriangle,
  RefreshCw,
  Bell,
  FileCheck,
  ArrowUpRight,
  ExternalLink,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import { useRequireAuth } from '@/lib/auth/use-require-auth';
import {
  fetchBuyerDashboardData,
  fetchSellerDashboardData,
  BuyerDashboardData,
  SellerDashboardData,
} from '@/lib/services/dashboard';
import { transitionOrderStatus } from '@/lib/services/orders';
import { VerifiedBadge } from '@/components/trust/verified-badge';
import { VerificationModal } from '@/components/trust/verification-modal';
import { ReviewModal } from '@/components/reviews/review-modal';
import { AnimatedCounter } from '@/components/motion/animated-counter';
import { Order } from '@/types';

export default function DashboardPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const {
    profile,
    session,
    user,
    isStudentVerified,
    isBuyer,
    isSeller,
    activeRole,
    switchRole,
    loading: authLoading,
  } = useRequireAuth({
    requireStudentVerified: false,
  });

  const userId = user?.id || session?.user?.id || profile?.user_id || '';

  const initialMode =
    (searchParams?.get('mode') as 'seller' | 'buyer') ||
    profile?.active_role ||
    (isSeller && !isBuyer ? 'seller' : 'buyer');

  const [roleMode, setRoleMode] = useState<'seller' | 'buyer'>(initialMode);
  const [buyerData, setBuyerData] = useState<BuyerDashboardData | null>(null);
  const [sellerData, setSellerData] = useState<SellerDashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Modals & Action States
  const [verificationOpen, setVerificationOpen] = useState(false);
  const [reviewingOrder, setReviewingOrder] = useState<Order | null>(null);
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  // Sync roleMode when profile or searchParams change
  useEffect(() => {
    const urlMode = searchParams?.get('mode') as 'seller' | 'buyer' | null;
    if (urlMode && (urlMode === 'seller' || urlMode === 'buyer')) {
      setRoleMode(urlMode);
    } else if (profile?.active_role) {
      setRoleMode(profile.active_role);
    }
  }, [searchParams, profile?.active_role]);

  const loadData = useCallback(async () => {
    if (!userId) return;
    setLoading(true);
    setError(null);
    try {
      if (roleMode === 'buyer') {
        const data = await fetchBuyerDashboardData(userId);
        setBuyerData(data);
      } else {
        const data = await fetchSellerDashboardData(userId);
        setSellerData(data);
      }
    } catch (err: unknown) {
      console.error('Failed to load dashboard data:', err);
      setError(err instanceof Error ? err.message : 'Failed to retrieve live dashboard records.');
    } finally {
      setLoading(false);
    }
  }, [userId, roleMode]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  async function handleModeChange(newMode: 'seller' | 'buyer') {
    setRoleMode(newMode);
    if (switchRole) {
      await switchRole(newMode);
    }
  }

  function handleSearchSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (searchQuery.trim()) {
      router.push(`/explore?q=${encodeURIComponent(searchQuery.trim())}`);
    } else {
      router.push('/explore');
    }
  }

  async function handleAcceptOrder(orderId: string) {
    setActionLoadingId(orderId);
    try {
      await transitionOrderStatus(orderId, 'accept');
      toast.success('Order accepted! You can now collaborate with the buyer in the order workspace.');
      await loadData();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to accept order';
      toast.error(msg);
    } finally {
      setActionLoadingId(null);
    }
  }

  async function handleDeclineOrder(orderId: string) {
    setActionLoadingId(orderId);
    try {
      await transitionOrderStatus(orderId, 'reject', { reason: 'Seller currently unavailable' });
      toast.success('Order declined and buyer payment refunded from escrow.');
      await loadData();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to decline order';
      toast.error(msg);
    } finally {
      setActionLoadingId(null);
    }
  }

  if (authLoading || (!buyerData && !sellerData && loading)) {
    return (
      <div className="flex min-h-[70vh] flex-col items-center justify-center space-y-3">
        <div className="h-9 w-9 animate-spin rounded-full border-2 border-neutral-900 border-t-transparent" />
        <p className="text-xs font-mono font-medium text-neutral-400">LOADING CAMPUS WORKSPACE...</p>
      </div>
    );
  }

  const firstName = profile?.full_name?.split(' ')[0] || user?.email?.split('@')[0] || 'Student';
  const isVerified = isStudentVerified;

  return (
    <div className="mx-auto w-full max-w-7xl px-6 sm:px-8 lg:px-12 py-10 sm:py-16">
      {/* Editorial Welcome Header */}
      <div className="mb-10 flex flex-col md:flex-row md:items-end justify-between gap-6 pb-8 border-b border-neutral-200/80">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <span className="text-xs font-mono font-bold uppercase tracking-widest text-[#004ac6]">
              // Command Workspace
            </span>
            {isVerified ? (
              <VerifiedBadge college={profile?.college ?? 'Campus'} size="sm" />
            ) : (
              <span className="rounded-md bg-amber-50 px-2 py-0.5 text-[10px] font-bold text-amber-800 border border-amber-200">
                Verification Pending
              </span>
            )}
          </div>
          <h1 className="text-3xl sm:text-5xl font-black tracking-tight text-neutral-950">
            Welcome back, {firstName}.
          </h1>
          <p className="mt-2 text-sm text-neutral-600 max-w-xl font-normal leading-relaxed">
            {roleMode === 'buyer'
              ? 'Track hired freelancers, scheduled consultations, deliverables, and orders awaiting review.'
              : 'Manage live service listings, incoming requests, active orders, and transaction-derived earnings.'}
          </p>
        </div>

        {/* Mode Switcher & Refresh Pill */}
        <div className="flex flex-wrap items-center gap-3">
          <Button
            size="sm"
            variant="outline"
            onClick={loadData}
            disabled={loading}
            className="rounded-xl border-neutral-300 text-xs font-bold text-neutral-700 hover:bg-neutral-50 h-10 px-3.5 shadow-2xs"
          >
            <RefreshCw className={`h-3.5 w-3.5 mr-1.5 ${loading ? 'animate-spin' : ''}`} />
            Sync
          </Button>

          <div className="flex items-center rounded-2xl border border-neutral-200 bg-white p-1 shadow-2xs">
            <button
              onClick={() => handleModeChange('buyer')}
              className={`flex items-center gap-1.5 rounded-xl px-4 py-2 text-xs font-bold transition-all ${
                roleMode === 'buyer'
                  ? 'bg-neutral-950 text-white shadow-xs'
                  : 'text-neutral-500 hover:text-neutral-900'
              }`}
            >
              <ShoppingBag className="h-3.5 w-3.5" />
              Buyer Hub
            </button>
            <button
              onClick={() => handleModeChange('seller')}
              className={`flex items-center gap-1.5 rounded-xl px-4 py-2 text-xs font-bold transition-all ${
                roleMode === 'seller'
                  ? 'bg-neutral-950 text-white shadow-xs'
                  : 'text-neutral-500 hover:text-neutral-900'
              }`}
            >
              <Briefcase className="h-3.5 w-3.5" />
              Seller Studio
            </button>
          </div>
        </div>
      </div>

      {/* Error & Retry State */}
      {error && (
        <div className="mb-8 rounded-2xl border border-red-200 bg-red-50 p-4 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <AlertCircle className="h-5 w-5 text-red-600 shrink-0" />
            <p className="text-xs text-red-800">
              <strong>Connection Notice:</strong> {error}
            </p>
          </div>
          <Button
            size="sm"
            onClick={loadData}
            className="bg-red-600 hover:bg-red-700 text-white text-xs font-bold rounded-xl"
          >
            Retry Loading
          </Button>
        </div>
      )}

      {/* =========================================================================
          SELLER STUDIO DASHBOARD VIEW
      ========================================================================= */}
      {roleMode === 'seller' && (
        <div className="space-y-10 animate-in fade-in duration-200">
          {/* Seller Activation Banner if not yet a seller */}
          {!isSeller && (
            <div className="rounded-3xl border border-blue-200/80 bg-blue-50/50 p-8 flex flex-col sm:flex-row sm:items-center justify-between gap-6 shadow-2xs">
              <div className="flex items-start gap-4">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-neutral-950 text-white">
                  <Briefcase className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-neutral-950">
                    Activate Your Campus Seller Studio
                  </h3>
                  <p className="text-xs text-neutral-600 mt-1 max-w-xl leading-relaxed">
                    You currently have Buyer access. Complete your seller profile with your campus skills, pricing, and portfolio to publish service listings.
                  </p>
                </div>
              </div>
              <Link href="/onboarding">
                <Button className="rounded-xl bg-neutral-950 px-5 text-xs font-bold text-white hover:bg-black whitespace-nowrap">
                  Complete Seller Setup →
                </Button>
              </Link>
            </div>
          )}

          {/* Verification Warning */}
          {!isVerified && (
            <div className="rounded-3xl border border-amber-200 bg-amber-50/70 p-6 flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <AlertTriangle className="h-5 w-5 text-amber-700 shrink-0" />
                <p className="text-xs text-amber-900 leading-relaxed">
                  <strong>Student Verification Required:</strong> While you can draft listings, your offerings will only appear publicly in search once your official college ID is verified.
                </p>
              </div>
              <Link href="/verify">
                <Button size="sm" className="bg-amber-600 text-white hover:bg-amber-700 text-xs font-bold rounded-xl whitespace-nowrap">
                  Verify Student ID
                </Button>
              </Link>
            </div>
          )}

          {/* Metrics Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {/* Total Earned */}
            <div className="rounded-3xl border border-neutral-200 bg-[#fbfbfa] p-7 shadow-xs">
              <span className="text-[10px] font-mono uppercase tracking-wider text-neutral-400 block">
                Total Payouts
              </span>
              <p className="text-3xl sm:text-4xl font-black text-neutral-950 font-mono mt-2">
                <AnimatedCounter
                  value={sellerData?.metrics.totalEarned ?? 0}
                  prefix="₹"
                />
              </p>
              <p className="text-[11px] text-emerald-700 font-semibold mt-2 flex items-center gap-1">
                <TrendingUp className="h-3.5 w-3.5" />
                Completed & Released
              </p>
            </div>

            {/* In Escrow */}
            <div className="rounded-3xl border border-neutral-200 bg-[#fbfbfa] p-7 shadow-xs">
              <span className="text-[10px] font-mono uppercase tracking-wider text-neutral-400 block">
                Held in Escrow
              </span>
              <p className="text-3xl sm:text-4xl font-black text-[#004ac6] font-mono mt-2">
                <AnimatedCounter
                  value={sellerData?.metrics.inEscrow ?? 0}
                  prefix="₹"
                />
              </p>
              <p className="text-[11px] text-neutral-500 font-medium mt-2 flex items-center gap-1">
                <Clock className="h-3.5 w-3.5" />
                Active Orders in Progress
              </p>
            </div>

            {/* Completed Orders */}
            <div className="rounded-3xl border border-neutral-200 bg-[#fbfbfa] p-7 shadow-xs">
              <span className="text-[10px] font-mono uppercase tracking-wider text-neutral-400 block">
                Completed Orders
              </span>
              <p className="text-3xl sm:text-4xl font-black text-neutral-950 font-mono mt-2">
                <AnimatedCounter
                  value={sellerData?.metrics.completedOrdersCount ?? 0}
                />
              </p>
              <p className="text-[11px] text-neutral-500 font-medium mt-2 flex items-center gap-1">
                <CheckCircle2 className="h-3.5 w-3.5" />
                Verified deliveries
              </p>
            </div>

            {/* Active Offerings */}
            <div className="rounded-3xl border border-neutral-200 bg-[#fbfbfa] p-7 shadow-xs">
              <span className="text-[10px] font-mono uppercase tracking-wider text-neutral-400 block">
                Active Offerings
              </span>
              <p className="text-3xl sm:text-4xl font-black text-neutral-950 font-mono mt-2">
                <AnimatedCounter
                  value={sellerData?.metrics.activeListingsCount ?? 0}
                />
              </p>
              <p className="text-[11px] text-neutral-500 font-medium mt-2 flex items-center gap-1">
                <Sparkles className="h-3.5 w-3.5" />
                Published on catalog
              </p>
            </div>
          </div>

          {/* Editorial Quick Actions Bar */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6 rounded-3xl bg-neutral-950 p-8 text-white shadow-md">
            <div>
              <span className="text-[10px] font-mono uppercase tracking-widest text-[#004ac6]">
                STUDIO SHORTCUT
              </span>
              <h2 className="text-2xl font-black tracking-tight mt-1">
                Publish a New Skill or Consultation Slot
              </h2>
              <p className="text-xs text-neutral-400 mt-1 max-w-lg leading-relaxed">
                Offer your expertise in code, video editing, design, or tutoring with safe escrow milestones.
              </p>
            </div>
            <div className="flex items-center gap-3">
              <Link href="/my-services">
                <Button variant="outline" className="border-neutral-700 bg-neutral-900 text-white hover:bg-neutral-800 text-xs font-bold rounded-xl h-11 px-5">
                  Manage Listings
                </Button>
              </Link>
              <Link href="/services/create">
                <Button className="bg-[#004ac6] text-white hover:bg-[#003da8] text-xs font-bold rounded-xl h-11 px-5 shadow-sm">
                  <PlusCircle className="h-4 w-4 mr-2" />
                  Offer New Skill
                </Button>
              </Link>
            </div>
          </div>

          {/* Section 1: Incoming Client Requests */}
          <div className="rounded-3xl border border-neutral-200 bg-white p-8 shadow-xs space-y-6">
            <div className="flex items-center justify-between pb-4 border-b border-neutral-100">
              <div>
                <h3 className="text-lg font-bold text-neutral-950 flex items-center gap-2">
                  <Bell className="h-4 w-4 text-[#004ac6]" />
                  Incoming Client Requests
                  {sellerData && sellerData.incomingRequests.length > 0 && (
                    <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-bold text-amber-800">
                      {sellerData.incomingRequests.length} Pending
                    </span>
                  )}
                </h3>
                <p className="text-xs text-neutral-500 mt-1">
                  Orders awaiting your review and acceptance before milestone starts.
                </p>
              </div>
              <Link href="/orders" className="text-xs font-bold text-neutral-900 hover:text-[#004ac6] transition-colors">
                View All Orders →
              </Link>
            </div>

            {!sellerData || sellerData.incomingRequests.length === 0 ? (
              <div className="text-center py-12 bg-[#fbfbfa] rounded-2xl border border-dashed border-neutral-200">
                <CheckCircle2 className="h-8 w-8 text-neutral-400 mx-auto mb-2" />
                <p className="text-xs font-bold text-neutral-700">No pending requests awaiting acceptance.</p>
                <p className="text-[11px] text-neutral-400 mt-0.5">New client requests will appear here with one-click actions.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {sellerData.incomingRequests.map((o) => (
                  <div
                    key={o.id}
                    className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 rounded-2xl border border-amber-200/80 bg-amber-50/30 p-5 hover:border-amber-300 transition-colors"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-mono font-bold text-neutral-400">
                          #{o.id.slice(-6).toUpperCase()}
                        </span>
                        <span className="rounded-full bg-amber-100 px-2.5 py-0.5 text-[10px] font-bold text-amber-900 uppercase">
                          Awaiting Your Acceptance
                        </span>
                      </div>
                      <p className="text-base font-bold text-neutral-950">
                        {o.service?.title || 'Service Listing'}
                      </p>
                      <p className="text-xs text-neutral-600">
                        Client: <strong>{o.buyer?.full_name || 'Verified Student'}</strong> • {o.delivery_days} days turnaround
                      </p>
                      {o.requirements && (
                        <p className="text-xs text-neutral-500 italic line-clamp-1">
                          &ldquo;{o.requirements}&rdquo;
                        </p>
                      )}
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <Button
                        size="sm"
                        onClick={() => handleAcceptOrder(o.id)}
                        disabled={actionLoadingId === o.id}
                        className="rounded-xl bg-emerald-600 text-white hover:bg-emerald-700 text-xs font-bold h-10 px-4"
                      >
                        Accept Request
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleDeclineOrder(o.id)}
                        disabled={actionLoadingId === o.id}
                        className="rounded-xl border-neutral-300 text-xs font-bold text-neutral-700 hover:bg-neutral-100 h-10 px-4"
                      >
                        Decline
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* =========================================================================
          BUYER HUB DASHBOARD VIEW
      ========================================================================= */}
      {roleMode === 'buyer' && (
        <div className="space-y-10 animate-in fade-in duration-200">
          {/* Quick Skill Search */}
          <div className="rounded-3xl border border-neutral-200 bg-white p-8 shadow-xs">
            <span className="text-[10px] font-mono uppercase tracking-widest text-[#004ac6]">
              CAMPUS TALENT SEARCH
            </span>
            <h2 className="text-2xl font-black tracking-tight text-neutral-950 mt-1">
              Find Peer Freelancers & Tutors
            </h2>
            <p className="text-xs text-neutral-500 mt-1">
              Hire student developers, designers, tutors, and video editors with safe escrow protection.
            </p>

            <form onSubmit={handleSearchSubmit} className="mt-6 flex gap-3 max-w-2xl">
              <div className="relative flex-1">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-neutral-400" />
                <Input
                  placeholder="Search for Next.js, Python, Figma, DSA Tutoring, Resume Review..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 text-xs rounded-xl bg-neutral-50 border-neutral-200 h-11"
                />
              </div>
              <Button
                type="submit"
                className="bg-neutral-950 text-white hover:bg-black font-bold text-xs rounded-xl px-6 h-11"
              >
                Search
              </Button>
            </form>
          </div>

          {/* Reviews Awaiting Submission Card */}
          {buyerData && buyerData.awaitingReviewOrders.length > 0 && (
            <div className="rounded-3xl border border-amber-200 bg-amber-50/50 p-8 shadow-2xs">
              <div className="flex items-start gap-4">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-amber-500 text-white">
                  <Star className="h-5 w-5 fill-white" />
                </div>
                <div className="flex-1">
                  <h3 className="text-base font-bold text-neutral-950">
                    Reviews Awaiting Your Rating ({buyerData.awaitingReviewOrders.length})
                  </h3>
                  <p className="text-xs text-neutral-600 mt-1 leading-relaxed">
                    You recently completed transactions with campus peers! Leave verified feedback to strengthen their portfolio.
                  </p>

                  <div className="mt-4 space-y-2">
                    {buyerData.awaitingReviewOrders.map((o) => (
                      <div
                        key={o.id}
                        className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-4 rounded-2xl border border-amber-200 shadow-2xs"
                      >
                        <div>
                          <p className="text-xs font-bold text-neutral-950">{o.service?.title}</p>
                          <p className="text-[11px] text-neutral-500">Provider: {o.seller?.full_name}</p>
                        </div>
                        <Button
                          size="sm"
                          onClick={() => setReviewingOrder(o)}
                          className="bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs rounded-xl h-9 px-4"
                        >
                          <Star className="h-3 w-3 fill-white mr-1.5" />
                          Leave Review
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Buyer Quick Stats Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-6">
            <div className="rounded-3xl border border-neutral-200 bg-[#fbfbfa] p-7 shadow-xs">
              <span className="text-[10px] font-mono uppercase tracking-wider text-neutral-400 block">
                Active Hires
              </span>
              <p className="text-3xl sm:text-4xl font-black text-neutral-950 font-mono mt-2">
                <AnimatedCounter
                  value={buyerData?.metrics.activeOrdersCount ?? 0}
                />
              </p>
              <p className="text-[11px] text-neutral-500 mt-2">Orders in progress</p>
            </div>

            <div className="rounded-3xl border border-neutral-200 bg-[#fbfbfa] p-7 shadow-xs">
              <span className="text-[10px] font-mono uppercase tracking-wider text-neutral-400 block">
                In Escrow Vault
              </span>
              <p className="text-3xl sm:text-4xl font-black text-[#004ac6] font-mono mt-2">
                <AnimatedCounter
                  value={buyerData?.metrics.inEscrow ?? 0}
                  prefix="₹"
                />
              </p>
              <p className="text-[11px] text-emerald-700 font-semibold mt-2">Funds locked safely</p>
            </div>

            <div className="rounded-3xl border border-neutral-200 bg-[#fbfbfa] p-7 shadow-xs">
              <span className="text-[10px] font-mono uppercase tracking-wider text-neutral-400 block">
                Completed
              </span>
              <p className="text-3xl sm:text-4xl font-black text-neutral-950 font-mono mt-2">
                <AnimatedCounter
                  value={buyerData?.metrics.completedOrdersCount ?? 0}
                />
              </p>
              <p className="text-[11px] text-neutral-500 mt-2">Approved deliverables</p>
            </div>

            <div className="rounded-3xl border border-neutral-200 bg-[#fbfbfa] p-7 shadow-xs">
              <span className="text-[10px] font-mono uppercase tracking-wider text-neutral-400 block">
                Sessions
              </span>
              <p className="text-3xl sm:text-4xl font-black text-neutral-950 font-mono mt-2">
                <AnimatedCounter
                  value={buyerData?.metrics.upcomingConsultationsCount ?? 0}
                />
              </p>
              <p className="text-[11px] text-neutral-500 mt-2">Upcoming calendar bookings</p>
            </div>
          </div>

          {/* Active Purchases */}
          <div className="rounded-3xl border border-neutral-200 bg-white p-8 shadow-xs space-y-6">
            <div className="flex items-center justify-between pb-4 border-b border-neutral-100">
              <h3 className="text-lg font-bold text-neutral-950">Active Purchases & Hires</h3>
              <Link href="/explore">
                <Button size="sm" className="bg-neutral-950 text-white hover:bg-black text-xs font-bold rounded-xl h-9 px-4">
                  Find More Skills →
                </Button>
              </Link>
            </div>

            {!buyerData || buyerData.activeOrders.length === 0 ? (
              <div className="text-center py-12 bg-[#fbfbfa] rounded-2xl border border-dashed border-neutral-200 space-y-3">
                <ShoppingBag className="h-8 w-8 text-neutral-400 mx-auto" />
                <p className="text-xs font-bold text-neutral-700">You don&apos;t have any active orders right now.</p>
                <Link href="/explore">
                  <Button className="bg-[#004ac6] text-white hover:bg-[#003da8] text-xs font-bold rounded-xl px-5 h-9">
                    Explore Skills
                  </Button>
                </Link>
              </div>
            ) : (
              <div className="space-y-3">
                {buyerData.activeOrders.map((o) => (
                  <Link
                    key={o.id}
                    href={`/orders/${o.id}`}
                    className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 rounded-2xl border border-neutral-200/80 bg-[#fbfbfa] p-5 hover:border-neutral-900 transition-all shadow-2xs"
                  >
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-xs font-mono font-bold text-neutral-400">
                          #{o.id.slice(-6).toUpperCase()}
                        </span>
                        <span
                          className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase ${
                            o.status === 'submitted'
                              ? 'bg-purple-100 text-purple-800'
                              : 'bg-blue-100 text-blue-800'
                          }`}
                        >
                          {o.status.replace('_', ' ')}
                        </span>
                      </div>
                      <p className="text-sm font-bold text-neutral-950">{o.service?.title}</p>
                      <p className="text-xs text-neutral-500 mt-0.5">Provider: {o.seller?.full_name}</p>
                    </div>

                    <div className="text-left sm:text-right">
                      <p className="text-base font-black text-neutral-950 font-mono">
                        ₹{o.price.toLocaleString('en-IN')}
                      </p>
                      <span className="text-xs font-bold text-[#004ac6] flex items-center sm:justify-end gap-1 mt-0.5">
                        Track Deliverable
                        <ArrowUpRight className="h-3.5 w-3.5" />
                      </span>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>

          {/* Upcoming Consultations */}
          <div className="rounded-3xl border border-neutral-200 bg-white p-8 shadow-xs space-y-6">
            <div className="flex items-center justify-between pb-4 border-b border-neutral-100">
              <h3 className="text-lg font-bold text-neutral-950 flex items-center gap-2">
                <Calendar className="h-4 w-4 text-[#004ac6]" />
                Upcoming Consultations & Sessions
              </h3>
              <Link href="/bookings" className="text-xs font-bold text-neutral-900 hover:text-[#004ac6] transition-colors">
                View All Bookings →
              </Link>
            </div>

            {!buyerData || buyerData.consultations.length === 0 ? (
              <div className="text-center py-8 bg-[#fbfbfa] rounded-2xl border border-dashed border-neutral-200">
                <p className="text-xs text-neutral-500">No scheduled consultations upcoming.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {buyerData.consultations.map((c) => (
                  <div
                    key={c.id}
                    className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 rounded-2xl border border-neutral-200 bg-[#fbfbfa] p-5 shadow-2xs"
                  >
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="rounded-full bg-purple-100 text-purple-800 text-[10px] font-bold px-2.5 py-0.5">
                          {c.booking_date} • {c.start_time} - {c.end_time}
                        </span>
                      </div>
                      <p className="text-sm font-bold text-neutral-950">{c.service?.title}</p>
                      <p className="text-xs text-neutral-500 mt-0.5">Mentor / Tutor: {c.provider?.full_name}</p>
                    </div>

                    <Link href="/bookings">
                      <Button size="sm" variant="outline" className="text-xs font-bold rounded-xl h-9 border-neutral-300">
                        Session Details
                      </Button>
                    </Link>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Completed Purchases History */}
          {buyerData && buyerData.completedOrders.length > 0 && (
            <div className="rounded-3xl border border-neutral-200 bg-white p-8 shadow-xs space-y-6">
              <h3 className="text-lg font-bold text-neutral-950 flex items-center gap-2 pb-4 border-b border-neutral-100">
                <FileCheck className="h-4 w-4 text-emerald-600" />
                Completed Purchases & Deliverables
              </h3>

              <div className="space-y-3">
                {buyerData.completedOrders.map((o) => (
                  <div
                    key={o.id}
                    className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 rounded-2xl border border-neutral-200 bg-[#fbfbfa] shadow-2xs"
                  >
                    <div>
                      <p className="text-sm font-bold text-neutral-950">{o.service?.title}</p>
                      <p className="text-xs text-neutral-500 mt-0.5">Seller: {o.seller?.full_name}</p>
                      <div className="flex items-center gap-2 mt-2">
                        <span className="rounded-full bg-emerald-50 px-2.5 py-0.5 text-emerald-800 text-[10px] font-bold border border-emerald-200">
                          Completed
                        </span>
                        {o.review ? (
                          <span className="rounded-full bg-amber-50 text-amber-800 text-[10px] font-bold px-2.5 py-0.5 flex items-center gap-1 border border-amber-200">
                            <Star className="h-3 w-3 fill-amber-400 text-amber-400" />
                            Reviewed ({o.review.rating}/5)
                          </span>
                        ) : (
                          <span className="rounded-full bg-neutral-100 text-neutral-600 text-[10px] font-medium px-2 py-0.5">
                            Awaiting Review
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      <span className="text-base font-black text-neutral-950 font-mono">
                        ₹{o.price.toLocaleString('en-IN')}
                      </span>
                      <Link href={`/orders/${o.id}`}>
                        <Button size="sm" variant="outline" className="text-xs font-bold rounded-xl h-9 border-neutral-300">
                          View Receipt
                        </Button>
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Trust & Profile Verification Footer Card */}
      <div className="mt-12 rounded-3xl border border-neutral-200 bg-white p-8 sm:p-10 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6">
          <div className="flex items-start gap-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-700">
              <ShieldCheck className="h-7 w-7" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-neutral-950">Campus Verification & Trust Standards</h3>
                <VerifiedBadge college={profile?.college} />
              </div>
              <p className="text-xs text-neutral-600 mt-1 max-w-xl leading-relaxed">
                SkillBridge verifies student status through college ID cards and university credentials. Verified badges appear on all your service listings and public profile.
              </p>
            </div>
          </div>

          <Button
            onClick={() => setVerificationOpen(true)}
            variant="outline"
            className="border-neutral-300 text-xs font-bold text-neutral-800 hover:bg-neutral-50 shrink-0 rounded-xl h-11 px-5"
          >
            Review Verification Status
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

      {/* Verified Review Submission Modal */}
      {reviewingOrder && (
        <ReviewModal
          order={reviewingOrder}
          reviewerId={userId}
          open={!!reviewingOrder}
          onClose={() => setReviewingOrder(null)}
          onReviewed={loadData}
        />
      )}
    </div>
  );
}