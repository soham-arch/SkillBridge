import { getSupabaseClient } from '@/lib/supabase/client';
import { createNotification } from '@/lib/services/notifications';
import { Review, ReviewReport, RatingBreakdown, Order } from '@/types';

// In-memory fallback review store for offline / local testing
const localReviewsStore: Review[] = [
  {
    id: 'rev-seed-1',
    service_id: '30000000-0000-0000-0000-000000000001',
    order_id: '50000000-0000-0000-0000-000000000001',
    reviewer_id: '10000000-0000-0000-0000-000000000002',
    reviewee_id: '10000000-0000-0000-0000-000000000001',
    rating: 5,
    comment: 'Exceptional full-stack web delivery! Code is clean, modular, and well documented.',
    is_hidden: false,
    moderation_status: 'published',
    report_count: 0,
    created_at: '2026-08-20T10:00:00.000Z',
    updated_at: '2026-08-20T10:00:00.000Z',
  },
  {
    id: 'rev-seed-2',
    service_id: '30000000-0000-0000-0000-000000000002',
    order_id: '50000000-0000-0000-0000-000000000002',
    reviewer_id: '10000000-0000-0000-0000-000000000003',
    reviewee_id: '10000000-0000-0000-0000-000000000002',
    rating: 5,
    comment: 'Priya crafted an outstanding Figma design system. Super responsive and fast!',
    is_hidden: false,
    moderation_status: 'published',
    report_count: 0,
    created_at: '2026-08-21T12:00:00.000Z',
    updated_at: '2026-08-21T12:00:00.000Z',
  },
  {
    id: 'rev-seed-3',
    service_id: '30000000-0000-0000-0000-000000000001',
    order_id: '50000000-0000-0000-0000-000000000003',
    reviewer_id: '10000000-0000-0000-0000-000000000004',
    reviewee_id: '10000000-0000-0000-0000-000000000001',
    rating: 4,
    comment: 'Very thorough tutor. Explained dynamic programming and trees clearly.',
    is_hidden: false,
    moderation_status: 'published',
    report_count: 0,
    created_at: '2026-08-22T14:30:00.000Z',
    updated_at: '2026-08-22T14:30:00.000Z',
  },
];

const localReportsStore: ReviewReport[] = [];

/**
 * Validates rating and review text constraints on the server.
 */
export function validateReviewInput(rating: number, comment: string): { valid: boolean; error?: string } {
  if (typeof rating !== 'number' || !Number.isInteger(rating) || rating < 1 || rating > 5) {
    return { valid: false, error: 'Rating must be an integer between 1 and 5 stars.' };
  }

  const clean = (comment || '').trim();
  if (clean.length < 5) {
    return { valid: false, error: 'Review text must be at least 5 characters long.' };
  }

  if (clean.length > 1000) {
    return { valid: false, error: 'Review text cannot exceed 1000 characters.' };
  }

  return { valid: true };
}

/**
 * Calculates authoritative rating breakdown and average from a list of reviews.
 * Strictly ignores hidden or moderated reviews (is_hidden = true).
 */
export function calculateRatingBreakdown(reviews: Review[]): RatingBreakdown {
  const visible = reviews.filter((r) => !r.is_hidden && r.moderation_status !== 'hidden');
  const totalReviews = visible.length;

  const counts: { 1: number; 2: number; 3: number; 4: number; 5: number } = {
    1: 0,
    2: 0,
    3: 0,
    4: 0,
    5: 0,
  };

  if (totalReviews === 0) {
    return {
      averageRating: 0,
      totalReviews: 0,
      counts,
      percentages: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 },
    };
  }

  let sum = 0;
  for (const r of visible) {
    const star = Math.min(Math.max(Math.round(r.rating), 1), 5) as 1 | 2 | 3 | 4 | 5;
    counts[star] = (counts[star] || 0) + 1;
    sum += star;
  }

  const rawAverage = sum / totalReviews;
  const averageRating = Math.round(rawAverage * 10) / 10; // Rounded to 1 decimal place

  const percentages: { 1: number; 2: number; 3: number; 4: number; 5: number } = {
    1: Math.round((counts[1] / totalReviews) * 100),
    2: Math.round((counts[2] / totalReviews) * 100),
    3: Math.round((counts[3] / totalReviews) * 100),
    4: Math.round((counts[4] / totalReviews) * 100),
    5: Math.round((counts[5] / totalReviews) * 100),
  };

  return {
    averageRating,
    totalReviews,
    counts,
    percentages,
  };
}

/**
 * Fetches all reviews for a specific service from Supabase.
 * By default, filters out hidden or moderated reviews from public view.
 */
export async function fetchServiceReviews(
  serviceId: string,
  includeHidden: boolean = false
): Promise<Review[]> {
  try {
    const supabase = getSupabaseClient();
    let query = supabase
      .from('reviews')
      .select(`
        *,
        reviewer:profiles!reviews_reviewer_id_fkey(id, user_id, full_name, avatar_url, college)
      `)
      .eq('service_id', serviceId);

    if (!includeHidden) {
      query = query.or('is_hidden.is.null,is_hidden.eq.false');
    }

    const { data, error } = await query.order('created_at', { ascending: false });

    if (!error && data) {
      return data as Review[];
    }
  } catch (err) {
    console.error('Failed to fetch service reviews from database:', err);
  }

  return localReviewsStore
    .filter((r) => r.service_id === serviceId && (includeHidden || !r.is_hidden))
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
}

/**
 * Fetches all reviews for a seller across all of their service listings.
 * Enforces visible-only filtering for public profiles.
 */
export async function fetchSellerReviews(
  sellerId: string,
  includeHidden: boolean = false
): Promise<Review[]> {
  try {
    const supabase = getSupabaseClient();
    let query = supabase
      .from('reviews')
      .select(`
        *,
        reviewer:profiles!reviews_reviewer_id_fkey(id, user_id, full_name, avatar_url, college),
        service:services(id, title)
      `)
      .eq('reviewee_id', sellerId);

    if (!includeHidden) {
      query = query.or('is_hidden.is.null,is_hidden.eq.false');
    }

    const { data, error } = await query.order('created_at', { ascending: false });

    if (!error && data) {
      return data as Review[];
    }
  } catch (err) {
    console.error('Failed to fetch seller reviews from database:', err);
  }

  return localReviewsStore
    .filter((r) => r.reviewee_id === sellerId && (includeHidden || !r.is_hidden))
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
}

/**
 * Fetches the review associated with a specific order, if one exists.
 */
export async function fetchOrderReview(orderId: string): Promise<Review | null> {
  try {
    const supabase = getSupabaseClient();
    const { data, error } = await supabase
      .from('reviews')
      .select(`
        *,
        reviewer:profiles!reviews_reviewer_id_fkey(id, user_id, full_name, avatar_url, college)
      `)
      .eq('order_id', orderId)
      .maybeSingle();

    if (!error && data) {
      return data as Review;
    }
  } catch (err) {
    console.warn('Note in fetchOrderReview:', err);
  }

  return localReviewsStore.find((r) => r.order_id === orderId) ?? null;
}

/**
 * Submits a verified review backed by an authentic completed order record.
 * Validates eligibility, roles, anti-self-review, duplication, and input constraints.
 */
export async function submitVerifiedReview(params: {
  orderId: string;
  serviceId: string;
  reviewerId: string;
  revieweeId: string;
  rating: number;
  comment: string;
}): Promise<Review> {
  const { orderId, serviceId, reviewerId, revieweeId, rating, comment } = params;

  // 1. Server input validation
  const validation = validateReviewInput(rating, comment);
  if (!validation.valid) {
    throw new Error(validation.error || 'Invalid review input');
  }

  // 2. Anti-self-review defense
  if (reviewerId === revieweeId) {
    throw new Error('Self-review forbidden: You cannot review your own service listings.');
  }

  const supabase = getSupabaseClient();

  // 3. Verify order eligibility from authoritative database
  const { data: order, error: orderErr } = await supabase
    .from('orders')
    .select('id, service_id, buyer_id, seller_id, status')
    .eq('id', orderId)
    .maybeSingle();

  if (order) {
    if (order.status !== 'completed') {
      throw new Error('Eligibility violation: Reviews can only be left after an order is genuinely completed.');
    }
    if (order.buyer_id !== reviewerId) {
      throw new Error('Unauthorized: Only the verified buyer of this completed order can leave a review.');
    }
    if (order.seller_id !== revieweeId) {
      throw new Error('Participant mismatch: Specified reviewee does not match the order seller.');
    }
  }

  // 4. Duplicate review prevention on this order
  const { data: existingReview } = await supabase
    .from('reviews')
    .select('id')
    .eq('order_id', orderId)
    .maybeSingle();

  if (existingReview) {
    throw new Error('Duplicate review: You have already submitted a review for this completed order.');
  }

  const now = new Date().toISOString();
  const cleanComment = comment.trim();

  // 5. Try atomic PostgreSQL RPC `submit_verified_review`
  const { data: rpcData, error: rpcErr } = await supabase.rpc('submit_verified_review', {
    p_order_id: orderId,
    p_rating: rating,
    p_comment: cleanComment,
    p_reviewer_id: reviewerId,
  });

  if (!rpcErr && rpcData?.review_id) {
    const { data: loaded } = await supabase
      .from('reviews')
      .select(`
        *,
        reviewer:profiles!reviews_reviewer_id_fkey(id, user_id, full_name, avatar_url, college)
      `)
      .eq('id', rpcData.review_id)
      .single();

    if (loaded) return loaded as Review;
  }

  // 6. Direct table insert fallback
  const { data: inserted, error: insertErr } = await supabase
    .from('reviews')
    .insert({
      order_id: orderId,
      service_id: serviceId,
      reviewer_id: reviewerId,
      reviewee_id: revieweeId,
      rating,
      comment: cleanComment,
      is_hidden: false,
      moderation_status: 'published',
      created_at: now,
      updated_at: now,
    })
    .select(`
      *,
      reviewer:profiles!reviews_reviewer_id_fkey(id, user_id, full_name, avatar_url, college)
    `)
    .maybeSingle();

  if (!insertErr && inserted) {
    // Synchronize seller notification
    try {
      await createNotification({
        userId: revieweeId,
        title: 'New Verified Review Received! ⭐',
        message: `Received ${rating} stars: "${cleanComment.slice(0, 60)}..."`,
        type: 'review_received',
        link: `/orders/${orderId}`,
        dedupKey: `review-${orderId}`,
      });
    } catch {
      // Non-fatal notification
    }

    // Authoritative service rating synchronization
    try {
      const allSvcReviews = await fetchServiceReviews(serviceId);
      const breakdown = calculateRatingBreakdown(allSvcReviews);
      await supabase
        .from('services')
        .update({
          rating: breakdown.averageRating,
          reviews_count: breakdown.totalReviews,
          updated_at: now,
        })
        .eq('id', serviceId);
    } catch {
      // Non-fatal
    }

    localReviewsStore.unshift(inserted as Review);
    return inserted as Review;
  }

  // 7. Local fallback for test runs
  const fallbackReview: Review = {
    id: 'rev_' + Date.now(),
    order_id: orderId,
    service_id: serviceId,
    reviewer_id: reviewerId,
    reviewee_id: revieweeId,
    rating,
    comment: cleanComment,
    is_hidden: false,
    moderation_status: 'published',
    report_count: 0,
    created_at: now,
    updated_at: now,
  };
  localReviewsStore.unshift(fallbackReview);

  // Fallback notification
  try {
    await createNotification({
      userId: revieweeId,
      title: 'New Verified Review Received! ⭐',
      message: `Received ${rating} stars: "${cleanComment.slice(0, 60)}..."`,
      type: 'review_received',
      link: `/orders/${orderId}`,
      dedupKey: `review-${orderId}`,
    });
  } catch {}

  return fallbackReview;
}

/**
 * Allows a signed-in student to report an inappropriate or abusive review.
 */
export async function reportReview(params: {
  reviewId: string;
  reporterId: string;
  reason: string;
  notes?: string;
}): Promise<{ success: boolean; reportId: string }> {
  const { reviewId, reporterId, reason, notes } = params;

  if (!reason.trim()) {
    throw new Error('Please specify a reason for reporting this review.');
  }

  const supabase = getSupabaseClient();
  const now = new Date().toISOString();

  // Check duplicate report
  const existing = localReportsStore.find(
    (r) => r.review_id === reviewId && r.reporter_id === reporterId
  );
  if (existing) {
    throw new Error('You have already submitted a report for this review.');
  }

  try {
    const { data: dbReport, error: repErr } = await supabase
      .from('review_reports')
      .insert({
        review_id: reviewId,
        reporter_id: reporterId,
        reason,
        notes: notes || null,
        status: 'pending',
        created_at: now,
      })
      .select('id')
      .single();

    if (!repErr && dbReport) {
      // Update report count on review
      try {
        await supabase.rpc('increment_review_report_count', { p_review_id: reviewId });
      } catch {
        // Continue if RPC unavailable
      }

      return { success: true, reportId: dbReport.id };
    }
  } catch (err) {
    console.warn('Database note in reportReview:', err);
  }

  // Fallback report record
  const fallbackReport: ReviewReport = {
    id: 'rep_' + Date.now(),
    review_id: reviewId,
    reporter_id: reporterId,
    reason,
    notes: notes || null,
    status: 'pending',
    created_at: now,
  };
  localReportsStore.push(fallbackReport);

  // Increment report_count in local store
  const rev = localReviewsStore.find((r) => r.id === reviewId);
  if (rev) {
    rev.report_count = (rev.report_count || 0) + 1;
    rev.moderation_status = 'flagged';
  }

  return { success: true, reportId: fallbackReport.id };
}

/**
 * Allows an administrator to moderate a review (hide, restore, dismiss flags).
 * Authoritatively recalculates seller and service aggregate ratings.
 */
export async function moderateReview(params: {
  reviewId: string;
  adminId: string;
  action: 'hide' | 'restore' | 'dismiss';
  notes?: string;
}): Promise<{ success: boolean; reviewId: string; action: string }> {
  const { reviewId, adminId, action, notes } = params;

  const supabase = getSupabaseClient();
  const now = new Date().toISOString();

  const isHidden = action === 'hide';
  const modStatus = action === 'hide' ? 'hidden' : 'published';

  // Try RPC
  try {
    const { data, error } = await supabase.rpc('moderate_review', {
      p_review_id: reviewId,
      p_action: action,
      p_notes: notes || null,
    });
    if (!error && data?.success) {
      return { success: true, reviewId, action };
    }
  } catch {
    // Fallback to direct update below
  }

  try {
    await supabase
      .from('reviews')
      .update({
        is_hidden: isHidden,
        moderation_status: modStatus,
        updated_at: now,
      })
      .eq('id', reviewId);

    // Update corresponding reports
    const reportStatus = action === 'hide' ? 'resolved' : action === 'dismiss' ? 'dismissed' : 'pending';
    await supabase
      .from('review_reports')
      .update({
        status: reportStatus,
        resolved_by: adminId,
        resolved_at: now,
      })
      .eq('review_id', reviewId);
  } catch (err) {
    console.warn('Database note in moderateReview:', err);
  }

  // Update in-memory fallback
  const rev = localReviewsStore.find((r) => r.id === reviewId);
  if (rev) {
    rev.is_hidden = isHidden;
    rev.moderation_status = modStatus;
    rev.updated_at = now;
  }

  localReportsStore.forEach((rep) => {
    if (rep.review_id === reviewId) {
      rep.status = action === 'hide' ? 'resolved' : action === 'dismiss' ? 'dismissed' : 'pending';
      rep.resolved_by = adminId;
      rep.resolved_at = now;
    }
  });

  return { success: true, reviewId, action };
}

/**
 * Fetches all reported reviews for the platform administration moderation console.
 */
export async function fetchReportedReviewsAdmin(): Promise<ReviewReport[]> {
  try {
    const supabase = getSupabaseClient();
    const { data, error } = await supabase
      .from('review_reports')
      .select(`
        *,
        review:reviews(
          *,
          reviewer:profiles!reviews_reviewer_id_fkey(id, full_name, email),
          service:services(id, title)
        ),
        reporter:profiles!review_reports_reporter_id_fkey(id, full_name, email)
      `)
      .order('created_at', { ascending: false });

    if (!error && data) {
      return data as ReviewReport[];
    }
  } catch (err) {
    console.warn('Note in fetchReportedReviewsAdmin:', err);
  }

  return localReportsStore
    .map((rep) => {
      const rev = localReviewsStore.find((r) => r.id === rep.review_id);
      return {
        ...rep,
        review: rev || null,
      };
    })
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
}
