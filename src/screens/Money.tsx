import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { dayMonthYear, longMonthYear } from '@shared/dates'
import { monthlyBudget, plan as planOf, runwayMonths, runwaySeries, salaryFor, takeHome, upfrontCosts, type GroupId } from '@shared/engine'
import SavingPlan from '../components/SavingPlan'
import { PageHead } from '../components/Shell'
import { useApp, type FxPoint } from '../lib/app'
import { gbp, zar } from '../lib/format'
import { Seg, useOpening } from '../lib/ui'

const GROUP_COLOR: Record<GroupId, string> = { paper: 'var(--l-paper)', move: 'var(--l-move)', runway: 'var(--l-money)' }

export default function Money() {
  const { input, plan, overrides, savings, today, fx, liveRate, active } = useApp()
  const [cur, setCur] = useState<'ZAR' | 'GBP'>('ZAR')
  const [weaker, setWeaker] = useState(0)
  useOpening()
  const costs = upfrontCosts(input, plan.landDate, overrides)
  const budget = monthlyBudget(input, plan.landDate, overrides)
  const pay = takeHome(salaryFor(input), plan.landDate, overrides)
  const fmt = (g: number, total = false) => (cur === 'GBP' ? gbp(g, total ? 100 : 1) : zar(g * input.rate, total ? 1000 : 10))
  const income = budget.takeHome + budget.partnerTakeHome
  const series = useMemo(() => runwaySeries(input, plan.landDate, overrides), [input, plan.landDate, overrides])
  const months = runwayMonths(input)
  const max = Math.max(...series, 1)
  const whatIf = useMemo(() => {
    if (!weaker) return null
    const s = { ...input, rate: input.rate * (1 + weaker / 100) }
    return planOf(s, savings, today, overrides)
  }, [weaker, input, savings, today, overrides])

  const before = (
    <section className="card" aria-labelledby="before">
      <div className="row">
        <h2 id="before" className="h2">
          Before you go
        </h2>
        <div style={{ width: 110 }}>
          <Seg label="Currency" value={cur} onChange={setCur} options={[{ value: 'ZAR', label: 'R' }, { value: 'GBP', label: '£' }]} />
        </div>
      </div>
      <div className="num money-num" style={{ marginTop: 10 }}>
        {fmt(costs.total, true)}
      </div>
      <SavingPlan plan={plan} mode={input.landMode} monthlyZar={savings.monthlyZar} today={today} compact />
      <div className="stack-bar reveal-x" style={{ ['--d' as string]: '200ms' }} aria-hidden="true">
        {costs.groups.map((g) => (
          <i key={g.id} style={{ flex: g.total, background: GROUP_COLOR[g.id] }} />
        ))}
      </div>
      {costs.groups.map((g) => (
        <div className="group" key={g.id}>
          <div className="group-h" style={{ ['--k' as string]: GROUP_COLOR[g.id] }}>
            <span>{g.label}</span>
            <span>{fmt(g.total)}</span>
          </div>
          {g.items.map((i) => (
            <div className="line-item" key={i.label}>
              <span>{i.label}</span>
              <b>{fmt(i.gbp)}</b>
            </div>
          ))}
        </div>
      ))}
    </section>
  )

  const paid = (
    <section className="card" aria-labelledby="paid">
      <h2 id="paid" className="h2">
        Once you're paid
      </h2>
      <p className="muted small" style={{ margin: '4px 0 14px' }}>
        {gbp(salaryFor(input))} a year becomes <b style={{ color: 'var(--text)' }}>{gbp(pay.monthly)}</b> a month after {gbp(pay.tax / 12)} tax and {gbp(pay.ni / 12)} National Insurance.
        {budget.partnerTakeHome > 0 && ` With your partner's pay, the household brings home ${gbp(income)}.`}
      </p>
      {budget.items.map((i) => (
        <div className="spend" key={i.label}>
          <span>{i.label}</span>
          <span>{gbp(i.gbp)}</span>
          <div className="bar">
            <i style={{ width: `${Math.min(100, (i.gbp / income) * 100)}%` }} />
          </div>
        </div>
      ))}
      <div className={`spend left${budget.left < 0 ? ' neg' : ''}`}>
        <span>{budget.left < 0 ? 'Short each month' : 'Left each month'}</span>
        <span>{gbp(Math.abs(budget.left))}</span>
        <div className="bar">
          <i style={{ width: `${Math.min(100, (Math.abs(budget.left) / income) * 100)}%` }} />
        </div>
      </div>
    </section>
  )

  const rateCard = (
    <section className="card" aria-labelledby="fx">
      <h2 id="fx" className="h2">
        Rand to the pound
      </h2>
      {liveRate ? (
        <>
          <div className="row" style={{ alignItems: 'baseline', marginTop: 6 }}>
            <span className="num" style={{ fontSize: 34 }}>
              R{liveRate.toFixed(2)}
            </span>
            <span className="tiny muted">ECB rate, {dayMonthYear(fx[fx.length - 1].date)}</span>
          </div>
          <Spark points={fx} />
          <p className="small muted" style={{ margin: '4px 0 0' }}>
            {input.rateMode === 'live' ? 'Your plan follows this rate, so your number moves with it.' : `Your plan uses a fixed R${input.rate.toFixed(2)}.`}{' '}
            <Link to={`/scenario/${active._id}`}>Change</Link>
          </p>
        </>
      ) : (
        <p className="muted small">The live rate isn't available yet. Your plan uses R{input.rate.toFixed(2)}.</p>
      )}
      <div className="divider" />
      <div className="field" style={{ margin: 0 }}>
        <label htmlFor="weaker">
          What if the rand weakens? <output htmlFor="weaker">{weaker ? `${weaker}%` : 'Not at all'}</output>
        </label>
        <input id="weaker" type="range" min={0} max={30} step={1} value={weaker} onChange={(e) => setWeaker(Number(e.target.value))} />
        <p className="hint" role="status">
          {whatIf
            ? `At R${(input.rate * (1 + weaker / 100)).toFixed(2)} you'd need ${zar(whatIf.targetZar, 1000)}, ${zar(whatIf.targetZar - plan.targetZar, 1000)} more.${input.landMode === 'saved' ? ` You'd land around ${longMonthYear(whatIf.landDate)}.` : ''}`
            : 'Move the slider to see how a weaker rand changes your number.'}
        </p>
      </div>
    </section>
  )

  const runway = (
    <section className="card" aria-labelledby="runway">
      <h2 id="runway" className="h2">
        After you land
      </h2>
      <p className="small muted" style={{ margin: '4px 0 0' }}>
        Your savings fall for {months} month{months === 1 ? '' : 's'} while you find work and wait for your first pay, then grow by {gbp(Math.max(0, budget.left))} a month.
      </p>
      <div className="bars reveal-x" style={{ ['--d' as string]: '250ms' }} role="img" aria-label="Savings by month after landing">
        {series.map((v, i) => (
          <i key={i} className={i === months ? 'low' : i > months ? 'pay' : ''} style={{ height: `${Math.max(i === months ? 8 : 3, (Math.max(0, v) / max) * 100)}%` }} />
        ))}
      </div>
      <div className="bl">
        <span>Land</span>
        <span>Lowest, month {months}</span>
        <span>Paid</span>
      </div>
    </section>
  )

  return (
    <div>
      <PageHead title="Money" sub="What to save before you go, what a month looks like once you're paid, and how the rand changes it." />
      <div className="container cols-2-1 stack wrap" style={{ marginTop: 14 }}>
        <div className="stack" style={{ gap: 16 }}>
          {before}
          {paid}
        </div>
        <div className="sticky-side stack" style={{ gap: 16 }}>
          {rateCard}
          {runway}
        </div>
      </div>
    </div>
  )
}

function Spark({ points }: { points: FxPoint[] }) {
  if (points.length < 2) return null
  const vals = points.map((p) => p.zarPerGbp)
  const lo = Math.min(...vals)
  const hi = Math.max(...vals)
  const span = hi - lo || 1
  const d = points.map((p, i) => `${i ? 'L' : 'M'}${((i / (points.length - 1)) * 300).toFixed(1)} ${(52 - ((p.zarPerGbp - lo) / span) * 46).toFixed(1)}`).join(' ')
  return (
    <svg className="spark" viewBox="0 0 300 56" preserveAspectRatio="none" role="img" aria-label={`Rand per pound over the last ${points.length} trading days, between R${lo.toFixed(2)} and R${hi.toFixed(2)}`}>
      <path d={d} fill="none" stroke="var(--sun)" strokeWidth="2" vectorEffect="non-scaling-stroke" />
    </svg>
  )
}
