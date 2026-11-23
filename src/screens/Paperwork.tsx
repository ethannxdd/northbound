import { useState } from 'react'
import { dayMonthYear } from '@shared/dates'
import { DOCUMENTS, STATUS_LABEL, STATUS_ORDER, atLeast, type DocDef, type DocStatus } from '@shared/documents'
import { rule } from '@shared/rules'
import type { Task } from '@shared/timeline'
import { shortTitle, useTimeline } from '../components/TransitMap'
import { useActions, useApp } from '../lib/app'
import { gbp, plural, zar } from '../lib/format'
import { CITIES } from '@shared/cities'

type Filter = 'all' | 'todo' | 'ordered' | 'hand'

/** Paperwork tracker: every document for the Ancestry visa, from ordering to checked. */
export default function Paperwork() {
  const { docs, totals, input, plan, overrides } = useApp()
  const tasks = useTimeline()
  const [filter, setFilter] = useState<Filter>('all')
  const statusOf = (d: DocDef) => (docs[d.key]?.status ?? 'todo') as DocStatus
  const required = DOCUMENTS.filter((d) => !d.optional)
  const inHand = required.filter((d) => atLeast(statusOf(d), 'arrived')).length
  const line = (k: string) => totals.groups.flatMap((g) => g.lines).find((l) => l.key === k)?.planGbp ?? 0
  const totalGbp = line('saCerts') + line('groCert') + line('tbTest') + rule('groCertificate', plan.landDate, overrides)
  const counts = {
    all: DOCUMENTS.length,
    todo: DOCUMENTS.filter((d) => statusOf(d) === 'todo').length,
    ordered: DOCUMENTS.filter((d) => statusOf(d) === 'ordered').length,
    hand: DOCUMENTS.filter((d) => atLeast(statusOf(d), 'arrived')).length,
  }
  const keep = (d: DocDef) => {
    const s = statusOf(d)
    return filter === 'all' || (filter === 'todo' ? s === 'todo' : filter === 'ordered' ? s === 'ordered' : atLeast(s, 'arrived'))
  }

  return (
    <div className="main">
      <div className="page-title-row">
        <div className="stack" style={{ gap: 6 }}>
          <h1 className="h1">Paperwork</h1>
          <p className="muted" style={{ margin: 0 }}>
            {inHand} of {required.length} required documents in hand · each one ticks off its stop on the map as it moves along
          </p>
        </div>
        <div className="head-tiles">
          <div>
            <span>Total cost</span>
            <b>{zar(totalGbp * input.rate, 10)}</b>
            <small>{gbp(totalGbp)}</small>
          </div>
          <div>
            <span>Slowest item</span>
            <b>{plural(input.certLeadMonths, 'month')}</b>
            <small>Unabridged certificates</small>
          </div>
        </div>
      </div>

      <div className="pills" role="group" aria-label="Show documents" style={{ alignSelf: 'flex-start' }}>
        {(
          [
            ['all', `All ${counts.all}`],
            ['todo', `To do · ${counts.todo}`],
            ['ordered', `Ordered · ${counts.ordered}`],
            ['hand', `In hand · ${counts.hand}`],
          ] as [Filter, string][]
        ).map(([id, label]) => (
          <button key={id} type="button" aria-pressed={filter === id} onClick={() => setFilter(id)}>
            {label}
          </button>
        ))}
      </div>

      <div className="doc-grid">
        {DOCUMENTS.filter(keep).map((d) => (
          <DocCard key={d.key} d={d} task={tasks.find((t) => t.key === d.task?.key)} city={CITIES[input.city].name} />
        ))}
      </div>
    </div>
  )
}

function DocCard({ d, task, city }: { d: DocDef; task?: Task; city: string }) {
  const { docs, today } = useApp()
  const { setDoc } = useActions()
  const row = docs[d.key]
  const status = (row?.status ?? 'todo') as DocStatus
  const [note, setNote] = useState(row?.note ?? '')
  const badge = atLeast(status, 'arrived') ? { t: 'In hand', c: 'ok' } : status === 'ordered' ? { t: 'Ordered', c: 'mine' } : task && task.due <= today ? { t: 'Order now', c: 'danger' } : { t: 'To do', c: '' }

  async function setStatus(next: DocStatus) {
    await setDoc({
      docKey: d.key,
      status: next,
      orderedOn: next === 'todo' ? null : atLeast(next, 'ordered') && !row?.orderedOn ? today : undefined,
      arrivedOn: !atLeast(next, 'arrived') ? null : !row?.arrivedOn ? today : undefined,
    })
  }

  return (
    <article className="doc" aria-labelledby={`doc-${d.key}`}>
      <div className="doc-top">
        <div className="stack" style={{ gap: 4, minWidth: 0 }}>
          <h2 id={`doc-${d.key}`} className="h3" style={{ margin: 0 }}>
            {d.name}
          </h2>
          <small className="muted">
            From {d.from} · {d.optional ?? 'Required'}
          </small>
        </div>
        <span className={`tag ${badge.c}`}>{badge.t}</span>
      </div>
      <div className="facts3" style={{ margin: 0 }}>
        <div>
          <small>Cost</small>
          <b>{task?.cost ?? 'Free'}</b>
        </div>
        <div>
          <small>Takes</small>
          <b>{task?.takes ?? 'Varies'}</b>
        </div>
        <div>
          <small>Map stop</small>
          <b>{task ? shortTitle(task, city) : 'None'}</b>
        </div>
      </div>
      <div className="check-line">
        <svg aria-hidden="true" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M20 6L9 17l-5-5" />
        </svg>
        <span>Check: {d.check}</span>
      </div>
      <div className="seg" role="group" aria-label={`${d.name} status`}>
        {STATUS_ORDER.map((s) => (
          <button key={s} type="button" aria-pressed={status === s} onClick={() => void setStatus(s)}>
            {STATUS_LABEL[s]}
          </button>
        ))}
      </div>
      {status !== 'todo' && (
        <div className="dates">
          <label>
            Ordered
            <input className="input" type="date" value={row?.orderedOn ?? ''} max={today} onChange={(e) => void setDoc({ docKey: d.key, status, orderedOn: e.target.value || null })} />
          </label>
          {atLeast(status, 'arrived') && (
            <label>
              Arrived
              <input className="input" type="date" value={row?.arrivedOn ?? ''} max={today} onChange={(e) => void setDoc({ docKey: d.key, status, arrivedOn: e.target.value || null })} />
            </label>
          )}
        </div>
      )}
      {row?.orderedOn && status === 'ordered' && <small className="faint">Ordered {dayMonthYear(row.orderedOn)}</small>}
      <input
        className="input"
        style={{ height: 42, fontSize: 14 }}
        placeholder="Add a note, like a reference number"
        aria-label={`Note for ${d.name}`}
        value={note}
        onChange={(e) => setNote(e.target.value)}
        onBlur={() => note !== (row?.note ?? '') && void setDoc({ docKey: d.key, status, note })}
      />
    </article>
  )
}
