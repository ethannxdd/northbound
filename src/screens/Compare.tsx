import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { CITIES, HOUSING_LABEL } from '@shared/cities'
import { monthYear, monthsBetween } from '@shared/dates'
import { monthlyBudget, salaryFor } from '@shared/engine'
import type { ScenarioInput } from '@shared/types'
import { TopBar } from '../components/Shell'
import { toInput, useApp } from '../lib/app'
import { gbp, zar } from '../lib/format'
import { useOpening } from '../lib/ui'

interface Option {
  id: string
  label: string
  input: ScenarioInput
}

export default function Compare() {
  const { scenarios, active, planFor, overrides, today } = useApp()
  useOpening()

  // Your saved scenarios, plus a ready-made "same, but the other city" for a quick look.
  const options = useMemo<Option[]>(() => {
    const own = scenarios.map((s) => ({ id: s._id as string, label: s.name, input: toInput(s) }))
    const base = toInput(active)
    const other = base.city === 'manchester' ? 'london' : 'manchester'
    own.push({ id: 'other-city', label: `${active.name}, but in ${CITIES[other].name}`, input: { ...base, city: other, name: `${CITIES[other].name} version` } })
    return own
  }, [scenarios, active])

  const [aId, setA] = useState<string>(active._id)
  const [bId, setB] = useState<string>(scenarios.find((s) => s._id !== active._id)?._id ?? 'other-city')
  const a = options.find((o) => o.id === aId) ?? options[0]
  const b = options.find((o) => o.id === bId) ?? options[options.length - 1]

  const stats = (o: Option) => {
    const p = planFor(o.input)
    const budget = monthlyBudget(o.input, p.landDate, overrides)
    const monthsToSave = p.readyDate ? Math.max(0, monthsBetween(today, p.readyDate)) : null
    return { p, budget, monthsToSave, city: CITIES[o.input.city] }
  }
  const A = stats(a)
  const B = stats(b)
  const moreZar = B.p.targetZar - A.p.targetZar
  const leftDiff = B.budget.left - A.budget.left
  const maxMonths = Math.max(A.monthsToSave ?? 0, B.monthsToSave ?? 0, 1)

  return (
    <div className="narrow-page">
      <div className="topbar" style={{ display: 'block' }}>
        <TopBar right={<Link to="/scenario/new">New scenario</Link>} />
        <h1 className="h1" style={{ marginTop: 12 }}>
          Compare
        </h1>
      </div>
      <div className="pickers">
        <Picker label="First" value={a.id} options={options} onChange={setA} />
        <Picker label="Second" value={b.id} options={options} onChange={setB} />
      </div>
      <div className="halves">
        {[
          { o: a, s: A, cls: 'a' },
          { o: b, s: B, cls: 'b' },
        ].map(({ o, s, cls }) => (
          <div key={cls} className={`half ${cls}`}>
            <div className="city">{s.city.name}</div>
            <dl>
              <dt>Save before you go</dt>
              <dd>{zar(s.p.targetZar, 1000)}</dd>
              <dt>Rent, {HOUSING_LABEL[o.input.housing].toLowerCase()}</dt>
              <dd>{gbp(s.city.rent[o.input.housing])}</dd>
              <dt>Expected pay</dt>
              <dd>{gbp(salaryFor(o.input))}</dd>
              <dt>Left each month</dt>
              <dd>{gbp(s.budget.left)}</dd>
              <dt>{o.input.landMode === 'saved' ? 'Could land' : 'Landing'}</dt>
              <dd>{monthYear(s.p.landDate)}</dd>
            </dl>
          </div>
        ))}
      </div>
      <p className="card verdict">
        {Math.abs(moreZar) < 1000 ? (
          <>Both need about the same up front.</>
        ) : (
          <>
            {b.label} needs <b>{zar(Math.abs(moreZar), 1000)} {moreZar > 0 ? 'more' : 'less'}</b> up front
          </>
        )}
        {Math.abs(leftDiff) >= 10 && (
          <>
            {' '}
            and leaves you <b>{gbp(Math.abs(leftDiff))} {leftDiff > 0 ? 'more' : 'less'}</b> each month
            {leftDiff < 0 && salaryFor(b.input) > salaryFor(a.input) ? ', even with the higher pay' : ''}
          </>
        )}
        .
      </p>
      <section className="sec">
        <h2>Time left to save</h2>
        {[
          { o: a, s: A, cls: '' },
          { o: b, s: B, cls: 'b' },
        ].map(({ o, s, cls }) => {
          const n = s.monthsToSave
          const filled = n === null ? 0 : Math.round((n / maxMonths) * 12)
          return (
            <div className="rw" key={o.id + cls}>
              <span>{s.city.name}</span>
              <div className={`meter ${cls} reveal-x`} aria-hidden="true">
                {Array.from({ length: 12 }, (_, i) => (
                  <i key={i} className={i < filled ? '' : 'off'} />
                ))}
              </div>
              <span>{n === null ? 'Add savings' : `${n} months`}</span>
            </div>
          )
        })}
      </section>
    </div>
  )
}

function Picker({ label, value, options, onChange }: { label: string; value: string; options: Option[]; onChange: (v: string) => void }) {
  return (
    <label className="small" style={{ fontWeight: 700 }}>
      <span className="sr-only">{label} scenario</span>
      <select className="input" value={value} onChange={(e) => onChange(e.target.value)} style={{ fontSize: 14, padding: '9px 10px' }}>
        {options.map((o) => (
          <option key={o.id} value={o.id}>
            {o.label}
          </option>
        ))}
      </select>
    </label>
  )
}
