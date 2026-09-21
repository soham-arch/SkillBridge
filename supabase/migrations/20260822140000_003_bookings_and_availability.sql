/*
# SkillBridge Bookings & Availability Schema

Creates the booking infrastructure for the service marketplace:
- availability_slots: Weekly recurring time slots providers make available
- bookings: Confirmed service bookings between customers and providers

1. New Tables
- availability_slots: Provider-defined weekly schedule (day_of_week + start/end time).
- bookings: Confirmed bookings with date, time, status lifecycle.

2. Security
- RLS enabled on both tables.
- availability_slots: Authenticated can read active slots. Provider can CRUD own.
- bookings: Participants (customer or provider) can read. Customer can insert.
  Provider or customer can update status. No deletes.

3. Constraints
- UNIQUE(provider_id, booking_date, start_time) on bookings prevents double-booking.
- booking status CHECK constraint.
- Indexes on frequently queried columns.
*/

-- Availability Slots
CREATE TABLE IF NOT EXISTS availability_slots (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_id uuid NOT NULL DEFAULT auth.uid() REFERENCES profiles(user_id) ON DELETE CASCADE,
  service_id uuid REFERENCES services(id) ON DELETE CASCADE,
  day_of_week integer NOT NULL CHECK (day_of_week >= 0 AND day_of_week <= 6),
  start_time time NOT NULL,
  end_time time NOT NULL,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT valid_time_range CHECK (start_time < end_time)
);

ALTER TABLE availability_slots ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "availability_slots_select_active" ON availability_slots;
CREATE POLICY "availability_slots_select_active" ON availability_slots FOR SELECT
  TO authenticated USING (true);

DROP POLICY IF EXISTS "availability_slots_insert_own" ON availability_slots;
CREATE POLICY "availability_slots_insert_own" ON availability_slots FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = provider_id);

DROP POLICY IF EXISTS "availability_slots_update_own" ON availability_slots;
CREATE POLICY "availability_slots_update_own" ON availability_slots FOR UPDATE
  TO authenticated USING (auth.uid() = provider_id) WITH CHECK (auth.uid() = provider_id);

DROP POLICY IF EXISTS "availability_slots_delete_own" ON availability_slots;
CREATE POLICY "availability_slots_delete_own" ON availability_slots FOR DELETE
  TO authenticated USING (auth.uid() = provider_id);

-- Bookings
CREATE TABLE IF NOT EXISTS bookings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  service_id uuid NOT NULL REFERENCES services(id) ON DELETE CASCADE,
  customer_id uuid NOT NULL DEFAULT auth.uid() REFERENCES profiles(user_id) ON DELETE CASCADE,
  provider_id uuid NOT NULL REFERENCES profiles(user_id) ON DELETE CASCADE,
  booking_date date NOT NULL,
  start_time time NOT NULL,
  end_time time NOT NULL,
  status text NOT NULL DEFAULT 'confirmed' CHECK (status IN ('confirmed','cancelled','completed')),
  note text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT unique_provider_booking UNIQUE (provider_id, booking_date, start_time)
);

ALTER TABLE bookings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "bookings_select_participants" ON bookings;
CREATE POLICY "bookings_select_participants" ON bookings FOR SELECT
  TO authenticated USING (auth.uid() = customer_id OR auth.uid() = provider_id);

DROP POLICY IF EXISTS "bookings_insert_customer" ON bookings;
CREATE POLICY "bookings_insert_customer" ON bookings FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = customer_id);

DROP POLICY IF EXISTS "bookings_update_participants" ON bookings;
CREATE POLICY "bookings_update_participants" ON bookings FOR UPDATE
  TO authenticated USING (auth.uid() = customer_id OR auth.uid() = provider_id)
  WITH CHECK (auth.uid() = customer_id OR auth.uid() = provider_id);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_availability_slots_provider_id ON availability_slots(provider_id);
CREATE INDEX IF NOT EXISTS idx_availability_slots_day_of_week ON availability_slots(day_of_week);
CREATE INDEX IF NOT EXISTS idx_bookings_customer_id ON bookings(customer_id);
CREATE INDEX IF NOT EXISTS idx_bookings_provider_id ON bookings(provider_id);
CREATE INDEX IF NOT EXISTS idx_bookings_booking_date ON bookings(booking_date);
CREATE INDEX IF NOT EXISTS idx_bookings_status ON bookings(status);

-- Updated_at triggers (reuse existing function)
DROP TRIGGER IF EXISTS trigger_availability_slots_updated_at ON availability_slots;
CREATE TRIGGER trigger_availability_slots_updated_at BEFORE UPDATE ON availability_slots
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS trigger_bookings_updated_at ON bookings;
CREATE TRIGGER trigger_bookings_updated_at BEFORE UPDATE ON bookings
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Seed availability slots for 5 test providers
INSERT INTO availability_slots (id, provider_id, service_id, day_of_week, start_time, end_time, is_active) VALUES
  -- Alex Sharma (user 1): Mon, Wed, Fri mornings & afternoons
  ('70000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001', NULL, 1, '09:00', '10:00', true),
  ('70000000-0000-0000-0000-000000000002', '10000000-0000-0000-0000-000000000001', NULL, 1, '10:00', '11:00', true),
  ('70000000-0000-0000-0000-000000000003', '10000000-0000-0000-0000-000000000001', NULL, 1, '14:00', '15:00', true),
  ('70000000-0000-0000-0000-000000000004', '10000000-0000-0000-0000-000000000001', NULL, 3, '09:00', '10:00', true),
  ('70000000-0000-0000-0000-000000000005', '10000000-0000-0000-0000-000000000001', NULL, 3, '10:00', '11:00', true),
  ('70000000-0000-0000-0000-000000000006', '10000000-0000-0000-0000-000000000001', NULL, 5, '14:00', '15:00', true),
  ('70000000-0000-0000-0000-000000000007', '10000000-0000-0000-0000-000000000001', NULL, 5, '15:00', '16:00', true),

  -- Priya Verma (user 2): Tue, Thu afternoons
  ('70000000-0000-0000-0000-000000000008', '10000000-0000-0000-0000-000000000002', NULL, 2, '13:00', '14:00', true),
  ('70000000-0000-0000-0000-000000000009', '10000000-0000-0000-0000-000000000002', NULL, 2, '14:00', '15:00', true),
  ('70000000-0000-0000-0000-000000000010', '10000000-0000-0000-0000-000000000002', NULL, 4, '13:00', '14:00', true),
  ('70000000-0000-0000-0000-000000000011', '10000000-0000-0000-0000-000000000002', NULL, 4, '14:00', '15:00', true),
  ('70000000-0000-0000-0000-000000000012', '10000000-0000-0000-0000-000000000002', NULL, 6, '10:00', '11:00', true),

  -- Rohan Kulkarni (user 3): Mon-Fri evenings
  ('70000000-0000-0000-0000-000000000013', '10000000-0000-0000-0000-000000000003', NULL, 1, '17:00', '18:00', true),
  ('70000000-0000-0000-0000-000000000014', '10000000-0000-0000-0000-000000000003', NULL, 2, '17:00', '18:00', true),
  ('70000000-0000-0000-0000-000000000015', '10000000-0000-0000-0000-000000000003', NULL, 3, '17:00', '18:00', true),
  ('70000000-0000-0000-0000-000000000016', '10000000-0000-0000-0000-000000000003', NULL, 4, '17:00', '18:00', true),
  ('70000000-0000-0000-0000-000000000017', '10000000-0000-0000-0000-000000000003', NULL, 5, '17:00', '18:00', true),

  -- Sneha Patil (user 4): Weekends
  ('70000000-0000-0000-0000-000000000018', '10000000-0000-0000-0000-000000000004', NULL, 0, '10:00', '11:00', true),
  ('70000000-0000-0000-0000-000000000019', '10000000-0000-0000-0000-000000000004', NULL, 0, '11:00', '12:00', true),
  ('70000000-0000-0000-0000-000000000020', '10000000-0000-0000-0000-000000000004', NULL, 6, '10:00', '11:00', true),
  ('70000000-0000-0000-0000-000000000021', '10000000-0000-0000-0000-000000000004', NULL, 6, '11:00', '12:00', true),
  ('70000000-0000-0000-0000-000000000022', '10000000-0000-0000-0000-000000000004', NULL, 6, '14:00', '15:00', true),

  -- Aarav Mehta (user 5): Tue, Sat full day
  ('70000000-0000-0000-0000-000000000023', '10000000-0000-0000-0000-000000000005', NULL, 2, '09:00', '10:00', true),
  ('70000000-0000-0000-0000-000000000024', '10000000-0000-0000-0000-000000000005', NULL, 2, '10:00', '11:00', true),
  ('70000000-0000-0000-0000-000000000025', '10000000-0000-0000-0000-000000000005', NULL, 2, '14:00', '15:00', true),
  ('70000000-0000-0000-0000-000000000026', '10000000-0000-0000-0000-000000000005', NULL, 6, '09:00', '10:00', true),
  ('70000000-0000-0000-0000-000000000027', '10000000-0000-0000-0000-000000000005', NULL, 6, '10:00', '11:00', true),
  ('70000000-0000-0000-0000-000000000028', '10000000-0000-0000-0000-000000000005', NULL, 6, '14:00', '15:00', true)
ON CONFLICT (id) DO NOTHING;

-- Seed a few sample bookings
INSERT INTO bookings (id, service_id, customer_id, provider_id, booking_date, start_time, end_time, status, note) VALUES
  (
    '80000000-0000-0000-0000-000000000001',
    '30000000-0000-0000-0000-000000000001',
    '10000000-0000-0000-0000-000000000003',
    '10000000-0000-0000-0000-000000000001',
    CURRENT_DATE + interval '3 days',
    '09:00', '10:00',
    'confirmed',
    'Looking forward to the portfolio website session!'
  ),
  (
    '80000000-0000-0000-0000-000000000002',
    '30000000-0000-0000-0000-000000000003',
    '10000000-0000-0000-0000-000000000001',
    '10000000-0000-0000-0000-000000000003',
    CURRENT_DATE + interval '5 days',
    '17:00', '18:00',
    'confirmed',
    'Need help with graph algorithm problems for placement prep.'
  ),
  (
    '80000000-0000-0000-0000-000000000003',
    '30000000-0000-0000-0000-000000000005',
    '10000000-0000-0000-0000-000000000002',
    '10000000-0000-0000-0000-000000000005',
    CURRENT_DATE - interval '2 days',
    '09:00', '10:00',
    'completed',
    'Event photography for our department fest.'
  ),
  (
    '80000000-0000-0000-0000-000000000004',
    '30000000-0000-0000-0000-000000000002',
    '10000000-0000-0000-0000-000000000003',
    '10000000-0000-0000-0000-000000000002',
    CURRENT_DATE - interval '1 day',
    '13:00', '14:00',
    'cancelled',
    'Had to cancel due to schedule conflict.'
  )
ON CONFLICT (id) DO NOTHING;
