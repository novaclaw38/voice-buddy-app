import { useState, useEffect, useRef } from 'react'
import styles from './QuizCard.module.css'

export default function QuizCard({ step, onComplete }) {
  const [selected, setSelected] = useState(null)
  const [showConfetti, setShowConfetti] = useState(false)
  const timerRef = useRef(null)

  useEffect(() => () => clearTimeout(timerRef.current), [])

  const handleSelect = (i) => {
    if (selected !== null) return
    setSelected(i)
    if (i === step.correct) {
      setShowConfetti(true)
      timerRef.current = setTimeout(onComplete, 650)
    } else {
      // Wrong pick: show the mistake + reveal the right answer, then let them try again.
      timerRef.current = setTimeout(() => setSelected(null), 900)
    }
  }

  const getOptionClass = (i) => {
    if (selected === null) return styles.option
    if (i === step.correct) return `${styles.option} ${selected === i ? styles.correct : styles.correctReveal}`
    if (i === selected) return `${styles.option} ${styles.wrong}`
    return styles.option
  }

  return (
    <div className={styles.card}>
      <p className={styles.question}>{step.question}</p>
      <div className={`${styles.options} ${styles.confettiWrap}`}>
        {showConfetti && (
          <div className={styles.confetti} aria-hidden="true">
            {Array.from({ length: 8 }).map((_, i) => <span key={i} />)}
          </div>
        )}
        {step.options.map((opt, i) => {
          const spaceIdx = opt.indexOf(' ')
          const emoji = spaceIdx > -1 ? opt.slice(0, spaceIdx) : ''
          const text  = spaceIdx > -1 ? opt.slice(spaceIdx + 1) : opt
          return (
            <button
              key={i}
              className={getOptionClass(i)}
              onClick={() => handleSelect(i)}
              disabled={selected !== null}
            >
              {emoji && <span className={styles.optEmoji}>{emoji}</span>}
              <span className={styles.optText}>{text}</span>
            </button>
          )
        })}
      </div>
    </div>
  )
}
