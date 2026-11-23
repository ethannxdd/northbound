import { useAction } from 'convex/react'
import { useEffect, useState, type FormEvent, type ReactNode } from 'react'
import { Link, Navigate, NavLink, useLocation, useNavigate, useParams } from 'react-router-dom'
import { api } from '../../convex/_generated/api'
import { RULES, needsRefresh, rule, ruleText, type RuleEntry } from '@shared/rules'
import { CITIES } from '@shared/cities'
import { dayMonthYear, longDate, monthYear } from '@shared/dates'
import { sortQuotes } from '@shared/engine'
import { gbp } from '../lib/format'
import RemindersControls from '../components/Reminders'
import { BackLink } from '../components/Shell'
import Icon from '../components/Icon'
import { useActions, useApp, useMe } from '../lib/app'
import { devNoAuth, lootPasswordSignIn, useLootSession, useSignOut } from '../lib/auth'
import { zar } from '../lib/format'
import { createLootGoal, useLootGoals } from '../lib/loot'
import { supabase } from '../lib/supabase'
import { SavedMoneyField, Seg, Toggle, useSavedFlash, useTheme, useWide, type ThemeChoice } from '../lib/ui'

export const SECTIONS = [
  { id: 'scenarios', label: 'Your scenarios', icon: 'scenarios', blurb: 'Pick your main scenario, edit or add one' },
  { id: 'settling', label: 'Settling in the UK', icon: 'flag', blurb: 'Your 5-year path, earnings and English' },
  { id: 'loot', label: 'Loot', icon: 'loot', blurb: 'Link Loot and follow a savings goal' },
  { id: 'savings', label: 'Savings plan', icon: 'savings', blurb: 'What you save each month, and life in Cape Town now' },
  { id: 'quotes', label: 'My quotes', icon: 'money', blurb: 'Every price you found, with its history' },
  { id: 'reminders', label: 'Reminders and calendar', icon: 'bell', blurb: 'Phone nudges and a calendar of every step' },
  { id: 'share', label: 'Share your plan', icon: 'share', blurb: 'A read-only link for family or a partner' },
  { id: 'appearance', label: 'Appearance', icon: 'appearance', blurb: 'Dark, light or match your device' },
  { id: 'rules', label: 'Rules and sources', icon: 'rules', blurb: 'Every fee and threshold, with its source' },
  { id: 'account', label: 'Account', icon: 'account', blurb: 'Sign out or delete your Northbound data' },
] as const

type SectionId = (typeof SECTIONS)[number]['id']

export default function Settings() {
  const { section } = useParams()
  const wide = useWide()
  const { hash } = useLocation()
  const current = SECTIONS.find((s) => s.id === section)
  // Links like /settings/rules#rule-visaFee scroll to that rule once it's on screen.
  useEffect(() => {
    if (!hash) return
    const t = window.setTimeout(() => {
      const el = document.getElementById(hash.slice(1))
      if (!el) return
      el.closest('details')?.setAttribute('open', '')
      el.scrollIntoView({ block: 'center' })
      el.classList.add('flash')
    }, 60)
    return () => window.clearTimeout(t)
  }, [hash, section])
  if (section === 'settling') return <Navigate to="/settlement" replace />
  if (!current) return <Navigate to={wide ? '/settings/scenarios' : '/profile'} replace />

  const body = <SectionBody id={current.id} />
  if (!wide) {
    return (
      <div>
        <div className="pagehead">
          <BackLink to="/profile" label="Profile" />
          <h1 className="h1" style={{ marginTop: 14 }}>
            {current.label}
          </h1>
          <p>{current.blurb}.</p>
        </div>
        <div className="wrap">{body}</div>
      </div>
    )
  }
  return (
    <div className="settings-desk">
      <div className="settings-left">
        <ProfileCard />
        <nav className="settings-nav card" aria-label="Settings">
          {SECTIONS.map((s) => (
            <NavLink key={s.id} to={s.id === 'settling' ? '/settlement' : `/settings/${s.id}`} className={({ isActive }) => (isActive ? 'active' : '')}>
              <Icon name={s.icon} size={19} />
              {s.label}
            </NavLink>
          ))}
        </nav>
      </div>
      <section className="settings-main card" aria-labelledby="sec-title">
        <h2 id="sec-title" className="h1">
          {current.label}
        </h2>
        <p className="muted" style={{ margin: '6px 0 12px' }}>
          {current.blurb}.
        </p>
        {body}
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
    case 'quotes':
      return <QuotesSection />
    case 'settling':
      return null
    case 'reminders':
      return <RemindersSection />
    case 'share':
      return <ShareSection />
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

/** Signs in to Loot on this device and links it to this Northbound account. */
function LootSignInForm({ cta, onDone }: { cta: string; onDone: () => void }) {
  const linkLoot = useAction(api.account.linkLoot)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPw, setShowPw] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function submit(e: FormEvent) {
    e.preventDefault()
    setError(null)
    if (!email.includes('@')) return setError('Enter the email you use for Loot.')
    if (!password) return setError('Enter your Loot password.')
    setBusy(true)
    const res = await lootPasswordSignIn(email, password)
    if ('error' in res) {
      setError(res.error)
      setBusy(false)
      return
    }
    const linked = await linkLoot({ token: res.token })
    if (!linked.ok) {
      await supabase.auth.signOut()
      setError(linked.reason)
      setBusy(false)
      return
    }
    setBusy(false)
    onDone()
  }

  return (
    <form onSubmit={submit} noValidate className="stack" style={{ gap: 10, maxWidth: 440 }}>
      <label htmlFor="loot-email" className="small" style={{ fontWeight: 700 }}>
        Loot email
      </label>
      <input id="loot-email" className="input" type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" />
      <label htmlFor="loot-pw" className="small" style={{ fontWeight: 700 }}>
        Loot password
      </label>
      <div className="pw-wrap">
        <input id="loot-pw" className="input" type={showPw ? 'text' : 'password'} autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} />
        <button type="button" className="pw-toggle" onClick={() => setShowPw(!showPw)} aria-pressed={showPw} aria-controls="loot-pw">
          {showPw ? 'Hide' : 'Show'}
          <span className="sr-only"> password</span>
        </button>
      </div>
      {error && (
        <p className="error" role="alert" style={{ margin: 0 }}>
          {error}
        </p>
      )}
      <button type="submit" className="btn grad" disabled={busy}>
        {busy ? 'Signing in to Loot…' : cta}
      </button>
    </form>
  )
}

function LootSection() {
  const { session } = useLootSession()
  const { profile, plan, goal, savings, goalUpdatedAt, active, account } = useApp()
  const { updateProfile, unlinkLoot } = useActions()
  const navigate = useNavigate()
  const linkedGoal = !!profile.lootGoalId && !!goal
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

  if (devNoAuth) {
    return (
      <Block>
        <p style={{ margin: 0 }}>You're in local test mode with no sign-in, so Loot can't be reached.</p>
      </Block>
    )
  }

  if (!session) {
    return (
      <Block
        title={account.lootLinked ? 'Sign in to Loot on this device' : 'Link your Loot account'}
        note={account.lootLinked ? `Your Northbound account is linked to Loot${account.lootEmail ? ` (${account.lootEmail})` : ''}. Sign in to Loot here to see your goal on this device.` : "Don't use Loot? You don't need to: enter your savings by hand in Savings plan. If you do, linking lets Northbound follow one of your Loot goals."}
      >
        <LootSignInForm cta={account.lootLinked ? 'Sign in to Loot' : 'Link Loot'} onDone={() => setChanging(!profile.lootGoalId)} />
      </Block>
    )
  }

  return (
    <>
      {linkedGoal && !changing && (
        <Block title="Linked goal">
          <div className="row" style={{ justifyContent: 'flex-start' }}>
            <span className="dot-ok" aria-hidden="true" />
            <div style={{ flex: 1 }}>
              <b>{goal.name}</b>
              <div className="small muted">
                {zar(savings.savedZar, 100)} saved of {zar(goal.target_amount)}. Updated {goalUpdatedAt ? new Date(goalUpdatedAt).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }) : 'just now'}.
              </div>
            </div>
            <button type="button" className="btn quiet sm" onClick={() => setChanging(true)}>
              Change
            </button>
          </div>
        </Block>
      )}

      {changing && (
        <Block title={linkedGoal ? 'Pick a different goal' : 'Pick your move goal'}>
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
            <button type="button" className="btn grad" onClick={() => void link()} disabled={busy || !goals}>
              {busy ? 'Linking…' : 'Link this goal'}
            </button>
            {linkedGoal && (
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

      <Block title="Linked Loot account" note="Northbound reads only the goal you link and its deposits, and can update that goal's target and date. It doesn't use anything else in Loot.">
        <p style={{ margin: '0 0 12px' }}>{session.user.email}</p>
        <div className="row" style={{ justifyContent: 'flex-start', flexWrap: 'wrap', gap: 8 }}>
          {profile.lootGoalId && (
            <button type="button" className="btn quiet sm" onClick={() => void updateProfile({ lootGoalId: null })}>
              Stop following the goal
            </button>
          )}
          <button type="button" className="btn quiet sm" onClick={() => void supabase.auth.signOut()}>
            Sign out of Loot on this device
          </button>
          {account.email && (
            <button
              type="button"
              className="btn quiet sm danger"
              onClick={async () => {
                if (!window.confirm('Unlink Loot from your Northbound account? Your plan stays. You can link again any time.')) return
                try {
                  await updateProfile({ lootGoalId: null })
                  await unlinkLoot({})
                  await supabase.auth.signOut()
                } catch (e) {
                  setError(e instanceof Error ? e.message : "Couldn't unlink.")
                }
              }}
            >
              Unlink Loot
            </button>
          )}
        </div>
      </Block>
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
            Following your Loot goal "{goal.name}". <Link to="/settings/loot">Change</Link>
          </p>
        ) : (
          <SavedMoneyField id="saved" label="Saved for the move" value={profile.savedZar} onSave={(n) => updateProfile({ savedZar: n })} hint="Or link a Loot goal to keep this up to date automatically." />
        )}
      </Block>
      <Block title="Each month">
        <SavedMoneyField id="monthly" label="You plan to save" value={profile.monthlyZar} onSave={(n) => updateProfile({ monthlyZar: n })} hint="If your deposits in Loot over the last 3 months were lower, Northbound uses that instead." />
      </Block>
      <Block title="Life in Cape Town now" note="Optional. Used to compare with life in the UK.">
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
      <div className="stack" style={{ gap: 8 }}>
        {scenarios.map((s) => (
          <div key={s._id} className={`scen-row${s._id === active._id ? ' on' : ''}`} style={{ boxShadow: 'inset 0 0 0 1px var(--hair)' }}>
            <button type="button" className="scen-pick" onClick={() => void setActive({ id: s._id })} aria-pressed={s._id === active._id}>
              <span className="radio" aria-hidden="true" />
              <span>
                <b>
                  {s.name}
                  {s._id === active._id && <span className="main-badge">Main</span>}
                </b>
                <small>
                  {zar(planFor(s, s._id).targetZar, 1000)}
                  {s._id !== active._id ? '. Tap to make it your main scenario' : '. Drives your trip, map and Loot goal'}
                </small>
              </span>
            </button>
            <Link to={`/scenario/${s._id}`} className="btn quiet sm">
              Edit
            </Link>
          </div>
        ))}
      </div>
      <Link to="/scenario/new" className="btn grad" style={{ marginTop: 14 }}>
        <Icon name="plus" size={18} /> New scenario
      </Link>
    </Block>
  )
}

// ---------- reminders ----------

function RemindersSection() {
  return (
    <>
      <Block title="On your phone and in your calendar">
        <RemindersControls />
      </Block>
      <Block title="How reminders work" note="On an iPhone, add Northbound to your Home Screen (Share, then Add to Home Screen) and turn reminders on from the installed app.">
        <p className="small muted" style={{ margin: 0 }}>
          You'll get one nudge 2 weeks before each step and one when it's due, at about 9am Cape Town time. Steps you've marked as done are skipped. The dates follow your main scenario.
        </p>
      </Block>
    </>
  )
}

// ---------- share ----------

function ShareSection() {
  const { shareToken } = useApp()
  const { createShare, revokeShare } = useActions()
  const [copied, setCopied] = useState(false)
  const url = shareToken ? `${window.location.origin}/share/${shareToken}` : null
  return (
    <>
      <Block title="Read-only link" note="Anyone with the link sees your main scenario: the number, the dates, the route and which steps are done. They can't see your email, your Loot details or your other scenarios, and they can't change anything.">
        {url ? (
          <div className="stack" style={{ gap: 10 }}>
            <input className="input" readOnly value={url} onFocus={(e) => e.currentTarget.select()} aria-label="Share link" />
            <div className="row" style={{ justifyContent: 'flex-start', gap: 8, flexWrap: 'wrap' }}>
              <button
                type="button"
                className="btn grad sm"
                onClick={async () => {
                  if (navigator.share) {
                    try {
                      await navigator.share({ title: 'My move to the UK', url })
                      return
                    } catch {
                      // Cancelled: fall through to copying.
                    }
                  }
                  await navigator.clipboard.writeText(url)
                  setCopied(true)
                  setTimeout(() => setCopied(false), 1800)
                }}
              >
                <Icon name="share" size={16} /> {copied ? 'Copied' : 'Share link'}
              </button>
              <button type="button" className="btn quiet sm danger" onClick={() => void revokeShare({})}>
                Stop sharing
              </button>
            </div>
          </div>
        ) : (
          <button type="button" className="btn grad" onClick={() => void createShare({})}>
            <Icon name="share" size={18} /> Create a share link
          </button>
        )}
      </Block>
    </>
  )
}

// ---------- appearance ----------

function AppearanceSection() {
  const [theme, setTheme] = useTheme()
  return (
    <Block title="Colour mode" note="Dark is Northbound's default.">
      <Seg<ThemeChoice> label="Colour mode" value={theme} onChange={setTheme} options={[{ value: 'dark', label: 'Dark' }, { value: 'light', label: 'Light' }, { value: 'auto', label: 'Match device' }]} />
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
  const stale = RULES.filter((r) => needsRefresh(r, today))
  const row = (r: RuleEntry, idPrefix = 'rule-') => (
    <RuleRow
      key={r.key}
      id={`${idPrefix}${r.key}`}
      r={r}
      stale={needsRefresh(r, today)}
      value={r.unit === 'text' ? ruleText(r.key, today, overrides) : rule(r.key, today, overrides)}
      overridden={overrides[r.key] !== undefined}
      onSet={(v) => void setRule({ key: r.key, value: v })}
    />
  )
  return (
    <>
      <div className="rule-counts">
        <span className="tag warn">{estimates.length} estimates</span>
        <span className={`tag ${stale.length ? 'danger' : 'ok'}`}>{stale.length ? `${stale.length} need a refresh` : 'All checked in the last 90 days'}</span>
      </div>
      <p className="hint" style={{ margin: '0 0 14px' }}>
        As they apply on {longDate(today)}. If you find a newer value, change it here and every number in Northbound updates. Anything not checked for 90 days is flagged for a refresh.
      </p>
      <details className="rule-group" open>
        <summary>
          Estimates to check <span className="badge">{estimates.length}</span>
        </summary>
        <ul className="list">{estimates.map((r) => row(r, 'est-'))}</ul>
      </details>
      {groups.map((g) => (
        <details key={g} className="rule-group">
          <summary>{g}</summary>
          <ul className="list">{RULES.filter((r) => r.group === g).map((r) => row(r))}</ul>
        </details>
      ))}
    </>
  )
}

function RuleRow({ id, r, stale, value, overridden, onSet }: { id: string; r: RuleEntry; stale: boolean; value: number | string; overridden: boolean; onSet: (v: number | null) => void }) {
  const shown = r.unit === 'rate' ? String(Math.round(Number(value) * 10000) / 100) : String(value)
  const [text, setText] = useState(shown)
  const [saved, flash] = useSavedFlash()
  const isText = r.unit === 'text'
  const unit = r.unit === 'GBP' ? '£' : r.unit === 'ZAR' ? 'R' : r.unit === 'rate' ? '%' : r.unit
  return (
    <li className="rule-row" id={id} tabIndex={-1}>
      <span>
        {r.label}
        {r.estimate && <span className="badge">Estimate</span>}
        {stale && <span className="badge danger">Needs a refresh</span>}
        <span className={`saved-flash${saved ? ' on' : ''}`}>{saved ? 'Saved' : ''}</span>
      </span>
      {isText ? (
        <span style={{ textAlign: 'right', fontWeight: 700 }}>{String(value)}</span>
      ) : (
        <div className={`rule-input${unit.length > 1 ? " long" : ""}`}>
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
  const { account } = useApp()
  const { resetAll } = useActions()
  const signOut = useSignOut()
  const me = useMe()
  return (
    <>
      <Block title="Signed in">
        <p style={{ margin: '0 0 12px' }}>
          {devNoAuth ? 'Local test mode, not signed in.' : account.email ? `As ${account.email}.` : account.lootEmail ? `With Loot, as ${account.lootEmail}.` : 'Signed in.'}
          {account.lootLinked && account.email ? ' Linked to Loot.' : ''}
        </p>
        {!devNoAuth && (
          <button type="button" className="btn quiet" onClick={() => void signOut()}>
            Sign out
          </button>
        )}
      </Block>
      <Block title="Download your data" note="Everything Northbound stores for you, including your quotes and own costs, as a JSON file.">
        <button type="button" className="btn quiet" disabled={!me} onClick={() => me && downloadJson(me)}>
          Download JSON
        </button>
      </Block>
      <Block title="Delete Northbound data" note="Removes your scenarios, quotes, ticked steps, paperwork, share link and rule changes. Nothing in Loot is touched. This can't be undone.">
        <button
          type="button"
          className="btn quiet danger"
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

/** Saves your Northbound data as a JSON file. Your plan only: no sign-in details. */
function downloadJson(me: NonNullable<ReturnType<typeof useMe>>) {
  const strip = <T extends object>(rows: T[]) => rows.map((r) => Object.fromEntries(Object.entries(r).filter(([k]) => k !== 'userId')))
  const data = {
    exportedAt: new Date().toISOString(),
    profile: me.profile ? strip([me.profile])[0] : null,
    scenarios: strip(me.scenarios),
    quotes: strip(me.quotes),
    customCosts: strip(me.customCosts),
    done: strip(me.done),
    ruleOverrides: strip(me.overrides),
    documents: strip(me.documents),
    earnings: strip(me.earnings),
  }
  const url = URL.createObjectURL(new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' }))
  const a = document.createElement('a')
  a.href = url
  a.download = `northbound-${new Date().toISOString().slice(0, 10)}.json`
  a.click()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}

// ---------- profile card (desktop left column) ----------

function ProfileCard() {
  const { account, input, plan } = useApp()
  const name = account.email ?? account.lootEmail ?? (devNoAuth ? 'Test mode' : 'You')
  return (
    <div className="card profile-card">
      <span className="avatar lg" aria-hidden="true">
        {name.slice(0, 2).toUpperCase()}
      </span>
      <span style={{ minWidth: 0 }}>
        <b>{name}</b>
        <small>
          {CITIES[input.city].name} · landing {monthYear(plan.landDate)}
        </small>
      </span>
    </div>
  )
}

// ---------- my quotes ----------

function QuotesSection() {
  const { totals, quotes, input, active } = useApp()
  const { removeQuote } = useActions()
  const lines = totals.groups.flatMap((g) => g.lines).filter((l) => l.quoteCount > 0)
  if (!lines.length)
    return (
      <Block note="Quotes belong to a scenario. These are for your main scenario.">
        <p className="muted" style={{ margin: '0 0 12px' }}>
          No quotes yet on {active.name}. Add the prices you find and Northbound uses them instead of the baseline.
        </p>
        <Link to="/money/quote" className="btn primary">
          Add my quote
        </Link>
      </Block>
    )
  return (
    <>
      <p className="hint" style={{ margin: '0 0 6px' }}>
        For your main scenario, {active.name}. The newest quote for each cost counts; older ones are history.
      </p>
      {lines.map((l) => (
        <Block key={l.key} title={l.label}>
          <ul className="qs-list">
            {sortQuotes(quotes.filter((q) => q.itemKey === l.key)).map((q, i) => (
              <li key={q._id}>
                <span className="qh-main">
                  <b>{q.currency === 'GBP' ? gbp(q.amount) : zar(q.amount)}</b>
                  <small>
                    {q.currency === 'GBP' ? zar(q.amount * input.rate) : gbp(q.amount / input.rate)} · found {dayMonthYear(q.foundOn)}
                    {q.sourceUrl && (
                      <>
                        {' · '}
                        <a href={q.sourceUrl} target="_blank" rel="noreferrer noopener">
                          Source
                        </a>
                      </>
                    )}
                    {q.note ? ` · ${q.note}` : ''}
                  </small>
                </span>
                <span className={`tag${i === 0 ? ' mine' : ''}`}>{i === 0 ? 'Counts' : 'Older'}</span>
                <button type="button" className="btn quiet sm danger" onClick={() => void removeQuote({ id: q._id })} aria-label={`Delete the quote from ${dayMonthYear(q.foundOn)} for ${l.label}`}>
                  Delete
                </button>
              </li>
            ))}
          </ul>
          <Link to={`/money/quote/${l.key}`} className="btn link sm" style={{ marginTop: 8 }}>
            + Add a newer quote
          </Link>
        </Block>
      ))}
    </>
  )
}
