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
  ChevronRight,
  ShieldCheck,
  Star,
  Sparkles,
  CalendarCheck,
  Calendar,
  ArrowRight,
  UserCheck,
  AlertTriangle,
  RefreshCw,
  Bell,
  ExternalLink,
  MessageSquare,
  FileCheck,
  Play,
  XCircle,
  ShieldAlert,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
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

  const userId = session?.user?.id || '';

  // Initialize mode from URL query or profile active role
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
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-[#004ac6] border-t-transparent" />
        <p className="text-xs font-semibold text-gray-500">Loading your real-time campus dashboard...</p>
      </div>
    );
  }

  const firstName = profile?.full_name?.split(' ')[0] || user?.email?.split('@')[0] || 'Student';
  const isVerified = isStudentVerified;

  return (
    <div className="mx-auto w-full max-w-screen-xl px-4 sm:px-6 lg:px-8 py-10">
      {/* Welcome Bar with Adaptive Mode Switcher */}
      <div className="mb-8 flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-bold uppercase tracking-wider text-[#004ac6]">
              Campus Workspace Command Center
            </span>
            {isVerified ? (
              <VerifiedBadge college={profile?.college ?? 'Campus'} size="sm" />
            ) : (
              <Badge variant="outline" className="text-[10px] text-amber-700 border-amber-300">
                Verification Pending
              </Badge>
            )}
          </div>
          <h1 className="text-3xl font-extrabold text-gray-900">
            Welcome back, {firstName} 👋
          </h1>
          <p className="mt-1 text-xs sm:text-sm text-gray-600">
            {roleMode === 'buyer'
              ? 'Track hired freelancers, scheduled consultations, deliverables, and orders awaiting review.'
              : 'Manage live service listings, incoming requests, active orders, and transaction-derived earnings.'}
          </p>
        </div>

        {/* Adaptive Mode Switcher & Refresh */}
        <div className="flex items-center gap-3">
          <Button
            size="sm"
            variant="outline"
            onClick={loadData}
            disabled={loading}
            className="rounded-xl border-gray-200 text-xs font-bold text-gray-700 hover:bg-gray-50 h-10"
          >
            <RefreshCw className={`h-3.5 w-3.5 mr-1.5 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>

          <div className="flex items-center rounded-2xl border border-border bg-white p-1.5 shadow-sm">
            <button
              onClick={() => handleModeChange('buyer')}
              className={`flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-bold transition-all ${
                roleMode === 'buyer'
                  ? 'bg-[#004ac6] text-white shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <ShoppingBag className="h-3.5 w-3.5" />
              Buyer Hub (Hiring)
            </button>
            <button
              onClick={() => handleModeChange('seller')}
              className={`flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-bold transition-all ${
                roleMode === 'seller'
                  ? 'bg-[#004ac6] text-white shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <Briefcase className="h-3.5 w-3.5" />
              Seller Studio (Offerings)
            </button>
          </div>
        </div>
      </div>

      {/* Error & Retry State */}
      {error && (
        <div className="mb-6 rounded-2xl border border-red-200 bg-red-50 p-4 flex items-center justify-between gap-4">
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
        <div className="space-y-8 animate-in fade-in duration-200">
          {/* Seller Activation Banner if user has not enabled seller permissions */}
          {!isSeller && (
            <div className="rounded-2xl border border-blue-200 bg-blue-50/70 p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-start gap-3.5">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#004ac6] text-white">
                  <Briefcase className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-gray-900">Activate Your Campus Seller Studio</h3>
                  <p className="text-xs text-gray-600 mt-0.5">
                    You currently have Buyer access. Complete your seller profile with your campus skills, pricing, and portfolio to publish service listings.
                  </p>
                </div>
              </div>
              <Link href="/onboarding">
                <Button size="sm" className="bg-[#004ac6] text-white hover:bg-[#003899] text-xs font-bold rounded-xl whitespace-nowrap">
                  Complete Seller Setup →
                </Button>
              </Link>
            </div>
          )}

          {/* Verification Warning if seller is unverified */}
          {!isVerified && (
            <div className="rounded-2xl border border-amber-200 bg-amber-50/70 p-4 flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <AlertTriangle className="h-5 w-5 text-amber-600 shrink-0" />
                <p className="text-xs text-amber-800">
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

          {/* Authoritative Earnings & Metrics Grid (Zero Fabricated Fallbacks) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Total Earned */}
            <div className="rounded-2xl border border-border bg-white p-5 shadow-sm">
              <div className="flex items-center justify-between text-gray-400 mb-2">
                <span className="text-xs font-bold uppercase tracking-wider">Total Earned</span>
                <span className="rounded-lg bg-emerald-50 p-2 text-emerald-600">
                  <TrendingUp className="h-4 w-4" />
                </span>
              </div>
              <p className="text-3xl font-black text-gray-900">
                ₹{(sellerData?.metrics.totalEarned ?? 0).toLocaleString('en-IN')}
              </p>
              <p className="text-[11px] text-emerald-600 font-semibold mt-1">
                Completed & Released Payouts
              </p>
            </div>

            {/* In Escrow */}
            <div className="rounded-2xl border border-border bg-white p-5 shadow-sm">
              <div className="flex items-center justify-between text-gray-400 mb-2">
                <span className="text-xs font-bold uppercase tracking-wider">Held in Escrow</span>
                <span className="rounded-lg bg-blue-50 p-2 text-[#004ac6]">
                  <Clock className="h-4 w-4" />
                </span>
              </div>
              <p className="text-3xl font-black text-[#004ac6]">
                ₹{(sellerData?.metrics.inEscrow ?? 0).toLocaleString('en-IN')}
              </p>
              <p className="text-[11px] text-gray-500 font-medium mt-1">
                Active Client Orders in Progress
              </p>
            </div>

            {/* Completed Orders */}
            <div className="rounded-2xl border border-border bg-white p-5 shadow-sm">
              <div className="flex items-center justify-between text-gray-400 mb-2">
                <span className="text-xs font-bold uppercase tracking-wider">Completed Orders</span>
                <span className="rounded-lg bg-purple-50 p-2 text-purple-600">
                  <CheckCircle2 className="h-4 w-4" />
                </span>
              </div>
              <p className="text-3xl font-black text-gray-900">
                {sellerData?.metrics.completedOrdersCount ?? 0}
              </p>
              <p className="text-[11px] text-gray-500 font-medium mt-1">
                Verified deliveries on record
              </p>
            </div>

            {/* Active Offerings */}
            <div className="rounded-2xl border border-border bg-white p-5 shadow-sm">
              <div className="flex items-center justify-between text-gray-400 mb-2">
                <span className="text-xs font-bold uppercase tracking-wider">Active Services</span>
                <span className="rounded-lg bg-amber-50 p-2 text-amber-600">
                  <Sparkles className="h-4 w-4" />
                </span>
              </div>
              <p className="text-3xl font-black text-gray-900">
                {sellerData?.metrics.activeListingsCount ?? 0}
              </p>
              <p className="text-[11px] text-gray-500 font-medium mt-1">
                Published on marketplace
              </p>
            </div>
          </div>

          {/* Quick Actions Bar */}
          <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl bg-gradient-to-r from-[#004ac6] to-[#002b7a] p-6 text-white shadow-md">
            <div>
              <h2 className="text-lg font-bold">Offer a Peer Skill or Tutoring Session</h2>
              <p className="text-xs text-blue-100 mt-1 max-w-xl">
                Create a high-converting listing with milestones, turn-around times, and clear scope for college batchmates.
              </p>
            </div>
            <div className="flex items-center gap-3">
              <Link href="/my-services">
                <Button variant="outline" className="bg-transparent border-white/30 text-white hover:bg-white/10 font-bold text-xs h-10 px-4 rounded-xl">
                  Manage My Services
                </Button>
              </Link>
              <Link href="/services/create">
                <Button className="bg-white text-[#004ac6] hover:bg-gray-100 font-bold text-xs h-10 px-5 rounded-xl shadow">
                  <PlusCircle className="h-4 w-4 mr-2" />
                  Create New Service
                </Button>
              </Link>
            </div>
          </div>

          {/* Section 1: Incoming Client Requests (Actionable Accept / Decline) */}
          <div className="rounded-2xl border border-border bg-white p-6 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-base font-bold text-gray-900 flex items-center gap-2">
                  <Bell className="h-4 w-4 text-[#004ac6]" />
                  Incoming Client Requests
                  {sellerData && sellerData.incomingRequests.length > 0 && (
                    <Badge className="bg-amber-100 text-amber-800 text-[10px]">
                      {sellerData.incomingRequests.length} Pending
                    </Badge>
                  )}
                </h3>
                <p className="text-xs text-gray-500 mt-0.5">
                  Orders awaiting your review and acceptance before work begins.
                </p>
              </div>
              <Link href="/orders" className="text-xs font-bold text-[#004ac6] hover:underline">
                View All Orders →
              </Link>
            </div>

            {!sellerData || sellerData.incomingRequests.length === 0 ? (
              <div className="text-center py-8 bg-gray-50 rounded-xl border border-dashed">
                <CheckCircle2 className="h-8 w-8 text-emerald-500 mx-auto mb-2" />
                <p className="text-xs font-semibold text-gray-700">No pending requests awaiting acceptance.</p>
                <p className="text-[11px] text-gray-400 mt-0.5">New client requests will appear here with one-click actions.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {sellerData.incomingRequests.map((o) => (
                  <div
                    key={o.id}
                    className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 rounded-xl border border-amber-200 bg-amber-50/20 p-4 hover:border-amber-300 transition-colors"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-gray-400">Order #{o.id.slice(-6).toUpperCase()}</span>
                        <Badge variant="secondary" className="bg-amber-100 text-amber-800 text-[10px] font-bold uppercase">
                          Awaiting Your Acceptance
                        </Badge>
                      </div>
                      <p className="text-sm font-bold text-gray-900">{o.service?.title || 'Service Listing'}</p>
                      <p className="text-xs text-gray-600">
                        Client: <strong>{o.buyer?.full_name || 'Verified Student'}</strong> • Turnaround: {o.delivery_days} days
                      </p>
                      {o.requirements && (
                        <p className="text-xs text-gray-500 italic line-clamp-1">
                          &ldquo;{o.requirements}&rdquo;
                        </p>
                      )}
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <span className="text-base font-black text-emerald-600 mr-2">
                        ₹{o.price.toLocaleString('en-IN')}
                      </span>
                      <Button
                        size="sm"
                        disabled={actionLoadingId === o.id}
                        onClick={() => handleAcceptOrder(o.id)}
                        className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl"
                      >
                        Accept
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={actionLoadingId === o.id}
                        onClick={() => handleDeclineOrder(o.id)}
                        className="border-red-200 text-red-700 hover:bg-red-50 text-xs font-bold rounded-xl"
                      >
                        Decline
                      </Button>
                      <Link href={`/orders/${o.id}`}>
                        <Button size="sm" variant="ghost" className="text-xs font-bold text-gray-600">
                          Inspect →
                        </Button>
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Section 2: Ongoing Work / In-Progress Orders */}
          <div className="rounded-2xl border border-border bg-white p-6 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-base font-bold text-gray-900 flex items-center gap-2">
                  <Play className="h-4 w-4 text-[#004ac6]" />
                  Ongoing Work & Milestones
                </h3>
                <p className="text-xs text-gray-500 mt-0.5">
                  Accepted client projects actively in progress.
                </p>
              </div>
              <Link href="/orders" className="text-xs font-bold text-[#004ac6] hover:underline">
                View Orders →
              </Link>
            </div>

            {!sellerData || sellerData.ongoingWork.length === 0 ? (
              <div className="text-center py-8 bg-gray-50 rounded-xl border border-dashed">
                <p className="text-xs text-gray-500">No projects currently in progress.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {sellerData.ongoingWork.map((o) => (
                  <Link
                    key={o.id}
                    href={`/orders/${o.id}`}
                    className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 rounded-xl border border-gray-100 bg-[#fafafa] p-4 hover:border-[#004ac6]/40 hover:bg-white transition-all shadow-sm"
                  >
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-xs font-bold text-gray-400">#{o.id.slice(-6).toUpperCase()}</span>
                        <Badge
                          variant="secondary"
                          className={`text-[10px] font-bold uppercase rounded-full ${
                            o.status === 'submitted'
                              ? 'bg-purple-100 text-purple-800'
                              : o.status === 'revision_requested'
                              ? 'bg-orange-100 text-orange-800'
                              : 'bg-blue-100 text-blue-800'
                          }`}
                        >
                          {o.status.replace('_', ' ')}
                        </Badge>
                      </div>
                      <p className="text-sm font-bold text-gray-900">{o.service?.title}</p>
                      <p className="text-xs text-gray-500 mt-0.5">Client: {o.buyer?.full_name}</p>
                    </div>

                    <div className="text-left sm:text-right">
                      <p className="text-base font-bold text-emerald-600">₹{o.price.toLocaleString('en-IN')}</p>
                      <span className="text-xs font-bold text-[#004ac6] flex items-center sm:justify-end gap-1 mt-0.5">
                        Open Workspace <ChevronRight className="h-3.5 w-3.5" />
                      </span>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>

          {/* Section 3: Upcoming Consultations */}
          {sellerData && sellerData.consultations.length > 0 && (
            <div className="rounded-2xl border border-border bg-white p-6 shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-base font-bold text-gray-900 flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-[#004ac6]" />
                  Upcoming Client Consultations
                </h3>
                <Link href="/bookings" className="text-xs font-bold text-[#004ac6] hover:underline">
                  All Sessions →
                </Link>
              </div>

              <div className="space-y-3">
                {sellerData.consultations.map((c) => (
                  <div
                    key={c.id}
                    className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 rounded-xl border border-gray-100 bg-blue-50/20 p-4"
                  >
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <Badge className="bg-blue-100 text-blue-800 text-[10px] font-bold">
                          {c.booking_date} • {c.start_time} - {c.end_time}
                        </Badge>
                      </div>
                      <p className="text-sm font-bold text-gray-900">{c.service?.title}</p>
                      <p className="text-xs text-gray-500 mt-0.5">Student: {c.customer?.full_name}</p>
                    </div>

                    <Link href="/bookings">
                      <Button size="sm" variant="outline" className="text-xs font-bold rounded-xl">
                        View Schedule Details
                      </Button>
                    </Link>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* =========================================================================
          BUYER HUB DASHBOARD VIEW
      ========================================================================= */}
      {roleMode === 'buyer' && (
        <div className="space-y-8 animate-in fade-in duration-200">
          {/* Buyer Search & Discovery Banner */}
          <div className="rounded-2xl border border-border bg-gradient-to-r from-blue-50/80 to-indigo-50/80 p-6 sm:p-8 shadow-sm">
            <div className="max-w-2xl">
              <span className="text-xs font-extrabold text-[#004ac6] uppercase tracking-wider">
                Discover Verified Peer Freelancers
              </span>
              <h2 className="text-2xl font-black text-gray-900 mt-1">
                What peer help do you need on campus today?
              </h2>
              <p className="text-xs sm:text-sm text-gray-600 mt-1.5">
                Hire student developers, designers, tutors, and video editors with safe escrow protection.
              </p>

              <form onSubmit={handleSearchSubmit} className="mt-5 flex gap-2">
                <div className="relative flex-1">
                  <Search className="absolute left-3.5 top-3 h-4 w-4 text-gray-400" />
                  <Input
                    placeholder="Search for Next.js, Python, Figma, DSA Tutoring, Resume Review..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10 text-xs rounded-xl bg-white border-gray-300 h-10 shadow-sm"
                  />
                </div>
                <Button
                  type="submit"
                  className="bg-[#004ac6] text-white hover:bg-[#003899] font-bold text-xs rounded-xl px-5 h-10 shadow-sm"
                >
                  Search
                </Button>
              </form>
            </div>
          </div>

          {/* Reviews Awaiting Submission Card (Requirement 1) */}
          {buyerData && buyerData.awaitingReviewOrders.length > 0 && (
            <div className="rounded-2xl border border-amber-200 bg-amber-50/60 p-6 shadow-sm">
              <div className="flex items-start gap-4">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-500 text-white">
                  <Star className="h-5 w-5 fill-white" />
                </div>
                <div className="flex-1">
                  <h3 className="text-sm font-bold text-gray-900">
                    Verified Reviews Awaiting Submission ({buyerData.awaitingReviewOrders.length})
                  </h3>
                  <p className="text-xs text-gray-600 mt-0.5">
                    You recently completed transactions with campus peers! Leave genuine feedback to unlock reputation badges.
                  </p>

                  <div className="mt-3 space-y-2">
                    {buyerData.awaitingReviewOrders.map((o) => (
                      <div
                        key={o.id}
                        className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-3 rounded-xl border border-amber-200/80 shadow-xs"
                      >
                        <div>
                          <p className="text-xs font-bold text-gray-900">{o.service?.title}</p>
                          <p className="text-[11px] text-gray-500">Provider: {o.seller?.full_name}</p>
                        </div>
                        <Button
                          size="sm"
                          onClick={() => setReviewingOrder(o)}
                          className="bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs rounded-xl h-8 px-3"
                        >
                          <Star className="h-3 w-3 fill-white mr-1.5" />
                          Leave Verified Review
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Buyer Quick Stats Grid (Authoritative Database Queries) */}
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
            <div className="rounded-2xl border border-border bg-white p-5 shadow-sm">
              <span className="text-xs text-gray-400 font-semibold block">Active Purchases</span>
              <p className="text-3xl font-black text-gray-900 mt-1">
                {buyerData?.metrics.activeOrdersCount ?? 0}
              </p>
              <p className="text-[11px] text-gray-500 mt-1">Gigs in progress</p>
            </div>

            <div className="rounded-2xl border border-border bg-white p-5 shadow-sm">
              <span className="text-xs text-gray-400 font-semibold block">Escrow Protected</span>
              <p className="text-3xl font-black text-[#004ac6] mt-1">
                ₹{(buyerData?.metrics.inEscrow ?? 0).toLocaleString('en-IN')}
              </p>
              <p className="text-[11px] text-emerald-600 font-semibold mt-1">Funds securely locked</p>
            </div>

            <div className="rounded-2xl border border-border bg-white p-5 shadow-sm">
              <span className="text-xs text-gray-400 font-semibold block">Completed Purchases</span>
              <p className="text-3xl font-black text-emerald-600 mt-1">
                {buyerData?.metrics.completedOrdersCount ?? 0}
              </p>
              <p className="text-[11px] text-gray-500 mt-1">Deliverables approved</p>
            </div>

            <div className="rounded-2xl border border-border bg-white p-5 shadow-sm">
              <span className="text-xs text-gray-400 font-semibold block">Upcoming Consultations</span>
              <p className="text-3xl font-black text-purple-600 mt-1">
                {buyerData?.metrics.upcomingConsultationsCount ?? 0}
              </p>
              <p className="text-[11px] text-gray-500 mt-1">Confirmed calendar bookings</p>
            </div>
          </div>

          {/* Section 1: Active Purchases & Hires */}
          <div className="rounded-2xl border border-border bg-white p-6 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base font-bold text-gray-900">Your Active Purchases & Hires</h3>
              <Link href="/explore">
                <Button size="sm" className="bg-[#004ac6] text-white hover:bg-[#003b9e] text-xs font-bold rounded-xl">
                  Find More Skills →
                </Button>
              </Link>
            </div>

            {!buyerData || buyerData.activeOrders.length === 0 ? (
              <div className="text-center py-10 space-y-3 bg-gray-50 rounded-2xl border border-dashed">
                <ShoppingBag className="h-10 w-10 text-gray-300 mx-auto" />
                <p className="text-sm font-semibold text-gray-700">You don&apos;t have any active orders right now.</p>
                <Link href="/explore">
                  <Button className="bg-[#004ac6] text-white text-xs font-bold rounded-xl">
                    Explore Campus Marketplace
                  </Button>
                </Link>
              </div>
            ) : (
              <div className="space-y-3">
                {buyerData.activeOrders.map((o) => (
                  <Link
                    key={o.id}
                    href={`/orders/${o.id}`}
                    className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 rounded-xl border border-gray-100 bg-[#fafafa] p-4 hover:border-[#004ac6]/30 transition-colors"
                  >
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-xs font-bold text-gray-400">#{o.id.slice(-6).toUpperCase()}</span>
                        <Badge
                          variant="secondary"
                          className={`text-[10px] font-bold uppercase rounded-full ${
                            o.status === 'submitted'
                              ? 'bg-purple-100 text-purple-800'
                              : 'bg-blue-100 text-blue-800'
                          }`}
                        >
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

          {/* Section 2: Upcoming Consultations (Requirement 1) */}
          <div className="rounded-2xl border border-border bg-white p-6 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base font-bold text-gray-900 flex items-center gap-2">
                <Calendar className="h-4 w-4 text-[#004ac6]" />
                Upcoming Consultations & Sessions
              </h3>
              <Link href="/bookings" className="text-xs font-bold text-[#004ac6] hover:underline">
                View All Bookings →
              </Link>
            </div>

            {!buyerData || buyerData.consultations.length === 0 ? (
              <div className="text-center py-6 bg-gray-50 rounded-xl border border-dashed">
                <p className="text-xs text-gray-500">No scheduled consultations upcoming.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {buyerData.consultations.map((c) => (
                  <div
                    key={c.id}
                    className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 rounded-xl border border-gray-100 bg-[#fafafa] p-4"
                  >
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <Badge className="bg-purple-100 text-purple-800 text-[10px] font-bold">
                          {c.booking_date} • {c.start_time} - {c.end_time}
                        </Badge>
                      </div>
                      <p className="text-sm font-bold text-gray-900">{c.service?.title}</p>
                      <p className="text-xs text-gray-500 mt-0.5">Mentor / Tutor: {c.provider?.full_name}</p>
                    </div>

                    <Link href="/bookings">
                      <Button size="sm" variant="outline" className="text-xs font-bold rounded-xl">
                        Session Details
                      </Button>
                    </Link>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Section 3: Recent Activity & Notifications (Requirement 1) */}
          {buyerData && buyerData.notifications.length > 0 && (
            <div className="rounded-2xl border border-border bg-white p-6 shadow-sm">
              <h3 className="text-base font-bold text-gray-900 mb-3 flex items-center gap-2">
                <Bell className="h-4 w-4 text-[#004ac6]" />
                Recent Alerts & Notifications
              </h3>

              <div className="space-y-2">
                {buyerData.notifications.map((n) => (
                  <div
                    key={n.id}
                    className={`p-3 rounded-xl border flex items-start justify-between gap-4 transition-all ${
                      n.read ? 'bg-gray-50/50 border-gray-100' : 'bg-blue-50/40 border-blue-200'
                    }`}
                  >
                    <div className="space-y-0.5">
                      <p className="text-xs font-bold text-gray-900">{n.title}</p>
                      <p className="text-xs text-gray-600">{n.message}</p>
                    </div>
                    {n.link && (
                      <Link href={n.link}>
                        <Button size="sm" variant="ghost" className="text-[11px] font-bold text-[#004ac6]">
                          Open →
                        </Button>
                      </Link>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Section 4: Completed Purchases History */}
          {buyerData && buyerData.completedOrders.length > 0 && (
            <div className="rounded-2xl border border-border bg-white p-6 shadow-sm">
              <h3 className="text-base font-bold text-gray-900 mb-3 flex items-center gap-2">
                <FileCheck className="h-4 w-4 text-emerald-600" />
                Completed Purchases & Deliverables
              </h3>

              <div className="space-y-3">
                {buyerData.completedOrders.map((o) => (
                  <div
                    key={o.id}
                    className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-xl border border-gray-100 bg-[#fafafa]"
                  >
                    <div>
                      <p className="text-sm font-bold text-gray-900">{o.service?.title}</p>
                      <p className="text-xs text-gray-500">Seller: {o.seller?.full_name}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <Badge className="bg-emerald-50 text-emerald-700 text-[10px] font-bold">
                          Completed
                        </Badge>
                        {o.review ? (
                          <Badge className="bg-amber-50 text-amber-800 text-[10px] font-bold flex items-center gap-1">
                            <Star className="h-2.5 w-2.5 fill-amber-400 text-amber-400" />
                            Reviewed ({o.review.rating}/5)
                          </Badge>
                        ) : (
                          <Badge className="bg-gray-100 text-gray-600 text-[10px]">
                            Awaiting Review
                          </Badge>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className="text-sm font-black text-gray-900">
                        ₹{o.price.toLocaleString('en-IN')}
                      </span>
                      <Link href={`/orders/${o.id}`}>
                        <Button size="sm" variant="outline" className="text-xs font-bold rounded-xl">
                          View Receipt & Work
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

      {/* Trust & Profile Verification Card */}
      <div className="mt-8 rounded-2xl border border-border bg-white p-6 sm:p-8 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6">
          <div className="flex items-start gap-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600">
              <ShieldCheck className="h-7 w-7" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-gray-900">Campus Verification & Trust Standards</h3>
                <VerifiedBadge college={profile?.college} />
              </div>
              <p className="text-xs text-gray-600 mt-1 max-w-xl">
                SkillBridge verifies student status through college ID cards and university credentials. Verified badges appear on all your service listings and public profile.
              </p>
            </div>
          </div>

          <Button
            onClick={() => setVerificationOpen(true)}
            variant="outline"
            className="border-gray-200 text-xs font-bold text-gray-700 hover:bg-gray-50 shrink-0 rounded-xl"
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

      {/* Verified Review Submission Modal (for completed orders awaiting reviews) */}
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