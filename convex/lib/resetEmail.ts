// "Forgot password": emails an 8-digit code through Resend. Needs AUTH_RESEND_KEY on the deployment,
// and AUTH_EMAIL_FROM once you've verified a sending domain in Resend.
import Resend from '@auth/core/providers/resend'

declare const process: { env: Record<string, string | undefined> }

function eightDigits(): string {
  const bytes = new Uint32Array(8)
  crypto.getRandomValues(bytes)
  return Array.from(bytes, (b) => String(b % 10)).join('')
}

export const ResetEmail = Resend({
  id: 'password-reset',
  apiKey: process.env.AUTH_RESEND_KEY,
  maxAge: 15 * 60,
  async generateVerificationToken() {
    return eightDigits()
  },
  async sendVerificationRequest({ identifier: email, provider, token }) {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${provider.apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from: process.env.AUTH_EMAIL_FROM ?? 'Northbound <onboarding@resend.dev>',
        to: [email],
        subject: 'Your Northbound reset code',
        text: `Your code to reset your Northbound password is ${token}.\n\nIt works for 15 minutes. If you didn't ask to reset your password, you can ignore this email.`,
      }),
    })
    if (!res.ok) throw new Error(`Couldn't send the reset email (${res.status})`)
  },
})
