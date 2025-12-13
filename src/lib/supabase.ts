import { createClient, SupabaseClient } from '@supabase/supabase-js'

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string | undefined
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined

export const isSupabaseConfigured = Boolean(SUPABASE_URL && SUPABASE_ANON_KEY)

function missingEnvError() {
  return new Error(
    'Supabase is not configured. Copy .env.example to .env and set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY'
  )
}

// Store the client in globalThis to prevent multiple instances during HMR
declare global {
  var __supabase: SupabaseClient | undefined
}

// If env vars are present, create a real client. Otherwise export a safe stub
// Use globalThis to persist the client across HMR reloads
export const supabase = isSupabaseConfigured
  ? (globalThis.__supabase ?? (globalThis.__supabase = createClient(SUPABASE_URL!, SUPABASE_ANON_KEY!, {
      auth: {
        // Use localStorage to persist session across page navigations
        // This prevents logout on back button
        storage: window.localStorage,
        storageKey: 'tradeone-auth-token',
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: true
      }
    })))
  : ((): any => {
      // safe stub that fails with helpful errors when methods are used
      const throwMissing = () => {
        throw missingEnvError()
      }

      return {
        auth: {
          getUser: async () => ({ data: { user: null } }),
          signInWithPassword: async () => { throwMissing() },
          signUp: async () => { throwMissing() },
          signOut: async () => { throwMissing() },
          signInWithOAuth: async () => { throwMissing() },
          onAuthStateChange: (_cb: any) => ({ subscription: { unsubscribe: () => {} } }),
        },
        storage: {
          from: (_: string) => ({
            upload: async () => { throwMissing() },
            getPublicUrl: (_: string) => ({ data: { publicUrl: null } }),
            createSignedUrl: async () => { throwMissing() },
          }),
        },
        from: (_table: string) => ({
          select: (_cols?: string) => ({ execute: async () => ({ data: [], error: null }) }),
          insert: async () => ({ error: new Error('Supabase not configured') }),
          update: async () => ({ error: new Error('Supabase not configured') }),
          delete: async () => ({ error: new Error('Supabase not configured') }),
        }),
      }
    })()

// Helpful auth helpers for the frontend
export async function getCurrentUser() {
  const { data } = await supabase.auth.getUser()
  return data?.user ?? null
}

export const signInWithEmail = (email: string, password: string) =>
  supabase.auth.signInWithPassword({ email, password })

export const signUpWithEmail = (email: string, password: string) =>
  supabase.auth.signUp({ email, password })

export const signOut = () => supabase.auth.signOut()

export default supabase
