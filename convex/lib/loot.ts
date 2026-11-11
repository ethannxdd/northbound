import { createRemoteJWKSet, jwtVerify } from 'jose'

// Loot's Supabase project (public URL). Its sign-in tokens are ES256, signed with keys published here.
export const LOOT_SUPABASE_URL = 'https://ofljaqogkzhwtjsirhmd.supabase.co'
export const LOOT_ISSUER = `${LOOT_SUPABASE_URL}/auth/v1`
const jwks = createRemoteJWKSet(new URL(`${LOOT_ISSUER}/.well-known/jwks.json`))

/** Checks a Loot (Supabase) access token. Returns the Loot user, or null if the token isn't valid. */
export async function verifyLootToken(token: string): Promise<{ sub: string; email?: string } | null> {
  if (!token) return null
  try {
    const { payload } = await jwtVerify(token, jwks, { issuer: LOOT_ISSUER, audience: 'authenticated' })
    if (!payload.sub) return null
    return { sub: payload.sub, email: typeof payload.email === 'string' ? payload.email : undefined }
  } catch {
    return null
  }
}
