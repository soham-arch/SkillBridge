import { NextResponse } from 'next/server';
import { verifyAdminRequest, logAdminAuditEvent } from '@/lib/auth/server-admin';
import { moderateReview } from '@/lib/services/reviews';
import { isValidUUID } from '@/lib/services/services';

/**
 * POST /api/admin/reviews/moderate
 *
 * Moderates a review (hide, restore, dismiss reports).
 * Restricted to verified platform administrators.
 * Automatically recalculates authoritative ratings.
 */
export async function POST(req: Request) {
  const auth = await verifyAdminRequest(req);
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  try {
    const body = await req.json();
    const { reviewId, action, notes } = body;

    if (!reviewId || !isValidUUID(reviewId)) {
      return NextResponse.json({ error: 'Valid review identifier is required.' }, { status: 400 });
    }

    if (!['hide', 'restore', 'dismiss'].includes(action)) {
      return NextResponse.json(
        { error: 'Invalid moderation action: Must be hide, restore, or dismiss.' },
        { status: 400 }
      );
    }

    const adminId = auth.user!.id;
    const adminName = auth.profile?.full_name || 'Administrator';

    const result = await moderateReview({
      reviewId,
      adminId,
      action,
      notes,
    });

    // Record immutable audit event
    await logAdminAuditEvent({
      actorId: adminId,
      action: `review_moderated_${action}`,
      targetType: 'review',
      targetId: reviewId,
      details: {
        action,
        notes: notes || null,
        adminName,
      },
      req,
    });

    return NextResponse.json({ success: true, action: result.action });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to moderate review';
    console.error('Error in POST /api/admin/reviews/moderate:', err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
