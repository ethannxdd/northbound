import { v } from 'convex/values'
import { mutation, query } from './_generated/server'
import { requireKey } from './lib/user'
import { packForScenario } from './plans'

function newToken(): string {
  const bytes = new Uint8Array(18)
  crypto.getRandomValues(bytes)
  return btoa(String.fromCharCode(...bytes)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

/** Creates (or returns) your read-only share link. */
export const create = mutation({
  args: {},
  handler: async (ctx) => {
    const uid = await requireKey(ctx)
    const existing = await ctx.db.query('shares').withIndex('by_user', (q) => q.eq('userId', uid)).first()
    if (existing) return existing.token
    const token = newToken()
    await ctx.db.insert('shares', { userId: uid, token, createdAt: Date.now() })
    return token
  },
})

/** Stops the link working. A new one can be made later. */
export const revoke = mutation({
  args: {},
  handler: async (ctx) => {
    const uid = await requireKey(ctx)
    for (const s of await ctx.db.query('shares').withIndex('by_user', (q) => q.eq('userId', uid)).collect()) await ctx.db.delete(s._id)
  },
})

/**
 * What someone with the link sees: the main scenario and progress only. No email, no Loot details,
 * no other scenarios. Anyone with the link can read this, so it returns as little as possible.
 */
export const view = query({
  args: { token: v.string() },
  handler: async (ctx, a) => {
    if (a.token.length < 16) return null
    const share = await ctx.db
      .query('shares')
      .withIndex('by_token', (q) => q.eq('token', a.token))
      .unique()
    if (!share) return null
    const profile = await ctx.db
      .query('profiles')
      .withIndex('by_user', (q) => q.eq('userId', share.userId))
      .unique()
    if (!profile) return null
    const scenario = profile.activeScenarioId ? await ctx.db.get(profile.activeScenarioId) : null
    if (!scenario || scenario.userId !== share.userId) return null
    const done = await ctx.db
      .query('done')
      .withIndex('by_user', (q) => q.eq('userId', share.userId))
      .collect()
    const docs = await ctx.db
      .query('documents')
      .withIndex('by_user', (q) => q.eq('userId', share.userId))
      .collect()
    // Only what the number needs: amounts and dates, no links or notes.
    const quotes = (
      await ctx.db
        .query('quotes')
        .withIndex('by_user_scenario', (q) => q.eq('userId', share.userId).eq('scenarioId', scenario._id))
        .take(2000)
    ).map((q) => ({ itemKey: q.itemKey, amount: q.amount, currency: q.currency, foundOn: q.foundOn, createdAt: q.createdAt }))
    const customs = (
      await ctx.db
        .query('customCosts')
        .withIndex('by_user_scenario', (q) => q.eq('userId', share.userId).eq('scenarioId', scenario._id))
        .take(500)
    ).map((c) => ({ id: c._id as string, group: c.group, label: c.label }))
    const { _id, _creationTime, userId, ...input } = scenario
    void _id
    void _creationTime
    void userId
    return {
      input,
      savedZar: profile.savedZar,
      monthlyZar: profile.monthlyZar,
      done: done.map((d) => d.taskKey),
      docStatuses: Object.fromEntries(docs.map((d) => [d.docKey, d.status])),
      quotes,
      customs,
      // Only the total borrowed, so the dates match the owner's view. No loan terms.
      borrowedZar: (profile.loanZar ?? 0) + (profile.cardZar ?? 0),
      // The imported plan a scenario uses, so the share page can run it.
      pack: await packForScenario(ctx, share.userId, scenario),
      // Claude's details for the scenario, since its added and corrected costs change the number.
      details: (await ctx.db.query('scenarioDetails').withIndex('by_user_scenario', (q) => q.eq('userId', share.userId).eq('scenarioId', scenario._id)).unique())?.json ?? null,
      liveRate: (await ctx.db.query('fxRates').withIndex('by_date').order('desc').first())?.zarPerGbp ?? null,
    }
  },
})
