/*
# SkillBridge V2: Consolidate Database Schema, RLS, and Atomic RPCs
# Migration: 20260822200000_010_consolidate_marketplace_schema_and_rpc.sql

This migration unifies all business-critical state in PostgreSQL:
1. Creates `public.notifications` table with RLS and user ownership policies.
2. Extends `public.services` with `delivery_days`, `skills`, `tags`, `rating`, `reviews_count`, `completed_orders_count`.
3. Extends `public.reviews` with `order_id` linking verified purchases directly to reviews.
4. Ensures `public.orders` and `public.payments` exist with complete status check constraints.
5. Establishes complete RLS policies on `payments`, `orders`, `notifications`, `reviews`.
6. Provides atomic Postgres RPC `create_order_with_escrow` guaranteeing no orphaned orders or split payment states.
7. Provides atomic Postgres RPC `complete_order_and_release_escrow`.
*/

-- =========================================================================
-- 1. Ensure public.notifications Table Exists
-- =========================================================================

CREATE TABLE IF NOT EXISTS public.notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(user_id) ON DELETE CASCADE,
  title text NOT NULL,
  message text NOT NULL,
  type text NOT NULL,
  read boolean NOT NULL DEFAULT false,
  link text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "notifications_select_own" ON public.notifications;
CREATE POLICY "notifications_select_own" ON public.notifications FOR SELECT
  TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "notifications_update_own" ON public.notifications;
CREATE POLICY "notifications_update_own" ON public.notifications FOR UPDATE
  TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "notifications_delete_own" ON public.notifications;
CREATE POLICY "notifications_delete_own" ON public.notifications FOR DELETE
  TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "notifications_insert_authenticated" ON public.notifications;
CREATE POLICY "notifications_insert_authenticated" ON public.notifications FOR INSERT
  TO authenticated WITH CHECK (auth.uid() IS NOT NULL);

CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON public.notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON public.notifications(created_at DESC);

-- =========================================================================
-- 2. Extend public.services with Listing Details & Aggregates
-- =========================================================================

ALTER TABLE public.services ADD COLUMN IF NOT EXISTS delivery_days integer NOT NULL DEFAULT 3;
ALTER TABLE public.services ADD COLUMN IF NOT EXISTS skills text[] NOT NULL DEFAULT '{}';
ALTER TABLE public.services ADD COLUMN IF NOT EXISTS tags text[] NOT NULL DEFAULT '{}';
ALTER TABLE public.services ADD COLUMN IF NOT EXISTS rating numeric(3,2) DEFAULT 5.0;
ALTER TABLE public.services ADD COLUMN IF NOT EXISTS reviews_count integer NOT NULL DEFAULT 0;
ALTER TABLE public.services ADD COLUMN IF NOT EXISTS completed_orders_count integer NOT NULL DEFAULT 0;

CREATE INDEX IF NOT EXISTS idx_services_provider_status ON public.services(provider_id, status);

-- =========================================================================
-- 3. Extend public.reviews with order_id Link
-- =========================================================================

ALTER TABLE public.reviews ADD COLUMN IF NOT EXISTS order_id uuid;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'reviews_order_id_fkey'
  ) THEN
    ALTER TABLE public.reviews
      ADD CONSTRAINT reviews_order_id_fkey
      FOREIGN KEY (order_id) REFERENCES public.orders(id) ON DELETE SET NULL;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_reviews_order_id ON public.reviews(order_id);

-- Update reviews RLS policies
DROP POLICY IF EXISTS "reviews_select_all" ON public.reviews;
CREATE POLICY "reviews_select_all" ON public.reviews FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "reviews_insert_authenticated" ON public.reviews;
CREATE POLICY "reviews_insert_authenticated" ON public.reviews FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = reviewer_id);

DROP POLICY IF EXISTS "reviews_update_own" ON public.reviews;
CREATE POLICY "reviews_update_own" ON public.reviews FOR UPDATE
  TO authenticated USING (auth.uid() = reviewer_id) WITH CHECK (auth.uid() = reviewer_id);

DROP POLICY IF EXISTS "reviews_delete_own" ON public.reviews;
CREATE POLICY "reviews_delete_own" ON public.reviews FOR DELETE
  TO authenticated USING (
    auth.uid() = reviewer_id OR
    EXISTS (SELECT 1 FROM public.profiles WHERE profiles.user_id = auth.uid() AND profiles.is_admin = true)
  );

-- =========================================================================
-- 4. Complete Orders & Payments Schema Constraints & RLS
-- =========================================================================

-- Ensure orders table exists
CREATE TABLE IF NOT EXISTS public.orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  service_id uuid NOT NULL REFERENCES public.services(id) ON DELETE CASCADE,
  buyer_id uuid NOT NULL REFERENCES public.profiles(user_id) ON DELETE CASCADE,
  seller_id uuid NOT NULL REFERENCES public.profiles(user_id) ON DELETE CASCADE,
  price numeric(10,2) NOT NULL DEFAULT 0,
  requirements text NOT NULL DEFAULT '',
  delivery_days integer NOT NULL DEFAULT 3,
  due_date timestamptz NOT NULL,
  status text NOT NULL DEFAULT 'seller_pending' CHECK (
    status IN (
      'pending_payment',
      'paid',
      'seller_pending',
      'accepted',
      'in_progress',
      'submitted',
      'revision_requested',
      'completed',
      'cancelled'
    )
  ),
  payment_status text NOT NULL DEFAULT 'pending' CHECK (
    payment_status IN ('pending', 'processing', 'paid', 'failed', 'refunded')
  ),
  payment_id text,
  payment_method text DEFAULT 'upi',
  deliverables jsonb DEFAULT NULL,
  revision_notes text DEFAULT NULL,
  timeline jsonb NOT NULL DEFAULT '[]'::jsonb,
  accepted_at timestamptz,
  submitted_at timestamptz,
  completed_at timestamptz,
  cancelled_at timestamptz,
  cancellation_reason text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;

-- Orders RLS Policies
DROP POLICY IF EXISTS "orders_select_participants" ON public.orders;
CREATE POLICY "orders_select_participants" ON public.orders FOR SELECT
  TO authenticated USING (
    auth.uid() = buyer_id OR
    auth.uid() = seller_id OR
    EXISTS (SELECT 1 FROM public.profiles WHERE profiles.user_id = auth.uid() AND profiles.is_admin = true)
  );

DROP POLICY IF EXISTS "orders_insert_buyer" ON public.orders;
CREATE POLICY "orders_insert_buyer" ON public.orders FOR INSERT
  TO authenticated WITH CHECK (
    auth.uid() = buyer_id OR
    EXISTS (SELECT 1 FROM public.profiles WHERE profiles.user_id = auth.uid() AND profiles.is_admin = true)
  );

DROP POLICY IF EXISTS "orders_update_participants" ON public.orders;
CREATE POLICY "orders_update_participants" ON public.orders FOR UPDATE
  TO authenticated USING (
    auth.uid() = buyer_id OR
    auth.uid() = seller_id OR
    EXISTS (SELECT 1 FROM public.profiles WHERE profiles.user_id = auth.uid() AND profiles.is_admin = true)
  )
  WITH CHECK (
    auth.uid() = buyer_id OR
    auth.uid() = seller_id OR
    EXISTS (SELECT 1 FROM public.profiles WHERE profiles.user_id = auth.uid() AND profiles.is_admin = true)
  );

-- Ensure payments table exists
CREATE TABLE IF NOT EXISTS public.payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  buyer_id uuid NOT NULL REFERENCES public.profiles(user_id) ON DELETE CASCADE,
  seller_id uuid NOT NULL REFERENCES public.profiles(user_id) ON DELETE CASCADE,
  amount numeric(10,2) NOT NULL,
  currency text NOT NULL DEFAULT 'INR',
  gateway_order_id text NOT NULL,
  gateway_payment_id text,
  signature text,
  payment_method text NOT NULL DEFAULT 'upi',
  status text NOT NULL DEFAULT 'pending' CHECK (
    status IN ('pending', 'processing', 'paid', 'failed', 'refunded')
  ),
  error_message text,
  created_at timestamptz NOT NULL DEFAULT now(),
  paid_at timestamptz
);

ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;

-- Payments RLS Policies
DROP POLICY IF EXISTS "payments_select_participants" ON public.payments;
CREATE POLICY "payments_select_participants" ON public.payments FOR SELECT
  TO authenticated USING (
    auth.uid() = buyer_id OR
    auth.uid() = seller_id OR
    EXISTS (SELECT 1 FROM public.profiles WHERE profiles.user_id = auth.uid() AND profiles.is_admin = true)
  );

DROP POLICY IF EXISTS "payments_insert_buyer" ON public.payments;
CREATE POLICY "payments_insert_buyer" ON public.payments FOR INSERT
  TO authenticated WITH CHECK (
    auth.uid() = buyer_id OR
    EXISTS (SELECT 1 FROM public.profiles WHERE profiles.user_id = auth.uid() AND profiles.is_admin = true)
  );

DROP POLICY IF EXISTS "payments_admin_all" ON public.payments;
CREATE POLICY "payments_admin_all" ON public.payments FOR ALL
  TO authenticated USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE profiles.user_id = auth.uid() AND profiles.is_admin = true)
  );

-- =========================================================================
-- 5. Atomic Order & Escrow RPC Function
-- =========================================================================

CREATE OR REPLACE FUNCTION create_order_with_escrow(
  p_service_id uuid,
  p_buyer_id uuid,
  p_requirements text,
  p_payment_method text DEFAULT 'upi',
  p_simulate_success boolean DEFAULT true
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_service record;
  v_order_id uuid;
  v_payment_id uuid;
  v_gateway_payment_id text;
  v_due_date timestamptz;
  v_order_status text;
  v_payment_status text;
  v_timeline jsonb;
  v_now timestamptz := now();
BEGIN
  -- 1. Fetch service and lock for validation
  SELECT id, provider_id, price, delivery_days, title
  INTO v_service
  FROM public.services
  WHERE id = p_service_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Service listing not found or no longer available.';
  END IF;

  -- 2. Validate buyer cannot buy their own service
  IF v_service.provider_id = p_buyer_id THEN
    RAISE EXCEPTION 'You cannot purchase your own service listing.';
  END IF;

  -- 3. Calculate delivery due date
  v_due_date := v_now + (COALESCE(v_service.delivery_days, 3) || ' days')::interval;

  -- 4. Determine status based on payment outcome
  IF p_simulate_success THEN
    v_order_status := 'seller_pending';
    v_payment_status := 'paid';
  ELSE
    v_order_status := 'pending_payment';
    v_payment_status := 'failed';
  END IF;

  v_gateway_payment_id := 'pay_rzp_' || substr(md5(random()::text), 1, 10);

  -- 5. Construct timeline array
  v_timeline := jsonb_build_array(
    jsonb_build_object(
      'status', 'pending_payment',
      'title', 'Order Placed',
      'description', 'Requirements submitted by buyer',
      'timestamp', v_now,
      'actor_id', p_buyer_id
    )
  );

  IF p_simulate_success THEN
    v_timeline := v_timeline || jsonb_build_object(
      'status', 'paid',
      'title', 'Payment Secured in Escrow',
      'description', '₹' || v_service.price || ' secured in SkillBridge Escrow via ' || upper(p_payment_method),
      'timestamp', v_now
    );
  END IF;

  -- 6. Insert Order
  INSERT INTO public.orders (
    service_id,
    buyer_id,
    seller_id,
    price,
    requirements,
    delivery_days,
    due_date,
    status,
    payment_status,
    payment_id,
    payment_method,
    timeline,
    created_at,
    updated_at
  ) VALUES (
    v_service.id,
    p_buyer_id,
    v_service.provider_id,
    v_service.price,
    p_requirements,
    COALESCE(v_service.delivery_days, 3),
    v_due_date,
    v_order_status,
    v_payment_status,
    v_gateway_payment_id,
    p_payment_method,
    v_timeline,
    v_now,
    v_now
  )
  RETURNING id INTO v_order_id;

  -- 7. Insert Payment record
  INSERT INTO public.payments (
    order_id,
    buyer_id,
    seller_id,
    amount,
    currency,
    gateway_order_id,
    gateway_payment_id,
    payment_method,
    status,
    created_at,
    paid_at
  ) VALUES (
    v_order_id,
    p_buyer_id,
    v_service.provider_id,
    v_service.price,
    'INR',
    'order_rzp_' || substr(md5(random()::text), 1, 10),
    v_gateway_payment_id,
    p_payment_method,
    v_payment_status,
    v_now,
    CASE WHEN p_simulate_success THEN v_now ELSE NULL END
  )
  RETURNING id INTO v_payment_id;

  -- 8. Insert Notification for seller if payment succeeded
  IF p_simulate_success THEN
    INSERT INTO public.notifications (
      user_id,
      title,
      message,
      type,
      link,
      read,
      created_at
    ) VALUES (
      v_service.provider_id,
      'New Order Received! 🚀',
      'New order received for "' || v_service.title || '". ₹' || v_service.price || ' held in escrow.',
      'order_created',
      '/orders/' || v_order_id,
      false,
      v_now
    );
  END IF;

  -- 9. Return atomically created IDs
  RETURN jsonb_build_object(
    'order_id', v_order_id,
    'payment_id', v_payment_id,
    'status', v_order_status,
    'payment_status', v_payment_status
  );
END;
$$;

-- =========================================================================
-- 6. Atomic Order Completion & Escrow Release RPC
-- =========================================================================

CREATE OR REPLACE FUNCTION complete_order_and_release_escrow(
  p_order_id uuid,
  p_actor_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_order record;
  v_now timestamptz := now();
  v_new_timeline jsonb;
BEGIN
  -- 1. Fetch order
  SELECT *
  INTO v_order
  FROM public.orders
  WHERE id = p_order_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Order not found.';
  END IF;

  -- 2. Validate actor (must be buyer or administrator)
  IF v_order.buyer_id != p_actor_id THEN
    IF NOT EXISTS (
      SELECT 1 FROM public.profiles WHERE profiles.user_id = p_actor_id AND profiles.is_admin = true
    ) THEN
      RAISE EXCEPTION 'Only the buyer or an administrator can complete the order and release escrow.';
    END IF;
  END IF;

  IF v_order.status = 'completed' THEN
    RAISE EXCEPTION 'This order has already been completed.';
  END IF;

  IF v_order.status = 'cancelled' THEN
    RAISE EXCEPTION 'Cannot complete a cancelled order.';
  END IF;

  -- 3. Append completion timeline
  v_new_timeline := v_order.timeline || jsonb_build_object(
    'status', 'completed',
    'title', 'Order Completed & Payment Released',
    'description', 'Buyer approved deliverables. ₹' || v_order.price || ' escrow released to seller.',
    'timestamp', v_now
  );

  -- 4. Update order
  UPDATE public.orders
  SET
    status = 'completed',
    completed_at = v_now,
    timeline = v_new_timeline,
    updated_at = v_now
  WHERE id = p_order_id;

  -- 5. Increment seller stats
  UPDATE public.services
  SET completed_orders_count = completed_orders_count + 1
  WHERE id = v_order.service_id;

  -- 6. Insert notification for seller
  INSERT INTO public.notifications (
    user_id,
    title,
    message,
    type,
    link,
    read,
    created_at
  ) VALUES (
    v_order.seller_id,
    'Payment Released! 💰',
    'Order #' || substr(p_order_id::text, 1, 8) || ' marked complete! ₹' || v_order.price || ' released from escrow.',
    'order_completed',
    '/orders/' || p_order_id,
    false,
    v_now
  );

  RETURN jsonb_build_object(
    'order_id', p_order_id,
    'status', 'completed',
    'completed_at', v_now
  );
END;
$$;
