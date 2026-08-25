import { useState, useEffect } from 'react'
import styles from './TerminalReveal.module.css'

export default function TerminalReveal({ name }) {
  const [visible, setVisible] = useState(false)

  // Trigger the reveal animation on mount — without this, the terminal
  // stays in its pre-animation state (boot sequence hidden, no typewriter).
  useEffect(() => {
    setVisible(true)
  }, [])

  return (
    <div className={`${styles.terminalReveal} ${visible ? styles.visible : ''}`}>
      <div className={styles.bootSequence}>
        <span>[BOOT_SEQUENCE]</span>
        <span>[AUTH_SUCCESS]</span>
      </div>
      <div className={`${styles.typewriter} ${visible ? styles.animate : ''}`}>
        <span>CONNECTED // SPECIALIST {name?.toUpperCase() || 'COMMANDER'}. </span>
        <span>IDENTITY CONFIRMED. WELCOME TO THE INNER CIRCLE. </span>
        <span>SHIFTING TO ACTIVE OPS. CHOOSE YOUR OBJECTIVE. </span>
      </div>
      <div className={styles.dataGrid}>
        <span>LOGIC_ARRAY: ONLINE</span>
        <span>SENSORS: CALIBRATED</span>
        <span>PULSE_SYNC: STABLE</span>
        <span>ACADEMY_LEVEL: 01</span>
      </div>
    </div>
  )
}
