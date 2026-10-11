import { NextResponse } from 'next/server';
import { extractAuthToken, getServerSupabaseClient } from '@/lib/auth/server-seller';
import { reportReview } from '@/lib/services/reviews';
import { isValidUUID } from '@/lib/services/services';

/**
 * POST /api/reviews/[id]/report
 *
 * Submits a community report against an inappropriate or abusive review.
 */
export async function POST(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const token = extractAuthToken(req);
    const supabase = getServerSupabaseClient(token);

    const { data: { user }, error: authErr } = await supabase.auth.getUser();
    if (authErr || !user) {
      return NextResponse.json({ error: 'Unauthorized: Please log in to report a review.' }, { status: 401 });
    }

    const reviewId = params.id;
    if (!reviewId || !isValidUUID(reviewId)) {
      return NextResponse.json({ error: 'Valid review identifier is required.' }, { status: 400 });
    }

    const body = await req.json();
    const { reason, notes } = body;

    if (!reason || typeof reason !== 'string' || !reason.trim()) {
      return NextResponse.json({ error: 'Please select a valid report reason.' }, { status: 400 });
    }

    const result = await reportReview({
      reviewId,
      reporterId: user.id,
      reason: reason.trim(),
      notes: notes?.trim(),
    });

    return NextResponse.json({ success: true, reportId: result.reportId });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to submit report';
    console.error('Error in POST /api/reviews/[id]/report:', err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
