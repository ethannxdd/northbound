import { createClient } from '@supabase/supabase-js'

// Loot's Supabase project. Northbound signs in with the same account and reads the linked savings goal.
const url = import.meta.env.VITE_SUPABASE_URL as string | undefined
const key = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string | undefined

export const supabaseConfigured = Boolean(url && key)

export const supabase = createClient(url ?? 'http://localhost', key ?? 'missing', {
  auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true, storageKey: 'northbound-auth' },
})

/** Local testing without sign-in. Only honoured in development builds. */
export const devNoAuth = import.meta.env.DEV && import.meta.env.VITE_DEV_NO_AUTH === 'true'
