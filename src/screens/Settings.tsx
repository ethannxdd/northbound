import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { RULES, rule, ruleText, type RuleEntry } from '@shared/rules'
import { longDate } from '@shared/dates'
import { useActions, useApp } from '../lib/app'
import { useAuth } from '../lib/auth'
import { zarShort } from '../lib/format'
import { MoneyInput, Seg, useTheme, type ThemeChoice } from '../lib/ui'

export default function Settings() {
  const { profile, scenarios, active, planFor, overrides, savingsSource, goal, today } = useApp()
  const { updateProfile, setRule, setActive, resetAll } = useActions()
  const { session, signOut, dev } = useAuth()
  const [theme, setTheme] = useTheme()
  const navigate = useNavigate()
  const groups = [...new Set(RULES.map((r) => r.group))]

  return (
    <div className="narrow-page" style={{ paddingBottom: 40 }}>
      <div className="topbar">
        <button type="button" className="btn quiet small" onClick={() => navigate(-1)}>
          Back
        </button>
        <span className="brand">Settings</span>
        <span style={{ width: 60 }} />
      </div>

      <section className="sec">
        <h2>Appearance</h2>
        <Seg<ThemeChoice> label="Colour mode" value={theme} onChange={setTheme} options={[{ value: 'auto', label: 'Match my device' }, { value: 'light', label: 'Light' }, { value: 'dark', label: 'Dark' }]} />
      </section>

      <section className="sec">
        <h2>Your savings</h2>
        {savingsSource === 'loot' && goal ? (
          <p className="small" style={{ marginTop: 0 }}>
            Following your Loot goal "{goal.name}". <Link to="/link">Change</Link>
          </p>
        ) : (
          <>
            <p className="small muted" style={{ marginTop: 0 }}>
              Entered by hand. <Link to="/link">Link your Loot goal</Link> to keep it up to date automatically.
            </p>
            <label className="small" style={{ fontWeight: 700, display: 'grid', gap: 4, marginBottom: 10 }}>
              Saved for the move
              <MoneyInput value={profile.savedZar} onChange={(n) => void updateProfile({ savedZar: n })} />
            </label>
          </>
        )}
        <label className="small" style={{ fontWeight: 700, display: 'grid', gap: 4, marginBottom: 10 }}>
          You plan to save each month
          <MoneyInput value={profile.monthlyZar} onChange={(n) => void updateProfile({ monthlyZar: n })} />
        </label>
        <p className="small muted">If your actual deposits in Loot have been lower over the last 3 months, Northbound uses that instead.</p>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
          <label className="small" style={{ fontWeight: 700, display: 'grid', gap: 4 }}>
            Rent in Cape Town
            <MoneyInput value={profile.homeRentZar} onChange={(n) => void updateProfile({ homeRentZar: n })} />
          </label>
          <label className="small" style={{ fontWeight: 700, display: 'grid', gap: 4 }}>
            Take-home now
            <MoneyInput value={profile.homeIncomeZar} onChange={(n) => void updateProfile({ homeIncomeZar: n })} />
          </label>
        </div>
      </section>

      <section className="sec">
        <h2>Scenarios</h2>
        <ul className="list">
          {scenarios.map((s) => (
            <li key={s._id} className="row" style={{ alignItems: 'center' }}>
              <button type="button" className="btn quiet small" style={{ boxShadow: 'none', padding: 0, fontWeight: s._id === active._id ? 800 : 500 }} onClick={() => void setActive({ id: s._id })} aria-pressed={s._id === active._id}>
                {s.name}
                {s._id === active._id && <span className="badge">Showing</span>}
              </button>
              <span className="small muted">
                {zarShort(planFor(s).targetZar)} <Link to={`/scenario/${s._id}`}>Edit</Link>
              </span>
            </li>
          ))}
        </ul>
        <Link className="btn quiet small" to="/scenario/new" style={{ marginTop: 10 }}>
          New scenario
        </Link>
      </section>

      <section className="sec">
        <h2>Rules and sources</h2>
        <p className="small muted" style={{ marginTop: 0 }}>
          Every fee and threshold Northbound uses, as it applies on {longDate(today)}. Change a value if you find a newer one; the source link is next to each.
        </p>
        {groups.map((g) => (
          <div key={g} style={{ marginTop: 14 }}>
            <h3 className="small" style={{ margin: '0 0 4px' }}>
              {g}
            </h3>
            <ul className="list">
              {RULES.filter((r) => r.group === g).map((r) => (
                <RuleRow key={r.key} r={r} value={r.unit === 'text' ? ruleText(r.key, today, overrides) : rule(r.key, today, overrides)} overridden={overrides[r.key] !== undefined} onSet={(v) => void setRule({ key: r.key, value: v })} />
              ))}
            </ul>
          </div>
        ))}
      </section>

      <section className="sec">
        <h2>Account</h2>
        <p className="small muted" style={{ marginTop: 0 }}>
          {dev ? 'Local test mode, not signed in.' : `Signed in to Loot as ${session?.user.email ?? 'you'}.`}
        </p>
        <div className="stack-gap">
          {!dev && (
            <button type="button" className="btn quiet block" onClick={() => void signOut()}>
              Sign out
            </button>
          )}
          <ResetButton onReset={() => void resetAll()} />
        </div>
      </section>
    </div>
  )
}

function RuleRow({ r, value, overridden, onSet }: { r: RuleEntry; value: number | string; overridden: boolean; onSet: (v: number | null) => void }) {
  const [text, setText] = useState(r.unit === 'rate' ? String(Number(value) * 100) : String(value))
  const isText = r.unit === 'text'
  const unit = r.unit === 'GBP' ? '£' : r.unit === 'ZAR' ? 'R' : r.unit === 'rate' ? '%' : r.unit
  return (
    <li className="rule-row">
      <span className="small">
        {r.label}
        {r.estimate && <span className="badge">Estimate</span>}
      </span>
      {isText ? (
        <span className="small" style={{ textAlign: 'right' }}>
          {String(value)}
        </span>
      ) : (
        <input
          className="input"
          inputMode="decimal"
          aria-label={`${r.label} (${unit})`}
          value={text}
          onChange={(e) => setText(e.target.value)}
          onBlur={() => {
            const n = Number(text)
            if (!Number.isFinite(n) || text.trim() === '') return setText(String(value))
            onSet(r.unit === 'rate' ? n / 100 : n)
          }}
        />
      )}
      <small>
        {unit && !isText ? `${unit === '%' ? 'Percent' : unit}. ` : ''}
        <a href={r.source} target="_blank" rel="noreferrer">
          Source
        </a>
        , checked {longDate(r.lastChecked)}
        {overridden && (
          <>
            {'. '}
            <button type="button" className="btn quiet small" style={{ padding: '0 6px', boxShadow: 'none', textDecoration: 'underline' }} onClick={() => onSet(null)}>
              Reset to source value
            </button>
          </>
        )}
      </small>
    </li>
  )
}

function ResetButton({ onReset }: { onReset: () => void }) {
  return (
    <button
      type="button"
      className="btn quiet block"
      style={{ color: 'var(--now)' }}
      onClick={() => {
        if (window.confirm("Delete all of Northbound's data for your account? Your scenarios, ticked tasks and rule changes go. Nothing in Loot is touched. This can't be undone.")) onReset()
      }}
    >
      Delete Northbound data
    </button>
  )
}
