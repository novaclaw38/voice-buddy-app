import crypto from 'crypto'
import { createClient } from '@supabase/supabase-js'
import { requireAdmin } from '../_admin.js'

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

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: { message: 'Method not allowed' } })

  const admin = await requireAdmin(req)
  if (!admin) return res.status(403).json({ error: { message: 'Forbidden' } })

  const { userId } = req.body || {}
  if (!userId) return res.status(400).json({ error: { message: 'userId is required' } })

  const supabaseUrl = process.env.SUPABASE_URL
  const serviceKey = process.env.SUPABASE_SERVICE_KEY
  if (!supabaseUrl || !serviceKey) return res.status(500).json({ error: { message: 'Server misconfigured' } })
  const db = createClient(supabaseUrl, serviceKey)

  const { data: sub, error: fetchErr } = await db
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
    await db.from('subscriptions').update({
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

  await db.from('subscriptions').update({
    status: 'cancelled',
    updated_at: new Date().toISOString(),
  }).eq('user_id', userId)

  res.status(200).json({ ok: true })
}
