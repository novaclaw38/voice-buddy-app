import { useState, useEffect } from 'react'
import styles from './BootTransition.module.css'

/**
 * BootTransition — "System Reboot" tactical transition overlay.
 *
 * Plays once per device on a child's first login (tracked via localStorage).
 * Sequence (per Doc 1 "First Command Script"):
 *   1. Scanline wipe (1.5s)
 *   2. Terminal title typewriter (SYSTEM_REBOOT)
 *   3. Identity confirmation (COMMANDER [NAME] — RANK: RECRUIT)
 *   4. Fade to child UI
 *
 * Only activates for 9+ year olds (BAND_BY_AGE 'old'). Younger children
 * get the gentle candy-themed boot. The transition is skippable on repeat
 * views — only the first visit per device triggers it.
 */
export default function BootTransition({ childName, childAge, onComplete }) {
  const [visible, setVisible] = useState(true)
  const [phase, setPhase] = useState('boot')  // 'boot' | 'identity' | 'ready'

  // Only show once per device for tactical-age kids (9+)
  const isTactical = childAge >= 9
  useEffect(() => {
    if (!isTactical) {
      if (onComplete) onComplete()
      return undefined
    }
    const seen = localStorage.getItem('buddy_boot_seen')
    if (seen) {
      if (onComplete) onComplete()
      return undefined
    }
    const t1 = setTimeout(() => setPhase('identity'), 2000)
    const t2 = setTimeout(() => setPhase('ready'), 3500)
    const t3 = setTimeout(() => {
      localStorage.setItem('buddy_boot_seen', 'true')
      setVisible(false)
      if (onComplete) onComplete()
    }, 4500)
    return () => {
      clearTimeout(t1)
      clearTimeout(t2)
      clearTimeout(t3)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isTactical])

  if (!isTactical) return null
  if (!visible) return null

  const displayName = childName || 'RECRUIT'

  return (
    <div
      className={styles.bootOverlay}
      role="status"
      aria-label="System booting"
    >
      <div className={styles.bootScanline} />
      <div className={styles.bootContent}>
        {/* Phase: boot (System Reboot) */}
        {phase === 'boot' && (
          <>
            <div className={styles.bootStatus}>DEPLOYMENT_MODE: ACTIVE</div>
            <div className={styles.bootGlitchTitle}>SYSTEM_REBOOT</div>
            <div className={styles.bootReady}>Initializing tactical interface…</div>
          </>
        )}

        {/* Phase: identity (confirmation) */}
        {phase === 'identity' && (
          <>
            <div className={styles.bootStatus}>IDENTITY CONFIRMED</div>
            <div className={styles.bootIdentity}>
              <div>CONNECTED // <span className={styles.rank}>SPECIALIST</span></div>
              <div>NAME: <span className={styles.name}>{displayName.toUpperCase()}</span></div>
              <div>STATUS: <span style={{ color: 'var(--tactical-teal, #00F5FF)' }}>RANK_UP_PATHWAY: UNLOCKED</span></div>
            </div>
          </>
        )}

        {/* Phase: ready (fade to UI) */}
        {phase === 'ready' && (
          <>
            <div className={styles.bootStatus}>SECTOR_AUTH_GRANTED</div>
            <div className={styles.bootIdentity}>
              Welcome back, <span className={styles.name}>{displayName}</span>.
            </div>
            <div className={styles.bootReady}>Loading Command Center…</div>
          </>
        )}
      </div>
    </div>
  )
}
