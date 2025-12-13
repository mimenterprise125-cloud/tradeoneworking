import React, { createContext, useContext, useEffect, useState, useRef } from 'react'
import supabase from './supabase'

type User = any

const AuthContext = createContext<{ user: User | null; loading: boolean }>({ user: null, loading: true })

// Cache user in memory and sessionStorage to survive all navigations
let cachedUser: User | null = null

// Try to restore from sessionStorage on app load
try {
  const stored = sessionStorage.getItem('tradeone-cached-user')
  if (stored) {
    cachedUser = JSON.parse(stored)
    //console.log('📦 Restored cached user from sessionStorage:', cachedUser?.email)
  }
} catch (e) {
  //console.warn('Failed to restore cached user:', e)
}

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  // Initialize with cached user if available
  const [user, setUser] = useState<User | null>(cachedUser)
  const [loading, setLoading] = useState(true)
  const isInitialized = useRef(false)
  const updateTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  useEffect(() => {
    let mounted = true

    const initializeAuth = async () => {
      try {
        //console.log('🔐 AuthProvider: Initializing auth...')
        
        // If we have a cached user, use it immediately and just verify in background
        if (cachedUser) {
          //console.log('✅ Using cached user:', cachedUser.email)
          setUser(cachedUser)
          setLoading(false)
          // Still verify session in background
        }
        
        // Get session from Supabase storage (localStorage)
        const { data: { session }, error } = await supabase.auth.getSession()
        
        if (!mounted) return
        
        if (error) {
          console.error('❌ Auth session error:', error)
          if (mounted) {
            cachedUser = null
            setUser(null)
            setLoading(false)
          }
          return
        }
        
        if (session?.user) {
          //console.log('✅ Session restored for:', session.user.email)
          cachedUser = session.user
          setUser(session.user)
          // Store in sessionStorage for modal/navigation persistence
          try {
            sessionStorage.setItem('tradeone-cached-user', JSON.stringify(session.user))
          } catch (e) {
            console.warn('Failed to cache user in sessionStorage:', e)
          }
        } else {
          //console.log('⚠️ No session found')
          cachedUser = null
          setUser(null)
          try {
            sessionStorage.removeItem('tradeone-cached-user')
          } catch (e) {
            // ignore
          }
        }
        
        setLoading(false)
        isInitialized.current = true
      } catch (error) {
        //console.error('❌ Auth initialization error:', error)
        if (mounted) {
          setLoading(false)
        }
      }
    }

    // Only initialize once
    if (!isInitialized.current) {
      initializeAuth()
    } else {
      // Already initialized, just set loading to false
      setLoading(false)
    }

    const { data: listener } = supabase.auth.onAuthStateChange((event, session) => {
      if (!mounted) return
      
      //console.log('🔄 Auth state changed:', event, session?.user?.email)
      
      // Debounce updates to prevent rapid changes during modal operations
      if (updateTimeoutRef.current) {
        clearTimeout(updateTimeoutRef.current)
      }
      
      // Update user state and cache for all relevant auth events
      if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED' || event === 'USER_UPDATED' || event === 'INITIAL_SESSION') {
        updateTimeoutRef.current = setTimeout(() => {
          cachedUser = session?.user ?? null
          setUser(session?.user ?? null)
          // Update sessionStorage cache
          if (session?.user) {
            try {
              sessionStorage.setItem('tradeone-cached-user', JSON.stringify(session.user))
            } catch (e) {
              // ignore
            }
          }
        }, 100) // Small debounce to prevent flicker during modal operations
      } else if (event === 'SIGNED_OUT') {
        cachedUser = null
        setUser(null)
        try {
          sessionStorage.removeItem('tradeone-cached-user')
        } catch (e) {
          // ignore
        }
      }
      
      setLoading(false)
    })

    return () => {
      mounted = false
      if (updateTimeoutRef.current) {
        clearTimeout(updateTimeoutRef.current)
      }
      listener?.subscription?.unsubscribe()
    }
  }, [])

  return <AuthContext.Provider value={{ user, loading }}>{children}</AuthContext.Provider>
}

export const useAuth = () => useContext(AuthContext)

export default AuthProvider
