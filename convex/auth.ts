// Northbound's own accounts (email and password), plus "Continue with Loot".
// Loot sign-in: the browser signs in to Loot's Supabase, sends the access token here, and we check it
// against Supabase's public keys before using or creating the matching Northbound account.
import { ConvexCredentials } from '@convex-dev/auth/providers/ConvexCredentials'
import { Password } from '@convex-dev/auth/providers/Password'
import { convexAuth, createAccount } from '@convex-dev/auth/server'
import type { DatabaseWriter } from './_generated/server'
import { verifyLootToken } from './lib/loot'

export const { auth, signIn, signOut, store, isAuthenticated } = convexAuth({
  providers: [
    Password({
      profile(params) {
        const email = String(params.email ?? '').trim().toLowerCase()
        if (!email.includes('@')) throw new Error('Enter a valid email address')
        return { email }
      },
      validatePasswordRequirements(password) {
        if (password.length < 8) throw new Error('Use at least 8 characters for your password')
      },
    }),
    ConvexCredentials({
      id: 'loot',
      authorize: async (credentials, ctx) => {
        const loot = await verifyLootToken(String(credentials.token ?? ''))
        if (!loot) return null
        const { user } = await createAccount(ctx, {
          provider: 'loot',
          account: { id: loot.sub },
          profile: { email: loot.email ?? '', lootSub: loot.sub, lootEmail: loot.email ?? '' },
          shouldLinkViaEmail: false,
        })
        return { userId: user._id }
      },
    }),
  ],
  callbacks: {
    async createOrUpdateUser(ctx, args) {
      if (args.existingUserId) return args.existingUserId
      // The callback's ctx isn't typed with this app's schema.
      const db = ctx.db as unknown as DatabaseWriter
      const profile = args.profile as { email?: string; lootSub?: string; lootEmail?: string }
      if (args.provider.id === 'loot' && profile.lootSub) {
        // A Northbound account that already linked this Loot account signs straight in to it.
        const linked = await db
          .query('users')
          .withIndex('by_lootSub', (q) => q.eq('lootSub', profile.lootSub))
          .unique()
        if (linked) return linked._id
        // Otherwise a new account whose data key is the Loot id, so plans made with Loot sign-in carry over.
        return await db.insert('users', { email: profile.email || undefined, lootSub: profile.lootSub, lootEmail: profile.lootEmail || undefined, dataKey: profile.lootSub })
      }
      const id = await db.insert('users', { email: profile.email })
      await db.patch(id, { dataKey: `nb:${id}` })
      return id
    },
  },
})
