-- SkillBridge Feature 10: Verified Reviews & Seller Reputation
-- Migration: 20260822250000_015_verified_reviews_and_reputation.sql
--
-- 1. Extends public.reviews with order_id, is_hidden, moderation_status, and report_count
-- 2. Enforces unique review per completed order (prevents duplicate reviews)
-- 3. Creates public.review_reports table for community review flagging
-- 4. Establishes RLS policies for reviews and reports
-- 5. Declares authoritative database rating aggregation functions and RPCs

-- 1. Extend reviews table
DO $$
BEGIN
  -- Add order_id
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'reviews' AND column_name = 'order_id'
  ) THEN
    ALTER TABLE public.reviews ADD COLUMN order_id uuid REFERENCES public.orders(id) ON DELETE CASCADE;
  END IF;

  -- Add is_hidden
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'reviews' AND column_name = 'is_hidden'
  ) THEN
    ALTER TABLE public.reviews ADD COLUMN is_hidden boolean NOT NULL DEFAULT false;
  END IF;

  -- Add moderation_status
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'reviews' AND column_name = 'moderation_status'
  ) THEN
    ALTER TABLE public.reviews ADD COLUMN moderation_status text NOT NULL DEFAULT 'published';
  END IF;

  -- Add report_count
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'reviews' AND column_name = 'report_count'
  ) THEN
    ALTER TABLE public.reviews ADD COLUMN report_count integer NOT NULL DEFAULT 0;
  END IF;
END $$;

-- 2. Constraints and Indexes
CREATE UNIQUE INDEX IF NOT EXISTS idx_reviews_order_id_unique
  ON public.reviews(order_id)
  WHERE order_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_reviews_service_visible
  ON public.reviews(service_id, is_hidden)
  WHERE is_hidden = false;

CREATE INDEX IF NOT EXISTS idx_reviews_reviewee_visible
  ON public.reviews(reviewee_id, is_hidden)
  WHERE is_hidden = false;

CREATE INDEX IF NOT EXISTS idx_reviews_moderation_status
  ON public.reviews(moderation_status);

-- 3. Create review_reports Table
CREATE TABLE IF NOT EXISTS public.review_reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  review_id uuid NOT NULL REFERENCES public.reviews(id) ON DELETE CASCADE,
  reporter_id uuid NOT NULL REFERENCES public.profiles(user_id) ON DELETE CASCADE,
  reason text NOT NULL,
  notes text,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'resolved', 'dismissed')),
  resolved_by uuid REFERENCES public.profiles(user_id) ON DELETE SET NULL,
  resolved_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT unique_user_report_per_review UNIQUE (review_id, reporter_id)
);

CREATE INDEX IF NOT EXISTS idx_review_reports_review_id ON public.review_reports(review_id);
CREATE INDEX IF NOT EXISTS idx_review_reports_status ON public.review_reports(status);
CREATE INDEX IF NOT EXISTS idx_review_reports_reporter ON public.review_reports(reporter_id);

-- 4. Enable Row Level Security
ALTER TABLE public.reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.review_reports ENABLE ROW LEVEL SECURITY;

-- Reviews RLS Policies
DROP POLICY IF EXISTS "reviews_select_visible" ON public.reviews;
CREATE POLICY "reviews_select_visible" ON public.reviews
  FOR SELECT TO anon, authenticated
  USING (
    is_hidden = false OR
    auth.uid() = reviewer_id OR
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.user_id = auth.uid() AND profiles.is_admin = true
    )
  );

DROP POLICY IF EXISTS "reviews_insert_verified" ON public.reviews;
CREATE POLICY "reviews_insert_verified" ON public.reviews
  FOR INSERT TO authenticated
  WITH CHECK (
    auth.uid() = reviewer_id AND
    reviewer_id <> reviewee_id
  );

DROP POLICY IF EXISTS "reviews_update_author_or_admin" ON public.reviews;
CREATE POLICY "reviews_update_author_or_admin" ON public.reviews
  FOR UPDATE TO authenticated
  USING (
    auth.uid() = reviewer_id OR
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.user_id = auth.uid() AND profiles.is_admin = true
    )
  )
  WITH CHECK (
    auth.uid() = reviewer_id OR
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.user_id = auth.uid() AND profiles.is_admin = true
    )
  );

DROP POLICY IF EXISTS "reviews_delete_author_or_admin" ON public.reviews;
CREATE POLICY "reviews_delete_author_or_admin" ON public.reviews
  FOR DELETE TO authenticated
  USING (
    auth.uid() = reviewer_id OR
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.user_id = auth.uid() AND profiles.is_admin = true
    )
  );

-- Review Reports RLS Policies
DROP POLICY IF EXISTS "review_reports_select_reporter_or_admin" ON public.review_reports;
CREATE POLICY "review_reports_select_reporter_or_admin" ON public.review_reports
  FOR SELECT TO authenticated
  USING (
    auth.uid() = reporter_id OR
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.user_id = auth.uid() AND profiles.is_admin = true
    )
  );

DROP POLICY IF EXISTS "review_reports_insert_authenticated" ON public.review_reports;
CREATE POLICY "review_reports_insert_authenticated" ON public.review_reports
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = reporter_id);

DROP POLICY IF EXISTS "review_reports_update_admin" ON public.review_reports;
CREATE POLICY "review_reports_update_admin" ON public.review_reports
  FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.user_id = auth.uid() AND profiles.is_admin = true
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.user_id = auth.uid() AND profiles.is_admin = true
    )
  );

-- 5. Authoritative Database Rating Recalculation Trigger Function
CREATE OR REPLACE FUNCTION recalculate_service_and_seller_ratings(
  p_service_id uuid,
  p_seller_id uuid
)
RETURNS void AS $$
DECLARE
  v_avg_rating numeric(3,2) := 0;
  v_count integer := 0;
BEGIN
  -- Aggregate active, non-hidden reviews for the service
  SELECT 
    COALESCE(ROUND(AVG(rating)::numeric, 2), 0),
    COUNT(*)
  INTO v_avg_rating, v_count
  FROM public.reviews
  WHERE service_id = p_service_id
    AND is_hidden = false
    AND moderation_status <> 'hidden';

  -- Update service listing
  UPDATE public.services
  SET 
    rating = v_avg_rating,
    reviews_count = v_count,
    updated_at = now()
  WHERE id = p_service_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 6. Atomic RPC: submit_verified_review
CREATE OR REPLACE FUNCTION submit_verified_review(
  p_order_id uuid,
  p_rating integer,
  p_comment text,
  p_reviewer_id uuid
)
RETURNS jsonb AS $$
DECLARE
  v_order record;
  v_existing_review_id uuid;
  v_new_review_id uuid;
  v_clean_comment text;
BEGIN
  -- 1. Caller verification
  IF auth.uid() IS NULL OR auth.uid() <> p_reviewer_id THEN
    RAISE EXCEPTION 'Unauthorized: You can only submit reviews under your own verified identity.';
  END IF;

  -- 2. Input validation
  IF p_rating < 1 OR p_rating > 5 THEN
    RAISE EXCEPTION 'Validation error: Rating must be an integer between 1 and 5.';
  END IF;

  v_clean_comment := trim(coalesce(p_comment, ''));
  IF length(v_clean_comment) < 5 THEN
    RAISE EXCEPTION 'Validation error: Review comment must be at least 5 characters long.';
  END IF;

  IF length(v_clean_comment) > 1000 THEN
    RAISE EXCEPTION 'Validation error: Review comment cannot exceed 1000 characters.';
  END IF;

  -- 3. Fetch and validate completed order
  SELECT id, service_id, buyer_id, seller_id, status
  INTO v_order
  FROM public.orders
  WHERE id = p_order_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Order not found: A review can only be submitted for a valid order.';
  END IF;

  IF v_order.status <> 'completed' THEN
    RAISE EXCEPTION 'Eligibility violation: Reviews can only be submitted after an order is genuinely completed.';
  END IF;

  IF v_order.buyer_id <> p_reviewer_id THEN
    RAISE EXCEPTION 'Unauthorized: Only the verified buyer of this order can leave a review.';
  END IF;

  IF v_order.seller_id = p_reviewer_id THEN
    RAISE EXCEPTION 'Self-review violation: Providers cannot review their own service listings.';
  END IF;

  -- 4. Check for duplicate review on this order
  SELECT id INTO v_existing_review_id
  FROM public.reviews
  WHERE order_id = p_order_id;

  IF v_existing_review_id IS NOT NULL THEN
    RAISE EXCEPTION 'Duplicate review: You have already submitted a review for this completed order.';
  END IF;

  -- 5. Insert verified review
  INSERT INTO public.reviews (
    order_id,
    service_id,
    reviewer_id,
    reviewee_id,
    rating,
    comment,
    is_hidden,
    moderation_status,
    created_at,
    updated_at
  ) VALUES (
    v_order.id,
    v_order.service_id,
    p_reviewer_id,
    v_order.seller_id,
    p_rating,
    v_clean_comment,
    false,
    'published',
    now(),
    now()
  )
  RETURNING id INTO v_new_review_id;

  -- 6. Recalculate authoritative averages
  PERFORM recalculate_service_and_seller_ratings(v_order.service_id, v_order.seller_id);

  -- 7. Trigger in-app notification to seller
  INSERT INTO public.notifications (
    user_id,
    title,
    message,
    type,
    link,
    dedup_key,
    created_at
  ) VALUES (
    v_order.seller_id,
    'New Verified Review Received! ⭐',
    format('Received %s stars: "%s"', p_rating, substring(v_clean_comment from 1 for 60)),
    'review_received',
    format('/orders/%s', p_order_id),
    format('review-%s', p_order_id),
    now()
  )
  ON CONFLICT (dedup_key) DO NOTHING;

  RETURN jsonb_build_object(
    'success', true,
    'review_id', v_new_review_id,
    'order_id', p_order_id,
    'rating', p_rating
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 7. Atomic RPC: moderate_review (Admin Only)
CREATE OR REPLACE FUNCTION moderate_review(
  p_review_id uuid,
  p_action text,
  p_notes text
)
RETURNS jsonb AS $$
DECLARE
  v_is_admin boolean;
  v_review record;
BEGIN
  -- 1. Verify admin privilege
  SELECT is_admin INTO v_is_admin
  FROM public.profiles
  WHERE user_id = auth.uid();

  IF v_is_admin IS NOT TRUE THEN
    RAISE EXCEPTION 'Unauthorized: Only platform administrators can moderate reviews.';
  END IF;

  -- 2. Fetch review
  SELECT id, service_id, reviewee_id, is_hidden, moderation_status
  INTO v_review
  FROM public.reviews
  WHERE id = p_review_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Review not found.';
  END IF;

  -- 3. Execute moderation action
  IF p_action = 'hide' THEN
    UPDATE public.reviews
    SET 
      is_hidden = true,
      moderation_status = 'hidden',
      updated_at = now()
    WHERE id = p_review_id;

    UPDATE public.review_reports
    SET 
      status = 'resolved',
      resolved_by = auth.uid(),
      resolved_at = now()
    WHERE review_id = p_review_id AND status = 'pending';

  ELSIF p_action = 'restore' THEN
    UPDATE public.reviews
    SET 
      is_hidden = false,
      moderation_status = 'published',
      updated_at = now()
    WHERE id = p_review_id;

  ELSIF p_action = 'dismiss' THEN
    UPDATE public.reviews
    SET 
      moderation_status = 'published',
      updated_at = now()
    WHERE id = p_review_id;

    UPDATE public.review_reports
    SET 
      status = 'dismissed',
      resolved_by = auth.uid(),
      resolved_at = now()
    WHERE review_id = p_review_id AND status = 'pending';

  ELSE
    RAISE EXCEPTION 'Invalid moderation action: Must be hide, restore, or dismiss.';
  END IF;

  -- 4. Recalculate ratings so hidden reviews are excluded and restored reviews are included
  PERFORM recalculate_service_and_seller_ratings(v_review.service_id, v_review.reviewee_id);

  RETURN jsonb_build_object(
    'success', true,
    'review_id', p_review_id,
    'action', p_action
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
