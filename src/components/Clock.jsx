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

// A little wind-up desk alarm clock — twin bells, a swinging clapper between
// them, and stubby feet — instead of a plain digital readout. Time is still
// announced via aria-label for screen readers.
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
      <svg className={styles.face} viewBox="0 0 40 46" aria-hidden="true">
        {/* Bells — the rim (drawn after) covers each bell's lower half, so
            only the dome peeks out above the face. */}
        <circle className={styles.bell} cx="9"  cy="14" r="7" />
        <circle className={styles.bell} cx="31" cy="14" r="7" />

        <circle className={styles.rim} cx="20" cy="27" r="15" />

        {[0, 90, 180, 270].map((deg) => (
          <circle
            key={deg}
            className={deg === 0 ? (partOfDay === 'night' ? styles.tickMoon : styles.tickSun) : styles.tick}
            cx="20" cy="14.5" r={deg === 0 ? 1.6 : 1.1}
            transform={`rotate(${deg} 20 27)`}
          />
        ))}
        <line
          className={styles.hourHand}
          x1="20" y1="27" x2="20" y2="19.5"
          style={{ animationDelay: `${delays.hour}s` }}
        />
        <line
          className={styles.minuteHand}
          x1="20" y1="27" x2="20" y2="16"
          style={{ animationDelay: `${delays.minute}s` }}
        />
        <line
          className={styles.secondHand}
          x1="20" y1="27" x2="20" y2="15"
          style={{ animationDelay: `${delays.second}s` }}
        />
        <circle className={styles.pin} cx="20" cy="27" r="1.7" />

        {/* Clapper — sits in front of the face, swinging between the bells. */}
        <g className={styles.clapper}>
          <line className={styles.clapperArm} x1="20" y1="8" x2="20" y2="14" />
          <circle className={styles.clapperBall} cx="20" cy="14" r="1.6" />
        </g>

        <rect className={styles.foot} x="9"  y="41" width="5" height="3" rx="1.4" />
        <rect className={styles.foot} x="26" y="41" width="5" height="3" rx="1.4" />
      </svg>
    </span>
  )
}
