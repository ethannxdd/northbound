import { useState } from 'react'
import { CITIES } from '@shared/cities'
import { PageHead } from '../components/Shell'
import TransitMap, { StopDetail, useNextStop, useTimeline } from '../components/TransitMap'
import { useApp } from '../lib/app'
import { useOpening, useWide } from '../lib/ui'

export default function MapScreen() {
  const { input, done } = useApp()
  const tasks = useTimeline()
  const next = useNextStop()
  const wide = useWide()
  const [selected, setSelected] = useState<string | null>(null)
  useOpening()
  const finished = tasks.filter((t) => done.has(t.key)).length
  const shown = tasks.find((t) => t.key === (selected ?? next?.key)) ?? tasks[0]

  const key = (
    <div className="key">
      <span style={{ ['--k' as string]: 'var(--l-paper)' }}>Paperwork</span>
      <span style={{ ['--k' as string]: 'var(--l-money)' }}>Money</span>
      <span style={{ ['--k' as string]: 'var(--l-move)' }}>Move</span>
    </div>
  )

  return (
    <div className="screen-map">
      <PageHead dark title={`Cape Town to ${CITIES[input.city].name}`} sub={`${finished} of ${tasks.length} steps done. Three lines meet at your visa decision.`} />
      {wide ? (
        <div className="map-desk">
          <div className="map-col">
            {key}
            <TransitMap selectedKey={shown?.key} onSelect={setSelected} />
          </div>
          <aside className="detail-col" aria-label="Step details">
            {shown && <StopDetail task={shown} />}
          </aside>
        </div>
      ) : (
        <>
          {key}
          <TransitMap />
        </>
      )}
    </div>
  )
}
