import { useMemo, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { dayMonthYear } from '@shared/dates'
import { plan as planOf } from '@shared/engine'
import { parsePack, type DestinationPack } from '@shared/pack'
import { DEFAULT_SCENARIO } from '@shared/types'
import { useActions, useApp, type Id } from '../lib/app'
import { cur, plural, zar } from '../lib/format'
import { PLAN_PROMPT } from '../lib/planPrompt'

/** Plans from Claude: how to ask for one, importing it, and the plans you have. */
export default function PlansSection() {
  const { destinations, scenarios, savings, today } = useApp()
  const { importPlan, removePlan } = useActions()
  const navigate = useNavigate()
  const fileRef = useRef<HTMLInputElement>(null)
  const [text, setText] = useState('')
  const [fileName, setFileName] = useState<string | null>(null)
  const [makeMain, setMakeMain] = useState(true)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [done, setDone] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)

  const checked = useMemo(() => (text.trim() ? parsePack(text) : null), [text])
  const pack = checked?.ok ? checked.pack : null
  const existing = pack ? destinations.find((d) => d.slug === pack.id) : undefined

  async function readFile(f: File | undefined) {
    if (!f) return
    setDone(null)
    setError(null)
    if (f.size > 300_000) return setError('That file is too big for a plan. Plans are usually under 50 KB.')
    setFileName(f.name)
    setText(await f.text())
  }

  async function doImport() {
    if (!pack) return
    setBusy(true)
    setError(null)
    try {
      const r = await importPlan({ json: JSON.stringify(pack), createScenario: !existing, makeActive: !existing && makeMain })
      setDone(r.replaced ? `Updated "${pack.title}". Scenarios built on it now use the new version.` : `Imported "${pack.title}"${makeMain ? ' and made it your main scenario' : ' as a new scenario'}.`)
      setText('')
      setFileName(null)
      if (!r.replaced && makeMain) navigate('/')
    } catch (e) {
      setError(e instanceof Error ? e.message.replace(/^.*Uncaught Error: /, '').split('\n')[0] : "Couldn't import. Try again.")
    } finally {
      setBusy(false)
    }
  }

  return (
    <>
      <div className="sblock">
        <h3>1. Ask Claude for a plan</h3>
        <ol className="plan-how">
          <li>Copy the prompt below and paste it into a chat with Claude.</li>
          <li>Replace the part in [square brackets] with the move you want planned: the country, visa, cities, your job and who's coming.</li>
          <li>Claude answers with a JSON code block (and a .json file if it can). Download the file, or copy the code block.</li>
        </ol>
        <div className="btns" style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <button
            type="button"
            className="btn primary"
            onClick={async () => {
              await navigator.clipboard.writeText(PLAN_PROMPT)
              setCopied(true)
              setTimeout(() => setCopied(false), 2000)
            }}
          >
            {copied ? 'Copied' : 'Copy the prompt for Claude'}
          </button>
          <a className="btn quiet" href="/northbound-plan-example.json" download>
            Download an example plan
          </a>
        </div>
        <details className="prompt-peek">
          <summary>Show the prompt</summary>
          <pre>{PLAN_PROMPT}</pre>
        </details>
      </div>

      <div className="sblock">
        <h3>2. Import it</h3>
        <div className="drop">
          <input ref={fileRef} id="plan-file" type="file" accept=".json,application/json" className="sr-only" onChange={(e) => void readFile(e.target.files?.[0])} />
          <button type="button" className="btn quiet" onClick={() => fileRef.current?.click()}>
            Choose the .json file
          </button>
          <span className="muted small">{fileName ?? 'or paste the code block below'}</span>
        </div>
        <div className="field" style={{ marginTop: 12 }}>
          <label htmlFor="plan-text">Plan</label>
          <textarea
            id="plan-text"
            className="input mono"
            rows={6}
            value={text}
            spellCheck={false}
            placeholder='{ "format": "northbound-plan", ... }'
            onChange={(e) => {
              setText(e.target.value)
              setFileName(null)
              setDone(null)
            }}
          />
        </div>

        {checked && !checked.ok && (
          <div className="note danger" role="alert">
            <b>This plan can't be imported yet.</b> Send these problems back to Claude and ask it to fix the file:
            <ul className="err-list">
              {checked.errors.slice(0, 12).map((e) => (
                <li key={e}>{e}</li>
              ))}
            </ul>
            {checked.errors.length > 12 && <span>…and {checked.errors.length - 12} more.</span>}
          </div>
        )}

        {pack && <Preview pack={pack} savedZar={savings.savedZar} monthlyZar={savings.monthlyZar} today={today} replacing={!!existing} />}

        {pack && (
          <div className="stack" style={{ gap: 10, marginTop: 12 }}>
            {!existing && (
              <label className="check-row">
                <input type="checkbox" checked={makeMain} onChange={(e) => setMakeMain(e.target.checked)} />
                Make it my main scenario
              </label>
            )}
            <button type="button" className="btn primary lg" style={{ alignSelf: 'flex-start' }} onClick={() => void doImport()} disabled={busy}>
              {busy ? 'Importing…' : existing ? 'Update this plan' : 'Import plan'}
            </button>
          </div>
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
        <h3>Your plans</h3>
        {destinations.length === 0 ? (
          <p className="muted small" style={{ margin: 0 }}>
            None yet. The UK Ancestry route is built in.
          </p>
        ) : (
          <ul className="qs-list">
            {destinations.map((d) => {
              const using = scenarios.filter((s) => s.destinationId === d._id)
              return (
                <li key={d._id}>
                  <span className="qh-main">
                    <b>{d.title}</b>
                    <small>
                      {d.country} · imported {dayMonthYear(new Date(d.importedAt).toISOString().slice(0, 10))} · {plural(using.length, 'scenario')}
                    </small>
                  </span>
                  {using[0] && (
                    <Link to={`/scenario/${using[0]._id}`} className="btn quiet sm">
                      Open
                    </Link>
                  )}
                  <button
                    type="button"
                    className="btn quiet sm danger"
                    onClick={async () => {
                      if (!window.confirm(`Remove "${d.title}"? ${using.length ? `Its ${plural(using.length, 'scenario')} and their quotes go too. ` : ''}This can't be undone.`)) return
                      try {
                        await removePlan({ id: d._id as Id<'destinations'> })
                      } catch (e) {
                        setError(e instanceof Error ? e.message.replace(/^.*Uncaught Error: /, '').split('\n')[0] : "Couldn't remove it.")
                      }
                    }}
                  >
                    Remove
                  </button>
                </li>
              )
            })}
          </ul>
        )}
      </div>
    </>
  )
}

/** What the plan says, and roughly what it would need, before you import it. */
function Preview({ pack, savedZar, monthlyZar, today, replacing }: { pack: DestinationPack; savedZar: number; monthlyZar: number; today: string; replacing: boolean }) {
  const sc = pack.scenario
  const city = pack.cities.find((c) => c.id === sc.city) ?? pack.cities[0]
  const s = {
    ...DEFAULT_SCENARIO,
    pack,
    destCity: city.id,
    housing: sc.housing,
    jobHuntMonths: sc.jobHuntMonths,
    tempNights: sc.tempNights,
    flightGbp: pack.move.flightPerPerson,
    rate: pack.currency.zarPerUnit,
    rateMode: 'fixed' as const,
    certLeadMonths: sc.paperworkMonths ?? 3,
    landMode: sc.landMode,
    landDate: sc.landDate ?? DEFAULT_SCENARIO.landDate,
    ukSalary: sc.salary ?? 0,
    jobTitle: sc.jobTitle ?? DEFAULT_SCENARIO.jobTitle,
    bufferGbp: sc.bufferLocal ?? 0,
  }
  const p = planOf(s, { savedZar, monthlyZar }, today)
  return (
    <div className="plan-preview">
      <div className="card-h">
        <b>{pack.title}</b>
        <span className="tag ok">{replacing ? 'Replaces your earlier version' : 'Ready to import'}</span>
      </div>
      {pack.summary && <p className="muted small" style={{ margin: 0 }}>{pack.summary}</p>}
      <div className="facts3">
        <div>
          <small>The move needs</small>
          <b>{zar(p.targetZar, 1000)}</b>
          <small>{cur(p.targetGbp, pack.currency.symbol, 100)}</small>
        </div>
        <div>
          <small>Visa</small>
          <b>{pack.visa.name}</b>
        </div>
        <div>
          <small>Cities</small>
          <b>{pack.cities.map((c) => c.name).join(', ')}</b>
        </div>
      </div>
      <p className="muted small" style={{ margin: 0 }}>
        {plural(pack.steps.length, 'step')} on the map, {plural(pack.documents.length, 'document')} to gather
        {pack.settlement ? `, a path to ${pack.settlement.name}` : ''}. {pack.currency.symbol}1 = R{pack.currency.zarPerUnit.toFixed(2)}
        {pack.currency.rateDate ? ` on ${dayMonthYear(pack.currency.rateDate)}` : ''}.
      </p>
    </div>
  )
}
