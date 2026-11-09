import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useActions, useApp } from '../lib/app'
import { useAuth } from '../lib/auth'
import { zar } from '../lib/format'
import { createLootGoal, useLootGoals } from '../lib/loot'
import { Toggle } from '../lib/ui'

const NEW = '__new__'

export default function LinkLoot() {
  const { session, dev } = useAuth()
  const { profile, plan } = useApp()
  const { updateProfile } = useActions()
  const navigate = useNavigate()
  const { goals, error: loadError } = useLootGoals(!!session)
  const [picked, setPicked] = useState<string>(profile.lootGoalId ?? NEW)
  const [sync, setSync] = useState(profile.syncLootTarget)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function link() {
    if (!session) return
    setBusy(true)
    setError(null)
    try {
      const id = picked === NEW ? (await createLootGoal(session.user.id, plan.targetZar, plan.landDate)).id : picked
      await updateProfile({ lootGoalId: id, syncLootTarget: sync })
      navigate('/progress')
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn't link the goal. Try again.")
      setBusy(false)
    }
  }

  async function unlink() {
    await updateProfile({ lootGoalId: null })
    navigate('/progress')
  }

  return (
    <div className="narrow-page" style={{ padding: '0 0 24px' }}>
      <div className="topbar">
        <button type="button" className="btn quiet small" onClick={() => navigate(-1)}>
          Back
        </button>
        <span className="brand">northbound</span>
        <span style={{ width: 60 }} />
      </div>
      <div style={{ padding: '6px 20px 0' }}>
        <h1 className="h1">Link your Loot savings</h1>
        <p className="muted" style={{ margin: '6px 0 14px' }}>
          See how far you are, updated every time you add money in Loot.
        </p>
        {dev || !session ? (
          <div className="card">
            <b>Sign in with your Loot account to link a goal.</b>
            <p className="small muted" style={{ margin: '4px 0 0' }}>
              You're in local test mode with no sign-in, so Loot can't be reached. Turn off VITE_DEV_NO_AUTH to sign in.
            </p>
          </div>
        ) : (
          <>
            <p className="small" style={{ fontWeight: 700, margin: '0 0 8px' }}>
              Pick your move goal
            </p>
            {loadError && <p className="error">{loadError}</p>}
            {!goals && !loadError && <p className="muted small">Loading your goals…</p>}
            <div role="radiogroup" aria-label="Loot goals">
              {goals?.map((g) => (
                <button key={g.id} type="button" role="radio" aria-checked={picked === g.id} aria-pressed={picked === g.id} className="goal" onClick={() => setPicked(g.id)}>
                  <span className="radio" />
                  <b>{g.name}</b>
                  <small>
                    {zar(Number(g.current_amount))} of {zar(Number(g.target_amount))}
                  </small>
                  <span className="gbar">
                    <i style={{ width: `${Math.min(100, (Number(g.current_amount) / Math.max(1, Number(g.target_amount))) * 100)}%` }} />
                  </span>
                </button>
              ))}
              <button type="button" role="radio" aria-checked={picked === NEW} aria-pressed={picked === NEW} className="goal" onClick={() => setPicked(NEW)}>
                <span className="radio" />
                <b>Create a new goal in Loot</b>
                <small>Named "UK move", target {zar(plan.targetZar, 1000)}</small>
              </button>
            </div>
            <div className="toggle-row" style={{ marginTop: 6 }}>
              <span>Keep the goal's target in Loot the same as your number</span>
              <Toggle on={sync} onChange={setSync} label="Keep the target in sync" />
            </div>
            <p className="small muted" style={{ marginTop: 10 }}>
              Northbound reads this one goal and its deposits, and can update its target and date. It doesn't use anything else in Loot.
            </p>
            {error && (
              <p className="error" role="alert">
                {error}
              </p>
            )}
            <div className="stack-gap" style={{ marginTop: 14 }}>
              <button type="button" className="btn primary block" onClick={() => void link()} disabled={busy || !goals}>
                {busy ? 'Linking…' : 'Link goal'}
              </button>
              {profile.lootGoalId && (
                <button type="button" className="btn quiet block" onClick={() => void unlink()}>
                  Unlink and enter savings by hand
                </button>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  )
}
