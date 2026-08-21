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
      banned: !!(u.banned_until && new Date(u.banned_until) > new Date()),
    }
  })

  const tierCounts = { free: 0, trial: 0, pro: 0 }
  for (const u of users) tierCounts[u.tier]++

  const { data: payments, error: paymentsErr } = await db()
    .from('payments')
    .select('id, user_id, amount, status, payment_type, created_at')
    .order('created_at', { ascending: false })
  if (paymentsErr) {
    console.error('admin/overview: payments query failed', paymentsErr)
    return res.status(500).json({ error: { message: 'Could not load payment data.' } })
  }

  const total = payments
    .filter((p) => p.status === 'complete')
    .reduce((sum, p) => sum + Number(p.amount), 0)

  const thirtyDaysAgo = new Date()
  thirtyDaysAgo.setUTCDate(thirtyDaysAgo.getUTCDate() - 30)
  const failedPayments30d = payments.filter(
    (p) => p.status !== 'complete' && new Date(p.created_at) >= thirtyDaysAgo
  ).length

  const emailByUserId = new Map(users.map((u) => [u.id, u.email]))
  const recentPayments = payments.slice(0, 50).map((p) => ({
    id: p.id,
    email: p.user_id ? (emailByUserId.get(p.user_id) || '(deleted user)') : '(deleted user)',
    amount: Number(p.amount),
    status: p.status,
    paymentType: p.payment_type,
    createdAt: p.created_at,
  }))

  res.setHeader('Cache-Control', 'private, no-store')
  return res.status(200).json({
    users,
    stats: {
      signupsByDay: bucketSignupsByDay(users, 30),
      tierCounts,
      revenue: {
        total,
        mrr: tierCounts.pro * 149,
        byDay: bucketRevenueByDay(payments, 30),
      },
      failedPayments30d,
      recentPayments,
    },
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

async function handleCancelSubscription(client, userId) {
  const { data: sub, error: fetchErr } = await client
    .from('subscriptions')
    .select('payfast_token, status')
    .eq('user_id', userId)
    .maybeSingle()

  if (fetchErr) {
    console.error('admin/cancelSubscription: lookup failed', fetchErr)
    return { status: 500, body: { error: { message: 'Could not look up that subscription.' } } }
  }
  if (!sub || sub.status === 'cancelled') {
    return { status: 200, body: { ok: true, alreadyCancelled: true } }
  }
  if (!sub.payfast_token) {
    await client.from('subscriptions').update({
      status: 'cancelled',
      updated_at: new Date().toISOString(),
    }).eq('user_id', userId)
    return { status: 200, body: { ok: true } }
  }

  const merchantId = process.env.PAYFAST_MERCHANT_ID
  const passphrase = process.env.PAYFAST_PASSPHRASE
  const sandbox = process.env.PAYFAST_SANDBOX !== 'false'
  if (!merchantId || !passphrase) {
    return { status: 503, body: { error: { message: 'PayFast not configured' } } }
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
      console.error('admin/cancelSubscription: PayFast cancel failed', response.status, errText)
      return { status: 502, body: { error: { message: 'Could not cancel with PayFast. Please try again.' } } }
    }
  } catch (err) {
    console.error('admin/cancelSubscription: PayFast request failed', err)
    return { status: 502, body: { error: { message: 'Could not reach PayFast. Please try again.' } } }
  }

  await client.from('subscriptions').update({
    status: 'cancelled',
    updated_at: new Date().toISOString(),
  }).eq('user_id', userId)

  return { status: 200, body: { ok: true } }
}

async function handleGrantPro(client, userId, endDate) {
  if (!endDate) return { status: 400, body: { error: { message: 'endDate is required' } } }
  await client.from('subscriptions').upsert({
    user_id: userId,
    status: 'active',
    subscription_end: new Date(endDate).toISOString(),
    updated_at: new Date().toISOString(),
  }, { onConflict: 'user_id' })
  return { status: 200, body: { ok: true } }
}

async function handleSetBan(client, userId, banned) {
  const { error } = await client.auth.admin.updateUserById(userId, {
    ban_duration: banned ? '876000h' : 'none',
  })
  if (error) {
    console.error('admin/setBan: updateUserById failed', error)
    return { status: 500, body: { error: { message: 'Could not update ban status.' } } }
  }
  return { status: 200, body: { ok: true } }
}

async function handleDeleteUser(client, userId) {
  await client.from('subscriptions').delete().eq('user_id', userId)
  const { error } = await client.auth.admin.deleteUser(userId)
  if (error) {
    console.error('admin/deleteUser: deleteUser failed', error)
    return { status: 500, body: { error: { message: 'Could not delete that user.' } } }
  }
  return { status: 200, body: { ok: true } }
}

// Same zero-filled daily bucketing as bucketSignupsByDay, but summing an
// `amount` field off `complete` payments instead of counting users.
function bucketRevenueByDay(payments, days) {
  const sums = new Map()
  const now = new Date()
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(now)
    d.setUTCDate(d.getUTCDate() - i)
    sums.set(d.toISOString().slice(0, 10), 0)
  }
  for (const p of payments) {
    if (p.status !== 'complete') continue
    const day = p.created_at.slice(0, 10)
    if (sums.has(day)) sums.set(day, sums.get(day) + Number(p.amount))
  }
  return Array.from(sums, ([date, amount]) => ({ date, amount }))
}

async function handleUserDetail(client, userId) {
  const { data: authUser, error: authErr } = await client.auth.admin.getUserById(userId)
  if (authErr) {
    console.error('admin/userDetail: getUserById failed', authErr)
    return { status: 500, body: { error: { message: 'Could not load user.' } } }
  }
  const banned = !!(authUser?.user?.banned_until && new Date(authUser.user.banned_until) > new Date())

  const { data: payments, error: paymentsErr } = await client
    .from('payments')
    .select('id, amount, status, payment_type, created_at')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
  if (paymentsErr) {
    console.error('admin/userDetail: payments query failed', paymentsErr)
    return { status: 500, body: { error: { message: 'Could not load payment history.' } } }
  }

  const { data: children, error: childrenErr } = await client
    .from('children')
    .select('id, name, buddy_name, avatar_type, avatar_color')
    .eq('user_id', userId)
  if (childrenErr) {
    console.error('admin/userDetail: children query failed', childrenErr)
    return { status: 500, body: { error: { message: 'Could not load children.' } } }
  }

  const { data: completions, error: completionsErr } = await client
    .from('lesson_completions')
    .select('child_id, mastery_score')
    .in('child_id', children.map((c) => c.id))
  if (completionsErr) {
    console.error('admin/userDetail: lesson_completions query failed', completionsErr)
    return { status: 500, body: { error: { message: 'Could not load lesson activity.' } } }
  }

  const lessonActivity = children.map((c) => {
    const rows = completions.filter((r) => r.child_id === c.id)
    const scored = rows.filter((r) => r.mastery_score != null)
    const avgMastery = scored.length
      ? Math.round(scored.reduce((sum, r) => sum + r.mastery_score, 0) / scored.length)
      : null
    return { childId: c.id, childName: c.name, completions: rows.length, avgMastery }
  })

  return {
    status: 200,
    body: {
      banned,
      payments: payments.map((p) => ({
        id: p.id, amount: Number(p.amount), status: p.status,
        paymentType: p.payment_type, createdAt: p.created_at,
      })),
      children: children.map((c) => ({
        id: c.id, name: c.name, buddyName: c.buddy_name,
        avatarType: c.avatar_type, avatarColor: c.avatar_color,
      })),
      lessonActivity,
    },
  }
}

// db() throws when env vars are misconfigured — called lazily, only in the
// branches that actually need Supabase, so validation-only paths (missing
// userId, unsupported method) still 400/405 cleanly without it, and a real
// misconfiguration surfaces as clean JSON instead of an unhandled exception.
function tryDb(res) {
  try {
    return db()
  } catch (err) {
    console.error('admin: db() failed', err)
    res.status(500).json({ error: { message: 'Server misconfigured' } })
    return null
  }
}

export default async function handler(req, res) {
  const admin = await requireAdmin(req)
  if (!admin) return res.status(403).json({ error: { message: 'Forbidden' } })

  if (req.method === 'GET') {
    if (req.query?.userId) {
      const client = tryDb(res)
      if (!client) return
      const result = await handleUserDetail(client, req.query.userId)
      return res.status(result.status).json(result.body)
    }
    return handleOverview(req, res)
  }

  if (req.method === 'POST') {
    const { action, userId, endDate } = req.body || {}
    if (!userId) return res.status(400).json({ error: { message: 'userId is required' } })

    const KNOWN_ACTIONS = new Set(['cancelSubscription', 'grantPro', 'banUser', 'unbanUser', 'deleteUser'])
    if (!KNOWN_ACTIONS.has(action)) {
      return res.status(400).json({ error: { message: `Unknown action: ${action}` } })
    }

    const client = tryDb(res)
    if (!client) return

    let result
    if (action === 'cancelSubscription') result = await handleCancelSubscription(client, userId)
    else if (action === 'grantPro') result = await handleGrantPro(client, userId, endDate)
    else if (action === 'banUser') result = await handleSetBan(client, userId, true)
    else if (action === 'unbanUser') result = await handleSetBan(client, userId, false)
    else result = await handleDeleteUser(client, userId)

    return res.status(result.status).json(result.body)
  }

  return res.status(405).json({ error: { message: 'Method not allowed' } })
}
