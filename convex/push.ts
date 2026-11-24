import { v } from 'convex/values'
import { internalMutation, internalQuery, mutation, query } from './_generated/server'
import { requireKey } from './lib/user'
import { addDays } from '../shared/dates'
import { plan } from '../shared/engine'
import type { RuleOverrides } from '../shared/rules'
import { buildTimeline } from '../shared/timeline'
import { DEFAULT_SCENARIO } from '../shared/types'
import { packForScenario } from './plans'

declare const process: { env: Record<string, string | undefined> }

/** The public key the browser needs to subscribe. Not a secret. */
export const vapidKey = query({
  args: {},
  handler: async () => process.env.VAPID_PUBLIC_KEY ?? null,
})

export const subscribe = mutation({
  args: { endpoint: v.string(), p256dh: v.string(), auth: v.string() },
  handler: async (ctx, a) => {
    const uid = await requireKey(ctx)
    const existing = await ctx.db
      .query('pushSubs')
      .withIndex('by_endpoint', (q) => q.eq('endpoint', a.endpoint))
      .unique()
    if (existing) await ctx.db.patch(existing._id, { userId: uid, p256dh: a.p256dh, auth: a.auth })
    else await ctx.db.insert('pushSubs', { userId: uid, ...a, createdAt: Date.now() })
    const profile = await ctx.db.query('profiles').withIndex('by_user', (q) => q.eq('userId', uid)).unique()
    if (profile) await ctx.db.patch(profile._id, { remindersOn: true })
  },
})

export const unsubscribe = mutation({
  args: { endpoint: v.optional(v.string()) },
  handler: async (ctx, a) => {
    const uid = await requireKey(ctx)
    const subs = await ctx.db.query('pushSubs').withIndex('by_user', (q) => q.eq('userId', uid)).collect()
    for (const s of subs) if (!a.endpoint || s.endpoint === a.endpoint) await ctx.db.delete(s._id)
    const profile = await ctx.db.query('profiles').withIndex('by_user', (q) => q.eq('userId', uid)).unique()
    if (profile) await ctx.db.patch(profile._id, { remindersOn: false })
  },
})

/**
 * Who needs a nudge today: steps due in 14 days and steps due today, not done, not already sent.
 * Savings come from the last value saved in Northbound (Loot balances aren't available here), so for
 * "when I've saved enough" plans the dates can be slightly behind the app.
 */
export const dueToday = internalQuery({
  args: { today: v.string() },
  handler: async (ctx, a) => {
    const out: { subs: { endpoint: string; p256dh: string; auth: string }[]; messages: { key: string; title: string; body: string }[]; userId: string }[] = []
    for await (const profile of ctx.db.query('profiles')) {
      if (!profile.remindersOn || !profile.activeScenarioId) continue
      const subs = await ctx.db.query('pushSubs').withIndex('by_user', (q) => q.eq('userId', profile.userId)).collect()
      if (!subs.length) continue
      const scenario = await ctx.db.get(profile.activeScenarioId)
      if (!scenario) continue
      const { _id, _creationTime, userId, ...input } = scenario
      void _id
      void _creationTime
      void userId
      const pack = await packForScenario(ctx, profile.userId, scenario)
      const s = { ...DEFAULT_SCENARIO, ...input, pack: pack ?? undefined }
      const overrides: RuleOverrides = Object.fromEntries(
        (await ctx.db.query('ruleOverrides').withIndex('by_user', (q) => q.eq('userId', profile.userId)).collect()).map((o) => [o.key, o.value]),
      )
      const p = plan(s, { savedZar: profile.savedZar, monthlyZar: profile.monthlyZar }, a.today, overrides)
      const done = new Set((await ctx.db.query('done').withIndex('by_user', (q) => q.eq('userId', profile.userId)).collect()).map((d) => d.taskKey))
      const soon = addDays(a.today, 14)
      const messages: { key: string; title: string; body: string }[] = []
      for (const t of buildTimeline(s, p.landDate, a.today, overrides)) {
        if (done.has(t.key) || t.key === 'saving') continue
        // "Due" covers steps due today and ones already overdue; each step is nudged at most once per kind.
        const kind = t.due === soon ? '14' : t.due <= a.today ? '0' : null
        if (!kind) continue
        const key = `${t.key}:${kind}`
        const sent = await ctx.db
          .query('reminderLog')
          .withIndex('by_user_key', (q) => q.eq('userId', profile.userId).eq('key', key))
          .unique()
        if (sent) continue
        messages.push({ key, title: kind === '14' ? 'Coming up in 2 weeks' : 'Due now', body: t.title })
      }
      if (messages.length) out.push({ userId: profile.userId, subs: subs.map(({ endpoint, p256dh, auth }) => ({ endpoint, p256dh, auth })), messages })
    }
    return out
  },
})

export const logSent = internalMutation({
  args: { userId: v.string(), keys: v.array(v.string()), today: v.string(), deadEndpoints: v.array(v.string()) },
  handler: async (ctx, a) => {
    for (const key of a.keys) await ctx.db.insert('reminderLog', { userId: a.userId, key, sentOn: a.today })
    for (const endpoint of a.deadEndpoints) {
      const row = await ctx.db
        .query('pushSubs')
        .withIndex('by_endpoint', (q) => q.eq('endpoint', endpoint))
        .unique()
      if (row) await ctx.db.delete(row._id)
    }
  },
})
