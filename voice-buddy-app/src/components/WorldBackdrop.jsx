import { useTimeOfDay } from '../hooks/useTimeOfDay.js'
import styles from './WorldBackdrop.module.css'

// Fixed star field — hand-placed rather than random-per-render so stars
// don't jump around on re-render.
const STARS = [
  { top: '8%',  left: '10%', size: 2,   delay: '0s'   },
  { top: '14%', left: '82%', size: 1.5, delay: '0.6s' },
  { top: '22%', left: '30%', size: 1.8, delay: '1.2s' },
  { top: '10%', left: '55%', size: 1.4, delay: '1.8s' },
  { top: '32%', left: '90%', size: 2,   delay: '0.3s' },
  { top: '28%', left: '4%',  size: 1.6, delay: '2.1s' },
  { top: '40%', left: '68%', size: 1.4, delay: '1.5s' },
  { top: '18%', left: '42%', size: 1.2, delay: '2.6s' },
  { top: '46%', left: '18%', size: 1.8, delay: '0.9s' },
  { top: '6%',  left: '30%', size: 1.3, delay: '3s'   },
  { top: '36%', left: '48%', size: 1.5, delay: '1.1s' },
  { top: '24%', left: '75%', size: 1.3, delay: '2.4s' },
]

export default function WorldBackdrop() {
  const { daytime } = useTimeOfDay()

  return (
    <div className={`${styles.world} ${daytime ? styles.day : styles.night}`} aria-hidden="true">
      {daytime ? (
        <>
          <div className={styles.sun}>
            <div className={styles.sunGlow} />
          </div>
          <div className={`${styles.cloud} ${styles.cloud1}`} />
          <div className={`${styles.cloud} ${styles.cloud2}`} />
          <div className={`${styles.cloud} ${styles.cloud3}`} />
        </>
      ) : (
        <>
          <div className={styles.moon}>
            <div className={styles.moonGlow} />
            <div className={styles.crater1} />
            <div className={styles.crater2} />
          </div>
          <div className={styles.stars}>
            {STARS.map((s, i) => (
              <span
                key={i}
                className={styles.star}
                style={{
                  top: s.top,
                  left: s.left,
                  width: s.size,
                  height: s.size,
                  animationDelay: s.delay,
                }}
              />
            ))}
          </div>
        </>
      )}
    </div>
  )
}
