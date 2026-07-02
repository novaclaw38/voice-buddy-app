import crypto from 'crypto'
import { getUser } from './_auth.js'

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  // Derive identity from the verified session — never trust userId/email from the body.
  const user = await getUser(req)
  if (!user) return res.status(401).json({ error: 'Sign in to upgrade.' })

  const userId = user.id
  const email  = user.email
  const { firstName = 'Parent' } = req.body
  if (!email) return res.status(400).json({ error: 'Account has no email on file.' })

  const merchantId  = process.env.PAYFAST_MERCHANT_ID
  const merchantKey = process.env.PAYFAST_MERCHANT_KEY
  const passphrase  = process.env.PAYFAST_PASSPHRASE
  const sandbox     = process.env.PAYFAST_SANDBOX !== 'false'

  if (!merchantId || !merchantKey) {
    return res.status(503).json({ error: 'PayFast not configured' })
  }

  // Trial: R0 today, R149 billed after 10 days, then monthly
  const trialEnd = new Date()
  trialEnd.setDate(trialEnd.getDate() + 10)
  const billingDate = trialEnd.toISOString().split('T')[0] // YYYY-MM-DD

  const host = sandbox ? 'sandbox.payfast.co.za' : 'www.payfast.co.za'
  const appUrl = process.env.APP_URL || 'https://voice-buddy.vercel.app'

  const fields = {
    merchant_id:       merchantId,
    merchant_key:      merchantKey,
    return_url:        `${appUrl}/app?payment=success`,
    cancel_url:        `${appUrl}/app`,
    notify_url:        `${appUrl}/api/payfast-webhook`,
    name_first:        firstName,
    email_address:     email,
    m_payment_id:      userId,
    amount:            '0.00',       // free today
    item_name:         'Buddy Pro — Monthly Subscription',
    subscription_type: '1',
    billing_date:      billingDate,
    recurring_amount:  '149.00',
    frequency:         '3',          // monthly
    cycles:            '0',          // indefinite
  }

  // Build signature string — fields in order, URL-encoded, joined by &
  const paramString = Object.entries(fields)
    .map(([k, v]) => `${k}=${encodeURIComponent(v).replace(/%20/g, '+')}`)
    .join('&')

  const signatureInput = passphrase
    ? `${paramString}&passphrase=${encodeURIComponent(passphrase).replace(/%20/g, '+')}`
    : paramString

  const signature = crypto.createHash('md5').update(signatureInput).digest('hex')

  const paymentUrl = `https://${host}/eng/process?${paramString}&signature=${signature}`

  res.status(200).json({ paymentUrl })
}
