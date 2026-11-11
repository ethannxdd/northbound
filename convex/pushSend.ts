'use node'
import * as webpush from 'web-push'
import { v } from 'convex/values'
import { internalAction } from './_generated/server'
import { internal } from './_generated/api'

/** Sends today's reminders. Runs once a day from crons.ts. Needs the VAPID keys set on the deployment. */
export const sendDaily = internalAction({
  args: { today: v.optional(v.string()) },
  handler: async (ctx, a) => {
    const pub = process.env.VAPID_PUBLIC_KEY
    const priv = process.env.VAPID_PRIVATE_KEY
    if (!pub || !priv) return { sent: 0, skipped: 'VAPID keys not set' }
    webpush.setVapidDetails(process.env.VAPID_SUBJECT ?? 'https://goingnorthbound.vercel.app', pub, priv)
    const today = a.today ?? new Date().toISOString().slice(0, 10)
    const batches = await ctx.runQuery(internal.push.dueToday, { today })
    let sent = 0
    for (const b of batches) {
      const dead: string[] = []
      for (const m of b.messages) {
        for (const s of b.subs) {
          try {
            await webpush.sendNotification({ endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } }, JSON.stringify({ title: m.title, body: m.body, url: '/map' }))
            sent++
          } catch (e) {
            const status = (e as { statusCode?: number }).statusCode
            if (status === 404 || status === 410) dead.push(s.endpoint)
          }
        }
      }
      await ctx.runMutation(internal.push.logSent, { userId: b.userId, keys: b.messages.map((m) => m.key), today, deadEndpoints: [...new Set(dead)] })
    }
    return { sent }
  },
})
