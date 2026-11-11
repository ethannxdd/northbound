import { useQuery } from 'convex/react'
import { Link, useParams } from 'react-router-dom'
import { api } from '../../convex/_generated/api'
import { CITIES, photoUrl } from '@shared/cities'
import { longMonthYear, monthsBetween, todayIso } from '@shared/dates'
import { plan as planOf, progress } from '@shared/engine'
import { buildTimeline } from '@shared/timeline'
import { DEFAULT_SCENARIO } from '@shared/types'
import { tasksDoneByDocs, type DocStatus } from '@shared/documents'
import { zar, pct } from '../lib/format'
import { Loading } from '../lib/ui'
import { shortTitle } from '../components/TransitMap'

/** What family see from a share link: the main plan and progress, read-only. */
export default function SharePage() {
  const { token } = useParams<{ token: string }>()
  const path = window.location.pathname.split('/share/')[1] ?? token ?? ''
  const data = useQuery(api.shares.view, { token: path })
  if (data === undefined) return <Loading />
  if (data === null) {
    return (
      <div className="splash" style={{ padding: 24, textAlign: 'center' }}>
        <img src="/icon.svg" width="56" height="56" alt="" />
        <h1 className="h1">This link isn't working</h1>
        <p className="muted">It may have been switched off. Ask for a new one.</p>
      </div>
    )
  }
  const today = todayIso()
  const base = { ...DEFAULT_SCENARIO, ...data.input }
  const input = base.rateMode === 'live' && data.liveRate ? { ...base, rate: Math.round(data.liveRate * 100) / 100 } : base
  const p = planOf(input, { savedZar: data.savedZar, monthlyZar: data.monthlyZar }, today)
  const prog = progress(data.savedZar, p.targetZar)
  const done = new Set([...data.done, ...tasksDoneByDocs(data.docStatuses as Record<string, DocStatus>)])
  const city = CITIES[input.city]
  const tasks = buildTimeline(input, p.landDate, today).filter((t) => !done.has(t.key) && t.key !== 'saving').slice(0, 5)

  return (
    <div>
      <div className="share-banner">You're looking at a shared Northbound plan. It's read-only.</div>
      <div className="hero" style={{ height: 360, minHeight: 300 }}>
        <img src={photoUrl(city.photo, 1600)} alt={`${city.name} from above`} />
        <div className="hero-text">
          <div className="kicker">Moving on the Ancestry visa</div>
          <h1 className="display">Cape Town to {city.name}</h1>
        </div>
      </div>
      <div style={{ maxWidth: 640, margin: '0 auto', padding: '16px 20px 40px' }} className="stack">
        <div className="stats">
          <div>
            <b>{Math.max(0, monthsBetween(today, p.landDate))}</b>
            <small>months to go</small>
          </div>
          <div>
            <b>{pct(prog.pct)}</b>
            <small>saved</small>
          </div>
          <div>
            <b>{longMonthYear(p.landDate).split(' ')[0].slice(0, 3)} {p.landDate.slice(0, 4)}</b>
            <small>{input.landMode === 'saved' ? 'landing around' : 'landing'}</small>
          </div>
        </div>
        <div className="card">
          <span className="muted small">The move needs</span>
          <div className="num" style={{ margin: '4px 0 8px' }}>
            {zar(p.targetZar, 1000)}
          </div>
          <div className="track">
            <i style={{ width: `${prog.pct * 100}%` }} />
          </div>
        </div>
        <section className="card" aria-labelledby="next">
          <h2 id="next" className="h2" style={{ marginBottom: 6 }}>
            Next steps
          </h2>
          <ul className="list">
            {tasks.map((t) => (
              <li key={t.key} className="row">
                <span>{shortTitle(t, city.name)}</span>
                <span className="small muted">{t.due <= today ? 'Now' : longMonthYear(t.due)}</span>
              </li>
            ))}
          </ul>
        </section>
        <p className="small muted" style={{ textAlign: 'center' }}>
          Planning a move too? <Link to="/">Make your own plan on Northbound</Link>.
        </p>
      </div>
    </div>
  )
}
