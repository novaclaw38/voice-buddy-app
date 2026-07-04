import { useState, useEffect, useCallback, useContext, createContext } from 'react'
import { supabase } from '../lib/supabase.js'

const SubscriptionContext = createContext(null)

export function SubscriptionProvider({ userId, children }) {
  const [tier, setTier] = useState('free')      // 'free' | 'trial' | 'pro'
  const [daysLeft, setDaysLeft] = useState(null)
  const [loading, setLoading] = useState(true)

  const refresh = useCallback(async () => {
    if (!userId) { setLoading(false); return }

    const { data, error } = await supabase
      .from('subscriptions')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle()

    if (error || !data) { setLoading(false); return }

    const now = new Date()

    if (data.status === 'trial') {
      const trialEnd = new Date(data.trial_end)
      if (trialEnd > now) {
        const days = Math.ceil((trialEnd - now) / 86400000)
        setTier('trial')
        setDaysLeft(days)
      } else {
        setTier('free')
        setDaysLeft(0)
      }
    } else if (data.status === 'active') {
      const subEnd = new Date(data.subscription_end)
      if (subEnd > now) {
        const days = Math.ceil((subEnd - now) / 86400000)
        setTier('pro')
        setDaysLeft(days)
      } else {
        setTier('free')
        setDaysLeft(0)
      }
    } else {
      setTier('free')
      setDaysLeft(null)
    }

    setLoading(false)
  }, [userId])

  useEffect(() => {
    refresh()
  }, [refresh])

  // A PayFast redirect back to /app?payment=success lands before the webhook
  // has necessarily landed, so poll briefly instead of trusting one read.
  useEffect(() => {
    if (typeof window === 'undefined') return
    if (new URLSearchParams(window.location.search).get('payment') !== 'success') return

    let cancelled = false
    let attempts = 0
    const poll = async () => {
      if (cancelled || attempts >= 6) return
      attempts += 1
      await refresh()
      setTimeout(poll, 2000)
    }
    poll()
    return () => { cancelled = true }
  }, [refresh])

  const isPro = tier === 'trial' || tier === 'pro'

  return (
    <SubscriptionContext.Provider value={{ tier, daysLeft, loading, isPro, refresh }}>
      {children}
    </SubscriptionContext.Provider>
  )
}

export function useSubscription() {
  return useContext(SubscriptionContext) || {
    tier: 'free', daysLeft: null, loading: false, isPro: false, refresh: async () => {},
  }
}
