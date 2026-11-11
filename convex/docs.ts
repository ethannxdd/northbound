import { v } from 'convex/values'
import { mutation } from './_generated/server'
import { docStatus } from './schema'
import { requireKey } from './lib/user'

/** Paperwork tracker: set a document's status, dates and note. */
export const setDoc = mutation({
  args: {
    docKey: v.string(),
    status: docStatus,
    orderedOn: v.optional(v.union(v.string(), v.null())),
    arrivedOn: v.optional(v.union(v.string(), v.null())),
    note: v.optional(v.string()),
  },
  handler: async (ctx, a) => {
    const uid = await requireKey(ctx)
    const row = await ctx.db
      .query('documents')
      .withIndex('by_user_doc', (q) => q.eq('userId', uid).eq('docKey', a.docKey))
      .unique()
    const fields = {
      status: a.status,
      orderedOn: a.orderedOn === null ? undefined : a.orderedOn ?? row?.orderedOn,
      arrivedOn: a.arrivedOn === null ? undefined : a.arrivedOn ?? row?.arrivedOn,
      note: a.note ?? row?.note,
    }
    if (row) await ctx.db.patch(row._id, fields)
    else await ctx.db.insert('documents', { userId: uid, docKey: a.docKey, ...fields })
  },
})
