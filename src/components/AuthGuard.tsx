import React, { useEffect, useState } from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '@/lib/AuthProvider'
import { Loader } from 'lucide-react'

export const AuthGuard = ({ children }: { children: React.ReactNode }) => {
  const { user, loading } = useAuth()
  const location = useLocation()
  const [isChecking, setIsChecking] = useState(true)
  const [shouldRedirect, setShouldRedirect] = useState(false)

  useEffect(() => {
    //console.log('🛡️ AuthGuard check - loading:', loading, 'user:', user?.email, 'path:', location.pathname)
    
    // Check sessionStorage for cached user as backup
    let hasCachedUser = false
    try {
      const cached = sessionStorage.getItem('tradeone-cached-user')
      hasCachedUser = !!cached
      if (cached && !user) {
        //console.log('📦 Found cached user in sessionStorage, waiting for auth to sync...')
      }
    } catch (e) {
      // ignore
    }
    
    // Give a grace period for session restoration after navigation/modal operations
    // This prevents false "not authenticated" during back button navigation or modal close
    const timer = setTimeout(() => {
      setIsChecking(false)
      // Only set shouldRedirect if still no user AND no cached user after grace period
      if (!loading && !user && !hasCachedUser) {
        //console.log('⚠️ No user after grace period, will redirect to login')
        setShouldRedirect(true)
      }
    }, 800) // Increased to 800ms to handle modal close animations

    return () => clearTimeout(timer)
  }, [loading, user, location.pathname])

  // Show loading screen while auth is initializing or during grace period
  if (loading || isChecking) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
        <div className="text-center">
          <Loader className="w-12 h-12 animate-spin text-cyan-500 mx-auto mb-4" />
          <p className="text-gray-400">Loading...</p>
        </div>
      </div>
    )
  }

  // Only redirect to login if we're absolutely sure there's no user after waiting
  if (shouldRedirect && !user) {
    //console.log('❌ Redirecting to login - no authenticated user')
    return <Navigate to="/login" replace state={{ from: location }} />
  }
  
  return <>{children}</>
}

export default AuthGuard
