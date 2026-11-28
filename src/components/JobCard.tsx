import { Link } from 'react-router-dom'
import { dayMonthYear } from '@shared/dates'
import { cityOf, targetJob } from '@shared/engine'
import { useApp } from '../lib/app'
import { gbp } from '../lib/format'

/** The job this scenario was planned around, and what it pays in the city. */
export default function JobCard() {
  const { input, active } = useApp()
  const job = targetJob(input)
  const city = cityOf(input)
  const research = input.details?.job
  const fromClaude = job.source === 'claude' ? research : undefined
  return (
    <section id="job" className="card job-card" aria-labelledby="job-h">
      <div className="card-h">
        <h2 id="job-h" className="h2">
          Job you're targeting
        </h2>
        <Link to={`/scenario/${active._id}`}>Change</Link>
      </div>
      <div className="job-main">
        <b className="job-title">{job.title}</b>
        <span className="muted small">in {city.name}</span>
      </div>
      <div className="job-figs">
        <div>
          <span className="lbl">{job.yours ? 'Your salary' : 'Typical salary'}</span>
          <b className="num">{gbp(job.salary)}</b>
          <small>a year, before tax</small>
        </div>
        {job.range && (
          <div>
            <span className="lbl">Usual range</span>
            <b>
              {gbp(job.range.low)} to {gbp(job.range.high)}
            </b>
          </div>
        )}
        {job.yours && (
          <div>
            <span className="lbl">Typical for the job</span>
            <b>{gbp(job.typical)}</b>
          </div>
        )}
      </div>
      <p className="small muted" style={{ margin: 0 }}>
        {job.source === 'claude' ? `From Claude's research${job.researchedOn ? ` on ${dayMonthYear(job.researchedOn)}` : ''}. ` : ''}
        {job.basis}
        {job.basis && !/[.!?]$/.test(job.basis) ? '.' : ''}
      </p>
      {fromClaude?.demand && <p className="small" style={{ margin: 0 }}>{fromClaude.demand}</p>}
      {fromClaude?.otherTitles?.length ? <p className="small muted" style={{ margin: 0 }}>Also advertised as: {fromClaude.otherTitles.join(', ')}</p> : null}
      {fromClaude?.whereToLook?.length ? <p className="small muted" style={{ margin: 0 }}>Where to look: {fromClaude.whereToLook.join(', ')}</p> : null}
      {job.stale ? (
        <div className="note warn">
          Claude's salary research was for "{research?.title}", so it isn't used for {job.title}. <Link to="/scenarios/update">Update this scenario with Claude</Link>.
        </div>
      ) : job.source !== 'claude' ? (
        <div className="note">
          This is an estimate. <Link to="/scenarios/update">Update this scenario with Claude</Link> to research what {job.title} pays in {city.name}.
        </div>
      ) : null}
    </section>
  )
}
