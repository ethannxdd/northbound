import { useState } from 'react'
import { Link } from 'react-router-dom'
import { CITIES, photoUrl } from '@shared/cities'
import { longMonthYear, monthsBetween, monthYear } from '@shared/dates'
import { progress } from '@shared/engine'
import type { Task } from '@shared/timeline'
import Icon from '../components/Icon'
import SavingPlan from '../components/SavingPlan'
import { LootCard, ScenarioSwitcher } from '../components/Shell'
import TransitMap, { LINE_COLOR, StopSheet, shortTitle, useTimeline } from '../components/TransitMap'
import { useApp } from '../lib/app'
import { gbp, pct, words, zar, zarShort } from '../lib/format'
import { useOpening, useWide } from '../lib/ui'

/** Home: your move as an upcoming trip. */
export default function Trip() {
  const { input, plan, savings, done, today, savingsSource, active, goal } = useApp()
  const tasks = useTimeline()
  const wide = useWide()
  const [openKey, setOpenKey] = useState<string | null>(null)
  useOpening()
  const city = CITIES[input.city]
  const prog = progress(savings.savedZar, plan.targetZar)
  const monthsToGo = Math.max(0, monthsBetween(today, plan.landDate))
  const upcoming = tasks.filter((t) => !done.has(t.key) && !(t.key === 'saving' && savings.monthlyZar > 0)).slice(0, wide ? 4 : 3)
  const open = tasks.find((t) => t.key === openKey) ?? null
  const perMonth = input.landMode === 'date' && plan.remainingZar > 0 && plan.fundsDeadline > today ? Math.ceil(plan.neededPerMonthZar / 100) * 100 : savings.monthlyZar

  const stats = (
    <div className="stats">
      <div>
        <b>{monthsToGo}</b>
        <small>months to go</small>
      </div>
      <div>
        <b>{pct(prog.pct)}</b>
        <small>saved</small>
      </div>
      <div>
        <b>{zarShort(perMonth)}</b>
        <small>{input.landMode === 'date' ? 'needed a month' : 'a month'}</small>
      </div>
    </div>
  )

  const comingUp = (
    <section aria-labelledby="up">
      <div className="section-h">
        <h2 id="up" className="h2">
          Coming up
        </h2>
        <Link to="/map">See the map</Link>
      </div>
      <div className="stack" style={{ gap: 8 }}>
        {upcoming.map((t) => (
          <StepCard key={t.key} t={t} today={today} city={city.name} onOpen={() => setOpenKey(t.key)} />
        ))}
        {upcoming.length === 0 && <p className="muted">Every step is done. Enjoy the move.</p>}
      </div>
    </section>
  )

  const numberCard = (
    <div className="card lift trip-number">
      <span className="muted small">You need</span>
      <span className="num">{zar(plan.targetZar, 1000)}</span>
      <span className="muted small">
        {gbp(plan.targetGbp, 100)} at R{input.rate.toFixed(2)}. {pct(prog.pct)} saved, {zar(plan.remainingZar, 1000)} to go.
      </span>
      <div className="track reveal-x" style={{ ['--d' as string]: '200ms', margin: '8px 0 4px' }}>
        <i style={{ width: `${prog.pct * 100}%` }} />
      </div>
      <SavingPlan plan={plan} mode={input.landMode} monthlyZar={savings.monthlyZar} today={today} compact />
      <Link to={`/scenario/${active._id}`} className="btn grad block" style={{ marginTop: 6 }}>
        Edit this plan
      </Link>
      <Link to="/progress" className="btn quiet block">
        How far you've come
      </Link>
      {savingsSource === 'loot' && goal && <span className="tiny muted" style={{ textAlign: 'center' }}>Synced with your Loot goal "{goal.name}"</span>}
    </div>
  )

  return (
    <div className="trip">
      <div className="hero">
        <img src={photoUrl(city.photo, wide ? 2000 : 1000)} alt={`${city.name} from above`} />
        <div className="hero-top on-photo">
          <span className="brand">northbound</span>
          <ScenarioSwitcher />
        </div>
        <div className="hero-text">
          <div className="kicker">
            Your move, Ancestry visa{wide ? `, ${monthsToGo} months to go` : ''}
          </div>
          <h1 className="display">Cape Town to {city.name}</h1>
          <p className="lede" style={{ display: wide ? 'block' : 'none' }}>
            {input.landMode === 'saved' ? 'Land around' : 'Landing'} {longMonthYear(plan.landDate)} with {words(input.jobHuntMonths)} month{input.jobHuntMonths === 1 ? '' : 's'} to find work.
          </p>
        </div>
        <span className="credit">Photo: {city.photoCredit}</span>
      </div>

      {wide ? (
        <div className="trip-grid">
          <div className="col">
            <div className="card">{stats}</div>
            <div className="card">{comingUp}</div>
            {savingsSource !== 'loot' && <LootCard />}
          </div>
          <div className="col">
            <div className="card">
              <div className="section-h">
                <h2 className="h2">Itinerary</h2>
                <Link to="/map">Open map</Link>
              </div>
              <TransitMap />
            </div>
          </div>
          <div className="col">{numberCard}</div>
        </div>
      ) : (
        <div className="trip-grid">
          {stats}
          {numberCard}
          {comingUp}
          {savingsSource !== 'loot' && <LootCard />}
          <Link to="/paperwork" className="loot-card">
            <Icon name="docs" size={22} />
            <span>
              <b>Paperwork tracker</b>
              <small>Certificates, passport, TB test and statements</small>
            </span>
            <Icon name="chevron" size={18} />
          </Link>
        </div>
      )}
      <StopSheet task={open} onClose={() => setOpenKey(null)} />
    </div>
  )
}

export function StepCard({ t, today, city, onOpen }: { t: Task; today: string; city: string; onOpen: () => void }) {
  const now = t.due <= today
  const [y, m] = t.due.split('-')
  const mon = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'][Number(m) - 1]
  return (
    <button type="button" className="resv" onClick={onOpen}>
      <span className="bar" style={{ background: LINE_COLOR[t.line] }} aria-hidden="true" />
      <span className={`date${now ? ' now' : ''}`} aria-hidden="true">
        <small>{now ? 'NOW' : mon}</small>
        <b>{now ? '●' : y.slice(2)}</b>
      </span>
      <span className="txt">
        <b>{shortTitle(t, city)}</b>
        <small>{[t.from, t.cost ?? t.takes].filter(Boolean).join(', ') || (now ? 'Due now' : `Due ${monthYear(t.due)}`)}</small>
      </span>
      <Icon name="chevron" size={18} />
    </button>
  )
}
