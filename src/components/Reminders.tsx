import { useMutation, useQuery } from 'convex/react'
import { useState } from 'react'
import { api } from '../../convex/_generated/api'
import { useApp } from '../lib/app'
import { downloadCalendar, subscribeToPush, unsubscribeThisDevice } from '../lib/reminders'
import Icon from './Icon'
import { useTimeline } from './TransitMap'

/** "Add to calendar" and phone reminders, side by side. */
export default function RemindersControls({ compact = false }: { compact?: boolean }) {
  const { profile, done } = useApp()
  const tasks = useTimeline()
  const vapid = useQuery(api.push.vapidKey)
  const subscribe = useMutation(api.push.subscribe)
  const unsubscribe = useMutation(api.push.unsubscribe)
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState<string | null>(null)
  const on = !!profile.remindersOn

  async function toggle() {
    setBusy(true)
    setMsg(null)
    try {
      if (on) {
        const endpoint = await unsubscribeThisDevice()
        await unsubscribe({ endpoint: endpoint ?? undefined })
        setMsg('Reminders are off.')
      } else {
        const res = await subscribeToPush(vapid ?? null)
        if (!res.ok) setMsg(res.reason)
        else {
          await subscribe(res.sub)
          setMsg("Reminders are on. You'll get a nudge 2 weeks before each step, and when it's due.")
        }
      }
    } catch {
      setMsg("Couldn't change reminders. Try again.")
    }
    setBusy(false)
  }

  return (
    <div className="stack" style={{ gap: 8 }}>
      <div className="row" style={{ justifyContent: 'flex-start', flexWrap: 'wrap', gap: 8 }}>
        <button type="button" className="btn quiet sm" onClick={() => downloadCalendar(tasks, done)}>
          <Icon name="calendar" size={17} /> Add to calendar
        </button>
        <button type="button" className={`btn sm ${on ? 'quiet' : 'quiet'}`} onClick={() => void toggle()} disabled={busy} aria-pressed={on}>
          <Icon name="bell" size={17} /> {on ? 'Reminders on' : 'Turn on reminders'}
        </button>
      </div>
      {msg && <p className="hint" role="status" style={{ margin: 0 }}>{msg}</p>}
      {!compact && !msg && <p className="hint" style={{ margin: 0 }}>The calendar file adds every step that isn't done, each with a reminder the evening before.</p>}
    </div>
  )
}
