import { useState } from 'react'
import { longMonthYear } from '@shared/dates'
import { settlementCheck, taxYearsBetween } from '@shared/settlement'
import { PageHead } from '../components/Shell'
import { useActions, useApp } from '../lib/app'
import { gbp } from '../lib/format'
import { MoneyInput, useOpening } from '../lib/ui'
import { addMonths } from '@shared/dates'

/** Settlement tracker: the 5-year path after you land, and the conditions to meet along the way. */
export default function Settlement() {
  const { plan, profile, earnings, overrides } = useApp()
  const { updateProfile } = useActions()
  useOpening()
  const land = profile.landedOn ?? plan.landDate
  const check = settlementCheck(land, earnings, overrides)
  const years = taxYearsBetween(land, addMonths(check.settleDate, -1))
  const english = profile.englishLevel ?? 'not yet'

  return (
    <div>
      <PageHead title="Settling in the UK" sub={`On the Ancestry visa you can apply to settle after ${check.years} years. From 2027 the conditions below apply.`} />
      <div className="container wrap" style={{ marginTop: 12 }}>
        <div className="cols-2-1 stack" style={{ gap: 16 }}>
          <div className="stack" style={{ gap: 16 }}>
            <section className="card" aria-labelledby="path">
              <h2 id="path" className="h2">
                Your path
              </h2>
              <ul className="list" style={{ marginTop: 6 }}>
                <li className="row">
                  <span>{profile.landedOn ? 'You landed' : 'You land'}</span>
                  <b>{longMonthYear(land)}</b>
                </li>
                <li className="row">
                  <span>Apply to settle</span>
                  <b>{longMonthYear(check.settleDate)}</b>
                </li>
                <li className="row">
                  <span>Then British citizenship</span>
                  <b>A year after settling</b>
                </li>
              </ul>
              <div className="field" style={{ marginTop: 14, marginBottom: 0 }}>
                <label htmlFor="landed">Already in the UK? Your landing date</label>
                <input id="landed" className="input" type="date" value={profile.landedOn ?? ''} onChange={(e) => void updateProfile({ landedOn: e.target.value || null })} />
                <p className="hint">Until you set this, the tracker uses your plan's landing date.</p>
              </div>
            </section>
            <section className="card" aria-labelledby="earn">
              <h2 id="earn" className="h2">
                Earnings each tax year
              </h2>
              <p className="small muted" style={{ margin: '4px 0 12px' }}>
                You'll need at least {gbp(check.minEarnings)} a year. Tax years run 6 April to 5 April. Enter your gross pay from your P60.
              </p>
              {years.map((y) => (
                <EarningsRow key={y} year={y} value={earnings[y] ?? 0} min={check.minEarnings} />
              ))}
            </section>
          </div>
          <div className="sticky-side">
            <section className="card lift" aria-labelledby="conds">
              <h2 id="conds" className="h2">
                Conditions
              </h2>
              <ul className="list" style={{ marginTop: 6 }}>
                <li>
                  <div className="row">
                    <span>Years with enough earnings</span>
                    <b>
                      {check.yearsMet} of {years.length}
                    </b>
                  </div>
                </li>
                <li>
                  <div className="row">
                    <span>English at {check.english}</span>
                    <select className="input" style={{ width: 150, padding: '8px 30px 8px 10px', fontSize: 14 }} value={english} onChange={(e) => void updateProfile({ englishLevel: e.target.value })} aria-label="Your English test result">
                      <option value="not yet">Not tested yet</option>
                      <option value="B1">B1</option>
                      <option value="B2">B2 or higher</option>
                      <option value="exempt">Exempt (degree)</option>
                    </select>
                  </div>
                </li>
                <li className="row">
                  <span>No UK criminal record</span>
                  <b>Keep it that way</b>
                </li>
                <li className="row">
                  <span>No unpaid NHS, tax or NI debt</span>
                  <b>Pay on time</b>
                </li>
              </ul>
              <p className="hint">
                The 2027 rules aren't law yet. Check GOV.UK before applying. The settlement fee is set on the Rules page.
              </p>
            </section>
          </div>
        </div>
      </div>
    </div>
  )
}

function EarningsRow({ year, value, min }: { year: string; value: number; min: number }) {
  const { setEarnings } = useActions()
  const [draft, setDraft] = useState(value)
  const ok = value >= min && value > 0
  return (
    <div className="row" style={{ marginBottom: 8 }}>
      <span style={{ width: 90, fontWeight: 700 }}>{year}</span>
      <div
        style={{ flex: 1 }}
        onBlur={() => {
          if (draft !== value) void setEarnings({ taxYear: year, gross: draft > 0 ? draft : null })
        }}
      >
        <MoneyInput prefix="£" value={draft} onChange={setDraft} />
      </div>
      <span className="tiny" style={{ width: 54, textAlign: 'right', color: ok ? 'var(--ok)' : 'var(--faint)', fontWeight: 700 }}>
        {value > 0 ? (ok ? 'Met' : 'Under') : ''}
      </span>
    </div>
  )
}
