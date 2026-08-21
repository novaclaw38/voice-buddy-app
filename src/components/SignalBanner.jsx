import styles from './SignalBanner.module.css'

// Soft, non-alarming — deliberately not styled like the trial-ending
// banner (no red, no exclamation framing), matching PRODUCT.md's copy
// guidance against "monitoring"/"surveillance" language.
export default function SignalBanner({ signal, onReview, onDismiss }) {
  if (!signal) return null
  return (
    <div className={styles.banner}>
      <span>{signal.blurb} Want to check in?</span>
      <button className={styles.reviewBtn} onClick={onReview}>Review chats</button>
      <button className={styles.dismissBtn} onClick={onDismiss} aria-label="Dismiss">✕</button>
    </div>
  )
}
