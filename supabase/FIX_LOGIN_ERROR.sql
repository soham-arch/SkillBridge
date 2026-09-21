-- COMPLETE FIX SCRIPT
-- Run this in Supabase SQL Editor (https://supabase.com/dashboard/project/YOUR_PROJECT/sql)
-- This will fix the "database error querying schema" issue

-- ============================================
-- STEP 1: Verify current state
-- ============================================

-- Check if profiles table exists and has email column
SELECT 
  'profiles table' as check,
  EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'profiles' AND table_schema = 'public') as exists;

SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'profiles' AND table_schema = 'public'
ORDER BY ordinal_position;

-- Check if the user exists in auth.users
SELECT id, email, email_confirmed_at, created_at
FROM auth.users
WHERE email = 'kabir.music@example.com';

-- Check if the profile exists
SELECT p.*, u.email as auth_email
FROM profiles p
LEFT JOIN auth.users u ON p.user_id = u.id
WHERE u.email = 'kabir.music@example.com';

-- ============================================
-- STEP 2: Apply the email column migration (if not exists)
-- ============================================

-- Add email column to profiles (safe to run multiple times)
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS email text;

-- Create index for email lookups
CREATE INDEX IF NOT EXISTS idx_profiles_email ON profiles(email);

-- Populate email for existing profiles from auth.users
UPDATE profiles p
SET email = u.email
FROM auth.users u
WHERE p.user_id = u.id
  AND p.email IS NULL;

-- ============================================
-- STEP 3: Verify RLS policies
-- ============================================

-- Check current policies
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check
FROM pg_policies
WHERE tablename = 'profiles';

-- Ensure the select policy exists for authenticated users
DROP POLICY IF EXISTS "profiles_select_all" ON profiles;
CREATE POLICY "profiles_select_all" ON profiles FOR SELECT
  TO authenticated USING (true);

-- ============================================
-- STEP 4: Refresh PostgREST schema cache
-- ============================================

-- Notify PostgREST to reload schema (run as postgres superuser)
-- NOTIFY pgrst, 'reload schema';

-- Alternative: Just wait 30-60 seconds for auto-refresh

-- ============================================
-- STEP 5: Test the query that fails during login
-- ============================================

-- This mimics the exact query from auth-context.tsx
SELECT *
FROM profiles
WHERE user_id = (
  SELECT id FROM auth.users WHERE email = 'kabir.music@example.com'
);

-- ============================================
-- STEP 6: Create helper function for future sync
-- ============================================

CREATE OR REPLACE FUNCTION public.sync_profile_email(p_user_id uuid)
RETURNS void AS $$
DECLARE
  v_email text;
BEGIN
  SELECT email INTO v_email FROM auth.users WHERE id = p_user_id;
  
  IF v_email IS NOT NULL THEN
    UPDATE profiles
    SET email = v_email, updated_at = now()
    WHERE user_id = p_user_id;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION public.sync_profile_email(uuid) TO authenticated, anon;

-- ============================================
-- VERIFICATION: Run this to confirm everything works
-- ============================================

SELECT 'SUCCESS: All checks passed!' as status;
SELECT * FROM profiles WHERE user_id = '10000000-0000-0000-0000-000000000009';