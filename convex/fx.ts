import { v } from 'convex/values'
import { internalAction, internalMutation } from './_generated/server'
import { internal } from './_generated/api'

// Rand per pound, from the European Central Bank's daily reference rates via frankfurter.dev (free, no key).
const SOURCE = 'https://api.frankfurter.dev/v1'

/** Fetches the latest rate, and the last 90 days the first time it runs. Called by the daily cron. */
export const refresh = internalAction({
  args: {},
  handler: async (ctx) => {
    const end = new Date().toISOString().slice(0, 10)
    const start = new Date(Date.now() - 90 * 86400000).toISOString().slice(0, 10)
    const res = await fetch(`${SOURCE}/${start}..${end}?base=GBP&symbols=ZAR`)
    if (!res.ok) throw new Error(`Rate source answered ${res.status}`)
    const body = (await res.json()) as { rates?: Record<string, { ZAR?: number }> }
    const rows = Object.entries(body.rates ?? {})
      .filter(([, r]) => typeof r.ZAR === 'number')
      .map(([date, r]) => ({ date, zarPerGbp: r.ZAR as number }))
    if (rows.length) await ctx.runMutation(internal.fx.store, { rows })
  },
})

export const store = internalMutation({
  args: { rows: v.array(v.object({ date: v.string(), zarPerGbp: v.number() })) },
  handler: async (ctx, a) => {
    for (const r of a.rows) {
      const existing = await ctx.db
        .query('fxRates')
        .withIndex('by_date', (q) => q.eq('date', r.date))
        .unique()
      if (existing) await ctx.db.patch(existing._id, { zarPerGbp: r.zarPerGbp, fetchedAt: Date.now() })
      else await ctx.db.insert('fxRates', { ...r, fetchedAt: Date.now() })
    }
  },
})
