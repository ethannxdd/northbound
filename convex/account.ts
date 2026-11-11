import { v } from 'convex/values'
import { action, internalMutation, mutation } from './_generated/server'
import { internal } from './_generated/api'
import { verifyLootToken } from './lib/loot'
import { requireAuthUser } from './lib/user'

/** Links a Loot account to the signed-in Northbound account. The browser has just signed in to Loot. */
export const linkLoot = action({
  args: { token: v.string() },
  handler: async (ctx, a): Promise<{ ok: true } | { ok: false; reason: string }> => {
    const uid = await requireAuthUser(ctx)
    const loot = await verifyLootToken(a.token)
    if (!loot) return { ok: false, reason: "Couldn't confirm your Loot sign-in. Try again." }
    return await ctx.runMutation(internal.account.attachLoot, { uid, lootSub: loot.sub, lootEmail: loot.email ?? null })
  },
})

export const attachLoot = internalMutation({
  args: { uid: v.id('users'), lootSub: v.string(), lootEmail: v.union(v.string(), v.null()) },
  handler: async (ctx, a): Promise<{ ok: true } | { ok: false; reason: string }> => {
    const other = await ctx.db
      .query('users')
      .withIndex('by_lootSub', (q) => q.eq('lootSub', a.lootSub))
      .unique()
    if (other && other._id !== a.uid) {
      return { ok: false, reason: 'That Loot account is already linked to a different Northbound account.' }
    }
    await ctx.db.patch(a.uid, { lootSub: a.lootSub, lootEmail: a.lootEmail ?? undefined })
    // So "Continue with Loot" also signs in to this account from now on.
    const existing = await ctx.db
      .query('authAccounts')
      .withIndex('providerAndAccountId', (q) => q.eq('provider', 'loot').eq('providerAccountId', a.lootSub))
      .unique()
    if (!existing) await ctx.db.insert('authAccounts', { userId: a.uid, provider: 'loot', providerAccountId: a.lootSub })
    return { ok: true }
  },
})

/** Unlinks Loot from a Northbound account. The plan stays; Loot sign-in stops working for this account. */
export const unlinkLoot = mutation({
  args: {},
  handler: async (ctx) => {
    const uid = await requireAuthUser(ctx)
    const user = await ctx.db.get(uid)
    if (!user?.lootSub) return
    // An account created through Loot keeps its Loot sign-in: it has no password to fall back on.
    if (user.dataKey === user.lootSub) throw new Error('This account was created with Loot, so it stays linked.')
    const acct = await ctx.db
      .query('authAccounts')
      .withIndex('providerAndAccountId', (q) => q.eq('provider', 'loot').eq('providerAccountId', user.lootSub!))
      .unique()
    if (acct) await ctx.db.delete(acct._id)
    await ctx.db.patch(uid, { lootSub: undefined, lootEmail: undefined })
  },
})
