import { useEffect, useId, useRef, useState, type ReactNode } from 'react'
import { Link, NavLink, useLocation, useNavigate } from 'react-router-dom'
import { cityPhoto } from '@shared/cities'
import { cityOf } from '@shared/engine'
import { useActions, useApp } from '../lib/app'
import { plural, zar } from '../lib/format'
import { Sheet, useWide } from '../lib/ui'
import Icon from './Icon'
import { GROUPS, SubNav } from './Nav'
import { SearchButton } from './Search'

const TITLES: Record<string, string> = {
  '/': 'Home',
  '/map': 'Route map',
  '/money': 'Costs',
  '/money/quotes': 'All my quotes',
  '/life': 'A month there',
  '/scenarios': 'Compare scenarios',
  '/scenarios/list': 'My scenarios',
  '/scenarios/update': 'Update with Claude',
  '/scenarios/plans': 'Other countries',
  '/progress': 'Saving progress',
  '/paperwork': 'Paperwork',
  '/settlement': 'Settling for good',
  '/profile': 'Profile',
}

/** The app icon, drawn inline so it's sharp at any size. Keep in step with public/icon.svg. */
export function BrandMark({ size = 34 }: { size?: number }) {
  const id = useId().replace(/:/g, '')
  return (
    <svg className="brand-tile" width={size} height={size} style={{ width: size, height: size }} viewBox="0 0 120 120" aria-hidden="true">
      <defs>
        <linearGradient id={`${id}bg`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#0E1520" />
          <stop offset="1" stopColor="#05070B" />
        </linearGradient>
        <linearGradient id={`${id}sh`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#FFFFFF" stopOpacity="0.1" />
          <stop offset="1" stopColor="#FFFFFF" stopOpacity="0" />
        </linearGradient>
      </defs>
      <rect width="120" height="120" fill={`url(#${id}bg)`} />
      <rect width="120" height="56" fill={`url(#${id}sh)`} />
      <g fill="none" strokeWidth="12" strokeLinecap="round" strokeLinejoin="round">
        <path d="M35 92V30" stroke="#C08BFF" />
        <path d="M85 90V54" stroke="#64D2FF" />
        <path d="M85 54V28M71 42l14-14 14 14" stroke="#F5F5F7" />
        <path d="M35 30L85 90" stroke="#5FE3B0" />
      </g>
    </svg>
  )
}

export default function Shell({ children }: { children: ReactNode }) {
  const { pathname, hash } = useLocation()
  const section = pathname.split('/')[1]
  const nav = useRef<HTMLElement>(null)

  useEffect(() => {
    const base = TITLES[pathname] ?? (pathname.startsWith('/settings') ? 'Settings' : pathname.startsWith('/scenario') ? 'Scenario' : pathname.includes('/item/') ? 'Item' : pathname.startsWith('/money') ? 'Money' : '')
    document.title = base ? `${base} · Northbound` : 'Northbound'
  }, [pathname])

  // Links like /paperwork#doc-passport (from search) scroll to that item and flash it once it's on screen.
  useEffect(() => {
    if (!hash || pathname.startsWith('/settings')) return
    const t = window.setTimeout(() => {
      const el = document.getElementById(decodeURIComponent(hash.slice(1)))
      if (!el) return
      el.closest('details')?.setAttribute('open', '')
      el.scrollIntoView({ block: 'center' })
      const box = el.closest<HTMLElement>('.card, li, section') ?? el
      box.classList.remove('flash')
      void box.offsetWidth
      box.classList.add('flash')
    }, 120)
    return () => window.clearTimeout(t)
  }, [hash, pathname])

  // New screen: back to the top, and on a phone bring its tab into view. Sheets on the same screen (/money/quote) don't count.
  useEffect(() => {
    window.scrollTo(0, 0)
    const n = nav.current
    const el = n?.querySelector<HTMLElement>('.active')
    if (n) n.scrollLeft = el && n.scrollWidth > n.clientWidth ? el.offsetLeft - (n.clientWidth - el.offsetWidth) / 2 : 0
  }, [section])

  return (
    <div className="shell">
      <header className="topbar">
        <div className="topbar-in">
          <Link to="/" className="brand brand-mark" aria-label="Northbound, your trip">
            <BrandMark />
            northbound
          </Link>
          <nav aria-label="Main" className="pills" ref={nav}>
            {GROUPS.map((g) => (
              <NavLink key={g.id} to={g.to} end={g.to === '/'} className={() => (g.match(pathname) ? 'active' : '')} aria-current={g.match(pathname) ? 'page' : undefined}>
                {g.label}
              </NavLink>
            ))}
          </nav>
          <div className="topbar-right">
            <SearchButton />
            <RateChip />
            <AccountButton />
          </div>
        </div>
      </header>
      <main className="page">
        <SubNav />
        {/* Keyed on the first segment, so opening a sheet route (/money/quote) doesn't replay the screen's opening. */}
        <div key={pathname.split('/')[1]} className="rise">
          {children}
        </div>
      </main>
    </div>
  )
}

/** Today's rate, or the scenario's fixed one. Opens the scenario, where it's set. */
function RateChip() {
  const { input, active, liveRate, cur } = useApp()
  const live = input.rateMode === 'live' && !!liveRate
  return (
    <Link to={`/scenario/${active._id}`} className="rate-chip" aria-label={`Exchange rate: 1 pound is ${input.rate.toFixed(2)} rand, ${live ? 'live' : 'fixed'}. Change it in the scenario`}>
      <span>{cur.symbol}1 =</span> R{input.rate.toFixed(2)} · {live ? 'live' : 'fixed'}
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
  const { scenarios, active, planFor, effective } = useApp()
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
            {(() => {
              const ph = cityPhoto(cityOf(effective(s)), 120)
              return ph ? <img src={ph} alt="" /> : <span className="ph-blank" aria-hidden="true" />
            })()}
            <span>
              <b>
                {s.name}
                {s._id === active._id && <span className="main-badge">Main</span>}
              </b>
              <small>
                {zar(planFor(s, s._id).targetZar, 1000)}
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
