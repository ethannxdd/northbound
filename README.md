# Northbound

Plan a move from Cape Town to the UK on the UK Ancestry visa: your number, your runway, every step as a transit map, life in Manchester or London, and how far your Loot savings have got you.

The full plan, rules research and design decisions are in [PLAN.md](PLAN.md). Design mockups are in `design/`.

## Run it locally

```bash
npm install
npm run dev:backend   # Convex, in its own terminal
npm run dev           # the app, at http://localhost:5190
```

`.env.local` needs Convex's values (written by `npx convex dev`) and Loot's Supabase URL and publishable key. See `.env.example`.

### Testing without signing in

With `VITE_DEV_NO_AUTH=true` in `.env.local` and `NB_DEV_USER_ID` set on the local Convex deployment, the app skips sign-in and stores data under a test user. Never set either on a real deployment.

## Deploying

Step by step in [DEPLOY.md](DEPLOY.md).

## Sign-in and the Loot link

Northbound signs in with your Loot account (Loot's Supabase). Convex accepts Supabase's sign-in tokens directly (`convex/auth.config.ts`), so there's one login for both.

To finish setting up the Loot side:

1. **Sign-in redirects.** In Loot's Supabase dashboard, under Authentication, URL Configuration, add `http://localhost:5190` (and Northbound's real address once deployed) to the redirect URLs. Password sign-in works without this; Google and email links need it.
2. **Live updates.** Run `docs/loot-realtime.sql` once in Loot's Supabase SQL editor. Until then, Northbound refreshes the linked goal every minute and whenever you come back to the app.

## Tests

```bash
npm test
```

The calculation engines (`shared/`) are covered: UK take-home pay, costs, runway, the landing-date solver, the partner rule, progress and the timeline.

## Icons

`node scripts/make-icons.mjs` redraws the PNG icons in `public/`.
