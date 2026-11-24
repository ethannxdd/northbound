import { useQuery } from 'convex/react'
import { Link, useParams } from 'react-router-dom'
import { api } from '../../convex/_generated/api'
import { cityPhoto } from '@shared/cities'
import { monthYear, monthsBetween, todayIso } from '@shared/dates'
import { cityOf, plan as planOf, progress, routePlaces, visaName } from '@shared/engine'
import { buildTimeline } from '@shared/timeline'
import { DEFAULT_SCENARIO } from '@shared/types'
import { tasksDoneByDocs, type DocStatus } from '@shared/documents'
import { zar, pct } from '../lib/format'
import { Loading } from '../lib/ui'
import { BrandMark } from '../components/Shell'
import { LINE_COLOR, shortTitle } from '../components/TransitMap'

/** What family see from a share link: the main plan and progress, read-only. */
export default function SharePage() {
  const { token } = useParams<{ token: string }>()
  const path = window.location.pathname.split('/share/')[1] ?? token ?? ''
  const data = useQuery(api.shares.view, { token: path })
  if (data === undefined) return <Loading />
  if (data === null) {
    return (
      <div className="splash" style={{ padding: 24, textAlign: 'center' }}>
        <BrandMark size={56} />
        <h1 className="h1">This link isn't working</h1>
        <p className="muted">It may have been switched off. Ask for a new one.</p>
        <Link to="/" className="btn quiet">
          Go to Northbound
        </Link>
      </div>
    )
  }
  const today = todayIso()
  const base = { ...DEFAULT_SCENARIO, ...data.input, pack: data.pack ?? undefined }
  const input = !base.pack && base.rateMode === 'live' && data.liveRate ? { ...base, rate: Math.round(data.liveRate * 100) / 100 } : base
  const p = planOf(input, { savedZar: data.savedZar, monthlyZar: data.monthlyZar }, today, undefined, { quotes: data.quotes, customs: data.customs, borrowing: { loanZar: data.borrowedZar } })
  const prog = progress(data.savedZar, p.saveTargetZar, routePlaces(input))
  const done = new Set([...data.done, ...tasksDoneByDocs(data.docStatuses as Record<string, DocStatus>)])
  const city = cityOf(input)
  const photo = cityPhoto(city, 1600)
  const timeline = buildTimeline(input, p.landDate, today)
  const tasks = timeline.filter((t) => !done.has(t.key) && t.key !== 'saving').slice(0, 5)
  const stepsDone = timeline.filter((t) => done.has(t.key)).length

  return (
    <div className="shell">
      <header className="topbar">
        <div className="topbar-in">
          <span className="brand brand-mark">
            <BrandMark />
            northbound
          </span>
          <span className="tag">Shared plan · read-only</span>
        </div>
      </header>
      <main className="page">
        <div className="main rise" style={{ maxWidth: 880 }}>
          <section aria-label="The plan" className="hero-card share-hero">
            <div className="photo-slot">
              {photo && <img src={photo} alt={`${city.name} from above`} />}
            </div>
            <div className="chips">
              <span className="glass-chip">Cape Town to {city.name}</span>
              <span className="glass-chip sub">{visaName(input)}</span>
            </div>
            <div className="hero-panel glass">
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                <span className="lbl">The move needs</span>
                <span className="bignum">{zar(p.targetZar, 1000)}</span>
                <span className="sub">
                  {input.landMode === 'saved' ? 'Landing around' : 'Landing'} {monthYear(p.landDate)}
                </span>
              </div>
              <div className="hero-stats">
                <div>
                  <b>{Math.max(0, monthsBetween(today, p.landDate))}</b>
                  <small>months to go</small>
                </div>
                <div>
                  <b>{pct(prog.pct)}</b>
                  <small>saved</small>
                </div>
                <div>
                  <b>{stepsDone}</b>
                  <small>steps done</small>
                </div>
              </div>
            </div>
          </section>

          <section className="card" aria-labelledby="where">
            <h2 id="where" className="h2">
              {prog.pct >= 1 ? 'The money is all there' : `${pct(prog.pct)} of the way, ${prog.place.over}`}
            </h2>
            <div className="fund-bar" style={{ marginTop: 14 }} aria-hidden="true">
              <span style={{ width: `${prog.pct * 100}%`, background: 'var(--accent)' }} />
            </div>
          </section>

          <section className="card" aria-labelledby="next" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <h2 id="next" className="h2">
              Next steps
            </h2>
            {tasks.map((t) => (
              <div key={t.key} className="linkrow static" style={{ ['--k' as string]: LINE_COLOR[t.line] }}>
                <span className="dot" aria-hidden="true" />
                <span className="txt">
                  <b>{shortTitle(t, city.name)}</b>
                </span>
                <span className={`tag${t.due <= today ? ' danger' : ''}`}>{t.due <= today ? 'Now' : monthYear(t.due)}</span>
              </div>
            ))}
            {tasks.length === 0 && <p className="muted">Every step is done.</p>}
          </section>

          <p className="small muted" style={{ textAlign: 'center', margin: 0 }}>
            Planning a move too? <Link to="/">Make your own plan on Northbound</Link>.
          </p>
        </div>
      </main>
    </div>
  )
}
