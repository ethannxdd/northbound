import { useState } from 'react'
import { dayMonthYear } from '@shared/dates'
import { DOCUMENTS, STATUS_LABEL, STATUS_ORDER, atLeast, type DocDef, type DocStatus } from '@shared/documents'
import { PageHead } from '../components/Shell'
import { useActions, useApp } from '../lib/app'
import { Seg, useOpening } from '../lib/ui'

/** Paperwork tracker: every document for the Ancestry visa, from ordering to checked. */
export default function Paperwork() {
  const { docs } = useApp()
  useOpening()
  const required = DOCUMENTS.filter((d) => !d.optional)
  const inHand = required.filter((d) => atLeast(docs[d.key]?.status as DocStatus | undefined, 'arrived')).length

  return (
    <div>
      <PageHead title="Paperwork" sub={`${inHand} of ${required.length} documents in hand. Each one ticks off its step on the map as it moves along.`} />
      <div className="container wrap" style={{ marginTop: 10 }}>
        <div className="track" style={{ maxWidth: 560, marginBottom: 18 }} aria-hidden="true">
          <i style={{ width: `${(inHand / required.length) * 100}%` }} />
        </div>
        <div className="cols-2 stack" style={{ gap: 12 }}>
          {DOCUMENTS.map((d) => (
            <DocCard key={d.key} d={d} />
          ))}
        </div>
      </div>
    </div>
  )
}

function DocCard({ d }: { d: DocDef }) {
  const { docs, today } = useApp()
  const { setDoc } = useActions()
  const row = docs[d.key]
  const status = (row?.status ?? 'todo') as DocStatus
  const [note, setNote] = useState(row?.note ?? '')

  async function setStatus(next: DocStatus) {
    await setDoc({
      docKey: d.key,
      status: next,
      orderedOn: next === 'todo' ? null : atLeast(next, 'ordered') && !row?.orderedOn ? today : undefined,
      arrivedOn: !atLeast(next, 'arrived') ? null : !row?.arrivedOn ? today : undefined,
    })
  }

  return (
    <article className="doc" aria-label={d.name}>
      <div className="doc-top">
        <div>
          <b>{d.name}</b>
          <small>
            {d.from}
            {d.optional ? `. ${d.optional}` : ''}
          </small>
        </div>
        <span className={`status-chip ${status}`}>{STATUS_LABEL[status]}</span>
      </div>
      <Seg<DocStatus> label={`${d.name} status`} value={status} onChange={(v) => void setStatus(v)} options={STATUS_ORDER.map((s) => ({ value: s, label: STATUS_LABEL[s] }))} />
      {status !== 'todo' && (
        <div className="dates">
          <label>
            Ordered
            <input
              className="input"
              type="date"
              value={row?.orderedOn ?? ''}
              max={today}
              onChange={(e) => void setDoc({ docKey: d.key, status, orderedOn: e.target.value || null })}
            />
          </label>
          {atLeast(status, 'arrived') && (
            <label>
              Arrived
              <input
                className="input"
                type="date"
                value={row?.arrivedOn ?? ''}
                max={today}
                onChange={(e) => void setDoc({ docKey: d.key, status, arrivedOn: e.target.value || null })}
              />
            </label>
          )}
        </div>
      )}
      <p className="tiny muted" style={{ margin: '10px 0 0' }}>
        {status === 'checked' ? `Checked: ${d.check}.` : `When it arrives, check: ${d.check}.`}
        {row?.orderedOn && status === 'ordered' ? ` Ordered ${dayMonthYear(row.orderedOn)}.` : ''}
      </p>
      <input
        className="input"
        style={{ marginTop: 10, fontSize: 14, padding: '9px 12px' }}
        placeholder="Add a note, like a reference number"
        aria-label={`Note for ${d.name}`}
        value={note}
        onChange={(e) => setNote(e.target.value)}
        onBlur={() => note !== (row?.note ?? '') && void setDoc({ docKey: d.key, status, note })}
      />
    </article>
  )
}
