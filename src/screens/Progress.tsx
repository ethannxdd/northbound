import { CITIES } from '@shared/cities'
import { dayMonthYear, longMonthYear, monthYear, monthsBetween } from '@shared/dates'
import { progress, ROUTE_PLACES } from '@shared/engine'
import { LootCard, PageHead } from '../components/Shell'
import { useApp } from '../lib/app'
import { pct, zar } from '../lib/format'
import { useOpening } from '../lib/ui'

function ago(ts: number | null): string {
  if (!ts) return ''
  const m = Math.round((Date.now() - ts) / 60000)
  return m < 1 ? 'just now' : m === 1 ? '1 min ago' : `${m} min ago`
}

export default function Progress() {
  const { input, plan, savings, goal, deposits, goalUpdatedAt, savingsSource, today, goalMissing } = useApp()
  useOpening()
  const city = CITIES[input.city].name
  const prog = progress(savings.savedZar, plan.targetZar)
  const top = 20
  const bottom = 300
  const yAt = (f: number) => bottom - f * (bottom - top)
  const youY = yAt(prog.pct)
  const shown = ROUTE_PLACES.filter((p) => p.at > 0 && p.at < 1 && Math.abs(yAt(p.at) - youY) > 22 && [0.15, 0.35, 0.55, 0.7, 0.85].includes(p.at))
  const monthsLeft = plan.readyDate ? Math.max(0, monthsBetween(today, plan.readyDate)) : null
  const lastDeposit = deposits[0]

  return (
    <div className="screen-progress">
      <PageHead dark title={prog.pct >= 1 ? 'You have it all' : `You're ${prog.place.over}`} sub={`${pct(prog.pct)} of the way. ${zar(savings.savedZar, 100)} saved, ${zar(plan.remainingZar, 1000)} to go.`} />
      {savingsSource === 'loot' && goal ? (
        <div className="synced">
          Synced with your Loot goal "{goal.name}", {ago(goalUpdatedAt)}
        </div>
      ) : (
        <div className="progress-link" style={{ padding: '12px 14px 0' }}>
          {goalMissing && <p className="error" style={{ margin: '0 0 8px' }}>The linked Loot goal can't be found. It may have been deleted in Loot.</p>}
          <LootCard />
        </div>
      )}
      <div className="progress-grid">
      <div className="route" style={{ padding: '6px 12px 0' }}>
        <svg viewBox="0 0 320 320" role="img" aria-label={`Route from Cape Town to ${city}. You've saved ${pct(prog.pct)}, which puts you ${prog.place.over}.`}>
          <line x1="40" x2="40" y1={bottom} y2={top} className="track" strokeWidth="8" strokeLinecap="round" />
          {prog.pct > 0 && <path d={`M40 ${bottom} V${youY}`} className="gone draw" strokeWidth="8" strokeLinecap="round" fill="none" pathLength={1} style={{ ['--d' as string]: '200ms' }} />}
          <circle cx="40" cy={bottom} r="7" className="you" strokeWidth="3" />
          {shown.map((p) => (
            <circle key={p.name} cx="40" cy={yAt(p.at)} r="5" strokeWidth="3" className={`stn${prog.pct >= p.at ? ' past' : ''}`} />
          ))}
          <circle cx="40" cy={top} r="9" strokeWidth="4" className="end" />
          <circle cx="40" cy={youY} r="11" strokeWidth="3" className="you" />
          <g fontSize="13.5">
            <text x="66" y={top + 4} fontWeight="800" fontSize="15">
              {city}
            </text>
            <text x="310" y={top + 4} textAnchor="end" className="m">
              {zar(plan.targetZar, 1000)}
            </text>
            {shown.map((p) => (
              <g key={p.name}>
                <text x="66" y={yAt(p.at) + 4} className="m">
                  {p.name === 'Mediterranean' ? 'Over the Mediterranean' : p.name}
                </text>
                <text x="310" y={yAt(p.at) + 4} textAnchor="end" className="m">
                  {pct(p.at)}
                </text>
              </g>
            ))}
            <text x="66" y={youY + (prog.pct > 0.9 ? 22 : -2)} fontWeight="800">
              You, {prog.place.over === 'there' ? 'ready to go' : prog.place.over}
            </text>
            {lastDeposit && (
              <text x="66" y={youY + (prog.pct > 0.9 ? 38 : 15)} className="m" fontSize="12.5">
                +{zar(Number(lastDeposit.amount))} from Loot on {dayMonthYear(lastDeposit.created_at.slice(0, 10))}
              </text>
            )}
            {prog.pct > 0.06 && (
              <text x="66" y={bottom + 4} className="m">
                Cape Town
              </text>
            )}
          </g>
        </svg>
      </div>
      <div className="progress-side">
      <div className="stats3">
        <div>
          <small>Saving a month</small>
          <b>{zar(savings.monthlyZar, 100)}</b>
        </div>
        <div>
          <small>Ready by</small>
          <b>{plan.readyDate ? monthYear(plan.readyDate) : 'Not yet'}</b>
        </div>
        <div>
          <small>Months left</small>
          <b>{monthsLeft ?? '–'}</b>
        </div>
      </div>
      <div style={{ padding: '10px 14px 20px' }}>
        {input.landMode === 'date' && !plan.onTrack && plan.remainingZar > 0 ? (
          <div className="sign" role="status">
            <span className="stop" aria-hidden="true" />
            <span>
              For a {monthYear(plan.landDate)} landing, the money must be in your account by {longMonthYear(plan.fundsDeadline)}. Save {zar(plan.neededPerMonthZar, 100)} a month to make it.
              {plan.paceLandDate && <small>Or land in {longMonthYear(plan.paceLandDate)} instead</small>}
            </span>
          </div>
        ) : (
          <div className="sign" role="status">
            <span className="stop ok" aria-hidden="true" />
            <span>
              {plan.remainingZar <= 0
                ? 'Your savings cover the move. Time to book the TB test and apply.'
                : `On track. The money needs to be in your account by ${longMonthYear(plan.fundsDeadline)}, for a landing ${input.landMode === 'saved' ? 'around ' : 'on '}${longMonthYear(plan.landDate)}.`}
            </span>
          </div>
        )}
      </div>
      {deposits.length > 0 && (
        <section className="sec" aria-labelledby="dep">
          <h2 id="dep">Recent deposits in Loot</h2>
          <ul className="list">
            {deposits.slice(0, 5).map((d) => (
              <li key={d.id} className="row">
                <span>{dayMonthYear(d.created_at.slice(0, 10))}</span>
                <b>{zar(Number(d.amount))}</b>
              </li>
            ))}
          </ul>
        </section>
      )}
      </div>
      </div>
    </div>
  )
}
