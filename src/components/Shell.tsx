import type { ReactNode } from 'react'
import { Link, NavLink, useNavigate } from 'react-router-dom'
import { useActions, useApp } from '../lib/app'
import { zarShort } from '../lib/format'

const NAV = [
  { to: '/', label: 'Home' },
  { to: '/map', label: 'Map' },
  { to: '/money', label: 'Money' },
  { to: '/life', label: 'Life' },
  { to: '/compare', label: 'Compare' },
]

export default function Shell({ children }: { children: ReactNode }) {
  const { scenarios, active, planFor } = useApp()
  const { setActive } = useActions()
  const navigate = useNavigate()
  return (
    <div className="shell">
      <aside className="side" aria-label="Sidebar">
        <Link className="brand" to="/">
          northbound
        </Link>
        <nav aria-label="Main">
          {[...NAV, { to: '/progress', label: "How far you've come" }].map((n) => (
            <NavLink key={n.to} to={n.to} end={n.to === '/'} className={({ isActive }) => (isActive ? 'active' : '')}>
              {n.label}
            </NavLink>
          ))}
        </nav>
        <div className="sh">Your scenarios</div>
        {scenarios.map((s) => (
          <button key={s._id} type="button" className={`sc${s._id === active._id ? ' on' : ''}`} onClick={() => void setActive({ id: s._id })} aria-pressed={s._id === active._id}>
            <span>{s.name}</span>
            <span>{zarShort(planFor(s).targetZar)}</span>
          </button>
        ))}
        <div className="foot">
          <button type="button" className="btn quiet small" onClick={() => navigate('/scenario/new')}>
            New scenario
          </button>
          <NavLink to="/settings" className="btn quiet small">
            Settings and rules
          </NavLink>
        </div>
      </aside>
      <main className="page">{children}</main>
      <nav className="tabbar" aria-label="Main">
        {NAV.map((n) => (
          <NavLink key={n.to} to={n.to} end={n.to === '/'} className={({ isActive }) => (isActive ? 'active' : '')}>
            {n.label}
          </NavLink>
        ))}
      </nav>
    </div>
  )
}

/** The brand row at the top of each phone screen. */
export function TopBar({ right, dark }: { right?: ReactNode; dark?: boolean }) {
  return (
    <div className="row" style={{ alignItems: 'center', color: dark ? 'var(--head-text)' : undefined }}>
      <Link className="brand topbrand" to="/settings" aria-label="Northbound settings">
        northbound
      </Link>
      <span className="small" style={{ color: dark ? 'var(--head-muted)' : 'var(--muted)' }}>
        {right}
      </span>
    </div>
  )
}
