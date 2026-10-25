'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowLeft,
  Calendar,
  CheckCircle2,
  Clock,
  Download,
  FileText,
  MessageSquare,
  ShieldCheck,
  Star,
  User,
  AlertCircle,
  Sparkles,
  MapPin,
  XCircle,
  Video,
  ArrowUpRight,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import { useAuth } from '@/lib/auth/auth-context';
import { fetchOrderById, transitionOrderStatus } from '@/lib/services/orders';
import { VerifiedBadge } from '@/components/trust/verified-badge';
import { ReviewModal } from '@/components/reviews/review-modal';
import { OrderChat } from '@/components/orders/order-chat';
import { Reveal } from '@/components/motion/reveal';
import { editorialEase } from '@/components/motion/motion-tokens';
import { Order, OrderStatus } from '@/types';

const STATUS_STEPS: { status: OrderStatus; label: string }[] = [
  { status: 'paid', label: 'Payment Held' },
  { status: 'accepted', label: 'Accepted' },
  { status: 'in_progress', label: 'In Progress' },
  { status: 'submitted', label: 'Delivered' },
  { status: 'completed', label: 'Completed' },
];

function getStepIndex(status: OrderStatus): number {
  switch (status) {
    case 'pending_payment':
      return -1;
    case 'paid':
    case 'seller_pending':
      return 0;
    case 'accepted':
      return 1;
    case 'in_progress':
    case 'revision_requested':
      return 2;
    case 'submitted':
      return 3;
    case 'completed':
      return 4;
    case 'cancelled':
    case 'rejected':
      return -2;
    default:
      return 0;
  }
}

export default function OrderDetailPage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const { session, isAdmin } = useAuth();
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);

  // Deliverable modal state
  const [deliverableModalOpen, setDeliverableModalOpen] = useState(false);
  const [deliverableNotes, setDeliverableNotes] = useState('');
  const [deliverableUrl, setDeliverableUrl] = useState('');

  // Revision modal state
  const [revisionModalOpen, setRevisionModalOpen] = useState(false);
  const [revisionNotes, setRevisionNotes] = useState('');

  // Reject modal state
  const [rejectModalOpen, setRejectModalOpen] = useState(false);
  const [rejectReason, setRejectReason] = useState('');

  // Review modal state
  const [reviewModalOpen, setReviewModalOpen] = useState(false);

  // Action loading state
  const [actionLoading, setActionLoading] = useState(false);

  const loadOrder = useCallback(async () => {
    try {
      const data = await fetchOrderById(params.id);
      setOrder(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [params.id]);

  useEffect(() => {
    loadOrder();
  }, [loadOrder]);

  if (loading) {
    return (
      <div className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8 py-16 animate-pulse">
        <div className="h-4 w-32 bg-neutral-200 rounded mb-8" />
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          <div className="lg:col-span-8 h-96 bg-neutral-200/60 rounded-3xl" />
          <div className="lg:col-span-4 h-96 bg-neutral-200/50 rounded-3xl" />
        </div>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="mx-auto w-full max-w-3xl px-4 sm:px-6 py-20">
        <div className="flex flex-col items-center justify-center rounded-3xl border border-dashed border-neutral-300 bg-white p-12 text-center shadow-sm">
          <p className="text-xl font-bold text-neutral-900 tracking-tight">Order Record Not Found</p>
          <p className="mt-2 text-xs text-neutral-500 max-w-sm">
            This order may have been removed or does not exist in the platform registry.
          </p>
          <Link href="/orders">
            <Button className="mt-6 gap-2 bg-[#004ac6] text-white hover:bg-[#003da6] rounded-full text-xs font-semibold px-6">
              <ArrowLeft className="h-3.5 w-3.5" />
              Return to Orders
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  // Current viewer's role and authorization check
  const currentUserId = session?.user?.id || '';
  const isSeller = currentUserId === order.seller_id;
  const isBuyer = currentUserId === order.buyer_id;

  // Strict participant access boundary: Non-participants cannot view order details
  if (!isBuyer && !isSeller && !isAdmin) {
    return (
      <div className="mx-auto w-full max-w-xl px-4 sm:px-6 py-20 text-center">
        <div className="rounded-3xl border border-red-200 bg-white p-10 shadow-sm">
          <AlertCircle className="mx-auto h-12 w-12 text-red-500 mb-3" />
          <h2 className="text-lg font-bold text-neutral-900">Access Restricted</h2>
          <p className="mt-2 text-xs text-neutral-600 leading-relaxed">
            You are not authorized to view this order, its deliverables, or communication history. Only the participating buyer, seller, or platform administrators may view this record.
          </p>
          <Link href="/orders">
            <Button className="mt-6 bg-[#004ac6] text-white hover:bg-[#003da6] text-xs font-semibold rounded-full px-6">
              Return to Orders
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  const currentStep = getStepIndex(order.status);
  const isCancelled = order.status === 'cancelled';
  const isRejected = order.status === 'rejected';
  const isConsultation = order.order_type === 'consultation' || Boolean(order.consultation_details);
  const revisionsCount = order.revisions_count ?? 0;
  const maxRevisions = order.max_revisions ?? 2;
  const canRequestMoreRevisions = revisionsCount < maxRevisions;
  const isOverdue = new Date(order.due_date).getTime() < Date.now();

  async function handleAction(
    action: 'accept' | 'reject' | 'start_work' | 'submit_work' | 'request_revision' | 'complete' | 'cancel',
    payload?: { notes?: string; fileUrl?: string; reason?: string }
  ) {
    setActionLoading(true);
    try {
      const updated = await transitionOrderStatus(order!.id, action, payload);
      setOrder(updated);
      toast.success(
        action === 'accept'
          ? 'Order accepted!'
          : action === 'reject'
          ? 'Order request declined & refunded.'
          : action === 'start_work'
          ? 'Work status updated to In Progress!'
          : action === 'submit_work'
          ? 'Deliverables submitted for buyer review!'
          : action === 'request_revision'
          ? 'Revision requested from seller.'
          : action === 'complete'
          ? 'Order marked as completed & payment released!'
          : 'Order cancelled.'
      );
      setDeliverableModalOpen(false);
      setRevisionModalOpen(false);
      setRejectModalOpen(false);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Action failed';
      toast.error(msg);
    } finally {
      setActionLoading(false);
    }
  }

  return (
    <div className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8 py-10 sm:py-14">
      {/* Top Header / Breadcrumbs */}
      <Reveal>
        <div className="mb-8 flex flex-wrap items-center justify-between gap-4">
          <Link
            href="/orders"
            className="group inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-neutral-500 hover:text-neutral-900 transition-colors"
          >
            <ArrowLeft className="h-3.5 w-3.5 transition-transform group-hover:-translate-x-1" />
            Back to Orders
          </Link>
          <div className="flex items-center gap-3">
            <span className="rounded-full bg-neutral-100 px-3 py-1 text-xs font-mono font-semibold text-neutral-700 border border-neutral-200">
              {isConsultation ? 'Consultation' : 'Gig'} #{order.id.slice(-6).toUpperCase()}
            </span>
            <span className="text-xs text-neutral-400">
              Placed {new Date(order.created_at).toLocaleDateString('en-IN', {
                day: 'numeric',
                month: 'short',
                year: 'numeric',
              })}
            </span>
          </div>
        </div>
      </Reveal>

      {/* Main Grid */}
      <div className="grid grid-cols-1 gap-10 lg:grid-cols-12 items-start">
        {/* Left Column: Stepper, Workflows & Details (8 cols) */}
        <div className="lg:col-span-8 space-y-8">
          {/* Status Stepper Header */}
          <Reveal>
            <div className="rounded-3xl border border-neutral-200/80 bg-white p-6 sm:p-8 shadow-sm">
              <div className="flex flex-wrap items-start justify-between gap-4 mb-8">
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-neutral-400">
                    {isSeller ? 'You are the Seller' : 'You are the Buyer'} · {isConsultation ? 'Scheduled Consultation' : 'Fixed-Scope Gig'}
                  </span>
                  <h1 className="mt-1 text-2xl sm:text-3xl font-black text-neutral-900 tracking-tight">
                    {order.service?.title ?? order.service_snapshot?.title ?? 'Service Order'}
                  </h1>
                </div>
                <div className="text-right">
                  <span className="text-3xl font-black text-neutral-900 tracking-tight block">
                    ₹{order.price.toLocaleString('en-IN')}
                  </span>
                  <span className="inline-flex items-center gap-1.5 text-xs text-emerald-600 font-semibold mt-1">
                    <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                    {order.payment_status === 'paid' ? 'Escrow Secured' : order.payment_status}
                  </span>
                </div>
              </div>

              {/* Stepper Display */}
              {!isCancelled && !isRejected ? (
                <div className="pt-2 pb-2">
                  <div className="grid grid-cols-5 gap-2 text-center">
                    {STATUS_STEPS.map((s, idx) => {
                      const isDone = currentStep >= idx;
                      const isCurrent = currentStep === idx;
                      return (
                        <div key={s.status} className="flex flex-col items-center">
                          <div
                            className={`flex h-9 w-9 items-center justify-center rounded-full text-xs font-bold transition-all ${
                              isDone
                                ? 'bg-neutral-900 text-white shadow-sm'
                                : isCurrent
                                ? 'border-2 border-[#004ac6] bg-[#004ac6]/10 text-[#004ac6]'
                                : 'border border-neutral-200 bg-neutral-50 text-neutral-400'
                            }`}
                          >
                            {isDone ? '✓' : idx + 1}
                          </div>
                          <span
                            className={`mt-2 text-[11px] font-semibold tracking-tight ${
                              isCurrent
                                ? 'text-[#004ac6]'
                                : isDone
                                ? 'text-neutral-900'
                                : 'text-neutral-400'
                            }`}
                          >
                            {s.label}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ) : isRejected ? (
                <div className="rounded-2xl border border-red-200 bg-red-50/60 p-4 text-sm text-red-800 flex items-center gap-3">
                  <XCircle className="h-5 w-5 shrink-0 text-red-600" />
                  <div>
                    <p className="font-bold">Request Declined by Provider</p>
                    <p className="text-xs text-red-700 mt-0.5">
                      {order.cancellation_reason || 'The provider is unavailable for this request. Escrow hold has been refunded.'}
                    </p>
                  </div>
                </div>
              ) : (
                <div className="rounded-2xl border border-red-200 bg-red-50/60 p-4 text-sm text-red-800 flex items-center gap-3">
                  <AlertCircle className="h-5 w-5 shrink-0 text-red-600" />
                  <div>
                    <p className="font-bold">Order Cancelled & Escrow Refunded</p>
                    <p className="text-xs text-red-700 mt-0.5">
                      {order.cancellation_reason || 'Cancelled by participant.'}
                    </p>
                  </div>
                </div>
              )}
            </div>
          </Reveal>

          {/* Consultation Session Details */}
          {isConsultation && order.consultation_details && (
            <Reveal>
              <div className="rounded-3xl border border-neutral-200 bg-neutral-50/60 p-6 sm:p-7 shadow-sm space-y-3">
                <div className="flex items-center justify-between">
                  <h2 className="text-xs font-bold uppercase tracking-wider text-neutral-700 flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-[#004ac6]" />
                    Scheduled Consultation Session
                  </h2>
                  <span className="rounded-full bg-white border border-neutral-200 px-3 py-1 text-[11px] font-semibold text-neutral-800">
                    Appointment Confirmed
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 text-xs">
                  <div>
                    <span className="text-neutral-400 block uppercase text-[10px] font-bold tracking-wider">
                      Date & Slot
                    </span>
                    <span className="font-black text-neutral-900 text-sm mt-0.5 block">
                      {order.consultation_details.booking_date} at {order.consultation_details.start_time} - {order.consultation_details.end_time}
                    </span>
                  </div>

                  <div>
                    <span className="text-neutral-400 block uppercase text-[10px] font-bold tracking-wider">
                      Meeting Channel
                    </span>
                    <span className="font-semibold text-neutral-900 flex items-center gap-1.5 mt-0.5 text-xs">
                      <Video className="h-3.5 w-3.5 text-[#004ac6]" />
                      {order.consultation_details.location || 'Online Video Meeting (Google Meet)'}
                    </span>
                  </div>
                </div>

                {order.consultation_details.note && (
                  <div className="mt-3 rounded-2xl bg-white p-3.5 border border-neutral-200/70 text-xs text-neutral-700">
                    <span className="font-bold text-neutral-900 block mb-1">Session Goals & Topic:</span>
                    {order.consultation_details.note}
                  </div>
                )}
              </div>
            </Reveal>
          )}

          {/* Required Action Card */}
          <Reveal>
            <div className="rounded-3xl border border-neutral-200/80 bg-white p-6 sm:p-8 shadow-sm">
              <span className="text-[10px] font-bold uppercase tracking-wider text-neutral-400 mb-4 block">
                Workflow Status & Action
              </span>

              {/* SELLER PENDING ACTIONS */}
              {order.status === 'seller_pending' && (
                <div className="space-y-4">
                  <div className="rounded-2xl border border-amber-200 bg-amber-50/60 p-4 text-xs text-amber-900 flex items-start gap-3">
                    <Clock className="h-5 w-5 shrink-0 text-amber-700" />
                    <div>
                      <p className="font-bold">Awaiting Seller Review & Acceptance</p>
                      <p className="mt-0.5 text-amber-800">
                        Payment is held safely in escrow. Review requirements and confirm commitment to begin work.
                      </p>
                    </div>
                  </div>

                  {isSeller && (
                    <div className="flex flex-wrap gap-3 pt-1">
                      <Button
                        onClick={() => handleAction('accept')}
                        disabled={actionLoading}
                        className="bg-neutral-900 text-white hover:bg-[#004ac6] text-xs font-semibold rounded-full px-6 h-10 shadow-sm"
                      >
                        ✓ Accept Order & Begin
                      </Button>
                      <Button
                        variant="outline"
                        onClick={() => setRejectModalOpen(true)}
                        disabled={actionLoading}
                        className="border-neutral-200 text-red-600 hover:bg-red-50 text-xs font-semibold rounded-full px-5 h-10"
                      >
                        Decline Request
                      </Button>
                    </div>
                  )}

                  {isBuyer && (
                    <div className="flex items-center justify-between gap-3 pt-2">
                      <p className="text-xs text-neutral-500 italic">
                        Awaiting {order.seller?.full_name} to review and accept your booking.
                      </p>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleAction('cancel', { reason: 'Cancelled by buyer before seller acceptance.' })}
                        disabled={actionLoading}
                        className="text-xs text-red-600 hover:bg-red-50 border-neutral-200 rounded-full px-4"
                      >
                        Cancel Request
                      </Button>
                    </div>
                  )}
                </div>
              )}

              {/* ACCEPTED / IN PROGRESS */}
              {(order.status === 'accepted' || order.status === 'in_progress' || order.status === 'revision_requested') && (
                <div className="space-y-4">
                  {order.status === 'revision_requested' && (
                    <div className="rounded-2xl border border-purple-200 bg-purple-50/60 p-4 text-xs text-purple-900">
                      <p className="font-bold flex items-center gap-1.5">
                        <MessageSquare className="h-4 w-4 text-purple-700" />
                        Revision Requested by Buyer (#{revisionsCount} of {maxRevisions}):
                      </p>
                      <p className="mt-1 text-purple-800 italic">&ldquo;{order.revision_notes}&rdquo;</p>
                    </div>
                  )}

                  {isSeller ? (
                    <div className="space-y-4">
                      <p className="text-xs text-neutral-600">
                        {isConsultation
                          ? 'Prepare for the scheduled consultation session. After meeting, conclude and submit any session notes.'
                          : 'You are currently working on this service. Once finished, submit deliverables for inspection.'}
                      </p>
                      <div className="flex flex-wrap gap-3">
                        {order.status === 'accepted' && (
                          <Button
                            onClick={() => handleAction('start_work')}
                            disabled={actionLoading}
                            className="bg-neutral-900 text-white hover:bg-neutral-800 text-xs font-semibold rounded-full px-5 h-10"
                          >
                            Mark In Progress
                          </Button>
                        )}
                        <Button
                          onClick={() => setDeliverableModalOpen(true)}
                          className="bg-[#004ac6] text-white hover:bg-[#003da6] text-xs font-semibold rounded-full px-6 h-10 shadow-sm"
                        >
                          {isConsultation ? 'Conclude & Submit Session Summary →' : 'Submit Final Deliverables →'}
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      <p className="text-xs text-neutral-500">
                        {order.seller?.full_name} is actively working on your request. Estimated turnaround within {order.delivery_days} days.
                      </p>
                      {isOverdue && (
                        <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-xs text-red-800 flex items-center justify-between">
                          <span>The agreed delivery date has passed.</span>
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => handleAction('cancel', { reason: 'Delivery deadline missed by provider.' })}
                            disabled={actionLoading}
                            className="h-8 text-xs font-semibold rounded-full px-4"
                          >
                            Cancel for Full Refund
                          </Button>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* SUBMITTED (Awaiting Buyer Acceptance) */}
              {order.status === 'submitted' && (
                <div className="space-y-4">
                  <div className="rounded-2xl border border-emerald-200 bg-emerald-50/60 p-4 text-xs text-emerald-900">
                    <p className="font-bold flex items-center gap-1.5">
                      <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                      Deliverables Submitted by Seller
                    </p>
                    <p className="mt-1 text-emerald-800">
                      {order.deliverables?.notes ?? 'Project deliverables ready for inspection.'}
                    </p>
                    {order.deliverables?.file_url && (
                      <a
                        href={order.deliverables.file_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="mt-3 inline-flex items-center gap-1.5 font-bold text-[#004ac6] hover:underline"
                      >
                        <Download className="h-4 w-4" />
                        View Deliverable Link / Files
                      </a>
                    )}
                  </div>

                  {isBuyer && (
                    <div className="space-y-3 pt-2">
                      <div className="flex flex-wrap gap-3">
                        <Button
                          onClick={() => handleAction('complete')}
                          disabled={actionLoading}
                          className="bg-emerald-600 text-white hover:bg-emerald-700 text-xs font-bold rounded-full px-6 h-10 shadow-sm"
                        >
                          ✓ Approve & Release ₹{order.price.toLocaleString('en-IN')} Escrow
                        </Button>

                        <Button
                          variant="outline"
                          onClick={() => setRevisionModalOpen(true)}
                          disabled={!canRequestMoreRevisions || actionLoading}
                          className="border-neutral-200 text-neutral-800 hover:bg-neutral-50 text-xs font-semibold rounded-full px-5 h-10"
                        >
                          Request Revision ({revisionsCount}/{maxRevisions} Used)
                        </Button>
                      </div>

                      {!canRequestMoreRevisions && (
                        <p className="text-[11px] text-amber-700">
                          Maximum revision limit ({maxRevisions}) reached for this contract.
                        </p>
                      )}
                    </div>
                  )}
                  {isSeller && (
                    <p className="text-xs text-neutral-500 italic">
                      Deliverables sent to {order.buyer?.full_name}. Awaiting buyer inspection and release.
                    </p>
                  )}
                </div>
              )}

              {/* COMPLETED */}
              {order.status === 'completed' && (
                <div className="space-y-4">
                  <div className="rounded-2xl border border-emerald-200 bg-emerald-50/60 p-4 text-xs text-emerald-900 flex items-center justify-between">
                    <div>
                      <p className="font-bold">Transaction Completed Successfully</p>
                      <p className="text-emerald-800 mt-0.5">
                        Deliverables approved. ₹{order.price.toLocaleString('en-IN')} escrow has been released to the seller.
                      </p>
                    </div>
                    <CheckCircle2 className="h-6 w-6 text-emerald-600 shrink-0" />
                  </div>

                  {isBuyer && !order.review && (
                    <Button
                      onClick={() => setReviewModalOpen(true)}
                      className="gap-2 bg-amber-500 text-white hover:bg-amber-600 text-xs font-bold rounded-full px-6 h-10 shadow-sm"
                    >
                      <Star className="h-4 w-4 fill-white" />
                      Leave Rating & Review for {order.seller?.full_name}
                    </Button>
                  )}

                  {order.review && (
                    <div className="rounded-2xl border border-neutral-200 bg-neutral-50 p-4 text-xs">
                      <p className="font-bold text-neutral-900 flex items-center gap-1.5">
                        <Star className="h-4 w-4 fill-amber-400 text-amber-400" />
                        Review Submitted: {order.review.rating} Stars
                      </p>
                      <p className="mt-1 text-neutral-600 italic">&ldquo;{order.review.comment}&rdquo;</p>
                    </div>
                  )}
                </div>
              )}
            </div>
          </Reveal>

          {/* Project Requirements & Instructions */}
          <Reveal>
            <div className="rounded-3xl border border-neutral-200/80 bg-white p-6 sm:p-8 shadow-sm">
              <span className="text-[10px] font-bold uppercase tracking-wider text-neutral-400 mb-3 block">
                Project Scope & Deliverable Brief
              </span>
              <p className="whitespace-pre-wrap text-xs text-neutral-700 leading-relaxed bg-neutral-50 p-4 rounded-2xl border border-neutral-100">
                {order.requirements || 'No extra requirements specified.'}
              </p>
            </div>
          </Reveal>

          {/* Real-time Order Chat Workspace */}
          <Reveal>
            <OrderChat
              orderId={order.id}
              currentUserId={currentUserId}
              currentUserName={session?.user?.user_metadata?.full_name || session?.user?.email}
              recipient={isSeller ? order.buyer : order.seller}
              orderTitle={order.service?.title ?? order.service_snapshot?.title}
            />
          </Reveal>

          {/* Audit Timeline */}
          <Reveal>
            <div className="rounded-3xl border border-neutral-200/80 bg-white p-6 sm:p-8 shadow-sm">
              <span className="text-[10px] font-bold uppercase tracking-wider text-neutral-400 mb-4 block">
                Contract Audit Trail
              </span>
              <div className="space-y-4">
                {order.timeline.map((event, idx) => (
                  <div key={idx} className="flex items-start gap-3 text-xs">
                    <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-neutral-100 text-neutral-700">
                      <Clock className="h-3.5 w-3.5" />
                    </div>
                    <div className="flex-1">
                      <p className="font-bold text-neutral-900">{event.title}</p>
                      <p className="text-neutral-600 mt-0.5">{event.description}</p>
                      <span className="text-[10px] text-neutral-400 mt-1 block">
                        {new Date(event.timestamp).toLocaleString('en-IN', {
                          day: 'numeric',
                          month: 'short',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </Reveal>
        </div>

        {/* Right Column: Counterparty & Escrow Guarantee (4 cols) */}
        <div className="lg:col-span-4 space-y-6">
          {/* Party Profile Card */}
          <Reveal>
            <div className="rounded-3xl border border-neutral-200/80 bg-white p-6 shadow-sm">
              <span className="text-[10px] font-bold uppercase tracking-wider text-neutral-400 mb-4 block">
                {isSeller ? 'Client / Buyer' : 'Service Provider'}
              </span>
              {(() => {
                const party = isSeller ? order.buyer : order.seller;
                if (!party) return <p className="text-xs text-neutral-400">User record not found</p>;
                const initials = party.full_name
                  ? party.full_name
                      .split(' ')
                      .map((n) => n[0])
                      .slice(0, 2)
                      .join('')
                      .toUpperCase()
                  : '?';

                return (
                  <div className="space-y-4">
                    <div className="flex items-center gap-3">
                      <Avatar className="h-12 w-12 border border-neutral-200">
                        {party.avatar_url && <AvatarImage src={party.avatar_url} />}
                        <AvatarFallback className="text-sm font-black text-[#004ac6] bg-neutral-100">
                          {initials}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="text-base font-bold text-neutral-900">{party.full_name}</p>
                        <p className="text-xs text-neutral-500">{party.college}</p>
                      </div>
                    </div>

                    <VerifiedBadge college={party.college} />

                    {party.bio && (
                      <p className="text-xs text-neutral-600 line-clamp-3 bg-neutral-50 p-3 rounded-2xl border border-neutral-100">
                        {party.bio}
                      </p>
                    )}

                    {!isSeller && (
                      <Link
                        href={`/profile/${party.user_id}`}
                        className="group flex items-center justify-center gap-1.5 text-xs font-semibold text-[#004ac6] hover:underline pt-2 border-t border-neutral-100"
                      >
                        <span>View Campus Profile</span>
                        <ArrowUpRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
                      </Link>
                    )}
                  </div>
                );
              })()}
            </div>
          </Reveal>

          {/* Escrow Guarantee Box */}
          <Reveal>
            <div className="rounded-3xl border border-emerald-200/80 bg-emerald-50/40 p-6 text-xs text-emerald-950 space-y-3">
              <div className="flex items-center gap-2 font-bold text-emerald-900">
                <ShieldCheck className="h-5 w-5 text-emerald-600" />
                SkillBridge Student Escrow
              </div>
              <p className="text-emerald-900/80 leading-relaxed text-[11px]">
                Payments are held securely in platform escrow. The provider is only paid once deliverables or consultation sessions are completed and approved.
              </p>
              <div className="border-t border-emerald-200/60 pt-3 text-[11px] text-emerald-800 space-y-1.5 font-medium">
                <div>✓ {maxRevisions} revisions supported before completion</div>
                <div>✓ Full refund guarantee if order is declined or cancelled</div>
              </div>
            </div>
          </Reveal>
        </div>
      </div>

      {/* Deliverable Modal (For Seller) */}
      <AnimatePresence>
        {deliverableModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.96 }}
              transition={{ duration: 0.2, ease: editorialEase }}
              className="w-full max-w-md rounded-3xl border border-neutral-200 bg-white p-6 sm:p-8 shadow-2xl space-y-4"
            >
              <h3 className="text-lg font-bold text-neutral-900">
                {isConsultation ? 'Submit Session Notes & Summary' : 'Submit Completed Work'}
              </h3>
              <p className="text-xs text-neutral-500">
                {isConsultation
                  ? 'Attach meeting summary, action items, or resource links for your student peer.'
                  : 'Attach link to your files (Google Drive, GitHub repo, Figma link, etc.) and write delivery notes.'}
              </p>

              <div>
                <Label className="text-xs font-semibold text-neutral-700">Link to Work Files / Drive</Label>
                <Input
                  value={deliverableUrl}
                  onChange={(e) => setDeliverableUrl(e.target.value)}
                  placeholder="https://drive.google.com/..."
                  className="mt-1 text-xs rounded-xl"
                />
              </div>

              <div>
                <Label className="text-xs font-semibold text-neutral-700">Delivery Notes</Label>
                <Textarea
                  rows={3}
                  value={deliverableNotes}
                  onChange={(e) => setDeliverableNotes(e.target.value)}
                  placeholder="Briefly summarize what was completed..."
                  className="mt-1 resize-none text-xs rounded-xl"
                />
              </div>

              <div className="flex gap-3 pt-2">
                <Button
                  variant="outline"
                  onClick={() => setDeliverableModalOpen(false)}
                  className="flex-1 text-xs rounded-full h-10 font-semibold"
                >
                  Cancel
                </Button>
                <Button
                  onClick={() =>
                    handleAction('submit_work', {
                      notes: deliverableNotes,
                      fileUrl: deliverableUrl,
                    })
                  }
                  disabled={actionLoading}
                  className="flex-1 bg-emerald-600 text-white hover:bg-emerald-700 font-bold text-xs rounded-full h-10 shadow-sm"
                >
                  Send Deliverable
                </Button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Revision Modal (For Buyer) */}
      <AnimatePresence>
        {revisionModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.96 }}
              transition={{ duration: 0.2, ease: editorialEase }}
              className="w-full max-w-md rounded-3xl border border-neutral-200 bg-white p-6 sm:p-8 shadow-2xl space-y-4"
            >
              <h3 className="text-lg font-bold text-neutral-900">
                Request Revision ({revisionsCount + 1}/{maxRevisions})
              </h3>
              <p className="text-xs text-neutral-500">
                Explain clearly what needs adjustment or improvement before you can accept.
              </p>

              <div>
                <Label className="text-xs font-semibold text-neutral-700">Revision Details</Label>
                <Textarea
                  rows={4}
                  value={revisionNotes}
                  onChange={(e) => setRevisionNotes(e.target.value)}
                  placeholder="e.g. Please adjust the brand colors and update the typography hierarchy..."
                  className="mt-1 resize-none text-xs rounded-xl"
                />
              </div>

              <div className="flex gap-3 pt-2">
                <Button
                  variant="outline"
                  onClick={() => setRevisionModalOpen(false)}
                  className="flex-1 text-xs rounded-full h-10 font-semibold"
                >
                  Cancel
                </Button>
                <Button
                  onClick={() => handleAction('request_revision', { notes: revisionNotes })}
                  disabled={actionLoading || !revisionNotes.trim()}
                  className="flex-1 bg-purple-600 text-white hover:bg-purple-700 font-bold text-xs rounded-full h-10 shadow-sm"
                >
                  Send Request
                </Button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Reject Modal (For Seller) */}
      <AnimatePresence>
        {rejectModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.96 }}
              transition={{ duration: 0.2, ease: editorialEase }}
              className="w-full max-w-md rounded-3xl border border-neutral-200 bg-white p-6 sm:p-8 shadow-2xl space-y-4"
            >
              <h3 className="text-lg font-bold text-neutral-900">Decline Request</h3>
              <p className="text-xs text-neutral-500">
                Provide a brief explanation for declining this request. The client will be notified and their payment refunded.
              </p>

              <div>
                <Label className="text-xs font-semibold text-neutral-700">Reason for Declining</Label>
                <Textarea
                  rows={3}
                  value={rejectReason}
                  onChange={(e) => setRejectReason(e.target.value)}
                  placeholder="e.g. Current academic exam schedule conflict, unavailable during this window..."
                  className="mt-1 resize-none text-xs rounded-xl"
                />
              </div>

              <div className="flex gap-3 pt-2">
                <Button
                  variant="outline"
                  onClick={() => setRejectModalOpen(false)}
                  className="flex-1 text-xs rounded-full h-10 font-semibold"
                >
                  Back
                </Button>
                <Button
                  onClick={() => handleAction('reject', { reason: rejectReason.trim() })}
                  disabled={actionLoading}
                  className="flex-1 bg-red-600 text-white hover:bg-red-700 font-bold text-xs rounded-full h-10 shadow-sm"
                >
                  Decline & Refund
                </Button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Review Modal */}
      <ReviewModal
        order={order}
        reviewerId={currentUserId}
        open={reviewModalOpen}
        onClose={() => setReviewModalOpen(false)}
        onReviewed={loadOrder}
      />
    </div>
  );
}
