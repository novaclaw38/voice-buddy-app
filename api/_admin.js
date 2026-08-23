import crypto from 'crypto'
import { getUser } from './_auth.js'

// Single hardcoded admin — this is a solo-owner app. Must match the client-side
// guard in App.jsx exactly; that guard is UX-only, this check is the real
// security boundary.
export const ADMIN_EMAIL = 'rebawntech@gmail.com'

export async function requireAdmin(req) {
  const user = await getUser(req)
  if (!user || user.email !== ADMIN_EMAIL) return null
  return user
}

// The weekly-digest cron trigger has no logged-in Supabase session to check
// against requireAdmin — it's an external scheduler (e.g. cron-job.org)
// hitting the endpoint directly, authenticated by a shared secret instead.
export function requireCronSecret(req) {
  const expected = process.env.CRON_SECRET
  const provided = req.headers['x-cron-secret']
  if (!expected || !provided) return false
  const expectedBuf = Buffer.from(expected)
  const providedBuf = Buffer.from(String(provided))
  if (expectedBuf.length !== providedBuf.length) return false
  return crypto.timingSafeEqual(expectedBuf, providedBuf)
}

// Mirrors the entitlement logic in useSubscription.jsx / api/_auth.js's
// isEntitled, but returns the tier label rather than a boolean — kept
// separate since the admin overview needs the label, not just yes/no.
export function computeTier(sub) {
  if (!sub) return 'free'
  const now = Date.now()
  if (sub.status === 'trial' && sub.trial_end && new Date(sub.trial_end).getTime() > now) return 'trial'
  if (sub.status === 'active' && sub.subscription_end && new Date(sub.subscription_end).getTime() > now) return 'pro'
  return 'free'
}
