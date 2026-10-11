import { NextResponse } from 'next/server';
import { extractAuthToken, getServerSupabaseClient } from '@/lib/auth/server-seller';
import { submitVerifiedReview, validateReviewInput } from '@/lib/services/reviews';
import { isValidUUID } from '@/lib/services/services';

/**
 * POST /api/reviews/submit
 *
 * Submits an authentic review for a completed order.
 * Strictly verifies completed order eligibility, buyer role, anti-self-review, and duplication.
 */
export async function POST(req: Request) {
  try {
    const token = extractAuthToken(req);
    const supabase = getServerSupabaseClient(token);

    // 1. Authenticate caller
    const { data: { user }, error: authErr } = await supabase.auth.getUser();
    if (authErr || !user) {
      return NextResponse.json({ error: 'Unauthorized: Please log in to leave a review.' }, { status: 401 });
    }

    const body = await req.json();
    const { orderId, serviceId, revieweeId, rating, comment } = body;

    // 2. Validate IDs
    if (!orderId || !isValidUUID(orderId)) {
      return NextResponse.json({ error: 'Valid order identifier is required.' }, { status: 400 });
    }
    if (!serviceId || !isValidUUID(serviceId)) {
      return NextResponse.json({ error: 'Valid service identifier is required.' }, { status: 400 });
    }

    // 3. Validate rating and comment inputs
    const validation = validateReviewInput(rating, comment);
    if (!validation.valid) {
      return NextResponse.json({ error: validation.error }, { status: 400 });
    }

    // 4. Verify completed order eligibility from database
    const { data: order, error: orderErr } = await supabase
      .from('orders')
      .select('id, service_id, buyer_id, seller_id, status')
      .eq('id', orderId)
      .maybeSingle();

    if (orderErr || !order) {
      return NextResponse.json({ error: 'Order not found.' }, { status: 404 });
    }

    // Check completion status
    if (order.status !== 'completed') {
      return NextResponse.json(
        { error: 'Eligibility violation: Reviews can only be left after an order is genuinely completed.' },
        { status: 400 }
      );
    }

    // Check caller is buyer
    if (order.buyer_id !== user.id) {
      return NextResponse.json(
        { error: 'Unauthorized: Only the verified buyer of this order can leave a review.' },
        { status: 403 }
      );
    }

    // Check anti-self-review
    if (order.seller_id === user.id) {
      return NextResponse.json(
        { error: 'Self-review forbidden: Providers cannot review their own service listings.' },
        { status: 400 }
      );
    }

    // Check duplicate review
    const { data: existingReview } = await supabase
      .from('reviews')
      .select('id')
      .eq('order_id', orderId)
      .maybeSingle();

    if (existingReview) {
      return NextResponse.json(
        { error: 'Duplicate review: You have already submitted a review for this completed order.' },
        { status: 400 }
      );
    }

    // 5. Submit review
    const review = await submitVerifiedReview({
      orderId,
      serviceId: order.service_id,
      reviewerId: user.id,
      revieweeId: order.seller_id,
      rating,
      comment,
    });

    return NextResponse.json({ success: true, review });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to submit review';
    console.error('Error in POST /api/reviews/submit:', err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
