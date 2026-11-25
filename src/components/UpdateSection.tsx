import { useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { dayMonthYear } from '@shared/dates'
import { parseDetails, settleItems, type ScenarioDetails } from '@shared/details'
import { scenarioDocuments } from '@shared/documents'
import { allMonthlyItems, allUpfrontCosts, cityOf, plan as planOf } from '@shared/engine'
import { allTimeline } from '@shared/timeline'
import { toInput, useActions, useApp, useMe, type Id } from '../lib/app'
import { plural, zar } from '../lib/format'
import { buildUpdatePrompt } from '../lib/updatePrompt'

const errText = (e: unknown, fallback: string) => (e instanceof Error ? e.message.replace(/^.*Uncaught Error: /, '').split('\n')[0] : fallback)

/** Update Plan/Scenario: a prompt for Claude built from one scenario, and importing the details file it sends back. */
export default function UpdateSection() {
  const { scenarios, active, effective, detailsBy, savings, today, overrides, extrasFor } = useApp()
  const me = useMe()
  const { importDetails, removeDetails } = useActions()
  const fileRef = useRef<HTMLInputElement>(null)
  const [pickId, setPickId] = useState<string>(active._id)
  const [copied, setCopied] = useState(false)
  const [text, setText] = useState('')
  const [fileName, setFileName] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [done, setDone] = useState<string | null>(null)

  const picked = scenarios.find((s) => s._id === pickId) ?? active
  // The scenario without its details file: the base items, so refs line up.
  const base = useMemo(() => ({ ...effective(toInput(picked), picked._id), details: undefined }), [effective, picked])
  const basePlan = useMemo(() => planOf(base, savings, today, overrides, extrasFor(picked._id)), [base, savings, today, overrides, extrasFor, picked._id])
  const refs = useMemo(() => {
    const out = new Set<string>()
    for (const d of scenarioDocuments(base, String)) out.add(d.ref)
    for (const t of allTimeline(base, basePlan.landDate, today, overrides)) out.add(`step:${t.key}`)
    for (const g of allUpfrontCosts(base, basePlan.landDate, overrides).groups) for (const i of g.items) out.add(`cost:${i.key}`)
    for (const i of allMonthlyItems(base)) out.add(`month:${i.key}`)
    for (const a of cityOf(base).areas) out.add(`area:${a.id}`)
    for (const x of settleItems(base)) out.add(x.ref)
    return out
  }, [base, basePlan.landDate, today, overrides])
  const previousRow = me?.details.find((d) => d.scenarioId === picked._id)
  const current = detailsBy.get(picked._id)

  const prompt = useMemo(
    () => buildUpdatePrompt({ id: picked._id, s: base, plan: basePlan, savings, today, overrides, previous: previousRow ? { importedAt: previousRow.importedAt, json: previousRow.json } : undefined }),
    [picked._id, base, basePlan, savings, today, overrides, previousRow],
  )

  // The file names its scenario; use that one if it's still here.
  const loose = useMemo(() => (text.trim() ? parseDetails(text) : null), [text])
  const fileScenario = loose?.ok ? scenarios.find((s) => s._id === loose.details.scenarioId) : undefined
  const target = fileScenario ?? picked
  const checked = useMemo(() => {
    if (!text.trim()) return null
    if (target._id !== picked._id) return loose
    return parseDetails(text, refs)
  }, [text, target._id, picked._id, loose, refs])
  const details = checked?.ok ? checked.details : null

  async function readFile(f: File | undefined) {
    if (!f) return
    setDone(null)
    setError(null)
    if (f.size > 400_000) return setError('That file is too big for a details file.')
    setFileName(f.name)
    setText(await f.text())
  }

  async function copy() {
    await navigator.clipboard.writeText(prompt)
    setCopied(true)
    setTimeout(() => setCopied(false), 2500)
  }

  async function doImport() {
    if (!details) return
    setBusy(true)
    setError(null)
    try {
      const r = await importDetails({ scenarioId: target._id as Id<'scenarios'>, json: JSON.stringify(details) })
      setDone(`${r.replaced ? 'Updated' : 'Added'} Claude's details on "${target.name}". Open any screen to see it next to each item.`)
      setText('')
      setFileName(null)
    } catch (e) {
      setError(errText(e, "Couldn't import. Try again."))
    } finally {
      setBusy(false)
    }
  }

  return (
    <>
      <div className="sblock">
        <h3>1. Ask Claude to update a scenario</h3>
        {scenarios.length > 1 && (
          <div className="field">
            <label htmlFor="upd-scenario">Scenario</label>
            <select id="upd-scenario" className="input" value={picked._id} onChange={(e) => setPickId(e.target.value)}>
              {scenarios.map((s) => (
                <option key={s._id} value={s._id}>
                  {s.name}
                  {s._id === active._id ? ' (main)' : ''}
                </option>
              ))}
            </select>
          </div>
        )}
        <ol className="plan-how">
          <li>Press the button. It copies a prompt with everything in "{picked.name}": your settings, every document, map step, cost before you go, monthly cost, neighbourhood and settling condition, and what you've removed.</li>
          <li>Paste it into a chat with Claude. Claude researches each item and answers with a JSON code block (and a .json file if it can).</li>
          <li>Bring the file or code block back here and import it. The detail shows next to each item on Home, the map, Money, Paperwork, Life and Settling.</li>
        </ol>
        <div className="btns" style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
          <button type="button" className="btn primary lg" onClick={() => void copy()}>
            {copied ? 'Copied. Paste it into Claude' : 'Update Plan/Scenario'}
          </button>
          <span className="muted small">{plural(refs.size, 'item')} in the prompt</span>
        </div>
        <details className="prompt-peek">
          <summary>Show the prompt</summary>
          <pre>{prompt}</pre>
        </details>
      </div>

      <div className="sblock">
        <h3>2. Import Claude's details</h3>
        <div className="drop">
          <input ref={fileRef} id="details-file" type="file" accept=".json,application/json" className="sr-only" onChange={(e) => void readFile(e.target.files?.[0])} />
          <button type="button" className="btn quiet" onClick={() => fileRef.current?.click()}>
            Choose the .json file
          </button>
          <span className="muted small">{fileName ?? 'or paste the code block below'}</span>
        </div>
        <div className="field" style={{ marginTop: 12 }}>
          <label htmlFor="details-text">Details</label>
          <textarea
            id="details-text"
            className="input mono"
            rows={6}
            value={text}
            spellCheck={false}
            placeholder='{ "format": "northbound-details", ... }'
            onChange={(e) => {
              setText(e.target.value)
              setFileName(null)
              setDone(null)
            }}
          />
        </div>

        {checked && !checked.ok && (
          <div className="note danger" role="alert">
            <b>This can't be imported yet.</b> Send these problems back to Claude and ask it to fix the file:
            <ul className="err-list">
              {checked.errors.slice(0, 12).map((e) => (
                <li key={e}>{e}</li>
              ))}
            </ul>
            {checked.errors.length > 12 && <span>…and {checked.errors.length - 12} more.</span>}
          </div>
        )}

        {details && <Preview details={details} targetId={target._id} targetName={target.name} refsCount={refs.size} replacing={detailsBy.has(target._id)} otherThanPicked={target._id !== picked._id} />}

        {details && (
          <button type="button" className="btn primary lg" style={{ marginTop: 12 }} onClick={() => void doImport()} disabled={busy}>
            {busy ? 'Importing…' : `Add to "${target.name}"`}
          </button>
        )}
        {error && (
          <p className="error" role="alert">
            {error}
          </p>
        )}
        {done && (
          <p className="ok-text" role="status">
            {done}
          </p>
        )}
      </div>

      <div className="sblock">
        <h3>Details on "{picked.name}"</h3>
        {current ? (
          <ul className="qs-list">
            <li>
              <span className="qh-main">
                <b>From Claude, imported {dayMonthYear(new Date(current.importedAt).toISOString().slice(0, 10))}</b>
                <small>
                  {plural(current.details.items.length, 'item')} detailed
                  {current.details.addDocuments?.length ? `, ${plural(current.details.addDocuments.length, 'document')} added` : ''}
                  {current.details.addSteps?.length ? `, ${plural(current.details.addSteps.length, 'step')} added` : ''}
                  {current.details.addCosts?.length ? `, ${plural(current.details.addCosts.length, 'cost')} added` : ''}
                  {current.details.addMonthly?.length ? `, ${plural(current.details.addMonthly.length, 'monthly cost')} added` : ''}
                </small>
              </span>
              <Link to="/paperwork" className="btn quiet sm">
                Paperwork
              </Link>
              <button
                type="button"
                className="btn quiet sm danger"
                onClick={async () => {
                  if (!window.confirm(`Take Claude's details off "${picked.name}"? Anything it added goes too. You can import the file again later.`)) return
                  try {
                    await removeDetails({ scenarioId: picked._id as Id<'scenarios'> })
                  } catch (e) {
                    setError(errText(e, "Couldn't remove them."))
                  }
                }}
              >
                Remove
              </button>
            </li>
          </ul>
        ) : (
          <p className="muted small" style={{ margin: 0 }}>
            None yet. Press Update Plan/Scenario to get them.
          </p>
        )}
        {current?.details.summary && (
          <p className="small" style={{ margin: '10px 0 0', lineHeight: 1.55 }}>
            {current.details.summary}
          </p>
        )}
        {current?.details.notes?.length ? (
          <ul className="small muted" style={{ margin: '8px 0 0', paddingLeft: 18, lineHeight: 1.55 }}>
            {current.details.notes.map((n) => (
              <li key={n}>{n}</li>
            ))}
          </ul>
        ) : null}
        <p className="faint small" style={{ margin: '10px 0 0' }}>
          To take something off a scenario, open its Details on any screen and press Remove from scenario. Removed items are listed at the bottom of each screen, with Put back.
        </p>
      </div>
    </>
  )
}

function Preview({ details, targetId, targetName, refsCount, replacing, otherThanPicked }: { details: ScenarioDetails; targetId: string; targetName: string; refsCount: number; replacing: boolean; otherThanPicked: boolean }) {
  const { scenarios, planFor, effective, savings, today, overrides, extrasFor } = useApp()
  const s = scenarios.find((x) => x._id === targetId)!
  const now = planFor(toInput(s), targetId)
  const after = planOf({ ...effective(toInput(s), targetId), details }, savings, today, overrides, extrasFor(targetId))
  const change = after.targetZar - now.targetZar
  const fixes = details.items.filter((i) => i.amount !== undefined).length
  return (
    <div className="plan-preview">
      <div className="card-h">
        <b>Details for "{targetName}"</b>
        <span className="tag ok">{replacing ? 'Replaces the earlier details' : 'Ready to import'}</span>
      </div>
      {otherThanPicked && <p className="note small">This file was made for "{targetName}", so it goes there.</p>}
      {details.summary && <p className="muted small" style={{ margin: 0 }}>{details.summary}</p>}
      <p className="muted small" style={{ margin: 0 }}>
        Detail on {details.items.length} of {refsCount} items
        {details.addDocuments?.length ? `, ${plural(details.addDocuments.length, 'new document')}` : ''}
        {details.addSteps?.length ? `, ${plural(details.addSteps.length, 'new step')}` : ''}
        {details.addCosts?.length ? `, ${plural(details.addCosts.length, 'new cost')}` : ''}
        {details.addMonthly?.length ? `, ${plural(details.addMonthly.length, 'new monthly cost')}` : ''}
        {fixes ? `, ${plural(fixes, 'corrected figure')}` : ''}. The move needs {zar(now.targetZar, 1000)} now{Math.abs(change) >= 50 ? `, ${zar(after.targetZar, 1000)} with these details (${change > 0 ? '+' : '−'}${zar(Math.abs(change), 100)})` : ', and these details don\'t change it'}.
      </p>
    </div>
  )
}
