import { Link } from 'react-router-dom'
import { useMemo, useState } from 'react'
import { CITIES } from '@shared/cities'
import { dayMonthYear, longMonthYear, monthYear } from '@shared/dates'
import { monthlyBudget, progress, runwayMonths, runwaySeries, salaryFor } from '@shared/engine'
import { LootCard, TopBar } from '../components/Shell'
import Icon from '../components/Icon'
import SavingPlan from '../components/SavingPlan'
import TransitMap, { StopSheet, useNextStop } from '../components/TransitMap'
import { useApp } from '../lib/app'
import { gbp, pct, words, zar } from '../lib/format'
import { useOpening, useWide } from '../lib/ui'

export default function Home() {
  const { input, plan, profile, savings, overrides, today, savingsSource } = useApp()
  const next = useNextStop()
  const [openNext, setOpenNext] = useState(false)
  useOpening()
  const city = CITIES[input.city]
  const budget = monthlyBudget(input, plan.landDate, overrides)
  const series = useMemo(() => runwaySeries(input, plan.landDate, overrides), [input, plan.landDate, overrides])
  const months = runwayMonths(input)
  const max = Math.max(...series, 1)
  const prog = progress(savings.savedZar, plan.targetZar)

  return (
    <div className="home-grid">
      <div className="home-main">
        <section className="cape" aria-label="Cape Town now">
          <TopBar sun />
          <div className="city">Cape Town</div>
          <div className="facts">
            <span>Saved {zar(savings.savedZar, 100)}</span>
            <span>Saving {zar(savings.monthlyZar, 100)} a month</span>
            {profile.homeRentZar > 0 && <span>Rent {zar(profile.homeRentZar)}</span>}
            {profile.homeIncomeZar > 0 && <span>Earning {zar(profile.homeIncomeZar)}</span>}
          </div>
        </section>
        <div className="seam">
          <div className="seam-in">
            <div className="num" aria-label={`You need ${zar(plan.targetZar, 1000)}`}>
              {zar(plan.targetZar, 1000)}
            </div>
            <p className="sub">
              gets you across, with {words(input.jobHuntMonths)} month{input.jobHuntMonths === 1 ? '' : 's'} to find work. At R{input.rate.toFixed(2)} to the pound that's {gbp(plan.targetGbp, 100)}.{' '}
              {input.landMode === 'saved'
                ? plan.readyDate
                  ? `At your pace you land around ${longMonthYear(plan.landDate)}.`
                  : 'Add a monthly saving to see when you can go.'
                : plan.remainingZar > 0 && plan.fundsDeadline > today
                  ? `To land on ${longMonthYear(plan.landDate)}, save ${zar(Math.ceil(plan.neededPerMonthZar / 100) * 100)} a month.`
                  : `Landing on ${longMonthYear(plan.landDate)}.`}
            </p>
          </div>
        </div>
        <section className="uk" aria-label={`${city.name} after you land`}>
          <div className="row">
            <span className="city" style={{ marginTop: 6 }}>
              {city.name}
            </span>
            <span className="small">{input.landMode === 'saved' ? `Around ${monthYear(plan.landDate)}` : `From ${dayMonthYear(plan.landDate)}`}</span>
          </div>
          <div className="facts">
            <span>Rent {gbp(city.rent[input.housing])}</span>
            <span>Earning {gbp(salaryFor(input))}</span>
            <span>Take-home {gbp(budget.takeHome + budget.partnerTakeHome)}</span>
            <span>Left {gbp(budget.left)} a month</span>
          </div>
          <div className="bars reveal-x" style={{ ['--d' as string]: '250ms' }} role="img" aria-label={`Your savings after landing: they fall for ${months} months, then grow once you're paid.`}>
            {series.map((v, i) => (
              <i key={i} className={i === months ? 'low' : i > months ? 'pay' : ''} style={{ height: `${Math.max(i === months ? 8 : 3, (Math.max(0, v) / max) * 100)}%` }} />
            ))}
          </div>
          <div className="bl">
            <span>Land</span>
            <span>Lowest, month {months}</span>
            <span>Payday onwards</span>
          </div>
        </section>
        <div className="home-more">
          <SavingPlan plan={plan} mode={input.landMode} monthlyZar={savings.monthlyZar} today={today} />
          {next && (
            <button type="button" className="sign" onClick={() => setOpenNext(true)} style={{ border: 0, textAlign: 'left', cursor: 'pointer', font: 'inherit' }}>
              <span className={`stop${next.due > today ? ' ok' : ''}`} aria-hidden="true" />
              <span>
                <small>Next stop{next.due > today ? `, ${monthYear(next.due)}` : ''}</small>
                <b>{next.title}</b>
              </span>
            </button>
          )}
          <Link to="/progress" className="card prog-strip" aria-label={`How far you've come: ${pct(prog.pct)} saved. ${zar(plan.remainingZar, 1000)} to go.`}>
            <span className="small muted">How far you've come</span>
            <span className="small muted prog-go">
              {pct(prog.pct)} <Icon name="chevron" size={16} />
            </span>
            <b className="prog-place">{prog.pct >= 1 ? "You've saved it all" : `You're ${prog.place.over}`}</b>
            <span className="track">
              <i style={{ width: `${prog.pct * 100}%` }} />
            </span>
            <span className="small muted prog-left">{zar(plan.remainingZar, 1000)} to go</span>
          </Link>
          {savingsSource !== 'loot' && <LootCard />}
        </div>
      </div>
      <aside className="home-map side-map" aria-label="Your map">
        <DesktopMap />
      </aside>
      {next && <StopSheet task={openNext ? next : null} onClose={() => setOpenNext(false)} />}
    </div>
  )
}

/** On a wide screen the map sits beside Home. */
function DesktopMap() {
  const wide = useWide()
  if (!wide) return null
  return (
    <>
      <div className="head row" style={{ alignItems: 'center' }}>
        <h2 className="h1" style={{ fontSize: 22, margin: 0 }}>
          Your route
        </h2>
        <Link to="/map" className="btn small quiet on-dark">
          Open map
        </Link>
      </div>
      <TransitMap />
    </>
  )
}
