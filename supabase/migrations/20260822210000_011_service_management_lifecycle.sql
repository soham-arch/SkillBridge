-- =========================================================================
-- SkillBridge Migration 011: Complete Service Management & Lifecycle Safety
--
-- 1. Adds service_type, currency, cover_image_url, portfolio_examples, and availability_notes to public.services
-- 2. Expands services.status check to support 'moderated' in addition to draft, published, paused, archived
-- 3. Adds service_snapshot JSONB to public.orders for historical order preservation
-- 4. Safe Deletion Enforcement: Prevents hard-delete of services that have existing orders
-- 5. Strict RLS: Prevents buyers from creating listings, prevents sellers from modifying other sellers' listings
-- 6. Storage bucket configuration for service-media assets
-- =========================================================================

-- 1. Extend public.services columns
ALTER TABLE public.services ADD COLUMN IF NOT EXISTS service_type text NOT NULL DEFAULT 'digital';
ALTER TABLE public.services ADD COLUMN IF NOT EXISTS currency text NOT NULL DEFAULT 'INR';
ALTER TABLE public.services ADD COLUMN IF NOT EXISTS cover_image_url text;
ALTER TABLE public.services ADD COLUMN IF NOT EXISTS portfolio_examples jsonb NOT NULL DEFAULT '[]'::jsonb;
ALTER TABLE public.services ADD COLUMN IF NOT EXISTS availability_notes text;

-- Check constraint for service_type
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'services_service_type_check'
  ) THEN
    ALTER TABLE public.services
      ADD CONSTRAINT services_service_type_check
      CHECK (service_type IN ('digital', 'in_person', 'hybrid'));
  END IF;
END $$;

-- Expand status check constraint to include 'moderated'
DO $$
BEGIN
  -- Drop existing status check constraints if present
  ALTER TABLE public.services DROP CONSTRAINT IF EXISTS services_status_check;
  
  ALTER TABLE public.services
    ADD CONSTRAINT services_status_check
    CHECK (status IN ('draft', 'published', 'paused', 'archived', 'moderated'));
EXCEPTION
  WHEN OTHERS THEN
    NULL;
END $$;

-- 2. Extend public.orders with service_snapshot
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS service_snapshot jsonb NOT NULL DEFAULT '{}'::jsonb;

-- Backfill service_snapshot for any existing orders from public.services
UPDATE public.orders o
SET service_snapshot = jsonb_build_object(
  'id', s.id,
  'title', s.title,
  'description', s.description,
  'price', o.price,
  'delivery_days', o.delivery_days,
  'service_type', COALESCE(s.service_type, 'digital')
)
FROM public.services s
WHERE o.service_id = s.id
  AND (o.service_snapshot IS NULL OR o.service_snapshot = '{}'::jsonb);

-- 3. Safe Deletion Trigger on public.services
CREATE OR REPLACE FUNCTION public.check_service_safe_delete()
RETURNS TRIGGER AS $$
BEGIN
  IF EXISTS (SELECT 1 FROM public.orders WHERE service_id = OLD.id) THEN
    RAISE EXCEPTION 'Cannot delete service "%" because it has historical or active orders. Please pause or archive the listing instead to preserve order records.', OLD.title;
  END IF;
  RETURN OLD;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_service_safe_delete ON public.services;
CREATE TRIGGER trg_service_safe_delete
  BEFORE DELETE ON public.services
  FOR EACH ROW
  EXECUTE FUNCTION public.check_service_safe_delete();

-- 4. Row Level Security on public.services

-- Public can only discover 'published' services. Owners and admins can view any status (draft, paused, archived, moderated).
DROP POLICY IF EXISTS "services_select_published" ON public.services;
CREATE POLICY "services_select_published" ON public.services FOR SELECT
  TO anon, authenticated USING (
    status = 'published' OR
    provider_id = auth.uid() OR
    EXISTS (SELECT 1 FROM public.profiles WHERE profiles.user_id = auth.uid() AND profiles.is_admin = true)
  );

-- Only verified sellers can insert services
DROP POLICY IF EXISTS "services_insert_own" ON public.services;
CREATE POLICY "services_insert_own" ON public.services FOR INSERT
  TO authenticated WITH CHECK (
    auth.uid() = provider_id AND
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.user_id = auth.uid()
        AND (
          'seller' = ANY(profiles.capabilities) OR
          'offer' = ANY(profiles.capabilities) OR
          profiles.active_role = 'seller' OR
          profiles.is_admin = true
        )
    )
  );

-- Only the owner or an admin can update a service
DROP POLICY IF EXISTS "services_update_own" ON public.services;
CREATE POLICY "services_update_own" ON public.services FOR UPDATE
  TO authenticated USING (
    auth.uid() = provider_id OR
    EXISTS (SELECT 1 FROM public.profiles WHERE profiles.user_id = auth.uid() AND profiles.is_admin = true)
  ) WITH CHECK (
    auth.uid() = provider_id OR
    EXISTS (SELECT 1 FROM public.profiles WHERE profiles.user_id = auth.uid() AND profiles.is_admin = true)
  );

-- Only the owner or an admin can delete a service (subject to safe delete trigger)
DROP POLICY IF EXISTS "services_delete_own" ON public.services;
CREATE POLICY "services_delete_own" ON public.services FOR DELETE
  TO authenticated USING (
    auth.uid() = provider_id OR
    EXISTS (SELECT 1 FROM public.profiles WHERE profiles.user_id = auth.uid() AND profiles.is_admin = true)
  );

-- 5. Update atomic create_order_with_escrow RPC to snapshot service details
CREATE OR REPLACE FUNCTION public.create_order_with_escrow(
  p_service_id uuid,
  p_buyer_id uuid,
  p_requirements text,
  p_payment_method text DEFAULT 'upi',
  p_simulate_success boolean DEFAULT true
)
RETURNS jsonb AS $$
DECLARE
  v_service record;
  v_order_id uuid;
  v_payment_id uuid;
  v_now timestamptz := now();
  v_due_date timestamptz;
  v_order_status text;
  v_payment_status text;
  v_gateway_payment_id text;
  v_timeline jsonb;
  v_snapshot jsonb;
BEGIN
  -- 1. Fetch service details
  SELECT * INTO v_service FROM public.services WHERE id = p_service_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Service not found for ID %', p_service_id;
  END IF;

  -- 2. Reject self-purchase
  IF v_service.provider_id = p_buyer_id THEN
    RAISE EXCEPTION 'You cannot buy your own service listing.';
  END IF;

  -- 3. Verify service is active and available
  IF v_service.status != 'published' THEN
    RAISE EXCEPTION 'Service is currently % and not accepting new orders.', v_service.status;
  END IF;

  -- 4. Calculate due date
  v_due_date := v_now + (COALESCE(v_service.delivery_days, 3) || ' days')::interval;

  -- 5. Determine initial statuses
  IF p_simulate_success THEN
    v_order_status := 'seller_pending';
    v_payment_status := 'paid';
    v_gateway_payment_id := 'pay_rzp_' || substr(md5(random()::text), 1, 9);
    v_timeline := jsonb_build_array(
      jsonb_build_object(
        'status', 'pending_payment',
        'title', 'Order Placed',
        'description', 'Requirements submitted by buyer',
        'timestamp', v_now,
        'actor_id', p_buyer_id
      ),
      jsonb_build_object(
        'status', 'paid',
        'title', 'Payment Secured in Escrow',
        'description', 'Funds held safely in SkillBridge Escrow via ' || upper(p_payment_method),
        'timestamp', v_now
      )
    );
  ELSE
    v_order_status := 'pending_payment';
    v_payment_status := 'failed';
    v_gateway_payment_id := 'pay_rzp_failed_' || substr(md5(random()::text), 1, 6);
    v_timeline := jsonb_build_array(
      jsonb_build_object(
        'status', 'pending_payment',
        'title', 'Order Placed',
        'description', 'Requirements submitted by buyer',
        'timestamp', v_now,
        'actor_id', p_buyer_id
      ),
      jsonb_build_object(
        'status', 'pending_payment',
        'title', 'Payment Declined',
        'description', 'Simulated bank authorization failure',
        'timestamp', v_now
      )
    );
  END IF;

  -- Build frozen service snapshot for historical preservation
  v_snapshot := jsonb_build_object(
    'id', v_service.id,
    'title', v_service.title,
    'description', v_service.description,
    'price', v_service.price,
    'delivery_days', COALESCE(v_service.delivery_days, 3),
    'service_type', COALESCE(v_service.service_type, 'digital'),
    'location', v_service.location
  );

  -- 6. Insert Order record with service_snapshot
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
    service_snapshot,
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
    v_snapshot,
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
      'A buyer placed an order for "' || v_service.title || '" (₹' || v_service.price || '). Funds are secured in Escrow.',
      'order_created',
      '/orders/' || v_order_id,
      false,
      v_now
    );
  END IF;

  RETURN jsonb_build_object(
    'order_id', v_order_id,
    'payment_id', v_payment_id,
    'payment_status', v_payment_status,
    'order_status', v_order_status
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 6. Service Media Bucket Setup
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'service-media',
  'service-media',
  true,
  10485760, -- 10MB limit
  ARRAY['image/jpeg', 'image/png', 'image/webp']
)
ON CONFLICT (id) DO UPDATE
SET public = true,
    file_size_limit = 10485760,
    allowed_mime_types = ARRAY['image/jpeg', 'image/png', 'image/webp'];

-- Storage policies for service-media
DROP POLICY IF EXISTS "Public can view service-media" ON storage.objects;
CREATE POLICY "Public can view service-media" ON storage.objects FOR SELECT
  TO anon, authenticated
  USING (bucket_id = 'service-media');

DROP POLICY IF EXISTS "Authenticated users can upload service-media" ON storage.objects;
CREATE POLICY "Authenticated users can upload service-media" ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'service-media');
