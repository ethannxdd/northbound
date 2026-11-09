import { useMemo, useState } from 'react'
import { monthYear, dayMonthYear } from '@shared/dates'
import { buildTimeline, type Line, type Task } from '@shared/timeline'
import { CITIES } from '@shared/cities'
import { useActions, useApp } from '../lib/app'
import { Sheet } from '../lib/ui'

const SHORT: Record<string, string> = {
  'sa-certs': 'Unabridged birth certificates',
  'gro-cert': "Gran's GRO certificate",
  'gran-marriage': "Gran's marriage certificate",
  passport: 'Check your passport',
  saving: 'Save into your goal',
  'tb-test': 'TB test',
  'proof-funds': 'Proof of funds',
  'job-search': 'Start job applications',
  'apply-visa': 'Apply for the visa',
  'visa-decision': 'Visa decision',
  'book-travel': 'Book flight and first nights',
  'sa-admin': 'Wrap up in South Africa',
  'settle-in': 'NI number, bank, GP',
  'find-room': 'Move into your room',
  'first-payday': 'First payday',
  settle: 'Settle in the UK',
}

export const LINE_COLOR: Record<Line, string> = { paper: 'var(--l-paper)', money: 'var(--l-money)', move: 'var(--l-move)', trunk: 'var(--l-trunk)' }
export const LINE_NAME: Record<Line, string> = { paper: 'Paperwork line', money: 'Money line', move: 'Move line', trunk: 'Main line' }
const X: Record<Exclude<Line, 'trunk'>, number> = { paper: 30, money: 50, move: 70 }
const LINE_CLASS: Record<Line, string> = { paper: 'lp', money: 'lm', move: 'lv', trunk: 'lt' }
const FILL_CLASS: Record<Line, string> = { paper: 'fp', money: 'fm', move: 'fv', trunk: 'ft' }

export function useTimeline() {
  const { input, plan, today, overrides } = useApp()
  return useMemo(() => buildTimeline(input, plan.landDate, today, overrides), [input, plan.landDate, today, overrides])
}

export function shortTitle(t: Task, city: string) {
  return t.key === 'land' ? `Land in ${city}` : SHORT[t.key] ?? t.title
}

export default function TransitMap({ animate = true }: { animate?: boolean }) {
  const { done, today, input } = useApp()
  const tasks = useTimeline()
  const [openKey, setOpenKey] = useState<string | null>(null)
  const city = CITIES[input.city].name

  const layout = useMemo(() => {
    const split = tasks.findIndex((t) => t.key === 'visa-decision')
    const pre = tasks.slice(0, split)
    const post = tasks.slice(split)
    const rows: { t: Task; x: number; y: number }[] = []
    let y = 40
    for (const t of pre) {
      rows.push({ t, x: X[t.line as Exclude<Line, 'trunk'>], y })
      y += 24
    }
    const merge = y + 26
    y = merge
    for (const t of post) {
      rows.push({ t, x: 70, y })
      y += t.milestone ? 54 : 44
    }
    return { rows, merge, height: y - 20 }
  }, [tasks])

  const m = layout.merge
  const open = tasks.find((t) => t.key === openKey) ?? null
  const status = (t: Task) => (done.has(t.key) ? 'done' : t.due <= today ? 'now' : 'later')

  return (
    <>
      <div className="map">
        <svg viewBox={`0 0 340 ${layout.height}`} role="group" aria-label="Your move as a transit map. Select a stop for details.">
          <g fill="none" strokeWidth="6" strokeLinecap="round" strokeLinejoin="round">
            <path d={`M30 14 V${m - 26} Q30 ${m} 56 ${m} H74`} className={`lp${animate ? ' draw' : ''}`} pathLength={1} style={{ ['--d' as string]: '100ms' }} />
            <path d={`M50 14 V${m - 26} Q50 ${m - 10} 66 ${m - 8} H74`} className={`lm${animate ? ' draw' : ''}`} pathLength={1} style={{ ['--d' as string]: '200ms' }} />
            <path d={`M70 14 V${m - 8}`} className={`lv${animate ? ' draw' : ''}`} pathLength={1} style={{ ['--d' as string]: '300ms' }} />
            <path d={`M70 ${m + 8} V${layout.height - 14}`} className={`lt${animate ? ' draw' : ''}`} pathLength={1} style={{ ['--d' as string]: '800ms' }} />
          </g>
          {layout.rows.map(({ t, x, y }) => {
            const st = status(t)
            const merge = t.key === 'visa-decision'
            return (
              <g
                key={t.key}
                className="stoprow"
                role="button"
                tabIndex={0}
                aria-label={`${t.title}. ${st === 'done' ? 'Done' : st === 'now' ? 'Due now' : `Due ${monthYear(t.due)}`}`}
                onClick={() => setOpenKey(t.key)}
                onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && (e.preventDefault(), setOpenKey(t.key))}
              >
                <rect className="hit focus" x="10" y={y - 14} width="326" height={merge || t.milestone ? 30 : 22} rx="6" fill="transparent" />
                {merge ? (
                  <rect x="56" y={y - 11} width="28" height="22" rx="11" strokeWidth="3" className={`lt st${st === 'done' ? ' ft' : ''}`} />
                ) : (
                  <circle cx={x} cy={y} r={t.key === 'settle' ? 9 : t.milestone ? 8 : 6} strokeWidth={t.key === 'settle' ? 4 : 3} className={`${LINE_CLASS[t.line]} st${st === 'done' ? ' ' + FILL_CLASS[t.line] : ''}`} />
                )}
                <text x="98" y={y + 4} fontSize={merge || t.milestone ? 15 : 13.5} fontWeight={merge || t.milestone ? 800 : st === 'now' ? 700 : 400} className={st === 'done' ? 'done' : ''}>
                  {shortTitle(t, city)}
                </text>
                <text x="334" y={y + 4} textAnchor="end" fontSize="13" className={st === 'now' ? 'now' : 'when'}>
                  {st === 'done' ? 'Done' : st === 'now' ? 'Now' : monthYear(t.due)}
                </text>
              </g>
            )
          })}
        </svg>
      </div>
      <StopSheet task={open} onClose={() => setOpenKey(null)} />
    </>
  )
}

export function StopSheet({ task, onClose }: { task: Task | null; onClose: () => void }) {
  const { done, today } = useApp()
  const { toggleDone } = useActions()
  const [last, setLast] = useState<Task | null>(task)
  if (task && task !== last) setLast(task)
  const t = task ?? last
  const isDone = t ? done.has(t.key) : false
  return (
    <Sheet open={!!task} onClose={onClose} label={t?.title ?? 'Stop'}>
      {t && (
        <div style={{ ['--lc' as string]: LINE_COLOR[t.line] }}>
          <span className="linechip">{LINE_NAME[t.line]}</span>
          <h2>{t.title}</h2>
          <div style={{ fontWeight: 700, fontSize: 14, color: isDone ? 'var(--ok)' : t.due <= today ? 'var(--now)' : 'var(--muted)' }}>{isDone ? 'Done' : t.due <= today ? 'Due now' : `Due ${dayMonthYear(t.due)}`}</div>
          {(t.cost || t.takes || t.from) && (
            <div className="facts3">
              {t.cost && (
                <div>
                  <small>Costs</small>
                  <b>{t.cost}</b>
                </div>
              )}
              {t.takes && (
                <div>
                  <small>Takes</small>
                  <b>{t.takes}</b>
                </div>
              )}
              {t.from && (
                <div>
                  <small>From</small>
                  <b>{t.from}</b>
                </div>
              )}
            </div>
          )}
          <ol className="steps" style={{ marginTop: t.cost || t.takes || t.from ? 0 : 14 }}>
            {t.steps.map((s) => (
              <li key={s}>{s}</li>
            ))}
          </ol>
          <div className="btns" style={{ gridTemplateColumns: t.url ? '1fr 1fr' : '1fr' }}>
            {t.url && (
              <a className="btn quiet" href={t.url} target="_blank" rel="noreferrer">
                Open website
              </a>
            )}
            <button type="button" className="btn primary" onClick={() => void toggleDone({ taskKey: t.key, today })}>
              {isDone ? 'Mark as not done' : 'Mark as done'}
            </button>
          </div>
        </div>
      )}
    </Sheet>
  )
}
