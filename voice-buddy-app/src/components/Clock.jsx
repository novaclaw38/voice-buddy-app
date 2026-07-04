import { useState, useEffect } from 'react'
import styles from './Clock.module.css'

// Ticks once a minute — a live clock doesn't need second-level precision,
// and this keeps it from re-rendering the whole top bar every second.
export default function Clock({ className }) {
  const [now, setNow] = useState(() => new Date())

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 30000)
    return () => clearInterval(id)
  }, [])

  const time = now.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })

  return (
    <span className={`${styles.clock} ${className || ''}`} aria-label={`Current time ${time}`}>
      {time}
    </span>
  )
}
