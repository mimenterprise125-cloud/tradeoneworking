-- Diagnostic query to check user_sessions data
SELECT 
  us.user_id,
  us.last_activity,
  NOW() as current_time,
  (NOW() - us.last_activity) as time_since_activity,
  p.full_name,
  au.email,
  CASE 
    WHEN us.last_activity > NOW() - INTERVAL '5 minutes' THEN '✅ Online (5min)'
    WHEN us.last_activity > NOW() - INTERVAL '15 minutes' THEN '🟡 Active (15min)'
    WHEN us.last_activity > NOW() - INTERVAL '30 minutes' THEN '🟠 Active (30min)'
    WHEN us.last_activity > NOW() - INTERVAL '1 day' THEN '⚪ Inactive (1day)'
    ELSE '⚫ Offline (1day+)'
  END as status
FROM public.user_sessions us
LEFT JOIN public.profiles p ON us.user_id = p.id
LEFT JOIN auth.users au ON us.user_id = au.id
ORDER BY us.last_activity DESC;

-- Check profiles and auth users
SELECT 
  (SELECT COUNT(*) FROM public.profiles) as total_profiles,
  (SELECT COUNT(*) FROM auth.users) as total_auth_users,
  (SELECT COUNT(*) FROM public.user_sessions) as total_sessions;

-- Show all auth users (even without sessions)
SELECT id, email, created_at FROM auth.users ORDER BY created_at DESC LIMIT 10;

-- Show all profiles
SELECT id, full_name, created_at FROM public.profiles ORDER BY created_at DESC LIMIT 10;
