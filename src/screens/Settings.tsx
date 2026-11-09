import { useState, type ReactNode } from 'react'
import { Link, Navigate, NavLink, useNavigate, useParams } from 'react-router-dom'
import { RULES, rule, ruleText, type RuleEntry } from '@shared/rules'
import { longDate } from '@shared/dates'
import { BackLink } from '../components/Shell'
import Icon from '../components/Icon'
import { useActions, useApp } from '../lib/app'
import { useAuth } from '../lib/auth'
import { zar } from '../lib/format'
import { createLootGoal, useLootGoals } from '../lib/loot'
import { SavedMoneyField, Seg, Toggle, useSavedFlash, useTheme, useWide, type ThemeChoice } from '../lib/ui'

export const SECTIONS = [
  { id: 'loot', label: 'Loot savings goal', icon: 'link', blurb: 'Follow a Loot goal so progress updates as you save' },
  { id: 'savings', label: 'Savings plan', icon: 'savings', blurb: 'What you save each month, and life in Cape Town now' },
  { id: 'scenarios', label: 'Scenarios', icon: 'scenarios', blurb: 'Pick your main scenario, edit or add one' },
  { id: 'appearance', label: 'Appearance', icon: 'appearance', blurb: 'Light, dark or match your device' },
  { id: 'rules', label: 'Rules and sources', icon: 'rules', blurb: 'Every fee and threshold, with its source' },
  { id: 'account', label: 'Account', icon: 'account', blurb: 'Sign out or delete your Northbound data' },
] as const

type SectionId = (typeof SECTIONS)[number]['id']

export default function Settings() {
  const { section } = useParams()
  const wide = useWide()
  const current = SECTIONS.find((s) => s.id === section)
  if (!current) return <Navigate to={wide ? '/settings/loot' : '/more'} replace />

  const body = <SectionBody id={current.id} />
  if (!wide) {
    return (
      <div className="settings-phone">
        <div className="settings-phone-head">
          <BackLink to="/more" label="More" />
          <h1 className="h1">{current.label}</h1>
        </div>
        <div className="settings-body">{body}</div>
      </div>
    )
  }
  return (
    <div className="settings-desk">
      <nav className="settings-nav" aria-label="Settings">
        <h1 className="h1" style={{ fontSize: 28, margin: '0 0 14px 10px' }}>
          Settings
        </h1>
        {SECTIONS.map((s) => (
          <NavLink key={s.id} to={`/settings/${s.id}`} className={({ isActive }) => (isActive ? 'active' : '')}>
            <Icon name={s.icon} size={18} />
            <span>
              {s.label}
              <small>{s.blurb}</small>
            </span>
          </NavLink>
        ))}
      </nav>
      <section className="settings-main" aria-labelledby="sec-title">
        <h2 id="sec-title" className="h1" style={{ fontSize: 30 }}>
          {current.label}
        </h2>
        <p className="muted" style={{ margin: '4px 0 22px' }}>
          {current.blurb}.
        </p>
        <div className="settings-body">{body}</div>
      </section>
    </div>
  )
}

function SectionBody({ id }: { id: SectionId }) {
  switch (id) {
    case 'loot':
      return <LootSection />
    case 'savings':
      return <SavingsSection />
    case 'scenarios':
      return <ScenariosSection />
    case 'appearance':
      return <AppearanceSection />
    case 'rules':
      return <RulesSection />
    case 'account':
      return <AccountSection />
  }
}

function Block({ title, children, note }: { title?: string; children: ReactNode; note?: ReactNode }) {
  return (
    <div className="sblock">
      {title && <h3>{title}</h3>}
      {children}
      {note && <p className="hint">{note}</p>}
    </div>
  )
}

// ---------- Loot ----------

const NEW = '__new__'

function LootSection() {
  const { session, dev } = useAuth()
  const { profile, plan, goal, savings, goalUpdatedAt, active } = useApp()
  const { updateProfile } = useActions()
  const navigate = useNavigate()
  const linked = !!profile.lootGoalId && !!goal
  const [changing, setChanging] = useState(!profile.lootGoalId)
  const { goals, error: loadError } = useLootGoals(!!session && changing)
  const [picked, setPicked] = useState<string>(profile.lootGoalId ?? NEW)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [saved, flash] = useSavedFlash()

  async function link() {
    if (!session) return
    setBusy(true)
    setError(null)
    try {
      const gid = picked === NEW ? (await createLootGoal(session.user.id, plan.targetZar, plan.landDate)).id : picked
      await updateProfile({ lootGoalId: gid })
      setChanging(false)
      navigate('/progress')
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn't link the goal. Try again.")
    }
    setBusy(false)
  }

  if (dev || !session) {
    return (
      <Block>
        <p style={{ margin: 0 }}>
          <b>Sign in with your Loot account to link a goal.</b>
        </p>
        <p className="hint">You're in local test mode with no sign-in, so Loot can't be reached.</p>
      </Block>
    )
  }

  return (
    <>
      {linked && !changing && (
        <Block title="Linked goal">
          <div className="linked-goal">
            <span className="dot" aria-hidden="true" />
            <div style={{ flex: 1 }}>
              <b>{goal.name}</b>
              <div className="small muted">
                {zar(savings.savedZar, 100)} saved of {zar(goal.target_amount)}. Updated {goalUpdatedAt ? new Date(goalUpdatedAt).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }) : 'just now'}.
              </div>
            </div>
            <button type="button" className="btn quiet small" onClick={() => setChanging(true)}>
              Change
            </button>
          </div>
        </Block>
      )}

      {changing && (
        <Block title={linked ? 'Pick a different goal' : 'Pick your move goal'}>
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
          {error && (
            <p className="error" role="alert">
              {error}
            </p>
          )}
          <div className="row" style={{ justifyContent: 'flex-start', gap: 8, marginTop: 6 }}>
            <button type="button" className="btn primary" onClick={() => void link()} disabled={busy || !goals}>
              {busy ? 'Linking…' : 'Link this goal'}
            </button>
            {linked && (
              <button type="button" className="btn quiet" onClick={() => setChanging(false)}>
                Cancel
              </button>
            )}
          </div>
        </Block>
      )}

      {profile.lootGoalId && (
        <Block title="Keep Loot in step" note={`The target follows your main scenario, now "${active.name}". Only the target and date change: the money you've saved and Loot's auto-saving stay exactly as they are.`}>
          <div className="toggle-row">
            <span>
              Set the goal's target in Loot to your number
              <span className={`saved-flash${saved ? ' on' : ''}`}>{saved ? 'Saved' : ''}</span>
            </span>
            <Toggle
              on={profile.syncLootTarget}
              onChange={async (v) => {
                await updateProfile({ syncLootTarget: v })
                flash()
              }}
              label="Keep the target in sync"
            />
          </div>
        </Block>
      )}

      {profile.lootGoalId && (
        <Block note="Northbound will stop following the goal. Nothing in Loot is deleted.">
          <button type="button" className="btn quiet" onClick={() => void updateProfile({ lootGoalId: null })}>
            Unlink and enter savings by hand
          </button>
        </Block>
      )}

      <p className="hint">Northbound reads only the goal you link and its deposits, and can update that goal's target and date. It doesn't use anything else in Loot.</p>
    </>
  )
}

// ---------- savings ----------

function SavingsSection() {
  const { profile, savingsSource, goal } = useApp()
  const { updateProfile } = useActions()
  return (
    <>
      <Block title="Saved so far">
        {savingsSource === 'loot' && goal ? (
          <p style={{ margin: 0 }}>
            Following your Loot goal "{goal.name}". <Link to="/settings/loot">Change goal</Link>
          </p>
        ) : (
          <SavedMoneyField id="saved" label="Saved for the move" value={profile.savedZar} onSave={(n) => updateProfile({ savedZar: n })} hint="Link your Loot goal to keep this up to date automatically." />
        )}
      </Block>
      <Block title="Each month">
        <SavedMoneyField id="monthly" label="You plan to save" value={profile.monthlyZar} onSave={(n) => updateProfile({ monthlyZar: n })} hint="If your deposits in Loot over the last 3 months were lower, Northbound uses that instead." />
      </Block>
      <Block title="Life in Cape Town now" note="Shown on Home, next to Manchester or London. Optional.">
        <div className="two-col">
          <SavedMoneyField id="rent" label="Rent" value={profile.homeRentZar} onSave={(n) => updateProfile({ homeRentZar: n })} />
          <SavedMoneyField id="income" label="Take-home pay" value={profile.homeIncomeZar} onSave={(n) => updateProfile({ homeIncomeZar: n })} />
        </div>
      </Block>
    </>
  )
}

// ---------- scenarios ----------

export function ScenariosSection() {
  const { scenarios, active, planFor } = useApp()
  const { setActive } = useActions()
  return (
    <Block>
      <ul className="scen-table">
        {scenarios.map((s) => {
          const p = planFor(s)
          return (
            <li key={s._id} className={s._id === active._id ? 'on' : ''}>
              <button type="button" className="scen-pick" onClick={() => void setActive({ id: s._id })} aria-pressed={s._id === active._id}>
                <span className="radio" aria-hidden="true" />
                <span>
                  <b>
                    {s.name}
                    {s._id === active._id && <span className="main-badge">Main</span>}
                  </b>
                  <small>
                    {zar(p.targetZar, 1000)}
                    {s._id !== active._id ? '. Tap to make it your main scenario' : '. Drives Home, the map and your Loot goal'}
                  </small>
                </span>
              </button>
              <Link to={`/scenario/${s._id}`} className="btn quiet small">
                <Icon name="edit" size={15} /> Edit
              </Link>
            </li>
          )
        })}
      </ul>
      <Link to="/scenario/new" className="btn primary" style={{ marginTop: 12 }}>
        <Icon name="plus" size={18} /> New scenario
      </Link>
    </Block>
  )
}

// ---------- appearance ----------

function AppearanceSection() {
  const [theme, setTheme] = useTheme()
  return (
    <Block title="Colour mode">
      <Seg<ThemeChoice> label="Colour mode" value={theme} onChange={setTheme} options={[{ value: 'auto', label: 'Match my device' }, { value: 'light', label: 'Light' }, { value: 'dark', label: 'Dark' }]} />
    </Block>
  )
}

// ---------- rules ----------

function sourceValue(r: RuleEntry): string {
  const v = r.versions[r.versions.length - 1].value
  return r.unit === 'rate' ? String(Math.round(Number(v) * 10000) / 100) : String(v)
}

function RulesSection() {
  const { overrides, today } = useApp()
  const { setRule } = useActions()
  const groups = [...new Set(RULES.map((r) => r.group))]
  const estimates = RULES.filter((r) => r.estimate)
  const row = (r: RuleEntry) => (
    <RuleRow key={r.key} r={r} value={r.unit === 'text' ? ruleText(r.key, today, overrides) : rule(r.key, today, overrides)} overridden={overrides[r.key] !== undefined} onSet={(v) => void setRule({ key: r.key, value: v })} />
  )
  return (
    <>
      <p className="hint" style={{ marginTop: 0 }}>
        As they apply on {longDate(today)}. If you find a newer value, change it here and every number in Northbound updates.
      </p>
      <details className="rule-group" open>
        <summary>
          Estimates to check <span className="badge">{estimates.length}</span>
        </summary>
        <ul className="list">{estimates.map(row)}</ul>
      </details>
      {groups.map((g) => (
        <details key={g} className="rule-group">
          <summary>{g}</summary>
          <ul className="list">{RULES.filter((r) => r.group === g).map(row)}</ul>
        </details>
      ))}
    </>
  )
}

function RuleRow({ r, value, overridden, onSet }: { r: RuleEntry; value: number | string; overridden: boolean; onSet: (v: number | null) => void }) {
  const shown = r.unit === 'rate' ? String(Math.round(Number(value) * 10000) / 100) : String(value)
  const [text, setText] = useState(shown)
  const [saved, flash] = useSavedFlash()
  const isText = r.unit === 'text'
  const unit = r.unit === 'GBP' ? '£' : r.unit === 'ZAR' ? 'R' : r.unit === 'rate' ? '%' : r.unit
  return (
    <li className="rule-row">
      <span>
        {r.label}
        {r.estimate && <span className="badge">Estimate</span>}
        <span className={`saved-flash${saved ? ' on' : ''}`}>{saved ? 'Saved' : ''}</span>
      </span>
      {isText ? (
        <span style={{ textAlign: 'right', fontWeight: 700 }}>{String(value)}</span>
      ) : (
        <div className="rule-input">
          <input
            className="input"
            inputMode="decimal"
            aria-label={`${r.label}, in ${unit === '%' ? 'percent' : unit}`}
            value={text}
            onChange={(e) => setText(e.target.value)}
            onBlur={() => {
              const n = Number(text)
              if (!Number.isFinite(n) || text.trim() === '') return setText(shown)
              if (text === shown) return
              onSet(r.unit === 'rate' ? n / 100 : n)
              flash()
            }}
          />
          <span className="unit">{unit}</span>
        </div>
      )}
      <small>
        <a href={r.source} target="_blank" rel="noreferrer">
          Source
        </a>
        , checked {longDate(r.lastChecked)}
        {overridden && (
          <>
            {'. '}
            <button
              type="button"
              className="linkbtn"
              onClick={() => {
                onSet(null)
                setText(sourceValue(r))
              }}
            >
              Reset to source value
            </button>
          </>
        )}
      </small>
    </li>
  )
}

// ---------- account ----------

function AccountSection() {
  const { session, signOut, dev } = useAuth()
  const { resetAll } = useActions()
  return (
    <>
      <Block title="Signed in">
        <p style={{ margin: '0 0 12px' }}>{dev ? 'Local test mode, not signed in.' : `With your Loot account, ${session?.user.email ?? ''}.`}</p>
        {!dev && (
          <button type="button" className="btn quiet" onClick={() => void signOut()}>
            Sign out
          </button>
        )}
      </Block>
      <Block title="Delete Northbound data" note="Removes your scenarios, ticked steps and rule changes. Nothing in Loot is touched. This can't be undone.">
        <button
          type="button"
          className="btn quiet"
          style={{ color: 'var(--now)' }}
          onClick={() => {
            if (window.confirm("Delete all of Northbound's data for your account? This can't be undone.")) void resetAll()
          }}
        >
          Delete Northbound data
        </button>
      </Block>
    </>
  )
}
