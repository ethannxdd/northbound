import { CITIES } from '@shared/cities'
import { TopBar } from '../components/Shell'
import TransitMap, { useTimeline } from '../components/TransitMap'
import { useApp } from '../lib/app'
import { useOpening } from '../lib/ui'

export default function MapScreen() {
  const { input, done } = useApp()
  const tasks = useTimeline()
  useOpening()
  const finished = tasks.filter((t) => done.has(t.key)).length
  return (
    <div className="narrow-page">
      <div className="head">
        <TopBar dark right={`${finished} of ${tasks.length} stops done`} />
        <h1 className="h1">Cape Town to {CITIES[input.city].name}</h1>
        <p>Three lines meet at your visa decision. Select a stop for the details.</p>
      </div>
      <div className="key">
        <span style={{ ['--k' as string]: 'var(--l-paper)' }}>Paperwork</span>
        <span style={{ ['--k' as string]: 'var(--l-money)' }}>Money</span>
        <span style={{ ['--k' as string]: 'var(--l-move)' }}>Move</span>
      </div>
      <TransitMap />
    </div>
  )
}
