import { useMemo, useState, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { CITIES, HOUSING_LABEL, photoUrl } from '@shared/cities'
import { monthYear } from '@shared/dates'
import { monthlyBudget, planTotal, upfrontCosts } from '@shared/engine'
import type { ScenarioInput } from '@shared/types'
import { toInput, useActions, useApp } from '../lib/app'
import { gbp, zar } from '../lib/format'

interface Option {
  id: string
  label: string
  input: ScenarioInput
}

const MAX = 4

/** Status from what's left each month once you're paid. */
export function flagFor(left: number): { text: string; tone: 'ok' | 'warn' | 'danger' } {
  if (left < 0) return { text: "Doesn't add up", tone: 'danger' }
  if (left < 150) return { text: 'Very tight', tone: 'warn' }
  return { text: 'Works', tone: 'ok' }
}

export default function Compare() {
  const { scenarios, active, planFor, overrides, effective, extrasFor, savings } = useApp()
  const { saveScenario } = useActions()
  const [savedNote, setSavedNote] = useState<string | null>(null)

  // Your saved scenarios, plus a ready-made "same, but the other city" for a quick look.
  const options = useMemo<Option[]>(() => {
    const own = scenarios.map((s) => ({ id: s._id as string, label: s.name, input: toInput(s) }))
    const base = toInput(active)
    const other = base.city === 'manchester' ? 'london' : 'manchester'
    own.push({ id: 'other-city', label: `${active.name}, but in ${CITIES[other].name}`, input: { ...base, city: other, name: active.name.replace(CITIES[base.city].name, CITIES[other].name) } })
    return own
  }, [scenarios, active])

  const [ids, setIds] = useState<string[]>(() => {
    const own = [active._id as string, ...scenarios.filter((s) => s._id !== active._id).map((s) => s._id as string)].slice(0, MAX)
    return own.length >= 2 ? own : [...own, 'other-city']
  })
  const cols = ids.map((id) => options.find((o) => o.id === id)).filter(Boolean) as Option[]

  const stats = cols.map((o) => {
    const p = planFor(o.input, o.id)
    const input = effective(o.input)
    const ex = extrasFor(o.id)
    const t = planTotal(upfrontCosts(input, p.landDate, overrides), ex.quotes, ex.customs, input.rate)
    const budget = monthlyBudget(input, p.landDate, overrides)
    return { o, p, t, budget, flag: flagFor(budget.left), main: o.id === active._id }
  })

  const first = stats[0]
  const sentences = stats.slice(1).map((s) => {
    const more = s.p.targetZar - first.p.targetZar
    const left = s.budget.left - first.budget.left
    const upfront = Math.abs(more) < 1000 ? 'needs about the same up front as' : `needs ${zar(Math.abs(more), 1000)} ${more > 0 ? 'more' : 'less'} up front than`
    const month = Math.abs(left) < 10 ? 'leaves about the same each month' : `leaves ${gbp(Math.abs(left))} ${left > 0 ? 'more' : 'less'} each month`
    return (
      <span key={s.o.id}>
        <b>{s.o.label}</b> {upfront} {first.o.label}, and {month}
        {s.budget.left < 0 ? `, which is ${gbp(-s.budget.left)} short` : ''}.{' '}
      </span>
    )
  })

  const row = (label: string, sub: string, cell: (s: (typeof stats)[number]) => ReactNode, big = false) => (
    <tr className={big ? 'big' : ''}>
      <th scope="row">
        <span>{label}</span>
        <small>{sub}</small>
      </th>
      {stats.map((s) => (
        <td key={s.o.id} className={s.main ? 'main-col' : ''}>
          {cell(s)}
        </td>
      ))}
    </tr>
  )
  const other = cols.find((c) => c.id === 'other-city')

  return (
    <div className="main">
      <div className="page-title-row">
        <div className="stack" style={{ gap: 6 }}>
          <h1 className="h1">Compare</h1>
          <p className="muted" style={{ margin: 0 }}>
            Up to four scenarios side by side, each with the same savings pace
          </p>
        </div>
        <Link to="/scenario/new" className="btn solid">
          + New scenario
        </Link>
      </div>

      {sentences.length > 0 && (
        <section aria-label="The difference in words" className="words-card">
          <p>{sentences}</p>
          {other && (
            <div style={{ marginTop: 12 }}>
              {savedNote ? (
                <span className="ok-text">{savedNote}</span>
              ) : (
                <button
                  type="button"
                  className="btn quiet sm"
                  onClick={async () => {
                    const id = await saveScenario({ scenario: other.input, copyFrom: active._id })
                    setSavedNote(`Saved as "${other.input.name}". It's in your scenarios now.`)
                    setIds((xs) => xs.map((x) => (x === 'other-city' ? id : x)))
                  }}
                >
                  Save the {CITIES[other.input.city].name} version as a scenario
                </button>
              )}
            </div>
          )}
        </section>
      )}

      <div className="cost-scroll cmp-wrap">
        <table className="cmp-table">
          <thead>
            <tr>
              <td />
              {stats.map((s, i) => (
                <th key={s.o.id} scope="col" className={s.main ? 'main-col' : ''}>
                  <img src={photoUrl(CITIES[s.o.input.city].photo, 500)} alt="" />
                  <select
                    className="input sm"
                    aria-label={`Scenario in column ${i + 1}`}
                    value={s.o.id}
                    onChange={(e) => setIds((xs) => xs.map((x, j) => (j === i ? e.target.value : x)))}
                  >
                    {options.map((o) => (
                      <option key={o.id} value={o.id} disabled={o.id !== s.o.id && ids.includes(o.id)}>
                        {o.label}
                      </option>
                    ))}
                  </select>
                  <span className="cmp-sub">
                    {CITIES[s.o.input.city].name} · {HOUSING_LABEL[s.o.input.housing].toLowerCase()}
                  </span>
                  <span className="cmp-flags">
                    <span className={`tag ${s.flag.tone}`}>{s.main ? `Main · ${s.flag.text.toLowerCase()}` : s.flag.text}</span>
                    {stats.length > 2 && (
                      <button type="button" className="btn link sm" onClick={() => setIds((xs) => xs.filter((_, j) => j !== i))} aria-label={`Remove ${s.o.label} from the comparison`}>
                        Remove
                      </button>
                    )}
                  </span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {row('Save before you go', 'Your number', (s) => <Val main={zar(s.p.targetZar, 1000)} sub={gbp(s.p.targetGbp)} />, true)}
            {row('Paperwork and visa', 'Fees, surcharge, certificates', (s) => <Val main={gbp(s.t.groups[0].planGbp)} />)}
            {row('Getting there', 'Flight, let, deposit, basics', (s) => <Val main={gbp(s.t.groups[1].planGbp)} />)}
            {row('Runway', 'Living costs while job hunting', (s) => <Val main={gbp(s.t.groups[2].planGbp)} sub={s.t.groups[2].label.replace('Runway, ', '')} />)}
            {row('Take-home a month', 'After tax and NI', (s) => <Val main={gbp(s.budget.takeHome + s.budget.partnerTakeHome)} />)}
            {row('Outgoings a month', 'Rent, bills, food, transport', (s) => <Val main={gbp(s.budget.outgoings)} />)}
            {row('Left each month', "Once you're paid", (s) => <Val main={`${s.budget.left < 0 ? '−' : ''}${gbp(Math.abs(s.budget.left))}`} tone={s.flag.tone} />, true)}
            {row('Ready at your pace', `${zar(savings.monthlyZar, 100)} a month`, (s) => <Val main={s.p.readyDate ? monthYear(s.p.readyDate) : 'Not yet'} sub={s.o.input.landMode === 'saved' ? `land ${monthYear(s.p.landDate)}` : `landing ${monthYear(s.p.landDate)}`} />)}
            {row('Your quotes added', "Costs you've priced yourself", (s) => <Val main={`${s.t.quotedCount} of ${s.t.itemCount}`} sub={s.t.customCount ? `+ ${s.t.customCount} of your own` : undefined} />)}
          </tbody>
        </table>
      </div>

      {ids.length < MAX && options.some((o) => !ids.includes(o.id)) && (
        <button type="button" className="add-own" onClick={() => setIds((xs) => [...xs, options.find((o) => !xs.includes(o.id))!.id])}>
          + Add a column
        </button>
      )}
      <p className="faint small" style={{ margin: 0 }}>
        All columns use your savings pace and each scenario's own rate, job hunt and salary. Your quotes count in the scenario they belong to.
      </p>
    </div>
  )
}

function Val({ main, sub, tone }: { main: string; sub?: string; tone?: 'ok' | 'warn' | 'danger' }) {
  return (
    <>
      <span className={tone ? `${tone}-text` : ''}>{main}</span>
      {sub && <small>{sub}</small>}
    </>
  )
}
