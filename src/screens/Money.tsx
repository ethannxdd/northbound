import { Fragment, useMemo, useState } from 'react'
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom'
import { dayMonthYear, longMonthYear } from '@shared/dates'
import { cityOf, monthlyBudget, plan as planOf, runwayMonths, runwaySeries, type PlanLine } from '@shared/engine'
import { RULES, rule, ruleText } from '@shared/rules'
import SavingPlan from '../components/SavingPlan'
import QuoteSheet from '../components/QuoteSheet'
import { DiffChip, lineDiff } from '../components/CostBits'
import { useApp, type FxPoint } from '../lib/app'
import { gbp, plural, zar } from '../lib/format'

type Show = 'both' | 'GBP' | 'ZAR'
type Filter = 'all' | 'needs' | 'over' | 'extra'
const HOUSING: Record<string, string> = { room: 'room in a share', studio: 'studio', onebed: '1-bed flat' }

/** Money: the baseline, your quotes and the plan total, line by line. */
export default function Money() {
  const { input, plan, overrides, savings, today, fx, liveRate, active, totals, goal, profile, cur } = useApp()
  const { pathname } = useLocation()
  const { itemKey } = useParams<{ itemKey?: string }>()
  const navigate = useNavigate()
  const [show, setShow] = useState<Show>('both')
  const [filter, setFilter] = useState<Filter>('all')
  const [openWhy, setOpenWhy] = useState<string | null>(null)
  const sheetOpen = pathname.startsWith('/money/quote')
  const r = input.rate

  const allLines = totals.groups.flatMap((g) => g.lines)
  const counts = {
    all: allLines.length,
    needs: allLines.filter((l) => !l.custom && l.mineGbp === null).length,
    over: allLines.filter((l) => lineDiff(l).kind === 'over').length,
    extra: allLines.filter((l) => l.custom).length,
  }
  const keep = (l: PlanLine) => (filter === 'all' ? true : filter === 'needs' ? !l.custom && l.mineGbp === null : filter === 'over' ? lineDiff(l).kind === 'over' : l.custom)
  const usedRules = [...new Set(allLines.flatMap((l) => l.ruleKeys ?? []))]
  const oldestCheck = RULES.filter((x) => usedRules.includes(x.key))
    .map((x) => x.lastChecked)
    .sort()[0]

  const money = (g: number) => (show === 'ZAR' ? zar(g * r) : gbp(g))
  const second = (g: number) => (show === 'both' ? zar(g * r) : null)
  const diffGbp = totals.planGbp - totals.baselineGbp

  return (
    <div className="main">
      <div className="money-head">
        <div className="stack" style={{ gap: 6 }}>
          <Link to={`/scenario/${active._id}`} className="muted small strong">
            {cityOf(input).name} · {HOUSING[input.housing]} · {input.partner ? 'with a partner' : 'solo'}
          </Link>
          <h1 className="h1">Save before you go</h1>
          <p className="muted small" style={{ margin: 0 }}>
            {input.pack ? (
              <>
                Baseline from your plan "{input.pack.title}"{input.pack.createdOn ? `, made ${dayMonthYear(input.pack.createdOn)}` : ''}
              </>
            ) : (
              <>
                Baseline from the <Link to="/settings/rules">Rules page</Link>
                {oldestCheck ? `, last checked ${dayMonthYear(oldestCheck)}` : ''}
              </>
            )}{' '}
            · {cur.symbol}1 = R{r.toFixed(2)}
          </p>
        </div>
        <Link to="/money/quote" className="btn solid lg">
          <svg aria-hidden="true" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round">
            <path d="M12 5v14M5 12h14" />
          </svg>
          Add my quote
        </Link>
      </div>

      <section aria-label="Totals" className="totals">
        <div className="total-tile">
          <span className="lbl">
            <span className="key-base" aria-hidden="true" />
            Baseline
          </span>
          <b>{money(totals.baselineGbp)}</b>
          <small>
            {show === 'both' ? `${zar(totals.baselineGbp * r)} · ` : ''}
            {totals.pricedCount} of {totals.itemCount} items priced
          </small>
        </div>
        <div className="total-tile">
          <span className="lbl">
            <span className="key-mine" aria-hidden="true" />
            My quotes
          </span>
          <b className={totals.mineGbp > 0 ? 'mine-text' : ''}>{money(totals.mineGbp)}</b>
          <small>
            {show === 'both' ? `${zar(totals.mineGbp * r)} · ` : ''}
            {totals.quotedCount} of {totals.itemCount} items quoted
            {totals.customCount ? `, plus ${plural(totals.customCount, 'cost')} of your own` : ''}
          </small>
        </div>
        <div className="total-tile plan">
          <span className="lbl">Plan total · your quote where you have one</span>
          <b>{money(totals.planGbp)}</b>
          <small>
            {show === 'both' ? `${zar(totals.planGbp * r)} · ` : ''}
            {Math.abs(diffGbp) >= 0.5 ? `${diffGbp > 0 ? '+' : '−'}${gbp(Math.abs(diffGbp))} on the baseline. ` : ''}
            This is your number{goal && profile.syncLootTarget ? ' and your Loot goal target' : ''}.
          </small>
        </div>
      </section>

      <div className="filter-row">
        <div className="filter-pills" role="group" aria-label="Show costs">
          {(
            [
              ['all', `All ${counts.all}`],
              ['needs', `Needs my quote · ${counts.needs}`],
              ['over', `Over baseline · ${counts.over}`],
              ['extra', `My extra costs · ${counts.extra}`],
            ] as [Filter, string][]
          ).map(([id, label]) => (
            <button key={id} type="button" aria-pressed={filter === id} onClick={() => setFilter(id)}>
              {label}
            </button>
          ))}
        </div>
        <div className="seg mini" role="group" aria-label="Currency">
          {(
            [
              ['both', `${cur.symbol} and R`],
              ['GBP', cur.symbol],
              ['ZAR', 'R'],
            ] as [Show, string][]
          ).map(([id, label]) => (
            <button key={id} type="button" aria-pressed={show === id} onClick={() => setShow(id)}>
              {label}
            </button>
          ))}
        </div>
      </div>

      <div className="stack" style={{ gap: 22 }}>
        {totals.groups.map((g) => {
          const lines = g.lines.filter(keep)
          if (!lines.length) return null
          const own = g.lines.filter((l) => l.custom).reduce((a, l) => a + l.planGbp, 0)
          return (
            <section key={g.id} className="cost-card" aria-labelledby={`g-${g.id}`}>
              <div className="cost-card-h">
                <h2 id={`g-${g.id}`} className="h3">
                  {g.label}
                </h2>
                <span className="muted small">
                  {gbp(g.baselineGbp)} · {zar(g.baselineGbp * r)}
                  {own > 0 ? ` + ${gbp(own)} of yours` : ''}
                </span>
              </div>
              <div className="cost-scroll">
                <table className="cost-table">
                  <thead>
                    <tr>
                      <th scope="col">Item</th>
                      <th scope="col">Baseline</th>
                      <th scope="col">Mine</th>
                      <th scope="col" className="r">
                        Difference
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {lines.map((l) => (
                      <Fragment key={l.key}>
                        <tr>
                          <th scope="row">
                            <span className="ci-name">
                              {l.label}
                              {l.custom && <span className="tag mine">My extra</span>}
                            </span>
                            <span className="ci-basis">{l.custom ? 'Added by you' : l.basis}</span>
                          </th>
                          <td>
                            {l.baselineGbp !== null ? (
                              <button type="button" className="fig base" aria-expanded={openWhy === l.key} aria-controls={`why-${l.key}`} aria-label={`Baseline ${gbp(l.baselineGbp)} for ${l.label}. How it is worked out`} onClick={() => setOpenWhy(openWhy === l.key ? null : l.key)}>
                                <b>{money(l.baselineGbp)}</b>
                                {second(l.baselineGbp) && <small>{second(l.baselineGbp)}</small>}
                              </button>
                            ) : (
                              <span className="faint small">No baseline</span>
                            )}
                          </td>
                          <td>
                            {l.mineGbp !== null ? (
                              <Link to={`/money/quote/${l.key}`} className="fig mine" aria-label={`Your quote ${gbp(l.mineGbp)}${l.quoteCount > 1 ? `, ${l.quoteCount} quotes in history` : ''}. Open`}>
                                <b>{money(l.mineGbp)}</b>
                                {second(l.mineGbp) && <small>{second(l.mineGbp)}</small>}
                                {l.quoteCount > 1 && <small>{l.quoteCount} quotes</small>}
                              </Link>
                            ) : (
                              <span className="faint">—</span>
                            )}
                          </td>
                          <td className="r">
                            {l.mineGbp === null ? (
                              <Link to={`/money/quote/${l.key}`} className="btn quiet sm" aria-label={`Add a quote for ${l.label}`}>
                                + Add quote
                              </Link>
                            ) : (
                              <DiffChip baselineGbp={l.baselineGbp} mineGbp={l.mineGbp} />
                            )}
                          </td>
                        </tr>
                        {openWhy === l.key && (
                          <tr className="why-row">
                            <td colSpan={4} id={`why-${l.key}`}>
                              <Why line={l} landDate={plan.landDate} />
                            </td>
                          </tr>
                        )}
                      </Fragment>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          )
        })}
        {filter !== 'all' && totals.groups.every((g) => !g.lines.some(keep)) && <p className="muted">Nothing here.</p>}
      </div>

      <Link to="/money/quote/new" className="add-own">
        + Add my own cost
      </Link>

      <p className="faint small" style={{ margin: 0, maxWidth: 760, lineHeight: 1.6 }}>
        {input.pack
          ? 'Every baseline figure comes from your imported plan. Tap any baseline figure to see how it was worked out and where the plan got it.'
          : 'Every baseline figure comes from the Rules page, with its source and the date it was last checked. Tap any baseline figure to see how it was worked out.'}
      </p>

      <div className="cols-2">
        <section className="card" aria-labelledby="plan-h">
          <h2 id="plan-h" className="h2" style={{ marginBottom: 12 }}>
            Your saving plan
          </h2>
          <SavingPlan plan={plan} mode={input.landMode} monthlyZar={savings.monthlyZar} today={today} compact />
          <RateCard input={input} plan={plan} savings={savings} today={today} overrides={overrides} fx={fx} liveRate={liveRate} activeId={active._id} />
        </section>
        <RunwayCard />
      </div>

      <QuoteSheet open={sheetOpen} itemKey={itemKey} onClose={() => navigate('/money', { replace: true })} />
    </div>
  )
}

/** How a baseline figure was worked out, with links to its rules. */
function Why({ line, landDate }: { line: PlanLine; landDate: string }) {
  const { overrides, input } = useApp()
  const rules = RULES.filter((x) => line.ruleKeys?.includes(x.key))
  if (input.pack) {
    const pack = input.pack
    const extra = pack.extraCosts?.find((x) => `x-${x.key}` === line.key)
    const doc = pack.documents.find((d) => `doc-${d.key}` === line.key)
    const src = extra?.source ?? doc?.url ?? (line.key === 'visaFee' || line.key === 'ihs' ? pack.visa.sources?.[0]?.url : undefined)
    return (
      <div className="why">
        <p style={{ margin: 0 }}>
          <b>How it's worked out:</b> {line.basis ?? 'From your plan'}.
        </p>
        <p className="muted small" style={{ margin: '6px 0 0' }}>
          From your imported plan "{pack.title}".{' '}
          {src && (
            <a href={src} target="_blank" rel="noreferrer noopener">
              Source
            </a>
          )}
        </p>
      </div>
    )
  }
  return (
    <div className="why">
      <p style={{ margin: 0 }}>
        <b>How it's worked out:</b> {line.basis}.
      </p>
      {rules.length ? (
        <ul>
          {rules.map((x) => {
            const val = x.unit === 'text' ? ruleText(x.key, landDate, overrides) : rule(x.key, landDate, overrides)
            const shown = x.unit === 'GBP' ? gbp(Number(val)) : x.unit === 'ZAR' ? zar(Number(val)) : `${val} ${x.unit}`
            return (
              <li key={x.key}>
                <Link to={`/settings/rules#rule-${x.key}`}>{x.label}</Link>: {shown}
                {overrides[x.key] !== undefined ? ' (your value)' : ''}. Last checked {dayMonthYear(x.lastChecked)}
                {x.estimate ? ', an estimate' : ''}.{' '}
                <a href={x.source} target="_blank" rel="noreferrer noopener">
                  Source
                </a>
              </li>
            )
          })}
        </ul>
      ) : (
        <p className="muted small" style={{ margin: '6px 0 0' }}>
          From Northbound's city figures and your scenario. <Link to="/settings/rules">See the Rules page</Link>.
        </p>
      )}
    </div>
  )
}

function RateCard({
  input,
  plan,
  savings,
  today,
  overrides,
  fx,
  liveRate,
  activeId,
}: Pick<ReturnType<typeof useApp>, 'input' | 'plan' | 'savings' | 'today' | 'overrides' | 'fx' | 'liveRate'> & { activeId: string }) {
  const { extrasFor, active, cur } = useApp()
  const [weaker, setWeaker] = useState(0)
  const whatIf = useMemo(() => {
    if (!weaker) return null
    const s = { ...input, rate: input.rate * (1 + weaker / 100) }
    return planOf(s, savings, today, overrides, extrasFor(active._id))
  }, [weaker, input, savings, today, overrides, extrasFor, active._id])
  return (
    <div style={{ marginTop: 20 }}>
      <div className="divider" />
      <h3 className="h3" style={{ margin: '16px 0 4px' }}>
        Rand to the {cur.name}
      </h3>
      {input.pack ? (
        <p className="small muted" style={{ margin: '4px 0 0' }}>
          Your plan uses R{input.rate.toFixed(2)} to the {cur.name}
          {input.pack.currency.rateDate ? `, from ${dayMonthYear(input.pack.currency.rateDate)}` : ''}. Live rates are only followed for the pound. <Link to={`/scenario/${activeId}`}>Change</Link>
        </p>
      ) : liveRate ? (
        <>
          <div className="row" style={{ alignItems: 'baseline' }}>
            <span className="num" style={{ fontSize: 30 }}>
              R{liveRate.toFixed(2)}
            </span>
            <span className="tiny muted">ECB rate, {dayMonthYear(fx[fx.length - 1].date)}</span>
          </div>
          <Spark points={fx} />
          <p className="small muted" style={{ margin: '4px 0 0' }}>
            {input.rateMode === 'live' ? 'Your plan follows this rate, so your number moves with it.' : `Your plan uses a fixed R${input.rate.toFixed(2)}.`} <Link to={`/scenario/${activeId}`}>Change</Link>
          </p>
        </>
      ) : (
        <p className="muted small">The live rate isn't available yet. Your plan uses R{input.rate.toFixed(2)}.</p>
      )}
      <div className="field" style={{ margin: '16px 0 0' }}>
        <label htmlFor="weaker">
          What if the rand weakens? <output htmlFor="weaker">{weaker ? `${weaker}%` : 'Not at all'}</output>
        </label>
        <input id="weaker" type="range" min={0} max={30} step={1} value={weaker} onChange={(e) => setWeaker(Number(e.target.value))} />
        <p className="hint" role="status">
          {whatIf
            ? `At R${(input.rate * (1 + weaker / 100)).toFixed(2)} you'd need ${zar(whatIf.targetZar, 1000)}, ${zar(whatIf.targetZar - plan.targetZar, 1000)} more.${input.landMode === 'saved' ? ` You'd land around ${longMonthYear(whatIf.landDate)}.` : ''}`
            : 'Move the slider to see how a weaker rand changes your number.'}
        </p>
      </div>
    </div>
  )
}

function RunwayCard() {
  const { input, plan, overrides, borrowing } = useApp()
  const series = useMemo(() => runwaySeries(input, plan.landDate, overrides), [input, plan.landDate, overrides])
  const budget = monthlyBudget(input, plan.landDate, overrides, borrowing)
  const months = runwayMonths(input)
  const max = Math.max(...series, 1)
  return (
    <section className="card" aria-labelledby="runway">
      <h2 id="runway" className="h2">
        After you land
      </h2>
      <p className="small muted" style={{ margin: '4px 0 0' }}>
        Your savings fall for {plural(months, 'month')} while you find work and wait for your first pay, then grow by {gbp(Math.max(0, budget.left))} a month.{' '}
        <Link to="/life">See a month there</Link>
      </p>
      <div className="bars reveal-x" style={{ ['--d' as string]: '250ms' }} role="img" aria-label="Savings by month after landing">
        {series.map((v, i) => (
          <i key={i} className={i === months ? 'low' : i > months ? 'pay' : ''} style={{ height: `${Math.max(i === months ? 8 : 3, (Math.max(0, v) / max) * 100)}%` }} />
        ))}
      </div>
      <div className="bl">
        <span>Land</span>
        <span>Lowest, month {months}</span>
        <span>Paid</span>
      </div>
    </section>
  )
}

function Spark({ points }: { points: FxPoint[] }) {
  if (points.length < 2) return null
  const vals = points.map((p) => p.zarPerGbp)
  const lo = Math.min(...vals)
  const hi = Math.max(...vals)
  const span = hi - lo || 1
  const d = points.map((p, i) => `${i ? 'L' : 'M'}${((i / (points.length - 1)) * 300).toFixed(1)} ${(52 - ((p.zarPerGbp - lo) / span) * 46).toFixed(1)}`).join(' ')
  return (
    <svg className="spark" viewBox="0 0 300 56" preserveAspectRatio="none" role="img" aria-label={`Rand per pound over the last ${points.length} trading days, between R${lo.toFixed(2)} and R${hi.toFixed(2)}`}>
      <path d={d} fill="none" stroke="var(--accent)" strokeWidth="2" vectorEffect="non-scaling-stroke" />
    </svg>
  )
}
