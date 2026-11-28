import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { KEEP_REFS, detailFor, hasDetail, type ItemDetail } from '@shared/details'
import { scenarioDocuments } from '@shared/documents'
import { allMonthlyItems, allUpfrontCosts, cityOf, rentOf } from '@shared/engine'
import { allTimeline } from '@shared/timeline'
import { useActions, useApp, type Id } from '../lib/app'
import { gbp, zar } from '../lib/format'

/** Claude's detail on one item: what it is, why you need it, how to get it, and what catches people out. */
export function ItemDetailView({ detail, open = false }: { detail: ItemDetail | undefined; open?: boolean }) {
  if (!detail || !hasDetail(detail)) return null
  return (
    <details className="idetail" open={open}>
      <summary>
        <span>Full detail</span>
        <span className="tag mine">From Claude</span>
      </summary>
      <DetailBody detail={detail} />
    </details>
  )
}

const CONFIDENCE: Record<NonNullable<ItemDetail['confidence']>, string> = { official: 'Official fee', quoted: 'A real quote', estimate: 'An estimate' }

/** Every field of Claude's detail, in the order you'd want to read it. */
export function DetailBody({ detail, rate }: { detail: ItemDetail; rate?: number }) {
  const { input } = useApp()
  const r = rate ?? input.rate
  const money = (n: number, c: 'ZAR' | 'local') => (c === 'ZAR' ? zar(n) : gbp(n))
  const other = (n: number, c: 'ZAR' | 'local') => (c === 'ZAR' ? gbp(n / r) : zar(n * r))
  const facts = [
    detail.confidence && { k: 'How sure', v: CONFIDENCE[detail.confidence] },
    detail.range && { k: 'Expect to pay', v: `${money(detail.range.low, detail.range.currency)} to ${money(detail.range.high, detail.range.currency)}` },
    detail.cost && { k: 'Cost', v: detail.cost },
    detail.whenToPay && { k: 'When', v: detail.whenToPay },
    detail.payTo && { k: 'Pay to', v: detail.payTo },
    detail.refundable && { k: 'Refundable', v: detail.refundable },
    detail.takes && { k: 'Takes', v: detail.takes },
    detail.validFor && { k: 'Valid for', v: detail.validFor },
    detail.forWho && { k: 'For', v: detail.forWho },
  ].filter(Boolean) as { k: string; v: string }[]
  const bTotal = detail.breakdown?.reduce((a, b) => a + (b.currency === 'ZAR' ? b.amount / r : b.amount), 0) ?? 0
  return (
    <div className="idetail-body">
        {detail.summary && <p>{detail.summary}</p>}
        {detail.why && (
          <p>
            <b>Why you need it:</b> {detail.why}
          </p>
        )}
        {facts.length > 0 && (
          <dl className="idetail-facts">
            {facts.map((f) => (
              <div key={f.k}>
                <dt>{f.k}</dt>
                <dd>{f.v}</dd>
              </div>
            ))}
          </dl>
        )}
        {detail.breakdown?.length ? (
          <div>
            <h4>What it's made of</h4>
            <table className="breakdown">
              <tbody>
                {detail.breakdown.map((b, i) => (
                  <tr key={`${b.label}-${i}`}>
                    <th scope="row">
                      {b.label}
                      {b.note && <small>{b.note}</small>}
                    </th>
                    <td>
                      <b>{money(b.amount, b.currency)}</b>
                      <small>{other(b.amount, b.currency)}</small>
                    </td>
                  </tr>
                ))}
              </tbody>
              {detail.breakdown.length > 1 && (
                <tfoot>
                  <tr>
                    <th scope="row">Total</th>
                    <td>
                      <b>{gbp(bTotal)}</b>
                      <small>{zar(bTotal * r)}</small>
                    </td>
                  </tr>
                </tfoot>
              )}
            </table>
          </div>
        ) : null}
        <DList title="Do these first" items={detail.dependsOn} />
        <DList title="How to do it" items={detail.how} ordered />
        <DList title="Have ready" items={detail.bring} />
        <DList title="Ways to pay less" items={detail.saveMoney} />
        <DList title="Alternatives" items={detail.alternatives} />
        {detail.ifSkipped && (
          <div className="idetail-warn">
            <h4>If you skip it or get it wrong</h4>
            <p style={{ margin: 0 }}>{detail.ifSkipped}</p>
          </div>
        )}
        <DList title="Watch out for" items={detail.watchOut} warn />
        <DList title="Tips" items={detail.tips} />
        {detail.sources?.length ? (
          <p className="small muted" style={{ margin: 0 }}>
            Sources:{' '}
            {detail.sources.map((s, i) => (
              <span key={s.url}>
                {i > 0 && ' · '}
                <a href={s.url} target="_blank" rel="noreferrer noopener">
                  {s.label}
                </a>
                {s.checked ? ` (${s.checked})` : ''}
              </span>
            ))}
          </p>
        ) : null}
    </div>
  )
}

function DList({ title, items, ordered, warn }: { title: string; items?: string[]; ordered?: boolean; warn?: boolean }) {
  if (!items?.length) return null
  const List = ordered ? 'ol' : 'ul'
  return (
    <div className={warn ? 'idetail-warn' : undefined}>
      <h4>{title}</h4>
      <List>
        {items.map((x) => (
          <li key={x}>{x}</li>
        ))}
      </List>
    </div>
  )
}

/** Takes an item off this scenario. It can be put back from the "Removed" list. */
export function RemoveButton({ refKey, label, onRemoved }: { refKey: string; label: string; onRemoved?: () => void }) {
  const { active } = useApp()
  const { setHidden } = useActions()
  const [busy, setBusy] = useState(false)
  if (KEEP_REFS.has(refKey)) return null
  return (
    <button
      type="button"
      className="btn quiet sm danger"
      disabled={busy}
      aria-label={`Remove ${label} from this scenario`}
      onClick={async () => {
        setBusy(true)
        try {
          await setHidden({ scenarioId: active._id as Id<'scenarios'>, ref: refKey, hidden: true })
          onRemoved?.()
        } finally {
          setBusy(false)
        }
      }}
    >
      Remove from scenario
    </button>
  )
}

type Kind = 'cost' | 'step' | 'doc' | 'month' | 'area'
const KIND_NAME: Record<Kind, [string, string]> = { cost: ['cost', 'costs'], step: ['step', 'steps'], doc: ['document', 'documents'], month: ['monthly cost', 'monthly costs'], area: ['neighbourhood', 'neighbourhoods'] }

/** The items of one kind you removed from the main scenario, each with Put back. Shows nothing when there are none. */
export function RemovedList({ kind }: { kind: Kind }) {
  const { active, input, plan, today, overrides } = useApp()
  const { setHidden } = useActions()
  const hidden = useMemo(() => (active.hidden ?? []).filter((r) => r.startsWith(`${kind}:`)), [active.hidden, kind])
  const items = useMemo(() => {
    if (!hidden.length) return []
    const all: { ref: string; label: string; sub?: string }[] =
      kind === 'cost'
        ? allUpfrontCosts(input, plan.landDate, overrides).groups.flatMap((g) => g.items.map((i) => ({ ref: `cost:${i.key}`, label: i.label, sub: `${gbp(i.gbp)} · ${zar(i.gbp * input.rate, 10)}` })))
        : kind === 'step'
          ? allTimeline(input, plan.landDate, today, overrides).map((t) => ({ ref: `step:${t.key}`, label: t.title }))
          : kind === 'month'
            ? allMonthlyItems(input).map((i) => ({ ref: `month:${i.key}`, label: i.label, sub: `${gbp(i.gbp)} a month · ${zar(i.gbp * input.rate, 10)}` }))
            : kind === 'area'
              ? cityOf(input).areas.map((a) => ({ ref: `area:${a.id}`, label: a.name, sub: `${gbp(rentOf(input, a.id))} a month` }))
              : scenarioDocuments(input, (n) => String(n)).map((d) => ({ ref: d.ref, label: d.name, sub: `From ${d.from}` }))
    return hidden.map((r) => all.find((x) => x.ref === r) ?? { ref: r, label: r.slice(r.indexOf(':') + 1), sub: 'No longer in this plan' })
  }, [hidden, kind, input, plan.landDate, today, overrides])
  if (!items.length) return null
  const [one, many] = KIND_NAME[kind]
  return (
    <details className="removed-list">
      <summary>
        {items.length} {items.length === 1 ? one : many} removed from {active.name}
      </summary>
      <ul className="qs-list">
        {items.map((x) => (
          <li key={x.ref}>
            <span className="qh-main">
              <b>{x.label}</b>
              {x.sub && <small>{x.sub}</small>}
            </span>
            <button type="button" className="btn quiet sm" onClick={() => void setHidden({ scenarioId: active._id as Id<'scenarios'>, ref: x.ref, hidden: false })}>
              Put back
            </button>
          </li>
        ))}
      </ul>
      {(kind === 'cost' || kind === 'month') && (

        <p className="faint small" style={{ margin: '8px 0 0' }}>
          {kind === 'cost' ? "Removed costs don't count towards your number." : "Removed monthly costs don't count in a month there, or in your runway."} <Link to="/scenarios/update">Ask Claude to update this scenario</Link> to check what you really need.
        </p>
      )}
    </details>
  )
}

/**
 * A Details button for any item in a scenario. Open, it shows how the figure is worked out, Claude's
 * detail if there is any, and Remove from scenario (when the item can be removed).
 */
export function DetailToggle({ refKey, label, basis, removable = true, removeNote, children }: { refKey: string; label: string; basis?: string; removable?: boolean; removeNote?: string; children?: React.ReactNode }) {
  const { input } = useApp()
  const [open, setOpen] = useState(false)
  const detail = detailFor(input.details, refKey)
  const id = `dt-${refKey.replace(/[^a-z0-9]/gi, '-')}`
  return (
    <div className="dtoggle">
      <button type="button" className="dt-btn" aria-expanded={open} aria-controls={id} onClick={() => setOpen(!open)}>
        Details{hasDetail(detail) ? <span className="dt-dot" aria-label=", from Claude" /> : null}
      </button>
      {open && (
        <div id={id} className="dt-panel">
          {basis && (
            <p className="small" style={{ margin: 0 }}>
              <b>How it's worked out:</b> {basis}.
            </p>
          )}
          {children}
          {hasDetail(detail) ? (
            <ItemDetailView detail={detail} open />
          ) : (
            <p className="faint small" style={{ margin: 0 }}>
              No detail from Claude yet. <Link to="/scenarios/update">Update Plan/Scenario</Link> to get it.
            </p>
          )}
          {removable ? (
            <div className="why-foot">
              <span className="faint small">Not needed for this scenario?</span>
              <RemoveButton refKey={refKey} label={label} onRemoved={() => setOpen(false)} />
            </div>
          ) : removeNote ? (
            <p className="faint small" style={{ margin: 0 }}>{removeNote}</p>
          ) : null}
        </div>
      )}
    </div>
  )
}
