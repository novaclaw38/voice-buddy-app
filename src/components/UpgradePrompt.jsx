import { useState, useRef } from 'react'
import { supabase } from '../lib/supabase.js'
import useFocusTrap from '../hooks/useFocusTrap.js'
import styles from './UpgradePrompt.module.css'
import { IconX, IconStar, IconCheck } from './icons.jsx'

// Keyed by the feature that triggered the prompt, so the headline reflects
// what the parent actually just tried to do instead of a one-size-fits-all
// pitch. Falls back to the generic copy for any trigger not listed here.
const TRIGGERS = {
  camera:     { title: 'Unlock the Live Camera',         sub: 'Peace-of-mind camera check-ins are part of Buddy Pro' },
  messages:   { title: 'Unlock Parent Voice Messages',   sub: 'Sending Buddy voice notes to your child is part of Buddy Pro' },
  costume:    { title: 'Unlock Costumes',                sub: "Dressing up your child's Buddy is part of Buddy Pro" },
  child:      { title: 'Unlock a Second Child Profile',  sub: 'Adding more than one child is part of Buddy Pro' },
  courses:    { title: 'Unlock All Courses',             sub: 'Gardening, robotics, science and more are part of Buddy Pro' },
  timeLimit:  { title: 'Unlock Daily Time Limits',       sub: 'Setting a screen-time limit is part of Buddy Pro' },
  story:      { title: 'Unlock Bedtime Story Ideas',     sub: 'Sending Buddy a story idea is part of Buddy Pro' },
  storyMode:  { title: 'Unlock Story Time',              sub: 'Interactive stories with Buddy are part of Buddy Pro' },
  freeLimit:  { title: "You've Used Today's Free Chats", sub: 'Unlimited daily chatting is part of Buddy Pro' },
  trialEnding:{ title: 'Your Trial Is Ending Soon',      sub: 'Add a payment method to keep everything in Buddy Pro' },
  trialEnded: { title: 'Your Free Trial Has Ended',      sub: 'Subscribe to keep everything you’ve been using in Buddy Pro' },
}

export default function UpgradePrompt({ onClose, session, trigger }) {
  const [loading, setLoading] = useState(false)
  const [upgradeError, setUpgradeError] = useState('')
  const trapRef = useRef(null)
  useFocusTrap(trapRef, true, onClose)
  const copy = TRIGGERS[trigger] || { title: 'Unlock Buddy Pro', sub: 'This feature is part of Buddy Pro' }

  const handleUpgrade = async () => {
    if (!session) return
    setLoading(true)
    setUpgradeError('')
    try {
      const res = await fetch('/api/payfast-create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          firstName: session.user.user_metadata?.full_name?.split(' ')[0] || 'Parent',
        }),
      })
      const { paymentUrl, error } = await res.json()
      if (error) throw new Error(error)
      window.location.href = paymentUrl
    } catch (err) {
      console.error('Upgrade error:', err)
      setUpgradeError('Something went wrong starting checkout. Please try again.')
      setLoading(false)
    }
  }

  return (
    <div className={styles.overlay} onClick={onClose} role="dialog" aria-modal="true" aria-label="Upgrade to Buddy Pro">
      <div className={styles.card} onClick={e => e.stopPropagation()} ref={trapRef}>
        <div className={styles.glow} />
        <button className={styles.close} onClick={onClose} aria-label="Close"><IconX size={18} /></button>

        <div className={styles.icon}><IconStar size={34} /></div>
        <h2 className={styles.title}>{copy.title}</h2>
        <p className={styles.sub}>{copy.sub}</p>

        <ul className={styles.perks}>
          {[
            'Unlimited daily messages',
            'All 6 courses — gardening, robotics, science & more',
            'Progress & mastery tracking',
            'Peace of mind camera',
            'Parent voice messages',
            'Avatar & costume customisation',
          ].map((perk) => (
            <li key={perk}><span className={styles.perkCheck}><IconCheck size={15} /></span>{perk}</li>
          ))}
        </ul>

        <div className={styles.price}>
          <span className={styles.amount}>R149</span>
          <span className={styles.period}>/month</span>
        </div>
        <p className={styles.trial}>First 10 days completely free</p>

        {upgradeError && <p className={styles.upgradeError} role="alert">{upgradeError}</p>}

        <button
          className={styles.cta}
          onClick={handleUpgrade}
          disabled={loading}
        >
          {loading ? 'Redirecting…' : 'Start Free Trial'}
        </button>
        <button className={styles.later} onClick={onClose}>Maybe later</button>
      </div>
    </div>
  )
}
