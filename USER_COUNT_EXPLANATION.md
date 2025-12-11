# User Count Explanation

## What the numbers mean:

### Total Users = 5
- These are ALL registered accounts that exist in your Supabase `auth.users`
- Includes users who signed up but never logged in
- Includes users who logged in once and never came back

### Active Users (Last 30 min) = 4
- These are users who have ACTUALLY VISITED the dashboard in the last 30 minutes
- Tracked via the `user_sessions` table
- Updated every time a user interacts with the app (mousemove, click, scroll, etc.)
- **Only counts users who are actively using the app**

## Why might "Active Users" be less than "Total Users"?

1. **New signups that never logged in** - They're registered but never accessed dashboard
2. **Users who logged in 30+ minutes ago** - They're past the 30-minute activity window
3. **Users on different sessions** - Their session tracking might not have updated yet

## How to see ALL activity:

Run this SQL in Supabase:
```sql
SELECT 
  au.email,
  p.full_name,
  us.last_activity,
  (NOW() - us.last_activity) as time_since_active
FROM auth.users au
LEFT JOIN public.profiles p ON au.id = p.id
LEFT JOIN public.user_sessions us ON au.id = us.user_id
ORDER BY au.created_at DESC;
```

This shows:
- All registered users (even without profiles)
- When they last were active
- If NULL = never visited the app
