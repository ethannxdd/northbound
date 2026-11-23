import { useState } from 'react'
import { Link } from 'react-router-dom'
import { addMonths, dayMonthYear, monthYear } from '@shared/dates'
import { salaryFor } from '@shared/engine'
import { rule } from '@shared/rules'
import { expectedEarnings, firstYearCheck, settlementCheck } from '@shared/settlement'
import { useActions, useApp } from '../lib/app'
import { gbp, plural, zar } from '../lib/format'
import { MoneyInput } from '../lib/ui'

/** Settlement tracker: the 5-year path after you land, and the conditions to meet along the way. */
export default function Settlement() {
  const { plan, profile, earnings, overrides, input } = useApp()
  const { updateProfile } = useActions()
  const land = profile.landedOn ?? plan.landDate
  const check = settlementCheck(land, earnings, overrides)
  const salary = salaryFor(input)
  const expected = expectedEarnings(land, profile.landedOn ? 0 : input.jobHuntMonths, salary, check.settleDate)
  const first = firstYearCheck(land, input.jobHuntMonths, salary, overrides)
  const english = profile.englishLevel ?? 'not yet'
  const ilr = rule('ilrFee', check.settleDate, overrides)
  const citizenFee = rule('citizenshipFee', addMonths(check.settleDate, 12), overrides)
  const englishOk = english === 'B2' || english === 'exempt' || (english === 'B1' && check.english === 'B1')
  const maxGross = Math.max(salary, ...Object.values(earnings), check.minEarnings, 1)

  const path = [
    { date: monthYear(land), name: profile.landedOn ? 'Landed on the Ancestry visa' : 'Land on the Ancestry visa', sub: `${plural(check.years, 'year')} of permission. Visa and health surcharge are already in your number.`, cost: 'Paid before you go', on: true },
    { date: `${land.slice(0, 4)} – ${check.settleDate.slice(0, 4)}`, name: 'Live and work', sub: `Earn ${gbp(check.minEarnings)}+ each year, pass ${check.english} English, stay debt-free.`, cost: '£0' },
    { date: monthYear(check.settleDate), name: 'Apply to settle', sub: 'Indefinite leave to remain, if the conditions are met.', cost: gbp(ilr) },
    { date: monthYear(addMonths(check.settleDate, 12)), name: 'British citizenship', sub: 'A year after settling, with the ceremony.', cost: gbp(citizenFee) },
  ]

  const conds = [
    { mark: englishOk ? '✓' : '!', name: `${check.english} English`, sub: check.english === 'B2' ? 'Required from 26 Mar 2027. Check whether your schooling counts or a test is needed.' : 'Check whether your schooling counts or a test is needed.', status: englishOk ? 'Done' : 'Not yet', tone: englishOk ? 'ok' : 'warn' },
    { mark: '£', name: `Earnings of ${gbp(check.minEarnings)} a year`, sub: 'For each year counted towards settling. Start date not confirmed yet.', status: `${check.yearsMet} of ${check.yearsNeeded} years`, tone: check.yearsMet >= check.yearsNeeded ? 'ok' : 'base' },
    { mark: '✓', name: 'No UK criminal record', sub: 'Keep it that way.', status: 'On track', tone: 'ok' },
    { mark: '✓', name: 'No unpaid NHS, tax or NI debt', sub: 'Pay on time. Includes council tax arrears.', status: 'On track', tone: 'ok' },
  ]

  return (
    <div className="main">
      <div className="stack" style={{ gap: 6 }}>
        <Link to="/settings" className="muted small strong">
          Profile
        </Link>
        <h1 className="h1">Settling in the UK</h1>
        <p className="muted" style={{ margin: 0 }}>
          On the Ancestry visa you can apply to settle after {check.years} years. From 2027 the conditions below apply.
        </p>
      </div>

      <section aria-label="Your path" className="card settle-path">
        <ol>
          {path.map((p) => (
            <li key={p.name} className={p.on ? 'on' : ''}>
              <span className="sp-rail" aria-hidden="true" />
              <span className="sp-date">{p.date}</span>
              <b>{p.name}</b>
              <small>{p.sub}</small>
              <span className="sp-cost">{p.cost}</span>
            </li>
          ))}
        </ol>
        <div className="sp-total">
          <span>Cost of the whole path after landing</span>
          <b>
            {gbp(ilr + citizenFee)} · {zar((ilr + citizenFee) * input.rate, 10)} at today's rate
          </b>
        </div>
      </section>

      <div className="cols-2">
        <section aria-labelledby="conds" className="card">
          <h2 id="conds" className="h2" style={{ marginBottom: 8 }}>
            The conditions
          </h2>
          <ul className="conds">
            {conds.map((c) => (
              <li key={c.name}>
                <span className={`cmark ${c.tone}`} aria-hidden="true">
                  {c.mark}
                </span>
                <span className="ctxt">
                  <b>{c.name}</b>
                  <small>{c.sub}</small>
                </span>
                <span className={`tag ${c.tone}`}>{c.status}</span>
              </li>
            ))}
          </ul>
          <div className="field" style={{ margin: '14px 0 0' }}>
            <label htmlFor="eng">Your English result</label>
            <select id="eng" className="input" value={english} onChange={(e) => void updateProfile({ englishLevel: e.target.value })}>
              <option value="not yet">Not tested yet</option>
              <option value="B1">B1</option>
              <option value="B2">B2 or higher</option>
              <option value="exempt">Exempt (degree taught in English)</option>
            </select>
          </div>
          <div className="field" style={{ margin: '14px 0 0' }}>
            <label htmlFor="landed">Already in the UK? Your landing date</label>
            <input id="landed" className="input" type="date" value={profile.landedOn ?? ''} onChange={(e) => void updateProfile({ landedOn: e.target.value || null })} />
            <p className="hint">Until you set this, the tracker uses your plan's landing date.</p>
          </div>
        </section>

        <section aria-labelledby="earn" className="card">
          <div className="card-h">
            <h2 id="earn" className="h2">
              Earnings by tax year
            </h2>
            <span className="muted small">Need {gbp(check.minEarnings)} or more each year</span>
          </div>
          <ul className="earn-list">
            {expected.map((e, i) => (
              <EarningsRow key={e.taxYear} year={e.taxYear} planned={e} actual={earnings[e.taxYear] ?? 0} min={check.minEarnings} max={maxGross} first={i === 0} />
            ))}
          </ul>
          {first.short && !profile.landedOn && (
            <div className="note warn" role="status" style={{ marginTop: 12 }}>
              With a {plural(input.jobHuntMonths, 'month')} job hunt your first tax year ({first.taxYear.replace('-', '/')}) only has about {first.months} months of pay, around {gbp(first.gross)}, so it may fall short of {gbp(first.minEarnings)}.{' '}
              {first.startBy ? `Starting work by ${dayMonthYear(first.startBy)} fixes it: land earlier in the tax year, or shorten the job hunt.` : 'Landing earlier in the tax year, or a shorter job hunt, fixes it.'}
            </div>
          )}
          <p className="faint small" style={{ margin: '12px 0 0' }}>
            Before you land these show what your plan expects. Once you're in the UK, type in each year's gross pay from your P60.
          </p>
        </section>
      </div>
      <p className="faint small" style={{ margin: 0 }}>
        The 2027 rules aren't law yet. Check GOV.UK before applying. Fees are on the <Link to="/settings/rules">Rules page</Link>.
      </p>
    </div>
  )
}

function EarningsRow({ year, planned, actual, min, max, first }: { year: string; planned: { months: number; gross: number }; actual: number; min: number; max: number; first: boolean }) {
  const { setEarnings } = useActions()
  const [draft, setDraft] = useState(actual)
  const [editing, setEditing] = useState(false)
  const real = actual > 0
  const value = real ? actual : planned.gross
  const under = value < min
  return (
    <li>
      <span className="ey">
        <b>{year.replace('-', '/')}</b>
        <small>{real ? 'Your P60' : first && planned.months < 12 ? `Plan · ${planned.months} months of pay` : 'Plan'}</small>
      </span>
      <span className="ebar" aria-hidden="true">
        <i className={real ? (under ? 'warn' : 'ok') : under ? 'warn' : ''} style={{ width: `${Math.min(100, (value / max) * 100)}%` }} />
        <em style={{ left: `${Math.min(100, (min / max) * 100)}%` }} />
      </span>
      {editing ? (
        <span
          className="einput"
          onBlur={() => {
            setEditing(false)
            if (draft !== actual) void setEarnings({ taxYear: year, gross: draft > 0 ? draft : null })
          }}
        >
          <MoneyInput prefix="£" value={draft} onChange={setDraft} id={`earn-${year}`} />
        </span>
      ) : (
        <button type="button" className={`egross ${real ? (under ? 'warn-text' : 'ok-text') : under ? 'warn-text' : ''}`} onClick={() => setEditing(true)} aria-label={`${year} earnings ${gbp(value)}. Enter your actual pay`}>
          {real ? '' : '~'}
          {gbp(value)}
        </button>
      )}
    </li>
  )
}
