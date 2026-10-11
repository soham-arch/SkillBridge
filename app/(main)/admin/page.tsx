'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
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
import { VerificationRequest, Service, Order, Profile, AdminAuditLog, ReviewReport } from '@/types';

type AdminTab = 'verifications' | 'services' | 'orders' | 'users' | 'reviews' | 'audit';

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
      toast.success('Student verification approved! Student badge unlocked and email notification sent.');
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
      toast.success('Verification rejected. Student has been notified with instructions to resubmit.');
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
      <div className="mx-auto max-w-7xl px-4 py-16 text-center">
        <div className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-[#004ac6]/10 text-[#004ac6] animate-pulse mb-4">
          <ShieldAlert className="h-6 w-6" />
        </div>
        <h2 className="text-lg font-bold text-gray-900">Validating Administrator Authority...</h2>
        <p className="text-xs text-gray-500 mt-1">
          Verifying cryptographic session signature and role authorization.
        </p>
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="mx-auto max-w-md px-4 py-16 text-center">
        <div className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-red-100 text-red-600 mb-4">
          <Lock className="h-6 w-6" />
        </div>
        <h2 className="text-lg font-bold text-gray-900">Administrator Access Restricted</h2>
        <p className="text-xs text-gray-500 mt-2">
          Your account is not authorized as a platform administrator. This incident has been logged.
        </p>
        <Link href="/dashboard" className="mt-6 inline-block">
          <Button className="bg-[#004ac6] text-white text-xs font-bold rounded-xl">
            Return to Dashboard
          </Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full bg-[#004ac6]/10 text-[#004ac6] text-xs font-bold mb-2">
            <ShieldCheck className="h-3.5 w-3.5" />
            Verified Administrator Authority
          </div>
          <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight">
            Platform Command Center
          </h1>
          <p className="mt-1 text-xs text-gray-600">
            Review genuine college ID submissions, manage student accounts, audit transactions, and uphold campus trust standards.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={loadData}
            disabled={actionLoading}
            className="rounded-xl border-gray-200 text-xs font-bold text-gray-700 hover:bg-gray-50"
          >
            <RefreshCw className="h-3.5 w-3.5 mr-1.5" />
            Refresh
          </Button>
        </div>
      </div>

      {/* Metrics Cards */}
      {metrics && (
        <div className="mb-8 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
          <div className="rounded-2xl border border-border bg-white p-4 shadow-sm">
            <span className="text-[11px] text-gray-400 font-semibold block">Total Students</span>
            <p className="text-2xl font-extrabold text-gray-900 mt-1">{metrics.totalUsers}</p>
            <span className="text-[11px] text-emerald-600 font-semibold">
              {metrics.verifiedStudents} Verified
            </span>
          </div>

          <div className="rounded-2xl border border-border bg-white p-4 shadow-sm">
            <span className="text-[11px] text-gray-400 font-semibold block">Active Services</span>
            <p className="text-2xl font-extrabold text-gray-900 mt-1">{metrics.totalServices}</p>
            <span className="text-[11px] text-gray-500">Peer Offerings</span>
          </div>

          <div className="rounded-2xl border border-border bg-white p-4 shadow-sm">
            <span className="text-[11px] text-gray-400 font-semibold block">Total Orders</span>
            <p className="text-2xl font-extrabold text-[#004ac6] mt-1">{metrics.totalOrders}</p>
            <span className="text-[11px] text-gray-500">{metrics.completedOrders} Completed</span>
          </div>

          <div className="rounded-2xl border border-border bg-white p-4 shadow-sm">
            <span className="text-[11px] text-gray-400 font-semibold block">Gross Volume</span>
            <p className="text-2xl font-extrabold text-emerald-600 mt-1">
              ₹{metrics.grossMarketplaceVolume.toLocaleString('en-IN')}
            </p>
            <span className="text-[11px] text-emerald-700">Platform GMV</span>
          </div>

          <div className="rounded-2xl border border-border bg-white p-4 shadow-sm">
            <span className="text-[11px] text-gray-400 font-semibold block">Pending Queue</span>
            <p className="text-2xl font-extrabold text-amber-600 mt-1">
              {verifications.filter((v) => v.status === 'pending').length}
            </p>
            <span className="text-[11px] text-amber-700">Needs Review</span>
          </div>

          <div className="rounded-2xl border border-border bg-white p-4 shadow-sm">
            <span className="text-[11px] text-gray-400 font-semibold block">Audit Events</span>
            <p className="text-2xl font-extrabold text-indigo-600 mt-1">{auditLogs.length}</p>
            <span className="text-[11px] text-indigo-700 font-semibold">Governance Log</span>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="mb-6 flex flex-wrap gap-2 border-b border-gray-200 pb-3">
        <button
          onClick={() => setActiveTab('verifications')}
          className={`px-4 py-2 text-xs font-bold rounded-xl transition-all ${
            activeTab === 'verifications'
              ? 'bg-[#004ac6] text-white shadow-sm'
              : 'text-gray-600 hover:bg-gray-100'
          }`}
        >
          Verification Queue ({verifications.filter((v) => v.status === 'pending').length} Pending)
        </button>
        <button
          onClick={() => setActiveTab('users')}
          className={`px-4 py-2 text-xs font-bold rounded-xl transition-all ${
            activeTab === 'users'
              ? 'bg-[#004ac6] text-white shadow-sm'
              : 'text-gray-600 hover:bg-gray-100'
          }`}
        >
          Student Accounts ({users.length})
        </button>
        <button
          onClick={() => setActiveTab('services')}
          className={`px-4 py-2 text-xs font-bold rounded-xl transition-all ${
            activeTab === 'services'
              ? 'bg-[#004ac6] text-white shadow-sm'
              : 'text-gray-600 hover:bg-gray-100'
          }`}
        >
          Services Moderation ({services.length})
        </button>
        <button
          onClick={() => setActiveTab('orders')}
          className={`px-4 py-2 text-xs font-bold rounded-xl transition-all ${
            activeTab === 'orders'
              ? 'bg-[#004ac6] text-white shadow-sm'
              : 'text-gray-600 hover:bg-gray-100'
          }`}
        >
          All Orders ({orders.length})
        </button>
        <button
          onClick={() => setActiveTab('reviews')}
          className={`px-4 py-2 text-xs font-bold rounded-xl transition-all flex items-center gap-1.5 ${
            activeTab === 'reviews'
              ? 'bg-[#004ac6] text-white shadow-sm'
              : 'text-gray-600 hover:bg-gray-100'
          }`}
        >
          <Flag className="h-3.5 w-3.5" />
          Review Moderation ({reportedReviews.filter((r) => !r.review?.is_hidden).length} Flagged)
        </button>
        <button
          onClick={() => setActiveTab('audit')}
          className={`px-4 py-2 text-xs font-bold rounded-xl transition-all flex items-center gap-1.5 ${
            activeTab === 'audit'
              ? 'bg-[#004ac6] text-white shadow-sm'
              : 'text-gray-600 hover:bg-gray-100'
          }`}
        >
          <History className="h-3.5 w-3.5" />
          Audit Trail ({auditLogs.length})
        </button>
      </div>

      {/* TAB 1: Student Verification Queue */}
      {activeTab === 'verifications' && (
        <div className="space-y-4">
          {verifications.length === 0 ? (
            <p className="text-xs text-gray-500 bg-white p-8 rounded-2xl border text-center">
              No verification requests in the queue.
            </p>
          ) : (
            verifications.map((item) => (
              <div
                key={item.id}
                className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 rounded-2xl border border-border bg-white p-6 shadow-sm hover:shadow-md transition-shadow"
              >
                <div className="flex items-start gap-4">
                  <Avatar className="h-12 w-12 border border-[#c3c6d7]">
                    {item.user?.avatar_url && <AvatarImage src={item.user.avatar_url} />}
                    <AvatarFallback className="font-bold text-[#004ac6]">
                      {item.full_name ? item.full_name.slice(0, 2).toUpperCase() : 'ST'}
                    </AvatarFallback>
                  </Avatar>
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <h3 className="font-bold text-gray-900 text-sm">
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

                    <p className="text-xs text-gray-600">
                      College: <strong>{item.college_name}</strong>
                    </p>

                    <div className="flex flex-wrap items-center gap-3 text-xs text-gray-500">
                      {item.student_id_number && (
                        <span>
                          Student ID / PRN:{' '}
                          <code className="bg-gray-100 px-1.5 py-0.5 rounded text-gray-800 font-mono text-[11px]">
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
                        Submitted: {new Date(item.submitted_at).toLocaleDateString('en-IN')}
                      </span>
                    </div>

                    <div className="pt-1">
                      <button
                        type="button"
                        onClick={() => handleViewDocument(item)}
                        className="inline-flex items-center gap-1.5 text-xs font-bold text-[#004ac6] hover:underline"
                      >
                        <ExternalLink className="h-3.5 w-3.5" />
                        Preview Private Verification Document (Signed URL)
                      </button>
                    </div>

                    {item.admin_notes && (
                      <p className="text-[11px] text-gray-500 italic mt-1">
                        Review note: "{item.admin_notes}"
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
                        className="bg-emerald-600 text-white hover:bg-emerald-700 font-bold text-xs h-9 rounded-xl shadow-sm"
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
                        className="border-gray-200 text-red-600 hover:bg-red-50 font-bold text-xs h-9 rounded-xl"
                      >
                        <XCircle className="h-4 w-4 mr-1.5" />
                        Reject with Feedback
                      </Button>
                    </>
                  ) : (
                    <span className="text-xs text-gray-400 font-medium italic">
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
          {/* Search & Filter Bar */}
          <div className="flex flex-col sm:flex-row gap-3 bg-white p-4 rounded-2xl border border-border shadow-sm">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Search students by name, email, college, or student ID..."
                value={userSearchQuery}
                onChange={(e) => setUserSearchQuery(e.target.value)}
                className="pl-9 text-xs rounded-xl"
              />
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-gray-500 font-medium">Status:</span>
              <select
                value={userFilterStatus}
                onChange={(e) => setUserFilterStatus(e.target.value as any)}
                className="text-xs rounded-xl border border-gray-300 p-2 focus:border-[#004ac6] focus:outline-none"
              >
                <option value="all">All Accounts</option>
                <option value="verified">Verified Only</option>
                <option value="pending">Pending Only</option>
                <option value="rejected">Suspended / Rejected</option>
              </select>
            </div>
          </div>

          {filteredUsers.length === 0 ? (
            <p className="text-xs text-gray-500 bg-white p-8 rounded-2xl border text-center">
              No students found matching current filters.
            </p>
          ) : (
            <div className="space-y-3">
              {filteredUsers.map((u) => {
                const isCurrentUser = session?.user?.id === u.user_id;
                return (
                  <div
                    key={u.id || u.user_id}
                    className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 rounded-2xl border border-border bg-white p-5 shadow-sm hover:shadow-md transition-shadow"
                  >
                    <div className="flex items-start gap-3.5">
                      <Avatar className="h-10 w-10 border border-[#c3c6d7]">
                        {u.avatar_url && <AvatarImage src={u.avatar_url} />}
                        <AvatarFallback className="font-bold text-[#004ac6]">
                          {u.full_name ? u.full_name.slice(0, 2).toUpperCase() : 'ST'}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="font-bold text-gray-900 text-sm">{u.full_name}</h4>
                          {u.is_admin && (
                            <Badge className="bg-indigo-600 text-white text-[10px] font-bold">
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
                        <p className="text-xs text-gray-600 mt-0.5">
                          {u.email} • {u.college || 'College not provided'}
                        </p>
                        <div className="flex flex-wrap items-center gap-2 text-[11px] text-gray-500 mt-1">
                          {u.student_id_number && (
                            <span>
                              ID/PRN: <code className="bg-gray-100 px-1 py-0.5 rounded font-mono text-gray-800">{u.student_id_number}</code>
                            </span>
                          )}
                          {u.rejection_reason && (
                            <span className="text-red-600 italic">
                              Suspension Note: "{u.rejection_reason}"
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
                          className="bg-emerald-600 text-white hover:bg-emerald-700 text-xs font-bold rounded-xl h-8"
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
                          className={`text-xs font-bold rounded-xl h-8 border-gray-200 text-red-600 hover:bg-red-50 ${
                            isCurrentUser ? 'opacity-50 cursor-not-allowed' : ''
                          }`}
                          title={isCurrentUser ? 'Cannot suspend your own administrator account' : 'Suspend user account'}
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
              className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 rounded-2xl border border-border bg-white p-6 shadow-sm"
            >
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-xs font-bold text-gray-400">#{svc.id.slice(-6)}</span>
                  <Badge
                    variant="secondary"
                    className={`text-[10px] font-bold uppercase rounded-full ${
                      svc.status === 'published'
                        ? 'bg-emerald-50 text-emerald-700'
                        : 'bg-gray-100 text-gray-600'
                    }`}
                  >
                    {svc.status}
                  </Badge>
                  {svc.category && (
                    <span className="text-xs text-[#004ac6] font-semibold">{svc.category.name}</span>
                  )}
                </div>
                <h3 className="font-bold text-gray-900">{svc.title}</h3>
                <p className="text-xs text-gray-500 mt-0.5">
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
                    className="border-gray-200 text-amber-600 hover:bg-amber-50 text-xs font-bold"
                  >
                    Pause Listing
                  </Button>
                ) : (
                  <Button
                    size="sm"
                    disabled={actionLoading}
                    onClick={() => handleModerate(svc.id, 'published')}
                    className="bg-emerald-600 text-white hover:bg-emerald-700 text-xs font-bold"
                  >
                    Publish Listing
                  </Button>
                )}
                <Link href={`/services/${svc.id}`}>
                  <Button size="sm" variant="ghost" className="text-xs">
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
              className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 rounded-2xl border border-border bg-white p-6 shadow-sm"
            >
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-xs font-bold text-gray-400">Order #{ord.id.slice(-6)}</span>
                  <Badge variant="secondary" className="text-[10px] font-bold uppercase rounded-full">
                    {ord.status.replace('_', ' ')}
                  </Badge>
                </div>
                <h3 className="font-bold text-gray-900">{ord.service?.title ?? 'Student Service'}</h3>
                <p className="text-xs text-gray-500 mt-0.5">
                  Amount: ₹{ord.price} • Escrow: <strong className="text-emerald-700">{ord.payment_status}</strong>
                </p>
              </div>
              <Link href={`/orders/${ord.id}`}>
                <Button size="sm" variant="outline" className="text-xs font-bold">
                  Inspect Escrow
                </Button>
              </Link>
            </div>
          ))}
        </div>
      )}

      {/* TAB 5: Review Moderation & Reputation Integrity */}
      {activeTab === 'reviews' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-border shadow-sm">
            <div>
              <h3 className="text-sm font-bold text-gray-900 flex items-center gap-2">
                <Flag className="h-4 w-4 text-[#004ac6]" />
                Community Reported Reviews & Reputation Governance
              </h3>
              <p className="text-xs text-gray-500 mt-1">
                Uphold marketplace integrity. Hiding an abusive or fraudulent review immediately recalculates both the service rating and the seller’s aggregate reputation scores.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="text-xs font-semibold py-1 px-3">
                {reportedReviews.filter((r) => !r.review?.is_hidden).length} Active Reports
              </Badge>
              <Button
                size="sm"
                variant="outline"
                onClick={loadData}
                disabled={actionLoading}
                className="text-xs font-bold rounded-xl"
              >
                <RefreshCw className="h-3 w-3 mr-1.5" />
                Refresh
              </Button>
            </div>
          </div>

          {reportedReviews.length === 0 ? (
            <div className="text-center py-12 bg-white rounded-2xl border border-border p-8">
              <CheckCircle2 className="h-10 w-10 text-emerald-500 mx-auto mb-3" />
              <h4 className="text-sm font-bold text-gray-900">Zero Reported Reviews</h4>
              <p className="text-xs text-gray-500 mt-1 max-w-sm mx-auto">
                No peer reviews have been flagged by the community. All public seller ratings remain healthy and unmoderated.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {reportedReviews.map((report) => {
                const rev = report.review;
                const isHidden = rev?.is_hidden ?? false;
                const stars = rev?.rating || 0;

                return (
                  <div
                    key={report.id}
                    className={`rounded-2xl border p-6 bg-white shadow-sm transition-all ${
                      isHidden ? 'border-amber-200 bg-amber-50/20' : 'border-border'
                    }`}
                  >
                    <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                      {/* Left: Report & Review Details */}
                      <div className="space-y-3 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <Badge
                            variant="secondary"
                            className={`text-[10px] font-bold uppercase rounded-full ${
                              report.status === 'resolved'
                                ? 'bg-emerald-50 text-emerald-700'
                                : report.status === 'dismissed'
                                ? 'bg-gray-100 text-gray-600'
                                : 'bg-red-50 text-red-700'
                            }`}
                          >
                            Report: {report.status}
                          </Badge>

                          {isHidden ? (
                            <Badge className="bg-amber-100 text-amber-800 border-amber-300 text-[10px] font-bold">
                              <EyeOff className="h-3 w-3 mr-1" />
                              Hidden from Ratings
                            </Badge>
                          ) : (
                            <Badge className="bg-emerald-100 text-emerald-800 border-emerald-300 text-[10px] font-bold">
                              <Eye className="h-3 w-3 mr-1" />
                              Active & Factored in Score
                            </Badge>
                          )}

                          <span className="text-[11px] text-gray-400">
                            Reported on {new Date(report.created_at).toLocaleDateString('en-IN', {
                              month: 'short',
                              day: 'numeric',
                              year: 'numeric',
                            })}
                          </span>
                        </div>

                        {/* Report Reason */}
                        <div className="rounded-xl bg-red-50/60 border border-red-100 p-3 text-xs text-red-900">
                          <span className="font-bold">Community Flag Reason:</span> {report.reason}
                          {report.reporter && (
                            <div className="text-[11px] text-red-700 mt-1">
                              Flagged by: <strong>{report.reporter.full_name || report.reporter.email}</strong>
                            </div>
                          )}
                        </div>

                        {/* Target Review Content */}
                        <div className="rounded-xl bg-gray-50 border border-gray-200 p-4 space-y-2">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-1.5">
                              {[1, 2, 3, 4, 5].map((s) => (
                                <Star
                                  key={s}
                                  className={`h-4 w-4 ${
                                    s <= stars
                                      ? 'text-amber-400 fill-amber-400'
                                      : 'text-gray-300'
                                  }`}
                                />
                              ))}
                              <span className="text-xs font-bold text-gray-800 ml-1">
                                {stars} / 5 Stars
                              </span>
                            </div>
                            {rev?.service && (
                              <Link
                                href={`/services/${rev.service_id}`}
                                className="text-xs font-semibold text-[#004ac6] hover:underline flex items-center gap-1"
                              >
                                {rev.service.title}
                                <ExternalLink className="h-3 w-3" />
                              </Link>
                            )}
                          </div>

                          <p className="text-xs text-gray-700 italic">
                            "{rev?.comment || '(No written comment)'}"
                          </p>

                          <div className="flex items-center gap-2 text-[11px] text-gray-400 pt-1 border-t border-gray-200/60">
                            <span>Review ID: <code className="font-mono">{report.review_id.slice(0, 8)}</code></span>
                            {rev?.reviewer && (
                              <span>• Reviewer: <strong>{rev.reviewer.full_name || rev.reviewer.email}</strong></span>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Right: Moderation Actions */}
                      <div className="flex sm:flex-col gap-2 shrink-0">
                        {!isHidden ? (
                          <Button
                            size="sm"
                            variant="destructive"
                            disabled={actionLoading}
                            onClick={() => handleModerateReview(report.review_id, 'hide')}
                            className="text-xs font-bold rounded-xl gap-1.5"
                          >
                            <EyeOff className="h-3.5 w-3.5" />
                            Hide Review
                          </Button>
                        ) : (
                          <Button
                            size="sm"
                            disabled={actionLoading}
                            onClick={() => handleModerateReview(report.review_id, 'restore')}
                            className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl gap-1.5"
                          >
                            <Eye className="h-3.5 w-3.5" />
                            Restore Review
                          </Button>
                        )}

                        {report.status === 'pending' && (
                          <Button
                            size="sm"
                            variant="outline"
                            disabled={actionLoading}
                            onClick={() => handleModerateReview(report.review_id, 'dismiss')}
                            className="text-xs font-bold rounded-xl border-gray-300 text-gray-700 hover:bg-gray-100"
                          >
                            Dismiss Report
                          </Button>
                        )}

                        {rev?.service_id && (
                          <Link href={`/services/${rev.service_id}`}>
                            <Button
                              size="sm"
                              variant="ghost"
                              className="text-xs font-bold rounded-xl text-gray-600 hover:text-gray-900 w-full"
                            >
                              <ExternalLink className="h-3.5 w-3.5 mr-1" />
                              View Service
                            </Button>
                          </Link>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* TAB 6: Platform Governance Audit Trail */}
      {activeTab === 'audit' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between bg-white p-4 rounded-2xl border border-border shadow-sm">
            <div>
              <h3 className="text-sm font-bold text-gray-900 flex items-center gap-2">
                <History className="h-4 w-4 text-[#004ac6]" />
                Platform Governance Audit Trail
              </h3>
              <p className="text-xs text-gray-500 mt-0.5">
                Cryptographically verifiable, immutable records of all administrative actions and role updates.
              </p>
            </div>
            <Button
              size="sm"
              variant="outline"
              onClick={loadData}
              disabled={actionLoading}
              className="text-xs font-bold rounded-xl"
            >
              <RefreshCw className="h-3 w-3 mr-1.5" />
              Refresh Log
            </Button>
          </div>

          {auditLogs.length === 0 ? (
            <p className="text-xs text-gray-500 bg-white p-8 rounded-2xl border text-center">
              No administrative audit events recorded yet.
            </p>
          ) : (
            <div className="space-y-2.5">
              {auditLogs.map((log) => {
                const isApproved = log.action.includes('approved') || log.action.includes('reinstate');
                const isRejected = log.action.includes('rejected') || log.action.includes('suspend');
                const isBootstrap = log.action.includes('bootstrap') || log.action.includes('grant_admin');

                return (
                  <div
                    key={log.id}
                    className="rounded-2xl border border-border bg-white p-4 shadow-sm hover:shadow transition-shadow"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <Badge
                          variant="secondary"
                          className={`text-[10px] font-bold uppercase rounded-full ${
                            isApproved
                              ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                              : isRejected
                              ? 'bg-red-50 text-red-700 border-red-200'
                              : isBootstrap
                              ? 'bg-indigo-50 text-indigo-700 border-indigo-200'
                              : 'bg-amber-50 text-amber-700 border-amber-200'
                          }`}
                        >
                          {log.action.replace(/_/g, ' ')}
                        </Badge>
                        <span className="text-xs text-gray-700 font-semibold">
                          Target: {log.target_type} (<code>{log.target_id.slice(0, 16)}</code>)
                        </span>
                      </div>

                      <div className="flex items-center gap-3 text-[11px] text-gray-400">
                        {log.ip_address && (
                          <span>IP: <code className="font-mono text-gray-600">{log.ip_address}</code></span>
                        )}
                        <span>{new Date(log.created_at).toLocaleString('en-IN')}</span>
                      </div>
                    </div>

                    <div className="mt-2 text-xs text-gray-600 bg-gray-50 p-2.5 rounded-xl border border-gray-100 font-mono text-[11px] overflow-x-auto">
                      {log.details ? JSON.stringify(log.details, null, 2) : 'No extra details recorded.'}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Rejection Modal */}
      {rejectingItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl space-y-4 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-red-600 font-bold text-base">
                <AlertTriangle className="h-5 w-5" />
                Reject Verification Request
              </div>
              <button
                onClick={() => setRejectingItem(null)}
                className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <p className="text-xs text-gray-600">
              Provide specific feedback explaining why <strong>{rejectingItem.full_name}</strong>'s verification cannot be approved. This note will be delivered to their email and shown on their resubmission screen.
            </p>

            <div className="space-y-1.5">
              <Label htmlFor="rejectionReason" className="text-xs font-semibold text-gray-700">
                Reason / Action Required for Student:
              </Label>
              <textarea
                id="rejectionReason"
                rows={4}
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                className="w-full rounded-xl border border-gray-300 p-3 text-xs focus:border-[#004ac6] focus:outline-none"
                placeholder="e.g. Document image is blurred; please upload a clear scan of your college ID."
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <Button
                variant="outline"
                disabled={actionLoading}
                onClick={() => setRejectingItem(null)}
                className="text-xs font-bold text-gray-600"
              >
                Cancel
              </Button>
              <Button
                disabled={actionLoading}
                onClick={handleRejectSubmit}
                className="bg-red-600 text-white hover:bg-red-700 font-bold text-xs"
              >
                {actionLoading ? 'Recording...' : 'Confirm Rejection & Send Email'}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Suspend User Modal */}
      {suspendingUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl space-y-4 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-red-600 font-bold text-base">
                <AlertTriangle className="h-5 w-5" />
                Suspend Student Account
              </div>
              <button
                onClick={() => setSuspendingUser(null)}
                className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <p className="text-xs text-gray-600">
              Are you sure you want to suspend <strong>{suspendingUser.full_name}</strong> ({suspendingUser.email})?
              Their marketplace permissions will be revoked and their services paused until reinstated.
            </p>

            <div className="space-y-1.5">
              <Label htmlFor="suspensionReason" className="text-xs font-semibold text-gray-700">
                Reason for Suspension:
              </Label>
              <textarea
                id="suspensionReason"
                rows={3}
                value={suspensionReason}
                onChange={(e) => setSuspensionReason(e.target.value)}
                className="w-full rounded-xl border border-gray-300 p-3 text-xs focus:border-[#004ac6] focus:outline-none"
                placeholder="Reason will be logged in the audit trail..."
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <Button
                variant="outline"
                disabled={actionLoading}
                onClick={() => setSuspendingUser(null)}
                className="text-xs font-bold text-gray-600"
              >
                Cancel
              </Button>
              <Button
                disabled={actionLoading}
                onClick={handleSuspendUserSubmit}
                className="bg-red-600 text-white hover:bg-red-700 font-bold text-xs"
              >
                {actionLoading ? 'Suspending...' : 'Confirm Suspension'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
