/*
# SkillBridge V2: Orders, Escrow Payments, and Student Verification Schema

Creates the production tables for SkillBridge V2:
- orders: Full student service marketplace order lifecycle
- payments: Escrow payment tracking and payment verification
- verification_requests: Student college ID and student institutional verification
- notifications: Real-time in-app student notifications

All tables have Row Level Security enabled with ownership-scoped policies.
*/

-- 1. Create Order Status and Payment Status ENUMs / Checks
CREATE TABLE IF NOT EXISTS orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  service_id uuid NOT NULL REFERENCES services(id) ON DELETE CASCADE,
  buyer_id uuid NOT NULL REFERENCES profiles(user_id) ON DELETE CASCADE,
  seller_id uuid NOT NULL REFERENCES profiles(user_id) ON DELETE CASCADE,
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

ALTER TABLE orders ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "orders_select_participants" ON orders;
CREATE POLICY "orders_select_participants" ON orders FOR SELECT
  TO authenticated USING (auth.uid() = buyer_id OR auth.uid() = seller_id);

DROP POLICY IF EXISTS "orders_insert_buyer" ON orders;
CREATE POLICY "orders_insert_buyer" ON orders FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = buyer_id);

DROP POLICY IF EXISTS "orders_update_participants" ON orders;
CREATE POLICY "orders_update_participants" ON orders FOR UPDATE
  TO authenticated USING (auth.uid() = buyer_id OR auth.uid() = seller_id)
  WITH CHECK (auth.uid() = buyer_id OR auth.uid() = seller_id);

-- 2. Payments Table
CREATE TABLE IF NOT EXISTS payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  buyer_id uuid NOT NULL REFERENCES profiles(user_id) ON DELETE CASCADE,
  seller_id uuid NOT NULL REFERENCES profiles(user_id) ON DELETE CASCADE,
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

ALTER TABLE payments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "payments_select_participants" ON payments;
CREATE POLICY "payments_select_participants" ON payments FOR SELECT
  TO authenticated USING (auth.uid() = buyer_id OR auth.uid() = seller_id);

-- 3. Verification Requests Table
CREATE TABLE IF NOT EXISTS verification_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES profiles(user_id) ON DELETE CASCADE,
  college_name text NOT NULL,
  college_email text,
  document_url text,
  document_type text NOT NULL DEFAULT 'college_id_card' CHECK (
    document_type IN ('college_id_card', 'student_email', 'enrollment_cert')
  ),
  status text NOT NULL DEFAULT 'pending' CHECK (
    status IN ('not_verified', 'pending', 'verified', 'rejected')
  ),
  admin_notes text,
  submitted_at timestamptz NOT NULL DEFAULT now(),
  reviewed_at timestamptz
);

ALTER TABLE verification_requests ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "verification_requests_select_own" ON verification_requests;
CREATE POLICY "verification_requests_select_own" ON verification_requests FOR SELECT
  TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "verification_requests_insert_own" ON verification_requests;
CREATE POLICY "verification_requests_insert_own" ON verification_requests FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);

-- 4. Notifications Table
CREATE TABLE IF NOT EXISTS notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES profiles(user_id) ON DELETE CASCADE,
  title text NOT NULL,
  message text NOT NULL,
  type text NOT NULL,
  read boolean NOT NULL DEFAULT false,
  link text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "notifications_select_own" ON notifications;
CREATE POLICY "notifications_select_own" ON notifications FOR SELECT
  TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "notifications_update_own" ON notifications;
CREATE POLICY "notifications_update_own" ON notifications FOR UPDATE
  TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_orders_buyer_id ON orders(buyer_id);
CREATE INDEX IF NOT EXISTS idx_orders_seller_id ON orders(seller_id);
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);
CREATE INDEX IF NOT EXISTS idx_payments_order_id ON payments(order_id);
CREATE INDEX IF NOT EXISTS idx_verification_requests_user_id ON verification_requests(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);
