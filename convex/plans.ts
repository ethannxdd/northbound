import { v } from 'convex/values'
import { mutation, type MutationCtx, type QueryCtx } from './_generated/server'
import type { Doc, Id } from './_generated/dataModel'
import { parsePack, type DestinationPack } from '../shared/pack'
import { DEFAULT_SCENARIO } from '../shared/types'
import { requireKey } from './lib/user'

/** A plan file, checked again here so nothing invalid is stored, whatever the browser sent. */
function check(json: string): DestinationPack {
  if (json.length > 250_000) throw new Error('The plan is too big. Keep it under 200 KB.')
  const r = parsePack(json)
  if (!r.ok) throw new Error(`This plan has problems: ${r.errors.slice(0, 5).join('; ')}`)
  return r.pack
}

/** Reads a stored plan back. Plans are checked on import, so this only parses. */
export function packOf(d: Doc<'destinations'>): DestinationPack {
  return JSON.parse(d.json) as DestinationPack
}

/** The plan a scenario uses, if it's yours. */
export async function packForScenario(ctx: QueryCtx | MutationCtx, userId: string, s: { destinationId?: string }): Promise<DestinationPack | null> {
  if (!s.destinationId) return null
  const id = ctx.db.normalizeId('destinations', s.destinationId)
  const d = id ? await ctx.db.get(id) : null
  return d && d.userId === userId ? packOf(d) : null
}

/**
 * Imports a plan file. Importing a plan with the same id again replaces it, and scenarios using it
 * follow the new version. With `createScenario`, it also adds a scenario from the plan's defaults.
 */
export const importPlan = mutation({
  args: { json: v.string(), createScenario: v.boolean(), makeActive: v.boolean() },
  handler: async (ctx, a): Promise<{ destinationId: Id<'destinations'>; scenarioId: Id<'scenarios'> | null; replaced: boolean }> => {
    const uid = await requireKey(ctx)
    const pack = check(a.json)
    const existing = await ctx.db
      .query('destinations')
      .withIndex('by_user_slug', (q) => q.eq('userId', uid).eq('slug', pack.id))
      .unique()
    const fields = { title: pack.title.slice(0, 160), country: pack.country.name.slice(0, 80), json: JSON.stringify(pack), importedAt: Date.now() }
    let destinationId: Id<'destinations'>
    if (existing) {
      await ctx.db.patch(existing._id, fields)
      destinationId = existing._id
    } else {
      const count = (await ctx.db.query('destinations').withIndex('by_user_slug', (q) => q.eq('userId', uid)).take(51)).length
      if (count >= 50) throw new Error('You can keep up to 50 plans. Remove one first.')
      destinationId = await ctx.db.insert('destinations', { userId: uid, slug: pack.id, ...fields })
    }

    let scenarioId: Id<'scenarios'> | null = null
    if (a.createScenario) {
      const sc = pack.scenario
      const city = pack.cities.find((c) => c.id === sc.city) ?? pack.cities[0]
      scenarioId = await ctx.db.insert('scenarios', {
        userId: uid,
        ...DEFAULT_SCENARIO,
        name: `${city.name}, ${sc.partner ? 'with partner' : 'solo'}`.slice(0, 80),
        landMode: sc.landMode,
        landDate: sc.landDate ?? DEFAULT_SCENARIO.landDate,
        housing: sc.housing,
        partner: !!sc.partner,
        jobHuntMonths: sc.jobHuntMonths,
        ukSalary: sc.salary ?? 0,
        partnerSalary: Math.round(city.typicalSalary * 0.9),
        rate: pack.currency.zarPerUnit,
        rateMode: 'fixed',
        certLeadMonths: sc.paperworkMonths ?? 3,
        tempNights: sc.tempNights,
        flightGbp: pack.move.flightPerPerson,
        bufferGbp: sc.bufferLocal ?? 0,
        destinationId,
        destCity: city.id,
      })
      if (a.makeActive) {
        const profile = await ctx.db
          .query('profiles')
          .withIndex('by_user', (q) => q.eq('userId', uid))
          .unique()
        if (profile) await ctx.db.patch(profile._id, { activeScenarioId: scenarioId })
      }
    }
    return { destinationId, scenarioId, replaced: !!existing }
  },
})

/** Removes a plan and every scenario built on it, with their quotes. Keeps at least one scenario. */
export const removePlan = mutation({
  args: { id: v.id('destinations') },
  handler: async (ctx, a) => {
    const uid = await requireKey(ctx)
    const d = await ctx.db.get(a.id)
    if (!d || d.userId !== uid) throw new Error('Plan not found')
    const scenarios = await ctx.db
      .query('scenarios')
      .withIndex('by_user', (q) => q.eq('userId', uid))
      .take(200)
    const using = scenarios.filter((s) => s.destinationId === a.id)
    if (using.length === scenarios.length) throw new Error('Every scenario uses this plan. Make another scenario first, so you keep at least one.')
    const profile = await ctx.db
      .query('profiles')
      .withIndex('by_user', (q) => q.eq('userId', uid))
      .unique()
    for (const s of using) {
      for (const t of ['quotes', 'customCosts', 'scenarioDetails'] as const) {
        const rows = await ctx.db
          .query(t)
          .withIndex('by_user_scenario', (q) => q.eq('userId', uid).eq('scenarioId', s._id))
          .take(2000)
        for (const r of rows) await ctx.db.delete(r._id)
      }
      await ctx.db.delete(s._id)
    }
    if (profile && using.some((s) => s._id === profile.activeScenarioId)) {
      await ctx.db.patch(profile._id, { activeScenarioId: scenarios.find((s) => s.destinationId !== a.id)!._id })
    }
    await ctx.db.delete(a.id)
  },
})
