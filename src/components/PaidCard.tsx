import { Link } from 'react-router-dom'
import { monthlyBudget, salaryFor, takeHomeFor } from '@shared/engine'
import type { ScenarioInput } from '@shared/types'
import type { RuleOverrides } from '@shared/rules'
import { useApp } from '../lib/app'
import { gbp } from '../lib/format'

const HOUSING: Record<string, string> = { room: 'a room in a share', studio: 'a studio', onebed: 'a 1-bed flat' }
const KEEP = 300

/** The salary that leaves `keep` pounds a month, found by bisection on take-home pay. */
export function salaryToKeep(s: ScenarioInput, onDate: string, ov: RuleOverrides | undefined, keep: number): number {
  const b = monthlyBudget(s, onDate, ov)
  const need = b.outgoings + keep - b.partnerTakeHome
  let lo = 0
  let hi = 200000
  for (let i = 0; i < 40; i++) {
    const mid = (lo + hi) / 2
    if (takeHomeFor(s, mid, onDate, ov).monthly < need) lo = mid
    else hi = mid
  }
  return Math.ceil(hi / 500) * 500
}

/** Once you're paid: salary to take-home, each monthly cost with a bar, and what's left. */
export default function PaidCard() {
  const { input, plan, overrides, borrowing, cur } = useApp()
  const budget = monthlyBudget(input, plan.landDate, overrides, borrowing)
  const repay = budget.items.filter((i) => i.key === 'loanRepay' || i.key === 'cardRepay').reduce((a, i) => a + i.gbp, 0)
  const pay = takeHomeFor(input, salaryFor(input), plan.landDate, overrides)
  const income = budget.takeHome + budget.partnerTakeHome
  const max = Math.max(...budget.items.map((i) => i.gbp), 1)
  const thin = budget.left < KEEP
  const room = input.housing !== 'room' ? monthlyBudget({ ...input, housing: 'room' }, plan.landDate, overrides).left : null
  const tone = budget.left < 0 ? 'danger' : budget.left < 150 ? 'warn' : budget.left < KEEP ? 'warn' : 'ok'

  return (
    <section className="card paid" aria-labelledby="paid">
      <div className="card-h">
        <h2 id="paid" className="h2">
          Once you're paid
        </h2>
        <span className="muted small">Always in {cur.name}s</span>
      </div>
      <div className="pay-tiles">
        <div>
          <span>Salary</span>
          <b>{gbp(salaryFor(input))}</b>
        </div>
        <div>
          <span>Income tax</span>
          <b>−{gbp(pay.tax / 12)}</b>
          <small>a month</small>
        </div>
        <div>
          <span>{input.pack ? 'Social charges' : 'National Insurance'}</span>
          <b>−{gbp(pay.ni / 12)}</b>
          <small>a month</small>
        </div>
        <div className="ok">
          <span>Take-home</span>
          <b>{gbp(income)}</b>
          <small>{budget.partnerTakeHome > 0 ? 'household, a month' : 'a month'}</small>
        </div>
      </div>
      <ul className="budget">
        {budget.items.map((i) => (
          <li key={i.key} className={i.key.endsWith('Repay') ? 'repay' : ''}>
            <span>{i.label}</span>
            <span className="bbar" aria-hidden="true">
              <i style={{ width: `${(i.gbp / max) * 100}%` }} />
            </span>
            <b>{gbp(i.gbp)}</b>
          </li>
        ))}
      </ul>
      <div className="left-row">
        <span>{budget.left < 0 ? 'Short each month' : 'Left each month'}</span>
        <b className={`${tone}-text`}>{gbp(Math.abs(budget.left))}</b>
      </div>
      {repay > 0 && budget.left < 100 && (
        <div className="note danger" role="status">
          Your loan and card repayments of {gbp(repay)} a month leave {budget.left < 0 ? `you ${gbp(-budget.left)} short` : `only ${gbp(budget.left)}`} each month. Borrow less, over longer, or <Link to="/settings/loans">change the loan</Link>.
        </div>
      )}
      {thin && repay === 0 && (
        <div className={`note ${budget.left < 0 ? 'danger' : 'warn'}`} role="status">
          {budget.left < 0
            ? `You'd be ${gbp(-budget.left)} short every month in ${HOUSING[input.housing]}.`
            : `${gbp(budget.left)} a month is very thin for ${HOUSING[input.housing]}.`}
          {room !== null && room > budget.left ? ` A room in a share leaves ${gbp(room)}.` : ''} To keep {gbp(KEEP)} a month you'd need a salary of about {gbp(salaryToKeep(input, plan.landDate, overrides, KEEP))}.{' '}
          <Link to="/money">See your number</Link>
        </div>
      )}
    </section>
  )
}
