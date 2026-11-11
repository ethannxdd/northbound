import { useState } from 'react'
import { CITIES } from '@shared/cities'
import RemindersControls from '../components/Reminders'
import { PageHead } from '../components/Shell'
import TransitMap, { StopDetail, useTimeline } from '../components/TransitMap'
import { useApp } from '../lib/app'
import { useOpening, useWide } from '../lib/ui'

export default function MapScreen() {
  const { input, done, savings } = useApp()
  const tasks = useTimeline()
  const wide = useWide()
  const [selected, setSelected] = useState<string | null>(null)
  useOpening()
  const finished = tasks.filter((t) => done.has(t.key)).length
  const next = tasks.find((t) => !done.has(t.key) && !(t.key === 'saving' && savings.monthlyZar > 0))
  const shown = tasks.find((t) => t.key === (selected ?? next?.key)) ?? tasks[0]

  const key = (
    <div className="key" style={{ marginBottom: 6 }}>
      <span style={{ ['--k' as string]: 'var(--l-paper)' }}>Paperwork</span>
      <span style={{ ['--k' as string]: 'var(--l-money)' }}>Money</span>
      <span style={{ ['--k' as string]: 'var(--l-move)' }}>Move</span>
    </div>
  )

  return (
    <div>
      <PageHead title={`Cape Town to ${CITIES[input.city].name}`} sub={`${finished} of ${tasks.length} steps done. Three lines meet at your visa decision.`}>
        <div style={{ marginTop: 14 }}>
          <RemindersControls compact />
        </div>
      </PageHead>
      {wide ? (
        <div className="container map-desk" style={{ marginTop: 18 }}>
          <div>
            {key}
            <TransitMap selectedKey={shown?.key} onSelect={setSelected} />
          </div>
          <aside className="detail-col" aria-label="Step details">
            <div className="card lift">{shown && <StopDetail task={shown} />}</div>
          </aside>
        </div>
      ) : (
        <div className="wrap" style={{ paddingTop: 12 }}>
          {key}
          <TransitMap />
        </div>
      )}
    </div>
  )
}
