-- Add email column to profiles table for easy access
-- This allows querying user emails without joining auth.users

-- 1. Add email column to profiles
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS email text;

-- 2. Create index for email lookups
CREATE INDEX IF NOT EXISTS idx_profiles_email ON profiles(email);

-- 3. Update existing profiles with emails from auth.users
-- This uses a join to populate email for existing users
UPDATE profiles p
SET email = u.email
FROM auth.users u
WHERE p.user_id = u.id
  AND p.email IS NULL;

-- 4. Create a function to sync email from auth.users to profiles
-- This can be called from application code or via trigger
CREATE OR REPLACE FUNCTION sync_user_email()
RETURNS trigger AS $$
BEGIN
  -- Update the profiles table with the email from auth.users
  UPDATE profiles
  SET email = NEW.email,
      updated_at = now()
  WHERE user_id = NEW.id;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5. Create a trigger on auth.users to automatically sync email
-- Note: This requires the function to be SECURITY DEFINER and the trigger
-- to be created by a superuser. In Supabase, you may need to run this
-- via the SQL editor with elevated privileges.
--
-- DROP TRIGGER IF EXISTS trigger_sync_user_email ON auth.users;
-- CREATE TRIGGER trigger_sync_user_email
--   AFTER INSERT OR UPDATE ON auth.users
--   FOR EACH ROW
--   EXECUTE FUNCTION sync_user_email();

-- 6. Alternative: Create a helper function to manually sync a user's email
-- This can be called from your application after user signup
CREATE OR REPLACE FUNCTION public.sync_profile_email(p_user_id uuid)
RETURNS void AS $$
DECLARE
  v_email text;
BEGIN
  -- Get email from auth.users
  SELECT email INTO v_email
  FROM auth.users
  WHERE id = p_user_id;
  
  -- Update profiles table
  IF v_email IS NOT NULL THEN
    UPDATE profiles
    SET email = v_email,
        updated_at = now()
    WHERE user_id = p_user_id;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 7. Grant execute permission on the helper function
GRANT EXECUTE ON FUNCTION public.sync_profile_email(uuid) TO authenticated, anon;

-- 8. Add comment for documentation
COMMENT ON COLUMN profiles.email IS 'User email address, synced from auth.users for easy querying';
COMMENT ON FUNCTION public.sync_profile_email(uuid) IS 'Syncs a user email from auth.users to profiles table. Call after user signup.';