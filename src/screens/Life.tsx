import { useState } from 'react'
import { CAPE_TOWN, CITIES } from '@shared/cities'
import { dayMonthYear, longMonthYear, monthIndex } from '@shared/dates'
import { cityOf, rentOf } from '@shared/engine'
import PaidCard from '../components/PaidCard'
import { toInput, useActions, useApp } from '../lib/app'
import { gbp, zar } from '../lib/format'
import { DetailToggle, RemovedList } from '../components/DetailBits'

const LETTERS = 'JFMAMJJASOND'.split('')
const HOUSING_SHORT: Record<string, string> = { room: 'Room', studio: 'Studio', onebed: '1-bed' }

export default function Life() {
  const { input, plan, active, cur } = useApp()
  const { saveScenario } = useActions()
  const [busy, setBusy] = useState<string | null>(null)
  const city = cityOf(input)
  const pack = input.pack
  const land = monthIndex(plan.landDate)
  const daylight = city.daylight
  const minLight = daylight ? Math.min(...daylight) : 0
  const coffeeZar = city.coffee ? city.coffee * input.rate : null
  const top = daylight ? Math.max(...daylight, ...CAPE_TOWN.daylight) : 1
  const ukCity = pack ? null : CITIES[input.city]
  const hiddenAreas = new Set(active.hidden ?? [])
  const areas = city.areas.filter((a) => input.area === a.id || !hiddenAreas.has(`area:${a.id}`))

  async function pickArea(id: string | undefined) {
    setBusy(id ?? 'none')
    try {
      await saveScenario({ id: active._id, scenario: { ...toInput(active), area: id } })
    } finally {
      setBusy(null)
    }
  }

  const time = pack ? pack.facts?.timeDifference : '2 hours behind'
  const timeSub = pack ? (pack.facts?.language ? `They speak ${pack.facts.language}` : null) : '1 hour from late March to late October'

  return (
    <div className="main">
      <div className="stack" style={{ gap: 6 }}>
        <h1 className="h1">Life in {city.name}</h1>
        <p className="muted" style={{ margin: 0 }}>
          A normal month once you're paid, plus daylight, prices and where you might live
        </p>
      </div>

      <div className="life-layout">
        <div className="life-main">
          <PaidCard />
        </div>
        <div className="life-side">
          {time && (
            <div className="num-tile">
              <span>Calling home</span>
              <b>{time}</b>
              {timeSub && <small className="muted">{timeSub}</small>}
            </div>
          )}
          {city.coffee !== undefined && coffeeZar !== null && (
            <div className="num-tile">
              <span>A flat white</span>
              <b>
                {cur.symbol}
                {city.coffee.toFixed(2)}
              </b>
              <small className="muted">
                {zar(coffeeZar)}, about {(coffeeZar / CAPE_TOWN.coffeeZar).toFixed(1).replace(/\.0$/, '')}× Cape Town
              </small>
            </div>
          )}
          <div className="num-tile">
            <span>Getting around</span>
            <b>{gbp(city.transport)} a month</b>
            {city.transportNote && <small className="muted">{city.transportNote}</small>}
          </div>
          {city.wetDays !== undefined && (
            <div className="num-tile">
              <span>Wet days</span>
              <b>About {city.wetDays}</b>
              <small className="muted">A year</small>
            </div>
          )}
          {daylight && (
            <section className="num-tile span2" aria-labelledby="daylight">
              <div className="card-h">
                <h2 id="daylight" className="h3" style={{ margin: 0 }}>
                  Daylight, hours a day
                </h2>
                <div className="legend-sq">
                  <span style={{ ['--k' as string]: 'var(--accent)' }}>{city.name}</span>
                  <span style={{ ['--k' as string]: 'var(--l-money)' }}>Cape Town</span>
                </div>
              </div>
              <div
                className="day-bars"
                role="img"
                aria-label={`Daylight by month. ${city.name} ranges from ${minLight} to ${Math.max(...daylight)} hours; Cape Town from ${Math.min(...CAPE_TOWN.daylight)} to ${Math.max(...CAPE_TOWN.daylight)}. You land in ${longMonthYear(plan.landDate)}.`}
              >
                {LETTERS.map((l, i) => (
                  <div key={i} className={i === land ? 'land' : ''}>
                    <span className="pair">
                      <i style={{ height: `${(daylight[i] / top) * 100}%`, background: 'var(--accent)' }} />
                      <i style={{ height: `${(CAPE_TOWN.daylight[i] / top) * 100}%`, background: 'var(--l-money)' }} />
                    </span>
                    <small>{l}</small>
                  </div>
                ))}
              </div>
              <p className="muted small" style={{ margin: 0 }}>
                You land in {longMonthYear(plan.landDate).split(' ')[0]} with about {daylight[land].toFixed(0)} hours of light. At its darkest {city.name} has under {Math.ceil(minLight)}.
              </p>
            </section>
          )}
        </div>
      </div>

      {areas.length > 0 && (
        <section className="card" aria-labelledby="areas">
          <div className="card-h">
            <h2 id="areas" className="h2">
              Where you might live
            </h2>
            {input.area ? (
              <button type="button" className="btn quiet sm" onClick={() => void pickArea(undefined)} disabled={!!busy}>
                Use the city average
              </button>
            ) : (
              <span className="muted small">Pick one to use its rent in your number</span>
            )}
          </div>
          <div className="cost-scroll">
            <table className="area-table">
              <thead>
                <tr>
                  <th scope="col">Area</th>
                  <th scope="col">{HOUSING_SHORT[input.housing]} a month</th>
                  <th scope="col">Commute</th>
                  <th scope="col">What it's like</th>
                  <th scope="col">
                    <span className="sr-only">Use</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {areas.map((a) => {
                  const on = input.area === a.id
                  return (
                    <tr key={a.id} className={on ? 'on' : ''}>
                      <th scope="row">
                        {a.name}
                        <DetailToggle refKey={`area:${a.id}`} label={a.name} removable={!on} removeNote="You're using this area. Pick another, or the city average, to remove it." />
                      </th>
                      <td>{gbp(rentOf(input, a.id))}</td>
                      <td className="text-2">{a.commute}</td>
                      <td className="muted">{a.vibe}</td>
                      <td className="r">
                        <button type="button" className={`btn sm ${on ? 'primary' : 'quiet'}`} aria-pressed={on} onClick={() => void pickArea(on ? undefined : a.id)} disabled={busy !== null} aria-label={on ? `Using ${a.name}. Use the city average instead` : `Use ${a.name}`}>
                          {on ? 'Using' : 'Use'}
                        </button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
          <RemovedList kind="area" />
        </section>
      )}
      <p className="tiny faint" style={{ margin: 0 }}>
        {ukCity ? (
          <>
            Prices, rents and daylight hours are planning estimates. Rents last checked {dayMonthYear(ukCity.rentChecked)} against{' '}
            <a href={ukCity.rentSource} target="_blank" rel="noreferrer noopener">
              ONS figures
            </a>{' '}
            and listings.
          </>
        ) : (
          <>Prices and rents come from your imported plan "{pack?.title}"{pack?.createdOn ? `, made ${dayMonthYear(pack.createdOn)}` : ''}. They're estimates: check them before you rely on them.</>
        )}
      </p>
    </div>
  )
}
