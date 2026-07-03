import crypto from 'crypto'
import { createClient } from '@supabase/supabase-js'
import { getUser } from './_auth.js'

// PayFast's REST API (distinct from the ITN/onsite-process form endpoints used
// elsewhere) signs requests with a header-based scheme:
// https://developers.payfast.co.za/api#subscriptions
//   - headers: merchant-id, version, timestamp, signature
//   - signature = md5(alphabetised "key=value" pairs of {header fields + passphrase},
//     urlencoded values, joined by "&", lowercase hex)
//   - sandbox uses the same host with a ?testing=true query param (excluded from
//     the signature), not a different subdomain like the ITN endpoints.
function buildSignature({ merchantId, passphrase, timestamp, version }) {
  const params = { 'merchant-id': merchantId, passphrase, timestamp, version }
  const sigString = Object.keys(params)
    .sort()
    .map((k) => `${k}=${encodeURIComponent(params[k])}`)
    .join('&')
  return crypto.createHash('md5').update(sigString).digest('hex')
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const user = await getUser(req)
  if (!user) return res.status(401).json({ error: 'Sign in to manage your subscription.' })

  const merchantId = process.env.PAYFAST_MERCHANT_ID
  const passphrase = process.env.PAYFAST_PASSPHRASE
  const sandbox     = process.env.PAYFAST_SANDBOX !== 'false'

  if (!merchantId || !passphrase) {
    return res.status(503).json({ error: 'PayFast not configured' })
  }

  const supabaseUrl = process.env.SUPABASE_URL || 'https://ykqrmyvizwxgfeevirhr.supabase.co'
  const serviceKey  = process.env.SUPABASE_SERVICE_KEY
  if (!serviceKey) return res.status(500).json({ error: 'Server misconfigured' })
  const db = createClient(supabaseUrl, serviceKey)

  const { data: sub, error: fetchErr } = await db
    .from('subscriptions')
    .select('payfast_token, status')
    .eq('user_id', user.id)
    .maybeSingle()

  if (fetchErr) {
    console.error('payfast-cancel: subscription lookup failed', fetchErr)
    return res.status(500).json({ error: 'Could not look up your subscription.' })
  }
  if (sub?.status === 'cancelled') {
    return res.status(200).json({ ok: true, alreadyCancelled: true })
  }
  if (!sub?.payfast_token) {
    // No recurring token on file (e.g. still mid-trial before the R0 setup ITN
    // landed) — nothing to cancel with PayFast, just stop the local trial/plan.
    await db.from('subscriptions').update({
      status: 'cancelled',
      updated_at: new Date().toISOString(),
    }).eq('user_id', user.id)
    return res.status(200).json({ ok: true })
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
      console.error('PayFast cancel failed:', response.status, errText)
      return res.status(502).json({ error: 'Could not cancel with PayFast. Please try again or contact support.' })
    }
  } catch (err) {
    console.error('PayFast cancel request failed:', err)
    return res.status(502).json({ error: 'Could not reach PayFast. Please try again.' })
  }

  // User-initiated cancellation is authoritative locally regardless of when/whether
  // PayFast's own ITN later confirms it.
  await db.from('subscriptions').update({
    status: 'cancelled',
    updated_at: new Date().toISOString(),
  }).eq('user_id', user.id)

  res.status(200).json({ ok: true })
}
