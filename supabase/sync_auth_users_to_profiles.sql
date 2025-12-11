-- Create profiles for all existing auth users who don't have one
INSERT INTO public.profiles (id, full_name, created_at)
SELECT 
  id,
  COALESCE(
    (raw_user_meta_data->>'full_name'),
    SPLIT_PART(email, '@', 1),
    'User'
  ) as full_name,
  NOW()
FROM auth.users
WHERE id NOT IN (SELECT id FROM public.profiles)
ON CONFLICT (id) DO NOTHING;

-- Log the result
SELECT COUNT(*) as profiles_synced FROM public.profiles;
