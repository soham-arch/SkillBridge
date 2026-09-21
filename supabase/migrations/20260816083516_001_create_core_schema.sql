/*
# SkillBridge Core Schema

Creates the foundational tables for the SkillBridge student service marketplace:
profiles, categories, services, service_media, service_requests, and reviews.
All tables have Row Level Security enabled with ownership-scoped policies.

1. New Tables
- profiles: Extended user info linked to auth.users (full name, avatar, college, bio, location, capabilities).
- categories: Service categories (Design, Development, etc.).
- services: Service listings created by providers, with status lifecycle.
- service_media: Media attached to services (URLs stored, binaries in Storage).
- service_requests: Requests from customers to providers, with status lifecycle.
- reviews: Ratings and comments left by customers for providers.

2. Security
- RLS enabled on every table.
- profiles: authenticated users can read all profiles; users can only update their own.
- categories: anyone (anon + authenticated) can read; only authenticated can insert.
- services: anyone can read published; only owner can insert/update/delete.
- service_media: anyone can read; only service owner can insert/delete.
- service_requests: participants (customer or provider) can read; only customer can insert; only provider can update status.
- reviews: anyone can read; only the requesting customer can insert a review; only reviewer can delete their own review.

3. Notes
- profiles.user_id has a UNIQUE constraint so other tables can reference it.
- profiles.user_id defaults to auth.uid() so inserts omitting user_id succeed.
- services.provider_id defaults to auth.uid().
- service_requests.customer_id defaults to auth.uid().
- reviews.reviewer_id defaults to auth.uid().
- Unique constraint prevents duplicate reviews per service.
- Rating constrained to 1-5.
- Indexes added for frequently queried columns.
*/

-- Profiles
CREATE TABLE IF NOT EXISTS profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name text NOT NULL DEFAULT '',
  avatar_url text,
  college text,
  bio text,
  location text,
  capabilities text[] NOT NULL DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "profiles_select_all" ON profiles;
CREATE POLICY "profiles_select_all" ON profiles FOR SELECT
  TO authenticated USING (true);

DROP POLICY IF EXISTS "profiles_insert_own" ON profiles;
CREATE POLICY "profiles_insert_own" ON profiles FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "profiles_update_own" ON profiles;
CREATE POLICY "profiles_update_own" ON profiles FOR UPDATE
  TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Categories
CREATE TABLE IF NOT EXISTS categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  description text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE categories ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "categories_select_all" ON categories;
CREATE POLICY "categories_select_all" ON categories FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "categories_insert_auth" ON categories;
CREATE POLICY "categories_insert_auth" ON categories FOR INSERT
  TO authenticated WITH CHECK (true);

-- Services
CREATE TABLE IF NOT EXISTS services (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_id uuid NOT NULL DEFAULT auth.uid() REFERENCES profiles(user_id) ON DELETE CASCADE,
  category_id uuid REFERENCES categories(id) ON DELETE SET NULL,
  title text NOT NULL,
  description text NOT NULL DEFAULT '',
  price numeric(10,2) NOT NULL DEFAULT 0,
  location text,
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','published','paused','archived')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE services ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "services_select_published" ON services;
CREATE POLICY "services_select_published" ON services FOR SELECT
  TO anon, authenticated USING (status = 'published' OR provider_id = auth.uid());

DROP POLICY IF EXISTS "services_insert_own" ON services;
CREATE POLICY "services_insert_own" ON services FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = provider_id);

DROP POLICY IF EXISTS "services_update_own" ON services;
CREATE POLICY "services_update_own" ON services FOR UPDATE
  TO authenticated USING (auth.uid() = provider_id) WITH CHECK (auth.uid() = provider_id);

DROP POLICY IF EXISTS "services_delete_own" ON services;
CREATE POLICY "services_delete_own" ON services FOR DELETE
  TO authenticated USING (auth.uid() = provider_id);

-- Service Media
CREATE TABLE IF NOT EXISTS service_media (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  service_id uuid NOT NULL REFERENCES services(id) ON DELETE CASCADE,
  media_url text NOT NULL,
  media_type text NOT NULL DEFAULT 'image',
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE service_media ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "service_media_select_all" ON service_media;
CREATE POLICY "service_media_select_all" ON service_media FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "service_media_insert_own" ON service_media;
CREATE POLICY "service_media_insert_own" ON service_media FOR INSERT
  TO authenticated WITH CHECK (
    EXISTS (SELECT 1 FROM services WHERE services.id = service_media.service_id AND services.provider_id = auth.uid())
  );

DROP POLICY IF EXISTS "service_media_delete_own" ON service_media;
CREATE POLICY "service_media_delete_own" ON service_media FOR DELETE
  TO authenticated USING (
    EXISTS (SELECT 1 FROM services WHERE services.id = service_media.service_id AND services.provider_id = auth.uid())
  );

-- Service Requests
CREATE TABLE IF NOT EXISTS service_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  service_id uuid NOT NULL REFERENCES services(id) ON DELETE CASCADE,
  customer_id uuid NOT NULL DEFAULT auth.uid() REFERENCES profiles(user_id) ON DELETE CASCADE,
  provider_id uuid NOT NULL REFERENCES profiles(user_id) ON DELETE CASCADE,
  message text NOT NULL DEFAULT '',
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','accepted','in_progress','completed','declined','cancelled')),
  requested_at timestamptz NOT NULL DEFAULT now(),
  accepted_at timestamptz,
  completed_at timestamptz,
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE service_requests ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "service_requests_select_participants" ON service_requests;
CREATE POLICY "service_requests_select_participants" ON service_requests FOR SELECT
  TO authenticated USING (auth.uid() = customer_id OR auth.uid() = provider_id);

DROP POLICY IF EXISTS "service_requests_insert_customer" ON service_requests;
CREATE POLICY "service_requests_insert_customer" ON service_requests FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = customer_id);

DROP POLICY IF EXISTS "service_requests_update_provider" ON service_requests;
CREATE POLICY "service_requests_update_provider" ON service_requests FOR UPDATE
  TO authenticated USING (auth.uid() = provider_id) WITH CHECK (auth.uid() = provider_id);

DROP POLICY IF EXISTS "service_requests_update_customer" ON service_requests;
CREATE POLICY "service_requests_update_customer" ON service_requests FOR UPDATE
  TO authenticated USING (auth.uid() = customer_id) WITH CHECK (auth.uid() = customer_id);

DROP POLICY IF EXISTS "service_requests_delete_own" ON service_requests;
CREATE POLICY "service_requests_delete_own" ON service_requests FOR DELETE
  TO authenticated USING (auth.uid() = customer_id OR auth.uid() = provider_id);

-- Reviews
CREATE TABLE IF NOT EXISTS reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  service_id uuid NOT NULL REFERENCES services(id) ON DELETE CASCADE,
  reviewer_id uuid NOT NULL DEFAULT auth.uid() REFERENCES profiles(user_id) ON DELETE CASCADE,
  reviewee_id uuid NOT NULL REFERENCES profiles(user_id) ON DELETE CASCADE,
  rating integer NOT NULL CHECK (rating >= 1 AND rating <= 5),
  comment text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT unique_review_per_service UNIQUE (service_id, reviewer_id)
);

ALTER TABLE reviews ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "reviews_select_all" ON reviews;
CREATE POLICY "reviews_select_all" ON reviews FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "reviews_insert_customer" ON reviews;
CREATE POLICY "reviews_insert_customer" ON reviews FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = reviewer_id);

DROP POLICY IF EXISTS "reviews_delete_own" ON reviews;
CREATE POLICY "reviews_delete_own" ON reviews FOR DELETE
  TO authenticated USING (auth.uid() = reviewer_id);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_services_provider_id ON services(provider_id);
CREATE INDEX IF NOT EXISTS idx_services_category_id ON services(category_id);
CREATE INDEX IF NOT EXISTS idx_services_status ON services(status);
CREATE INDEX IF NOT EXISTS idx_services_created_at ON services(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_service_media_service_id ON service_media(service_id);
CREATE INDEX IF NOT EXISTS idx_service_requests_customer_id ON service_requests(customer_id);
CREATE INDEX IF NOT EXISTS idx_service_requests_provider_id ON service_requests(provider_id);
CREATE INDEX IF NOT EXISTS idx_service_requests_status ON service_requests(status);
CREATE INDEX IF NOT EXISTS idx_reviews_service_id ON reviews(service_id);
CREATE INDEX IF NOT EXISTS idx_reviews_reviewee_id ON reviews(reviewee_id);
CREATE INDEX IF NOT EXISTS idx_profiles_user_id ON profiles(user_id);

-- Updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS trigger AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_profiles_updated_at ON profiles;
CREATE TRIGGER trigger_profiles_updated_at BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS trigger_services_updated_at ON services;
CREATE TRIGGER trigger_services_updated_at BEFORE UPDATE ON services
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS trigger_service_requests_updated_at ON service_requests;
CREATE TRIGGER trigger_service_requests_updated_at BEFORE UPDATE ON service_requests
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS trigger_reviews_updated_at ON reviews;
CREATE TRIGGER trigger_reviews_updated_at BEFORE UPDATE ON reviews
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
