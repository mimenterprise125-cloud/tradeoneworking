import React from 'react';
import useSessionTracking from '@/hooks/useSessionTracking';

/**
 * Wrapper component to enable session tracking
 * Place this inside AuthProvider so useAuth() works
 */
export const SessionTracker: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // Hook will automatically track user activity
  useSessionTracking();

  return <>{children}</>;
};

export default SessionTracker;
