import { Link, Navigate } from 'react-router-dom'
import { CITIES } from '@shared/cities'
import Icon from '../components/Icon'
import { LootCard } from '../components/Shell'
import { useApp } from '../lib/app'
import { useWide } from '../lib/ui'
import { SECTIONS } from './Settings'

/** The phone's "More" tab: everything that isn't in the tab bar, grouped so it's easy to scan. */
export default function More() {
  const wide = useWide()
  const { input } = useApp()
  if (wide) return <Navigate to="/settings/loot" replace />
  const city = CITIES[input.city].name
  return (
    <div className="more">
      <h1 className="h1" style={{ padding: '22px 20px 4px' }}>
        More
      </h1>
      <div style={{ padding: '10px 14px 4px' }}>
        <LootCard />
      </div>
      <Group title="Your move">
        <Row to="/life" icon="life" label={`Life in ${city}`} sub="Daylight, prices and getting around" />
        <Row to="/compare" icon="compare" label="Compare scenarios" sub="Side by side, with the difference in words" />
        <Row to="/settings/scenarios" icon="scenarios" label="Your scenarios" sub="Switch, edit or add one" />
      </Group>
      <Group title="Settings">
        {SECTIONS.filter((s) => s.id !== 'scenarios' && s.id !== 'loot').map((s) => (
          <Row key={s.id} to={`/settings/${s.id}`} icon={s.icon} label={s.label} sub={s.blurb} />
        ))}
      </Group>
    </div>
  )
}

function Group({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="more-group" aria-label={title}>
      <h2>{title}</h2>
      <div className="more-list">{children}</div>
    </section>
  )
}

function Row({ to, icon, label, sub }: { to: string; icon: string; label: string; sub: string }) {
  return (
    <Link to={to} className="more-row">
      <span className="more-ic">
        <Icon name={icon} size={20} />
      </span>
      <span className="more-txt">
        <b>{label}</b>
        <small>{sub}</small>
      </span>
      <Icon name="chevron" size={18} />
    </Link>
  )
}
