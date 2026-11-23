import Icon from '../components/Icon'
import { BrandMark } from '../components/Shell'
import { useAuthActions } from '@convex-dev/auth/react'
import { useState, type FormEvent } from 'react'
import { CAPE_TOWN, photoUrl } from '@shared/cities'
import { lootPasswordSignIn } from '../lib/auth'
import { supabaseConfigured } from '../lib/supabase'

type Mode = 'signUp' | 'signIn' | 'loot'

/** Turns Convex Auth's error into words. */
function explain(e: unknown, mode: Mode): string {
  const msg = e instanceof Error ? e.message : String(e)
  if (/at least 8/i.test(msg)) return 'Use at least 8 characters for your password.'
  if (/valid email/i.test(msg)) return 'Enter a valid email address.'
  if (mode === 'signUp' && /already exists/i.test(msg)) return 'There is already an account with that email. Sign in instead.'
  if (/InvalidAccountId/i.test(msg)) return "There's no Northbound account with that email. Create one, or continue with Loot."
  if (/InvalidSecret|Invalid password/i.test(msg)) return "That password didn't match."
  if (/TooManyFailedAttempts/i.test(msg)) return 'Too many tries. Wait a few minutes and try again.'
  return mode === 'signUp' ? "Couldn't create your account. Try again." : "Couldn't sign you in. Try again."
}

export default function SignIn() {
  const { signIn } = useAuthActions()
  const [mode, setMode] = useState<Mode>('signUp')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPw, setShowPw] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function submit(e: FormEvent) {
    e.preventDefault()
    setError(null)
    if (!email.includes('@')) return setError(mode === 'loot' ? 'Enter the email you use for Loot.' : 'Enter your email address.')
    if (!password) return setError('Enter your password.')
    if (mode === 'signUp' && password.length < 8) return setError('Use at least 8 characters for your password.')
    setBusy(true)
    try {
      if (mode === 'loot') {
        const res = await lootPasswordSignIn(email, password)
        if ('error' in res) {
          setError(res.error)
        } else {
          await signIn('loot', { token: res.token })
        }
      } else {
        await signIn('password', { email: email.trim().toLowerCase(), password, flow: mode })
      }
    } catch (err) {
      setError(explain(err, mode))
    }
    setBusy(false)
  }

  const switchTo = (m: Mode) => {
    setMode(m)
    setError(null)
  }

  return (
    <div className="auth-screen">
      <div className="auth-photo">
        <img src={photoUrl(CAPE_TOWN.photo, 1600)} alt="Cape Town and Table Mountain from the sea" />
        <span className="brand auth-brand">
          <BrandMark size={36} />
          northbound
        </span>
        <div className="auth-msg glass">
          <p className="auth-h">Cape Town to the UK, every step and every rand.</p>
          <p className="auth-sub">Your number, your route and your runway, with a baseline for every cost next to the quotes you find yourself.</p>
        </div>
      </div>
      <form className="auth-body" onSubmit={submit} noValidate>
        {mode === 'loot' ? (
          <>
            <button type="button" className="linkbtn" style={{ justifySelf: 'start' }} onClick={() => switchTo('signUp')}>
              ‹ Back
            </button>
            <h1 className="h1">Continue with Loot</h1>
            <p className="muted" style={{ margin: 0 }}>
              Use your Loot email and password. Northbound makes you an account linked to Loot, so it can follow your savings goal.
            </p>
          </>
        ) : (
          <>
            <h1 className="h1">{mode === 'signUp' ? 'Plan your move to the UK' : 'Welcome back'}</h1>
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
        <input id="email" className="input" type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" />
        <label htmlFor="pw" className="small" style={{ fontWeight: 700 }}>
          Password
        </label>
        <div className="pw-wrap">
          <input id="pw" className="input" type={showPw ? 'text' : 'password'} autoComplete={mode === 'signUp' ? 'new-password' : 'current-password'} value={password} onChange={(e) => setPassword(e.target.value)} />
          <button type="button" className="pw-toggle" onClick={() => setShowPw(!showPw)} aria-pressed={showPw} aria-controls="pw">
            {showPw ? 'Hide' : 'Show'}
            <span className="sr-only"> password</span>
          </button>
        </div>
        {mode === 'signUp' && <p className="hint" style={{ marginTop: -4 }}>At least 8 characters.</p>}
        {error && (
          <p className="error" role="alert" style={{ margin: 0 }}>
            {error}
          </p>
        )}
        <button type="submit" className="btn grad block" disabled={busy}>
          {busy ? 'One moment…' : mode === 'signUp' ? 'Create account' : mode === 'signIn' ? 'Sign in' : 'Continue with Loot'}
        </button>
        {mode !== 'loot' && supabaseConfigured && (
          <>
            <div className="or">or</div>
            <button type="button" className="social" onClick={() => switchTo('loot')}>
              <Icon name="loot" size={26} />
              Continue with Loot
            </button>
            <p className="tiny muted" style={{ textAlign: 'center', margin: 0 }}>
              Don't use Loot? You don't need it. You can link it later if you start.
            </p>
          </>
        )}
      </form>
    </div>
  )
}
