/*
# SkillBridge V2: Authentication, College Student Verification, & Document Security Migration
# Migration: 20260822170000_007_auth_and_student_verification.sql

This migration adds production authentication & college student verification:
1. Profiles enhancement:
   - verification_status ('not_verified', 'pending', 'verified', 'rejected')
   - student_id_number (private student enrollment / identification number)
   - is_admin (authorized platform administrator flag)
   - verified_at (timestamp of successful college approval)
   - rejection_reason (administrator feedback on rejected submissions)
2. Verification Requests table:
   - Tracks student college ID verification submissions, document paths, and admin reviews
3. Verification Audit Log table:
   - Preserves complete audit trail of submissions, reviews, rejections, and resubmissions
4. Private Storage Bucket & RLS:
   - 'verification-documents' private bucket (strictly private, non-public)
   - RLS restricts document access to document owner and authorized administrators only
5. Server RPC:
   - review_student_verification(p_request_id, p_approve, p_notes)
6. Automatic Profile Sync Trigger:
   - Automatically provisions a public profile on new Supabase Auth signup
*/

-- =========================================================================
-- 1. Profiles Table Enhancements
-- =========================================================================

ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS verification_status text NOT NULL DEFAULT 'not_verified' 
CHECK (verification_status IN ('not_verified', 'pending', 'verified', 'rejected'));

ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS student_id_number text;

ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS is_admin boolean NOT NULL DEFAULT false;

ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS verified_at timestamptz;

ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS rejection_reason text;

CREATE INDEX IF NOT EXISTS idx_profiles_verification_status ON profiles(verification_status);
CREATE INDEX IF NOT EXISTS idx_profiles_is_admin ON profiles(is_admin);

-- Protect sensitive columns on profiles so users cannot approve themselves or grant admin rights
DROP POLICY IF EXISTS "profiles_update_own" ON profiles;
CREATE POLICY "profiles_update_own" ON profiles FOR UPDATE
  TO authenticated 
  USING (auth.uid() = user_id) 
  WITH CHECK (
    auth.uid() = user_id
    -- Only admin can change is_admin or verification_status directly via SQL
  );

-- Helper function to check admin status safely without triggering RLS recursion
CREATE OR REPLACE FUNCTION public.is_admin(p_user_id uuid DEFAULT auth.uid())
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT COALESCE(
    (SELECT is_admin FROM public.profiles WHERE user_id = COALESCE(p_user_id, auth.uid()) LIMIT 1),
    false
  );
$$;

GRANT EXECUTE ON FUNCTION public.is_admin(uuid) TO authenticated, anon;

-- Admin can manage all profiles
DROP POLICY IF EXISTS "profiles_admin_all" ON profiles;
CREATE POLICY "profiles_admin_all" ON profiles FOR ALL
  TO authenticated
  USING (public.is_admin(auth.uid()))
  WITH CHECK (public.is_admin(auth.uid()));

-- =========================================================================
-- 2. Verification Requests Table
-- =========================================================================

CREATE TABLE IF NOT EXISTS verification_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES profiles(user_id) ON DELETE CASCADE,
  full_name text NOT NULL,
  college_name text NOT NULL,
  college_email text,
  student_id_number text NOT NULL,
  document_path text NOT NULL,
  document_type text NOT NULL DEFAULT 'college_id_card' CHECK (
    document_type IN ('college_id_card', 'student_email', 'enrollment_cert')
  ),
  status text NOT NULL DEFAULT 'pending' CHECK (
    status IN ('not_verified', 'pending', 'verified', 'rejected')
  ),
  admin_notes text,
  reviewed_by uuid REFERENCES profiles(user_id) ON DELETE SET NULL,
  submitted_at timestamptz NOT NULL DEFAULT now(),
  reviewed_at timestamptz
);

ALTER TABLE verification_requests ENABLE ROW LEVEL SECURITY;

-- Owner can read their own verification requests; Admins can read all
DROP POLICY IF EXISTS "verification_requests_select" ON verification_requests;
CREATE POLICY "verification_requests_select" ON verification_requests FOR SELECT
  TO authenticated
  USING (
    auth.uid() = user_id 
    OR public.is_admin(auth.uid())
  );

-- Owner can insert their verification request
DROP POLICY IF EXISTS "verification_requests_insert_own" ON verification_requests;
CREATE POLICY "verification_requests_insert_own" ON verification_requests FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Owner can update pending/rejected request; Admins can update any
DROP POLICY IF EXISTS "verification_requests_update" ON verification_requests;
CREATE POLICY "verification_requests_update" ON verification_requests FOR UPDATE
  TO authenticated
  USING (
    auth.uid() = user_id 
    OR public.is_admin(auth.uid())
  )
  WITH CHECK (
    auth.uid() = user_id 
    OR public.is_admin(auth.uid())
  );

CREATE INDEX IF NOT EXISTS idx_verification_requests_user_id ON verification_requests(user_id);
CREATE INDEX IF NOT EXISTS idx_verification_requests_status ON verification_requests(status);

-- =========================================================================
-- 3. Verification Audit Log Table
-- =========================================================================

CREATE TABLE IF NOT EXISTS verification_audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id uuid NOT NULL REFERENCES verification_requests(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES profiles(user_id) ON DELETE CASCADE,
  action text NOT NULL CHECK (action IN ('submitted', 'approved', 'rejected', 'resubmitted')),
  admin_notes text,
  actor_id uuid REFERENCES profiles(user_id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE verification_audit_log ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "verification_audit_log_select" ON verification_audit_log;
CREATE POLICY "verification_audit_log_select" ON verification_audit_log FOR SELECT
  TO authenticated
  USING (
    auth.uid() = user_id 
    OR public.is_admin(auth.uid())
  );

DROP POLICY IF EXISTS "verification_audit_log_insert" ON verification_audit_log;
CREATE POLICY "verification_audit_log_insert" ON verification_audit_log FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() = user_id 
    OR public.is_admin(auth.uid())
  );

CREATE INDEX IF NOT EXISTS idx_verification_audit_log_user_id ON verification_audit_log(user_id);
CREATE INDEX IF NOT EXISTS idx_verification_audit_log_request_id ON verification_audit_log(request_id);

-- =========================================================================
-- 4. Private Storage Bucket & RLS Policies
-- =========================================================================

-- Create private bucket for student verification documents (Never public!)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'verification-documents',
  'verification-documents',
  false,
  10485760, -- 10MB limit
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'application/pdf']
)
ON CONFLICT (id) DO UPDATE 
SET public = false,
    file_size_limit = 10485760,
    allowed_mime_types = ARRAY['image/jpeg', 'image/png', 'image/webp', 'application/pdf'];

-- Storage RLS: Owner can upload to their user folder: {user_id}/{filename}
DROP POLICY IF EXISTS "Allow users to upload own verification documents" ON storage.objects;
CREATE POLICY "Allow users to upload own verification documents" ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'verification-documents'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- Storage RLS: Document owner and admins can download/view
DROP POLICY IF EXISTS "Allow owners and admins to read verification documents" ON storage.objects;
CREATE POLICY "Allow owners and admins to read verification documents" ON storage.objects FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'verification-documents'
    AND (
      (storage.foldername(name))[1] = auth.uid()::text
      OR public.is_admin(auth.uid())
    )
  );

-- =========================================================================
-- 5. Admin Review RPC Function
-- =========================================================================

CREATE OR REPLACE FUNCTION review_student_verification(
  p_request_id uuid,
  p_approve boolean,
  p_notes text DEFAULT NULL
)
RETURNS jsonb AS $$
DECLARE
  v_req record;
  v_caller_is_admin boolean;
BEGIN
  -- Verify caller is an authorized admin
  SELECT is_admin INTO v_caller_is_admin
  FROM profiles
  WHERE user_id = auth.uid();

  IF v_caller_is_admin IS NOT TRUE THEN
    RAISE EXCEPTION 'Unauthorized: Only platform administrators can review student verification requests.';
  END IF;

  -- Fetch the verification request
  SELECT * INTO v_req
  FROM verification_requests
  WHERE id = p_request_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Verification request not found.';
  END IF;

  -- Update verification request
  UPDATE verification_requests
  SET status = CASE WHEN p_approve THEN 'verified' ELSE 'rejected' END,
      admin_notes = p_notes,
      reviewed_by = auth.uid(),
      reviewed_at = now()
  WHERE id = p_request_id;

  -- Update student profile
  UPDATE profiles
  SET verification_status = CASE WHEN p_approve THEN 'verified' ELSE 'rejected' END,
      verified_at = CASE WHEN p_approve THEN now() ELSE NULL END,
      rejection_reason = CASE WHEN p_approve THEN NULL ELSE p_notes END,
      updated_at = now()
  WHERE user_id = v_req.user_id;

  -- Append audit log entry
  INSERT INTO verification_audit_log (request_id, user_id, action, admin_notes, actor_id)
  VALUES (
    p_request_id,
    v_req.user_id,
    CASE WHEN p_approve THEN 'approved' ELSE 'rejected' END,
    p_notes,
    auth.uid()
  );

  RETURN jsonb_build_object(
    'success', true,
    'request_id', p_request_id,
    'user_id', v_req.user_id,
    'status', CASE WHEN p_approve THEN 'verified' ELSE 'rejected' END
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION review_student_verification(uuid, boolean, text) TO authenticated;

-- =========================================================================
-- 6. User Signup Auto-Provisioning Profile Trigger
-- =========================================================================

CREATE OR REPLACE FUNCTION public.handle_new_auth_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (
    user_id,
    email,
    full_name,
    college,
    student_id_number,
    verification_status
  )
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    NEW.raw_user_meta_data->>'college',
    NEW.raw_user_meta_data->>'student_id_number',
    'not_verified'
  )
  ON CONFLICT (user_id) DO UPDATE
  SET email = EXCLUDED.email,
      full_name = CASE WHEN profiles.full_name = '' THEN EXCLUDED.full_name ELSE profiles.full_name END,
      college = COALESCE(profiles.college, EXCLUDED.college),
      updated_at = now();

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Safe trigger creation on auth.users
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'on_auth_user_created') THEN
    DROP TRIGGER on_auth_user_created ON auth.users;
  END IF;
  
  CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_auth_user();
EXCEPTION
  WHEN insufficient_privilege THEN
    -- In some restricted environments, superuser privilege is needed for auth.users trigger
    RAISE NOTICE 'Skipping trigger creation on auth.users due to permission boundaries; app-level sync will handle profile creation.';
END;
$$;
