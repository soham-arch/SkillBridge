'use client';

import { useState } from 'react';
import { Star, Flag, CheckCircle2, ShieldCheck, AlertCircle, X } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { useAuth } from '@/lib/auth/auth-context';
import { reportReview } from '@/lib/services/reviews';
import { Review } from '@/types';

interface ReviewCardProps {
  review: Review;
  onReportSubmitted?: () => void;
}

export function ReviewCard({ review, onReportSubmitted }: ReviewCardProps) {
  const { session } = useAuth();
  const [reportModalOpen, setReportModalOpen] = useState(false);
  const [reportReason, setReportReason] = useState('inappropriate');
  const [reportNotes, setReportNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [hasReported, setHasReported] = useState(false);

  const reviewerName = review.reviewer?.full_name || 'Campus Student';
  const reviewerCollege = review.reviewer?.college;
  const reviewerInitials = reviewerName
    .split(' ')
    .map((w) => w[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();

  const formattedDate = new Date(review.created_at).toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });

  async function handleReportSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!session?.user?.id) {
      toast.error('Please log in to report a review.');
      return;
    }

    setSubmitting(true);
    try {
      // Call report service / route
      const res = await fetch(`/api/reviews/${review.id}/report`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          reason: reportReason,
          notes: reportNotes,
        }),
      });

      if (!res.ok) {
        // Fallback to client service
        await reportReview({
          reviewId: review.id,
          reporterId: session.user.id,
          reason: reportReason,
          notes: reportNotes,
        });
      }

      toast.success('Report submitted. Platform moderators will review this content.');
      setHasReported(true);
      setReportModalOpen(false);
      onReportSubmitted?.();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to submit report';
      toast.error(msg);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="rounded-2xl border border-gray-100 bg-[#fafafa] p-5 space-y-3 transition-all hover:border-gray-200">
      <div className="flex flex-wrap items-start justify-between gap-3">
        {/* Reviewer Details */}
        <div className="flex items-center gap-3">
          <Avatar className="h-10 w-10 border border-[#c3c6d7]">
            {review.reviewer?.avatar_url && (
              <AvatarImage src={review.reviewer.avatar_url} alt={reviewerName} />
            )}
            <AvatarFallback className="bg-[#f0f4ff] text-xs font-bold text-[#004ac6]">
              {reviewerInitials}
            </AvatarFallback>
          </Avatar>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="text-xs font-bold text-gray-900">{reviewerName}</span>
              <span className="inline-flex items-center gap-0.5 rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold text-emerald-700">
                <CheckCircle2 className="h-3 w-3 text-emerald-600" />
                Verified Buyer
              </span>
            </div>
            {reviewerCollege && (
              <p className="text-[11px] text-gray-500">{reviewerCollege}</p>
            )}
          </div>
        </div>

        {/* Rating Stars & Timestamp */}
        <div className="flex flex-col items-end gap-1">
          <div className="flex items-center gap-1">
            {Array.from({ length: 5 }).map((_, i) => (
              <Star
                key={i}
                className={`h-3.5 w-3.5 ${
                  i < review.rating ? 'fill-amber-400 text-amber-400' : 'text-gray-200'
                }`}
              />
            ))}
          </div>
          <span className="text-[10px] text-gray-400 font-medium">{formattedDate}</span>
        </div>
      </div>

      {/* Review Comment */}
      <p className="text-xs text-gray-700 leading-relaxed pl-1 sm:pl-12 font-normal">
        &ldquo;{review.comment}&rdquo;
      </p>

      {/* Footer: Service reference + Report action */}
      <div className="flex items-center justify-between pt-2 border-t border-gray-100/80 text-[11px] text-gray-400 pl-1 sm:pl-12">
        <span>
          {review.service?.title ? `Service: ${review.service.title}` : 'Verified Completed Contract'}
        </span>

        {hasReported ? (
          <span className="text-amber-600 font-semibold text-[10px] flex items-center gap-1">
            <AlertCircle className="h-3 w-3" /> Report pending review
          </span>
        ) : (
          <button
            onClick={() => setReportModalOpen(true)}
            className="inline-flex items-center gap-1 text-[11px] text-gray-400 hover:text-red-600 transition-colors"
            title="Report inappropriate review"
          >
            <Flag className="h-3 w-3" />
            <span>Report</span>
          </button>
        )}
      </div>

      {/* Report Modal */}
      {reportModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="relative w-full max-w-sm rounded-2xl border border-border bg-white p-6 shadow-2xl animate-in fade-in zoom-in-95 duration-150">
            <button
              onClick={() => setReportModalOpen(false)}
              className="absolute right-4 top-4 text-gray-400 hover:text-gray-600"
            >
              <X className="h-4 w-4" />
            </button>

            <div className="flex items-center gap-2 mb-3 text-red-600">
              <Flag className="h-5 w-5" />
              <h3 className="text-base font-bold text-gray-900">Report Review</h3>
            </div>
            <p className="text-xs text-gray-500 mb-4">
              Help keep SkillBridge honest and safe. Reports are investigated by campus administrators.
            </p>

            <form onSubmit={handleReportSubmit} className="space-y-3 text-xs">
              <div>
                <Label className="text-xs font-semibold text-gray-700">Reason</Label>
                <select
                  value={reportReason}
                  onChange={(e) => setReportReason(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-gray-200 bg-white p-2 text-xs focus:border-[#004ac6] focus:outline-none"
                >
                  <option value="inappropriate">Inappropriate / Offensive Language</option>
                  <option value="spam">Spam / Advertising</option>
                  <option value="harassment">Harassment / Bullying</option>
                  <option value="false_information">Fraudulent / False Claims</option>
                  <option value="other">Other Violation</option>
                </select>
              </div>

              <div>
                <Label className="text-xs font-semibold text-gray-700">Additional Details (Optional)</Label>
                <Textarea
                  value={reportNotes}
                  onChange={(e) => setReportNotes(e.target.value)}
                  placeholder="Explain why this review violates platform trust guidelines..."
                  rows={3}
                  className="mt-1 text-xs resize-none"
                />
              </div>

              <div className="flex gap-2 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setReportModalOpen(false)}
                  className="flex-1 text-xs"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={submitting}
                  className="flex-1 bg-red-600 text-white hover:bg-red-700 text-xs font-bold"
                >
                  {submitting ? 'Submitting...' : 'Submit Report'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
