import type { Session } from '@supabase/supabase-js'
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { devNoAuth, supabase } from './supabase'

interface AuthState {
  session: Session | null
  loading: boolean
  /** True when testing locally without a sign-in */
  dev: boolean
  signOut: () => Promise<void>
}

const AuthContext = createContext<AuthState | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(!devNoAuth)

  useEffect(() => {
    if (devNoAuth) return
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session)
      setLoading(false)
    })
    const { data } = supabase.auth.onAuthStateChange((_event, s) => setSession(s))
    return () => data.subscription.unsubscribe()
  }, [])

  const signOut = useCallback(async () => {
    await supabase.auth.signOut()
  }, [])

  const value = useMemo(() => ({ session, loading, dev: devNoAuth, signOut }), [session, loading, signOut])
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth(): AuthState {
  const v = useContext(AuthContext)
  if (!v) throw new Error('useAuth outside AuthProvider')
  return v
}

/** Hands Convex the Supabase access token. Convex checks it against Supabase's public keys. */
export function useConvexAuthFromSupabase() {
  const { session, loading, dev } = useAuth()
  const fetchAccessToken = useCallback(
    async ({ forceRefreshToken }: { forceRefreshToken: boolean }) => {
      if (dev) return null
      if (forceRefreshToken) {
        const { data } = await supabase.auth.refreshSession()
        return data.session?.access_token ?? null
      }
      const { data } = await supabase.auth.getSession()
      return data.session?.access_token ?? null
    },
    [dev],
  )
  return useMemo(
    () => ({ isLoading: loading, isAuthenticated: dev ? false : !!session, fetchAccessToken }),
    // Re-run when the user changes, not on every token refresh.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [loading, dev, session?.user.id, fetchAccessToken],
  )
}
