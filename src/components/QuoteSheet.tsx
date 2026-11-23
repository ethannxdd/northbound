import { useEffect, useMemo, useState, type FormEvent } from 'react'
import { dayMonthYear } from '@shared/dates'
import { quoteGbp, sortQuotes, type GroupId } from '@shared/engine'
import { useActions, useApp, type Id, type QuoteDoc } from '../lib/app'
import { gbp, zar } from '../lib/format'
import { Sheet } from '../lib/ui'
import { DiffChip } from './CostBits'

const NEW = '__new'
const GROUP_SHORT: Record<GroupId, string> = { paper: 'Paperwork', move: 'Getting there', runway: 'Runway' }

/**
 * Add my quote: pick a cost (or add your own), the amount in £ or R, where and when you found it.
 * Older quotes stay as history under the form, and can be deleted there.
 */
export default function QuoteSheet({ open, itemKey, onClose }: { open: boolean; itemKey?: string; onClose: () => void }) {
  return (
    <Sheet open={open} onClose={onClose} label="Add my quote">
      {open && <QuoteForm key={itemKey ?? ''} initial={itemKey} onClose={onClose} />}
    </Sheet>
  )
}

function QuoteForm({ initial, onClose }: { initial?: string; onClose: () => void }) {
  const { totals, quotes, input, today, active } = useApp()
  const { addQuote, removeQuote, removeCustom } = useActions()
  const lines = useMemo(() => totals.groups.flatMap((g) => g.lines.map((l) => ({ ...l, group: g.id }))), [totals])
  const startKey = initial === 'new' ? NEW : initial && lines.some((l) => l.key === initial) ? initial : (lines.find((l) => l.mineGbp === null && !l.custom)?.key ?? lines[0]?.key ?? NEW)
  const [item, setItem] = useState(startKey)
  const [label, setLabel] = useState('')
  const [group, setGroup] = useState<GroupId>('move')
  const [currency, setCurrency] = useState<'GBP' | 'ZAR'>('GBP')
  const [amountText, setAmountText] = useState('')
  const [sourceUrl, setSourceUrl] = useState('')
  const [foundOn, setFoundOn] = useState(today)
  const [note, setNote] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const line = lines.find((l) => l.key === item) ?? null
  const amount = Number(amountText.replace(/[^\d.]/g, ''))
  const hasAmount = amountText.trim() !== '' && Number.isFinite(amount)
  const amountGbp = hasAmount ? quoteGbp({ amount, currency }, input.rate) : null
  const history = useMemo(() => sortQuotes(quotes.filter((q) => q.itemKey === item)), [quotes, item])

  useEffect(() => setError(null), [item, amountText])

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    if (!hasAmount) return setError('Enter the amount you found.')
    if (item === NEW && !label.trim()) return setError('Give your cost a name.')
    setBusy(true)
    try {
      const key = await addQuote({
        scenarioId: active._id,
        itemKey: item === NEW ? undefined : item,
        newCost: item === NEW ? { label: label.trim(), group } : undefined,
        amount,
        currency,
        sourceUrl: sourceUrl.trim() || undefined,
        foundOn,
        note: note.trim() || undefined,
      })
      setAmountText('')
      setSourceUrl('')
      setNote('')
      if (item === NEW) {
        setItem(key)
        setLabel('')
      }
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message.replace(/^.*Uncaught Error: /, '').split('\n')[0] : 'Could not save. Try again.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <form className="quote-form" onSubmit={submit} aria-labelledby="quote-title">
      <h2 id="quote-title" className="h2">
        Add my quote
      </h2>

      <div className="field">
        <label htmlFor="q-item">Cost item</label>
        <select id="q-item" className="input strong" value={item} onChange={(e) => setItem(e.target.value)}>
          {totals.groups.map((g) => (
            <optgroup key={g.id} label={g.label}>
              {g.lines.map((l) => (
                <option key={l.key} value={l.key}>
                  {GROUP_SHORT[g.id]} · {l.label}
                  {l.custom ? ' (mine)' : ''}
                </option>
              ))}
            </optgroup>
          ))}
          <option value={NEW}>+ My own cost (not in the baseline)</option>
        </select>
      </div>

      {item === NEW && (
        <div className="two-col">
          <div className="field">
            <label htmlFor="q-label">Name</label>
            <input id="q-label" className="input" value={label} maxLength={120} onChange={(e) => setLabel(e.target.value)} placeholder="e.g. Extra checked bag" />
          </div>
          <div className="field">
            <label htmlFor="q-group">Group</label>
            <select id="q-group" className="input" value={group} onChange={(e) => setGroup(e.target.value as GroupId)}>
              <option value="paper">Paperwork and visa</option>
              <option value="move">Getting there</option>
              <option value="runway">Runway</option>
            </select>
          </div>
        </div>
      )}

      <div className="amount-box">
        <div className="amount-top">
          <label htmlFor="q-amt">Amount I found</label>
          <div className="seg mini" role="group" aria-label="Currency">
            <button type="button" aria-pressed={currency === 'GBP'} onClick={() => setCurrency('GBP')}>
              £ GBP
            </button>
            <button type="button" aria-pressed={currency === 'ZAR'} onClick={() => setCurrency('ZAR')}>
              R ZAR
            </button>
          </div>
        </div>
        <div className="amount-in">
          <span aria-hidden="true">{currency === 'GBP' ? '£' : 'R'}</span>
          <input id="q-amt" type="text" inputMode="decimal" autoComplete="off" value={amountText} onChange={(e) => setAmountText(e.target.value)} placeholder="0" />
        </div>
        <span className="muted small" aria-live="polite">
          {hasAmount ? (currency === 'GBP' ? `≈ ${zar(amount * input.rate)}` : `≈ ${gbp(amount / input.rate)}`) : 'Type the price you found'} at £1 = R{input.rate.toFixed(2)}
        </span>
        <div className="amount-cmp">
          {line && line.baselineGbp !== null ? (
            <span className="key-line">
              <span className="key-base" aria-hidden="true" />
              Baseline {gbp(line.baselineGbp)}
            </span>
          ) : (
            <span className="key-line">No baseline: this is your own cost</span>
          )}
          {amountGbp !== null && <DiffChip baselineGbp={line ? line.baselineGbp : null} mineGbp={amountGbp} />}
        </div>
      </div>

      <div className="two-col">
        <div className="field">
          <label htmlFor="q-src">Where I found it</label>
          <input id="q-src" className="input" type="url" inputMode="url" value={sourceUrl} onChange={(e) => setSourceUrl(e.target.value)} placeholder="Paste a link" />
        </div>
        <div className="field">
          <label htmlFor="q-when">Date found</label>
          <input id="q-when" className="input" type="date" value={foundOn} max={today} onChange={(e) => setFoundOn(e.target.value || today)} />
        </div>
      </div>

      <div className="field">
        <label htmlFor="q-note">Note</label>
        <textarea id="q-note" className="input" rows={2} maxLength={500} value={note} onChange={(e) => setNote(e.target.value)} placeholder="e.g. Vox Trentham Street, studio, 12-month tenancy" />
      </div>

      {error && (
        <p className="error" role="alert">
          {error}
        </p>
      )}

      <div className="btns">
        <button type="button" className="btn quiet lg" style={{ flex: 1 }} onClick={onClose}>
          Cancel
        </button>
        <button type="submit" className="btn primary lg" style={{ flex: 2 }} disabled={busy}>
          {busy ? 'Saving…' : 'Save quote'}
        </button>
      </div>
      <p className="faint tiny" style={{ margin: 0, textAlign: 'center' }}>
        Older quotes for this item stay in its history.
      </p>

      {(history.length > 0 || line?.custom) && (
        <History
          history={history}
          rate={input.rate}
          onDelete={(id) => void removeQuote({ id })}
          customId={line?.custom ? (line.key as Id<'customCosts'>) : null}
          onRemoveCustom={async (id) => {
            if (!window.confirm(`Remove "${line?.label}" and its quotes from this scenario?`)) return
            await removeCustom({ id })
            setItem(lines.find((l) => !l.custom)?.key ?? NEW)
          }}
        />
      )}
    </form>
  )
}

function History({
  history,
  rate,
  onDelete,
  customId,
  onRemoveCustom,
}: {
  history: QuoteDoc[]
  rate: number
  onDelete: (id: Id<'quotes'>) => void
  customId: Id<'customCosts'> | null
  onRemoveCustom: (id: Id<'customCosts'>) => void
}) {
  return (
    <section className="quote-history" aria-labelledby="q-hist">
      <h3 id="q-hist" className="h3">
        History for this item
      </h3>
      <ul>
        {history.map((q, i) => (
          <li key={q._id}>
            <div className="qh-main">
              <b>{q.currency === 'GBP' ? gbp(q.amount) : zar(q.amount)}</b>
              <small>
                {q.currency === 'GBP' ? zar(q.amount * rate) : gbp(q.amount / rate)} · found {dayMonthYear(q.foundOn)}
                {q.sourceUrl ? (
                  <>
                    {' · '}
                    <a href={q.sourceUrl} target="_blank" rel="noreferrer noopener">
                      {hostOf(q.sourceUrl)}
                    </a>
                  </>
                ) : null}
              </small>
              {q.note && <small className="qh-note">{q.note}</small>}
            </div>
            {i === 0 ? <span className="tag mine">Counts</span> : <span className="tag">Older</span>}
            <button type="button" className="btn quiet sm danger" onClick={() => onDelete(q._id)} aria-label={`Delete the ${q.currency === 'GBP' ? gbp(q.amount) : zar(q.amount)} quote from ${dayMonthYear(q.foundOn)}`}>
              Delete
            </button>
          </li>
        ))}
      </ul>
      {history.length > 1 && <p className="faint tiny" style={{ margin: 0 }}>Delete the newest and the one before it counts again.</p>}
      {customId && (
        <button type="button" className="btn link danger" style={{ alignSelf: 'flex-start' }} onClick={() => onRemoveCustom(customId)}>
          Remove this cost
        </button>
      )}
    </section>
  )
}

function hostOf(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, '')
  } catch {
    return 'link'
  }
}
