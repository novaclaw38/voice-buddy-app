import { createClient } from '@supabase/supabase-js'
import { requireAdmin, computeTier } from '../_admin.js'

function db() {
  const supabaseUrl = process.env.SUPABASE_URL
  const serviceKey = process.env.SUPABASE_SERVICE_KEY
  if (!supabaseUrl || !serviceKey) {
    throw new Error('SUPABASE_URL / SUPABASE_SERVICE_KEY not configured')
  }
  return createClient(supabaseUrl, serviceKey)
}

// Buckets signups into the last `days` calendar days (UTC), oldest first,
// including days with zero signups so the client can render a fixed-width bar chart.
function bucketSignupsByDay(users, days) {
  const counts = new Map()
  const now = new Date()
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(now)
    d.setUTCDate(d.getUTCDate() - i)
    counts.set(d.toISOString().slice(0, 10), 0)
  }
  for (const u of users) {
    const day = u.createdAt.slice(0, 10)
    if (counts.has(day)) counts.set(day, counts.get(day) + 1)
  }
  return Array.from(counts, ([date, count]) => ({ date, count }))
}

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ error: { message: 'Method not allowed' } })

  const admin = await requireAdmin(req)
  if (!admin) return res.status(403).json({ error: { message: 'Forbidden' } })

  let authUsers
  try {
    const { data, error } = await db().auth.admin.listUsers({ perPage: 1000 })
    if (error) throw error
    authUsers = data.users
  } catch (err) {
    console.error('admin/overview: listUsers failed', err)
    return res.status(500).json({ error: { message: 'Could not load users.' } })
  }

  const { data: subs, error: subsErr } = await db().from('subscriptions').select('*')
  if (subsErr) {
    console.error('admin/overview: subscriptions query failed', subsErr)
    return res.status(500).json({ error: { message: 'Could not load subscriptions.' } })
  }

  const subsByUser = new Map(subs.map((s) => [s.user_id, s]))

  const users = authUsers.map((u) => {
    const sub = subsByUser.get(u.id) || null
    return {
      id: u.id,
      email: u.email,
      createdAt: u.created_at,
      tier: computeTier(sub),
      status: sub?.status ?? null,
      trialEnd: sub?.trial_end ?? null,
      subscriptionEnd: sub?.subscription_end ?? null,
    }
  })

  const tierCounts = { free: 0, trial: 0, pro: 0 }
  for (const u of users) tierCounts[u.tier]++

  res.setHeader('Cache-Control', 'private, no-store')
  return res.status(200).json({
    users,
    stats: { signupsByDay: bucketSignupsByDay(users, 30), tierCounts },
  })
}
