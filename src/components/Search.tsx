import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { visibleDocuments } from '@shared/documents'
import { cityOf, monthlyBudget, targetJob } from '@shared/engine'
import { RULES } from '@shared/rules'
import { monthYear } from '@shared/dates'
import { useActions, useApp } from '../lib/app'
import { gbp } from '../lib/format'
import { Sheet } from '../lib/ui'
import { GROUPS } from './Nav'
import { useTimeline } from './TransitMap'
import Icon from './Icon'

interface Hit {
  id: string
  kind: string
  label: string
  sub?: string
  go: () => void
  /** Extra words that should find it */
  words?: string
}

const SETTINGS = [
  ['loot', 'Loot', 'Link Loot and follow a savings goal'],
  ['savings', 'Savings plan', 'What you save each month, and life in Cape Town now'],
  ['loans', 'Loans and credit', 'Borrowing towards the move'],
  ['reminders', 'Reminders and calendar', 'Phone nudges and a calendar of every step'],
  ['share', 'Share your plan', 'A read-only link for family or a partner'],
  ['appearance', 'Appearance', 'Dark, light or match your device'],
  ['rules', 'Rules and sources', 'Every fee and threshold, with its source'],
  ['account', 'Account', 'Sign out or delete your data'],
] as const

/** Opens with the Search button, Ctrl+K or "/". Finds any screen, cost, document, step or setting by name. */
export function SearchButton() {
  const [open, setOpen] = useState(false)
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const typing = e.target instanceof HTMLElement && (e.target.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(e.target.tagName))
      if ((e.key === 'k' && (e.ctrlKey || e.metaKey)) || (e.key === '/' && !typing)) {
        e.preventDefault()
        setOpen(true)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])
  return (
    <>
      <button type="button" className="search-btn" onClick={() => setOpen(true)} aria-label="Search Northbound" aria-keyshortcuts="Control+K">
        <Icon name="search" size={18} />
        <span className="search-label">Search</span>
        <kbd className="search-kbd" aria-hidden="true">
          Ctrl K
        </kbd>
      </button>
      <Sheet open={open} onClose={() => setOpen(false)} label="Search">
        {open && <SearchPanel onClose={() => setOpen(false)} />}
      </Sheet>
    </>
  )
}

function SearchPanel({ onClose }: { onClose: () => void }) {
  const { totals, input, plan, overrides, borrowing, scenarios, active } = useApp()
  const { setActive } = useActions()
  const tasks = useTimeline()
  const navigate = useNavigate()
  const [q, setQ] = useState('')
  const [sel, setSel] = useState(0)
  const listRef = useRef<HTMLUListElement>(null)
  const go = (to: string) => () => {
    onClose()
    navigate(to)
  }

  const all = useMemo<Hit[]>(() => {
    const out: Hit[] = []
    for (const g of GROUPS) {
      out.push({ id: `p-${g.id}`, kind: 'Screen', label: g.label, sub: g.blurb, go: go(g.to) })
      for (const t of g.tabs) if (t.to !== g.to) out.push({ id: `p-${t.to}`, kind: 'Screen', label: t.label, sub: g.label, go: go(t.to) })
    }
    out.push({ id: 'p-edit', kind: 'Screen', label: `Edit ${active.name}`, sub: 'City, home, partner, salary, job, dates, flight', words: 'scenario settings job salary', go: go(`/scenario/${active._id}`) })
    const job = targetJob(input)
    out.push({ id: 'job', kind: 'Job', label: job.title, sub: `${gbp(job.salary)} a year · the job this scenario targets`, words: 'job salary work career role title', go: go('/#job') })
    for (const g of totals.groups)
      for (const l of g.lines) out.push({ id: `c-${l.key}`, kind: 'Cost', label: l.label, sub: `${gbp(l.planGbp)} · ${g.label}${l.mineGbp !== null ? ' · your quote' : ''}`, words: `${l.basis ?? ''} cost money quote`, go: go(`/money/item/${l.key}`) })
    for (const i of monthlyBudget(input, plan.landDate, overrides, borrowing).items.filter((x) => !x.key.endsWith('Repay')))
      out.push({ id: `m-${i.key}`, kind: 'Monthly', label: i.label, sub: `${gbp(i.gbp)} a month`, words: `${i.basis ?? ''} month living`, go: go(`/life/item/${i.key}`) })
    for (const d of visibleDocuments(input, (n, c) => (c === 'ZAR' ? `R${n}` : gbp(n))))
      out.push({ id: `d-${d.key}`, kind: 'Document', label: d.name, sub: `From ${d.from}`, words: 'paperwork document certificate', go: go(`/paperwork#doc-${d.key}`) })
    for (const t of tasks) out.push({ id: `s-${t.key}`, kind: 'Step', label: t.title, sub: `Due ${monthYear(t.due)}`, words: `${t.from ?? ''} step map`, go: go(`/map?stop=${encodeURIComponent(t.key)}`) })
    for (const a of cityOf(input).areas) out.push({ id: `a-${a.id}`, kind: 'Area', label: a.name, sub: a.commute, words: `${a.vibe} neighbourhood area`, go: go('/life#areas') })
    for (const [id, label, sub] of SETTINGS) out.push({ id: `set-${id}`, kind: 'Setting', label, sub, go: go(`/settings/${id}`) })
    for (const r of RULES) out.push({ id: `r-${r.key}`, kind: 'Rule', label: r.label, sub: r.group, words: 'rule fee threshold source', go: go(`/settings/rules#rule-${r.key}`) })
    for (const s of scenarios)
      out.push({
        id: `sc-${s._id}`,
        kind: 'Scenario',
        label: s.name,
        sub: s._id === active._id ? 'Your main scenario' : 'Make it your main scenario',
        words: 'scenario',
        go: () => {
          if (s._id !== active._id) void setActive({ id: s._id })
          onClose()
          navigate('/')
        },
      })
    return out
    // go/navigate are stable for the life of the panel
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [totals, input, plan.landDate, overrides, borrowing, tasks, scenarios, active])

  const hits = useMemo(() => {
    const words = q.toLowerCase().split(/\s+/).filter(Boolean)
    if (!words.length) return all.filter((h) => h.kind === 'Screen').slice(0, 14)
    const scored = all
      .map((h) => {
        const name = h.label.toLowerCase()
        const hay = `${name} ${h.kind.toLowerCase()} ${(h.sub ?? '').toLowerCase()} ${(h.words ?? '').toLowerCase()}`
        if (!words.every((w) => hay.includes(w))) return null
        const score = (name.startsWith(words[0]) ? 0 : name.includes(words[0]) ? 1 : 2) + (h.kind === 'Screen' ? -0.5 : 0)
        return { h, score }
      })
      .filter(Boolean) as { h: Hit; score: number }[]
    return scored.sort((a, b) => a.score - b.score).slice(0, 40).map((x) => x.h)
  }, [q, all])

  useEffect(() => setSel(0), [q])
  useEffect(() => {
    listRef.current?.querySelector<HTMLElement>('[aria-selected="true"]')?.scrollIntoView({ block: 'nearest' })
  }, [sel])

  return (
    <div className="search-panel">
      <div className="search-field">
        <Icon name="search" size={20} />
        <input
          autoFocus
          className="input"
          type="search"
          role="combobox"
          aria-expanded="true"
          aria-controls="search-list"
          aria-activedescendant={hits[sel] ? `sh-${hits[sel].id}` : undefined}
          aria-label="Search costs, documents, steps, screens and settings"
          placeholder="Search: visa fee, rent, passport, Loot…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'ArrowDown') {
              e.preventDefault()
              setSel((s) => Math.min(hits.length - 1, s + 1))
            } else if (e.key === 'ArrowUp') {
              e.preventDefault()
              setSel((s) => Math.max(0, s - 1))
            } else if (e.key === 'Enter' && hits[sel]) {
              e.preventDefault()
              hits[sel].go()
            }
          }}
        />
      </div>
      <ul id="search-list" role="listbox" className="search-list" ref={listRef} aria-label="Results">
        {hits.map((h, i) => (
          <li key={h.id} id={`sh-${h.id}`} role="option" aria-selected={i === sel} onMouseEnter={() => setSel(i)} onClick={h.go}>
            <span className="search-kind">{h.kind}</span>
            <span className="search-txt">
              <b>{h.label}</b>
              {h.sub && <small>{h.sub}</small>}
            </span>
          </li>
        ))}
        {hits.length === 0 && <li className="search-none">Nothing matches "{q}".</li>}
      </ul>
      {!q && <p className="faint tiny" style={{ margin: 0 }}>Type to find any cost, document, step, rule or setting. Open search any time with Ctrl K or /.</p>}
    </div>
  )
}
