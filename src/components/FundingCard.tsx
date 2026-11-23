import { Link } from 'react-router-dom'
import { repayments } from '@shared/engine'
import { useApp } from '../lib/app'
import { gbp, zar } from '../lib/format'

/** How you'll pay for it: your savings plus any loan and card, as a stacked bar and rows. */
export default function FundingCard() {
  const { plan, borrowing, input } = useApp()
  const r = repayments(borrowing)
  const loan = Math.max(0, borrowing.loanZar ?? 0)
  const card = Math.max(0, borrowing.cardZar ?? 0)
  const total = Math.max(plan.targetZar, 1)
  const savings = Math.max(0, plan.targetZar - loan - card)
  const rows = [
    { key: 'savings', label: 'Savings', sub: 'What you put away yourself', zar: savings, color: 'var(--l-money)' },
    { key: 'loan', label: 'Personal loan', sub: loan ? `${zar(r.loanZar, 10)} a month for ${borrowing.loanMonths ?? 60} months at ${borrowing.loanRatePct ?? 0}%` : 'None planned', zar: loan, color: 'var(--baseline)' },
    { key: 'card', label: 'Credit card', sub: card ? `${zar(r.cardZar, 10)} a month at ${borrowing.cardRatePct ?? 0}%` : 'None planned', zar: card, color: 'var(--l-paper)' },
  ]
  return (
    <section className="card" aria-labelledby="fund-h" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      <div className="card-h">
        <h2 id="fund-h" className="h3" style={{ margin: 0 }}>
          How you'll pay for it
        </h2>
        <Link to="/settings/loans" className="small strong">
          {r.borrowedZar ? 'Change borrowing' : 'Add a loan or card'}
        </Link>
      </div>
      <div className="fund-bar" role="img" aria-label={rows.map((x) => `${x.label} ${zar(x.zar, 1000)}`).join(', ')}>
        {rows.map((x) => x.zar > 0 && <span key={x.key} style={{ width: `${(x.zar / total) * 100}%`, background: x.color }} />)}
      </div>
      <ul className="fund-rows">
        {rows.map((x) => (
          <li key={x.key}>
            <span className="fr-l">
              <span className="fr-k">
                <i style={{ background: x.color }} aria-hidden="true" />
                {x.label}
              </span>
              <small>{x.sub}</small>
            </span>
            <b>{zar(x.zar, 100)}</b>
          </li>
        ))}
      </ul>
      {r.totalZar > 0 && (
        <p className="note">
          Repayments of {zar(r.totalZar, 10)} a month ({gbp(r.totalZar / input.rate)}) come out of UK pay. <Link to="/life">Check them against Life</Link> before you rely on borrowing.
        </p>
      )}
    </section>
  )
}
