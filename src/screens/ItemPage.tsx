import { useMemo } from 'react'
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom'
import { detailFor, hasDetail } from '@shared/details'
import { monthlyBudget, sortQuotes, type PlanLine } from '@shared/engine'
import { DetailBody, RemoveButton } from '../components/DetailBits'
import { DiffChip } from '../components/CostBits'
import QuoteSheet, { History } from '../components/QuoteSheet'
import { BackLink } from '../components/Shell'
import { useActions, useApp } from '../lib/app'
import { gbp, zar } from '../lib/format'
import { WhyBasis } from './Money'

const GROUP_NAME: Record<string, string> = { paper: 'Paperwork and visa', move: 'Getting there', runway: 'Runway' }

/**
 * Everything about one line of the plan on one page: the figure in both currencies, how it's worked out,
 * Claude's full research, your quotes, and the way to remove it. /money/item/:key for a cost before you go,
 * /life/item/:key for a monthly cost there.
 */
export default function ItemPage({ kind }: { kind: 'cost' | 'month' }) {
  const { key = '' } = useParams()
  const { totals, input, plan, overrides, borrowing, quotes, active } = useApp()
  const { removeQuote } = useActions()
  const navigate = useNavigate()
  const { pathname } = useLocation()
  const r = input.rate

  const costLines = useMemo(() => totals.groups.flatMap((g) => g.lines.map((l) => ({ ...l, group: g.id }))), [totals])
  const monthItems = useMemo(() => monthlyBudget(input, plan.landDate, overrides, borrowing).items.filter((i) => !i.key.endsWith('Repay')), [input, plan.landDate, overrides, borrowing])
  const list = kind === 'cost' ? costLines.map((l) => ({ key: l.key, label: l.label })) : monthItems.map((i) => ({ key: i.key, label: i.label }))
  const at = list.findIndex((x) => x.key === key)
  const prev = at > 0 ? list[at - 1] : null
  const next = at >= 0 && at < list.length - 1 ? list[at + 1] : null
  const base = kind === 'cost' ? '/money' : '/life'
  const back = <BackLink to={base} label={kind === 'cost' ? 'All costs' : 'A month there'} />

  const line = kind === 'cost' ? costLines.find((l) => l.key === key) : undefined
  const month = kind === 'month' ? monthItems.find((i) => i.key === key) : undefined
  if (!line && !month)
    return (
      <div className="main item-page">
        {back}
        <h1 className="h1">Not in this scenario</h1>
        <p className="muted">This item isn't in {active.name}. It may have been removed, or it belongs to another scenario.</p>
      </div>
    )

  const ref = `${kind}:${key}`
  const detail = detailFor(input.details, ref)
  const label = line?.label ?? month!.label
  const figure = line ? line.planGbp : month!.gbp
  const history = line ? sortQuotes(quotes.filter((q) => q.itemKey === key)) : []

  return (
    <div className="main item-page">
      <div className="item-nav">
        {back}
        <span className="item-steps">
          {prev && (
            <Link to={`${base}/item/${prev.key}`} className="btn quiet sm" aria-label={`Previous: ${prev.label}`}>
              ‹ Previous
            </Link>
          )}
          <span className="faint small">
            {at + 1} of {list.length}
          </span>
          {next && (
            <Link to={`${base}/item/${next.key}`} className="btn quiet sm" aria-label={`Next: ${next.label}`}>
              Next ›
            </Link>
          )}
        </span>
      </div>

      <header className="item-head card">
        <span className="muted small strong">{line ? (line.custom ? 'Your own cost' : GROUP_NAME[line.group]) : 'A month there'} · {active.name}</span>
        <h1 className="h1">{label}</h1>
        <div className="item-figs">
          <div>
            <span className="lbl">{line ? 'The plan uses' : 'Each month'}</span>
            <b className="num">{gbp(figure)}</b>
            <small>{zar(figure * r)}</small>
          </div>
          {line && line.baselineGbp !== null && (
            <div>
              <span className="lbl">
                <span className="key-base" aria-hidden="true" /> Baseline
              </span>
              <b>{gbp(line.baselineGbp)}</b>
              <small>{zar(line.baselineGbp * r)}</small>
            </div>
          )}
          {line && (
            <div>
              <span className="lbl">
                <span className="key-mine" aria-hidden="true" /> My quote
              </span>
              <b className={line.mineGbp !== null ? 'mine-text' : 'faint'}>{line.mineGbp !== null ? gbp(line.mineGbp) : 'None yet'}</b>
              {line.mineGbp !== null ? <DiffChip baselineGbp={line.baselineGbp} mineGbp={line.mineGbp} /> : <small>Add one when you find a real price</small>}
            </div>
          )}
        </div>
        <div className="btns" style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {line && (
            <Link to={`/money/item/${line.key}/quote`} className="btn primary">
              {line.mineGbp !== null ? 'Change my quote' : '+ Add my quote'}
            </Link>
          )}
          {!detail || !hasDetail(detail) ? (
            <Link to="/scenarios/update" className="btn quiet">
              Get full detail from Claude
            </Link>
          ) : null}
        </div>
      </header>

      <section className="card" aria-labelledby="how-h">
        <h2 id="how-h" className="h2">
          Where the figure comes from
        </h2>
        {line ? (
          line.custom ? (
            <p className="muted" style={{ margin: 0 }}>Added by you. It counts at your quote.</p>
          ) : (
            <WhyBasis line={line as PlanLine} landDate={plan.landDate} />
          )
        ) : (
          <p style={{ margin: 0 }}>{month!.basis ?? 'From Northbound\'s city figures'}.</p>
        )}
      </section>

      <section className="card" aria-labelledby="all-h">
        <div className="card-h">
          <h2 id="all-h" className="h2">
            Everything to know
          </h2>
          {hasDetail(detail) && <span className="tag mine">From Claude</span>}
        </div>
        {detail && hasDetail(detail) ? (
          <DetailBody detail={detail} />
        ) : (
          <p className="muted" style={{ margin: 0 }}>
            No research for this item yet. <Link to="/scenarios/update">Update this scenario with Claude</Link> and every line gets what it is, why you need it, a breakdown of the cost, when and who to pay, how to do it, ways to pay less, and what catches people out.
          </p>
        )}
      </section>

      {line && history.length > 0 && (
        <section className="card">
          <History history={history} rate={r} onEdit={() => navigate(`/money/item/${line.key}/quote`)} onDelete={(id) => void removeQuote({ id })} />
        </section>
      )}

      {!line?.custom && (
        <div className="why-foot">
          <span className="faint small">Not needed for this scenario?</span>
          <RemoveButton refKey={ref} label={label} onRemoved={() => navigate(base)} />
        </div>
      )}
      {line && <QuoteSheet open={pathname.endsWith('/quote')} itemKey={line.key} onClose={() => navigate(`/money/item/${line.key}`, { replace: true })} />}
    </div>
  )
}
