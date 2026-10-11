/*
# SkillBridge V2: Profiles, Roles, Onboarding & Media Schema
# Migration: 20260822190000_009_profiles_roles_and_media.sql

This migration enhances student profiles for Buyer/Seller roles, structured onboarding, and media storage:
1. Adds role & onboarding tracking columns to `public.profiles`:
   - active_role: Current active context ('buyer' or 'seller')
   - onboarding_completed: Flag indicating completion of initial onboarding wizard
   - seller_onboarding_completed: Flag indicating completion of seller specialization setup
   - skills: Array of campus freelancer skills (e.g. React, UI/UX, Video Editing, Tutoring)
   - preferred_categories: Categories the student wants to offer or hire for
   - portfolio_links: Array/JSON of projects, GitHub, Behance, and portfolio showcases
   - pricing_preferences: JSON containing hourly rate, starting rate, negotiable flags
   - social_links: JSON containing LinkedIn, GitHub, Instagram, personal site
2. Configures public storage buckets for profile avatars and portfolio media:
   - 'avatars': Public bucket for user profile pictures (5MB limit)
   - 'portfolio-media': Public bucket for portfolio project assets (15MB limit)
3. Establishes Row Level Security policies on storage.objects for avatars and portfolio media.
*/

-- =========================================================================
-- 1. Extend Profiles Table with Role & Seller Specialization Columns
-- =========================================================================

ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS active_role text DEFAULT 'buyer';
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS onboarding_completed boolean DEFAULT false;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS seller_onboarding_completed boolean DEFAULT false;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS skills text[] DEFAULT '{}';
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS preferred_categories text[] DEFAULT '{}';
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS portfolio_links jsonb DEFAULT '[]'::jsonb;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS pricing_preferences jsonb DEFAULT '{"hourly_rate": 0, "currency": "INR", "negotiable": true}'::jsonb;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS social_links jsonb DEFAULT '{}'::jsonb;

-- Add check constraint for active_role if not present
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'profiles_active_role_check'
  ) THEN
    ALTER TABLE public.profiles 
      ADD CONSTRAINT profiles_active_role_check 
      CHECK (active_role IN ('buyer', 'seller'));
  END IF;
END $$;

-- =========================================================================
-- 2. Configure Storage Buckets for Avatars & Portfolio Media
-- =========================================================================

-- Avatars bucket (public read, authenticated user write)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'avatars',
  'avatars',
  true,
  5242880, -- 5MB limit
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif']
)
ON CONFLICT (id) DO UPDATE
SET public = true,
    file_size_limit = 5242880,
    allowed_mime_types = ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif'];

-- Portfolio media bucket (public read, authenticated user write)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'portfolio-media',
  'portfolio-media',
  true,
  15728640, -- 15MB limit
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'application/pdf']
)
ON CONFLICT (id) DO UPDATE
SET public = true,
    file_size_limit = 15728640,
    allowed_mime_types = ARRAY['image/jpeg', 'image/png', 'image/webp', 'application/pdf'];

-- =========================================================================
-- 3. Storage Row Level Security (RLS) Policies
-- =========================================================================

-- Anyone can view avatars and portfolio media
DROP POLICY IF EXISTS "Public can view avatars and portfolio media" ON storage.objects;
CREATE POLICY "Public can view avatars and portfolio media" ON storage.objects FOR SELECT
  TO anon, authenticated
  USING (bucket_id IN ('avatars', 'portfolio-media'));

-- Authenticated users can upload to their own user directory: {bucket}/{user_id}/{filename}
DROP POLICY IF EXISTS "Users can upload their own avatars" ON storage.objects;
CREATE POLICY "Users can upload their own avatars" ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'avatars'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

DROP POLICY IF EXISTS "Users can upload their own portfolio media" ON storage.objects;
CREATE POLICY "Users can upload their own portfolio media" ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'portfolio-media'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- Users can update or delete their own avatars and portfolio media
DROP POLICY IF EXISTS "Users can update own avatar and portfolio media" ON storage.objects;
CREATE POLICY "Users can update own avatar and portfolio media" ON storage.objects FOR UPDATE
  TO authenticated
  USING (
    bucket_id IN ('avatars', 'portfolio-media')
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

DROP POLICY IF EXISTS "Users can delete own avatar and portfolio media" ON storage.objects;
CREATE POLICY "Users can delete own avatar and portfolio media" ON storage.objects FOR DELETE
  TO authenticated
  USING (
    bucket_id IN ('avatars', 'portfolio-media')
    AND (storage.foldername(name))[1] = auth.uid()::text
  );
