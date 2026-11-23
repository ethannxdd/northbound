import { Link } from 'react-router-dom'
import { CITIES } from '@shared/cities'
import { DOCUMENTS, atLeast, type DocStatus } from '@shared/documents'
import Icon from '../components/Icon'
import { LootCard, PageHead } from '../components/Shell'
import { useApp } from '../lib/app'
import { devNoAuth } from '../lib/auth'
import { SECTIONS } from './Settings'

/** Profile: your account, your other tools, and settings, grouped so they're easy to scan. */
export default function Profile() {
  const { account, input, docs } = useApp()
  const name = account.email ?? account.lootEmail ?? (devNoAuth ? 'Test mode' : 'You')
  const docsDone = DOCUMENTS.filter((d) => !d.optional && atLeast(docs[d.key]?.status as DocStatus | undefined, 'arrived')).length
  const docsTotal = DOCUMENTS.filter((d) => !d.optional).length

  return (
    <div>
      <PageHead title="Profile" />
      <div className="container wrap" style={{ maxWidth: 760 }}>
        <div className="card profile-head">
          <span className="avatar" aria-hidden="true">
            {name.slice(0, 1).toUpperCase()}
          </span>
          <span style={{ minWidth: 0 }}>
            <b style={{ display: 'block', fontSize: 17, overflow: 'hidden', textOverflow: 'ellipsis' }}>{name}</b>
            <span className="small muted">{account.email ? 'Northbound account' : account.lootLinked ? 'Signed in with Loot' : ''}{account.lootLinked && account.email ? ', linked to Loot' : ''}</span>
          </span>
        </div>
        <div style={{ marginTop: 12 }}>
          <LootCard />
        </div>

        <h2 className="menu-group-h">Your move</h2>
        <div className="menu-list">
          <Row to="/paperwork" icon="docs" label="Paperwork tracker" sub={`${docsDone} of ${docsTotal} documents in hand`} />
          <Row to="/life" icon="life" label={`Life in ${CITIES[input.city].name}`} sub="Daylight, prices and neighbourhoods" />
          <Row to="/compare" icon="compare" label="Compare scenarios" sub="Side by side, with the difference in words" />
          <Row to="/settlement" icon="flag" label="Settling in the UK" sub="Your 5-year path, earnings and English" />
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
