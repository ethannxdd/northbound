import { useMemo, useState } from 'react'
import { gbp } from '../lib/format'
import { Link } from 'react-router-dom'
import { monthYear, dayMonthYear } from '@shared/dates'
import { buildTimeline, type Line, type Task } from '@shared/timeline'
import { cityOf } from '@shared/engine'
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

export function useTimeline() {
  const { input, plan, today, overrides } = useApp()
  return useMemo(() => buildTimeline(input, plan.landDate, today, overrides), [input, plan.landDate, today, overrides])
}

/** The first step that isn't done. Saving is ongoing, so it's skipped once a monthly amount is set. */
export function useNextStop() {
  const { done, savings } = useApp()
  const tasks = useTimeline()
  return tasks.find((t) => !done.has(t.key) && !(t.key === 'saving' && savings.monthlyZar > 0)) ?? null
}

export function shortTitle(t: Task, city: string) {
  return t.key === 'land' ? `Land in ${city}` : SHORT[t.key] ?? t.title
}

/**
 * The move as a transit map. With onSelect, the parent shows the details (desktop panel);
 * without it, tapping a stop opens a sheet (phone).
 */
const LINES: Exclude<Line, 'trunk'>[] = ['paper', 'money', 'move']
const LINE_SHORT: Record<Line, string> = { paper: 'Paperwork', money: 'Money', move: 'Move', trunk: 'Main line' }

/** Which cost lines a stop pays for, so its panel can show your quote. */
export const STOP_COSTS: Record<string, string[]> = {
  'sa-certs': ['saCerts'],
  'gro-cert': ['groCert'],
  'tb-test': ['tbTest'],
  'apply-visa': ['visaFee', 'ihs'],
  'book-travel': ['flight', 'monthlyLet'],
  'find-room': ['deposit', 'firstRent'],
}

/**
 * The move as a transit map: three lines side by side that meet at the visa decision,
 * then the main line to landing and settling. With onSelect, the parent shows the details
 * (desktop panel); without it, tapping a stop opens a sheet (phone).
 */
export default function TransitMap({ selectedKey, onSelect }: { animate?: boolean; selectedKey?: string | null; onSelect?: (key: string) => void }) {
  const { done, today, input } = useApp()
  const tasks = useTimeline()
  const [openKey, setOpenKey] = useState<string | null>(null)
  const city = cityOf(input).name
  const select = (k: string) => (onSelect ? onSelect(k) : setOpenKey(k))
  const split = tasks.findIndex((t) => t.key === 'visa-decision')
  const pre = tasks.slice(0, split)
  const decision = tasks[split]
  const post = tasks.slice(split + 1)
  const open = tasks.find((t) => t.key === openKey) ?? null
  const status = (t: Task) => (done.has(t.key) ? 'done' : t.due <= today ? 'now' : 'later')
  const when = (t: Task) => (status(t) === 'done' ? 'Done' : status(t) === 'now' ? 'Due now' : monthYear(t.due))

  const Stop = ({ t, big = false }: { t: Task; big?: boolean }) => {
    const st = status(t)
    return (
      <button
        type="button"
        className={`gstop ${st}${big ? ' big' : ''}${selectedKey === t.key ? ' sel' : ''}`}
        aria-pressed={onSelect ? selectedKey === t.key : undefined}
        aria-label={`${t.title}. ${when(t)}`}
        onClick={() => select(t.key)}
      >
        <span className="gdot" aria-hidden="true" />
        <span className="gtxt">
          <b>{shortTitle(t, city)}</b>
          <small>{when(t)}</small>
        </span>
      </button>
    )
  }

  return (
    <>
      <div className="gmap" role="group" aria-label="Your move as a transit map. Select a stop for details.">
        <div className="glines">
          {LINES.map((l) => (
            <div key={l} className="gline" style={{ ['--lc' as string]: LINE_COLOR[l] }}>
              <span className="gname">{LINE_SHORT[l]}</span>
              {pre
                .filter((t) => t.line === l)
                .map((t) => (
                  <Stop key={t.key} t={t} />
                ))}
            </div>
          ))}
        </div>
        {decision && (
          <div className="gjoin">
            <span className="bar" aria-hidden="true" />
            <span className="stem" aria-hidden="true" />
            <button type="button" className={`gdecision${selectedKey === decision.key ? ' sel' : ''}${done.has(decision.key) ? ' done' : ''}`} aria-pressed={onSelect ? selectedKey === decision.key : undefined} onClick={() => select(decision.key)}>
              Visa decision · {done.has(decision.key) ? 'Done' : monthYear(decision.due)}
            </button>
          </div>
        )}
        <div className="gtrunk" style={{ ['--lc' as string]: 'var(--l-trunk)' }}>
          {post.map((t) => (
            <Stop key={t.key} t={t} big={!!t.milestone} />
          ))}
        </div>
      </div>
      {!onSelect && <StopSheet task={open} onClose={() => setOpenKey(null)} />}
    </>
  )
}

/** What a stop is, what it costs, and the steps in order. Used in the sheet and the desktop panel. */
export function StopDetail({ task: t }: { task: Task }) {
  const { done, ticked, today, totals } = useApp()
  const { toggleDone } = useActions()
  const isDone = done.has(t.key)
  const viaPaperwork = isDone && !ticked.has(t.key)
  const costKeys = STOP_COSTS[t.key] ?? []
  const lines = totals.groups.flatMap((g) => g.lines).filter((l) => costKeys.includes(l.key))
  const quoted = lines.filter((l) => l.mineGbp !== null)
  const facts = [
    t.cost && { k: 'Cost', v: t.cost },
    t.takes && { k: 'Takes', v: t.takes },
    t.from && { k: 'Where', v: t.from },
  ].filter(Boolean) as { k: string; v: string }[]
  return (
    <div className="stop-detail" style={{ ['--lc' as string]: LINE_COLOR[t.line] }}>
      <div className="sd-top">
        <span className="linechip">{LINE_NAME[t.line]}</span>
        <span className={`tag${isDone ? ' ok' : t.due <= today ? ' danger' : ''}`}>{isDone ? 'Done' : t.due <= today ? 'Due now' : `Due ${dayMonthYear(t.due)}`}</span>
      </div>
      <h2>{t.title}</h2>
      {facts.length > 0 && (
        <div className="facts3">
          {facts.map((f) => (
            <div key={f.k}>
              <small>{f.k}</small>
              <b>{f.v}</b>
            </div>
          ))}
        </div>
      )}
      <ol className="steps">
        {t.steps.map((s) => (
          <li key={s}>{s}</li>
        ))}
      </ol>
      {lines.length > 0 && (
        <div className="sd-quote">
          <span>
            Your quote:{' '}
            {quoted.length ? (
              <b className="mine-text">
                {gbp(quoted.reduce((a, l) => a + (l.mineGbp ?? 0), 0))}
                {quoted.length < lines.length ? ` for ${quoted.map((l) => l.label).join(', ')}` : ''}
              </b>
            ) : (
              'not added yet'
            )}
          </span>
          <Link to={`/money/quote/${(lines.find((l) => l.mineGbp === null) ?? lines[0]).key}`} className="strong mine-text">
            + Add quote
          </Link>
        </div>
      )}
      <div className="btns">
        {t.url && (
          <a className="btn quiet lg" href={t.url} target="_blank" rel="noreferrer">
            Open website
          </a>
        )}
        {viaPaperwork ? (
          <Link to="/paperwork" className="btn quiet lg">
            Done in your paperwork tracker
          </Link>
        ) : (
          <button type="button" className={`btn lg ${isDone ? 'quiet' : 'primary'}`} onClick={() => void toggleDone({ taskKey: t.key, today })}>
            {isDone ? 'Mark as not done' : 'Mark as done'}
          </button>
        )}
      </div>
    </div>
  )
}

export function StopSheet({ task, onClose }: { task: Task | null; onClose: () => void }) {
  const [last, setLast] = useState<Task | null>(task)
  if (task && task !== last) setLast(task)
  const t = task ?? last
  return (
    <Sheet open={!!task} onClose={onClose} label={t?.title ?? 'Stop'}>
      {t && <StopDetail task={t} />}
    </Sheet>
  )
}
