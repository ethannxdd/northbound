import { Link } from 'react-router-dom'
import { cityOf } from '@shared/engine'
import { atLeast, visibleDocuments, type DocStatus } from '@shared/documents'
import Icon from '../components/Icon'
import { LootCard } from '../components/Shell'
import { useApp } from '../lib/app'
import { ProfileCard, SECTIONS } from './Settings'

/** Profile: your account, your other tools, and settings, grouped so they're easy to scan. */
export default function Profile() {
  const { input, docs, savingsSource } = useApp()
  const required = visibleDocuments(input, String).filter((d) => !d.optional)
  const docsDone = required.filter((d) => atLeast(docs[d.key]?.status as DocStatus | undefined, 'arrived')).length
  const docsTotal = required.length

  return (
    <div className="main" style={{ maxWidth: 760 }}>
      <h1 className="h1">Profile</h1>
      <div>
        <ProfileCard />
        {savingsSource !== 'loot' && (
          <div style={{ marginTop: 12 }}>
            <LootCard />
          </div>
        )}

        <h2 className="menu-group-h">Your move</h2>
        <div className="menu-list">
          <Row to="/paperwork" icon="docs" label="Paperwork tracker" sub={`${docsDone} of ${docsTotal} documents in hand`} />
          <Row to="/life" icon="life" label={`Life in ${cityOf(input).name}`} sub="Daylight, prices and neighbourhoods" />
          <Row to="/compare" icon="compare" label="Compare scenarios" sub="Side by side, with the difference in words" />
          <Row to="/settlement" icon="flag" label="Settling" sub="Your path to settling, and its conditions" />
          <Row to="/settings/scenarios" icon="scenarios" label="Your scenarios" sub="Pick your main one, edit or add" />
        </div>

        <h2 className="menu-group-h">Settings</h2>
        <div className="menu-list">
          {SECTIONS.filter((s) => s.id !== 'scenarios' && s.id !== 'settling').map((s) => (
            <Row key={s.id} to={`/settings/${s.id}`} icon={s.icon} label={s.label} sub={s.blurb} />
          ))}
        </div>
        <p className="tiny faint" style={{ margin: '24px 4px 0' }}>
          Northbound is a planning tool, not legal or financial advice. Check rules on GOV.UK before you apply.
        </p>
      </div>
    </div>
  )
}

function Row({ to, icon, label, sub }: { to: string; icon: string; label: string; sub: string }) {
  return (
    <Link to={to} className="menu-row">
      <Icon name={icon} size={22} />
      <span className="txt">
        <b>{label}</b>
        <small>{sub}</small>
      </span>
      <Icon name="chevron" size={18} />
    </Link>
  )
}
