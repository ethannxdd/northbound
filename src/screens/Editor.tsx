import { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { CITIES } from '@shared/cities'
import { longMonthYear, todayIso } from '@shared/dates'
import { partnerCanCome } from '@shared/engine'
import { addMonths } from '@shared/dates'
import type { ScenarioInput } from '@shared/types'
import { toInput, useActions, useApp, type Id } from '../lib/app'
import { gbp, zar } from '../lib/format'
import { MoneyInput, Seg, Toggle } from '../lib/ui'

export default function Editor() {
  const { id } = useParams()
  const { scenarios, active, planFor, savings, overrides } = useApp()
  const { saveScenario, deleteScenario } = useActions()
  const navigate = useNavigate()
  const existing = scenarios.find((s) => s._id === id)
  const isNew = !existing
  const [draft, setDraft] = useState<ScenarioInput>(() => (existing ? toInput(existing) : { ...toInput(active), name: `${active.name} (copy)` }))
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const set = <K extends keyof ScenarioInput>(k: K, v: ScenarioInput[K]) => setDraft((d) => ({ ...d, [k]: v }))
  const p = planFor(draft)
  const applyDate = addMonths(p.landDate, -3)
  const partnerOk = partnerCanCome(draft, applyDate, overrides)

  async function save() {
    if (!draft.name.trim()) return setError('Give this scenario a name.')
    setBusy(true)
    setError(null)
    try {
      await saveScenario({ id: existing?._id as Id<'scenarios'> | undefined, scenario: { ...draft, name: draft.name.trim() }, makeActive: true })
      navigate('/')
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
    <div className="narrow-page" style={{ paddingBottom: 140 }}>
      <div className="topbar">
        <button type="button" className="btn quiet small" onClick={() => navigate(-1)}>
          Cancel
        </button>
        <span className="brand">{isNew ? 'New scenario' : 'Edit scenario'}</span>
        <button type="button" className="btn small primary" onClick={() => void save()} disabled={busy}>
          Save
        </button>
      </div>

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

      <div className="field">
        <span className="lbl">City</span>
        <Seg label="City" value={draft.city} onChange={(v) => set('city', v)} options={Object.values(CITIES).map((c) => ({ value: c.id, label: c.name }))} />
      </div>

      <div className="field">
        <span className="lbl">Home</span>
        <Seg label="Housing" value={draft.housing} onChange={(v) => set('housing', v)} options={[{ value: 'room', label: 'Room' }, { value: 'studio', label: 'Studio' }, { value: 'onebed', label: '1-bed' }]} />
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

      <Slider id="hunt" label="Time to find work" value={draft.jobHuntMonths} min={0} max={9} step={1} show={(v) => (v === 0 ? 'Job lined up' : `${v} month${v === 1 ? '' : 's'}`)} onChange={(v) => set('jobHuntMonths', v)} />
      <div className="field">
        <label htmlFor="salary">
          Your UK salary <output>{draft.ukSalary > 0 ? gbp(draft.ukSalary) : `Typical, ${gbp(CITIES[draft.city].itSupportSalary)}`}</output>
        </label>
        <MoneyInput id="salary" prefix="£" value={draft.ukSalary} onChange={(n) => set('ukSalary', n)} />
        <p className="hint">Leave empty to use a typical IT support salary in {CITIES[draft.city].name}.</p>
      </div>
      <Slider id="rate" label="Rand to the pound" value={draft.rate} min={15} max={35} step={0.1} show={(v) => `R${v.toFixed(2)}`} onChange={(v) => set('rate', v)} />
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
      {error && (
        <p className="error" role="alert" style={{ padding: '0 20px' }}>
          {error}
        </p>
      )}
      {!isNew && (
        <div className="field">
          <button type="button" className="btn quiet block" onClick={() => void remove()} style={{ color: 'var(--now)' }}>
            Delete this scenario
          </button>
        </div>
      )}

      <div className="sign editor-result" aria-live="polite" style={{ position: 'fixed', left: 12, right: 12, bottom: 'calc(86px + env(safe-area-inset-bottom))', maxWidth: 536, margin: '0 auto', zIndex: 15, justifyContent: 'space-between' }}>
        <span>
          <small>You'd need</small>
          <span className="num" style={{ fontSize: 30 }}>
            {zar(p.targetZar, 1000)}
          </span>
          <small>
            {gbp(p.targetGbp, 100)}, landing {draft.landMode === 'saved' ? 'around ' : ''}
            {longMonthYear(p.landDate)}
          </small>
        </span>
        <button type="button" className="btn primary small" onClick={() => void save()} disabled={busy}>
          Save
        </button>
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
