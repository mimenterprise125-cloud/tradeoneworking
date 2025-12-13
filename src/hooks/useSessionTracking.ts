import { useEffect, useRef } from 'react';
import { useAuth } from '@/lib/AuthProvider';
import supabase from '@/lib/supabase';

/**
 * Hook to track user activity in real-time
 * Updates the user_sessions table frequently to show real-time online status
 * This allows the admin panel to show real-time online users
 */
export const useSessionTracking = () => {
  const { user } = useAuth();
  const lastUpdateRef = useRef<number>(0);

  useEffect(() => {
    if (!user?.id) return;

    // Function to update session
    const updateSession = async () => {
      try {
        const now = Date.now();
        const lastUpdate = lastUpdateRef.current;
        
        // Don't update more than once per minute to avoid spam
        if (now - lastUpdate < 60 * 1000) {
          return;
        }

        lastUpdateRef.current = now;
        const userAgent = navigator.userAgent;
        
        // Call the RPC function to update session
        const { error } = await supabase.rpc('update_user_session', {
          p_user_id: user.id,
          p_user_agent: userAgent,
        });

        if (error) {
          console.warn('⚠️ Failed to update session:', error);
        } else {
          console.log('✅ Session updated for user:', user.id);
        }
      } catch (err) {
        console.warn('Session tracking error:', err);
      }
    };

    // Update on mount immediately
    updateSession();

    // Update every 2 minutes (aggressive tracking)
    const interval = setInterval(updateSession, 2 * 60 * 1000);

    // Update on user interaction (debounced) - Only for significant actions
    let activityTimeout: NodeJS.Timeout;
    const handleUserActivity = () => {
      clearTimeout(activityTimeout);
      // Debounce to once per minute to avoid excessive updates
      activityTimeout = setTimeout(() => {
        updateSession();
      }, 60000); // 1 minute debounce
    };

    // Listen for significant user interactions only
    // Removed scroll and mousemove to reduce noise on mobile
    window.addEventListener('keypress', handleUserActivity);
    window.addEventListener('click', handleUserActivity);
    window.addEventListener('touchstart', handleUserActivity);

    // Cleanup
    return () => {
      clearInterval(interval);
      clearTimeout(activityTimeout);
      window.removeEventListener('keypress', handleUserActivity);
      window.removeEventListener('click', handleUserActivity);
      window.removeEventListener('touchstart', handleUserActivity);
    };
  }, [user?.id]);
};

export default useSessionTracking;
