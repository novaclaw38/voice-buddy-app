import crypto from 'crypto'
import { createClient } from '@supabase/supabase-js'
import { getUser } from './_auth.js'

// PayFast has no "edit card on file" API for an existing subscription — the
// only way to hand it a new card is to cancel the old recurring token and
// create a fresh one. This does that, but keeps billing continuity: no
// charge happens today, and the new token's first charge is scheduled for
// the parent's existing renewal date (not reset to a new trial).
function buildCancelSignature({ merchantId, passphrase, timestamp, version }) {
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

  const merchantId  = process.env.PAYFAST_MERCHANT_ID
  const merchantKey = process.env.PAYFAST_MERCHANT_KEY
  const passphrase  = process.env.PAYFAST_PASSPHRASE
  const sandbox     = process.env.PAYFAST_SANDBOX !== 'false'
  if (!merchantId || !merchantKey || !passphrase) {
    return res.status(503).json({ error: 'PayFast not configured' })
  }

  const supabaseUrl = process.env.SUPABASE_URL
  const serviceKey  = process.env.SUPABASE_SERVICE_KEY
  if (!supabaseUrl || !serviceKey) return res.status(500).json({ error: 'Server misconfigured' })
  const db = createClient(supabaseUrl, serviceKey)

  const { data: sub, error: fetchErr } = await db
    .from('subscriptions')
    .select('payfast_token, status, trial_end, subscription_end')
    .eq('user_id', user.id)
    .maybeSingle()
  if (fetchErr) {
    console.error('payfast-update-payment: lookup failed', fetchErr)
    return res.status(500).json({ error: 'Could not look up your subscription.' })
  }
  if (!sub || (sub.status !== 'trial' && sub.status !== 'active')) {
    return res.status(400).json({ error: 'No active subscription to update.' })
  }

  // Cancel the old token with PayFast, but deliberately do NOT touch our
  // local status/subscription_end — access stays active through the swap.
  // The new token's R0 setup webhook (payfast-webhook.js) only updates
  // payfast_token, so continuity is preserved either way.
  if (sub.payfast_token) {
    const timestamp = new Date().toISOString().split('.')[0]
    const version = 'v1'
    const signature = buildCancelSignature({ merchantId, passphrase, timestamp, version })
    const cancelUrl = `https://api.payfast.co.za/subscriptions/${encodeURIComponent(sub.payfast_token)}/cancel${sandbox ? '?testing=true' : ''}`
    try {
      const cancelRes = await fetch(cancelUrl, {
        method: 'PUT',
        headers: {
          'merchant-id': merchantId,
          'version': version,
          'timestamp': timestamp,
          'signature': signature,
          'Content-Type': 'application/json',
        },
      })
      if (!cancelRes.ok) {
        const errText = await cancelRes.text().catch(() => '')
        console.error('payfast-update-payment: old token cancel failed', cancelRes.status, errText)
        return res.status(502).json({ error: 'Could not update your payment method with PayFast. Please try again.' })
      }
    } catch (err) {
      console.error('payfast-update-payment: old token cancel request failed', err)
      return res.status(502).json({ error: 'Could not reach PayFast. Please try again.' })
    }
  }

  // First charge on the new card lands on the existing renewal date, not a
  // fresh trial — never earlier than today.
  const today = new Date()
  const existingRenewal = sub.subscription_end || sub.trial_end
  const renewalDate = existingRenewal ? new Date(existingRenewal) : today
  const billingDate = (renewalDate > today ? renewalDate : today).toISOString().split('T')[0]

  const email = user.email
  if (!email) return res.status(400).json({ error: 'Account has no email on file.' })
  const { firstName = 'Parent' } = req.body

  const host = sandbox ? 'sandbox.payfast.co.za' : 'www.payfast.co.za'
  const appUrl = process.env.APP_URL || 'https://voice-buddy.vercel.app'

  const fields = {
    merchant_id:       merchantId,
    merchant_key:      merchantKey,
    return_url:        `${appUrl}/parent?payment=success`,
    cancel_url:        `${appUrl}/parent`,
    notify_url:        `${appUrl}/api/payfast-webhook`,
    name_first:        firstName,
    email_address:     email,
    m_payment_id:      user.id,
    amount:            '0.00',
    item_name:         'Buddy Pro — Update Payment Method',
    subscription_type: '1',
    billing_date:      billingDate,
    recurring_amount:  '149.00',
    frequency:         '3',
    cycles:            '0',
  }

  const paramString = Object.entries(fields)
    .map(([k, v]) => `${k}=${encodeURIComponent(v).replace(/%20/g, '+')}`)
    .join('&')

  const signatureInput = `${paramString}&passphrase=${encodeURIComponent(passphrase).replace(/%20/g, '+')}`
  const signature = crypto.createHash('md5').update(signatureInput).digest('hex')
  const paymentUrl = `https://${host}/eng/process?${paramString}&signature=${signature}`

  res.status(200).json({ paymentUrl })
}
