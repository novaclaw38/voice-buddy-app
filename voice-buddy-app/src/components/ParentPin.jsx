import { useState, useEffect } from 'react'
import styles from './ParentPin.module.css'

const MAX_ATTEMPTS = 5
const LOCKOUT_MS = 30000

export default function ParentPin({ correctPin = '1234', onSuccess }) {
  const [input, setInput] = useState('')
  const [shake, setShake] = useState(false)
  const [attempts, setAttempts] = useState(0)
  const [lockedUntil, setLockedUntil] = useState(0)
  const [remaining, setRemaining] = useState(0)

  const locked = remaining > 0

  // Tick down the lockout countdown.
  useEffect(() => {
    if (lockedUntil <= Date.now()) { setRemaining(0); return }
    const id = setInterval(() => {
      const left = Math.max(0, Math.ceil((lockedUntil - Date.now()) / 1000))
      setRemaining(left)
      if (left === 0) { setAttempts(0); clearInterval(id) }
    }, 250)
    return () => clearInterval(id)
  }, [lockedUntil])

  const handleDigit = (d) => {
    if (locked) return
    const next = input + d
    if (next.length < 4) {
      setInput(next)
    } else {
      const attempt = next
      setInput('')
      if (attempt === correctPin) {
        setAttempts(0)
        onSuccess()
      } else {
        const tries = attempts + 1
        setAttempts(tries)
        setShake(true)
        setTimeout(() => setShake(false), 500)
        if (tries >= MAX_ATTEMPTS) setLockedUntil(Date.now() + LOCKOUT_MS)
      }
    }
  }

  const handleDelete = () => setInput((p) => p.slice(0, -1))

  return (
    <div className={styles.overlay}>
      <div className={`${styles.card} ${shake ? styles.shake : ''}`}>
        <div className={styles.lock}>🔒</div>
        <h2 className={styles.title}>Parent Area</h2>
        <p className={styles.sub}>
          {locked
            ? `Too many tries — wait ${remaining}s`
            : attempts > 0
              ? `Enter your PIN (${MAX_ATTEMPTS - attempts} left)`
              : 'Enter your PIN'}
        </p>

        <div className={styles.dots}>
          {[0,1,2,3].map((i) => (
            <div key={i} className={`${styles.dot} ${input.length > i ? styles.filled : ''}`} />
          ))}
        </div>

        <div className={styles.keypad}>
          {['1','2','3','4','5','6','7','8','9','','0','⌫'].map((key, i) => (
            <button
              key={i}
              className={`${styles.key} ${key === '' ? styles.empty : ''}`}
              onClick={() => key === '⌫' ? handleDelete() : key && handleDigit(key)}
              disabled={!key || locked}
            >
              {key}
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
