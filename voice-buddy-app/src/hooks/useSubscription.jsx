import { useState, useEffect, useContext, createContext } from 'react'
import { supabase } from '../lib/supabase.js'

const SubscriptionContext = createContext(null)

export function SubscriptionProvider({ userId, children }) {
  const [tier, setTier] = useState('free')      // 'free' | 'trial' | 'pro'
  const [daysLeft, setDaysLeft] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!userId) { setLoading(false); return }

    const load = async () => {
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
    }

    load()
  }, [userId])

  const isPro = tier === 'trial' || tier === 'pro'

  return (
    <SubscriptionContext.Provider value={{ tier, daysLeft, loading, isPro }}>
      {children}
    </SubscriptionContext.Provider>
  )
}

export function useSubscription() {
  return useContext(SubscriptionContext) || { tier: 'free', daysLeft: null, loading: false, isPro: false }
}
