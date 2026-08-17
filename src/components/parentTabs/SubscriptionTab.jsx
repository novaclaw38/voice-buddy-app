import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase.js'
import styles from './shared.module.css'

export default function SubscriptionTab() {
  const [subInfo, setSubInfo] = useState(null)
  const [subLoading, setSubLoading] = useState(false)
  const [cancelStatus, setCancelStatus] = useState('idle') // idle | confirming | cancelling | done | error
  const [cancelError, setCancelError] = useState('')

  useEffect(() => {
    setSubLoading(true)
    setCancelStatus('idle')
    setCancelError('')
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) return null
      return supabase
        .from('subscriptions')
        .select('status, trial_end, subscription_end')
        .eq('user_id', user.id)
        .maybeSingle()
    }).then((result) => {
      setSubInfo(result?.data || null)
    }).catch(console.error).finally(() => setSubLoading(false))
  }, [])

  const handleCancelSubscription = async () => {
    setCancelStatus('cancelling')
    setCancelError('')
    try {
      const { data: { session } } = await supabase.auth.getSession()
      const res = await fetch('/api/payfast-cancel', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session?.access_token}`,
        },
      })
      const body = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(body.error || 'Cancellation failed')
      setCancelStatus('done')
      setSubInfo((prev) => (prev ? { ...prev, status: 'cancelled' } : prev))
    } catch (err) {
      setCancelStatus('error')
      setCancelError(err.message || 'Something went wrong')
    }
  }

  return (
    <div className={styles.section}>
      <h2 className={styles.sectionTitle}>Subscription</h2>

      {subLoading ? (
        <p className={styles.empty}>Loading...</p>
      ) : (
        <>
          <SubscriptionSummary subInfo={subInfo} />

          {subInfo?.status === 'cancelled' && (
            <p className={styles.hint} style={{ marginTop: 4 }}>
              Your subscription is cancelled. You won't be charged again.
            </p>
          )}

          {(subInfo?.status === 'trial' || subInfo?.status === 'active') && (
            <div className={styles.field} style={{ marginTop: 20 }}>
              {cancelStatus === 'confirming' ? (
                <>
                  <p className={styles.hint} style={{ marginBottom: 10 }}>
                    Cancel your subscription? You'll keep access until the current
                    period ends, then Buddy switches to the Free plan.
                  </p>
                  <div className={styles.btnRow}>
                    <button className={styles.btnDanger} onClick={handleCancelSubscription}>
                      Yes, cancel
                    </button>
                    <button className={styles.btnTest} onClick={() => setCancelStatus('idle')}>
                      Keep subscription
                    </button>
                  </div>
                </>
              ) : (
                <button
                  className={styles.btnDanger}
                  onClick={() => setCancelStatus('confirming')}
                  disabled={cancelStatus === 'cancelling'}
                >
                  {cancelStatus === 'cancelling' ? 'Cancelling...' : 'Cancel Subscription'}
                </button>
              )}
              {cancelStatus === 'error' && (
                <p className={styles.testError} style={{ marginTop: 10 }}>{cancelError}</p>
              )}
              {cancelStatus === 'done' && (
                <p className={styles.hint} style={{ marginTop: 10 }}>
                  Cancelled. You'll keep access until the current period ends.
                </p>
              )}
            </div>
          )}
        </>
      )}
    </div>
  )
}

function SubscriptionSummary({ subInfo }) {
  const fmt = (iso) => new Date(iso).toLocaleDateString(undefined, { day: 'numeric', month: 'long', year: 'numeric' })
  const now = Date.now()

  if (!subInfo || (subInfo.status !== 'trial' && subInfo.status !== 'active' && subInfo.status !== 'cancelled')) {
    return (
      <>
        <p className={styles.hint}><strong>Plan:</strong> Free</p>
        <p className={styles.hint}>Upgrade from the app to unlock all activity modes, courses, camera, and voice messages.</p>
      </>
    )
  }

  if (subInfo.status === 'trial') {
    const trialEnd = subInfo.trial_end ? new Date(subInfo.trial_end) : null
    const active = trialEnd && trialEnd.getTime() > now
    const daysLeft = active ? Math.max(0, Math.ceil((trialEnd - now) / 86400000)) : 0
    return (
      <p className={styles.hint}>
        <strong>Plan:</strong> Free trial{active ? ` — ${daysLeft} day${daysLeft === 1 ? '' : 's'} left` : ' — ended'}
        {trialEnd && <> (ends {fmt(subInfo.trial_end)})</>}. Then R149/month unless cancelled.
      </p>
    )
  }

  if (subInfo.status === 'active') {
    return (
      <p className={styles.hint}>
        <strong>Plan:</strong> Buddy Pro — R149/month
        {subInfo.subscription_end && <>, renews {fmt(subInfo.subscription_end)}</>}.
      </p>
    )
  }

  // cancelled
  const accessUntil = subInfo.subscription_end || subInfo.trial_end
  return (
    <p className={styles.hint}>
      <strong>Plan:</strong> Cancelled
      {accessUntil && <> — access until {fmt(accessUntil)}</>}.
    </p>
  )
}
