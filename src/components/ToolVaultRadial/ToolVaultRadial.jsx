import React, { useState, useCallback } from 'react';
import styles from './ToolVaultRadial.module.css';
import { sounds } from '../audio/web-audio-synthesizer';

// Academy wings data - matches the tactical curriculum
const WINGS = [
  {
    id: 'robotics',
    name: 'Robotics Wing',
    tagline: 'BUILD THE BRAINS',
    unlockedTool: 'Signal Analyzer',
    toolDesc: 'Real-time frequency audio wave visualizer.',
  },
  {
    id: 'beast-intel',
    name: 'Beast Intelligence',
    tagline: 'DECODE THE WILD',
    unlockedTool: 'Anatomy Scanner',
    toolDesc: 'X-ray spectral overlay for biological assets.',
  },
  {
    id: 'field-rations',
    name: 'Field Rations Ops',
    tagline: 'FUEL THE MISSION',
    unlockedTool: 'Macro-Overlay',
    toolDesc: 'Real-time nutritional field classification.',
  },
  {
    id: 'environmental-recon',
    name: 'Environmental Recon',
    tagline: 'MAP THE SECTOR',
    unlockedTool: '3D HUD Compass',
    toolDesc: '360-degree positional telemetry tracking.',
  },
  {
    id: 'botany-ops',
    name: 'Botany Ops',
    tagline: 'GROW THE FUTURE',
    unlockedTool: 'Time-Traveler',
    toolDesc: 'Predictive 14-day growth simulation lens.',
  },
];

export const ToolVaultRadial = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedTool, setSelectedTool] = useState(null);

  const toggleMenu = useCallback(() => {
    sounds.playPneumaticHiss();
    setIsOpen(!isOpen);
  }, [isOpen]);

  const handleSelectTool = useCallback((wing) => {
    sounds.playRelayClick();
    setSelectedTool(wing);
  }, []);

  const handleCloseTool = useCallback(() => {
    sounds.playCommsStatic('end');
    setSelectedTool(null);
  }, []);

  return (
    <div className={styles.fixedContainer}>
      {selectedTool && (
        <div className={styles.modal}>
          <div className={styles.modalHeader}>
            <span>[ TOOL_SPEC: {selectedTool.unlockedTool.toUpperCase()} ]</span>
            <button 
              onClick={handleCloseTool} 
              className={styles.closeBtn}
              aria-label="Close tool spec"
            >
              ✕
            </button>
          </div>
          <div className={styles.toolName}>{selectedTool.name}</div>
          <div className={styles.toolTagline}>{selectedTool.tagline}</div>
          <div className={styles.toolDesc}>{selectedTool.toolDesc}</div>
          <div className={styles.statusBox}>
            ASCENSION STATUS: UNLOCKED AT LEVEL 01 MISSION COMPLETION
          </div>
        </div>
      )}

      <div className={styles.radialWrapper}>
        {isOpen && (
          <div className={styles.menuRing}>
            {WINGS.map((wing, index) => {
              const total = WINGS.length;
              const angle = (index / total) * (2 * Math.PI) - Math.PI / 2;
              const radius = 90;
              const x = Math.cos(angle) * radius;
              const y = Math.sin(angle) * radius;

              return (
                <button
                  key={wing.id}
                  onClick={() => handleSelectTool(wing)}
                  style={{ 
                    transform: `translate(${x}px, ${y}px)`,
                    transitionDelay: `${index * 0.05}s`,
                  }}
                  className={styles.radialItem}
                  aria-label={wing.name}
                >
                  T0{index + 1}
                </button>
              );
            })}
          </div>
        )}

        <button
          onClick={toggleMenu}
          className={`${styles.centralButton} ${isOpen ? styles.open : ''}`}
          aria-label={isOpen ? 'Close utility vault' : 'Open utility vault'}
        >
          <span>UTILITY</span>
          <span className={styles.subText}>{isOpen ? 'CLOSE' : 'VAULT'}</span>
        </button>
      </div>
    </div>
  );
};

export default ToolVaultRadial;
