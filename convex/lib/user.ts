import { getAuthUserId } from '@convex-dev/auth/server'
import type { ActionCtx, MutationCtx, QueryCtx } from '../_generated/server'
import { LOOT_ISSUER } from './loot'

declare const process: { env: Record<string, string | undefined> }

/**
 * The key every Northbound table stores as `userId` for the signed-in person.
 * - Northbound account: `nb:<users id>`.
 * - Signed in with Loot: the Loot (Supabase) user id, so plans made before Northbound accounts existed carry over.
 * - An old app version sending Loot's token directly: that token's subject (the same Loot id).
 * NB_DEV_USER_ID is only for a local test deployment with no sign-in. Never set it on a real deployment.
 */
export async function dataKey(ctx: QueryCtx | MutationCtx): Promise<string | null> {
  const identity = await ctx.auth.getUserIdentity()
  if (identity) {
    if (identity.issuer === LOOT_ISSUER) return identity.subject
    const uid = await getAuthUserId(ctx)
    if (!uid) return null
    const user = await ctx.db.get(uid)
    return user?.dataKey ?? `nb:${uid}`
  }
  return process.env.NB_DEV_USER_ID ?? null
}

export async function requireKey(ctx: QueryCtx | MutationCtx): Promise<string> {
  const key = await dataKey(ctx)
  if (!key) throw new Error('Sign in to continue')
  return key
}

export async function requireAuthUser(ctx: QueryCtx | MutationCtx | ActionCtx) {
  const uid = await getAuthUserId(ctx)
  if (!uid) throw new Error('Sign in to continue')
  return uid
}
