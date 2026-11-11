import { useAuthActions } from '@convex-dev/auth/react'
import type { Session } from '@supabase/supabase-js'
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { devNoAuth, supabase, supabaseConfigured } from './supabase'

// Two separate sign-ins live here:
// - Northbound's own (Convex Auth): who you are in Northbound. See App.tsx.
// - Loot's (Supabase): only needed to read your linked Loot goal. Kept per device.

interface LootSessionState {
  session: Session | null
  loading: boolean
}

const LootCtx = createContext<LootSessionState>({ session: null, loading: true })

export function LootSessionProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(supabaseConfigured)
  useEffect(() => {
    if (!supabaseConfigured) return
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session)
      setLoading(false)
    })
    const { data } = supabase.auth.onAuthStateChange((_e, s) => setSession(s))
    return () => data.subscription.unsubscribe()
  }, [])
  const value = useMemo(() => ({ session, loading }), [session, loading])
  return <LootCtx.Provider value={value}>{children}</LootCtx.Provider>
}

/** The Loot (Supabase) session on this device, if you've signed in to Loot here. */
export function useLootSession(): LootSessionState {
  return useContext(LootCtx)
}

/** Signs in to Loot and returns its access token, or an error to show. */
export async function lootPasswordSignIn(email: string, password: string): Promise<{ token: string } | { error: string }> {
  if (!supabaseConfigured) return { error: "Loot sign-in isn't set up here." }
  const { data, error } = await supabase.auth.signInWithPassword({ email: email.trim(), password })
  if (error || !data.session) {
    if (error?.code === 'invalid_credentials') return { error: "That email and password didn't match a Loot account." }
    if (error?.code === 'email_not_confirmed') return { error: 'Confirm your email first, using the link Loot sent you.' }
    if (error && /invalid api key/i.test(error.message)) return { error: "Northbound can't reach Loot right now." }
    return { error: "Couldn't sign in to Loot. Check your connection and try again." }
  }
  return { token: data.session.access_token }
}

/** Signs out of Northbound and of Loot on this device. */
export function useSignOut() {
  const { signOut } = useAuthActions()
  return useCallback(async () => {
    await signOut()
    if (supabaseConfigured) await supabase.auth.signOut()
  }, [signOut])
}

export { devNoAuth }
