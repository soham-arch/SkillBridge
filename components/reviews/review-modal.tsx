'use client';

import { useState, type FormEvent } from 'react';
import { Star, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { submitVerifiedReview } from '@/lib/services/reviews';
import { Order } from '@/types';

interface ReviewModalProps {
  order: Order;
  reviewerId: string;
  open: boolean;
  onClose: () => void;
  onReviewed?: () => void;
}

export function ReviewModal({ order, reviewerId, open, onClose, onReviewed }: ReviewModalProps) {
  const [rating, setRating] = useState(5);
  const [hoverRating, setHoverRating] = useState(0);
  const [comment, setComment] = useState('');
  const [submitting, setSubmitting] = useState(false);

  if (!open) return null;

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const cleanComment = comment.trim();
    if (cleanComment.length < 5) {
      toast.error('Please write at least 5 characters describing your experience.');
      return;
    }

    setSubmitting(true);
    try {
      await submitVerifiedReview({
        orderId: order.id,
        serviceId: order.service_id,
        reviewerId,
        revieweeId: order.seller_id,
        rating,
        comment: cleanComment,
      });

      toast.success('Verified review submitted! Thank you for supporting peer quality.');
      onReviewed?.();
      onClose();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Review submission failed';
      toast.error(msg);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="relative w-full max-w-md rounded-2xl border border-border bg-white p-6 shadow-2xl animate-in fade-in zoom-in-95 duration-200">
        <button
          onClick={onClose}
          className="absolute right-4 top-4 rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-700"
        >
          <X className="h-5 w-5" />
        </button>

        <div className="text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-amber-50 text-amber-500 mb-3">
            <Star className="h-6 w-6 fill-amber-400 text-amber-400" />
          </div>
          <h2 className="text-xl font-bold text-gray-900">Rate & Review</h2>
          <p className="text-xs text-gray-500 mt-1">
            Share feedback on {order.seller?.full_name}&apos;s work for &ldquo;{order.service?.title}&rdquo;
          </p>
        </div>

        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          {/* Star selector */}
          <div className="flex flex-col items-center gap-1.5">
            <Label className="text-xs font-semibold text-gray-700">Your Rating</Label>
            <div className="flex gap-2">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  type="button"
                  key={star}
                  onClick={() => setRating(star)}
                  onMouseEnter={() => setHoverRating(star)}
                  onMouseLeave={() => setHoverRating(0)}
                  className="p-1 transition-transform hover:scale-110 focus:outline-none"
                >
                  <Star
                    className={`h-8 w-8 ${
                      (hoverRating || rating) >= star
                        ? 'fill-amber-400 text-amber-400'
                        : 'text-gray-200'
                    }`}
                  />
                </button>
              ))}
            </div>
            <span className="text-xs font-semibold text-amber-600">
              {rating === 5
                ? '5 Stars — Exceptional Work'
                : rating === 4
                ? '4 Stars — Very Good'
                : rating === 3
                ? '3 Stars — Met Expectations'
                : rating === 2
                ? '2 Stars — Needs Improvement'
                : '1 Star — Unsatisfactory'}
            </span>
          </div>

          <div>
            <Label htmlFor="comment" className="text-xs font-semibold text-gray-700">
              Your Review
            </Label>
            <Textarea
              id="comment"
              required
              rows={4}
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="How was the communication, quality of deliverables, and punctuality?"
              className="mt-1.5 resize-none text-sm"
            />
          </div>

          <div className="pt-2 flex gap-3">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              className="flex-1 border-gray-200"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={submitting}
              className="flex-1 bg-[#004ac6] text-white hover:bg-[#003b9e]"
            >
              {submitting ? 'Submitting...' : 'Post Review'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
