import { CAPE_TOWN, CITIES } from '@shared/cities'
import { longMonthYear, monthIndex } from '@shared/dates'
import { PageHead } from '../components/Shell'
import { useApp } from '../lib/app'
import { zar } from '../lib/format'
import { useOpening } from '../lib/ui'

const LETTERS = 'JFMAMJJASOND'.split('')

export default function Life() {
  const { input, plan } = useApp()
  useOpening()
  const city = CITIES[input.city]
  const land = monthIndex(plan.landDate)
  const X = (i: number) => 14 + i * (270 / 11)
  const Y = (h: number) => 110 - (h - 7) * 9
  const path = (a: number[]) => a.map((h, i) => `${i ? 'L' : 'M'}${X(i).toFixed(1)} ${Y(h).toFixed(1)}`).join(' ')
  const minUk = Math.min(...city.daylight)
  // BST runs from late March to late October: SA is 1 hour ahead then, 2 hours otherwise.
  const coffeeZar = city.coffee * input.rate

  return (
    <div className="screen-life">
      <PageHead title={`Life in ${city.name}`} sub="What a normal month will feel like." />
      <div className="life-grid">
      <section className="sec panel" aria-labelledby="daylight">
        <h2 id="daylight">Hours of daylight</h2>
        <svg className="chart" viewBox="0 0 316 136" width="100%" role="img" aria-label={`Daylight by month. ${city.name} ranges from ${minUk} to ${Math.max(...city.daylight)} hours; Cape Town from 9.8 to 14.4. You land in ${longMonthYear(plan.landDate)}.`}>
          <line className="grid-l" x1="10" x2="306" y1="20" y2="20" />
          <line className="grid-l" x1="10" x2="306" y1="65" y2="65" />
          <line className="grid-l" x1="10" x2="306" y1="110" y2="110" />
          <text x="306" y="16" textAnchor="end">17h</text>
          <text x="306" y="61" textAnchor="end">12h</text>
          <text x="306" y="106" textAnchor="end">7h</text>
          <line x1={X(land)} x2={X(land)} y1="4" y2="114" stroke="var(--text)" strokeDasharray="3 3" />
          <text x={X(land) + (land > 8 ? -4 : 4)} y="12" className="lab" textAnchor={land > 8 ? 'end' : 'start'}>
            You land
          </text>
          <path d={path(CAPE_TOWN.daylight)} fill="none" stroke="var(--l-money)" strokeWidth="3.5" strokeLinecap="round" pathLength={1} className="draw" style={{ ['--d' as string]: '150ms' }} />
          <path d={path(city.daylight)} fill="none" stroke="var(--l-move)" strokeWidth="3.5" strokeLinecap="round" pathLength={1} className="draw" style={{ ['--d' as string]: '350ms' }} />
          {LETTERS.map((c, i) => (
            <text key={i} x={X(i)} y="128" textAnchor="middle">
              {c}
            </text>
          ))}
        </svg>
        <div className="legend">
          <span style={{ ['--k' as string]: 'var(--l-money)' }}>Cape Town</span>
          <span style={{ ['--k' as string]: 'var(--l-move)' }}>{city.name}</span>
        </div>
        <p className="small muted" style={{ margin: '10px 0 0' }}>
          You land with about {city.daylight[land].toFixed(0)} hours of light a day. By December {city.name} has under {Math.ceil(minUk)}.
        </p>
      </section>
      <div className="tiles">
        <div className="tile">
          <small>Calling home</small>
          <b>2 hours behind</b>
          <p>1 hour from late March to late October</p>
        </div>
        <div className="tile">
          <small>A flat white</small>
          <b>£{city.coffee.toFixed(2)}</b>
          <p>
            {zar(coffeeZar)}, about {(coffeeZar / CAPE_TOWN.coffeeZar).toFixed(1).replace(/\.0$/, '')}× home
          </p>
        </div>
        <div className="tile">
          <small>Getting around</small>
          <b>£{city.transport} a month</b>
          <p>{city.transportNote}</p>
        </div>
        <div className="tile">
          <small>Wet days</small>
          <b>About {city.wetDays}</b>
          <p>A year, mostly light rain</p>
        </div>
      </div>
      </div>
      <p className="small muted" style={{ padding: '0 20px' }}>
        Prices and daylight hours are planning estimates.
      </p>
    </div>
  )
}
