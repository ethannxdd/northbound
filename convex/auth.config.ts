// Northbound signs in with Loot's Supabase account. Convex checks Supabase's signed tokens
// against Supabase's public keys, so there is one sign-in for both apps.
// Loot's Supabase project (public URL).
const SUPABASE_URL = 'https://ofljaqogkzhwtjsirhmd.supabase.co'

export default {
  providers: [
    {
      type: 'customJwt',
      applicationID: 'authenticated',
      issuer: `${SUPABASE_URL}/auth/v1`,
      jwks: `${SUPABASE_URL}/auth/v1/.well-known/jwks.json`,
      algorithm: 'ES256',
    },
  ],
}
