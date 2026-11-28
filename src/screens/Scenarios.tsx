import { useParams } from 'react-router-dom'
import PlansSection from '../components/PlansSection'
import UpdateSection from '../components/UpdateSection'
import Compare from './Compare'
import { QuotesSection, ScenariosSection } from './Settings'

const TABS: Record<string, { title: string; blurb: string }> = {
  list: { title: 'My scenarios', blurb: 'Pick your main scenario, edit one or add a new one.' },
  update: { title: 'Update with Claude', blurb: 'Have Claude research a scenario in depth: every document, step, cost and the job you are targeting.' },
  plans: { title: 'Other countries', blurb: 'Import a plan for another country, made with Claude.' },
}

/** The Scenarios tab: compare, your list, Claude's updates and other countries, one tap apart. */
export default function Scenarios() {
  const { tab } = useParams()
  const t = tab ? TABS[tab] : undefined
  if (!t) return <Compare />
  return (
    <div className="main" style={{ maxWidth: 900 }}>
      <div className="stack" style={{ gap: 6 }}>
        <h1 className="h1">{t.title}</h1>
        <p className="muted" style={{ margin: 0 }}>
          {t.blurb}
        </p>
      </div>
      <section className="card">{tab === 'list' ? <ScenariosSection /> : tab === 'update' ? <UpdateSection /> : <PlansSection />}</section>
    </div>
  )
}

/** Money › All my quotes. */
export function QuotesPage() {
  return (
    <div className="main" style={{ maxWidth: 900 }}>
      <div className="stack" style={{ gap: 6 }}>
        <h1 className="h1">All my quotes</h1>
        <p className="muted" style={{ margin: 0 }}>
          Every price you found, with its history.
        </p>
      </div>
      <section className="card">
        <QuotesSection />
      </section>
    </div>
  )
}
