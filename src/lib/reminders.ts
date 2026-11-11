import { buildIcs } from '@shared/ics'
import type { Task } from '@shared/timeline'

/** Downloads every step that isn't done as a calendar file, with a reminder the evening before each. */
export function downloadCalendar(tasks: Task[], done: Set<string>) {
  const stamp = new Date().toISOString().replace(/[-:]/g, '').replace(/\.\d+Z$/, 'Z')
  const ics = buildIcs(tasks, { stamp, done })
  const url = URL.createObjectURL(new Blob([ics], { type: 'text/calendar;charset=utf-8' }))
  const a = document.createElement('a')
  a.href = url
  a.download = 'northbound-move-plan.ics'
  document.body.appendChild(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 2000)
}

function urlBase64ToUint8Array(base64: string): Uint8Array {
  const padding = '='.repeat((4 - (base64.length % 4)) % 4)
  const raw = atob((base64 + padding).replace(/-/g, '+').replace(/_/g, '/'))
  return Uint8Array.from(raw, (c) => c.charCodeAt(0))
}

export type PushResult = { ok: true; sub: { endpoint: string; p256dh: string; auth: string } } | { ok: false; reason: string }

/** Asks for permission and subscribes this device to reminders. */
export async function subscribeToPush(vapidKey: string | null): Promise<PushResult> {
  if (!('serviceWorker' in navigator) || !('PushManager' in window) || !('Notification' in window)) {
    return { ok: false, reason: "This browser can't show notifications. On an iPhone, add Northbound to your Home Screen first, then turn reminders on from there." }
  }
  if (!vapidKey) return { ok: false, reason: "Reminders aren't set up on the server yet." }
  const reg = await navigator.serviceWorker.getRegistration()
  if (!reg) return { ok: false, reason: 'Reminders work in the installed app or on the live site, not in this preview.' }
  const permission = await Notification.requestPermission()
  if (permission !== 'granted') return { ok: false, reason: 'Notifications are blocked for Northbound. Allow them in your browser or phone settings.' }
  const sub = (await reg.pushManager.getSubscription()) ?? (await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: urlBase64ToUint8Array(vapidKey) as BufferSource }))
  const json = sub.toJSON() as { endpoint?: string; keys?: { p256dh?: string; auth?: string } }
  if (!json.endpoint || !json.keys?.p256dh || !json.keys.auth) return { ok: false, reason: "Couldn't set up notifications on this device." }
  return { ok: true, sub: { endpoint: json.endpoint, p256dh: json.keys.p256dh, auth: json.keys.auth } }
}

export async function currentPushEndpoint(): Promise<string | null> {
  if (!('serviceWorker' in navigator)) return null
  const reg = await navigator.serviceWorker.getRegistration()
  const sub = await reg?.pushManager.getSubscription()
  return sub?.endpoint ?? null
}

export async function unsubscribeThisDevice(): Promise<string | null> {
  if (!('serviceWorker' in navigator)) return null
  const reg = await navigator.serviceWorker.getRegistration()
  const sub = await reg?.pushManager.getSubscription()
  if (!sub) return null
  const endpoint = sub.endpoint
  await sub.unsubscribe()
  return endpoint
}
