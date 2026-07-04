import { useState, useEffect, useMemo } from 'react'
import styles from './Clock.module.css'

// The hands are driven by CSS animations (see Clock.module.css) so they sweep
// continuously and smoothly, instead of re-rendering on every tick. We just
// compute a negative animation-delay once on mount so each hand starts already
// at the correct position for the current wall-clock time.
function useHandDelays() {
  return useMemo(() => {
    const d = new Date()
    const s = d.getSeconds()
    const m = d.getMinutes()
    const h = d.getHours() % 12
    return {
      second: -s,
      minute: -(m * 60 + s),
      hour: -(h * 3600 + m * 60 + s),
    }
  }, [])
}

export default function Clock({ className, partOfDay }) {
  const [now, setNow] = useState(() => new Date())
  const delays = useHandDelays()

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 30000)
    return () => clearInterval(id)
  }, [])

  const time = now.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })

  return (
    <span className={`${styles.clock} ${className || ''}`} aria-label={`Current time ${time}`}>
      <svg className={styles.face} viewBox="0 0 40 40" aria-hidden="true">
        <circle className={styles.rim} cx="20" cy="20" r="18" />
        {[0, 90, 180, 270].map((deg) => (
          <circle
            key={deg}
            className={deg === 0 ? (partOfDay === 'night' ? styles.tickMoon : styles.tickSun) : styles.tick}
            cx="20" cy="5" r={deg === 0 ? 1.6 : 1.1}
            transform={`rotate(${deg} 20 20)`}
          />
        ))}
        <line
          className={styles.hourHand}
          x1="20" y1="20" x2="20" y2="11"
          style={{ animationDelay: `${delays.hour}s` }}
        />
        <line
          className={styles.minuteHand}
          x1="20" y1="20" x2="20" y2="7"
          style={{ animationDelay: `${delays.minute}s` }}
        />
        <line
          className={styles.secondHand}
          x1="20" y1="20" x2="20" y2="5.5"
          style={{ animationDelay: `${delays.second}s` }}
        />
        <circle className={styles.pin} cx="20" cy="20" r="1.7" />
      </svg>
      <span className={styles.digital}>{time}</span>
    </span>
  )
}
