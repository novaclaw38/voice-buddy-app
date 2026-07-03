import styles from './SpeechBubble.module.css'

export default function SpeechBubble({ buddyText, userText, status, storyMode, wordIndex }) {
  const showThinking = status === 'thinking'
  const showWordTracker = storyMode && wordIndex >= 0 && buddyText && !showThinking

  // Bubble is visible when there's text OR when showing thinking dots
  const isVisible = !!(buddyText || showThinking)

  const renderText = () => {
    if (showThinking) {
      return <div className={styles.dots}><span /><span /><span /></div>
    }
    if (showWordTracker) {
      const words = buddyText.trim().split(/\s+/)
      return (
        <p className={`${styles.buddyText} ${styles.storyText}`}>
          {words.map((word, i) => (
            <span key={i} className={`${styles.word} ${i === wordIndex ? styles.activeWord : ''}`}>
              {i === wordIndex && <span className={styles.dot} aria-hidden="true">●</span>}
              {word}{' '}
            </span>
          ))}
        </p>
      )
    }
    return <p className={styles.buddyText}>{buddyText || ' '}</p>
  }

  return (
    <div className={styles.wrapper}>
      {userText && (
        <div className={styles.userBubble}>
          <span className={styles.userLabel}>You said:</span>
          <span className={styles.userText}>{userText}</span>
        </div>
      )}

      <div className={`${styles.buddyBubble} ${isVisible ? styles.visible : ''} ${showWordTracker ? styles.storyBubble : ''}`}>
        {renderText()}
        <div className={styles.tail} />
      </div>
    </div>
  )
}
