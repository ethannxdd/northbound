import { CITIES } from '@shared/cities'
import { dayMonthYear, monthYear, monthsBetween } from '@shared/dates'
import { progress, ROUTE_PLACES } from '@shared/engine'
import { LootCard, PageHead } from '../components/Shell'
import SavingPlan from '../components/SavingPlan'
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
    <div>
      <PageHead title={prog.pct >= 1 ? 'You have it all' : `You're ${prog.place.over}`} sub={`${pct(prog.pct)} of the way. ${zar(savings.savedZar, 100)} saved, ${zar(plan.remainingZar, 1000)} to go.`} />
      <div className="container wrap" style={{ marginTop: 8 }}>
      {savingsSource === 'loot' && goal ? (
        <div className="synced">
          <span className="dot-ok" aria-hidden="true" />
          Synced with your Loot goal "{goal.name}", {ago(goalUpdatedAt)}
        </div>
      ) : (
        <div style={{ maxWidth: 560 }}>
          {goalMissing && <p className="error" style={{ margin: '0 0 8px' }}>The linked Loot goal can't be found. It may have been deleted in Loot.</p>}
          <LootCard />
        </div>
      )}
      <div className="cols-2 stack" style={{ marginTop: 14 }}>
      <div className="card route">
        <svg viewBox="0 0 320 320" role="img" aria-label={`Route from Cape Town to ${city}. You've saved ${pct(prog.pct)}, which puts you ${prog.place.over}.`}>
          <line x1="40" x2="40" y1={bottom} y2={top} className="track-line" strokeWidth="8" strokeLinecap="round" />
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
      <div className="sticky-side stack">
      <div className="stats">
        <div>
          <small>{input.landMode === 'date' ? 'Need a month' : 'Saving a month'}</small>
          <b>{input.landMode === 'date' && plan.remainingZar > 0 ? zar(Math.ceil(plan.neededPerMonthZar / 100) * 100) : zar(savings.monthlyZar, 100)}</b>
        </div>
        <div>
          <small>{input.landMode === 'date' ? 'Have it by' : 'Ready by'}</small>
          <b>{input.landMode === 'date' ? monthYear(plan.fundsDeadline) : plan.readyDate ? monthYear(plan.readyDate) : 'Not yet'}</b>
        </div>
        <div>
          <small>Months left</small>
          <b>{input.landMode === 'date' ? Math.max(0, monthsBetween(today, plan.fundsDeadline)) : monthsLeft ?? '–'}</b>
        </div>
      </div>
      <div>
        <SavingPlan plan={plan} mode={input.landMode} monthlyZar={savings.monthlyZar} today={today} />
      </div>
      {deposits.length > 0 && (
        <section className="card" aria-labelledby="dep">
          <h2 id="dep" className="h2">Recent deposits in Loot</h2>
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
    </div>
  )
}
