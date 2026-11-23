import { useState } from 'react'
import { CITIES } from '@shared/cities'
import RemindersControls from '../components/Reminders'
import TransitMap, { StopDetail, useTimeline } from '../components/TransitMap'
import { useApp } from '../lib/app'
import { useWide } from '../lib/ui'

export default function MapScreen() {
  const { input, done, savings } = useApp()
  const tasks = useTimeline()
  const wide = useWide()
  const [selected, setSelected] = useState<string | null>(null)
  const finished = tasks.filter((t) => done.has(t.key)).length
  const next = tasks.find((t) => !done.has(t.key) && !(t.key === 'saving' && savings.monthlyZar > 0))
  const shown = tasks.find((t) => t.key === (selected ?? next?.key)) ?? tasks[0]
  const city = CITIES[input.city].name

  return (
    <div className="main map-layout">
      <section aria-labelledby="map-title" className="card map-card">
        <div className="map-head">
          <div className="stack" style={{ gap: 4 }}>
            <h1 id="map-title" className="h1">
              Your route north
            </h1>
            <p className="muted small" style={{ margin: 0 }}>
              Three lines meet at the visa decision, then run as one to {city}. {finished} of {tasks.length} steps done.
            </p>
          </div>
          <div className="legend-lines">
            <span style={{ ['--k' as string]: 'var(--l-paper)' }}>Paperwork</span>
            <span style={{ ['--k' as string]: 'var(--l-money)' }}>Money</span>
            <span style={{ ['--k' as string]: 'var(--l-move)' }}>Move</span>
          </div>
        </div>
        <TransitMap selectedKey={wide ? shown?.key : undefined} onSelect={wide ? setSelected : undefined} />
        <div className="divider" />
        <RemindersControls compact />
      </section>
      {wide && shown && (
        <aside aria-label="Selected stop" className="map-aside glass">
          <StopDetail task={shown} />
        </aside>
      )}
    </div>
  )
}
