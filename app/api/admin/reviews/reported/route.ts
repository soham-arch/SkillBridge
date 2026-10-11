import { NextResponse } from 'next/server';
import { verifyAdminRequest } from '@/lib/auth/server-admin';
import { fetchReportedReviewsAdmin } from '@/lib/services/reviews';

/**
 * GET /api/admin/reviews/reported
 *
 * Retrieves all reported/flagged reviews for admin moderation.
 * Restricted strictly to verified administrators.
 */
export async function GET(req: Request) {
  const auth = await verifyAdminRequest(req);
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  try {
    const reports = await fetchReportedReviewsAdmin();
    return NextResponse.json({ reports });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to fetch reported reviews';
    console.error('Error in GET /api/admin/reviews/reported:', err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
