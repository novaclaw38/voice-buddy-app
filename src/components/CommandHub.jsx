import { useState } from 'react'
import styles from './CommandHub.module.css'

const WINGS = [
  { id: 'robotics', name: 'ROBOTICS WING', tagline: 'Build the Brains', icon: '🤖', status: 'ACTIVE', level: 'SPECIALIST_K_9', missions: '03/24', next: 'Logic Gate Array' },
  { id: 'beast-intel', name: 'BEAST INTELLIGENCE', tagline: 'Decode the Wild', icon: '🦁', status: 'ACTIVE', level: 'SPECIALIST_K_9', missions: '02/24', next: 'Ghost Protocol' },
  { id: 'field-rations', name: 'FIELD RATIONS OPS', tagline: 'Fuel the Mission', icon: '🍳', status: 'ACTIVE', level: 'SPECIALIST_K_9', missions: '01/24', next: 'Energy Matrix' },
  { id: 'env-recon', name: 'ENVIRONMENTAL RECON', tagline: 'Map the Sector', icon: '🧭', status: 'ACTIVE', level: 'SPECIALIST_K_9', missions: '04/24', next: 'Perimeter Sweep' },
  { id: 'botany-ops', name: 'BOTANY OPS', tagline: 'Grow the Future', icon: '🌱', status: 'ACTIVE', level: 'SPECIALIST_K_9', missions: '00/24', next: 'Genetic Blueprint' },
]

export default function CommandHub({ onSelect }) {
  const [selected, setSelected] = useState(null)
  const [scanlineActive, setScanlineActive] = useState(false)

  const handleSelect = (wing) => {
    setSelected(wing.id)
    setScanlineActive(true)
    setTimeout(() => {
      setScanlineActive(false)
      onSelect?.(wing)
    }, 600)
  }

  const activeWing = WINGS.find(w => w.id === selected)

  return (
    <div className={styles.hub}>
      <div className={styles.grid}>
        {WINGS.map((wing) => (
          <button
            key={wing.id}
            className={`${styles.card} ${selected === wing.id ? styles.cardSelected : ''}`}
            onClick={() => handleSelect(wing)}
          >
            <span className={styles.cardIcon}>{wing.icon}</span>
            <span className={styles.cardTitle}>{wing.name}</span>
            <span className={styles.cardTagline}>{wing.tagline}</span>
            {selected === wing.id && scanlineActive && <div className={styles.scanline} />}
          </button>
        ))}
      </div>

      {activeWing && (
        <div className={styles.sidePanel}>
          <div className={styles.panelHeader}>INTELLIGENCE FEED</div>
          <div className={styles.panelRow}>
            <span className={styles.panelLabel}>SECTOR_STATUS</span>
            <span className={styles.panelValue}>{activeWing.status}</span>
          </div>
          <div className={styles.panelRow}>
            <span className={styles.panelLabel}>LEVEL_AUTH</span>
            <span className={styles.panelValue}>{activeWing.level}</span>
          </div>
          <div className={styles.panelRow}>
            <span className={styles.panelLabel}>MISSIONS_COMPLETED</span>
            <span className={styles.panelValue}>{activeWing.missions}</span>
          </div>
          <div className={styles.panelRow}>
            <span className={styles.panelLabel}>NEXT_OBJECTIVE</span>
            <span className={styles.panelValue}>{activeWing.next}</span>
          </div>
        </div>
      )}
    </div>
  )
}
