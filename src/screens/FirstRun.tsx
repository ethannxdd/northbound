import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useMutation } from 'convex/react'
import { api } from '../../convex/_generated/api'
import { addMonths, firstOfMonth, todayIso } from '@shared/dates'
import { DEFAULT_SCENARIO, type ScenarioInput } from '@shared/types'
import { CAPE_TOWN, CITIES, photoUrl, type CityId, type Housing } from '@shared/cities'
import { plan as planOf } from '@shared/engine'
import { AnimatedMoney, MoneyInput } from '../lib/ui'
import { useMe } from '../lib/app'
import { zar } from '../lib/format'

type When = 'saved' | 'year' | 'two' | 'pick'

export default function FirstRun() {
  const onboard = useMutation(api.data.onboard)
  const navigate = useNavigate()
  const [step, setStep] = useState(0)
  const [when, setWhen] = useState<When>('saved')
  const [pick, setPick] = useState(addMonths(firstOfMonth(todayIso()), 24))
  const [city, setCity] = useState<CityId>('manchester')
  const [housing, setHousing] = useState<Housing>('room')
  const [partner, setPartner] = useState(false)
  const [married, setMarried] = useState(false)
  const [since, setSince] = useState('')
  const [saved, setSaved] = useState(0)
  const [monthly, setMonthly] = useState(0)
  const [rent, setRent] = useState(0)
  const [income, setIncome] = useState(0)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  const today = firstOfMonth(todayIso())
  const total = 4
  const me = useMe()
  const liveRate = me?.fx.length ? Math.round(me.fx[me.fx.length - 1].zarPerGbp * 100) / 100 : null

  function next() {
    setError(null)
    if (step === 0 && when === 'pick' && pick <= todayIso()) return setError('Pick a date in the future.')
    if (step === 3) {
      if (when === 'saved' && monthly <= 0 && saved <= 0) return setError('Enter what you save each month, so the date can be worked out.')
      return void finish()
    }
    setStep(step + 1)
  }

  function draftScenario(): ScenarioInput {
    const landDate = when === 'year' ? addMonths(today, 12) : when === 'two' ? addMonths(today, 24) : when === 'pick' ? pick : addMonths(today, 24)
    return {
      ...DEFAULT_SCENARIO,
      name: `${city === 'manchester' ? 'Manchester' : 'London'}, ${partner ? 'with partner' : 'solo'}`,
      landMode: when === 'saved' ? 'saved' : 'date',
      landDate,
      city,
      housing,
      partner,
      partnerMarried: married,
      partnerSince: since || null,
    }
  }
  const draft = draftScenario()
  const live = planOf(liveRate ? { ...draft, rate: liveRate } : draft, { savedZar: saved, monthlyZar: monthly }, todayIso())

  async function finish() {
    setBusy(true)
    const scenario = draftScenario()
    try {
      await onboard({ savedZar: saved, monthlyZar: monthly, homeRentZar: rent, homeIncomeZar: income, scenario })
      navigate('/', { replace: true })
    } catch {
      setError("Couldn't save. Check your connection and try again.")
      setBusy(false)
    }
  }

  return (
    <div className="fr">
      <div className="fr-photos" aria-hidden="true">
        <div className="fr-ph top">
          <img src={photoUrl(CAPE_TOWN.photo, 1200)} alt="" />
          <span>Cape Town</span>
        </div>
        <div className="fr-line" />
        <div className="fr-ph bottom">
          <img src={photoUrl(CITIES[city].photo, 1200)} alt="" />
          <span>{CITIES[city].name}</span>
          <div className="fr-live glass">
            <small>Your number so far</small>
            <AnimatedMoney className="fr-num" value={live.targetZar} format={(n) => zar(n, 1000)} />
            <small>Updates with each answer</small>
          </div>
        </div>
      </div>
      <form className="fr-body" onSubmit={(e) => (e.preventDefault(), next())}>
        <div className="fr-top">
          <span className="fr-brand">northbound</span>
          <div className="fr-dots" role="progressbar" aria-valuemin={1} aria-valuemax={total} aria-valuenow={step + 1} aria-label={`Question ${step + 1} of ${total}`}>
            {Array.from({ length: total }, (_, i) => (
              <i key={i} className={i === step ? 'on' : i < step ? 'done' : ''} />
            ))}
          </div>
        </div>
        <span className="muted small strong">
          Let's find your number · {step + 1} of {total}
        </span>

        {step === 0 && (
          <>
            <h1 className="q">When would you like to land in the UK?</h1>
            <Chip on={when === 'saved'} onClick={() => setWhen('saved')} title="When I've saved enough" sub="The date moves with your savings" />
            <Chip on={when === 'year'} onClick={() => setWhen('year')} title="Within a year" sub="Tight, but doable if your papers are ready" />
            <Chip on={when === 'two'} onClick={() => setWhen('two')} title="In about 2 years" sub="Time to save and sort certificates" />
            <Chip on={when === 'pick'} onClick={() => setWhen('pick')} title="Pick a date" />
            {when === 'pick' && (
              <>
                <label htmlFor="pick">Landing date</label>
                <input id="pick" className="input" type="date" value={pick} min={todayIso()} onChange={(e) => setPick(e.target.value)} />
              </>
            )}
          </>
        )}

        {step === 1 && (
          <>
            <h1 className="q">Where are you heading?</h1>
            <Chip on={city === 'manchester'} onClick={() => setCity('manchester')} title="Manchester" sub="Cheaper rent, growing tech scene" />
            <Chip on={city === 'london'} onClick={() => setCity('london')} title="London" sub="More jobs, higher costs" />
            <h2 className="q2">Where will you live at first?</h2>
            <Chip on={housing === 'room'} onClick={() => setHousing('room')} title="A room in a shared house" />
            <Chip on={housing === 'studio'} onClick={() => setHousing('studio')} title="A studio" />
            <Chip on={housing === 'onebed'} onClick={() => setHousing('onebed')} title="A 1-bed flat" />
          </>
        )}

        {step === 2 && (
          <>
            <h1 className="q">Who's coming?</h1>
            <Chip on={!partner} onClick={() => setPartner(false)} title="Just me" />
            <Chip on={partner} onClick={() => setPartner(true)} title="Me and a partner" sub="They can come as your dependant" />
            {partner && (
              <>
                <Chip on={married} onClick={() => setMarried(!married)} title="We're married or in a civil partnership" />
                {!married && (
                  <>
                    <label htmlFor="since">When did your relationship start?</label>
                    <input id="since" className="input" type="date" value={since} max={todayIso()} onChange={(e) => setSince(e.target.value)} />
                    <p className="hint" style={{ marginTop: 8 }}>
                      Unmarried partners need to have been together for 2 years when you apply.
                    </p>
                  </>
                )}
              </>
            )}
          </>
        )}

        {step === 3 && (
          <>
            <h1 className="q">What have you saved so far?</h1>
            <p className="hint">You can link your Loot goal afterwards, and it will keep this up to date for you.</p>
            <label htmlFor="saved">Saved for the move</label>
            <MoneyInput id="saved" value={saved} onChange={setSaved} />
            <label htmlFor="monthly">You save each month</label>
            <MoneyInput id="monthly" value={monthly} onChange={setMonthly} />
            <label htmlFor="rent">Your rent in Cape Town now (optional)</label>
            <MoneyInput id="rent" value={rent} onChange={setRent} />
            <label htmlFor="income">Your take-home pay now (optional)</label>
            <MoneyInput id="income" value={income} onChange={setIncome} />
          </>
        )}

        {error && (
          <p className="error" role="alert">
            {error}
          </p>
        )}
        <div className="actions">
          {step > 0 && (
            <button type="button" className="btn quiet" onClick={() => setStep(step - 1)}>
              Back
            </button>
          )}
          <button type="submit" className="btn primary lg" disabled={busy}>
            {step === 3 ? (busy ? 'Working it out…' : 'Show my number') : 'Continue'}
          </button>
        </div>
      </form>
    </div>
  )
}

function Chip({ on, onClick, title, sub }: { on: boolean; onClick: () => void; title: string; sub?: string }) {
  return (
    <button type="button" className="chip" aria-pressed={on} onClick={onClick}>
      <span className="chip-txt">
        <b>{title}</b>
        {sub && <small>{sub}</small>}
      </span>
      <span className="ring" aria-hidden="true" />
    </button>
  )
}
