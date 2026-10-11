/*
# SkillBridge V2: Administrator Governance, Authority Protection, & Security Schema
# Migration: 20260822180000_008_admin_governance_and_security.sql

This migration implements complete administrator authorization & platform governance:
1. Ensures foundational profile security columns exist (is_admin, verification_status, verified_at).
2. Prevents self-promotion and unauthorized role escalation on `profiles` via a strict trigger.
3. Creates the `admin_audit_log` table to preserve an immutable audit trail of all administrative actions.
4. Ensures `orders` and `payments` tables exist with complete schema definitions.
5. Implements comprehensive Row Level Security (RLS) across all tables:
   - profiles
   - services
   - orders (IDOR prevention: restricted to buyer, seller, admin)
   - payments (Restricted release: ordinary users cannot modify payment records)
   - admin_audit_log (Immutable: only admins can select and insert)
6. Admin management RPC functions:
   - grant_or_revoke_admin(p_target_user_id, p_is_admin) with minimum-admin-count safeguards.
*/

-- =========================================================================
-- 0. Ensure Foundational Profile Columns Exist
-- =========================================================================

ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS is_admin boolean DEFAULT false;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS verification_status text DEFAULT 'not_verified';
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS verified_at timestamptz;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS student_id_number text;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS rejection_reason text;

-- =========================================================================
-- 1. Anti-Self-Promotion Trigger on Profiles
-- =========================================================================

CREATE OR REPLACE FUNCTION protect_profile_sensitive_columns()
RETURNS trigger AS $$
DECLARE
  v_is_caller_admin boolean;
BEGIN
  -- Check if sensitive fields are being altered
  IF (OLD.is_admin IS DISTINCT FROM NEW.is_admin) OR
     (OLD.verification_status IS DISTINCT FROM NEW.verification_status) OR
     (OLD.verified_at IS DISTINCT FROM NEW.verified_at) THEN

    -- Verify if the current session caller is an authorized administrator
    SELECT is_admin INTO v_is_caller_admin
    FROM public.profiles
    WHERE user_id = auth.uid();

    -- In direct client queries, if caller is not an admin, forbid escalation
    IF v_is_caller_admin IS NOT TRUE AND auth.uid() IS NOT NULL THEN
      RAISE EXCEPTION 'Unauthorized: Only platform administrators can modify roles, admin privileges, or verification status.';
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_protect_profile_sensitive_columns ON public.profiles;
CREATE TRIGGER trg_protect_profile_sensitive_columns
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION protect_profile_sensitive_columns();

-- =========================================================================
-- 2. Platform Administration Audit Log Table
-- =========================================================================

CREATE TABLE IF NOT EXISTS public.admin_audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id uuid NOT NULL REFERENCES public.profiles(user_id) ON DELETE CASCADE,
  action text NOT NULL,
  target_type text NOT NULL,
  target_id text NOT NULL,
  details jsonb DEFAULT '{}'::jsonb,
  ip_address text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.admin_audit_log ENABLE ROW LEVEL SECURITY;

-- Only platform administrators can view administrative audit logs
DROP POLICY IF EXISTS "admin_audit_log_select_admin" ON public.admin_audit_log;
CREATE POLICY "admin_audit_log_select_admin" ON public.admin_audit_log FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE user_id = auth.uid() AND is_admin = true
    )
  );

-- Only platform administrators or secure functions can insert into audit log
DROP POLICY IF EXISTS "admin_audit_log_insert_admin" ON public.admin_audit_log;
CREATE POLICY "admin_audit_log_insert_admin" ON public.admin_audit_log FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() = actor_id 
    AND EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE user_id = auth.uid() AND is_admin = true
    )
  );

-- Audits are immutable (no UPDATE or DELETE policies)
CREATE INDEX IF NOT EXISTS idx_admin_audit_log_actor_id ON public.admin_audit_log(actor_id);
CREATE INDEX IF NOT EXISTS idx_admin_audit_log_created_at ON public.admin_audit_log(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_admin_audit_log_target ON public.admin_audit_log(target_type, target_id);

-- =========================================================================
-- 3. Ensure Orders and Payments Tables Exist (Self-Contained)
-- =========================================================================

CREATE TABLE IF NOT EXISTS public.orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  service_id uuid NOT NULL REFERENCES public.services(id) ON DELETE CASCADE,
  buyer_id uuid NOT NULL REFERENCES public.profiles(user_id) ON DELETE CASCADE,
  seller_id uuid NOT NULL REFERENCES public.profiles(user_id) ON DELETE CASCADE,
  price numeric(10,2) NOT NULL DEFAULT 0,
  requirements text NOT NULL DEFAULT '',
  delivery_days integer NOT NULL DEFAULT 3,
  due_date timestamptz NOT NULL DEFAULT (now() + interval '3 days'),
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

CREATE TABLE IF NOT EXISTS public.payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  buyer_id uuid NOT NULL REFERENCES public.profiles(user_id) ON DELETE CASCADE,
  seller_id uuid NOT NULL REFERENCES public.profiles(user_id) ON DELETE CASCADE,
  amount numeric(10,2) NOT NULL DEFAULT 0,
  currency text NOT NULL DEFAULT 'INR',
  gateway_order_id text NOT NULL DEFAULT '',
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

CREATE INDEX IF NOT EXISTS idx_orders_buyer_id ON public.orders(buyer_id);
CREATE INDEX IF NOT EXISTS idx_orders_seller_id ON public.orders(seller_id);
CREATE INDEX IF NOT EXISTS idx_orders_status ON public.orders(status);
CREATE INDEX IF NOT EXISTS idx_payments_order_id ON public.payments(order_id);

-- =========================================================================
-- 4. Comprehensive Row Level Security (RLS) across Tables
-- =========================================================================

-- Profiles: Authenticated users can view public profile details
DROP POLICY IF EXISTS "profiles_select_authenticated" ON public.profiles;
CREATE POLICY "profiles_select_authenticated" ON public.profiles FOR SELECT
  TO authenticated
  USING (true);

-- Services: Enforce verified student status to publish services
DROP POLICY IF EXISTS "services_select_access" ON public.services;
CREATE POLICY "services_select_access" ON public.services FOR SELECT
  TO anon, authenticated
  USING (
    status = 'published' 
    OR provider_id = auth.uid()
    OR EXISTS (SELECT 1 FROM public.profiles WHERE user_id = auth.uid() AND is_admin = true)
  );

DROP POLICY IF EXISTS "services_insert_verified" ON public.services;
CREATE POLICY "services_insert_verified" ON public.services FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() = provider_id
    AND EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE user_id = auth.uid() AND (verification_status = 'verified' OR is_admin = true)
    )
  );

DROP POLICY IF EXISTS "services_update_owner_or_admin" ON public.services;
CREATE POLICY "services_update_owner_or_admin" ON public.services FOR UPDATE
  TO authenticated
  USING (
    provider_id = auth.uid()
    OR EXISTS (SELECT 1 FROM public.profiles WHERE user_id = auth.uid() AND is_admin = true)
  )
  WITH CHECK (
    provider_id = auth.uid()
    OR EXISTS (SELECT 1 FROM public.profiles WHERE user_id = auth.uid() AND is_admin = true)
  );

DROP POLICY IF EXISTS "services_delete_owner_or_admin" ON public.services;
CREATE POLICY "services_delete_owner_or_admin" ON public.services FOR DELETE
  TO authenticated
  USING (
    provider_id = auth.uid()
    OR EXISTS (SELECT 1 FROM public.profiles WHERE user_id = auth.uid() AND is_admin = true)
  );

-- Orders: Only buyer, seller, or administrator can access (prevents IDOR)
DROP POLICY IF EXISTS "orders_select_participants_or_admin" ON public.orders;
CREATE POLICY "orders_select_participants_or_admin" ON public.orders FOR SELECT
  TO authenticated
  USING (
    auth.uid() = buyer_id 
    OR auth.uid() = seller_id
    OR EXISTS (SELECT 1 FROM public.profiles WHERE user_id = auth.uid() AND is_admin = true)
  );

DROP POLICY IF EXISTS "orders_insert_buyer" ON public.orders;
CREATE POLICY "orders_insert_buyer" ON public.orders FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = buyer_id);

DROP POLICY IF EXISTS "orders_update_participants_or_admin" ON public.orders;
CREATE POLICY "orders_update_participants_or_admin" ON public.orders FOR UPDATE
  TO authenticated
  USING (
    auth.uid() = buyer_id 
    OR auth.uid() = seller_id
    OR EXISTS (SELECT 1 FROM public.profiles WHERE user_id = auth.uid() AND is_admin = true)
  )
  WITH CHECK (
    auth.uid() = buyer_id 
    OR auth.uid() = seller_id
    OR EXISTS (SELECT 1 FROM public.profiles WHERE user_id = auth.uid() AND is_admin = true)
  );

-- Payments: Only participants or administrator can inspect payments
DROP POLICY IF EXISTS "payments_select_participants_or_admin" ON public.payments;
CREATE POLICY "payments_select_participants_or_admin" ON public.payments FOR SELECT
  TO authenticated
  USING (
    auth.uid() = buyer_id 
    OR auth.uid() = seller_id
    OR EXISTS (SELECT 1 FROM public.profiles WHERE user_id = auth.uid() AND is_admin = true)
  );

-- Ordinary users CANNOT directly update payments table to release funds!
DROP POLICY IF EXISTS "payments_update_admin_only" ON public.payments;
CREATE POLICY "payments_update_admin_only" ON public.payments FOR UPDATE
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE user_id = auth.uid() AND is_admin = true)
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.profiles WHERE user_id = auth.uid() AND is_admin = true)
  );

-- =========================================================================
-- 5. Admin Authority Governance RPC: Grant or Revoke Admin Privileges
-- =========================================================================

CREATE OR REPLACE FUNCTION grant_or_revoke_admin(
  p_target_user_id uuid,
  p_is_admin boolean
)
RETURNS jsonb AS $$
DECLARE
  v_caller_is_admin boolean;
  v_admin_count integer;
  v_target_email text;
BEGIN
  -- Verify caller is an existing platform admin
  SELECT is_admin INTO v_caller_is_admin
  FROM public.profiles
  WHERE user_id = auth.uid();

  IF v_caller_is_admin IS NOT TRUE THEN
    RAISE EXCEPTION 'Unauthorized: Only confirmed administrators can manage administrator roles.';
  END IF;

  -- Safety rule: If revoking admin, ensure at least one other admin remains
  IF p_is_admin IS FALSE THEN
    SELECT count(*) INTO v_admin_count
    FROM public.profiles
    WHERE is_admin = true AND user_id != p_target_user_id;

    IF v_admin_count < 1 THEN
      RAISE EXCEPTION 'Action rejected: Cannot revoke the last remaining platform administrator. Promote another administrator first to prevent lockout.';
    END IF;
  END IF;

  -- Update target profile
  UPDATE public.profiles
  SET is_admin = p_is_admin,
      updated_at = now()
  WHERE user_id = p_target_user_id
  RETURNING email INTO v_target_email;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'User profile not found.';
  END IF;

  -- Log action in admin_audit_log
  INSERT INTO public.admin_audit_log (
    actor_id,
    action,
    target_type,
    target_id,
    details
  )
  VALUES (
    auth.uid(),
    CASE WHEN p_is_admin THEN 'grant_admin' ELSE 'revoke_admin' END,
    'profile',
    p_target_user_id::text,
    jsonb_build_object(
      'target_email', v_target_email,
      'is_admin', p_is_admin
    )
  );

  RETURN jsonb_build_object(
    'success', true,
    'user_id', p_target_user_id,
    'is_admin', p_is_admin
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION grant_or_revoke_admin(uuid, boolean) TO authenticated;
