// Two kinds of sign-in token are accepted:
// 1. Convex Auth (Northbound accounts, and "Continue with Loot"), the normal path.
// 2. Loot's Supabase token directly, used by versions of the app from before Northbound had its own
//    accounts. Kept so an open old tab keeps working until it reloads.
const LOOT_ISSUER = 'https://ofljaqogkzhwtjsirhmd.supabase.co/auth/v1'

export default {
  providers: [
    { domain: process.env.CONVEX_SITE_URL, applicationID: 'convex' },
    {
      type: 'customJwt',
      applicationID: 'authenticated',
      issuer: LOOT_ISSUER,
      jwks: `${LOOT_ISSUER}/.well-known/jwks.json`,
      algorithm: 'ES256',
    },
  ],
}
