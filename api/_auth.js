import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.SUPABASE_URL || 'https://ykqrmyvizwxgfeevirhr.supabase.co'
const serviceKey  = process.env.SUPABASE_SERVICE_KEY

// Modes any signed-in user may use without a subscription.
const FREE_MODES = new Set(['chat', 'story', 'sing'])

function db() {
  return createClient(supabaseUrl, serviceKey)
}

// Returns the authenticated Supabase user for a request, or null.
export async function getUser(req) {
  const header = req.headers.authorization || req.headers.Authorization || ''
  const token = header.startsWith('Bearer ') ? header.slice(7) : null
  if (!token || !serviceKey) return null
  try {
    const { data, error } = await db().auth.getUser(token)
    if (error || !data?.user) return null
    return data.user
  } catch {
    return null
  }
}

export function isProMode(mode) {
  return !FREE_MODES.has(mode || 'chat')
}

// True if the user currently has an active trial or paid subscription.
export async function isEntitled(userId) {
  if (!serviceKey || !userId) return false
  try {
    const { data } = await db()
      .from('subscriptions')
      .select('status, trial_end, subscription_end')
      .eq('user_id', userId)
      .maybeSingle()
    if (!data) return false
    const now = Date.now()
    if (data.status === 'trial'  && data.trial_end        && new Date(data.trial_end).getTime()        > now) return true
    if (data.status === 'active' && data.subscription_end && new Date(data.subscription_end).getTime() > now) return true
    return false
  } catch {
    return false
  }
}
