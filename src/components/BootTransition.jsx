import { useState, useEffect, useRef } from 'react'
import TacticalOrb from './TacticalOrb.jsx'
import { speechEngine } from './speech-engine.js'
import { sfx } from './sound-fx.js'
import styles from './BootTransition.module.css'

/**
 * BootTransition — First Contact Enlistment Sequence.
 *
 * Plays once per device when a child opens the app for the first time.
 * Sequence (per Doc 1 "First Command Script"):
 *
 *   1. Terminal typewriter: SCANNING BIO-SIGS... → IDENTITY VERIFIED... →
 *      CLEARANCE: LEVEL 1 RECRUIT
 *   2. The Orb pulses with tactical amber glow
 *   3. Buddy speaks: "Recruit, welcome to the Academy. We don't just chat
 *      here; we execute missions. I am your Field Commander. Are you ready
 *      to begin Operation Iron Blueprint?"
 *   4. Fade to child UI
 *
 * Universal: fires for all ages on first visit. The gentle candy-themed
 * boot remains for <9 age band per BootTransition design — no, correction:
 * per the Tactical Specialist reframe (Doc 2 §1), the enlistment sequence
 * is universal. Every child is recruited.
 *
 * Skippable: on repeat views, completes instantly.
 */
const ENLISTMENT_LINES = [
  'SCANNING BIO-SIGS...',
  'IDENTITY VERIFIED...',
  'CLEARANCE: LEVEL 1 RECRUIT',
]

const INVITATION =
  "Recruit, welcome to the Academy. We don't just chat here; we execute missions. " +
  'I am your Field Commander. Are you ready to begin Operation Iron Blueprint?'

export default function BootTransition({ childName, onComplete }) {
  const [visible, setVisible] = useState(true)
  const [phase, setPhase] = useState('scanning') // 'scanning' | 'enlist' | 'ready'
  const [lineIndex, setLineIndex] = useState(0)
  const spokenRef = useRef(false)

  useEffect(() => {
    // Only show once per device
    const seen = localStorage.getItem('buddy_enlistment_seen')
    if (seen || !onComplete) {
      onComplete?.()
      return undefined
    }

    const timers = []

    // Phase 1: typewriter through the scanning lines
    for (let i = 0; i < ENLISTMENT_LINES.length; i++) {
      timers.push(
        setTimeout(() => {
          setLineIndex(i)
        }, i * 900)
      )
    }

    // Phase 2: enlistment — Orb pulses amber, Buddy speaks
    timers.push(
      setTimeout(() => {
        setPhase('enlist')
      }, ENLISTMENT_LINES.length * 900)
    )

    // Phase 3: speak the invitation (after a brief pause for the amber glow)
    timers.push(
      setTimeout(() => {
        if (!spokenRef.current) {
          spokenRef.current = true
          sfx.nav() // soft sweep — scanning complete
          speechEngine.speak(INVITATION, () => {
            // After speech ends, move to ready
            setTimeout(() => {
              setPhase('ready')
            }, 500)
          })
        }
      }, ENLISTMENT_LINES.length * 900 + 500)
    )

    // Phase 4: complete — fade out
    const totalDuration = ENLISTMENT_LINES.length * 900 + 500 + 8000 // 8s for speech
    timers.push(
      setTimeout(() => {
        localStorage.setItem('buddy_enlistment_seen', 'true')
        setVisible(false)
        onComplete?.()
      }, totalDuration)
    )

    return () => timers.forEach(clearTimeout)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [onComplete])

  if (!visible) return null

  const displayName = childName || 'RECRUIT'

  return (
    <div
      className={styles.bootOverlay}
      role="status"
      aria-label="Academy enlistment sequence"
    >
      <div className={styles.bootScanline} />

      {/* Ghost data grid */}
      <div className={styles.dataGrid} />

      <div className={styles.bootContent}>
        {/* Phase: scanning — terminal lines */}
        {phase === 'scanning' && (
          <div className={styles.terminalBlock}>
            <div className={styles.terminalLine}>
              ⟡ {ENLISTMENT_LINES[lineIndex]}
            </div>
            {lineIndex === ENLISTMENT_LINES.length - 1 && (
              <div className={styles.terminalLine}>
                RANK_INIT: RECRUIT_CLASS // PULSE_COLOR: AMBER
              </div>
            )}
          </div>
        )}

        {/* Phase: enlistment — Orb pulses amber */}
        {phase === 'enlist' && (
          <div className={styles.enlistmentBlock}>
            <div className={styles.bootStatus}>IDENTITY CONFIRMED</div>
            <div className={styles.orbContainer}>
              <TacticalOrb
                status="listening"
                totalXp={0}
                interactive={false}
                className={styles.enlistOrb}
              />
            </div>
            <div className={styles.bootStatus}>
              WELCOME TO THE ACADEMY, <span className={styles.name}>{displayName.toUpperCase()}</span>.
            </div>
            <div className={styles.bootPrompt}>…</div>
          </div>
        )}

        {/* Phase: ready — fade to app */}
        {phase === 'ready' && (
          <div className={styles.bootContent}>
            <div className={styles.bootStatus}>SECTOR_AUTH_GRANTED</div>
            <div className={styles.bootIdentity}>
              MISSION START: Operation Iron Blueprint
            </div>
            <div className={styles.bootReady}>Loading Command Center…</div>
          </div>
        )}
      </div>
    </div>
  )
}
