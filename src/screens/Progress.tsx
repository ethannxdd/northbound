import { Link } from 'react-router-dom'
import { dayMonthYear, monthYear, monthsBetween } from '@shared/dates'
import { cityOf, progress, routePlaces } from '@shared/engine'
import { LootCard } from '../components/Shell'
import SavingPlan from '../components/SavingPlan'
import FundingCard from '../components/FundingCard'
import { useApp } from '../lib/app'
import { pct, plural, zar } from '../lib/format'

function ago(ts: number | null): string {
  if (!ts) return ''
  const m = Math.round((Date.now() - ts) / 60000)
  return m < 1 ? 'just now' : m === 1 ? '1 min ago' : `${m} min ago`
}

const WAYPOINTS = [
  { at: 0.9, name: 'Over the Mediterranean' },
  { at: 0.75, name: 'Over the Sahara' },
  { at: 0.6, name: 'Lake Chad' },
  { at: 0.4, name: 'Congo River' },
  { at: 0.2, name: 'Namibia' },
]

type Kind = 'end' | 'you' | 'passed' | 'ahead'

export default function Progress() {
  const { input, plan, savings, goal, deposits, goalUpdatedAt, savingsSource, today, goalMissing, profile, active } = useApp()
  const city = cityOf(input).name
  const places = routePlaces(input)
  const prog = progress(savings.savedZar, plan.saveTargetZar, places)
  const dateMode = input.landMode === 'date'
  const needed = Math.ceil(plan.neededPerMonthZar / 100) * 100
  const monthsLeft = Math.max(0, monthsBetween(today, plan.fundsDeadline))
  const late = plan.readyDate && plan.readyDate > plan.fundsDeadline ? monthsBetween(plan.fundsDeadline, plan.readyDate) : null
  const offPace = plan.remainingZar > 0 && (dateMode ? !plan.onTrack : savings.monthlyZar <= 0)

  // The route, top (city) to bottom (Cape Town), with you placed by how much you've saved.
  const stops: { name: string; sub: string; kind: Kind; at: number }[] = [{ name: city, sub: `100% · ${zar(plan.saveTargetZar, 1000)}`, kind: prog.pct >= 1 ? 'you' : 'end', at: 1 }]
  // The UK route has its own named stops; an imported plan names its own places along the flight.
  const waypoints = input.pack ? places.filter((x) => x.at > 0 && x.at < 1).map((x) => ({ at: x.at, name: x.over.replace(/^over /, 'Over ') })) : WAYPOINTS
  for (const w of waypoints) {
    if (Math.abs(w.at - prog.pct) < 0.04) continue
    stops.push({ name: w.name, sub: `${pct(w.at)} · ${zar(plan.saveTargetZar * w.at, 1000)}`, kind: prog.pct >= w.at ? 'passed' : 'ahead', at: w.at })
  }
  if (prog.pct < 1) stops.push({ name: prog.pct > 0 ? `You're ${prog.place.over}` : "You're still in Cape Town", sub: `${pct(prog.pct)} · ${zar(savings.savedZar)} saved`, kind: 'you', at: prog.pct })
  stops.sort((a, b) => b.at - a.at)
  stops.push({ name: 'Cape Town', sub: `Started ${monthYear(new Date(profile._creationTime).toISOString().slice(0, 10))}`, kind: 'passed', at: -1 })

  const tiles: [string, string][] = [
    ['Saved', zar(savings.savedZar)],
    ['Still to go', zar(plan.remainingZar, 100)],
    ['Your pace', `${zar(savings.monthlyZar, 100)}/mo`],
    ["You'll have it all", plan.remainingZar <= 0 ? 'Now' : plan.readyDate ? monthYear(plan.readyDate) : 'Not yet'],
    ['Money must show by', monthYear(plan.fundsDeadline)],
    ['Months left', String(monthsLeft)],
  ]

  return (
    <div className="main">
      <div className="stack" style={{ gap: 6 }}>
        <h1 className="h1">How far you've come</h1>
        <p className="muted" style={{ margin: 0 }}>
          {pct(prog.pct)} of the way · {zar(savings.savedZar, 100)} saved, {zar(plan.remainingZar, 1000)} to go
          {plan.borrowedZar > 0 ? ` · the move costs ${zar(plan.targetZar, 1000)}, ${zar(plan.borrowedZar, 1000)} of it borrowed` : ''}
          {savingsSource === 'loot' && goal ? ` · following your Loot goal "${goal.name}", ${ago(goalUpdatedAt)}` : ''}
        </p>
      </div>

      {savingsSource !== 'loot' && (
        <div style={{ maxWidth: 560 }}>
          {goalMissing && (
            <p className="error" style={{ margin: '0 0 8px' }}>
              The linked Loot goal can't be found. It may have been deleted in Loot.
            </p>
          )}
          <LootCard />
        </div>
      )}

      <div className="prog-layout">
        <section aria-label="Your route" className="card prog-route">
          <ol>
            {stops.map((s) => (
              <li key={s.name} className={s.kind}>
                <span className="pr-dot" aria-hidden="true" />
                <span className="pr-txt">
                  <b>{s.name}</b>
                  <small>{s.sub}</small>
                </span>
              </li>
            ))}
          </ol>
        </section>

        <div className="prog-main">
          <section aria-label="Numbers" className="num-tiles">
            {tiles.map(([k, v]) => (
              <div key={k} className="num-tile">
                <span>{k}</span>
                <b>{v}</b>
              </div>
            ))}
          </section>

          {!offPace && <SavingPlan plan={plan} mode={input.landMode} monthlyZar={savings.monthlyZar} today={today} />}

          {offPace && (
            <section aria-labelledby="pace-h" className="warn-card">
              <div className="stack" style={{ gap: 4 }}>
                <h2 id="pace-h" className="h3">
                  {late !== null ? `At this pace you miss the visa deadline by ${plural(late, 'month')}` : dateMode && plan.fundsDeadline <= today ? 'The visa deadline has passed for this date' : 'Add a monthly saving to see when you can go'}
                </h2>
                <p style={{ margin: 0 }}>
                  Your bank statements must show the full amount when you apply, and you can apply up to 3 months before you fly. Pick a fix:
                </p>
              </div>
              <div className="fixes">
                <Link to="/settings/savings" className="fix">
                  <span>Save more</span>
                  <b>{dateMode ? `${zar(needed)}/mo` : 'Set a monthly saving'}</b>
                  <small>{dateMode ? `to have it by ${monthYear(plan.fundsDeadline)}` : 'so Northbound can date the move'}</small>
                </Link>
                <Link to={`/scenario/${active._id}`} className="fix">
                  <span>Move the date</span>
                  <b>{plan.paceLandDate ? monthYear(plan.paceLandDate) : 'Later'}</b>
                  <small>{plan.paceLandDate ? 'the landing your pace supports' : 'once you have a monthly saving'}</small>
                </Link>
                <Link to="/settings/loans" className="fix mine">
                  <span>Borrow part</span>
                  <b>{zar(Math.max(0, plan.remainingZar - savings.monthlyZar * monthsLeft), 1000)}</b>
                  <small>a loan or card for the gap; repayments show in Life</small>
                </Link>
              </div>
            </section>
          )}

          <FundingCard />

          {deposits.length > 0 && (
            <section className="card" aria-labelledby="dep">
              <h2 id="dep" className="h3" style={{ marginBottom: 6 }}>
                Recent deposits in Loot
              </h2>
              <ul className="dep-list">
                {deposits.slice(0, 5).map((d) => (
                  <li key={d.id}>
                    <span>{dayMonthYear(d.created_at.slice(0, 10))}</span>
                    <b>+{zar(Number(d.amount))}</b>
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
