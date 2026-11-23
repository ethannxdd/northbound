import { v } from 'convex/values'
import { mutation, type MutationCtx } from './_generated/server'
import type { Id } from './_generated/dataModel'
import { requireKey } from './lib/user'

const group = v.union(v.literal('paper'), v.literal('move'), v.literal('runway'))

async function ownScenario(ctx: MutationCtx, uid: string, id: Id<'scenarios'>) {
  const s = await ctx.db.get(id)
  if (!s || s.userId !== uid) throw new Error('Scenario not found')
  return s
}

function clean(text: string | undefined, max: number): string | undefined {
  const t = text?.trim()
  return t ? t.slice(0, max) : undefined
}

/**
 * Adds a quote. With `newCost`, it first creates one of your own costs and quotes that.
 * Older quotes for the item stay as history.
 */
export const add = mutation({
  args: {
    scenarioId: v.id('scenarios'),
    itemKey: v.optional(v.string()),
    newCost: v.optional(v.object({ label: v.string(), group })),
    amount: v.number(),
    currency: v.union(v.literal('GBP'), v.literal('ZAR')),
    sourceUrl: v.optional(v.string()),
    foundOn: v.string(),
    note: v.optional(v.string()),
  },
  handler: async (ctx, a) => {
    const uid = await requireKey(ctx)
    await ownScenario(ctx, uid, a.scenarioId)
    if (!Number.isFinite(a.amount) || a.amount < 0 || a.amount > 10_000_000) throw new Error('Enter an amount')
    if (!/^\d{4}-\d{2}-\d{2}$/.test(a.foundOn)) throw new Error('Pick the date you found it')
    const url = clean(a.sourceUrl, 2000)
    if (url && !/^https?:\/\//i.test(url)) throw new Error('The link should start with http:// or https://')

    let itemKey = a.itemKey
    if (a.newCost) {
      const label = clean(a.newCost.label, 120)
      if (!label) throw new Error('Give your cost a name')
      itemKey = await ctx.db.insert('customCosts', { userId: uid, scenarioId: a.scenarioId, group: a.newCost.group, label, createdAt: Date.now() })
    } else if (itemKey) {
      // One of your own costs: make sure it's yours and on this scenario.
      const customId = ctx.db.normalizeId('customCosts', itemKey)
      if (customId) {
        const c = await ctx.db.get(customId)
        if (!c || c.userId !== uid || c.scenarioId !== a.scenarioId) throw new Error('Cost not found')
      } else if (!/^[a-zA-Z0-9]{2,30}$/.test(itemKey)) throw new Error('Pick a cost')
    }
    if (!itemKey) throw new Error('Pick a cost')

    await ctx.db.insert('quotes', {
      userId: uid,
      scenarioId: a.scenarioId,
      itemKey,
      amount: a.amount,
      currency: a.currency,
      sourceUrl: url,
      foundOn: a.foundOn,
      note: clean(a.note, 500),
      createdAt: Date.now(),
    })
    return itemKey
  },
})

/** Deletes one quote. If it was the newest, the one before it counts again. */
export const remove = mutation({
  args: { id: v.id('quotes') },
  handler: async (ctx, a) => {
    const uid = await requireKey(ctx)
    const q = await ctx.db.get(a.id)
    if (!q || q.userId !== uid) throw new Error('Quote not found')
    await ctx.db.delete(a.id)
  },
})

/** Deletes one of your own costs and all its quotes. */
export const removeCustom = mutation({
  args: { id: v.id('customCosts') },
  handler: async (ctx, a) => {
    const uid = await requireKey(ctx)
    const c = await ctx.db.get(a.id)
    if (!c || c.userId !== uid) throw new Error('Cost not found')
    const qs = await ctx.db
      .query('quotes')
      .withIndex('by_user_scenario_item', (q) => q.eq('userId', uid).eq('scenarioId', c.scenarioId).eq('itemKey', a.id))
      .take(500)
    for (const q of qs) await ctx.db.delete(q._id)
    await ctx.db.delete(a.id)
  },
})

/** Copies a scenario's quotes and own costs onto another of your scenarios. Used when a scenario is copied. */
export async function copyQuotes(ctx: MutationCtx, uid: string, from: Id<'scenarios'>, to: Id<'scenarios'>) {
  const customs = await ctx.db
    .query('customCosts')
    .withIndex('by_user_scenario', (q) => q.eq('userId', uid).eq('scenarioId', from))
    .take(500)
  const idMap = new Map<string, string>()
  for (const c of customs) {
    const { _id, _creationTime, ...rest } = c
    void _creationTime
    idMap.set(_id, await ctx.db.insert('customCosts', { ...rest, scenarioId: to }))
  }
  const quotes = await ctx.db
    .query('quotes')
    .withIndex('by_user_scenario', (q) => q.eq('userId', uid).eq('scenarioId', from))
    .take(2000)
  for (const q of quotes) {
    const { _id, _creationTime, ...rest } = q
    void _id
    void _creationTime
    await ctx.db.insert('quotes', { ...rest, scenarioId: to, itemKey: idMap.get(q.itemKey) ?? q.itemKey })
  }
}

/** Removes a scenario's quotes and own costs. */
export async function deleteQuotes(ctx: MutationCtx, uid: string, scenarioId: Id<'scenarios'>) {
  for (const t of ['quotes', 'customCosts'] as const) {
    const rows = await ctx.db
      .query(t)
      .withIndex('by_user_scenario', (q) => q.eq('userId', uid).eq('scenarioId', scenarioId))
      .take(2000)
    for (const r of rows) await ctx.db.delete(r._id)
  }
}
