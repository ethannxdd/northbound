import { v } from 'convex/values'
import { mutation, type MutationCtx } from './_generated/server'
import type { Id } from './_generated/dataModel'
import { KEEP_REFS, parseDetails } from '../shared/details'
import { requireKey } from './lib/user'

async function ownScenario(ctx: MutationCtx, uid: string, id: Id<'scenarios'>) {
  const s = await ctx.db.get(id)
  if (!s || s.userId !== uid) throw new Error('Scenario not found')
  return s
}

const REF = /^(cost|step|doc|month|area|settle):[A-Za-z0-9:_-]{1,120}$/

/** Removes an item (a cost line, a map step or a document) from one scenario, or puts it back. */
export const setHidden = mutation({
  args: { scenarioId: v.id('scenarios'), ref: v.string(), hidden: v.boolean() },
  handler: async (ctx, a) => {
    const uid = await requireKey(ctx)
    const s = await ownScenario(ctx, uid, a.scenarioId)
    if (!REF.test(a.ref)) throw new Error('Unknown item')
    if (a.hidden && KEEP_REFS.has(a.ref)) throw new Error("The map is built around this step, so it can't be removed")
    const now = new Set(s.hidden ?? [])
    if (a.hidden) now.add(a.ref)
    else now.delete(a.ref)
    if (now.size > 300) throw new Error('Too many removed items')
    await ctx.db.patch(s._id, { hidden: now.size ? [...now] : undefined })
  },
})

/** Puts every removed item on a scenario back. */
export const restoreAll = mutation({
  args: { scenarioId: v.id('scenarios') },
  handler: async (ctx, a) => {
    const uid = await requireKey(ctx)
    const s = await ownScenario(ctx, uid, a.scenarioId)
    await ctx.db.patch(s._id, { hidden: undefined })
  },
})

async function detailsRow(ctx: MutationCtx, uid: string, scenarioId: Id<'scenarios'>) {
  return ctx.db
    .query('scenarioDetails')
    .withIndex('by_user_scenario', (q) => q.eq('userId', uid).eq('scenarioId', scenarioId))
    .unique()
}

/** Saves Claude's details file on a scenario, replacing any earlier one. */
export const importDetails = mutation({
  args: { scenarioId: v.id('scenarios'), json: v.string() },
  handler: async (ctx, a) => {
    const uid = await requireKey(ctx)
    await ownScenario(ctx, uid, a.scenarioId)
    if (a.json.length > 350_000) throw new Error('The details file is too big. Keep it under 300 KB.')
    const r = parseDetails(a.json)
    if (!r.ok) throw new Error(`This details file has problems: ${r.errors.slice(0, 5).join('; ')}`)
    const json = JSON.stringify({ ...r.details, scenarioId: a.scenarioId })
    const existing = await detailsRow(ctx, uid, a.scenarioId)
    if (existing) await ctx.db.patch(existing._id, { json, importedAt: Date.now() })
    else await ctx.db.insert('scenarioDetails', { userId: uid, scenarioId: a.scenarioId, json, importedAt: Date.now() })
    return { replaced: !!existing }
  },
})

/** Takes Claude's details off a scenario. */
export const removeDetails = mutation({
  args: { scenarioId: v.id('scenarios') },
  handler: async (ctx, a) => {
    const uid = await requireKey(ctx)
    const row = await detailsRow(ctx, uid, a.scenarioId)
    if (row) await ctx.db.delete(row._id)
  },
})

/** For scenario copies and deletes. */
export async function copyDetails(ctx: MutationCtx, uid: string, from: Id<'scenarios'>, to: Id<'scenarios'>) {
  const row = await detailsRow(ctx, uid, from)
  if (row) await ctx.db.insert('scenarioDetails', { userId: uid, scenarioId: to, json: JSON.stringify({ ...JSON.parse(row.json), scenarioId: to }), importedAt: row.importedAt })
}

export async function deleteDetails(ctx: MutationCtx, uid: string, scenarioId: Id<'scenarios'>) {
  const row = await detailsRow(ctx, uid, scenarioId)
  if (row) await ctx.db.delete(row._id)
}
