import { useState, type ReactNode } from 'react'
import { useLocation, useNavigate, useParams } from 'react-router-dom'
import { CITIES } from '@shared/cities'
import { addMonths, longMonthYear, monthYear, todayIso } from '@shared/dates'
import { cityOf, currencyOf, monthlyBudget, partnerCanCome, rentOf, plan as planOf, planTotal, upfrontCosts, type GroupId } from '@shared/engine'
import type { ScenarioInput } from '@shared/types'
import { toInput, useActions, useApp, type Id } from '../lib/app'
import { cur as fmtCur, zar } from '../lib/format'
import { AnimatedMoney, MoneyInput, Seg, Toggle, useWide } from '../lib/ui'
import LoansFields from '../components/LoansFields'

const GROUP_COLOR: Record<GroupId, string> = { paper: 'var(--l-paper)', move: 'var(--l-move)', runway: 'var(--l-money)' }

export default function Editor() {
  const { id } = useParams()
  const { scenarios, active, planFor, savings, overrides, today, liveRate, effective, extrasFor } = useApp()
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
  const [weaker, setWeaker] = useState(0)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const set = <K extends keyof ScenarioInput>(k: K, v: ScenarioInput[K]) => setDraft((d) => ({ ...d, [k]: v }))

  const quotesFrom = existing?._id ?? active._id
  const p = planFor(draft, quotesFrom)
  const eff = effective(draft)
  const ex = extrasFor(quotesFrom)
  const t = planTotal(upfrontCosts(eff, p.landDate, overrides), ex.quotes, ex.customs, eff.rate)
  const applyDate = addMonths(p.landDate, -3)
  const partnerOk = partnerCanCome(draft, applyDate, overrides)
  const budget = monthlyBudget(eff, p.landDate, overrides, ex.borrowing)
  const main = planFor(toInput(active), active._id)
  const saved = existing ? planFor(toInput(existing), existing._id) : null
  const vsMain = p.targetZar - main.targetZar
  const vsSaved = saved ? p.targetZar - saved.targetZar : 0
  const perMonth = draft.landMode === 'date' && p.remainingZar > 0 && p.fundsDeadline > today ? Math.ceil(p.neededPerMonthZar / 100) * 100 : savings.monthlyZar
  const weak = weaker ? planOf({ ...eff, rate: eff.rate * (1 + weaker / 100) }, savings, today, overrides, ex) : null
  const pack = eff.pack
  const dcur = currencyOf(eff)
  const gbp = (n: number, roundTo = 1) => fmtCur(n, dcur.symbol, roundTo)
  const city = cityOf(eff)
  const typical = city.salary

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
    if (!window.confirm(`Delete "${existing.name}"? Its quotes go with it. This can't be undone.`)) return
    try {
      await deleteScenario({ id: existing._id })
      navigate('/')
    } catch (e) {
      setError(e instanceof Error && e.message.includes('at least one') ? 'Keep at least one scenario.' : "Couldn't delete. Try again.")
    }
  }

  const compare = isMain
    ? Math.abs(vsSaved) >= 1000
      ? `${vsSaved > 0 ? '+' : '−'}${zar(Math.abs(vsSaved), 1000)} compared with the saved version of your main scenario.`
      : 'Compared with your main scenario: the same, because this is it. Switch city or housing to see the difference here.'
    : Math.abs(vsMain) < 1000
      ? `About the same as your main scenario, ${active.name}.`
      : `${vsMain > 0 ? '+' : '−'}${zar(Math.abs(vsMain), 1000)} compared with your main scenario, ${active.name}.`

  return (
    <div className="main">
      <div className="editor-head">
        <h1 className="h1">{isNew ? 'New scenario' : `Edit ${existing.name}`}</h1>
        <div className="btns" style={{ display: 'flex', gap: 8 }}>
          <button type="button" className="btn quiet" onClick={leave}>
            Cancel
          </button>
          <button type="button" className="btn primary" onClick={() => void save()} disabled={busy}>
            {busy ? 'Saving…' : 'Save'}
          </button>
        </div>
      </div>

      <div className="editor-layout">
        <form className="editor-form2" onSubmit={(e) => (e.preventDefault(), void save())}>
          <div className="field">
            <label htmlFor="sname">Scenario name</label>
            <input id="sname" className="input strong" value={draft.name} onChange={(e) => set('name', e.target.value)} />
          </div>

          <Section title="When to land">
            <div className="opt-cards" role="group" aria-label="When to land">
              <button type="button" aria-pressed={draft.landMode === 'date'} onClick={() => set('landMode', 'date')}>
                <b>On a set date</b>
                <small>Northbound tells you what to save each month</small>
              </button>
              <button type="button" aria-pressed={draft.landMode === 'saved'} onClick={() => set('landMode', 'saved')}>
                <b>When I've saved enough</b>
                <small>The date moves with your savings</small>
              </button>
            </div>
            {draft.landMode === 'date' ? (
              <div className="field" style={{ margin: 0 }}>
                <label htmlFor="ldate">Landing date</label>
                <input id="ldate" className="input" type="date" value={draft.landDate} min={todayIso()} onChange={(e) => e.target.value && set('landDate', e.target.value)} />
                <p className={draft.landDate < p.earliestLand ? 'error' : 'hint'}>
                  {draft.landDate < p.earliestLand ? "Your paperwork can't be ready by then. " : ''}Earliest possible with your paperwork: {monthYear(p.earliestLand)}
                </p>
              </div>
            ) : (
              <p className="hint" style={{ margin: 0 }}>
                {p.readyDate ? `Around ${longMonthYear(p.landDate)}` : 'Add a monthly saving first'} at {zar(savings.monthlyZar, 100)} a month. Earliest possible with your paperwork: {monthYear(p.earliestLand)}.
              </p>
            )}
          </Section>

          <Section title="Where and who">
            <SegRow label="City">
              {pack ? (
                <Seg label="City" value={city.id} onChange={(v) => setDraft((d) => ({ ...d, destCity: v, area: undefined }))} options={pack.cities.map((c) => ({ value: c.id, label: c.name }))} />
              ) : (
                <Seg label="City" value={draft.city} onChange={(v) => setDraft((d) => ({ ...d, city: v, area: undefined }))} options={Object.values(CITIES).map((c) => ({ value: c.id, label: c.name }))} />
              )}
            </SegRow>
            <SegRow label="Home">
              <Seg label="Home" value={draft.housing} onChange={(v) => set('housing', v)} options={[{ value: 'room', label: 'Room' }, { value: 'studio', label: 'Studio' }, { value: 'onebed', label: '1-bed' }]} />
            </SegRow>
            <SegRow label="Who's coming">
              <Seg label="Who's coming" value={draft.partner ? 'two' : 'one'} onChange={(v) => set('partner', v === 'two')} options={[{ value: 'one', label: 'Just me' }, { value: 'two', label: 'With a partner' }]} />
            </SegRow>
            {draft.partner && (
              <div className="inner-card">
                <div className="toggle-row">
                  <span>Married or civil partners</span>
                  <Toggle on={draft.partnerMarried} onChange={(v) => set('partnerMarried', v)} label="Married or civil partners" />
                </div>
                {!draft.partnerMarried && (
                  <div className="field" style={{ margin: 0 }}>
                    <label htmlFor="since">Together since</label>
                    <input id="since" className="input" type="date" value={draft.partnerSince ?? ''} onChange={(e) => set('partnerSince', e.target.value || null)} />
                  </div>
                )}
                <p className={partnerOk ? 'ok-text' : 'error'} style={{ margin: 0 }}>
                  {partnerOk ? 'They can come with you.' : `Unmarried partners need 2 years together by ${longMonthYear(applyDate)}, when you apply. Otherwise they join later.`}
                </p>
                <div className="toggle-row">
                  <span>They'll work in {pack ? pack.country.name : 'the UK'}</span>
                  <Toggle on={draft.partnerWorks} onChange={(v) => set('partnerWorks', v)} label="Partner will work" />
                </div>
                {draft.partnerWorks && (
                  <div className="field" style={{ margin: 0 }}>
                    <label htmlFor="psal">Their expected salary</label>
                    <MoneyInput id="psal" prefix={dcur.symbol} value={draft.partnerSalary} onChange={(n) => set('partnerSalary', n)} />
                  </div>
                )}
              </div>
            )}
            <div className="field" style={{ margin: 0 }}>
              <label htmlFor="area">Neighbourhood</label>
              <select id="area" className="input" value={draft.area ?? ''} onChange={(e) => set('area', e.target.value || undefined)}>
                <option value="">City average, {gbp(rentOf(eff, undefined))}</option>
                {city.areas.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.name}, {gbp(rentOf(eff, a.id))}
                  </option>
                ))}
              </select>
            </div>
          </Section>

          <Section title="Money and timing">
            <Slider id="hunt" label="Time to find work" value={draft.jobHuntMonths} min={0} max={9} step={1} show={(v) => (v === 0 ? 'Job lined up' : `${v} month${v === 1 ? '' : 's'}`)} hint="Living costs for these months are in your runway" onChange={(v) => set('jobHuntMonths', v)} />
            <Slider
              id="salary"
              label={pack ? `Your salary in ${pack.country.name}` : 'Your UK salary'}
              value={draft.ukSalary || typical}
              min={Math.round((typical * 0.5) / 1000) * 1000}
              max={Math.round((typical * 2.5) / 1000) * 1000}
              step={typical >= 20000 ? 500 : Math.max(1, Math.round(typical / 100))}
              show={(v) => (draft.ukSalary ? gbp(v) : `${gbp(v)}, typical`)}
              hint={pack ? `A typical salary for your job in ${city.name} is ${gbp(typical)}, from your plan` : `A typical IT support salary in ${city.name} is ${gbp(typical)}`}
              onChange={(v) => set('ukSalary', v === typical ? 0 : v)}
            />
            {pack ? (
              <Slider
                id="rate"
                label={`Rand to the ${dcur.name}`}
                value={draft.rate}
                min={Math.round(pack.currency.zarPerUnit * 50) / 100}
                max={Math.round(pack.currency.zarPerUnit * 160) / 100}
                step={pack.currency.zarPerUnit >= 5 ? 0.1 : 0.01}
                show={(v) => `R${v.toFixed(2)}`}
                hint={`Your plan used R${pack.currency.zarPerUnit.toFixed(2)}${pack.currency.rateDate ? ` on ${pack.currency.rateDate}` : ''}. Live rates are only followed for the pound.`}
                onChange={(v) => set('rate', v)}
              />
            ) : (
              <>
                <div className="field">
                  <span className="lbl">Rand to the pound</span>
                  <Seg label="Exchange rate" value={draft.rateMode === 'live' ? 'live' : 'fixed'} onChange={(v) => set('rateMode', v)} options={[{ value: 'live', label: liveRate ? `Live, R${liveRate.toFixed(2)}` : 'Live rate' }, { value: 'fixed', label: 'Set my own' }]} />
                </div>
                {draft.rateMode !== 'live' && <Slider id="rate" label="Your rate" value={draft.rate} min={15} max={35} step={0.1} show={(v) => `R${v.toFixed(2)}`} onChange={(v) => set('rate', v)} />}
              </>
            )}
            <Slider
              id="weaker"
              label="If the rand weakens"
              value={weaker}
              min={0}
              max={30}
              step={1}
              show={(v) => (v ? `${v}%, R${(eff.rate * (1 + v / 100)).toFixed(2)}` : 'Not at all')}
              hint={weak ? `You'd need ${zar(weak.targetZar, 1000)}, ${zar(weak.targetZar - p.targetZar, 1000)} more. Only a what-if: not saved.` : 'A what-if: see how a weaker rand changes your number'}
              onChange={setWeaker}
            />
            <Slider id="certs" label={pack ? 'Paperwork before you can apply' : 'Wait for SA certificates'} value={draft.certLeadMonths} min={pack ? 0 : 2} max={18} step={1} show={(v) => `${v} months`} hint={pack ? 'Time to gather the documents on your Paperwork list' : 'Home Affairs is often slower than it says'} onChange={(v) => set('certLeadMonths', v)} />
            <Slider id="nights" label="Monthly let before you find a place" value={draft.tempNights} min={0} max={45} step={1} show={(v) => `${v} nights`} onChange={(v) => set('tempNights', v)} />
            <Slider id="flight" label="Flight, per person" value={draft.flightGbp} min={pack ? Math.round(pack.move.flightPerPerson * 0.4) : 250} max={pack ? Math.round(pack.move.flightPerPerson * 2.5) : 1500} step={10} show={(v) => gbp(v)} onChange={(v) => set('flightGbp', v)} />
            <Slider id="buffer" label="Extra safety buffer" value={draft.bufferGbp} min={0} max={5000} step={100} show={(v) => (v ? gbp(v) : 'None')} onChange={(v) => set('bufferGbp', v)} />
          </Section>

          <Section title="Loans and credit">
            <p className="hint" style={{ margin: 0 }}>
              These apply to every scenario and save as you go.
            </p>
            <LoansFields />
          </Section>

          {error && (
            <p className="error" role="alert">
              {error}
            </p>
          )}
          {!isNew && (
            <button type="button" className="btn quiet danger" style={{ alignSelf: 'flex-start' }} onClick={() => void remove()}>
              Delete this scenario
            </button>
          )}
        </form>

        {wide ? (
          <aside className="editor-aside glass" aria-live="polite" aria-label="What this scenario needs">
            <span className="muted small">You'd need</span>
            <AnimatedMoney className="bignum" value={p.targetZar} format={(n) => zar(n, 1000)} />
            <span className="muted small">
              {gbp(p.targetGbp, 100)} · landing {draft.landMode === 'saved' ? 'around ' : ''}
              {monthYear(p.landDate)}
            </span>
            <div className="ea-groups">
              {t.groups.map((g) => (
                <div key={g.id}>
                  <span>
                    <i style={{ background: GROUP_COLOR[g.id] }} aria-hidden="true" />
                    {g.label}
                  </span>
                  <b>{gbp(g.planGbp)}</b>
                </div>
              ))}
            </div>
            <div className="ea-tiles">
              <div>
                <span>Left each month</span>
                <b className={budget.left < 0 ? 'danger-text' : budget.left < 150 ? 'warn-text' : ''}>{budget.left < 0 ? `−${gbp(-budget.left)}` : gbp(budget.left)}</b>
              </div>
              <div>
                <span>{draft.landMode === 'date' ? 'Save a month' : 'Saving a month'}</span>
                <b>{zar(perMonth, 100)}</b>
              </div>
            </div>
            <div className="ea-note">{compare}</div>
            {!isMain && (
              <label className="check-row">
                <input type="checkbox" checked={makeMain} onChange={(e) => setMakeMain(e.target.checked)} />
                Make this my main scenario
              </label>
            )}
            <button type="button" className="btn primary lg block" onClick={() => void save()} disabled={busy}>
              {busy ? 'Saving…' : isNew ? 'Save scenario' : 'Save changes'}
            </button>
          </aside>
        ) : (
          <div className="editor-result" aria-live="polite">
            <span>
              <small>You'd need{Math.abs(isMain ? vsSaved : vsMain) >= 1000 ? `, ${(isMain ? vsSaved : vsMain) > 0 ? '+' : '−'}${zar(Math.abs(isMain ? vsSaved : vsMain), 1000)}` : ''}</small>
              <span className="num" style={{ fontSize: 30 }}>
                {zar(p.targetZar, 1000)}
              </span>
              <small>
                {draft.landMode === 'date' && p.remainingZar > 0 && p.fundsDeadline > today ? `Save ${zar(perMonth)} a month to land ${longMonthYear(p.landDate)}` : `Landing ${draft.landMode === 'saved' ? 'around ' : ''}${longMonthYear(p.landDate)}`}
              </small>
            </span>
            <button type="button" className="btn primary sm" onClick={() => void save()} disabled={busy}>
              Save
            </button>
          </div>
        )}
      </div>
      {!wide && !isMain && (
        <label className="check-row" style={{ marginBottom: 90 }}>
          <input type="checkbox" checked={makeMain} onChange={(e) => setMakeMain(e.target.checked)} />
          Make this my main scenario
        </label>
      )}
    </div>
  )
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  const id = `sec-${title.replace(/\W+/g, '-').toLowerCase()}`
  return (
    <section className="card ed-sec" aria-labelledby={id}>
      <h2 id={id} className="h3">
        {title}
      </h2>
      {children}
    </section>
  )
}

function SegRow({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="seg-row">
      <span className="lbl">{label}</span>
      {children}
    </div>
  )
}

function Slider({ id, label, value, min, max, step, show, hint, onChange }: { id: string; label: string; value: number; min: number; max: number; step: number; show: (v: number) => string; hint?: string; onChange: (v: number) => void }) {
  return (
    <div className="field slider">
      <label htmlFor={id}>
        {label} <output htmlFor={id}>{show(value)}</output>
      </label>
      <input id={id} type="range" min={min} max={max} step={step} value={value} onChange={(e) => onChange(Number(e.target.value))} />
      {hint && <p className="hint">{hint}</p>}
    </div>
  )
}
