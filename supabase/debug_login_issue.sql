-- Debug script to run in Supabase SQL Editor
-- This will help identify the "database error querying schema" issue

-- 1. Check if profiles table has the email column
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'profiles' AND table_schema = 'public';

-- 2. Check if the user exists in auth.users
SELECT id, email, created_at
FROM auth.users
WHERE email = 'kabir.music@example.com';

-- 3. Check if the profile exists for this user
SELECT p.*, u.email as auth_email
FROM profiles p
LEFT JOIN auth.users u ON p.user_id = u.id
WHERE u.email = 'kabir.music@example.com';

-- 4. Test the query that the client makes (simulate loadProfile)
-- This mimics: supabase.from('profiles').select('*').eq('user_id', '10000000-0000-0000-0000-000000000009').maybeSingle()
SELECT *
FROM profiles
WHERE user_id = '10000000-0000-0000-0000-000000000009';

-- 5. Check RLS policies on profiles
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check
FROM pg_policies
WHERE tablename = 'profiles';

-- 6. Test if authenticated role can read profiles
-- Run this as the authenticated user (or use Supabase's "Run as authenticated" feature)
-- SET ROLE authenticated;
-- SELECT * FROM profiles WHERE user_id = '10000000-0000-0000-0000-000000000009';