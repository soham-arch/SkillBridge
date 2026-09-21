'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
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
import { Order, OrderStatus } from '@/types';

const STATUS_STEPS: { status: OrderStatus; label: string }[] = [
  { status: 'paid', label: 'Paid in Escrow' },
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
      return -2;
    default:
      return 0;
  }
}

export default function OrderDetailPage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const { session } = useAuth();
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);

  // Deliverable modal state
  const [deliverableModalOpen, setDeliverableModalOpen] = useState(false);
  const [deliverableNotes, setDeliverableNotes] = useState('');
  const [deliverableUrl, setDeliverableUrl] = useState('');

  // Revision modal state
  const [revisionModalOpen, setRevisionModalOpen] = useState(false);
  const [revisionNotes, setRevisionNotes] = useState('');

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
      <div className="flex flex-1 items-center justify-center py-24">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-[#004ac6] border-t-transparent" />
      </div>
    );
  }

  if (!order) {
    return (
      <div className="mx-auto w-full max-w-screen-xl px-6 py-12">
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-gray-300 bg-white py-20 text-center">
          <p className="text-lg font-semibold text-gray-700">Order not found</p>
          <p className="mt-2 text-sm text-gray-500">This order may have been removed or does not exist.</p>
          <Link href="/orders">
            <Button className="mt-6 gap-2 bg-[#004ac6] text-white hover:bg-[#003b9e]">
              <ArrowLeft className="h-4 w-4" />
              Back to Orders
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  // Current viewer's role
  const currentUserId = session?.user?.id ?? '10000000-0000-0000-0000-000000000001';
  const isSeller = currentUserId === order.seller_id;
  const isBuyer = currentUserId === order.buyer_id;

  const currentStep = getStepIndex(order.status);
  const isCancelled = order.status === 'cancelled';

  async function handleAction(
    action: 'accept' | 'start_work' | 'submit_work' | 'request_revision' | 'complete' | 'cancel',
    payload?: { notes?: string; fileUrl?: string; reason?: string }
  ) {
    setActionLoading(true);
    try {
      const updated = await transitionOrderStatus(order!.id, action, payload);
      setOrder(updated);
      toast.success(
        action === 'accept'
          ? 'Order accepted!'
          : action === 'start_work'
          ? 'Work status updated to In Progress!'
          : action === 'submit_work'
          ? 'Deliverables submitted for buyer review!'
          : action === 'request_revision'
          ? 'Revision requested from seller.'
          : action === 'complete'
          ? 'Order marked as completed & Escrow payment released!'
          : 'Order cancelled.'
      );
      setDeliverableModalOpen(false);
      setRevisionModalOpen(false);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Action failed';
      toast.error(msg);
    } finally {
      setActionLoading(false);
    }
  }

  return (
    <div className="mx-auto w-full max-w-screen-xl px-6 py-12">
      {/* Breadcrumb / Top Bar */}
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <Link
          href="/orders"
          className="inline-flex items-center gap-2 text-sm font-medium text-gray-600 hover:text-[#004ac6]"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Orders
        </Link>
        <div className="flex items-center gap-3">
          <Badge
            variant="secondary"
            className="rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-[#004ac6]"
          >
            Order #{order.id.slice(-6).toUpperCase()}
          </Badge>
          <span className="text-xs text-gray-500">
            Placed on{' '}
            {new Date(order.created_at).toLocaleDateString('en-IN', {
              day: 'numeric',
              month: 'short',
              year: 'numeric',
            })}
          </span>
        </div>
      </div>

      {/* Main Grid */}
      <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
        {/* Left 2 Cols: Status Stepper & Deliverables & Timeline */}
        <div className="lg:col-span-2 space-y-6">
          {/* Status Stepper Header */}
          <div className="rounded-2xl border border-border bg-white p-6 sm:p-8 shadow-sm">
            <div className="flex flex-wrap items-start justify-between gap-4 mb-6">
              <div>
                <span className="text-xs font-semibold uppercase tracking-wider text-gray-400">
                  {isSeller ? 'You are the Seller' : 'You are the Buyer'}
                </span>
                <h1 className="mt-1 text-2xl font-bold text-gray-900">{order.service?.title}</h1>
              </div>
              <div className="text-right">
                <span className="text-2xl font-bold text-[#004ac6]">
                  ₹{order.price.toLocaleString('en-IN')}
                </span>
                <p className="text-xs text-emerald-600 font-medium">
                  {order.payment_status === 'paid' ? '● Escrow Secured' : '● ' + order.payment_status}
                </p>
              </div>
            </div>

            {/* Progress Stepper */}
            {!isCancelled ? (
              <div className="relative pt-4 pb-2">
                <div className="grid grid-cols-5 gap-2 text-center">
                  {STATUS_STEPS.map((s, idx) => {
                    const isDone = currentStep >= idx;
                    const isCurrent = currentStep === idx;
                    return (
                      <div key={s.status} className="flex flex-col items-center">
                        <div
                          className={`flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold transition-all ${
                            isDone
                              ? 'bg-emerald-600 text-white shadow-sm'
                              : isCurrent
                              ? 'border-2 border-[#004ac6] bg-[#f0f4ff] text-[#004ac6]'
                              : 'border-2 border-gray-200 bg-white text-gray-400'
                          }`}
                        >
                          {isDone ? '✓' : idx + 1}
                        </div>
                        <span
                          className={`mt-2 text-[11px] font-semibold ${
                            isCurrent
                              ? 'text-[#004ac6]'
                              : isDone
                              ? 'text-gray-900'
                              : 'text-gray-400'
                          }`}
                        >
                          {s.label}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            ) : (
              <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800 flex items-center gap-3">
                <AlertCircle className="h-5 w-5 shrink-0 text-red-600" />
                <div>
                  <p className="font-bold">Order Cancelled & Escrow Refunded</p>
                  <p className="text-xs text-red-700 mt-0.5">{order.cancellation_reason}</p>
                </div>
              </div>
            )}
          </div>

          {/* Action Card Based on Role & Status */}
          <div className="rounded-2xl border border-border bg-white p-6 shadow-sm">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-gray-400 mb-4">
              Required Next Step
            </h2>

            {/* SELLER PENDING ACTIONS */}
            {order.status === 'seller_pending' && (
              <div className="space-y-4">
                <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-xs text-amber-900 flex items-start gap-3">
                  <Clock className="h-5 w-5 shrink-0 text-amber-700" />
                  <div>
                    <p className="font-bold">Buyer has paid into escrow</p>
                    <p className="mt-0.5 text-amber-800">
                      Review the project requirements below and accept to start the delivery clock ({order.delivery_days} days).
                    </p>
                  </div>
                </div>

                {isSeller && (
                  <div className="flex gap-3">
                    <Button
                      onClick={() => handleAction('accept')}
                      disabled={actionLoading}
                      className="bg-emerald-600 text-white hover:bg-emerald-700 font-bold"
                    >
                      ✓ Accept Order & Start Scheduling
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => handleAction('cancel', { reason: 'Seller unavailable' })}
                      disabled={actionLoading}
                      className="border-gray-200 text-red-600 hover:bg-red-50"
                    >
                      Decline Order
                    </Button>
                  </div>
                )}
                {isBuyer && (
                  <p className="text-xs text-gray-500 italic">
                    Awaiting {order.seller?.full_name} to accept your project requirements.
                  </p>
                )}
              </div>
            )}

            {/* ACCEPTED / IN PROGRESS */}
            {(order.status === 'accepted' || order.status === 'in_progress' || order.status === 'revision_requested') && (
              <div className="space-y-4">
                {order.status === 'revision_requested' && (
                  <div className="rounded-xl border border-purple-200 bg-purple-50 p-4 text-xs text-purple-900">
                    <p className="font-bold flex items-center gap-1.5">
                      <MessageSquare className="h-4 w-4 text-purple-700" />
                      Revision Requested by Buyer:
                    </p>
                    <p className="mt-1 text-purple-800 italic">&ldquo;{order.revision_notes}&rdquo;</p>
                  </div>
                )}

                {isSeller ? (
                  <div className="space-y-3">
                    <p className="text-xs text-gray-600">
                      You are currently working on this service. Once finished, submit your deliverables for the buyer to inspect.
                    </p>
                    <div className="flex gap-3">
                      {order.status === 'accepted' && (
                        <Button
                          onClick={() => handleAction('start_work')}
                          disabled={actionLoading}
                          className="bg-[#004ac6] text-white hover:bg-[#003b9e]"
                        >
                          Mark In Progress
                        </Button>
                      )}
                      <Button
                        onClick={() => setDeliverableModalOpen(true)}
                        className="bg-emerald-600 text-white hover:bg-emerald-700 font-bold"
                      >
                        Submit Final Deliverables →
                      </Button>
                    </div>
                  </div>
                ) : (
                  <p className="text-xs text-gray-500">
                    {order.seller?.full_name} is actively working on your service. Estimated completion within {order.delivery_days} days.
                  </p>
                )}
              </div>
            )}

            {/* SUBMITTED (Awaiting Buyer Acceptance) */}
            {order.status === 'submitted' && (
              <div className="space-y-4">
                <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-xs text-emerald-900">
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
                      className="mt-2.5 inline-flex items-center gap-1.5 font-bold text-[#004ac6] hover:underline"
                    >
                      <Download className="h-4 w-4" />
                      View Deliverable Link / Files
                    </a>
                  )}
                </div>

                {isBuyer && (
                  <div className="flex flex-wrap gap-3 pt-2">
                    <Button
                      onClick={() => handleAction('complete')}
                      disabled={actionLoading}
                      className="bg-emerald-600 text-white hover:bg-emerald-700 font-bold"
                    >
                      ✓ Approve & Release ₹{order.price} Payment
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => setRevisionModalOpen(true)}
                      className="border-gray-200 text-purple-700 hover:bg-purple-50"
                    >
                      Request Adjustments / Revision
                    </Button>
                  </div>
                )}
                {isSeller && (
                  <p className="text-xs text-gray-500 italic">
                    Deliverables sent to {order.buyer?.full_name}. Awaiting buyer approval to release funds.
                  </p>
                )}
              </div>
            )}

            {/* COMPLETED */}
            {order.status === 'completed' && (
              <div className="space-y-4">
                <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-xs text-emerald-900 flex items-center justify-between">
                  <div>
                    <p className="font-bold">Transaction Successfully Closed</p>
                    <p className="text-emerald-800 mt-0.5">
                      Deliverables were approved and ₹{order.price.toLocaleString('en-IN')} escrow has been released to the seller.
                    </p>
                  </div>
                  <CheckCircle2 className="h-6 w-6 text-emerald-600 shrink-0" />
                </div>

                {isBuyer && !order.review && (
                  <Button
                    onClick={() => setReviewModalOpen(true)}
                    className="gap-2 bg-amber-500 text-white hover:bg-amber-600 font-bold"
                  >
                    <Star className="h-4 w-4 fill-white" />
                    Leave Rating & Review for {order.seller?.full_name}
                  </Button>
                )}

                {order.review && (
                  <div className="rounded-xl border border-gray-100 bg-gray-50 p-4 text-xs">
                    <p className="font-bold text-gray-900 flex items-center gap-1.5">
                      <Star className="h-4 w-4 fill-amber-400 text-amber-400" />
                      Review Left: {order.review.rating} Stars
                    </p>
                    <p className="mt-1 text-gray-600 italic">&ldquo;{order.review.comment}&rdquo;</p>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Requirements Card */}
          <div className="rounded-2xl border border-border bg-white p-6 shadow-sm">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-gray-400 mb-3">
              Project Requirements from Buyer
            </h2>
            <p className="whitespace-pre-wrap text-sm text-gray-700 leading-relaxed bg-gray-50 p-4 rounded-xl border border-gray-100">
              {order.requirements}
            </p>
          </div>

          {/* Timeline */}
          <div className="rounded-2xl border border-border bg-white p-6 shadow-sm">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-gray-400 mb-4">
              Order Audit Timeline
            </h2>
            <div className="space-y-4">
              {order.timeline.map((event, idx) => (
                <div key={idx} className="flex items-start gap-3 text-xs">
                  <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-blue-50 text-[#004ac6]">
                    <Clock className="h-3.5 w-3.5" />
                  </div>
                  <div className="flex-1">
                    <p className="font-bold text-gray-900">{event.title}</p>
                    <p className="text-gray-600">{event.description}</p>
                    <span className="text-[10px] text-gray-400">
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
        </div>

        {/* Right Col: Party Details & Escrow Guarantee */}
        <div className="space-y-6">
          {/* Other Party Profile Card */}
          <div className="rounded-2xl border border-border bg-white p-6 shadow-sm">
            <h2 className="text-xs font-semibold uppercase tracking-wider text-gray-400 mb-4">
              {isSeller ? 'Customer / Buyer' : 'Service Provider'}
            </h2>
            {(() => {
              const party = isSeller ? order.buyer : order.seller;
              if (!party) return <p className="text-xs text-gray-400">User not found</p>;
              const initials = party.full_name
                .split(' ')
                .map((n) => n[0])
                .slice(0, 2)
                .join('')
                .toUpperCase();

              return (
                <div className="space-y-3">
                  <div className="flex items-center gap-3">
                    <Avatar className="h-12 w-12 border border-[#c3c6d7]">
                      {party.avatar_url && <AvatarImage src={party.avatar_url} />}
                      <AvatarFallback className="text-sm font-bold text-[#004ac6]">
                        {initials}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="text-base font-bold text-gray-900">{party.full_name}</p>
                      <p className="text-xs text-gray-500">{party.college}</p>
                    </div>
                  </div>

                  <VerifiedBadge college={party.college} />

                  {party.bio && (
                    <p className="text-xs text-gray-600 line-clamp-3 bg-gray-50 p-3 rounded-lg">
                      {party.bio}
                    </p>
                  )}

                  {!isSeller && (
                    <Link
                      href={`/profile/${party.user_id}`}
                      className="block text-center text-xs font-semibold text-[#004ac6] hover:underline pt-1"
                    >
                      View Full Student Profile →
                    </Link>
                  )}
                </div>
              );
            })()}
          </div>

          {/* Escrow Guarantee Box */}
          <div className="rounded-2xl border border-emerald-100 bg-emerald-50/70 p-6 text-xs text-emerald-900 space-y-3">
            <div className="flex items-center gap-2 font-bold text-emerald-800">
              <ShieldCheck className="h-5 w-5 text-emerald-600" />
              SkillBridge Escrow Protection
            </div>
            <p className="text-emerald-800/90 leading-relaxed">
              Payments are held securely in intermediate student escrow. The provider is only paid once the client approves the final submission.
            </p>
            <div className="border-t border-emerald-200/60 pt-2 text-[11px] text-emerald-700">
              ✓ Free revisions if deliverables don&apos;t match scope
              <br />
              ✓ Full refund guarantee if order is declined
            </div>
          </div>
        </div>
      </div>

      {/* Deliverable Modal (For Seller) */}
      {deliverableModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="w-full max-w-md rounded-2xl border border-border bg-white p-6 shadow-2xl space-y-4">
            <h3 className="text-lg font-bold text-gray-900">Submit Completed Work</h3>
            <p className="text-xs text-gray-500">
              Attach link to your files (Google Drive, GitHub repo, Figma link, etc.) and write delivery notes.
            </p>

            <div>
              <Label className="text-xs font-semibold text-gray-700">Link to Work Files / Drive</Label>
              <Input
                value={deliverableUrl}
                onChange={(e) => setDeliverableUrl(e.target.value)}
                placeholder="https://drive.google.com/..."
                className="mt-1"
              />
            </div>

            <div>
              <Label className="text-xs font-semibold text-gray-700">Delivery Notes</Label>
              <Textarea
                rows={3}
                value={deliverableNotes}
                onChange={(e) => setDeliverableNotes(e.target.value)}
                placeholder="Briefly summarize what was completed..."
                className="mt-1 resize-none"
              />
            </div>

            <div className="flex gap-3 pt-2">
              <Button
                variant="outline"
                onClick={() => setDeliverableModalOpen(false)}
                className="flex-1"
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
                className="flex-1 bg-emerald-600 text-white hover:bg-emerald-700 font-bold"
              >
                Send Deliverable
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Revision Modal (For Buyer) */}
      {revisionModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="w-full max-w-md rounded-2xl border border-border bg-white p-6 shadow-2xl space-y-4">
            <h3 className="text-lg font-bold text-gray-900">Request Revision</h3>
            <p className="text-xs text-gray-500">
              Explain clearly what needs adjustment or improvement before you can accept.
            </p>

            <div>
              <Label className="text-xs font-semibold text-gray-700">Revision Details</Label>
              <Textarea
                rows={4}
                value={revisionNotes}
                onChange={(e) => setRevisionNotes(e.target.value)}
                placeholder="e.g. Please increase the font size on the hero section and change the background music..."
                className="mt-1 resize-none"
              />
            </div>

            <div className="flex gap-3 pt-2">
              <Button
                variant="outline"
                onClick={() => setRevisionModalOpen(false)}
                className="flex-1"
              >
                Cancel
              </Button>
              <Button
                onClick={() => handleAction('request_revision', { notes: revisionNotes })}
                disabled={actionLoading || !revisionNotes.trim()}
                className="flex-1 bg-purple-600 text-white hover:bg-purple-700 font-bold"
              >
                Send Request
              </Button>
            </div>
          </div>
        </div>
      )}

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
