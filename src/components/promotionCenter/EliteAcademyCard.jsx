import { useState } from 'react'
import { startCheckout } from '../../services/checkoutService.js'
import styles from './EliteAcademyCard.module.css'

const PERKS = [
  'Weekly PDF Reports',
  'Unlimited Missions',
  'Priority Skill Coaching',
  'Exclusive Avatar Gear',
]

export default function EliteAcademyCard({ session }) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleUpgrade = async () => {
    setLoading(true)
    setError('')
    const result = await startCheckout(session)
    if (!result.ok) {
      setError(result.message)
      setLoading(false)
    }
  }

  return (
    <div className={styles.card}>
      <h3 className={styles.heading}>Enroll in Elite Academy</h3>
      <p className={styles.price}>R149 <span className={styles.period}>/ month</span></p>
      <ul className={styles.perks}>
        {PERKS.map((perk) => <li key={perk} className={styles.perk}>{perk}</li>)}
      </ul>
      {error && <p className={styles.error} role="alert">{error}</p>}
      <button className={styles.cta} onClick={handleUpgrade} disabled={loading}>
        {loading ? 'Redirecting…' : 'Unlock Full Potential'}
      </button>
    </div>
  )
}
