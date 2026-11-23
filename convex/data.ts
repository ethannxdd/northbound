import { v } from 'convex/values'
import { getAuthUserId } from '@convex-dev/auth/server'
import { mutation, query, type MutationCtx, type QueryCtx } from './_generated/server'
import type { Id } from './_generated/dataModel'
import { scenarioFields } from './schema'
import { dataKey, requireKey } from './lib/user'
import { copyQuotes, deleteQuotes } from './quotes'

declare const process: { env: Record<string, string | undefined> }

const userId = dataKey
const requireUser = requireKey

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
    const [profile, scenarios, done, overrides, documents, earnings, share, fx, quotes, customCosts] = await Promise.all([
      profileOf(ctx, uid),
      ctx.db.query('scenarios').withIndex('by_user', (q) => q.eq('userId', uid)).collect(),
      ctx.db.query('done').withIndex('by_user', (q) => q.eq('userId', uid)).collect(),
      ctx.db.query('ruleOverrides').withIndex('by_user', (q) => q.eq('userId', uid)).collect(),
      ctx.db.query('documents').withIndex('by_user', (q) => q.eq('userId', uid)).collect(),
      ctx.db.query('earnings').withIndex('by_user', (q) => q.eq('userId', uid)).collect(),
      ctx.db.query('shares').withIndex('by_user', (q) => q.eq('userId', uid)).first(),
      ctx.db.query('fxRates').withIndex('by_date').order('desc').take(120),
      ctx.db.query('quotes').withIndex('by_user_scenario', (q) => q.eq('userId', uid)).take(2000),
      ctx.db.query('customCosts').withIndex('by_user_scenario', (q) => q.eq('userId', uid)).take(500),
    ])
    const authId = await getAuthUserId(ctx)
    const user = authId ? await ctx.db.get(authId) : null
    const account = {
      email: user?.email ?? null,
      lootEmail: user?.lootEmail ?? null,
      lootLinked: !!user?.lootSub,
      /** Signed in with an old app version that sends Loot's token directly */
      legacyLoot: !authId && !!(await ctx.auth.getUserIdentity()),
    }
    return { profile, scenarios, done, overrides, documents, earnings, shareToken: share?.token ?? null, fx: fx.reverse(), account, quotes, customCosts }
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
    remindersOn: v.optional(v.boolean()),
    landedOn: v.optional(v.union(v.string(), v.null())),
    englishLevel: v.optional(v.string()),
  },
  handler: async (ctx, a) => {
    const uid = await requireUser(ctx)
    const p = await profileOf(ctx, uid)
    if (!p) throw new Error('Finish setting up first')
    const { lootGoalId, landedOn, ...rest } = a
    const patch: Record<string, unknown> = Object.fromEntries(Object.entries(rest).filter(([, x]) => x !== undefined))
    if (lootGoalId !== undefined) patch.lootGoalId = lootGoalId ?? undefined
    if (landedOn !== undefined) patch.landedOn = landedOn ?? undefined
    await ctx.db.patch(p._id, patch)
  },
})

async function ownScenario(ctx: MutationCtx, uid: string, id: Id<'scenarios'>) {
  const s = await ctx.db.get(id)
  if (!s || s.userId !== uid) throw new Error('Scenario not found')
  return s
}

export const saveScenario = mutation({
  args: {
    id: v.optional(v.id('scenarios')),
    scenario: scenarioArg,
    makeActive: v.optional(v.boolean()),
    /** When this new scenario is a copy: bring that scenario's quotes and own costs along */
    copyFrom: v.optional(v.id('scenarios')),
  },
  handler: async (ctx, a) => {
    const uid = await requireUser(ctx)
    let id = a.id
    if (id) {
      await ownScenario(ctx, uid, id)
      // Replace, so optional fields left out (like a cleared neighbourhood) are removed.
      await ctx.db.replace(id, { userId: uid, ...a.scenario })
    } else {
      id = await ctx.db.insert('scenarios', { userId: uid, ...a.scenario })
      if (a.copyFrom) {
        await ownScenario(ctx, uid, a.copyFrom)
        await copyQuotes(ctx, uid, a.copyFrom, id)
      }
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
    await deleteQuotes(ctx, uid, a.id)
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
    for (const t of ['quotes', 'customCosts'] as const) {
      const rows = await ctx.db.query(t).withIndex('by_user_scenario', (q) => q.eq('userId', uid)).collect()
      for (const r of rows) await ctx.db.delete(r._id)
    }
    for (const t of ['scenarios', 'done', 'ruleOverrides', 'profiles', 'documents', 'earnings', 'shares', 'pushSubs'] as const) {
      const rows = await ctx.db.query(t).withIndex('by_user', (q) => q.eq('userId', uid)).collect()
      for (const r of rows) await ctx.db.delete(r._id)
    }
  },
})
