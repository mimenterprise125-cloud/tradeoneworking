-- Drop the existing function first
DROP FUNCTION IF EXISTS get_user_count_stats();

-- Create a function to get user statistics
-- This function counts:
-- 1. Total registered users (from profiles)
-- 2. Total auth users
-- 3. Active users (visited in last 30 minutes)
CREATE OR REPLACE FUNCTION get_user_count_stats()
RETURNS TABLE (
  total_profiles INTEGER,
  total_auth_users INTEGER,
  online_users_count INTEGER
) 
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    (SELECT COUNT(*) FROM public.profiles)::INTEGER as total_profiles,
    (SELECT COUNT(*) FROM auth.users)::INTEGER as total_auth_users,
    COALESCE(
      (SELECT COUNT(DISTINCT user_id) FROM public.user_sessions WHERE last_activity > NOW() - INTERVAL '30 minutes'),
      0
    )::INTEGER as online_users_count;
$$;

-- Grant execute to authenticated users
GRANT EXECUTE ON FUNCTION get_user_count_stats() TO authenticated;

-- Also create a simple trigger to auto-create profiles for new auth users
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', SPLIT_PART(NEW.email, '@', 1), 'User')
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop the old trigger if it exists
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- Create the trigger
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
