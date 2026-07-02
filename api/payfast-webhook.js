import crypto from 'crypto'
import { createClient } from '@supabase/supabase-js'

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end()

  const passphrase   = process.env.PAYFAST_PASSPHRASE
  const supabaseUrl  = process.env.SUPABASE_URL  || 'https://ykqrmyvizwxgfeevirhr.supabase.co'
  const serviceKey   = process.env.SUPABASE_SERVICE_KEY

  if (!serviceKey) {
    console.error('SUPABASE_SERVICE_KEY not set')
    return res.status(500).end()
  }

  const db = createClient(supabaseUrl, serviceKey)
  const body = req.body

  // Validate ITN signature
  const { signature, ...rest } = body
  const paramString = Object.entries(rest)
    .map(([k, v]) => `${k}=${encodeURIComponent(v).replace(/%20/g, '+')}`)
    .join('&')

  const signatureInput = passphrase
    ? `${paramString}&passphrase=${encodeURIComponent(passphrase).replace(/%20/g, '+')}`
    : paramString

  const expected = crypto.createHash('md5').update(signatureInput).digest('hex')
  if (expected !== signature) {
    console.warn('PayFast ITN: signature mismatch')
    return res.status(400).end()
  }

  // Confirm the notification really came from PayFast (recommended server postback).
  const sandbox = process.env.PAYFAST_SANDBOX !== 'false'
  const pfHost  = sandbox ? 'sandbox.payfast.co.za' : 'www.payfast.co.za'
  try {
    const verify = await fetch(`https://${pfHost}/eng/query/validate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: paramString, // original fields, signature excluded
    })
    const verdict = (await verify.text()).trim()
    if (verdict !== 'VALID') {
      console.warn('PayFast ITN: postback not VALID:', verdict)
      return res.status(400).end()
    }
  } catch (err) {
    console.error('PayFast ITN: postback failed', err)
    return res.status(500).end()
  }

  const userId        = body.m_payment_id
  const status        = body.payment_status
  const token         = body.token || null
  const amount        = parseFloat(body.amount_gross || '0')
  const pfPaymentId   = body.pf_payment_id

  if (!userId) return res.status(400).end()
  if (!pfPaymentId) return res.status(400).end()

  // Reject replays of a notification we've already processed.
  const { error: dedupeErr } = await db
    .from('payfast_webhook_events')
    .insert({ pf_payment_id: pfPaymentId })
  if (dedupeErr) {
    if (dedupeErr.code === '23505') {
      // Already processed this pf_payment_id — ack without re-applying it.
      return res.status(200).end()
    }
    console.error('PayFast ITN: dedupe insert failed', dedupeErr)
    return res.status(500).end()
  }

  // Only amounts we actually request: R0 trial setup, or the R149 recurring charge.
  const ALLOWED_AMOUNTS = [0, 149]
  if (!ALLOWED_AMOUNTS.some((a) => Math.abs(amount - a) < 0.01)) {
    console.warn('PayFast ITN: unexpected amount_gross', amount)
    return res.status(400).end()
  }

  if (status === 'COMPLETE' && amount >= 149) {
    // A real paid charge → grant/extend a month of Pro.
    const subscriptionEnd = new Date()
    subscriptionEnd.setDate(subscriptionEnd.getDate() + 30)

    await db.from('subscriptions').upsert({
      user_id:          userId,
      status:           'active',
      subscription_end: subscriptionEnd.toISOString(),
      payfast_token:    token,
      updated_at:       new Date().toISOString(),
    }, { onConflict: 'user_id' })

  } else if (status === 'COMPLETE') {
    // R0 trial setup — just record the recurring token; the trial row already exists.
    await db.from('subscriptions').upsert({
      user_id:       userId,
      payfast_token: token,
      updated_at:    new Date().toISOString(),
    }, { onConflict: 'user_id' })

  } else if (status === 'CANCELLED' || status === 'FAILED') {
    await db.from('subscriptions').upsert({
      user_id:    userId,
      status:     'cancelled',
      updated_at: new Date().toISOString(),
    }, { onConflict: 'user_id' })
  }

  res.status(200).end()
}
