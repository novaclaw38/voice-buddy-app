import { createClient } from '@supabase/supabase-js'
import { getUser } from './_auth.js'

// Provisions the 10-day trial row for a new user, server-side with the service
// key. Idempotent: if a subscriptions row already exists (any status), it is
// left untouched, so an expired trial can never be re-minted from here.
export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const user = await getUser(req)
  if (!user) return res.status(401).json({ error: 'Sign in first.' })

  const supabaseUrl = process.env.SUPABASE_URL
  const serviceKey  = process.env.SUPABASE_SERVICE_KEY
  if (!supabaseUrl || !serviceKey) return res.status(500).json({ error: 'Server misconfigured' })
  const db = createClient(supabaseUrl, serviceKey)

  const { data: existing, error: selErr } = await db
    .from('subscriptions')
    .select('id')
    .eq('user_id', user.id)
    .maybeSingle()
  if (selErr) {
    console.error('ensure-trial: lookup failed', selErr)
    return res.status(500).json({ error: 'Could not check subscription.' })
  }
  if (existing) return res.status(200).json({ ok: true, created: false })

  const trialEnd = new Date()
  trialEnd.setDate(trialEnd.getDate() + 10)

  const { error: insErr } = await db.from('subscriptions').insert({
    user_id:     user.id,
    status:      'trial',
    trial_start: new Date().toISOString(),
    trial_end:   trialEnd.toISOString(),
  })
  // 23505 = another request won the race; the row exists, which is all we need.
  if (insErr && insErr.code !== '23505') {
    console.error('ensure-trial: insert failed', insErr)
    return res.status(500).json({ error: 'Could not start trial.' })
  }

  res.status(200).json({ ok: true, created: !insErr })
}
