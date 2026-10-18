-- =========================================================================
-- SkillBridge Migration 016: Fix Infinite Recursion in Profiles RLS Policy
-- 
-- Description:
-- Replaces direct recursive subqueries on `profiles` with a SECURITY DEFINER
-- function `public.is_admin()`. This eliminates the PostgreSQL error:
-- "infinite recursion detected in policy for relation 'profiles'".
-- =========================================================================

-- 1. Create SECURITY DEFINER is_admin() helper
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
COMMENT ON FUNCTION public.is_admin(uuid) IS 'Checks platform administrator authority safely without triggering RLS recursion loops.';

-- 2. Drop recursive admin policy on profiles and replace with safe function
DROP POLICY IF EXISTS "profiles_admin_all" ON public.profiles;
DROP POLICY IF EXISTS "profiles_admin_all" ON profiles;

CREATE POLICY "profiles_admin_all" ON public.profiles FOR ALL
  TO authenticated
  USING (public.is_admin(auth.uid()))
  WITH CHECK (public.is_admin(auth.uid()));

-- 3. Fix verification_requests policies to use public.is_admin()
DROP POLICY IF EXISTS "verification_requests_select" ON public.verification_requests;
DROP POLICY IF EXISTS "verification_requests_select" ON verification_requests;

CREATE POLICY "verification_requests_select" ON public.verification_requests FOR SELECT
  TO authenticated
  USING (
    auth.uid() = user_id 
    OR public.is_admin(auth.uid())
  );

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

-- 4. Fix verification_audit_log policies to use public.is_admin()
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

-- 5. Fix storage objects policy
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

NOTIFY pgrst, 'reload schema';
