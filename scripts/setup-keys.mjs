// Generates the keys Northbound's backend needs and sets them on a Convex deployment:
// - JWT_PRIVATE_KEY and JWKS: signing keys for Northbound accounts (Convex Auth)
// - SITE_URL: where the app runs
// - VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY, VAPID_SUBJECT: phone notifications
// Usage: node scripts/setup-keys.mjs <site-url> [--prod]
// Run once per deployment. Re-running replaces the keys, which signs everyone out and drops phone subscriptions.
import { execFileSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import { exportJWK, exportPKCS8, generateKeyPair } from 'jose'
import { createRequire } from 'node:module'
const webpush = createRequire(import.meta.url)('web-push')

const cli = fileURLToPath(new URL('../node_modules/convex/bin/main.js', import.meta.url))
const args = process.argv.slice(2)
const prod = args.includes('--prod') ? ['--prod'] : []
const siteUrl = args.find((a) => !a.startsWith('--')) ?? 'http://localhost:5190'

const keys = await generateKeyPair('RS256', { extractable: true })
const privateKey = (await exportPKCS8(keys.privateKey)).trimEnd().replace(/\n/g, ' ')
const jwks = JSON.stringify({ keys: [{ use: 'sig', ...(await exportJWK(keys.publicKey)) }] })
const vapid = webpush.generateVAPIDKeys()

const set = (name, value) => {
  // Run the Convex CLI through Node directly (no shell), so values with spaces aren't split.
  execFileSync(process.execPath, [cli, 'env', 'set', ...prod, '--', name, value], { stdio: ['ignore', 'ignore', 'inherit'] })
}
set('JWT_PRIVATE_KEY', privateKey)
set('JWKS', jwks)
set('SITE_URL', siteUrl)
set('VAPID_PUBLIC_KEY', vapid.publicKey)
set('VAPID_PRIVATE_KEY', vapid.privateKey)
set('VAPID_SUBJECT', 'https://goingnorthbound.vercel.app')
console.log(`Keys set${prod.length ? ' on production' : ' on the dev deployment'}. SITE_URL=${siteUrl}`)
