import { monthlyBudget, salaryFor, takeHome } from '@shared/engine'
import { useApp } from '../lib/app'
import { gbp } from '../lib/format'

/** Once you're paid: salary to take-home, each monthly cost with a bar, and what's left. */
export default function PaidCard() {
  const { input, plan, overrides } = useApp()
  const budget = monthlyBudget(input, plan.landDate, overrides)
  const pay = takeHome(salaryFor(input), plan.landDate, overrides)
  const income = budget.takeHome + budget.partnerTakeHome
  return (
    <section className="card" aria-labelledby="paid">
      <h2 id="paid" className="h2">
        Once you're paid
      </h2>
      <p className="muted small" style={{ margin: '4px 0 14px' }}>
        {gbp(salaryFor(input))} a year becomes <b style={{ color: 'var(--text)' }}>{gbp(pay.monthly)}</b> a month after {gbp(pay.tax / 12)} tax and {gbp(pay.ni / 12)} National Insurance.
        {budget.partnerTakeHome > 0 && ` With your partner's pay, the household brings home ${gbp(income)}.`}
      </p>
      {budget.items.map((i) => (
        <div className="spend" key={i.key}>
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
}
