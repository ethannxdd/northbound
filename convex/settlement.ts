import { v } from 'convex/values'
import { mutation } from './_generated/server'
import { requireKey } from './lib/user'

/** Settlement tracker: record (or clear) your UK earnings for a tax year, e.g. "2029-30". */
export const setEarnings = mutation({
  args: { taxYear: v.string(), gross: v.union(v.number(), v.null()) },
  handler: async (ctx, a) => {
    const uid = await requireKey(ctx)
    if (!/^\d{4}-\d{2}$/.test(a.taxYear)) throw new Error('Tax year looks like 2029-30')
    const row = await ctx.db
      .query('earnings')
      .withIndex('by_user_year', (q) => q.eq('userId', uid).eq('taxYear', a.taxYear))
      .unique()
    if (a.gross === null) {
      if (row) await ctx.db.delete(row._id)
    } else if (row) await ctx.db.patch(row._id, { gross: a.gross })
    else await ctx.db.insert('earnings', { userId: uid, taxYear: a.taxYear, gross: a.gross })
  },
})
