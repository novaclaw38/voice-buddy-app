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
