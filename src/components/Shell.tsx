import { useEffect, useRef, useState, type ReactNode } from 'react'
import { Link, NavLink, useLocation, useNavigate } from 'react-router-dom'
import { useActions, useApp } from '../lib/app'
import { zar, zarShort } from '../lib/format'
import { Sheet, useWide } from '../lib/ui'
import Icon from './Icon'

const SIDE_NAV = [
  { to: '/', label: 'Home', icon: 'home' },
  { to: '/map', label: 'Map', icon: 'map' },
  { to: '/money', label: 'Money', icon: 'money' },
  { to: '/progress', label: "How far you've come", icon: 'progress' },
  { to: '/life', label: 'Life', icon: 'life' },
  { to: '/compare', label: 'Compare', icon: 'compare' },
]

const TABS = [
  { to: '/', label: 'Home', icon: 'home' },
  { to: '/map', label: 'Map', icon: 'map' },
  { to: '/money', label: 'Money', icon: 'money' },
  { to: '/progress', label: 'Progress', icon: 'progress' },
  { to: '/more', label: 'More', icon: 'more' },
]

const TITLES: Record<string, string> = {
  '/': 'Home',
  '/map': 'Map',
  '/money': 'Money',
  '/life': 'Life',
  '/compare': 'Compare',
  '/progress': "How far you've come",
  '/more': 'More',
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
      <aside className="side" aria-label="Sidebar">
        <Link className="brand side-brand" to="/">
          <img src="/icon.svg" width="26" height="26" alt="" />
          northbound
        </Link>
        <nav aria-label="Main" className="side-nav">
          {SIDE_NAV.map((n) => (
            <NavLink key={n.to} to={n.to} end={n.to === '/'} className={({ isActive }) => (isActive ? 'active' : '')}>
              <Icon name={n.icon} size={18} />
              {n.label}
            </NavLink>
          ))}
        </nav>
        <SideScenarios />
        <div className="side-foot">
          <LootCard compact />
          <NavLink to="/settings" className={({ isActive }) => `side-settings${isActive || pathname.startsWith('/settings') ? ' active' : ''}`}>
            <Icon name="settings" size={18} />
            Settings
          </NavLink>
        </div>
      </aside>
      <main className="page">{children}</main>
      <nav className="tabbar" aria-label="Main">
        {TABS.map((n) => (
          <NavLink key={n.to} to={n.to} end={n.to === '/'} className={({ isActive }) => (isActive || (n.to === '/more' && /^\/(more|settings|life|compare|scenario)/.test(pathname)) ? 'active' : '')}>
            <Icon name={n.icon} size={22} />
            <span>{n.label}</span>
          </NavLink>
        ))}
      </nav>
    </div>
  )
}

function SideScenarios() {
  const { scenarios, active, planFor } = useApp()
  const { setActive } = useActions()
  return (
    <div className="side-scen">
      <div className="side-h">
        <span>Scenarios</span>
        <Link to="/scenario/new" className="iconbtn small-icon" aria-label="New scenario" title="New scenario">
          <Icon name="plus" size={16} />
        </Link>
      </div>
      {scenarios.map((s) => (
        <div key={s._id} className={`sc${s._id === active._id ? ' on' : ''}`}>
          <button type="button" className="sc-pick" onClick={() => void setActive({ id: s._id })} aria-pressed={s._id === active._id} title={s._id === active._id ? 'Your main scenario' : 'Make this your main scenario'}>
            <span className="sc-name">
              {s._id === active._id && <span className="star" aria-label="Main">★ </span>}
              {s.name}
            </span>
            <span className="sc-num">{zarShort(planFor(s).targetZar)}</span>
          </button>
          <Link to={`/scenario/${s._id}`} className="iconbtn small-icon" aria-label={`Edit ${s.name}`} title="Edit">
            <Icon name="edit" size={15} />
          </Link>
        </div>
      ))}
    </div>
  )
}

/** Shows whether savings follow a Loot goal, with the way to link one front and centre. */
export function LootCard({ compact = false }: { compact?: boolean }) {
  const { goal, savingsSource, savings, goalMissing } = useApp()
  if (savingsSource === 'loot' && goal) {
    return (
      <Link to="/settings/loot" className={`loot-card linked${compact ? ' compact' : ''}`}>
        <span className="dot" aria-hidden="true" />
        <span>
          <small>Following Loot goal</small>
          <b>
            {goal.name}, {compact ? zarShort(savings.savedZar) : zar(savings.savedZar, 100)}
          </b>
        </span>
      </Link>
    )
  }
  return (
    <Link to="/settings/loot" className={`loot-card${compact ? ' compact' : ''}`}>
      <Icon name="link" size={compact ? 18 : 22} />
      <span>
        <b>{goalMissing ? 'Relink your Loot goal' : 'Link your Loot goal'}</b>
        <small>{compact ? 'Savings update as you save' : 'Your progress updates every time you add money in Loot.'}</small>
      </span>
      {!compact && <span className="btn primary small">Link</span>}
    </Link>
  )
}

/** The active scenario's name, with a menu to switch, edit or add one. */
export function ScenarioSwitcher({ tone = 'plain' }: { tone?: 'plain' | 'dark' | 'sun' }) {
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

  const list = (
    <div className="scen-list">
      <p className="scen-note">Your main scenario drives Home, the map, Money and your Loot goal's target.</p>
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
            <span className="radio" aria-hidden="true" />
            <span>
              <b>
                {s.name}
                {s._id === active._id && <span className="main-badge">Main</span>}
              </b>
              <small>
                {zar(planFor(s).targetZar, 1000)}
                {s._id !== active._id ? '. Tap to make main' : ''}
              </small>
            </span>
          </button>
          <button
            type="button"
            className="btn quiet small"
            onClick={() => {
              setOpen(false)
              navigate(`/scenario/${s._id}`)
            }}
          >
            Edit
          </button>
        </div>
      ))}
      <button
        type="button"
        className="btn quiet block"
        onClick={() => {
          setOpen(false)
          navigate('/scenario/new')
        }}
      >
        <Icon name="plus" size={18} /> New scenario
      </button>
    </div>
  )

  return (
    <div className="switcher" ref={ref}>
      <button type="button" className={`switch-btn ${tone}`} onClick={() => setOpen(!open)} aria-expanded={open} aria-haspopup="dialog" aria-label={`Main scenario: ${active.name}. Change`}>
        <span className="star" aria-hidden="true">★</span>
        <span className="sw-name">{active.name}</span>
        <Icon name="down" size={16} />
      </button>
      <Link to={`/scenario/${active._id}`} className={`switch-edit ${tone}`} aria-label={`Edit ${active.name}`}>
        <Icon name="edit" size={15} />
        <span>Edit</span>
      </Link>
      {wide ? (
        open && (
          <div className="popover" role="dialog" aria-label="Scenarios">
            {list}
          </div>
        )
      ) : (
        <Sheet open={open} onClose={() => setOpen(false)} label="Scenarios">
          <h2 style={{ margin: '0 0 10px' }}>Scenarios</h2>
          {list}
        </Sheet>
      )}
    </div>
  )
}

/** Header row used at the top of each screen on a phone. On desktop the sidebar carries the brand. */
export function TopBar({ dark, sun }: { dark?: boolean; sun?: boolean }) {
  return (
    <div className="topbar-row">
      <Link className="brand topbrand" to="/">
        northbound
      </Link>
      <ScenarioSwitcher tone={dark ? 'dark' : sun ? 'sun' : 'plain'} />
    </div>
  )
}

/** Page heading for desktop and phone: title on the left, scenario controls on the right. */
export function PageHead({ title, sub, dark }: { title: string; sub?: ReactNode; dark?: boolean }) {
  return (
    <header className={`pagehead${dark ? ' dark' : ''}`}>
      <TopBar dark={dark} />
      <h1 className="h1">{title}</h1>
      {sub && <p className="pagehead-sub">{sub}</p>}
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
