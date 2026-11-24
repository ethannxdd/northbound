# Turning on "Continue with Google" and "Forgot password?"

The code is in place. Each option appears on the sign-in screen only once its keys are set on the Convex deployment, so nothing shows half-working until then.

Do each part twice: once for the dev deployment (`ideal-bobcat-946`, used on localhost) and once for production (`healthy-ferret-127`, the live site), adding `--prod` to the commands.

## Continue with Google

1. Go to https://console.cloud.google.com, create a project (for example "Northbound").
2. **APIs & Services › OAuth consent screen**: choose External, app name "Northbound", your email as support and developer contact. While it's in Testing mode, add your own Google account under **Test users** (only test users can sign in until you publish the app).
3. **APIs & Services › Credentials › Create credentials › OAuth client ID**, type **Web application**:
   - Authorised JavaScript origins: `https://goingnorthbound.vercel.app` and `http://localhost:5190`
   - Authorised redirect URIs:
     - `https://ideal-bobcat-946.eu-west-1.convex.site/api/auth/callback/google`
     - your production deployment's HTTP Actions URL followed by `/api/auth/callback/google`. Find it in the Convex dashboard: Production › Settings › URL & Deploy Key, the "HTTP Actions URL" ending in `.convex.site`.
4. Copy the client ID and client secret, then run (in the project folder):

```
npx convex env set AUTH_GOOGLE_ID <client id>
npx convex env set AUTH_GOOGLE_SECRET <client secret>
npx convex env set AUTH_GOOGLE_ID <client id> --prod
npx convex env set AUTH_GOOGLE_SECRET <client secret> --prod
```

If you already have a Northbound account with the same email that was made with Loot, Google signs you in to it. An account made with only an email and password stays separate: sign in with the password instead.

## Forgot password?

1. Sign up at https://resend.com and create an API key (Sending access is enough).
2. Run:

```
npx convex env set AUTH_RESEND_KEY <api key>
npx convex env set AUTH_RESEND_KEY <api key> --prod
```

3. Until you verify a domain in Resend, emails come from `onboarding@resend.dev` and Resend only delivers them to the email address you signed up to Resend with. That's fine while Northbound is just for you. To send to anyone, verify a domain you own in Resend, then:

```
npx convex env set AUTH_EMAIL_FROM "Northbound <hello@yourdomain.com>" --prod
```

The code in the email is 8 digits and works for 15 minutes.
