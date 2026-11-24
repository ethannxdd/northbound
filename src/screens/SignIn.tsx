import Icon from '../components/Icon'
import { BrandMark } from '../components/Shell'
import { useAuthActions } from '@convex-dev/auth/react'
import { useQuery } from 'convex/react'
import { useState, type FormEvent } from 'react'
import { api } from '../../convex/_generated/api'
import { CAPE_TOWN, photoUrl } from '@shared/cities'
import { lootPasswordSignIn } from '../lib/auth'
import { supabaseConfigured } from '../lib/supabase'

type Mode = 'signUp' | 'signIn' | 'loot' | 'reset' | 'resetCode'

/** Turns Convex Auth's error into words. */
function explain(e: unknown, mode: Mode): string {
  const msg = e instanceof Error ? e.message : String(e)
  if (/at least 8/i.test(msg)) return 'Use at least 8 characters for your password.'
  if (/valid email/i.test(msg)) return 'Enter a valid email address.'
  if (mode === 'signUp' && /already exists/i.test(msg)) return 'There is already an account with that email. Sign in instead.'
  if (mode === 'reset' && /InvalidAccountId/i.test(msg)) return "There's no Northbound account with a password for that email. If you signed up with Loot or Google, use that instead."
  if (/InvalidAccountId/i.test(msg)) return "There's no Northbound account with that email. Create one, or continue with Loot."
  if (mode === 'resetCode' && /Invalid|code/i.test(msg)) return "That code didn't work. Check the email, or ask for a new code."
  if (/InvalidSecret|Invalid password/i.test(msg)) return "That password didn't match."
  if (/TooManyFailedAttempts/i.test(msg)) return 'Too many tries. Wait a few minutes and try again.'
  if (/send the reset email/i.test(msg)) return "Couldn't send the email just now. Try again in a minute."
  if (mode === 'reset') return "Couldn't send a code. Try again."
  if (mode === 'resetCode') return "Couldn't change your password. Try again."
  return mode === 'signUp' ? "Couldn't create your account. Try again." : "Couldn't sign you in. Try again."
}

export default function SignIn() {
  const { signIn } = useAuthActions()
  const options = useQuery(api.authOptions.get)
  const [mode, setMode] = useState<Mode>('signUp')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [code, setCode] = useState('')
  const [showPw, setShowPw] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [note, setNote] = useState<string | null>(null)
  const cleanEmail = email.trim().toLowerCase()

  async function submit(e: FormEvent) {
    e.preventDefault()
    setError(null)
    setNote(null)
    if (!email.includes('@')) return setError(mode === 'loot' ? 'Enter the email you use for Loot.' : 'Enter your email address.')
    if (mode === 'resetCode' && !/^\d{8}$/.test(code.trim())) return setError('Enter the 8-digit code from the email.')
    if (mode !== 'reset' && !password) return setError(mode === 'resetCode' ? 'Choose a new password.' : 'Enter your password.')
    if ((mode === 'signUp' || mode === 'resetCode') && password.length < 8) return setError('Use at least 8 characters for your password.')
    setBusy(true)
    try {
      if (mode === 'loot') {
        const res = await lootPasswordSignIn(email, password)
        if ('error' in res) setError(res.error)
        else await signIn('loot', { token: res.token })
      } else if (mode === 'reset') {
        await signIn('password', { email: cleanEmail, flow: 'reset' })
        setMode('resetCode')
        setPassword('')
        setNote(`We've emailed a code to ${cleanEmail}. It works for 15 minutes.`)
      } else if (mode === 'resetCode') {
        await signIn('password', { email: cleanEmail, code: code.trim(), newPassword: password, flow: 'reset-verification' })
      } else {
        await signIn('password', { email: cleanEmail, password, flow: mode })
      }
    } catch (err) {
      setError(explain(err, mode))
    }
    setBusy(false)
  }

  async function google() {
    setError(null)
    setBusy(true)
    try {
      await signIn('google', { redirectTo: window.location.origin })
    } catch {
      setError("Couldn't start Google sign-in. Try again.")
      setBusy(false)
    }
  }

  const switchTo = (m: Mode) => {
    setMode(m)
    setError(null)
    setNote(null)
  }

  const resetting = mode === 'reset' || mode === 'resetCode'
  const heading =
    mode === 'loot' ? 'Continue with Loot' : mode === 'reset' ? 'Reset your password' : mode === 'resetCode' ? 'Choose a new password' : mode === 'signUp' ? 'Plan your move' : 'Welcome back'

  return (
    <div className="auth-screen">
      <div className="auth-photo">
        <img src={photoUrl(CAPE_TOWN.photo, 1600)} alt="Cape Town and Table Mountain from the sea" />
        <span className="brand auth-brand">
          <BrandMark size={36} />
          northbound
        </span>
        <div className="auth-msg glass">
          <p className="auth-h">From Cape Town, every step and every rand.</p>
          <p className="auth-sub">Your number, your route and your runway, with a baseline for every cost next to the quotes you find yourself.</p>
        </div>
      </div>
      <form className="auth-body" onSubmit={submit} noValidate>
        {mode === 'loot' || resetting ? (
          <>
            <button type="button" className="linkbtn" style={{ justifySelf: 'start' }} onClick={() => switchTo(resetting ? 'signIn' : 'signUp')}>
              ‹ Back
            </button>
            <h1 className="h1">{heading}</h1>
            <p className="muted" style={{ margin: 0 }}>
              {mode === 'loot'
                ? 'Use your Loot email and password. Northbound makes you an account linked to Loot, so it can follow your savings goal.'
                : mode === 'reset'
                  ? "Enter the email you sign in with. We'll send you a code to set a new password."
                  : 'Enter the code from the email and your new password.'}
            </p>
          </>
        ) : (
          <>
            <h1 className="h1">{heading}</h1>
            <div className="auth-tabs" role="tablist">
              <button type="button" role="tab" aria-selected={mode === 'signUp'} onClick={() => switchTo('signUp')}>
                Create account
              </button>
              <button type="button" role="tab" aria-selected={mode === 'signIn'} onClick={() => switchTo('signIn')}>
                Sign in
              </button>
            </div>
          </>
        )}

        <label htmlFor="email" className="small" style={{ fontWeight: 700 }}>
          Email
        </label>
        <input id="email" className="input" type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" readOnly={mode === 'resetCode'} />

        {mode === 'resetCode' && (
          <>
            <label htmlFor="code" className="small" style={{ fontWeight: 700 }}>
              Code from the email
            </label>
            <input id="code" className="input" inputMode="numeric" autoComplete="one-time-code" maxLength={8} value={code} onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))} />
          </>
        )}

        {mode !== 'reset' && (
          <>
            <div className="row" style={{ alignItems: 'baseline' }}>
              <label htmlFor="pw" className="small" style={{ fontWeight: 700 }}>
                {mode === 'resetCode' ? 'New password' : 'Password'}
              </label>
              {mode === 'signIn' && options?.reset && (
                <button type="button" className="linkbtn small" onClick={() => switchTo('reset')}>
                  Forgot password?
                </button>
              )}
            </div>
            <div className="pw-wrap">
              <input
                id="pw"
                className="input"
                type={showPw ? 'text' : 'password'}
                autoComplete={mode === 'signUp' || mode === 'resetCode' ? 'new-password' : 'current-password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
              <button type="button" className="pw-toggle" onClick={() => setShowPw(!showPw)} aria-pressed={showPw} aria-controls="pw">
                {showPw ? 'Hide' : 'Show'}
                <span className="sr-only"> password</span>
              </button>
            </div>
            {(mode === 'signUp' || mode === 'resetCode') && (
              <p className="hint" style={{ marginTop: -4 }}>
                At least 8 characters.
              </p>
            )}
          </>
        )}

        {note && (
          <p className="ok-text" role="status" style={{ margin: 0 }}>
            {note}
          </p>
        )}
        {error && (
          <p className="error" role="alert" style={{ margin: 0 }}>
            {error}
          </p>
        )}
        <button type="submit" className="btn primary block lg" disabled={busy}>
          {busy
            ? 'One moment…'
            : mode === 'signUp'
              ? 'Create account'
              : mode === 'signIn'
                ? 'Sign in'
                : mode === 'loot'
                  ? 'Continue with Loot'
                  : mode === 'reset'
                    ? 'Email me a code'
                    : 'Set new password and sign in'}
        </button>
        {mode === 'resetCode' && (
          <button type="button" className="linkbtn small" style={{ justifySelf: 'start' }} onClick={() => switchTo('reset')}>
            Send a new code
          </button>
        )}

        {(mode === 'signUp' || mode === 'signIn') && (supabaseConfigured || options?.google) && (
          <>
            <div className="or">or</div>
            {options?.google && (
              <button type="button" className="social" onClick={() => void google()} disabled={busy}>
                <GoogleMark />
                Continue with Google
              </button>
            )}
            {supabaseConfigured && (
              <button type="button" className="social" onClick={() => switchTo('loot')}>
                <Icon name="loot" size={26} />
                Continue with Loot
              </button>
            )}
            {supabaseConfigured && (
              <p className="tiny muted" style={{ textAlign: 'center', margin: 0 }}>
                Don't use Loot? You don't need it. You can link it later if you start.
              </p>
            )}
          </>
        )}
      </form>
    </div>
  )
}

/** Google's "G", in its own colours as Google's sign-in guidelines ask. */
function GoogleMark() {
  return (
    <svg width="22" height="22" viewBox="0 0 48 48" aria-hidden="true">
      <path className="g-y" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.4-.4-3.5z" />
      <path className="g-r" d="M6.3 14.7l6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z" />
      <path className="g-g" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-8l-6.5 5C9.5 39.6 16.2 44 24 44z" />
      <path className="g-b" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.6l6.2 5.2C37 39.2 44 34 44 24c0-1.3-.1-2.4-.4-3.5z" />
    </svg>
  )
}
