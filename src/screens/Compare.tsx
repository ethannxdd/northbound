import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { CITIES, HOUSING_LABEL, photoUrl, rentFor } from '@shared/cities'
import { monthYear, monthsBetween } from '@shared/dates'
import { monthlyBudget, salaryFor } from '@shared/engine'
import type { ScenarioInput } from '@shared/types'
import { PageHead } from '../components/Shell'
import { toInput, useActions, useApp } from '../lib/app'
import { gbp, zar } from '../lib/format'
import { useOpening } from '../lib/ui'

interface Option {
  id: string
  label: string
  input: ScenarioInput
}

export default function Compare() {
  const { scenarios, active, planFor, overrides, today } = useApp()
  const { saveScenario } = useActions()
  const [savedNote, setSavedNote] = useState<string | null>(null)
  useOpening()

  // Your saved scenarios, plus a ready-made "same, but the other city" for a quick look.
  const options = useMemo<Option[]>(() => {
    const own = scenarios.map((s) => ({ id: s._id as string, label: s.name, input: toInput(s) }))
    const base = toInput(active)
    const other = base.city === 'manchester' ? 'london' : 'manchester'
    own.push({ id: 'other-city', label: `${active.name}, but in ${CITIES[other].name}`, input: { ...base, city: other, name: active.name.replace(CITIES[base.city].name, CITIES[other].name) } })
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

  const verdict = (
    <>
      {Math.abs(moreZar) < 1000 ? (
        <>Both need about the same up front</>
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
    </>
  )

  return (
    <div>
      <PageHead title="Compare" sub={<>Pick any two scenarios. <Link to="/scenario/new">Make a new one</Link> to try something else.</>} />
      <div className="container wrap" style={{ marginTop: 14 }}>
        <div className="cmp-cards">
          {[
            { o: a, s: A, set: setA, label: 'First' },
            { o: b, s: B, set: setB, label: 'Second' },
          ].map(({ o, s, set, label }) => (
            <article key={label} className="cmp-card" aria-label={`${label} scenario`}>
              <img src={photoUrl(s.city.photo, 600)} alt="" />
              <div className="body">
                <Picker label={label} value={o.id} options={options} onChange={set} />
                <dl>
                  <dt>Save before you go</dt>
                  <dd>{zar(s.p.targetZar, 1000)}</dd>
                  <dt>Rent, {HOUSING_LABEL[o.input.housing].toLowerCase()}</dt>
                  <dd>{gbp(rentFor(o.input.city, o.input.housing, o.input.area))}</dd>
                  <dt>Expected pay</dt>
                  <dd>{gbp(salaryFor(o.input))}</dd>
                  <dt>Left each month</dt>
                  <dd>{gbp(s.budget.left)}</dd>
                  <dt>{o.input.landMode === 'saved' ? 'Could land' : 'Landing'}</dt>
                  <dd>{monthYear(s.p.landDate)}</dd>
                </dl>
              </div>
            </article>
          ))}
        </div>
        <p className="card" style={{ marginTop: 16, maxWidth: 744, fontSize: 16 }}>
          {verdict}
        </p>
        {[a, b].some((o) => o.id === 'other-city') && (
          <div style={{ marginTop: 10 }}>
            {savedNote ? (
              <span className="ok-text">{savedNote}</span>
            ) : (
              <button
                type="button"
                className="btn quiet sm"
                onClick={async () => {
                  const o = [a, b].find((x) => x.id === 'other-city')!
                  const id = await saveScenario({ scenario: o.input })
                  setSavedNote(`Saved as "${o.input.name}". It's in your scenarios now.`)
                  if (bId === 'other-city') setB(id)
                  else setA(id)
                }}
              >
                Save the {CITIES[[a, b].find((x) => x.id === 'other-city')!.input.city].name} version as a scenario
              </button>
            )}
          </div>
        )}
        <section className="section" style={{ maxWidth: 744 }} aria-labelledby="time">
          <h2 id="time" className="h2" style={{ marginBottom: 12 }}>
            Time left to save
          </h2>
          {[
            { o: a, s: A, cls: '' },
            { o: b, s: B, cls: 'b' },
          ].map(({ o, s, cls }) => {
            const n = s.monthsToSave
            const filled = n === null ? 0 : Math.round((n / maxMonths) * 12)
            return (
              <div className="rw" key={o.id + cls}>
                <span>{o.label}</span>
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
    </div>
  )
}

function Picker({ label, value, options, onChange }: { label: string; value: string; options: Option[]; onChange: (v: string) => void }) {
  return (
    <select className="input" aria-label={`${label} scenario`} value={value} onChange={(e) => onChange(e.target.value)}>
      {options.map((o) => (
        <option key={o.id} value={o.id}>
          {o.label}
        </option>
      ))}
    </select>
  )
}
