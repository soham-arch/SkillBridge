-- SkillBridge Feature 08: Functional Payments & Transaction Management
-- Migration: 20260822230000_013_payments_and_transactions.sql
--
-- 1. Updates payments table with metadata, refunded_at, and 'cancelled' status
-- 2. Creates payment_webhook_events table for idempotent webhook handling
-- 3. Implements atomic RPCs: confirm_verified_payment, cancel_payment_order, refund_order_payment
-- 4. Enforces RLS preventing client-side forgery of successful payments

-- 1. Extend payments status constraint to include 'cancelled'
DO $$
BEGIN
  -- Alter table columns if not exists
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'payments' AND column_name = 'metadata'
  ) THEN
    ALTER TABLE public.payments ADD COLUMN metadata jsonb DEFAULT '{}'::jsonb;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'payments' AND column_name = 'refunded_at'
  ) THEN
    ALTER TABLE public.payments ADD COLUMN refunded_at timestamptz DEFAULT NULL;
  END IF;
END $$;

-- Drop and recreate check constraint to ensure 'cancelled' is permitted
ALTER TABLE public.payments DROP CONSTRAINT IF EXISTS payments_status_check;
ALTER TABLE public.payments ADD CONSTRAINT payments_status_check CHECK (
  status IN ('pending', 'processing', 'paid', 'failed', 'refunded', 'cancelled')
);

-- 2. Create payment_webhook_events table for webhook idempotency
CREATE TABLE IF NOT EXISTS public.payment_webhook_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id text UNIQUE NOT NULL,
  event_type text NOT NULL,
  provider text NOT NULL DEFAULT 'razorpay',
  payload jsonb NOT NULL,
  processed boolean NOT NULL DEFAULT false,
  processed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.payment_webhook_events ENABLE ROW LEVEL SECURITY;

-- Only admins / server service role can read or mutate webhook events
DROP POLICY IF EXISTS "webhook_events_admin_only" ON public.payment_webhook_events;
CREATE POLICY "webhook_events_admin_only" ON public.payment_webhook_events
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.user_id = auth.uid() AND profiles.is_admin = true
    )
  );

-- 3. Restrict direct client update on payments status (prevent client-side mark as paid)
DROP POLICY IF EXISTS "payments_update_participants" ON public.payments;
DROP POLICY IF EXISTS "payments_update_admin_only" ON public.payments;
CREATE POLICY "payments_update_admin_only" ON public.payments
  FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.user_id = auth.uid() AND profiles.is_admin = true
    )
  );

-- 4. Atomic PostgreSQL RPC: confirm_verified_payment
-- Called server-side after cryptographic HMAC-SHA256 signature verification succeeds
CREATE OR REPLACE FUNCTION public.confirm_verified_payment(
  p_order_id uuid,
  p_gateway_order_id text,
  p_gateway_payment_id text,
  p_signature text,
  p_payment_method text DEFAULT 'upi'
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_order record;
  v_now timestamptz := now();
  v_timeline jsonb;
  v_timeline_entry jsonb;
BEGIN
  -- 1. Lock and retrieve order
  SELECT * INTO v_order
  FROM public.orders
  WHERE id = p_order_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Order % does not exist.', p_order_id;
  END IF;

  -- 2. Idempotency check: if order is already paid, return early
  IF v_order.payment_status = 'paid' THEN
    RETURN jsonb_build_object(
      'success', true,
      'order_id', v_order.id,
      'status', v_order.status,
      'payment_status', v_order.payment_status,
      'message', 'Payment already confirmed and in escrow'
    );
  END IF;

  -- 3. Construct timeline entry
  v_timeline_entry := jsonb_build_object(
    'status', 'paid',
    'title', 'Payment Verified & Secured in Escrow',
    'description', '₹' || v_order.price || ' secured in SkillBridge Escrow via Razorpay Test Mode (' || p_gateway_payment_id || ')',
    'timestamp', v_now
  );

  v_timeline := COALESCE(v_order.timeline, '[]'::jsonb) || jsonb_build_array(v_timeline_entry);

  -- 4. Update order status to seller_pending and payment_status to paid
  UPDATE public.orders
  SET
    status = 'seller_pending',
    payment_status = 'paid',
    payment_id = p_gateway_payment_id,
    payment_method = p_payment_method,
    timeline = v_timeline,
    updated_at = v_now
  WHERE id = p_order_id;

  -- 5. Update or insert payment record
  UPDATE public.payments
  SET
    status = 'paid',
    gateway_payment_id = p_gateway_payment_id,
    signature = p_signature,
    paid_at = v_now
  WHERE order_id = p_order_id AND (gateway_order_id = p_gateway_order_id OR status = 'pending');

  -- 6. If consultation booking exists, confirm the slot
  IF v_order.booking_id IS NOT NULL THEN
    UPDATE public.bookings
    SET status = 'confirmed'
    WHERE id = v_order.booking_id;
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'order_id', v_order.id,
    'status', 'seller_pending',
    'payment_status', 'paid',
    'gateway_payment_id', p_gateway_payment_id
  );
END;
$$;

-- 5. Atomic PostgreSQL RPC: cancel_payment_order
-- Called when buyer cancels during checkout or when payment gateway returns a terminal failure
CREATE OR REPLACE FUNCTION public.cancel_payment_order(
  p_order_id uuid,
  p_buyer_id uuid,
  p_reason text DEFAULT 'Buyer cancelled payment during checkout'
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_order record;
  v_now timestamptz := now();
  v_timeline jsonb;
  v_timeline_entry jsonb;
BEGIN
  SELECT * INTO v_order
  FROM public.orders
  WHERE id = p_order_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Order % does not exist.', p_order_id;
  END IF;

  IF v_order.buyer_id <> p_buyer_id THEN
    RAISE EXCEPTION 'Unauthorized: Only the buyer can cancel an unconfirmed checkout.';
  END IF;

  IF v_order.payment_status = 'paid' THEN
    RAISE EXCEPTION 'Cannot cancel an order through payment gateway cancellation after payment has been verified. Use standard cancellation flow.';
  END IF;

  v_timeline_entry := jsonb_build_object(
    'status', 'cancelled',
    'title', 'Checkout Cancelled',
    'description', p_reason,
    'timestamp', v_now,
    'actor_id', p_buyer_id
  );

  v_timeline := COALESCE(v_order.timeline, '[]'::jsonb) || jsonb_build_array(v_timeline_entry);

  UPDATE public.orders
  SET
    status = 'cancelled',
    payment_status = 'failed',
    cancellation_reason = p_reason,
    cancelled_at = v_now,
    timeline = v_timeline,
    updated_at = v_now
  WHERE id = p_order_id;

  UPDATE public.payments
  SET
    status = 'cancelled',
    error_message = p_reason
  WHERE order_id = p_order_id;

  -- Free any consultation booking slot
  IF v_order.booking_id IS NOT NULL THEN
    UPDATE public.bookings
    SET status = 'cancelled'
    WHERE id = v_order.booking_id;
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'order_id', v_order.id,
    'status', 'cancelled',
    'payment_status', 'failed'
  );
END;
$$;

-- 6. Atomic PostgreSQL RPC: refund_order_payment
-- Called when seller declines or overdue order is cancelled by buyer
CREATE OR REPLACE FUNCTION public.refund_order_payment(
  p_order_id uuid,
  p_reason text DEFAULT 'Order cancelled or rejected'
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_order record;
  v_now timestamptz := now();
BEGIN
  SELECT * INTO v_order
  FROM public.orders
  WHERE id = p_order_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Order % does not exist.', p_order_id;
  END IF;

  UPDATE public.orders
  SET
    payment_status = 'refunded',
    updated_at = v_now
  WHERE id = p_order_id;

  UPDATE public.payments
  SET
    status = 'refunded',
    refunded_at = v_now,
    error_message = p_reason
  WHERE order_id = p_order_id;

  RETURN jsonb_build_object(
    'success', true,
    'order_id', p_order_id,
    'payment_status', 'refunded'
  );
END;
$$;
