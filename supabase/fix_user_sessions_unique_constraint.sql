-- Migration: Fix user_sessions table to add UNIQUE constraint on user_id
-- This fixes the 400 Bad Request error: "there is no unique or exclusion constraint matching the ON CONFLICT specification"

-- Step 1: Remove any duplicate sessions (keep only the most recent one per user)
DELETE FROM public.user_sessions
WHERE id NOT IN (
  SELECT DISTINCT ON (user_id) id
  FROM public.user_sessions
  ORDER BY user_id, last_activity DESC
);

-- Step 2: Add UNIQUE constraint on user_id
-- This allows ON CONFLICT (user_id) to work properly
ALTER TABLE public.user_sessions
ADD CONSTRAINT user_sessions_user_id_key UNIQUE (user_id);

-- Step 3: Recreate the update_user_session function (no changes needed, but ensuring it's correct)
CREATE OR REPLACE FUNCTION public.update_user_session(
  p_user_id UUID,
  p_ip_address TEXT DEFAULT NULL,
  p_user_agent TEXT DEFAULT NULL
)
RETURNS VOID AS $$
BEGIN
  INSERT INTO public.user_sessions (user_id, ip_address, user_agent, last_activity)
  VALUES (p_user_id, p_ip_address, p_user_agent, NOW())
  ON CONFLICT (user_id) DO UPDATE
  SET 
    last_activity = NOW(),
    ip_address = COALESCE(p_ip_address, user_sessions.ip_address),
    user_agent = COALESCE(p_user_agent, user_sessions.user_agent),
    updated_at = NOW()
  WHERE user_sessions.user_id = p_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Verify the constraint was added
SELECT
  conname AS constraint_name,
  contype AS constraint_type,
  pg_get_constraintdef(oid) AS constraint_definition
FROM pg_constraint
WHERE conrelid = 'public.user_sessions'::regclass
  AND conname = 'user_sessions_user_id_key';
