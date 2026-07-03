import styles from './ExplainCard.module.css'

export default function ExplainCard({ step }) {
  return (
    <div className={styles.card}>
      <span className={styles.emoji}>{step.emoji}</span>
      <p className={styles.fact}>{step.fact}</p>
    </div>
  )
}
