import { v } from 'convex/values'
import { mutation, query, type MutationCtx, type QueryCtx } from './_generated/server'
import type { Id } from './_generated/dataModel'
import { scenarioFields } from './schema'

declare const process: { env: Record<string, string | undefined> }

/**
 * The signed-in user's id: the subject of their Supabase token.
 * NB_DEV_USER_ID is only for a local test deployment with no sign-in. Never set it on a real deployment.
 */
async function userId(ctx: QueryCtx | MutationCtx): Promise<string | null> {
  const identity = await ctx.auth.getUserIdentity()
  if (identity) return identity.subject
  return process.env.NB_DEV_USER_ID ?? null
}

async function requireUser(ctx: QueryCtx | MutationCtx): Promise<string> {
  const id = await userId(ctx)
  if (!id) throw new Error('Sign in to continue')
  return id
}

async function profileOf(ctx: QueryCtx | MutationCtx, uid: string) {
  return ctx.db.query('profiles').withIndex('by_user', (q) => q.eq('userId', uid)).unique()
}

export const devMode = query({
  args: {},
  handler: async (ctx) => !(await ctx.auth.getUserIdentity()) && !!process.env.NB_DEV_USER_ID,
})

/** Everything the app needs, in one live query. */
export const me = query({
  args: {},
  handler: async (ctx) => {
    const uid = await userId(ctx)
    if (!uid) return null
    const [profile, scenarios, done, overrides] = await Promise.all([
      profileOf(ctx, uid),
      ctx.db.query('scenarios').withIndex('by_user', (q) => q.eq('userId', uid)).collect(),
      ctx.db.query('done').withIndex('by_user', (q) => q.eq('userId', uid)).collect(),
      ctx.db.query('ruleOverrides').withIndex('by_user', (q) => q.eq('userId', uid)).collect(),
    ])
    return { profile, scenarios, done, overrides }
  },
})

const scenarioArg = v.object(scenarioFields)

/** First run: creates the profile and the first scenario together. */
export const onboard = mutation({
  args: { savedZar: v.number(), monthlyZar: v.number(), homeRentZar: v.number(), homeIncomeZar: v.number(), scenario: scenarioArg },
  handler: async (ctx, a) => {
    const uid = await requireUser(ctx)
    const scenarioId = await ctx.db.insert('scenarios', { userId: uid, ...a.scenario })
    const existing = await profileOf(ctx, uid)
    const fields = {
      savedZar: a.savedZar,
      monthlyZar: a.monthlyZar,
      homeRentZar: a.homeRentZar,
      homeIncomeZar: a.homeIncomeZar,
      activeScenarioId: scenarioId,
      onboarded: true,
    }
    if (existing) await ctx.db.patch(existing._id, fields)
    else await ctx.db.insert('profiles', { userId: uid, syncLootTarget: true, ...fields })
    return scenarioId
  },
})

export const updateProfile = mutation({
  args: {
    savedZar: v.optional(v.number()),
    monthlyZar: v.optional(v.number()),
    homeRentZar: v.optional(v.number()),
    homeIncomeZar: v.optional(v.number()),
    lootGoalId: v.optional(v.union(v.string(), v.null())),
    syncLootTarget: v.optional(v.boolean()),
  },
  handler: async (ctx, a) => {
    const uid = await requireUser(ctx)
    const p = await profileOf(ctx, uid)
    if (!p) throw new Error('Finish setting up first')
    const { lootGoalId, ...rest } = a
    const patch: Record<string, unknown> = Object.fromEntries(Object.entries(rest).filter(([, x]) => x !== undefined))
    if (lootGoalId !== undefined) patch.lootGoalId = lootGoalId ?? undefined
    await ctx.db.patch(p._id, patch)
  },
})

async function ownScenario(ctx: MutationCtx, uid: string, id: Id<'scenarios'>) {
  const s = await ctx.db.get(id)
  if (!s || s.userId !== uid) throw new Error('Scenario not found')
  return s
}

export const saveScenario = mutation({
  args: { id: v.optional(v.id('scenarios')), scenario: scenarioArg, makeActive: v.optional(v.boolean()) },
  handler: async (ctx, a) => {
    const uid = await requireUser(ctx)
    let id = a.id
    if (id) {
      await ownScenario(ctx, uid, id)
      await ctx.db.patch(id, a.scenario)
    } else {
      id = await ctx.db.insert('scenarios', { userId: uid, ...a.scenario })
    }
    if (a.makeActive) {
      const p = await profileOf(ctx, uid)
      if (p) await ctx.db.patch(p._id, { activeScenarioId: id })
    }
    return id
  },
})

export const deleteScenario = mutation({
  args: { id: v.id('scenarios') },
  handler: async (ctx, a) => {
    const uid = await requireUser(ctx)
    await ownScenario(ctx, uid, a.id)
    const all = await ctx.db.query('scenarios').withIndex('by_user', (q) => q.eq('userId', uid)).collect()
    if (all.length <= 1) throw new Error('Keep at least one scenario')
    await ctx.db.delete(a.id)
    const p = await profileOf(ctx, uid)
    if (p && p.activeScenarioId === a.id) await ctx.db.patch(p._id, { activeScenarioId: all.find((s) => s._id !== a.id)!._id })
  },
})

export const setActive = mutation({
  args: { id: v.id('scenarios') },
  handler: async (ctx, a) => {
    const uid = await requireUser(ctx)
    await ownScenario(ctx, uid, a.id)
    const p = await profileOf(ctx, uid)
    if (p) await ctx.db.patch(p._id, { activeScenarioId: a.id })
  },
})

export const toggleDone = mutation({
  args: { taskKey: v.string(), today: v.string() },
  handler: async (ctx, a) => {
    const uid = await requireUser(ctx)
    const row = await ctx.db.query('done').withIndex('by_user_task', (q) => q.eq('userId', uid).eq('taskKey', a.taskKey)).unique()
    if (row) await ctx.db.delete(row._id)
    else await ctx.db.insert('done', { userId: uid, taskKey: a.taskKey, doneAt: a.today })
  },
})

export const setRule = mutation({
  args: { key: v.string(), value: v.union(v.number(), v.string(), v.null()) },
  handler: async (ctx, a) => {
    const uid = await requireUser(ctx)
    const row = await ctx.db.query('ruleOverrides').withIndex('by_user_key', (q) => q.eq('userId', uid).eq('key', a.key)).unique()
    if (a.value === null) {
      if (row) await ctx.db.delete(row._id)
    } else if (row) await ctx.db.patch(row._id, { value: a.value })
    else await ctx.db.insert('ruleOverrides', { userId: uid, key: a.key, value: a.value })
  },
})

/** Wipes everything Northbound stores for this user. */
export const resetAll = mutation({
  args: {},
  handler: async (ctx) => {
    const uid = await requireUser(ctx)
    for (const t of ['scenarios', 'done', 'ruleOverrides', 'profiles'] as const) {
      const rows = await ctx.db.query(t).withIndex('by_user', (q) => q.eq('userId', uid)).collect()
      for (const r of rows) await ctx.db.delete(r._id)
    }
  },
})
