import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { KEEP_REFS, hasDetail, type ItemDetail } from '@shared/details'
import { scenarioDocuments } from '@shared/documents'
import { allUpfrontCosts } from '@shared/engine'
import { allTimeline } from '@shared/timeline'
import { useActions, useApp, type Id } from '../lib/app'
import { gbp, zar } from '../lib/format'

/** Claude's detail on one item: what it is, why you need it, how to get it, and what catches people out. */
export function ItemDetailView({ detail, open = false }: { detail: ItemDetail | undefined; open?: boolean }) {
  if (!detail || !hasDetail(detail)) return null
  const facts = [
    detail.forWho && { k: 'For', v: detail.forWho },
    detail.validFor && { k: 'Valid for', v: detail.validFor },
    detail.cost && { k: 'Cost', v: detail.cost },
    detail.takes && { k: 'Takes', v: detail.takes },
  ].filter(Boolean) as { k: string; v: string }[]
  return (
    <details className="idetail" open={open}>
      <summary>
        <span>Full detail</span>
        <span className="tag mine">From Claude</span>
      </summary>
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
        <DList title="How to do it" items={detail.how} ordered />
        <DList title="Have ready" items={detail.bring} />
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
    </details>
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

type Kind = 'cost' | 'step' | 'doc'
const KIND_NAME: Record<Kind, [string, string]> = { cost: ['cost', 'costs'], step: ['step', 'steps'], doc: ['document', 'documents'] }

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
      {kind === 'cost' && (
        <p className="faint small" style={{ margin: '8px 0 0' }}>
          Removed costs don't count towards your number. <Link to="/settings/update">Ask Claude to update this scenario</Link> to check what you really need.
        </p>
      )}
    </details>
  )
}
