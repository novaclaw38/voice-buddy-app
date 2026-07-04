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

// Fireflies drift through a few points instead of twinkling in a fixed
// spot, so evening reads visibly different from night's still starfield.
const FIREFLIES = [
  { top: '58%', left: '12%', delay: '0s',    duration: '5.2s' },
  { top: '68%', left: '78%', delay: '1.1s',  duration: '6.4s' },
  { top: '50%', left: '40%', delay: '2.3s',  duration: '4.8s' },
  { top: '74%', left: '55%', delay: '0.6s',  duration: '5.8s' },
  { top: '62%', left: '88%', delay: '1.8s',  duration: '6.8s' },
  { top: '44%', left: '22%', delay: '2.9s',  duration: '5.4s' },
]

// Ambient magic-dust layer, always on top at low opacity across every realm.
const SPARKLES = [
  { top: '60%', left: '8%',  size: 3, delay: '0s',   duration: '7s' },
  { top: '40%', left: '85%', size: 2, delay: '1.4s', duration: '8s' },
  { top: '75%', left: '30%', size: 2, delay: '2.6s', duration: '6.4s' },
  { top: '20%', left: '20%', size: 3, delay: '0.8s', duration: '7.6s' },
  { top: '85%', left: '65%', size: 2, delay: '3.4s', duration: '8.4s' },
  { top: '55%', left: '50%', size: 2, delay: '1.9s', duration: '6.8s' },
  { top: '30%', left: '60%', size: 3, delay: '4.1s', duration: '7.2s' },
  { top: '90%', left: '90%', size: 2, delay: '2.2s', duration: '8.8s' },
]

export default function WorldBackdrop() {
  const { partOfDay } = useTimeOfDay()

  return (
    <div className={`${styles.world} ${styles[partOfDay]}`} aria-hidden="true">
      {partOfDay === 'morning' && (
        <>
          <div className={`${styles.sun} ${styles.sunLow}`}>
            <div className={styles.sunGlow} />
          </div>
          <div className={styles.birds}>
            <span className={`${styles.bird} ${styles.bird1}`}>
              <span className={styles.wing} />
              <span className={styles.wing} />
            </span>
            <span className={`${styles.bird} ${styles.bird2}`}>
              <span className={styles.wing} />
              <span className={styles.wing} />
            </span>
          </div>
        </>
      )}

      {partOfDay === 'afternoon' && (
        <>
          <div className={styles.sun}>
            <div className={styles.sunGlow} />
          </div>
          <div className={`${styles.cloud} ${styles.cloud1}`} />
          <div className={`${styles.cloud} ${styles.cloud2}`} />
          <div className={`${styles.cloud} ${styles.cloud3}`} />
        </>
      )}

      {partOfDay === 'evening' && (
        <>
          <div className={`${styles.sun} ${styles.sunLow} ${styles.sunEvening}`}>
            <div className={styles.sunGlow} />
          </div>
          <div className={styles.fireflies}>
            {FIREFLIES.map((f, i) => (
              <span
                key={i}
                className={styles.firefly}
                style={{ top: f.top, left: f.left, animationDelay: f.delay, animationDuration: f.duration }}
              />
            ))}
          </div>
        </>
      )}

      {partOfDay === 'night' && (
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
          <div className={styles.shootingStar} />
        </>
      )}

      <div className={styles.sparkles}>
        {SPARKLES.map((s, i) => (
          <span
            key={i}
            className={styles.sparkle}
            style={{
              top: s.top,
              left: s.left,
              width: s.size,
              height: s.size,
              animationDelay: s.delay,
              animationDuration: s.duration,
            }}
          />
        ))}
      </div>
    </div>
  )
}
