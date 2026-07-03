import styles from './DailyActivity.module.css'

export default function DailyActivity({ activity, onDismiss }) {
  return (
    <div className={styles.card}>
      <span className={styles.emoji}>{activity.emoji}</span>
      <div className={styles.body}>
        <p className={styles.title}>Today&apos;s Activity: {activity.title}</p>
        <p className={styles.desc}>{activity.description}</p>
      </div>
      <button className={styles.dismiss} onClick={onDismiss} aria-label="Dismiss activity">✕</button>
    </div>
  )
}
