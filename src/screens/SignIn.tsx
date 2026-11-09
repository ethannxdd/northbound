import { useEffect, useState, type FormEvent } from 'react'
import type { AuthError } from '@supabase/supabase-js'
import { supabase } from '../lib/supabase'

/** Turns Supabase's error into something that says what actually went wrong. */
function explain(err: AuthError): string {
  const msg = err.message || ''
  if (/invalid api key/i.test(msg)) return "Northbound can't reach Loot's sign-in: its Supabase key is wrong. Check VITE_SUPABASE_PUBLISHABLE_KEY."
  if (err.code === 'invalid_credentials') return "That email and password didn't match a Loot account."
  if (err.code === 'email_not_confirmed') return 'Confirm your email address first, using the link Loot sent you.'
  if (err.status === 0 || /fetch|network/i.test(msg)) return "Couldn't reach Loot's sign-in. Check your connection and try again."
  return `Couldn't sign in: ${msg}`
}

/** Sign in with the same account you use for Loot. */
export default function SignIn() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [mode, setMode] = useState<'password' | 'link'>('password')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [sent, setSent] = useState(false)
  const [googleOn, setGoogleOn] = useState(false)
  const [showPw, setShowPw] = useState(false)

  // Only offer Google if it's switched on in Loot's Supabase project.
  useEffect(() => {
    const url = import.meta.env.VITE_SUPABASE_URL as string
    fetch(`${url}/auth/v1/settings`, { headers: { apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string } })
      .then((r) => (r.ok ? r.json() : null))
      .then((j) => setGoogleOn(!!j?.external?.google))
      .catch(() => setGoogleOn(false))
  }, [])

  async function submit(e: FormEvent) {
    e.preventDefault()
    setError(null)
    if (!email.includes('@')) return setError('Enter the email you use for Loot.')
    setBusy(true)
    if (mode === 'password') {
      if (!password) {
        setBusy(false)
        return setError('Enter your Loot password.')
      }
      const { error: err } = await supabase.auth.signInWithPassword({ email: email.trim(), password })
      if (err) setError(explain(err))
    } else {
      const { error: err } = await supabase.auth.signInWithOtp({ email: email.trim(), options: { shouldCreateUser: false, emailRedirectTo: window.location.origin } })
      if (err) setError(err.code === 'otp_disabled' || /signups not allowed/i.test(err.message) ? "There's no Loot account with that email." : explain(err))
      else setSent(true)
    }
    setBusy(false)
  }

  async function google() {
    setError(null)
    const { error: err } = await supabase.auth.signInWithOAuth({ provider: 'google', options: { redirectTo: window.location.origin } })
    if (err) setError(explain(err))
  }

  return (
    <div className="signin-screen">
      <div className="signin-art" aria-hidden="true">
        <span className="brand">northbound</span>
        <p className="signin-big">Cape Town to the UK, one step at a time.</p>
      </div>
      <div className="signin-side">
      <form className="signin" onSubmit={submit} noValidate>
        <img src="/icon.svg" width="56" height="56" alt="" />
        <h1 className="h1" style={{ color: 'var(--uk-text)' }}>
          Sign in with your Loot account
        </h1>
        <p style={{ margin: '0 0 18px', color: 'var(--uk-muted)' }}>Northbound uses the same account as Loot, so it can follow your savings goal.</p>
        <div className="stack-gap">
          {googleOn && (
            <button type="button" className="btn sun block" onClick={() => void google()}>
              Continue with Google
            </button>
          )}
          <label htmlFor="email" className="small" style={{ fontWeight: 700 }}>
            Email
          </label>
          <input id="email" className="input" type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" />
          {mode === 'password' && (
            <>
              <label htmlFor="pw" className="small" style={{ fontWeight: 700 }}>
                Password
              </label>
              <div className="pw-wrap">
                <input id="pw" className="input" type={showPw ? 'text' : 'password'} autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} />
                <button type="button" className="pw-toggle" onClick={() => setShowPw(!showPw)} aria-pressed={showPw} aria-controls="pw">
                  {showPw ? 'Hide' : 'Show'}
                  <span className="sr-only"> password</span>
                </button>
              </div>
            </>
          )}
          {error && (
            <p className="error" role="alert" style={{ color: '#ffb4a2' }}>
              {error}
            </p>
          )}
          {sent ? (
            <p role="status">Check your email for a sign-in link.</p>
          ) : (
            <button type="submit" className="btn primary block" disabled={busy} style={{ background: 'var(--uk-text)', color: 'var(--uk-bg)' }}>
              {busy ? 'Signing in…' : mode === 'password' ? 'Sign in' : 'Email me a sign-in link'}
            </button>
          )}
          <button type="button" className="btn quiet block" style={{ color: 'var(--uk-text)', boxShadow: 'inset 0 0 0 1px rgba(255,255,255,.3)' }} onClick={() => { setMode(mode === 'password' ? 'link' : 'password'); setSent(false); setError(null) }}>
            {mode === 'password' ? 'Use an email link instead' : 'Use your password instead'}
          </button>
        </div>
      </form>
      </div>
    </div>
  )
}
