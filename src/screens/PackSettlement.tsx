import { Link } from 'react-router-dom'
import { addMonths, dayMonthYear, monthYear } from '@shared/dates'
import type { DestinationPack } from '@shared/pack'
import { useActions, useApp } from '../lib/app'
import { gbp, plural, zar } from '../lib/format'

/** Settling for an imported plan: the path, its fees and conditions, as the plan describes them. */
export default function PackSettlement({ pack }: { pack: DestinationPack }) {
  const { plan, profile, input } = useApp()
  const { updateProfile } = useActions()
  const land = profile.landedOn ?? plan.landDate
  const st = pack.settlement
  const settleDate = st ? addMonths(land, st.years * 12) : null
  const citizenDate = st?.citizenshipYears ? addMonths(land, st.citizenshipYears * 12) : null
  const total = (st?.fee ?? 0) + (st?.citizenshipFee ?? 0)

  const path = [
    { date: monthYear(land), name: `Land on the ${pack.visa.name}`, sub: `${plural(pack.visa.years, 'year')} of permission at first. The visa fee is already in your number.`, cost: 'Paid before you go', on: true },
    ...(st && settleDate
      ? [
          { date: `${land.slice(0, 4)} – ${settleDate.slice(0, 4)}`, name: 'Live and work', sub: st.conditions[0] ?? 'Keep to the conditions below.', cost: gbp(0) },
          { date: monthYear(settleDate), name: `Apply for ${st.name}`, sub: `After ${plural(st.years, 'year')}, if the conditions are met.`, cost: st.fee ? gbp(st.fee) : 'See the plan' },
        ]
      : []),
    ...(st?.citizenshipName && citizenDate
      ? [{ date: monthYear(citizenDate), name: st.citizenshipName, sub: `About ${plural(st.citizenshipYears!, 'year')} after landing.`, cost: st.citizenshipFee ? gbp(st.citizenshipFee) : 'See the plan' }]
      : []),
  ]
  const sources = [...(st?.sources ?? []), ...(pack.visa.sources ?? [])]

  return (
    <div className="main">
      <div className="stack" style={{ gap: 6 }}>
        <Link to="/settings" className="muted small strong">
          Profile
        </Link>
        <h1 className="h1">Settling in {pack.country.name}</h1>
        <p className="muted" style={{ margin: 0 }}>
          {st ? `On the ${pack.visa.name} you can apply for ${st.name} after ${plural(st.years, 'year')}, according to your plan.` : "Your plan doesn't describe a path to settle. Ask Claude to add one."}
        </p>
      </div>

      <section aria-label="Your path" className="card settle-path">
        <ol>
          {path.map((p) => (
            <li key={p.name} className={p.on ? 'on' : ''}>
              <span className="sp-rail" aria-hidden="true" />
              <span className="sp-date">{p.date}</span>
              <b>{p.name}</b>
              <small>{p.sub}</small>
              <span className="sp-cost">{p.cost}</span>
            </li>
          ))}
        </ol>
        {total > 0 && (
          <div className="sp-total">
            <span>Cost of the whole path after landing</span>
            <b>
              {gbp(total)} · {zar(total * input.rate, 10)} at your plan's rate
            </b>
          </div>
        )}
      </section>

      <div className="cols-2">
        <section aria-labelledby="conds" className="card">
          <h2 id="conds" className="h2" style={{ marginBottom: 8 }}>
            The conditions
          </h2>
          {st && st.conditions.length > 0 ? (
            <ul className="conds">
              {st.conditions.map((c) => (
                <li key={c}>
                  <span className="cmark" aria-hidden="true">
                    ·
                  </span>
                  <span className="ctxt">
                    <b>{c}</b>
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="muted">None listed in your plan.</p>
          )}
          <div className="field" style={{ margin: '14px 0 0' }}>
            <label htmlFor="landed">Already there? Your landing date</label>
            <input id="landed" className="input" type="date" value={profile.landedOn ?? ''} onChange={(e) => void updateProfile({ landedOn: e.target.value || null })} />
            <p className="hint">Until you set this, the dates follow your plan's landing date.</p>
          </div>
        </section>
        <section aria-labelledby="src" className="card">
          <h2 id="src" className="h2" style={{ marginBottom: 8 }}>
            Where this comes from
          </h2>
          <p className="muted small" style={{ marginTop: 0 }}>
            From your imported plan "{pack.title}"{pack.createdOn ? `, made ${dayMonthYear(pack.createdOn)}` : ''}. Rules change: check the official sources before you apply.
          </p>
          {sources.length > 0 ? (
            <ul className="dep-list">
              {sources.map((s) => (
                <li key={s.url + s.label}>
                  <a href={s.url} target="_blank" rel="noreferrer noopener">
                    {s.label}
                  </a>
                  <span>{s.checked ? `checked ${dayMonthYear(s.checked)}` : ''}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="muted small">The plan lists no sources.</p>
          )}
        </section>
      </div>
    </div>
  )
}
