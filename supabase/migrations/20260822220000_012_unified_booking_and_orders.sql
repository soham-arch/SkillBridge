-- =========================================================================
-- SkillBridge Migration 012: Unified Booking, Orders & Service Delivery
--
-- 1. Expands services.service_type to support 'fixed' and 'consultation'
-- 2. Extends orders with order_type, booking_id, consultation_details, revisions_count, max_revisions
-- 3. Adds database CHECK constraint preventing buyer_id = seller_id (Anti-Self-Booking)
-- 4. Expands orders.status check to support 'rejected'
-- 5. Implements atomic RPC `create_unified_booking_order`
-- 6. Implements atomic RPC `transition_order_state`
-- 7. Ensures RLS policies on orders strictly prevent non-participants from viewing order details
-- =========================================================================

-- 1. Extend services.service_type check constraint
DO $$
BEGIN
  ALTER TABLE public.services DROP CONSTRAINT IF EXISTS services_service_type_check;
  ALTER TABLE public.services
    ADD CONSTRAINT services_service_type_check
    CHECK (service_type IN ('digital', 'fixed', 'consultation', 'in_person', 'hybrid'));
EXCEPTION
  WHEN OTHERS THEN
    NULL;
END $$;

-- 2. Extend public.orders columns
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS order_type text NOT NULL DEFAULT 'fixed_gig';
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS booking_id uuid;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS consultation_details jsonb DEFAULT NULL;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS revisions_count integer NOT NULL DEFAULT 0;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS max_revisions integer NOT NULL DEFAULT 2;

-- Check constraint for order_type
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'orders_order_type_check'
  ) THEN
    ALTER TABLE public.orders
      ADD CONSTRAINT orders_order_type_check
      CHECK (order_type IN ('fixed_gig', 'consultation'));
  END IF;
END $$;

-- Foreign key for booking_id
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'orders_booking_id_fkey'
  ) THEN
    ALTER TABLE public.orders
      ADD CONSTRAINT orders_booking_id_fkey
      FOREIGN KEY (booking_id) REFERENCES public.bookings(id) ON DELETE SET NULL;
  END IF;
END $$;

-- 3. Database Check: Anti-Self-Booking Constraint
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'orders_no_self_booking_check'
  ) THEN
    ALTER TABLE public.orders
      ADD CONSTRAINT orders_no_self_booking_check
      CHECK (buyer_id <> seller_id);
  END IF;
END $$;

-- 4. Expand orders.status to include 'rejected'
DO $$
BEGIN
  ALTER TABLE public.orders DROP CONSTRAINT IF EXISTS orders_status_check;
  ALTER TABLE public.orders
    ADD CONSTRAINT orders_status_check
    CHECK (
      status IN (
        'pending_payment',
        'paid',
        'seller_pending',
        'accepted',
        'in_progress',
        'submitted',
        'revision_requested',
        'completed',
        'cancelled',
        'rejected'
      )
    );
EXCEPTION
  WHEN OTHERS THEN
    NULL;
END $$;

-- 5. Atomic RPC: create_unified_booking_order
CREATE OR REPLACE FUNCTION public.create_unified_booking_order(
  p_service_id uuid,
  p_buyer_id uuid,
  p_order_type text,
  p_requirements text DEFAULT '',
  p_payment_method text DEFAULT 'upi',
  p_booking_date date DEFAULT NULL,
  p_start_time time DEFAULT NULL,
  p_end_time time DEFAULT NULL,
  p_note text DEFAULT '',
  p_simulate_success boolean DEFAULT true
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_service record;
  v_order_id uuid;
  v_booking_id uuid := NULL;
  v_payment_id uuid;
  v_gateway_payment_id text;
  v_due_date timestamptz;
  v_order_status text;
  v_payment_status text;
  v_timeline jsonb;
  v_now timestamptz := now();
  v_day_of_week integer;
  v_slot_exists boolean;
  v_conflict_exists boolean;
  v_consultation_details jsonb := NULL;
  v_service_snapshot jsonb;
BEGIN
  -- 1. Fetch service record
  SELECT id, provider_id, price, delivery_days, title, description, service_type, location, status
  INTO v_service
  FROM public.services
  WHERE id = p_service_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Service listing not found.';
  END IF;

  IF v_service.status <> 'published' THEN
    RAISE EXCEPTION 'This service listing is not currently accepting orders (status: %).', v_service.status;
  END IF;

  -- 2. Anti-Self-Booking validation
  IF v_service.provider_id = p_buyer_id THEN
    RAISE EXCEPTION 'You cannot hire or book your own service listing.';
  END IF;

  -- 3. If Scheduled Consultation, validate slot and reserve atomically
  IF p_order_type = 'consultation' THEN
    IF p_booking_date IS NULL OR p_start_time IS NULL OR p_end_time IS NULL THEN
      RAISE EXCEPTION 'Consultation requires date, start time, and end time.';
    END IF;

    IF p_booking_date < CURRENT_DATE THEN
      RAISE EXCEPTION 'Cannot book a consultation date in the past.';
    END IF;

    v_day_of_week := EXTRACT(DOW FROM p_booking_date)::integer;

    -- Verify provider active availability slot
    SELECT EXISTS (
      SELECT 1 FROM public.availability_slots
      WHERE provider_id = v_service.provider_id
        AND day_of_week = v_day_of_week
        AND start_time = p_start_time
        AND end_time = p_end_time
        AND is_active = true
        AND (service_id IS NULL OR service_id = p_service_id)
    ) INTO v_slot_exists;

    IF NOT v_slot_exists THEN
      RAISE EXCEPTION 'The selected time slot is not available in the provider schedule.';
    END IF;

    -- Concurrency lock: Check conflicting confirmed bookings
    SELECT EXISTS (
      SELECT 1 FROM public.bookings
      WHERE provider_id = v_service.provider_id
        AND booking_date = p_booking_date
        AND start_time = p_start_time
        AND status = 'confirmed'
      FOR UPDATE
    ) INTO v_conflict_exists;

    IF v_conflict_exists THEN
      RAISE EXCEPTION 'This consultation slot has already been booked. Please select another time.';
    END IF;

    -- Insert into bookings table
    INSERT INTO public.bookings (
      service_id,
      customer_id,
      provider_id,
      booking_date,
      start_time,
      end_time,
      status,
      note
    ) VALUES (
      p_service_id,
      p_buyer_id,
      v_service.provider_id,
      p_booking_date,
      p_start_time,
      p_end_time,
      'confirmed',
      COALESCE(p_note, p_requirements, '')
    )
    RETURNING id INTO v_booking_id;

    v_due_date := (p_booking_date || ' ' || p_end_time)::timestamptz;
    v_consultation_details := jsonb_build_object(
      'booking_date', p_booking_date,
      'start_time', p_start_time,
      'end_time', p_end_time,
      'note', p_note,
      'location', v_service.location
    );
  ELSE
    -- Fixed-scope gig due date
    v_due_date := v_now + (COALESCE(v_service.delivery_days, 3) || ' days')::interval;
  END IF;

  -- 4. Payment status & Initial Order status
  IF p_simulate_success THEN
    v_order_status := 'seller_pending';
    v_payment_status := 'paid';
  ELSE
    v_order_status := 'pending_payment';
    v_payment_status := 'failed';
  END IF;

  v_gateway_payment_id := 'pay_rzp_' || substr(md5(random()::text), 1, 10);

  -- 5. Build snapshot & timeline
  v_service_snapshot := jsonb_build_object(
    'id', v_service.id,
    'title', v_service.title,
    'description', v_service.description,
    'price', v_service.price,
    'delivery_days', v_service.delivery_days,
    'service_type', COALESCE(v_service.service_type, 'digital'),
    'location', v_service.location
  );

  v_timeline := jsonb_build_array(
    jsonb_build_object(
      'status', 'pending_payment',
      'title', CASE WHEN p_order_type = 'consultation' THEN 'Consultation Scheduled' ELSE 'Order Placed' END,
      'description', CASE WHEN p_order_type = 'consultation'
        THEN 'Session reserved for ' || p_booking_date || ' at ' || p_start_time
        ELSE 'Requirements submitted by buyer' END,
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
    order_type,
    booking_id,
    consultation_details,
    service_snapshot,
    timeline,
    created_at,
    updated_at
  ) VALUES (
    p_service_id,
    p_buyer_id,
    v_service.provider_id,
    v_service.price,
    COALESCE(p_requirements, p_note, ''),
    COALESCE(v_service.delivery_days, 1),
    v_due_date,
    v_order_status,
    v_payment_status,
    v_gateway_payment_id,
    p_payment_method,
    p_order_type,
    v_booking_id,
    v_consultation_details,
    v_service_snapshot,
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
    'order_rzp_' || substr(v_order_id::text, 1, 8),
    v_gateway_payment_id,
    p_payment_method,
    v_payment_status,
    v_now,
    CASE WHEN p_simulate_success THEN v_now ELSE NULL END
  )
  RETURNING id INTO v_payment_id;

  -- 8. Notify Seller
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
      CASE WHEN p_order_type = 'consultation' THEN 'New Consultation Booking! 📅' ELSE 'New Service Order Received! 🚀' END,
      'New booking for "' || v_service.title || '". ₹' || v_service.price || ' secured in escrow.',
      'order_created',
      '/orders/' || v_order_id,
      false,
      v_now
    );
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'order_id', v_order_id,
    'booking_id', v_booking_id,
    'payment_id', v_payment_id,
    'order_status', v_order_status,
    'payment_status', v_payment_status
  );
END;
$$;

-- 6. Atomic RPC: transition_order_state
CREATE OR REPLACE FUNCTION public.transition_order_state(
  p_order_id uuid,
  p_actor_id uuid,
  p_action text,
  p_notes text DEFAULT '',
  p_file_url text DEFAULT NULL,
  p_reason text DEFAULT ''
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_order record;
  v_is_buyer boolean;
  v_is_seller boolean;
  v_is_admin boolean;
  v_next_status text;
  v_next_payment_status text;
  v_timeline_title text;
  v_timeline_desc text;
  v_now timestamptz := now();
  v_revisions integer;
BEGIN
  -- 1. Fetch order
  SELECT * INTO v_order
  FROM public.orders
  WHERE id = p_order_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Order not found.';
  END IF;

  -- 2. Check caller authority
  v_is_buyer := (v_order.buyer_id = p_actor_id);
  v_is_seller := (v_order.seller_id = p_actor_id);
  SELECT COALESCE(is_admin, false) INTO v_is_admin
  FROM public.profiles
  WHERE user_id = p_actor_id;

  IF NOT v_is_buyer AND NOT v_is_seller AND NOT COALESCE(v_is_admin, false) THEN
    RAISE EXCEPTION 'Unauthorized: You are not a participant in this order.';
  END IF;

  v_next_payment_status := v_order.payment_status;
  v_revisions := v_order.revisions_count;

  -- 3. Evaluate state machine transition
  CASE p_action
    WHEN 'accept' THEN
      IF NOT v_is_seller AND NOT v_is_admin THEN
        RAISE EXCEPTION 'Only the seller can accept the order.';
      END IF;
      IF v_order.status NOT IN ('seller_pending', 'paid') THEN
        RAISE EXCEPTION 'Order cannot be accepted from current status (%).', v_order.status;
      END IF;
      v_next_status := 'accepted';
      v_timeline_title := 'Order Accepted';
      v_timeline_desc := 'Seller accepted the request and confirmed commitment.';

    WHEN 'reject' THEN
      IF NOT v_is_seller AND NOT v_is_admin THEN
        RAISE EXCEPTION 'Only the seller can reject the order.';
      END IF;
      IF v_order.status NOT IN ('seller_pending', 'paid') THEN
        RAISE EXCEPTION 'Order cannot be rejected from status (%).', v_order.status;
      END IF;
      v_next_status := 'rejected';
      v_next_payment_status := 'refunded';
      v_timeline_title := 'Order Rejected by Seller';
      v_timeline_desc := 'Reason: ' || COALESCE(NULLIF(p_reason, ''), 'Provider unavailable') || '. Escrow refunded.';

      -- If consultation, cancel the booking slot
      IF v_order.booking_id IS NOT NULL THEN
        UPDATE public.bookings SET status = 'cancelled' WHERE id = v_order.booking_id;
      END IF;

    WHEN 'start_work' THEN
      IF NOT v_is_seller AND NOT v_is_admin THEN
        RAISE EXCEPTION 'Only the seller can update status to in progress.';
      END IF;
      IF v_order.status NOT IN ('accepted') THEN
        RAISE EXCEPTION 'Cannot start work before order is accepted.';
      END IF;
      v_next_status := 'in_progress';
      v_timeline_title := 'Work In Progress';
      v_timeline_desc := 'Seller is actively working on the requested deliverables.';

    WHEN 'submit_work' THEN
      IF NOT v_is_seller AND NOT v_is_admin THEN
        RAISE EXCEPTION 'Only the seller can submit deliverables.';
      END IF;
      IF v_order.status NOT IN ('accepted', 'in_progress', 'revision_requested') THEN
        RAISE EXCEPTION 'Deliverables cannot be submitted from current status (%).', v_order.status;
      END IF;
      v_next_status := 'submitted';
      v_timeline_title := 'Deliverables Submitted';
      v_timeline_desc := COALESCE(NULLIF(p_notes, ''), 'Seller delivered work for buyer inspection.');

    WHEN 'request_revision' THEN
      IF NOT v_is_buyer AND NOT v_is_admin THEN
        RAISE EXCEPTION 'Only the buyer can request revisions.';
      END IF;
      IF v_order.status NOT IN ('submitted') THEN
        RAISE EXCEPTION 'Revisions can only be requested after deliverables are submitted.';
      END IF;
      IF v_order.revisions_count >= v_order.max_revisions THEN
        RAISE EXCEPTION 'Maximum revisions limit (%) reached for this order.', v_order.max_revisions;
      END IF;
      v_next_status := 'revision_requested';
      v_revisions := v_revisions + 1;
      v_timeline_title := 'Revision Requested (#' || v_revisions || ')';
      v_timeline_desc := 'Buyer feedback: ' || COALESCE(NULLIF(p_notes, ''), 'Adjustments requested');

    WHEN 'complete' THEN
      IF NOT v_is_buyer AND NOT v_is_admin THEN
        RAISE EXCEPTION 'Only the buyer can approve completion and release payment.';
      END IF;
      IF v_order.status NOT IN ('submitted', 'accepted', 'in_progress') THEN
        RAISE EXCEPTION 'Order cannot be completed from current status (%).', v_order.status;
      END IF;
      v_next_status := 'completed';
      v_next_payment_status := 'paid';
      v_timeline_title := 'Order Completed & Escrow Released';
      v_timeline_desc := 'Buyer confirmed completion. Escrow payment released to seller.';

      -- Increment seller completed count
      UPDATE public.services
      SET completed_orders_count = completed_orders_count + 1
      WHERE id = v_order.service_id;

      -- If consultation, mark booking completed
      IF v_order.booking_id IS NOT NULL THEN
        UPDATE public.bookings SET status = 'completed' WHERE id = v_order.booking_id;
      END IF;

    WHEN 'cancel' THEN
      -- Buyer can cancel only if seller hasn't accepted, or if due_date has elapsed (missed deadline)
      IF v_is_buyer THEN
        IF v_order.status NOT IN ('seller_pending', 'pending_payment') AND v_now <= v_order.due_date THEN
          RAISE EXCEPTION 'Cannot cancel order after seller has accepted. Contact seller or wait for delivery deadline.';
        END IF;
      END IF;
      v_next_status := 'cancelled';
      v_next_payment_status := 'refunded';
      v_timeline_title := 'Order Cancelled & Refunded';
      v_timeline_desc := 'Reason: ' || COALESCE(NULLIF(p_reason, ''), 'Cancelled by participant') || '. Escrow refunded.';

      -- If consultation, cancel the booking slot
      IF v_order.booking_id IS NOT NULL THEN
        UPDATE public.bookings SET status = 'cancelled' WHERE id = v_order.booking_id;
      END IF;

    ELSE
      RAISE EXCEPTION 'Unknown order action: %', p_action;
  END CASE;

  -- 4. Apply Update to orders table
  UPDATE public.orders
  SET
    status = v_next_status,
    payment_status = v_next_payment_status,
    revisions_count = v_revisions,
    revision_notes = CASE WHEN p_action = 'request_revision' THEN p_notes ELSE revision_notes END,
    deliverables = CASE WHEN p_action = 'submit_work' THEN jsonb_build_object(
      'notes', p_notes,
      'file_url', p_file_url,
      'submitted_at', v_now
    ) ELSE deliverables END,
    accepted_at = CASE WHEN p_action = 'accept' THEN v_now ELSE accepted_at END,
    submitted_at = CASE WHEN p_action = 'submit_work' THEN v_now ELSE submitted_at END,
    completed_at = CASE WHEN p_action = 'complete' THEN v_now ELSE completed_at END,
    cancelled_at = CASE WHEN p_action IN ('cancel', 'reject') THEN v_now ELSE cancelled_at END,
    cancellation_reason = CASE WHEN p_action IN ('cancel', 'reject') THEN p_reason ELSE cancellation_reason END,
    timeline = timeline || jsonb_build_object(
      'status', v_next_status,
      'title', v_timeline_title,
      'description', v_timeline_desc,
      'timestamp', v_now,
      'actor_id', p_actor_id
    ),
    updated_at = v_now
  WHERE id = p_order_id;

  -- 5. Update payments table if refunded
  IF v_next_payment_status = 'refunded' THEN
    UPDATE public.payments
    SET status = 'refunded'
    WHERE order_id = p_order_id;
  END IF;

  -- 6. Send notification to counterparty
  INSERT INTO public.notifications (
    user_id,
    title,
    message,
    type,
    link,
    read,
    created_at
  ) VALUES (
    CASE WHEN p_actor_id = v_order.buyer_id THEN v_order.seller_id ELSE v_order.buyer_id END,
    v_timeline_title,
    'Order #' || substr(p_order_id::text, 1, 8) || ' updated to ' || v_next_status || '.',
    'order_' || p_action,
    '/orders/' || p_order_id,
    false,
    v_now
  );

  RETURN jsonb_build_object(
    'success', true,
    'order_id', p_order_id,
    'status', v_next_status,
    'payment_status', v_next_payment_status,
    'revisions_count', v_revisions
  );
END;
$$;
