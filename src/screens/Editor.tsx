import { useState } from 'react'
import { useLocation, useNavigate, useParams } from 'react-router-dom'
import { AREAS, CITIES, rentFor } from '@shared/cities'
import { longMonthYear, todayIso } from '@shared/dates'
import { monthlyBudget, partnerCanCome, upfrontCosts } from '@shared/engine'
import { addMonths } from '@shared/dates'
import type { ScenarioInput } from '@shared/types'
import { toInput, useActions, useApp, type Id } from '../lib/app'
import { gbp, zar } from '../lib/format'
import { MoneyInput, Seg, Toggle, useWide } from '../lib/ui'
import SavingPlan from '../components/SavingPlan'

export default function Editor() {
  const { id } = useParams()
  const { scenarios, active, planFor, savings, overrides, today, liveRate, effective } = useApp()
  const { saveScenario, deleteScenario } = useActions()
  const navigate = useNavigate()
  const location = useLocation()
  const wide = useWide()
  // Go back where you came from, or Home if the editor was opened directly.
  const leave = () => (location.key !== 'default' ? navigate(-1) : navigate('/'))
  const existing = scenarios.find((s) => s._id === id)
  const isNew = !existing
  const [draft, setDraft] = useState<ScenarioInput>(() => (existing ? toInput(existing) : { ...toInput(active), name: `${active.name} (copy)` }))
  const isMain = !!existing && existing._id === active._id
  const [makeMain, setMakeMain] = useState(isNew || isMain)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const set = <K extends keyof ScenarioInput>(k: K, v: ScenarioInput[K]) => setDraft((d) => ({ ...d, [k]: v }))
  const p = planFor(draft, existing?._id ?? active._id)
  const applyDate = addMonths(p.landDate, -3)
  const partnerOk = partnerCanCome(draft, applyDate, overrides)
  const before = existing ? planFor(toInput(existing), existing._id) : null
  const diff = before ? p.targetZar - before.targetZar : 0
  const costs = upfrontCosts(effective(draft), p.landDate, overrides)
  const budget = monthlyBudget(draft, p.landDate, overrides)

  async function save() {
    if (!draft.name.trim()) return setError('Give this scenario a name.')
    setBusy(true)
    setError(null)
    try {
      await saveScenario({ id: existing?._id as Id<'scenarios'> | undefined, scenario: { ...draft, name: draft.name.trim() }, makeActive: makeMain, copyFrom: existing ? undefined : active._id })
      leave()
    } catch {
      setError("Couldn't save. Try again.")
      setBusy(false)
    }
  }

  async function remove() {
    if (!existing) return
    if (!window.confirm(`Delete "${existing.name}"? This can't be undone.`)) return
    try {
      await deleteScenario({ id: existing._id })
      navigate('/')
    } catch (e) {
      setError(e instanceof Error && e.message.includes('at least one') ? 'Keep at least one scenario.' : "Couldn't delete. Try again.")
    }
  }

  return (
    <div>
      <div className="editor-top">
        <button type="button" className="btn quiet sm" onClick={leave}>
          Cancel
        </button>
        <h1 className="editor-title">{isNew ? 'New scenario' : `Edit ${existing.name}`}</h1>
        <button type="button" className="btn grad sm" onClick={() => void save()} disabled={busy}>
          {busy ? 'Saving…' : 'Save'}
        </button>
      </div>
      <div className="editor-grid">
      <div className="editor-form">
      <h2 className="form-h">The basics</h2>

      <div className="field">
        <label htmlFor="name">Name</label>
        <input id="name" className="input" value={draft.name} onChange={(e) => set('name', e.target.value)} />
      </div>

      <div className="field">
        <span className="lbl">Land</span>
        <Seg label="When to land" value={draft.landMode} onChange={(v) => set('landMode', v)} options={[{ value: 'date', label: 'On a set date' }, { value: 'saved', label: "When I've saved enough" }]} />
        <div style={{ marginTop: 8 }}>
          {draft.landMode === 'date' ? (
            <input aria-label="Landing date" className="input" type="date" value={draft.landDate} min={todayIso()} onChange={(e) => e.target.value && set('landDate', e.target.value)} />
          ) : (
            <div className="card row" style={{ padding: '10px 12px' }}>
              <b>{p.readyDate ? `Around ${longMonthYear(p.landDate)}` : 'Add a monthly saving first'}</b>
              <span className="small muted">at {zar(savings.monthlyZar, 100)} a month</span>
            </div>
          )}
        </div>
        {draft.landMode === 'date' && draft.landDate < p.earliestLand && <p className="error">Your paperwork can't be ready before {longMonthYear(p.earliestLand)} at the current certificate wait.</p>}
      </div>

      <h2 className="form-h">Where and who</h2>
      <div className="field">
        <span className="lbl">City</span>
        <Seg label="City" value={draft.city} onChange={(v) => setDraft((d) => ({ ...d, city: v, area: undefined }))} options={Object.values(CITIES).map((c) => ({ value: c.id, label: c.name }))} />
      </div>

      <div className="field">
        <span className="lbl">Home</span>
        <Seg label="Housing" value={draft.housing} onChange={(v) => set('housing', v)} options={[{ value: 'room', label: 'Room' }, { value: 'studio', label: 'Studio' }, { value: 'onebed', label: '1-bed' }]} />
      </div>

      <div className="field">
        <label htmlFor="area">Neighbourhood</label>
        <select id="area" className="input" value={draft.area ?? ''} onChange={(e) => set('area', e.target.value || undefined)}>
          <option value="">City average</option>
          {AREAS[draft.city].map((a) => (
            <option key={a.id} value={a.id}>
              {a.name}, {gbp(rentFor(draft.city, draft.housing, a.id))}
            </option>
          ))}
        </select>
      </div>

      <div className="field">
        <span className="lbl">Who's coming</span>
        <Seg label="Household" value={draft.partner ? 'two' : 'one'} onChange={(v) => set('partner', v === 'two')} options={[{ value: 'one', label: 'Just me' }, { value: 'two', label: 'With a partner' }]} />
        {draft.partner && (
          <div className="card" style={{ marginTop: 8, display: 'grid', gap: 10 }}>
            <div className="toggle-row">
              <span>Married or civil partners</span>
              <Toggle on={draft.partnerMarried} onChange={(v) => set('partnerMarried', v)} label="Married or civil partners" />
            </div>
            {!draft.partnerMarried && (
              <label className="small" style={{ display: 'grid', gap: 4, fontWeight: 700 }}>
                Together since
                <input className="input" type="date" value={draft.partnerSince ?? ''} onChange={(e) => set('partnerSince', e.target.value || null)} />
              </label>
            )}
            <p className={partnerOk ? 'ok-text' : 'error'} style={{ margin: 0 }}>
              {partnerOk ? 'They can come with you.' : `Unmarried partners need 2 years together by ${longMonthYear(applyDate)}, when you apply. Otherwise they join later.`}
            </p>
            <div className="toggle-row">
              <span>They'll work in the UK</span>
              <Toggle on={draft.partnerWorks} onChange={(v) => set('partnerWorks', v)} label="Partner will work" />
            </div>
            {draft.partnerWorks && (
              <label className="small" style={{ display: 'grid', gap: 4, fontWeight: 700 }}>
                Their expected salary
                <MoneyInput prefix="£" value={draft.partnerSalary} onChange={(n) => set('partnerSalary', n)} />
              </label>
            )}
          </div>
        )}
      </div>

      <h2 className="form-h">Money and timing</h2>
      <Slider id="hunt" label="Time to find work" value={draft.jobHuntMonths} min={0} max={9} step={1} show={(v) => (v === 0 ? 'Job lined up' : `${v} month${v === 1 ? '' : 's'}`)} onChange={(v) => set('jobHuntMonths', v)} />
      <div className="field">
        <label htmlFor="salary">
          Your UK salary <output>{draft.ukSalary > 0 ? gbp(draft.ukSalary) : `Typical, ${gbp(CITIES[draft.city].itSupportSalary)}`}</output>
        </label>
        <MoneyInput id="salary" prefix="£" value={draft.ukSalary} onChange={(n) => set('ukSalary', n)} />
        <p className="hint">Leave empty to use a typical IT support salary in {CITIES[draft.city].name}.</p>
      </div>
      <div className="field">
        <span className="lbl">Rand to the pound</span>
        <Seg label="Exchange rate" value={draft.rateMode === 'live' ? 'live' : 'fixed'} onChange={(v) => set('rateMode', v)} options={[{ value: 'live', label: liveRate ? `Live, R${liveRate.toFixed(2)}` : 'Live rate' }, { value: 'fixed', label: 'Set my own' }]} />
        {draft.rateMode !== 'live' ? (
          <div style={{ marginTop: 10 }}>
            <Slider id="rate" label="Your rate" value={draft.rate} min={15} max={35} step={0.1} show={(v) => `R${v.toFixed(2)}`} onChange={(v) => set('rate', v)} />
          </div>
        ) : (
          <p className="hint">Follows the European Central Bank's daily rate, so your number moves with the rand.</p>
        )}
      </div>
      <Slider id="certs" label="Wait for SA certificates" value={draft.certLeadMonths} min={2} max={18} step={1} show={(v) => `${v} months`} onChange={(v) => set('certLeadMonths', v)} />
      <Slider id="nights" label="Nights before you find a room" value={draft.tempNights} min={3} max={30} step={1} show={(v) => `${v} nights`} onChange={(v) => set('tempNights', v)} />
      <div className="field">
        <label htmlFor="flight">Flight, per person</label>
        <MoneyInput id="flight" prefix="£" value={draft.flightGbp} onChange={(n) => set('flightGbp', n)} />
      </div>
      <div className="field">
        <label htmlFor="buffer">Extra safety buffer</label>
        <MoneyInput id="buffer" prefix="£" value={draft.bufferGbp} onChange={(n) => set('bufferGbp', n)} />
      </div>
      <div className="field">
        {isMain ? (
          <p className="hint" style={{ margin: 0 }}>
            This is your main scenario: Home, the map, Money and your Loot goal follow it.
          </p>
        ) : (
          <div className="toggle-row">
            <span>
              <b>Make this my main scenario</b>
              <br />
              <span className="small muted">Home, the map, Money and your Loot goal's target will follow it.</span>
            </span>
            <Toggle on={makeMain} onChange={setMakeMain} label="Make this my main scenario" />
          </div>
        )}
      </div>
      {error && (
        <p className="error" role="alert" style={{ padding: '0 20px' }}>
          {error}
        </p>
      )}
      {!isNew && (
        <div className="field">
          <button type="button" className="btn quiet block" onClick={() => void remove()} style={{ color: 'var(--warn)' }}>
            Delete this scenario
          </button>
        </div>
      )}

      </div>
      {wide ? (
        <aside className="card lift editor-summary" aria-live="polite" aria-label="What this scenario needs">
          <small className="muted">You'd need</small>
          <div className="num">{zar(p.targetZar, 1000)}</div>
          <div className="muted small">
            {gbp(p.targetGbp, 100)}. Landing {draft.landMode === 'saved' ? 'around ' : ''}
            {longMonthYear(p.landDate)}.
          </div>
          <SavingPlan plan={p} mode={draft.landMode} monthlyZar={savings.monthlyZar} today={today} compact />
          {before && Math.abs(diff) >= 1000 && (
            <p className={`diff ${diff > 0 ? 'up' : 'down'}`}>
              {diff > 0 ? '+' : '−'}
              {zar(Math.abs(diff), 1000)} compared with the saved version
            </p>
          )}
          <ul className="sum-list">
            {costs.groups.map((g) => (
              <li key={g.id}>
                <span>{g.label}</span>
                <b>{zar(g.total * effective(draft).rate, 1000)}</b>
              </li>
            ))}
            <li>
              <span>Left each month once paid</span>
              <b>{gbp(budget.left)}</b>
            </li>
          </ul>
          <button type="button" className="btn grad block" onClick={() => void save()} disabled={busy}>
            {busy ? 'Saving…' : isNew ? 'Save scenario' : 'Save changes'}
          </button>
          <button type="button" className="btn quiet block" onClick={leave} style={{ marginTop: 8 }}>
            Cancel
          </button>
        </aside>
      ) : (
        <div className="editor-result" aria-live="polite">
          <span>
            <small>You'd need{before && Math.abs(diff) >= 1000 ? `, ${diff > 0 ? '+' : '−'}${zar(Math.abs(diff), 1000)}` : ''}</small>
            <span className="num" style={{ fontSize: 30 }}>
              {zar(p.targetZar, 1000)}
            </span>
            <small>
              {draft.landMode === 'date' && p.remainingZar > 0 && p.fundsDeadline > today
                ? `Save ${zar(Math.ceil(p.neededPerMonthZar / 100) * 100)} a month to land ${longMonthYear(p.landDate)}`
                : `Landing ${draft.landMode === 'saved' ? 'around ' : ''}${longMonthYear(p.landDate)}`}
            </small>
          </span>
          <button type="button" className="btn grad sm" onClick={() => void save()} disabled={busy}>
            Save
          </button>
        </div>
      )}
      </div>
    </div>
  )
}

function Slider({ id, label, value, min, max, step, show, onChange }: { id: string; label: string; value: number; min: number; max: number; step: number; show: (v: number) => string; onChange: (v: number) => void }) {
  return (
    <div className="field">
      <label htmlFor={id}>
        {label} <output htmlFor={id}>{show(value)}</output>
      </label>
      <input id={id} type="range" min={min} max={max} step={step} value={value} onChange={(e) => onChange(Number(e.target.value))} />
    </div>
  )
}
