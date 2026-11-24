import { query } from './_generated/server'

declare const process: { env: Record<string, string | undefined> }

/** Which sign-in options are switched on, so the sign-in screen only shows ones that work. */
export const get = query({
  args: {},
  handler: async () => ({
    google: !!process.env.AUTH_GOOGLE_ID && !!process.env.AUTH_GOOGLE_SECRET,
    reset: !!process.env.AUTH_RESEND_KEY,
  }),
})
