-- =========================================================================
-- SkillBridge Fix: Resolve Infinite Recursion in Profiles RLS Policy
-- 
-- Run this script in your Supabase Dashboard:
-- https://supabase.com/dashboard/project/_/sql
-- =========================================================================

-- STEP 1: Create a SECURITY DEFINER helper function to check admin status
-- A SECURITY DEFINER function executes with the privileges of the creator
-- (database owner/superuser), bypassing Row Level Security on the profiles table
-- and permanently preventing recursive policy evaluation loops.

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
COMMENT ON FUNCTION public.is_admin(uuid) IS 'Safely checks whether a user has platform administrator authority without triggering RLS recursion.';

-- =========================================================================
-- STEP 2: Fix Policies on public.profiles
-- Drop the recursive "profiles_admin_all" policy that queried profiles within profiles
-- =========================================================================

DROP POLICY IF EXISTS "profiles_admin_all" ON public.profiles;
DROP POLICY IF EXISTS "profiles_admin_all" ON profiles;

-- Recreate safely using the SECURITY DEFINER function
CREATE POLICY "profiles_admin_all" ON public.profiles FOR ALL
  TO authenticated
  USING (public.is_admin(auth.uid()))
  WITH CHECK (public.is_admin(auth.uid()));

-- Ensure standard non-admin profile policies remain healthy
DROP POLICY IF EXISTS "profiles_select_all" ON public.profiles;
DROP POLICY IF EXISTS "profiles_select_authenticated" ON public.profiles;
CREATE POLICY "profiles_select_authenticated" ON public.profiles FOR SELECT
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS "profiles_insert_own" ON public.profiles;
CREATE POLICY "profiles_insert_own" ON public.profiles FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "profiles_update_own" ON public.profiles;
CREATE POLICY "profiles_update_own" ON public.profiles FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- =========================================================================
-- STEP 3: Fix Policies on public.verification_requests
-- =========================================================================

DROP POLICY IF EXISTS "verification_requests_select" ON public.verification_requests;
DROP POLICY IF EXISTS "verification_requests_select" ON verification_requests;

CREATE POLICY "verification_requests_select" ON public.verification_requests FOR SELECT
  TO authenticated
  USING (
    auth.uid() = user_id 
    OR public.is_admin(auth.uid())
  );

DROP POLICY IF EXISTS "verification_requests_insert_own" ON public.verification_requests;
DROP POLICY IF EXISTS "verification_requests_insert_own" ON verification_requests;

CREATE POLICY "verification_requests_insert_own" ON public.verification_requests FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "verification_requests_update" ON public.verification_requests;
DROP POLICY IF EXISTS "verification_requests_update" ON verification_requests;

CREATE POLICY "verification_requests_update" ON public.verification_requests FOR UPDATE
  TO authenticated
  USING (
    auth.uid() = user_id 
    OR public.is_admin(auth.uid())
  )
  WITH CHECK (
    auth.uid() = user_id 
    OR public.is_admin(auth.uid())
  );

-- =========================================================================
-- STEP 4: Fix Policies on public.verification_audit_log
-- =========================================================================

DROP POLICY IF EXISTS "verification_audit_log_select" ON public.verification_audit_log;
DROP POLICY IF EXISTS "verification_audit_log_select" ON verification_audit_log;

CREATE POLICY "verification_audit_log_select" ON public.verification_audit_log FOR SELECT
  TO authenticated
  USING (
    auth.uid() = user_id 
    OR public.is_admin(auth.uid())
  );

DROP POLICY IF EXISTS "verification_audit_log_insert" ON public.verification_audit_log;
DROP POLICY IF EXISTS "verification_audit_log_insert" ON verification_audit_log;

CREATE POLICY "verification_audit_log_insert" ON public.verification_audit_log FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() = actor_id 
    OR public.is_admin(auth.uid())
  );

-- =========================================================================
-- STEP 5: Fix Storage Policies for verification-documents bucket
-- =========================================================================

DROP POLICY IF EXISTS "Allow owners and admins to read verification documents" ON storage.objects;
DROP POLICY IF EXISTS "Admins and owners can view verification documents" ON storage.objects;

CREATE POLICY "Allow owners and admins to read verification documents" ON storage.objects FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'verification-documents'
    AND (
      (storage.foldername(name))[1] = auth.uid()::text
      OR public.is_admin(auth.uid())
    )
  );

-- Reload PostgREST schema cache
NOTIFY pgrst, 'reload schema';

-- Verify current policies
SELECT tablename, policyname, cmd, permissive
FROM pg_policies
WHERE tablename IN ('profiles', 'verification_requests', 'verification_audit_log')
ORDER BY tablename, policyname;
