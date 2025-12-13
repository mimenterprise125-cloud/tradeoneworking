-- Create user_sessions table to track online users in real-time
CREATE TABLE IF NOT EXISTS public.user_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  last_activity TIMESTAMPTZ DEFAULT NOW(),
  ip_address TEXT,
  user_agent TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT user_sessions_user_id_key UNIQUE (user_id)
);

-- Create index for fast lookups (user_id already has unique index via constraint)
CREATE INDEX IF NOT EXISTS idx_user_sessions_last_activity ON public.user_sessions(last_activity DESC);

-- Enable RLS
ALTER TABLE public.user_sessions ENABLE ROW LEVEL SECURITY;

-- RLS Policies - Users can only see/update their own sessions
CREATE POLICY "Users can view their own sessions"
  ON public.user_sessions
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own sessions"
  ON public.user_sessions
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own sessions"
  ON public.user_sessions
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Function to update user session activity
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
    ip_address = COALESCE(p_ip_address, public.user_sessions.ip_address),
    user_agent = COALESCE(p_user_agent, public.user_sessions.user_agent),
    updated_at = NOW()
  WHERE public.user_sessions.user_id = p_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION public.update_user_session(UUID, TEXT, TEXT) TO authenticated;
