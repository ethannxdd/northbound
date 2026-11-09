import { useState } from 'react'
import { monthlyBudget, salaryFor, takeHome, upfrontCosts, type GroupId } from '@shared/engine'
import { PageHead } from '../components/Shell'
import SavingPlan from '../components/SavingPlan'
import { useApp } from '../lib/app'
import { gbp, zar } from '../lib/format'
import { Seg, useOpening } from '../lib/ui'

const GROUP_COLOR: Record<GroupId, string> = { paper: 'var(--l-paper)', move: 'var(--l-move)', runway: 'var(--l-money)' }

export default function Money() {
  const { input, plan, overrides, savings, today } = useApp()
  const [cur, setCur] = useState<'ZAR' | 'GBP'>('ZAR')
  useOpening()
  const costs = upfrontCosts(input, plan.landDate, overrides)
  const budget = monthlyBudget(input, plan.landDate, overrides)
  const pay = takeHome(salaryFor(input), plan.landDate, overrides)
  const fmt = (g: number, total = false) => (cur === 'GBP' ? gbp(g, total ? 100 : 1) : zar(g * input.rate, total ? 1000 : 10))
  const income = budget.takeHome + budget.partnerTakeHome

  return (
    <div className="screen-money">
      <PageHead title="Money" sub="What to save before you go, and what a month looks like once you're paid." />
      <div className="money-grid">
      <section className="sec panel" aria-labelledby="before">
        <div className="row" style={{ alignItems: 'center' }}>
          <h2 id="before-h" style={{ margin: 0 }}>Before you go</h2>
          <div style={{ width: 116 }}>
            <Seg label="Currency" value={cur} onChange={setCur} options={[{ value: 'ZAR', label: 'R' }, { value: 'GBP', label: '£' }]} />
          </div>
        </div>
        <div id="before" className="small muted">
          Save before you go
        </div>
        <div className="num">{fmt(costs.total, true)}</div>
        <SavingPlan plan={plan} mode={input.landMode} monthlyZar={savings.monthlyZar} today={today} compact />
        <div className="stack reveal-x" style={{ ['--d' as string]: '200ms' }} aria-hidden="true">
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
      <section className="sec panel" aria-labelledby="paid">
        <h2 id="paid">Once you're paid</h2>
        <p className="small muted" style={{ marginTop: 0 }}>
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
      </div>
    </div>
  )
}
