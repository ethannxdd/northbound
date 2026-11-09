# Deploying Northbound to Vercel

About 20 minutes. Do the steps in order. Commands run in a terminal opened in `C:\Users\ethan\Projects\northbound`.

What's already done in the code: `vercel.json` (so links like `/map` work on refresh) and the `build:vercel` script (pushes the backend to Convex, then builds the site).

---

## 1. Move the backend to Convex's cloud

Right now Convex runs only on your computer. This creates a real Convex project in your account.

```bash
npx convex dev --configure new
```

Answer the prompts:
- **Team:** pick your team.
- **Project name:** `northbound`
- **Deployment type**, if asked: cloud.

Wait for `Convex functions ready!`, then press **Ctrl+C**.

This rewrites `.env.local` to point at the new cloud dev deployment. The test data from my local testing stays behind on the old local one.

Then open `.env.local` and change:

```
VITE_DEV_NO_AUTH=true
```
to
```
VITE_DEV_NO_AUTH=false
```

Test mode only works on the old local deployment, so from now on you sign in, even locally.

## 2. Get the production deploy key

1. Go to https://dashboard.convex.dev and open the **northbound** project.
2. Switch to the **Production** deployment (the selector at the top).
3. Go to **Settings**, then **URL & Deploy Key**.
4. Click **Generate Production Deploy Key** and copy it. It starts with `prod:`.

Keep it somewhere safe for step 4. Don't paste it into any file in the project.

## 3. Put the code on GitHub (private)

```bash
git init
```
```bash
git add .
```
```bash
git commit -m "Northbound first version"
```
```bash
gh repo create northbound --private --source . --push
```

`.env.local` is in `.gitignore`, so your keys are not uploaded.

## 4. Create the Vercel project

1. Go to https://vercel.com and sign in with GitHub.
2. Click **Add New**, then **Project**, and **Import** the `northbound` repository.
3. **Framework Preset:** Vite.
4. Open **Build and Output Settings** and override:
   - **Build Command:** `npm run build:vercel`
   - **Output Directory:** `dist`
5. Open **Environment Variables** and add these three:

   | Name | Value |
   |---|---|
   | `CONVEX_DEPLOY_KEY` | the `prod:` key from step 2 |
   | `VITE_SUPABASE_URL` | copy from `.env.local` |
   | `VITE_SUPABASE_PUBLISHABLE_KEY` | copy from `.env.local` |

   Don't add `VITE_DEV_NO_AUTH`, and don't add `VITE_CONVEX_URL` (the build sets it).
6. Click **Deploy**. When it finishes, note your address, e.g. `https://northbound-abc.vercel.app`.

## 5. Let Loot's sign-in send you back to Northbound

In Loot's Supabase project (https://supabase.com/dashboard):

1. **Authentication**, then **URL Configuration**.
2. Under **Redirect URLs**, click **Add URL** and enter your Vercel address followed by `/**`, e.g.
   `https://northbound-abc.vercel.app/**`
3. Save. Don't change the **Site URL**; that's Loot's.

Email and password sign-in works even without this. Google and email-link sign-in need it.

**Optional, for instant updates:** in the same project, open **SQL Editor**, paste the contents of `docs/loot-realtime.sql`, and click **Run**. Without it, Northbound refreshes your goal every minute and whenever you reopen the app.

## 6. Sign in

1. Open your Vercel address.
2. Sign in with your Loot account.
3. Answer the four setup questions.
4. Go to **How far you've come**, then **Link your Loot goal**, and pick your move goal or create one.

On your phone, open the address in Safari or Chrome and use **Add to Home Screen** to install it like an app.

---

## Updating later

Push to GitHub and Vercel redeploys on its own, backend included:

```bash
git add .
```
```bash
git commit -m "Describe the change"
```
```bash
git push
```

## If something goes wrong

| What you see | Likely cause |
|---|---|
| Stuck on "Signing you in" | The Vercel build didn't push to Convex. Check `CONVEX_DEPLOY_KEY` is set and starts with `prod:`, then redeploy. |
| "Northbound needs Loot's Supabase settings" | `VITE_SUPABASE_URL` or `VITE_SUPABASE_PUBLISHABLE_KEY` is missing in Vercel. Add it and redeploy. |
| Google sign-in sends you to Loot or localhost | The redirect URL from step 5 is missing or has a typo. |
| `/map` shows a 404 after a refresh | `vercel.json` wasn't included in the commit. |
