import { useEffect, useRef, useState, type ReactNode } from 'react'
import { Link, NavLink, useLocation, useNavigate } from 'react-router-dom'
import { CITIES, photoUrl } from '@shared/cities'
import { useActions, useApp } from '../lib/app'
import { zar } from '../lib/format'
import { Sheet, useWide } from '../lib/ui'
import Icon from './Icon'

const TABS = [
  { to: '/', label: 'Trip', icon: 'home' },
  { to: '/map', label: 'Map', icon: 'map' },
  { to: '/money', label: 'Money', icon: 'money' },
  { to: '/progress', label: 'Progress', icon: 'progress' },
  { to: '/profile', label: 'Profile', icon: 'account' },
]

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

export default function Shell({ children }: { children: ReactNode }) {
  const { pathname } = useLocation()
  const [scrolled, setScrolled] = useState(false)
  const overPhoto = pathname === '/'

  useEffect(() => {
    const base = TITLES[pathname] ?? (pathname.startsWith('/settings') ? 'Settings' : pathname.startsWith('/scenario') ? 'Scenario' : '')
    document.title = base ? `${base} · Northbound` : 'Northbound'
    window.scrollTo(0, 0)
  }, [pathname])

  useEffect(() => {
    if (!overPhoto) return
    const on = () => setScrolled(window.scrollY > 280)
    on()
    window.addEventListener('scroll', on, { passive: true })
    return () => window.removeEventListener('scroll', on)
  }, [overPhoto])

  const inProfile = /^\/(profile|settings|paperwork|settlement|life|compare|scenario)/.test(pathname)

  return (
    <div className="shell">
      <header className={`topnav${overPhoto ? ' over' : ''}${scrolled ? ' scrolled' : ''}`}>
        <Link to="/" className="brand brand-mark" aria-label="Northbound, your trip">
          <img src="/icon.svg" width="30" height="30" alt="" />
          northbound
        </Link>
        <nav aria-label="Main">
          {TOP_NAV.map((n) => (
            <NavLink key={n.to} to={n.to} end={n.to === '/'} className={({ isActive }) => (isActive ? 'active' : '')}>
              {n.label}
            </NavLink>
          ))}
        </nav>
        <div className="right">
          <ScenarioSwitcher />
          <AccountButton />
        </div>
      </header>
      <main className="page">{children}</main>
      <nav className="tabbar" aria-label="Main">
        {TABS.map((n) => (
          <NavLink key={n.to} to={n.to} end={n.to === '/'} className={({ isActive }) => (isActive || (n.to === '/profile' && inProfile) ? 'active' : '')}>
            <Icon name={n.icon} size={22} />
            <span>{n.label}</span>
          </NavLink>
        ))}
      </nav>
    </div>
  )
}

function AccountButton() {
  const { account } = useApp()
  const initial = (account.email ?? account.lootEmail ?? '?').slice(0, 1).toUpperCase()
  return (
    <Link to="/profile" className="acct-btn" aria-label="Your profile">
      <Icon name="menu" size={18} />
      <span className="avatar sm">{initial}</span>
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
      <span className="loot-dot" aria-hidden="true">L</span>
      <span>
        <b>{lootNeedsSignIn ? 'Sign in to Loot on this device' : goalMissing ? 'Relink your Loot goal' : 'Link a Loot savings goal'}</b>
        <small>{lootNeedsSignIn ? 'To see your linked goal here' : 'Your progress updates every time you save in Loot'}</small>
      </span>
      <Icon name="chevron" size={18} />
    </Link>
  )
}

/** The main scenario, with a menu to switch, edit or add one. */
export function ScenarioSwitcher() {
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
    <div className="switcher" ref={ref}>
      <button type="button" className="switch-btn" onClick={() => setOpen(!open)} aria-expanded={open} aria-haspopup="dialog" aria-label={`Main scenario: ${active.name}. Change or edit`}>
        <span className="star" aria-hidden="true">★</span>
        <span className="sw-name">{active.name}</span>
        <Icon name="down" size={16} />
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
        <Link to="/" className="brand brand-mark">
          <img src="/icon.svg" width="24" height="24" alt="" />
          northbound
        </Link>
        <ScenarioSwitcher />
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
