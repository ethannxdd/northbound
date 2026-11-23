import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { CITIES, photoUrl } from '@shared/cities'
import { dayMonthYear, monthYear, monthsBetween } from '@shared/dates'
import { progress, runwayMonths, upfrontCosts } from '@shared/engine'
import type { Line, Task } from '@shared/timeline'
import { ScenarioSwitcher } from '../components/Shell'
import { LINE_COLOR, StopSheet, shortTitle, useTimeline } from '../components/TransitMap'
import { useApp } from '../lib/app'
import { gbp, pct, plural, zar } from '../lib/format'
import { AnimatedMoney, useWide } from '../lib/ui'

const LINE_LABEL: Record<Line, string> = { paper: 'Paperwork', money: 'Money', move: 'Move', trunk: 'Main line' }

/** Home: your number on the city photo, how far you've come, and what's next. */
export default function Trip() {
  const { input, plan, savings, done, today, savingsSource, active, deposits, profile, overrides } = useApp()
  const tasks = useTimeline()
  const wide = useWide()
  const [openKey, setOpenKey] = useState<string | null>(null)
  const city = CITIES[input.city]
  const prog = progress(savings.savedZar, plan.targetZar)
  const monthsToGo = Math.max(0, monthsBetween(today, plan.landDate))
  const upcoming = tasks.filter((t) => !done.has(t.key) && !(t.key === 'saving' && savings.monthlyZar > 0)).slice(0, 3)
  const open = tasks.find((t) => t.key === openKey) ?? null
  const needed = Math.ceil(plan.neededPerMonthZar / 100) * 100
  const perMonth = input.landMode === 'date' && plan.remainingZar > 0 && plan.fundsDeadline > today ? needed : savings.monthlyZar
  const itemCount = useMemo(() => upfrontCosts(input, plan.landDate, overrides).groups.reduce((a, g) => a + g.items.length, 0), [input, plan.landDate, overrides])
  const quoted = 0
  const runway = runwayMonths(input)
  const lastDeposit = deposits[0]
  const pace = paceNote(plan, input.landMode, savings.monthlyZar, needed, today)

  return (
    <div className="main">
      <div className="trip-bar">
        <ScenarioSwitcher />
        <Link to={`/scenario/${active._id}`} className="btn solid">
          Edit scenario
        </Link>
      </div>

      <div className="trip-row">
        <section aria-label="Your number" className="hero-card span2">
          <div className="photo-slot">
            <img src={photoUrl(city.photo, wide ? 1800 : 1000)} alt={`${city.name} from above`} />
          </div>
          <div className="chips">
            <span className="glass-chip">
              {input.landMode === 'saved' ? 'Landing around' : 'Landing'} {monthYear(plan.landDate)}
            </span>
            <span className="glass-chip sub">UK Ancestry visa</span>
            <span className="glass-chip sub" style={{ marginLeft: 'auto', fontSize: 11 }}>
              Photo: {city.photoCredit}
            </span>
          </div>
          <div className="hero-panel glass">
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <span className="lbl">Save before you go</span>
              <AnimatedMoney className="bignum" value={plan.targetZar} format={(n) => zar(n)} />
              <span className="sub">
                {gbp(plan.targetGbp)} to land in {city.name} with {plural(runway, 'month')} of runway
              </span>
            </div>
            <div className="hero-stats">
              <div>
                <b>{monthsToGo}</b>
                <small>months to go</small>
              </div>
              <div>
                <b>{pct(prog.pct)}</b>
                <small>saved</small>
              </div>
              <div>
                <b>{zar(perMonth, 100)}</b>
                <small>{input.landMode === 'date' ? 'needed a month' : 'saving a month'}</small>
              </div>
              <div className="mine">
                <b>
                  {quoted} of {itemCount}
                </b>
                <small>costs you've quoted</small>
              </div>
            </div>
          </div>
        </section>

        <section aria-labelledby="far" className="card" style={{ display: 'flex', flexDirection: 'column', gap: 16, borderRadius: 'var(--r-hero)' }}>
          <div className="card-h">
            <h2 id="far" className="h2">
              <Link to="/progress">How far you've come</Link>
            </h2>
            {savingsSource === 'loot' ? (
              <span className="tag ok">Loot linked</span>
            ) : (
              <Link to="/settings/loot" className="tag mine">
                Link Loot
              </Link>
            )}
          </div>
          <div className="mini-route">
            <div className="rail" aria-hidden="true">
              <span className="end" />
              <span className="gap" style={{ flex: Math.max(0.08, 1 - prog.pct) }} />
              <span className="you">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 20V4M6 10l6-6 6 6" />
                </svg>
              </span>
              <span className="gone" style={{ flex: Math.max(0.08, prog.pct) }} />
              <span className="start" />
            </div>
            <div className="labels">
              <div>
                <b>{city.name}</b>
                <small>{plan.remainingZar > 0 ? `${zar(plan.remainingZar)} still to go` : 'Fully saved'}</small>
              </div>
              <div>
                <span className="here">{prog.place.over === 'there' ? 'You have it all' : `You're ${prog.place.over}`}</span>
                <small>
                  {zar(savings.savedZar)} saved
                  {lastDeposit ? ` · +${zar(Number(lastDeposit.amount))} from Loot on ${dayMonthYear(lastDeposit.created_at.slice(0, 10))}` : ''}
                </small>
              </div>
              <div>
                <b>Cape Town</b>
                <small>Started {monthYear(new Date(profile._creationTime).toISOString().slice(0, 10))}</small>
              </div>
            </div>
          </div>
          {pace && (
            <div className={`note ${pace.tone}`} role="status">
              {pace.text}
            </div>
          )}
        </section>
      </div>

      <div className="trip-row">
        <section aria-labelledby="next" className="card span2" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div className="card-h">
            <h2 id="next" className="h2">
              Next stops
            </h2>
            <Link to="/map">Open the map</Link>
          </div>
          {upcoming.map((t) => (
            <NextStop key={t.key} t={t} today={today} city={city.name} onOpen={() => setOpenKey(t.key)} />
          ))}
          {upcoming.length === 0 && <p className="muted">Every step is done. Enjoy the move.</p>}
        </section>

        <Link to="/money" className="card link" aria-label="Baseline versus your quotes. Review costs">
          <h2 className="h2">Baseline vs your quotes</h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <div className="vs-row">
              <span>
                <span className="key-base" aria-hidden="true" />
                Baseline
              </span>
              <b>{gbp(plan.targetGbp)}</b>
            </div>
            <div className="vs-row">
              <span>
                <span className="key-mine" aria-hidden="true" />
                With your quotes
              </span>
              <b>{gbp(plan.targetGbp)}</b>
            </div>
          </div>
          <div className="note">No quotes yet. Add the prices you find and Northbound uses them instead of the baseline.</div>
          <span className="go">Review costs</span>
        </Link>
      </div>

      <StopSheet task={open} onClose={() => setOpenKey(null)} />
    </div>
  )
}

/** The off-pace warning, in plain words. Null when there's nothing to say. */
function paceNote(plan: ReturnType<typeof useApp>['plan'], mode: 'date' | 'saved', monthlyZar: number, needed: number, today: string): { tone: 'warn' | 'ok'; text: string } | null {
  if (plan.remainingZar <= 0) return { tone: 'ok', text: 'You have the full amount. Keep it in your own account until you apply for the visa.' }
  if (mode === 'date') {
    if (plan.fundsDeadline <= today) return { tone: 'warn', text: `The money needed to be in your account by ${monthYear(plan.fundsDeadline)}. Move the date, or switch to "When I've saved enough".` }
    if (monthlyZar <= 0) return { tone: 'warn', text: `Set what you save each month to see if you're on track. You need ${zar(needed)} a month.` }
    if (plan.onTrack) return { tone: 'ok', text: `At ${zar(monthlyZar, 100)} a month you're on track for ${monthYear(plan.fundsDeadline)}.` }
    const late = plan.readyDate ? monthsBetween(plan.fundsDeadline, plan.readyDate) : 0
    return {
      tone: 'warn',
      text: `At ${zar(monthlyZar, 100)} a month you'd have it all by ${plan.readyDate ? monthYear(plan.readyDate) : 'never'}, ${plural(late, 'month')} after the visa deadline. Save ${zar(needed)} a month, or move the date.`,
    }
  }
  if (monthlyZar <= 0 || !plan.readyDate) return { tone: 'warn', text: 'Add a monthly saving so Northbound can work out when you can go.' }
  return null
}

function NextStop({ t, today, city, onOpen }: { t: Task; today: string; city: string; onOpen: () => void }) {
  const now = t.due <= today
  const detail = [t.from, t.cost ?? t.takes].filter(Boolean).join(', ')
  return (
    <button type="button" className="linkrow" onClick={onOpen} style={{ ['--k' as string]: LINE_COLOR[t.line] }}>
      <span className="dot" aria-hidden="true" />
      <span className="txt">
        <b>{shortTitle(t, city)}</b>
        <small>
          {LINE_LABEL[t.line]}
          {detail ? ` · ${detail}` : ''}
        </small>
      </span>
      <span className={`tag${now ? ' danger' : ''}`}>{now ? 'Due now' : monthYear(t.due)}</span>
    </button>
  )
}

/** Kept for screens that still list steps the old way. */
export function StepCard({ t, today, city, onOpen }: { t: Task; today: string; city: string; onOpen: () => void }) {
  return <NextStop t={t} today={today} city={city} onOpen={onOpen} />
}
