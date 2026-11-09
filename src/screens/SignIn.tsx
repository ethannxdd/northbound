import { useState, type FormEvent } from 'react'
import { supabase } from '../lib/supabase'

/** Sign in with the same account you use for Loot. */
export default function SignIn() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [mode, setMode] = useState<'password' | 'link'>('password')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [sent, setSent] = useState(false)

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
      const { error: err } = await supabase.auth.signInWithPassword({ email, password })
      if (err) setError("That email and password didn't match a Loot account.")
    } else {
      const { error: err } = await supabase.auth.signInWithOtp({ email, options: { shouldCreateUser: false, emailRedirectTo: window.location.origin } })
      if (err) setError("Couldn't send the link. Check the email is the one you use for Loot.")
      else setSent(true)
    }
    setBusy(false)
  }

  async function google() {
    setError(null)
    const { error: err } = await supabase.auth.signInWithOAuth({ provider: 'google', options: { redirectTo: window.location.origin } })
    if (err) setError("Couldn't start Google sign-in.")
  }

  return (
    <div className="center-screen" style={{ background: 'var(--uk-bg)', color: 'var(--uk-text)' }}>
      <form className="signin" onSubmit={submit} noValidate>
        <img src="/icon.svg" width="56" height="56" alt="" />
        <h1 className="h1" style={{ color: 'var(--uk-text)' }}>
          Sign in with your Loot account
        </h1>
        <p style={{ margin: '0 0 18px', color: 'var(--uk-muted)' }}>Northbound uses the same account as Loot, so it can follow your savings goal.</p>
        <div className="stack-gap">
          <button type="button" className="btn sun block" onClick={() => void google()}>
            Continue with Google
          </button>
          <label htmlFor="email" className="small" style={{ fontWeight: 700 }}>
            Email
          </label>
          <input id="email" className="input" type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" />
          {mode === 'password' && (
            <>
              <label htmlFor="pw" className="small" style={{ fontWeight: 700 }}>
                Password
              </label>
              <input id="pw" className="input" type="password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} />
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
  )
}
