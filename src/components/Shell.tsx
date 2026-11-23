import { useEffect, useRef, useState, type ReactNode } from 'react'
import { Link, NavLink, useLocation, useNavigate } from 'react-router-dom'
import { CITIES, photoUrl } from '@shared/cities'
import { useActions, useApp } from '../lib/app'
import { plural, zar } from '../lib/format'
import { Sheet, useWide } from '../lib/ui'
import Icon from './Icon'

const TOP_NAV = [
  { to: '/', label: 'Trip' },
  { to: '/map', label: 'Map' },
  { to: '/money', label: 'Money' },
  { to: '/progress', label: 'Progress' },
  { to: '/paperwork', label: 'Paperwork' },
  { to: '/life', label: 'Life' },
  { to: '/compare', label: 'Compare' },
]

const TITLES: Record<string, string> = {
  '/': 'Your trip',
  '/map': 'Map',
  '/money': 'Money',
  '/life': 'Life',
  '/compare': 'Compare',
  '/progress': 'Progress',
  '/paperwork': 'Paperwork',
  '/settlement': 'Settling in the UK',
  '/profile': 'Profile',
}

/** The up-arrow mark on its accent tile. */
export function BrandMark({ size = 34 }: { size?: number }) {
  return (
    <span className="brand-tile" style={{ width: size, height: size }} aria-hidden="true">
      <svg width={size * 0.53} height={size * 0.53} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 20V4M6 10l6-6 6 6" />
      </svg>
    </span>
  )
}

export default function Shell({ children }: { children: ReactNode }) {
  const { pathname } = useLocation()

  useEffect(() => {
    const base = TITLES[pathname] ?? (pathname.startsWith('/settings') ? 'Settings' : pathname.startsWith('/scenario') ? 'Scenario' : '')
    document.title = base ? `${base} · Northbound` : 'Northbound'
    window.scrollTo(0, 0)
  }, [pathname])

  return (
    <div className="shell">
      <header className="topbar">
        <div className="topbar-in">
          <Link to="/" className="brand brand-mark" aria-label="Northbound, your trip">
            <BrandMark />
            northbound
          </Link>
          <nav aria-label="Main" className="pills">
            {TOP_NAV.map((n) => (
              <NavLink key={n.to} to={n.to} end={n.to === '/'} className={({ isActive }) => (isActive ? 'active' : '')}>
                {n.label}
              </NavLink>
            ))}
          </nav>
          <div className="topbar-right">
            <RateChip />
            <AccountButton />
          </div>
        </div>
      </header>
      <main className="page">
        <div key={pathname} className="rise">
          {children}
        </div>
      </main>
    </div>
  )
}

/** Today's rate, or the scenario's fixed one. Opens the scenario, where it's set. */
function RateChip() {
  const { input, active, liveRate } = useApp()
  const live = input.rateMode === 'live' && !!liveRate
  return (
    <Link to={`/scenario/${active._id}`} className="rate-chip" aria-label={`Exchange rate: 1 pound is ${input.rate.toFixed(2)} rand, ${live ? 'live' : 'fixed'}. Change it in the scenario`}>
      <span>£1 =</span> R{input.rate.toFixed(2)} · {live ? 'live' : 'fixed'}
    </Link>
  )
}

function AccountButton() {
  const { account } = useApp()
  const email = account.email ?? account.lootEmail ?? ''
  const name = email.split('@')[0] ?? ''
  const parts = name.split(/[._-]+/).filter(Boolean)
  const initials = (parts.length > 1 ? parts[0][0] + parts[1][0] : name.slice(0, 2) || '?').toUpperCase()
  return (
    <Link to="/profile" className="avatar" aria-label="Your profile and settings">
      {initials}
    </Link>
  )
}

/** Shows whether savings follow a Loot goal, with a clear way to link one. */
export function LootCard() {
  const { goal, savingsSource, savings, goalMissing, lootNeedsSignIn } = useApp()
  if (savingsSource === 'loot' && goal) {
    return (
      <Link to="/settings/loot" className="loot-card">
        <span className="dot-ok" aria-hidden="true" />
        <span>
          <small>Following your Loot goal</small>
          <b>
            {goal.name}, {zar(savings.savedZar, 100)}
          </b>
        </span>
        <Icon name="chevron" size={18} />
      </Link>
    )
  }
  return (
    <Link to="/settings/loot" className="loot-card">
      <Icon name="loot" size={26} />
      <span>
        <b>{lootNeedsSignIn ? 'Sign in to Loot on this device' : goalMissing ? 'Relink your Loot goal' : 'Link a Loot savings goal'}</b>
        <small>{lootNeedsSignIn ? 'To see your linked goal here' : 'Your progress updates every time you save in Loot'}</small>
      </span>
      <Icon name="chevron" size={18} />
    </Link>
  )
}

/** The main scenario, with a menu to switch, edit or add one. */
export function ScenarioSwitcher({ align = 'left' }: { align?: 'left' | 'right' }) {
  const { scenarios, active, planFor } = useApp()
  const { setActive } = useActions()
  const wide = useWide()
  const navigate = useNavigate()
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open || !wide) return
    const onDown = (e: MouseEvent) => !ref.current?.contains(e.target as Node) && setOpen(false)
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false)
    document.addEventListener('mousedown', onDown)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onDown)
      document.removeEventListener('keydown', onKey)
    }
  }, [open, wide])

  const go = (to: string) => {
    setOpen(false)
    navigate(to)
  }

  const list = (
    <div className="scen-list">
      <p className="scen-note">Your main scenario drives your trip, map, money and Loot goal.</p>
      {scenarios.map((s) => (
        <div key={s._id} className={`scen-row${s._id === active._id ? ' on' : ''}`}>
          <button
            type="button"
            className="scen-pick"
            onClick={() => {
              void setActive({ id: s._id })
              setOpen(false)
            }}
          >
            <img src={photoUrl(CITIES[s.city].photo, 120)} alt="" />
            <span>
              <b>
                {s.name}
                {s._id === active._id && <span className="main-badge">Main</span>}
              </b>
              <small>
                {zar(planFor(s).targetZar, 1000)}
                {s._id !== active._id ? '. Make main' : ''}
              </small>
            </span>
          </button>
          <button type="button" className="btn quiet sm" onClick={() => go(`/scenario/${s._id}`)}>
            Edit
          </button>
        </div>
      ))}
      <button type="button" className="btn quiet block" style={{ marginTop: 6 }} onClick={() => go('/scenario/new')}>
        <Icon name="plus" size={18} /> New scenario
      </button>
    </div>
  )

  return (
    <div className={`switcher${align === 'right' ? ' right' : ''}`} ref={ref}>
      <button type="button" className="switch-btn" onClick={() => setOpen(!open)} aria-expanded={open} aria-haspopup="dialog" aria-label={`Main scenario: ${active.name}. Change or edit`}>
        <span className="sw-name">{active.name}</span>
        <span className="sw-count">
          {plural(scenarios.length, 'scenario')} <span aria-hidden="true">▾</span>
        </span>
      </button>
      {wide ? (
        open && (
          <div className="popover" role="dialog" aria-label="Scenarios">
            {list}
          </div>
        )
      ) : (
        <Sheet open={open} onClose={() => setOpen(false)} label="Scenarios">
          <h2>Scenarios</h2>
          {list}
        </Sheet>
      )}
    </div>
  )
}

/** Page heading: on a phone it carries the brand and scenario switcher; on desktop the top bar does. */
export function PageHead({ title, sub, children }: { title: ReactNode; sub?: ReactNode; children?: ReactNode }) {
  return (
    <header className="pagehead">
      <div className="topline">
        <ScenarioSwitcher align="right" />
      </div>
      <h1 className="h1">{title}</h1>
      {sub && <p>{sub}</p>}
      {children}
    </header>
  )
}

export function BackLink({ to, label = 'Back' }: { to: string; label?: string }) {
  return (
    <Link to={to} className="backlink">
      <Icon name="back" size={18} />
      {label}
    </Link>
  )
}
