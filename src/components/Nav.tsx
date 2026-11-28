import { NavLink, useLocation } from 'react-router-dom'

/**
 * Northbound's map of itself: five tabs, each with the screens that belong to it.
 * The top bar shows the tabs; each screen in a tab shows its sub-tabs, so related screens are one tap apart.
 */
export interface NavGroup {
  id: string
  label: string
  /** Where the tab goes */
  to: string
  /** One line on what's here, for search and the home screen */
  blurb: string
  icon: string
  tabs: { to: string; label: string; end?: boolean }[]
  /** Paths that count as this tab */
  match: (path: string) => boolean
}

export const GROUPS: NavGroup[] = [
  {
    id: 'home',
    label: 'Home',
    to: '/',
    blurb: 'Your number, next steps and target job',
    icon: 'home',
    tabs: [],
    match: (p) => p === '/',
  },
  {
    id: 'money',
    label: 'Money',
    to: '/money',
    blurb: 'Every cost, your quotes and your saving progress',
    icon: 'money',
    tabs: [
      { to: '/money', label: 'Costs', end: true },
      { to: '/progress', label: 'Saving progress' },
      { to: '/money/quotes', label: 'All my quotes' },
    ],
    match: (p) => p.startsWith('/money') || p === '/progress',
  },
  {
    id: 'plan',
    label: 'Steps',
    to: '/map',
    blurb: 'The route map and your documents',
    icon: 'map',
    tabs: [
      { to: '/map', label: 'Route map' },
      { to: '/paperwork', label: 'Paperwork' },
    ],
    match: (p) => p === '/map' || p === '/paperwork',
  },
  {
    id: 'life',
    label: 'Life',
    to: '/life',
    blurb: 'A month there, neighbourhoods and settling for good',
    icon: 'life',
    tabs: [
      { to: '/life', label: 'A month there', end: true },
      { to: '/settlement', label: 'Settling for good' },
    ],
    match: (p) => p.startsWith('/life') || p === '/settlement',
  },
  {
    id: 'scenarios',
    label: 'Scenarios',
    to: '/scenarios',
    blurb: 'Compare, edit, and update them with Claude',
    icon: 'scenarios',
    tabs: [
      { to: '/scenarios', label: 'Compare', end: true },
      { to: '/scenarios/list', label: 'My scenarios' },
      { to: '/scenarios/update', label: 'Update with Claude' },
      { to: '/scenarios/plans', label: 'Other countries' },
    ],
    match: (p) => p.startsWith('/scenarios') || p.startsWith('/scenario/'),
  },
]

export function groupOf(path: string): NavGroup | undefined {
  return GROUPS.find((g) => g.match(path))
}

/** The sub-tabs of the screen's tab. Nothing on screens that have none. */
export function SubNav() {
  const { pathname } = useLocation()
  const g = groupOf(pathname)
  if (!g || g.tabs.length < 2) return null
  // Item pages (/money/item/…) belong to Costs.
  return (
    <nav className="subnav" aria-label={`${g.label} sections`}>
      {g.tabs.map((t) => (
        <NavLink
          key={t.to}
          to={t.to}
          end={t.end}
          className={({ isActive }) => (isActive || (t.to === '/money' && /^\/money\/(item|quote)(\/|$)/.test(pathname)) || (t.to === '/life' && pathname.startsWith('/life/item')) ? 'active' : '')}
        >
          {t.label}
        </NavLink>
      ))}
    </nav>
  )
}
