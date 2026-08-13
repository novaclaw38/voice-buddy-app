import crypto from 'crypto'
import { createClient } from '@supabase/supabase-js'
import { requireAdmin, computeTier } from '../_admin.js'

// Merged with cancel-subscription into one function to stay under Vercel's
// Hobby-plan 12-Serverless-Function cap — routed by HTTP method instead of path.

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

async function handleOverview(req, res) {
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

// Same PayFast REST signing scheme as api/payfast-cancel.js — duplicated
// rather than shared since both handlers are small, self-contained, and
// otherwise unrelated (one acts on the caller, one on an admin-chosen target).
function buildSignature({ merchantId, passphrase, timestamp, version }) {
  const params = { 'merchant-id': merchantId, passphrase, timestamp, version }
  const sigString = Object.keys(params)
    .sort()
    .map((k) => `${k}=${encodeURIComponent(params[k])}`)
    .join('&')
  return crypto.createHash('md5').update(sigString).digest('hex')
}

async function handleCancelSubscription(req, res) {
  const { userId } = req.body || {}
  if (!userId) return res.status(400).json({ error: { message: 'userId is required' } })

  const supabaseUrl = process.env.SUPABASE_URL
  const serviceKey = process.env.SUPABASE_SERVICE_KEY
  if (!supabaseUrl || !serviceKey) return res.status(500).json({ error: { message: 'Server misconfigured' } })
  const client = createClient(supabaseUrl, serviceKey)

  const { data: sub, error: fetchErr } = await client
    .from('subscriptions')
    .select('payfast_token, status')
    .eq('user_id', userId)
    .maybeSingle()

  if (fetchErr) {
    console.error('admin/cancel-subscription: lookup failed', fetchErr)
    return res.status(500).json({ error: { message: 'Could not look up that subscription.' } })
  }
  if (!sub || sub.status === 'cancelled') {
    return res.status(200).json({ ok: true, alreadyCancelled: true })
  }
  if (!sub.payfast_token) {
    await client.from('subscriptions').update({
      status: 'cancelled',
      updated_at: new Date().toISOString(),
    }).eq('user_id', userId)
    return res.status(200).json({ ok: true })
  }

  const merchantId = process.env.PAYFAST_MERCHANT_ID
  const passphrase = process.env.PAYFAST_PASSPHRASE
  const sandbox = process.env.PAYFAST_SANDBOX !== 'false'
  if (!merchantId || !passphrase) {
    return res.status(503).json({ error: { message: 'PayFast not configured' } })
  }

  const timestamp = new Date().toISOString().split('.')[0]
  const version = 'v1'
  const signature = buildSignature({ merchantId, passphrase, timestamp, version })
  const url = `https://api.payfast.co.za/subscriptions/${encodeURIComponent(sub.payfast_token)}/cancel${sandbox ? '?testing=true' : ''}`

  try {
    const response = await fetch(url, {
      method: 'PUT',
      headers: {
        'merchant-id': merchantId,
        'version': version,
        'timestamp': timestamp,
        'signature': signature,
        'Content-Type': 'application/json',
      },
    })
    if (!response.ok) {
      const errText = await response.text().catch(() => '')
      console.error('admin/cancel-subscription: PayFast cancel failed', response.status, errText)
      return res.status(502).json({ error: { message: 'Could not cancel with PayFast. Please try again.' } })
    }
  } catch (err) {
    console.error('admin/cancel-subscription: PayFast request failed', err)
    return res.status(502).json({ error: { message: 'Could not reach PayFast. Please try again.' } })
  }

  await client.from('subscriptions').update({
    status: 'cancelled',
    updated_at: new Date().toISOString(),
  }).eq('user_id', userId)

  res.status(200).json({ ok: true })
}

export default async function handler(req, res) {
  const admin = await requireAdmin(req)
  if (!admin) return res.status(403).json({ error: { message: 'Forbidden' } })

  if (req.method === 'GET') return handleOverview(req, res)
  if (req.method === 'POST') return handleCancelSubscription(req, res)
  return res.status(405).json({ error: { message: 'Method not allowed' } })
}
