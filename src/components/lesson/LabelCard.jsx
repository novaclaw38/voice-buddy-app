import { useState, useMemo, useEffect, useRef } from 'react'
import styles from './LabelCard.module.css'

function shuffleArray(arr) {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

export default function LabelCard({ step, onComplete }) {
  const [placed, setPlaced] = useState([])
  const timerRef = useRef(null)

  // Fix 1: shuffle chip bank once on mount
  const shuffledItems = useMemo(() => shuffleArray(step.items), [step.items])

  // Fix 3: clear the onComplete timeout on unmount
  useEffect(() => {
    return () => {
      if (timerRef.current !== null) {
        clearTimeout(timerRef.current)
      }
    }
  }, [])

  const handleTap = (item) => {
    const next = [...placed, item]
    setPlaced(next)
    if (next.length === step.items.length) {
      timerRef.current = setTimeout(onComplete, 500)
    }
  }

  const remaining = shuffledItems.filter(item => !placed.includes(item))

  return (
    <div className={styles.card}>
      {/* Fix 2: placed-slot row ABOVE the visual emoji */}
      <div className={styles.placed}>
        {step.items.map((item, i) => {
          const spaceIdx = item.indexOf(' ')
          const emoji = spaceIdx > -1 ? item.slice(0, spaceIdx) : item
          const isFilled = placed.includes(item)
          return (
            <span
              key={item}
              className={`${styles.labelSlot} ${isFilled ? styles.labelFilled : styles.labelEmpty}`}
            >
              {isFilled ? emoji : `${i + 1}`}
            </span>
          )
        })}
      </div>

      <span className={styles.visual}>{step.visual}</span>
      <p className={styles.instruction}>Tap the labels in order ↓</p>

      <div className={styles.chips}>
        {remaining.map(item => {
          const spaceIdx = item.indexOf(' ')
          const emoji = spaceIdx > -1 ? item.slice(0, spaceIdx) : ''
          const text  = spaceIdx > -1 ? item.slice(spaceIdx + 1) : item
          return (
            <button key={item} className={styles.chip} onClick={() => handleTap(item)}>
              {emoji && <span className={styles.chipEmoji}>{emoji}</span>}
              <span className={styles.chipText}>{text}</span>
            </button>
          )
        })}
      </div>
    </div>
  )
}
