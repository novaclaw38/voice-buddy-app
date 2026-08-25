import { useState } from 'react'
import styles from './ToolVaultRadial.module.css'

const WINGS = [
  { id: 'robotics', name: 'Robotics Wing', unlockedTool: 'Signal Analyzer', toolDesc: 'Real-time frequency audio wave visualizer' },
  { id: 'beast-intel', name: 'Beast Intelligence', unlockedTool: 'Anatomy Scanner', toolDesc: 'X-ray spectral overlay for biological assets' },
  { id: 'field-rations', name: 'Field Rations Ops', unlockedTool: 'Macro-Overlay', toolDesc: 'Real-time nutritional field classification' },
  { id: 'env-recon', name: 'Environmental Recon', unlockedTool: 'HUD Compass', toolDesc: '360-degree positional telemetry tracking' },
  { id: 'botany-ops', name: 'Botany Ops', unlockedTool: 'Time-Traveler', toolDesc: 'Predictive 14-day growth simulation lens' },
]

export default function ToolVaultRadial() {
  const [isOpen, setIsOpen] = useState(false)
  const [selectedTool, setSelectedTool] = useState(null)

  const toggleMenu = () => {
    setIsOpen(!isOpen)
  }

  return (
    <div className={styles.wrap}>
      {selectedTool && (
        <div className={styles.toolDetail}>
          <div className={styles.toolDetailHeader}>
            <span>[ TOOL_SPEC: {selectedTool.unlockedTool.toUpperCase()} ]</span>
            <button onClick={() => setSelectedTool(null)} className={styles.closeBtn}>×</button>
          </div>
          <div className={styles.toolName}>{selectedTool.name}</div>
          <div className={styles.toolDesc}>{selectedTool.toolDesc}</div>
          <div className={styles.toolStatus}>ASCENSION STATUS: UNLOCKED AT LEVEL 01 MISSION COMPLETION</div>
        </div>
      )}

      <div className={styles.radialContainer}>
        {isOpen && (
          <div className={styles.radialMenu}>
            {WINGS.map((wing, index) => {
              const total = WINGS.length
              const angle = (index / total) * (2 * Math.PI) - Math.PI / 2
              const radius = 90
              const x = Math.cos(angle) * radius
              const y = Math.sin(angle) * radius

              return (
                <button
                  key={wing.id}
                  onClick={() => setSelectedTool(wing)}
                  style={{ transform: `translate(${x}px, ${y}px)` }}
                  className={styles.radialBtn}
                  title={wing.unlockedTool}
                >
                  T0{index + 1}
                </button>
              )
            })}
          </div>
        )}

        <button onClick={toggleMenu} className={styles.centerBtn}>
          <span>UTILITY</span>
          <span className={styles.centerSub}>{isOpen ? 'CLOSE' : 'VAULT'}</span>
        </button>
      </div>
    </div>
  )
}
