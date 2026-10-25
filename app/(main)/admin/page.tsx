'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ShieldAlert,
  Users,
  Briefcase,
  ShoppingBag,
  IndianRupee,
  CheckCircle2,
  XCircle,
  ExternalLink,
  ShieldCheck,
  AlertTriangle,
  Lock,
  BadgeAlert,
  FileText,
  Clock,
  X,
  Search,
  RefreshCw,
  UserCheck,
  UserX,
  Shield,
  Activity,
  History,
  Flag,
  Star,
  EyeOff,
  Eye,
  ArrowUpRight,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { useAuth } from '@/lib/auth/auth-context';
import { useRequireAuth } from '@/lib/auth/use-require-auth';
import {
  fetchAllVerificationsAdmin,
  adminReviewVerification,
  createDocumentSignedUrl,
} from '@/lib/services/verification';
import {
  fetchPlatformMetrics,
  moderateServiceListing,
  fetchAllOrdersAdmin,
  fetchAllUsers,
  performUserAction,
  fetchAdminAuditLogs,
  PlatformMetrics,
} from '@/lib/services/admin';
import {
  fetchReportedReviewsAdmin,
  moderateReview,
} from '@/lib/services/reviews';
import { getAllServices, subscribeMarketplaceStore } from '@/lib/store/marketplace-store';
import { Reveal } from '@/components/motion/reveal';
import { editorialEase } from '@/components/motion/motion-tokens';
import { VerificationRequest, Service, Order, Profile, AdminAuditLog, ReviewReport } from '@/types';

type AdminTab = 'verifications' | 'users' | 'services' | 'orders' | 'reviews' | 'audit';

export default function AdminDashboardPage() {
  const router = useRouter();
  const { session, profile, isAdmin, loading: authLoading } = useRequireAuth({
    requireAdmin: true,
  });

  const [metrics, setMetrics] = useState<PlatformMetrics | null>(null);
  const [verifications, setVerifications] = useState<VerificationRequest[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [users, setUsers] = useState<Profile[]>([]);
  const [auditLogs, setAuditLogs] = useState<AdminAuditLog[]>([]);
  const [reportedReviews, setReportedReviews] = useState<ReviewReport[]>([]);
  const [activeTab, setActiveTab] = useState<AdminTab>('verifications');
  const [loading, setLoading] = useState(true);

  // Reject verification modal state
  const [rejectingItem, setRejectingItem] = useState<VerificationRequest | null>(null);
  const [rejectionReason, setRejectionReason] = useState(
    'College ID card image was illegible or name does not match enrollment record.'
  );

  // User suspension modal state
  const [suspendingUser, setSuspendingUser] = useState<Profile | null>(null);
  const [suspensionReason, setSuspensionReason] = useState(
    'Violation of SkillBridge community standards and campus trust policies.'
  );

  // Filter & Search state
  const [userSearchQuery, setUserSearchQuery] = useState('');
  const [userFilterStatus, setUserFilterStatus] = useState<'all' | 'verified' | 'pending' | 'rejected'>('all');
  const [actionLoading, setActionLoading] = useState(false);

  const loadData = useCallback(async () => {
    try {
      const [m, v, s, o, u, a, r] = await Promise.all([
        fetchPlatformMetrics(),
        fetchAllVerificationsAdmin(),
        getAllServices(),
        fetchAllOrdersAdmin(),
        fetchAllUsers(),
        fetchAdminAuditLogs(),
        fetchReportedReviewsAdmin(),
      ]);
      setMetrics(m);
      setVerifications(v);
      setServices(s);
      setOrders(o);
      setUsers(u);
      setAuditLogs(a);
      setReportedReviews(r || []);
    } catch (err) {
      console.error('Failed to load admin data:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!authLoading && isAdmin) {
      loadData();
      const unsub = subscribeMarketplaceStore(loadData);
      return unsub;
    }
  }, [authLoading, isAdmin, loadData]);

  async function handleApprove(id: string) {
    if (!session?.user?.id) return;
    setActionLoading(true);
    try {
      await adminReviewVerification({
        requestId: id,
        approve: true,
        notes: 'Official credentials verified successfully by platform administrator.',
        reviewerId: session.user.id,
      });
      toast.success('Student verification approved! Student badge unlocked.');
      await loadData();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Action failed';
      toast.error(msg);
    } finally {
      setActionLoading(false);
    }
  }

  async function handleRejectSubmit() {
    if (!rejectingItem || !session?.user?.id) return;
    if (!rejectionReason.trim()) {
      toast.error('Please specify a rejection reason for the student.');
      return;
    }

    setActionLoading(true);
    try {
      await adminReviewVerification({
        requestId: rejectingItem.id,
        approve: false,
        notes: rejectionReason.trim(),
        reviewerId: session.user.id,
      });
      toast.success('Verification rejected. Student has been notified.');
      setRejectingItem(null);
      await loadData();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Rejection failed';
      toast.error(msg);
    } finally {
      setActionLoading(false);
    }
  }

  async function handleViewDocument(item: VerificationRequest) {
    try {
      if (item.document_path) {
        toast.info('Generating secure signed preview URL (5-minute validity)...');
        const signedUrl = await createDocumentSignedUrl(item.document_path);
        window.open(signedUrl, '_blank', 'noopener,noreferrer');
      } else if (item.document_url) {
        window.open(item.document_url, '_blank', 'noopener,noreferrer');
      } else {
        toast.error('No document file attached to this record.');
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Could not open document';
      toast.error(msg);
    }
  }

  async function handleModerate(serviceId: string, status: 'published' | 'paused' | 'archived') {
    setActionLoading(true);
    try {
      await moderateServiceListing(serviceId, status);
      toast.success(`Service listing status updated to "${status}".`);
      await loadData();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Moderation action failed';
      toast.error(msg);
    } finally {
      setActionLoading(false);
    }
  }

  async function handleSuspendUserSubmit() {
    if (!suspendingUser) return;
    setActionLoading(true);
    try {
      await performUserAction({
        targetUserId: suspendingUser.user_id,
        action: 'suspend',
        notes: suspensionReason.trim(),
      });
      toast.success(`User ${suspendingUser.full_name} has been suspended.`);
      setSuspendingUser(null);
      await loadData();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Suspension failed';
      toast.error(msg);
    } finally {
      setActionLoading(false);
    }
  }

  async function handleReinstateUser(targetUser: Profile) {
    setActionLoading(true);
    try {
      await performUserAction({
        targetUserId: targetUser.user_id,
        action: 'reinstate',
        notes: 'Account reinstated by administrator.',
      });
      toast.success(`User ${targetUser.full_name} has been reinstated.`);
      await loadData();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Reinstate failed';
      toast.error(msg);
    } finally {
      setActionLoading(false);
    }
  }

  async function handleModerateReview(reviewId: string, action: 'hide' | 'restore' | 'dismiss') {
    if (!session?.user?.id) return;
    setActionLoading(true);
    try {
      await moderateReview({
        reviewId,
        action,
        adminId: session.user.id,
        notes:
          action === 'hide'
            ? 'Review removed due to community report validation and moderation.'
            : action === 'restore'
            ? 'Review restored following administrator appeal review.'
            : 'Community report dismissed by administrator.',
      });
      toast.success(
        action === 'hide'
          ? 'Review hidden and seller/service ratings recalculated!'
          : action === 'restore'
          ? 'Review restored and factored back into seller rating!'
          : 'Report dismissed successfully.'
      );
      await loadData();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Action failed';
      toast.error(msg);
    } finally {
      setActionLoading(false);
    }
  }

  // Filtered users
  const filteredUsers = users.filter((u) => {
    const matchesSearch =
      u.full_name.toLowerCase().includes(userSearchQuery.toLowerCase()) ||
      (u.email && u.email.toLowerCase().includes(userSearchQuery.toLowerCase())) ||
      (u.college && u.college.toLowerCase().includes(userSearchQuery.toLowerCase())) ||
      (u.student_id_number && u.student_id_number.toLowerCase().includes(userSearchQuery.toLowerCase()));

    const matchesStatus =
      userFilterStatus === 'all' ? true : u.verification_status === userFilterStatus;

    return matchesSearch && matchesStatus;
  });

  if (authLoading || loading) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-20 text-center animate-pulse">
        <div className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-neutral-200 text-neutral-600 mb-4">
          <ShieldAlert className="h-6 w-6" />
        </div>
        <h2 className="text-xl font-bold text-neutral-900 tracking-tight">Validating Administrator Authority...</h2>
        <p className="text-xs text-neutral-500 mt-1">
          Verifying cryptographic session signature and role authorization.
        </p>
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="mx-auto max-w-md px-4 py-20 text-center">
        <div className="rounded-3xl border border-red-200 bg-white p-10 shadow-sm">
          <div className="inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-red-50 text-red-600 mb-4">
            <Lock className="h-7 w-7" />
          </div>
          <h2 className="text-xl font-bold text-neutral-900">Administrator Access Restricted</h2>
          <p className="text-xs text-neutral-500 mt-2">
            Your account is not authorized as a platform administrator. This incident has been logged.
          </p>
          <Link href="/dashboard" className="mt-6 inline-block">
            <Button className="bg-[#004ac6] text-white hover:bg-[#003da6] text-xs font-semibold rounded-full px-6">
              Return to Dashboard
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-10 sm:py-14">
      {/* Header */}
      <Reveal>
        <div className="mb-8 flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 border-b border-neutral-100 pb-6">
          <div>
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-neutral-100 text-neutral-800 text-[11px] font-semibold mb-3 border border-neutral-200">
              <ShieldCheck className="h-3.5 w-3.5 text-[#004ac6]" />
              Verified Administrator Authority
            </div>
            <h1 className="text-3xl sm:text-4xl font-black text-neutral-900 tracking-tight">
              Platform Command Center
            </h1>
            <p className="mt-1 text-xs text-neutral-500 max-w-xl">
              Inspect student ID submissions, govern campus listings, audit escrow transactions, and enforce community standards.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={loadData}
              disabled={actionLoading}
              className="rounded-full border-neutral-200 text-xs font-semibold text-neutral-700 hover:bg-neutral-50 h-9 px-4"
            >
              <RefreshCw className="h-3.5 w-3.5 mr-1.5" />
              Refresh Data
            </Button>
          </div>
        </div>
      </Reveal>

      {/* Metrics Cards */}
      {metrics && (
        <Reveal>
          <div className="mb-10 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3.5">
            <div className="rounded-2xl border border-neutral-200/80 bg-white p-4 shadow-sm">
              <span className="text-[10px] text-neutral-400 font-bold uppercase tracking-wider block">Total Students</span>
              <p className="text-2xl font-black text-neutral-900 mt-1">{metrics.totalUsers}</p>
              <span className="text-[11px] text-emerald-600 font-semibold block mt-0.5">
                {metrics.verifiedStudents} Verified
              </span>
            </div>

            <div className="rounded-2xl border border-neutral-200/80 bg-white p-4 shadow-sm">
              <span className="text-[10px] text-neutral-400 font-bold uppercase tracking-wider block">Active Services</span>
              <p className="text-2xl font-black text-neutral-900 mt-1">{metrics.totalServices}</p>
              <span className="text-[11px] text-neutral-400 block mt-0.5">Peer Offerings</span>
            </div>

            <div className="rounded-2xl border border-neutral-200/80 bg-white p-4 shadow-sm">
              <span className="text-[10px] text-neutral-400 font-bold uppercase tracking-wider block">Total Orders</span>
              <p className="text-2xl font-black text-[#004ac6] mt-1">{metrics.totalOrders}</p>
              <span className="text-[11px] text-neutral-400 block mt-0.5">{metrics.completedOrders} Completed</span>
            </div>

            <div className="rounded-2xl border border-neutral-200/80 bg-white p-4 shadow-sm">
              <span className="text-[10px] text-neutral-400 font-bold uppercase tracking-wider block">Gross Volume</span>
              <p className="text-2xl font-black text-neutral-900 mt-1">
                ₹{metrics.grossMarketplaceVolume.toLocaleString('en-IN')}
              </p>
              <span className="text-[11px] text-emerald-600 font-semibold block mt-0.5">Platform GMV</span>
            </div>

            <div className="rounded-2xl border border-neutral-200/80 bg-white p-4 shadow-sm">
              <span className="text-[10px] text-neutral-400 font-bold uppercase tracking-wider block">Pending Queue</span>
              <p className="text-2xl font-black text-amber-600 mt-1">
                {verifications.filter((v) => v.status === 'pending').length}
              </p>
              <span className="text-[11px] text-amber-700 block mt-0.5">Requires Review</span>
            </div>

            <div className="rounded-2xl border border-neutral-200/80 bg-white p-4 shadow-sm">
              <span className="text-[10px] text-neutral-400 font-bold uppercase tracking-wider block">Audit Events</span>
              <p className="text-2xl font-black text-neutral-900 mt-1">{auditLogs.length}</p>
              <span className="text-[11px] text-neutral-400 block mt-0.5">Logged Records</span>
            </div>
          </div>
        </Reveal>
      )}

      {/* Navigation Tabs */}
      <div className="mb-8 flex flex-wrap gap-2 border-b border-neutral-200 pb-3">
        {(
          [
            { id: 'verifications', label: `Verification Queue (${verifications.filter((v) => v.status === 'pending').length})` },
            { id: 'users', label: `Student Accounts (${users.length})` },
            { id: 'services', label: `Services Moderation (${services.length})` },
            { id: 'orders', label: `All Orders (${orders.length})` },
            { id: 'reviews', label: `Review Moderation (${reportedReviews.filter((r) => !r.review?.is_hidden).length})` },
            { id: 'audit', label: `Audit Trail (${auditLogs.length})` },
          ] as { id: AdminTab; label: string }[]
        ).map((tab) => {
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-4 py-2 text-xs font-semibold rounded-full transition-all ${
                isActive
                  ? 'bg-neutral-900 text-white shadow-sm'
                  : 'text-neutral-600 hover:text-neutral-900 hover:bg-neutral-100'
              }`}
            >
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* TAB 1: Student Verification Queue */}
      {activeTab === 'verifications' && (
        <div className="space-y-4">
          {verifications.length === 0 ? (
            <div className="rounded-3xl border border-dashed border-neutral-300 bg-white p-12 text-center text-xs text-neutral-500">
              No verification requests currently pending in the queue.
            </div>
          ) : (
            verifications.map((item) => (
              <div
                key={item.id}
                className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 rounded-3xl border border-neutral-200/80 bg-white p-6 shadow-sm hover:border-neutral-300 transition-all"
              >
                <div className="flex items-start gap-4">
                  <Avatar className="h-12 w-12 border border-neutral-200">
                    {item.user?.avatar_url && <AvatarImage src={item.user.avatar_url} />}
                    <AvatarFallback className="font-black text-[#004ac6] bg-neutral-100">
                      {item.full_name ? item.full_name.slice(0, 2).toUpperCase() : 'ST'}
                    </AvatarFallback>
                  </Avatar>
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <h3 className="font-bold text-neutral-900 text-sm">
                        {item.full_name || 'Student'}
                      </h3>
                      <Badge
                        variant="secondary"
                        className={`text-[10px] font-bold uppercase rounded-full ${
                          item.status === 'verified'
                            ? 'bg-emerald-50 text-emerald-700'
                            : item.status === 'pending'
                            ? 'bg-amber-50 text-amber-700'
                            : 'bg-red-50 text-red-700'
                        }`}
                      >
                        {item.status}
                      </Badge>
                    </div>

                    <p className="text-xs text-neutral-600">
                      College: <strong>{item.college_name}</strong>
                    </p>

                    <div className="flex flex-wrap items-center gap-3 text-xs text-neutral-500">
                      {item.student_id_number && (
                        <span>
                          Student PRN:{' '}
                          <code className="bg-neutral-100 px-1.5 py-0.5 rounded text-neutral-800 font-mono text-[11px]">
                            {item.student_id_number}
                          </code>
                        </span>
                      )}
                      {item.college_email && (
                        <span>
                          Email: <code>{item.college_email}</code>
                        </span>
                      )}
                      <span>
                        Submitted {new Date(item.submitted_at).toLocaleDateString('en-IN')}
                      </span>
                    </div>

                    <div className="pt-1">
                      <button
                        type="button"
                        onClick={() => handleViewDocument(item)}
                        className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#004ac6] hover:underline"
                      >
                        <ExternalLink className="h-3.5 w-3.5" />
                        Preview Private Document (Secure Signed URL)
                      </button>
                    </div>

                    {item.admin_notes && (
                      <p className="text-[11px] text-neutral-500 italic mt-1">
                        Review note: &ldquo;{item.admin_notes}&rdquo;
                      </p>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  {item.status === 'pending' ? (
                    <>
                      <Button
                        size="sm"
                        disabled={actionLoading}
                        onClick={() => handleApprove(item.id)}
                        className="bg-emerald-600 text-white hover:bg-emerald-700 font-bold text-xs h-9 rounded-full px-5 shadow-sm"
                      >
                        <CheckCircle2 className="h-4 w-4 mr-1.5" />
                        Approve Badge
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={actionLoading}
                        onClick={() => {
                          setRejectingItem(item);
                          setRejectionReason(
                            'Student ID photo was not clear enough or enrollment number does not match.'
                          );
                        }}
                        className="border-neutral-200 text-red-600 hover:bg-red-50 font-semibold text-xs h-9 rounded-full px-4"
                      >
                        <XCircle className="h-4 w-4 mr-1.5" />
                        Reject with Note
                      </Button>
                    </>
                  ) : (
                    <span className="text-xs text-neutral-400 font-medium italic">
                      Decision Recorded
                    </span>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* TAB 2: Student Accounts & User Management */}
      {activeTab === 'users' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row gap-3 bg-white p-4 rounded-3xl border border-neutral-200/80 shadow-sm">
            <div className="relative flex-1">
              <Search className="absolute left-3.5 top-3 h-4 w-4 text-neutral-400" />
              <Input
                placeholder="Search students by name, email, college, or student PRN..."
                value={userSearchQuery}
                onChange={(e) => setUserSearchQuery(e.target.value)}
                className="pl-10 text-xs rounded-xl h-10"
              />
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-neutral-500 font-medium">Status:</span>
              <select
                value={userFilterStatus}
                onChange={(e) => setUserFilterStatus(e.target.value as any)}
                className="text-xs rounded-xl border border-neutral-300 p-2 h-10 focus:border-[#004ac6] focus:outline-none"
              >
                <option value="all">All Accounts</option>
                <option value="verified">Verified Only</option>
                <option value="pending">Pending Only</option>
                <option value="rejected">Suspended / Rejected</option>
              </select>
            </div>
          </div>

          {filteredUsers.length === 0 ? (
            <div className="rounded-3xl border border-dashed border-neutral-300 bg-white p-12 text-center text-xs text-neutral-500">
              No students found matching current search criteria.
            </div>
          ) : (
            <div className="space-y-3">
              {filteredUsers.map((u) => {
                const isCurrentUser = session?.user?.id === u.user_id;
                return (
                  <div
                    key={u.id || u.user_id}
                    className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 rounded-3xl border border-neutral-200/80 bg-white p-5 shadow-sm hover:border-neutral-300 transition-all"
                  >
                    <div className="flex items-start gap-3.5">
                      <Avatar className="h-10 w-10 border border-neutral-200">
                        {u.avatar_url && <AvatarImage src={u.avatar_url} />}
                        <AvatarFallback className="font-bold text-[#004ac6] bg-neutral-100">
                          {u.full_name ? u.full_name.slice(0, 2).toUpperCase() : 'ST'}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="font-bold text-neutral-900 text-sm">{u.full_name}</h4>
                          {u.is_admin && (
                            <Badge className="bg-neutral-900 text-white text-[10px] font-bold rounded-full">
                              <Shield className="h-3 w-3 mr-1" />
                              Platform Admin
                            </Badge>
                          )}
                          <Badge
                            variant="secondary"
                            className={`text-[10px] font-bold uppercase rounded-full ${
                              u.verification_status === 'verified'
                                ? 'bg-emerald-50 text-emerald-700'
                                : u.verification_status === 'pending'
                                ? 'bg-amber-50 text-amber-700'
                                : 'bg-red-50 text-red-700'
                            }`}
                          >
                            {u.verification_status}
                          </Badge>
                        </div>
                        <p className="text-xs text-neutral-500 mt-0.5">
                          {u.email} • {u.college || 'College not set'}
                        </p>
                        <div className="flex flex-wrap items-center gap-2 text-[11px] text-neutral-400 mt-1">
                          {u.student_id_number && (
                            <span>
                              ID/PRN: <code className="bg-neutral-100 px-1 py-0.5 rounded font-mono text-neutral-800">{u.student_id_number}</code>
                            </span>
                          )}
                          {u.rejection_reason && (
                            <span className="text-red-600 italic">
                              Suspension Note: &ldquo;{u.rejection_reason}&rdquo;
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      {u.verification_status === 'rejected' ? (
                        <Button
                          size="sm"
                          disabled={actionLoading}
                          onClick={() => handleReinstateUser(u)}
                          className="bg-emerald-600 text-white hover:bg-emerald-700 text-xs font-semibold rounded-full h-8 px-4"
                        >
                          <UserCheck className="h-3.5 w-3.5 mr-1.5" />
                          Reinstate Account
                        </Button>
                      ) : (
                        <Button
                          size="sm"
                          variant="outline"
                          disabled={actionLoading || isCurrentUser}
                          onClick={() => {
                            setSuspendingUser(u);
                            setSuspensionReason(
                              'Violation of SkillBridge campus trust and code of conduct policies.'
                            );
                          }}
                          className={`text-xs font-semibold rounded-full h-8 px-4 border-neutral-200 text-red-600 hover:bg-red-50 ${
                            isCurrentUser ? 'opacity-50 cursor-not-allowed' : ''
                          }`}
                          title={isCurrentUser ? 'Cannot suspend your own account' : 'Suspend account'}
                        >
                          <UserX className="h-3.5 w-3.5 mr-1.5" />
                          Suspend Account
                        </Button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* TAB 3: Services Moderation */}
      {activeTab === 'services' && (
        <div className="space-y-4">
          {services.map((svc) => (
            <div
              key={svc.id}
              className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 rounded-3xl border border-neutral-200/80 bg-white p-6 shadow-sm hover:border-neutral-300 transition-all"
            >
              <div>
                <div className="flex items-center gap-2 mb-1.5">
                  <span className="text-xs font-mono font-bold text-neutral-400">#{svc.id.slice(-6)}</span>
                  <Badge
                    variant="secondary"
                    className={`text-[10px] font-bold uppercase rounded-full ${
                      svc.status === 'published'
                        ? 'bg-emerald-50 text-emerald-700'
                        : 'bg-neutral-100 text-neutral-600'
                    }`}
                  >
                    {svc.status}
                  </Badge>
                  {svc.category && (
                    <span className="text-xs text-[#004ac6] font-semibold">{svc.category.name}</span>
                  )}
                </div>
                <h3 className="font-bold text-neutral-900 text-base">{svc.title}</h3>
                <p className="text-xs text-neutral-500 mt-0.5">
                  ₹{svc.price} • {svc.delivery_days} days delivery
                </p>
              </div>

              <div className="flex items-center gap-2">
                {svc.status === 'published' ? (
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={actionLoading}
                    onClick={() => handleModerate(svc.id, 'paused')}
                    className="border-neutral-200 text-amber-700 hover:bg-amber-50 text-xs font-semibold rounded-full px-4 h-9"
                  >
                    Pause Listing
                  </Button>
                ) : (
                  <Button
                    size="sm"
                    disabled={actionLoading}
                    onClick={() => handleModerate(svc.id, 'published')}
                    className="bg-neutral-900 text-white hover:bg-neutral-800 text-xs font-semibold rounded-full px-4 h-9"
                  >
                    Publish Listing
                  </Button>
                )}
                <Link href={`/services/${svc.id}`}>
                  <Button size="sm" variant="ghost" className="text-xs rounded-full px-3 h-9 text-neutral-600">
                    View
                  </Button>
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* TAB 4: All Orders */}
      {activeTab === 'orders' && (
        <div className="space-y-4">
          {orders.map((ord) => (
            <div
              key={ord.id}
              className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 rounded-3xl border border-neutral-200/80 bg-white p-6 shadow-sm hover:border-neutral-300 transition-all"
            >
              <div>
                <div className="flex items-center gap-2 mb-1.5">
                  <span className="text-xs font-mono font-bold text-neutral-400">Order #{ord.id.slice(-6)}</span>
                  <Badge variant="secondary" className="text-[10px] font-bold uppercase rounded-full">
                    {ord.status.replace('_', ' ')}
                  </Badge>
                </div>
                <h3 className="font-bold text-neutral-900 text-base">{ord.service?.title ?? 'Student Service'}</h3>
                <p className="text-xs text-neutral-500 mt-0.5">
                  Amount: ₹{ord.price} • Escrow: <strong className="text-emerald-700">{ord.payment_status}</strong>
                </p>
              </div>

              <Link href={`/orders/${ord.id}`}>
                <Button size="sm" variant="outline" className="text-xs font-semibold rounded-full px-5 h-9 border-neutral-200">
                  Inspect Escrow
                </Button>
              </Link>
            </div>
          ))}
        </div>
      )}

      {/* TAB 5: Review Moderation */}
      {activeTab === 'reviews' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-3xl border border-neutral-200/80 shadow-sm">
            <div>
              <h3 className="text-sm font-bold text-neutral-900 flex items-center gap-2">
                <Flag className="h-4 w-4 text-[#004ac6]" />
                Community Reported Reviews & Reputation Governance
              </h3>
              <p className="text-xs text-neutral-500 mt-1">
                Uphold marketplace integrity. Hiding an abusive or fraudulent review immediately recalculates both the service rating and the seller’s aggregate reputation scores.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="text-xs font-semibold py-1 px-3 rounded-full">
                {reportedReviews.filter((r) => !r.review?.is_hidden).length} Active Reports
              </Badge>
            </div>
          </div>

          {reportedReviews.length === 0 ? (
            <div className="text-center py-12 bg-white rounded-3xl border border-neutral-200/80 p-8 shadow-sm">
              <CheckCircle2 className="h-10 w-10 text-emerald-500 mx-auto mb-3" />
              <h4 className="text-sm font-bold text-neutral-900">Zero Reported Reviews</h4>
              <p className="text-xs text-neutral-500 mt-1 max-w-sm mx-auto">
                No peer reviews have been flagged by the community. All public seller ratings remain healthy and unmoderated.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {reportedReviews.map((report) => {
                const rev = report.review;
                const isHidden = rev?.is_hidden ?? false;

                return (
                  <div
                    key={report.id}
                    className={`rounded-3xl border p-6 bg-white shadow-sm transition-all ${
                      isHidden ? 'border-amber-200 bg-amber-50/20' : 'border-neutral-200/80'
                    }`}
                  >
                    <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                      <div className="space-y-3 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <Badge
                            variant="secondary"
                            className={`text-[10px] font-bold uppercase rounded-full ${
                              report.status === 'resolved'
                                ? 'bg-emerald-50 text-emerald-700'
                                : report.status === 'dismissed'
                                ? 'bg-neutral-100 text-neutral-600'
                                : 'bg-red-50 text-red-700'
                            }`}
                          >
                            Report: {report.status}
                          </Badge>

                          {isHidden ? (
                            <Badge className="bg-amber-100 text-amber-800 border-amber-300 text-[10px] font-bold rounded-full">
                              <EyeOff className="h-3 w-3 mr-1" />
                              Hidden from Ratings
                            </Badge>
                          ) : (
                            <Badge className="bg-emerald-100 text-emerald-800 border-emerald-300 text-[10px] font-bold rounded-full">
                              <Eye className="h-3 w-3 mr-1" />
                              Active in Score
                            </Badge>
                          )}

                          <span className="text-[11px] text-neutral-400">
                            Reported on {new Date(report.created_at).toLocaleDateString('en-IN', {
                              month: 'short',
                              day: 'numeric',
                              year: 'numeric',
                            })}
                          </span>
                        </div>

                        {rev && (
                          <div className="bg-neutral-50 p-4 rounded-2xl border border-neutral-100 text-xs text-neutral-700">
                            <span className="font-bold text-neutral-900 block mb-1">
                              Review ({rev.rating}★):
                            </span>
                            &ldquo;{rev.comment}&rdquo;
                          </div>
                        )}

                        <p className="text-xs text-neutral-600">
                          <strong>Reason for flag:</strong> {report.reason}
                        </p>
                      </div>

                      <div className="flex items-center gap-2">
                        {rev && (
                          <>
                            {isHidden ? (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleModerateReview(rev.id, 'restore')}
                                className="text-xs font-semibold rounded-full h-8 px-3 border-neutral-200"
                              >
                                Restore
                              </Button>
                            ) : (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleModerateReview(rev.id, 'hide')}
                                className="text-xs font-semibold rounded-full h-8 px-3 border-amber-200 text-amber-700 hover:bg-amber-50"
                              >
                                Hide Review
                              </Button>
                            )}
                          </>
                        )}
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleModerateReview(report.review_id, 'dismiss')}
                          className="text-xs rounded-full h-8 px-3 text-neutral-500"
                        >
                          Dismiss
                        </Button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* TAB 6: Audit Trail */}
      {activeTab === 'audit' && (
        <div className="rounded-3xl border border-neutral-200/80 bg-white p-6 sm:p-8 shadow-sm space-y-4">
          <span className="text-[10px] font-bold uppercase tracking-wider text-neutral-400 block mb-2">
            Governance Activity Logs
          </span>
          {auditLogs.length === 0 ? (
            <p className="text-xs text-neutral-400 text-center py-8">No administrator audit logs recorded yet.</p>
          ) : (
            <div className="divide-y divide-neutral-100">
              {auditLogs.map((log) => (
                <div key={log.id} className="py-3.5 flex items-start justify-between text-xs">
                  <div>
                    <span className="font-bold text-neutral-900 capitalize block">
                      {log.action.replace('_', ' ')}
                    </span>
                    <p className="text-neutral-500 text-[11px] mt-0.5">
                      {typeof log.details?.notes === 'string'
                        ? (log.details.notes as string)
                        : log.details
                        ? JSON.stringify(log.details)
                        : `Target: ${log.target_type}`}
                    </p>
                  </div>
                  <span className="text-[10px] text-neutral-400 shrink-0">
                    {new Date(log.created_at).toLocaleString('en-IN', {
                      month: 'short',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Reject Verification Modal */}
      <AnimatePresence>
        {rejectingItem && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.96 }}
              transition={{ duration: 0.2, ease: editorialEase }}
              className="w-full max-w-md rounded-3xl border border-neutral-200 bg-white p-6 sm:p-8 shadow-2xl space-y-4"
            >
              <h3 className="text-lg font-bold text-neutral-900">Reject Student Verification</h3>
              <p className="text-xs text-neutral-500">
                Specify feedback explaining why this student ID could not be validated.
              </p>

              <div>
                <Label className="text-xs font-semibold text-neutral-700">Rejection Feedback</Label>
                <Input
                  value={rejectionReason}
                  onChange={(e) => setRejectionReason(e.target.value)}
                  className="mt-1 text-xs rounded-xl"
                />
              </div>

              <div className="flex gap-2 pt-2">
                <Button
                  variant="outline"
                  onClick={() => setRejectingItem(null)}
                  className="flex-1 text-xs rounded-full h-10 font-semibold"
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleRejectSubmit}
                  disabled={actionLoading}
                  className="flex-1 bg-red-600 text-white hover:bg-red-700 text-xs font-bold rounded-full h-10"
                >
                  Confirm Rejection
                </Button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* User Suspension Modal */}
      <AnimatePresence>
        {suspendingUser && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.96 }}
              transition={{ duration: 0.2, ease: editorialEase }}
              className="w-full max-w-md rounded-3xl border border-neutral-200 bg-white p-6 sm:p-8 shadow-2xl space-y-4"
            >
              <h3 className="text-lg font-bold text-neutral-900">
                Suspend {suspendingUser.full_name}&apos;s Account
              </h3>
              <p className="text-xs text-neutral-500">
                This will deactivate the user&apos;s active listings and revoke marketplace privileges.
              </p>

              <div>
                <Label className="text-xs font-semibold text-neutral-700">Reason for Suspension</Label>
                <Input
                  value={suspensionReason}
                  onChange={(e) => setSuspensionReason(e.target.value)}
                  className="mt-1 text-xs rounded-xl"
                />
              </div>

              <div className="flex gap-2 pt-2">
                <Button
                  variant="outline"
                  onClick={() => setSuspendingUser(null)}
                  className="flex-1 text-xs rounded-full h-10 font-semibold"
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleSuspendUserSubmit}
                  disabled={actionLoading}
                  className="flex-1 bg-red-600 text-white hover:bg-red-700 text-xs font-bold rounded-full h-10"
                >
                  Suspend Account
                </Button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
