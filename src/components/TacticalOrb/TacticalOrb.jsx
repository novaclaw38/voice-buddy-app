import React, { useState, useCallback } from 'react';
import styles from './TacticalOrb.module.css';
import { sounds } from '../audio/web-audio-synthesizer';
import { speechEngine } from '../audio/speech-engine';

const OrbState = {
  IDLE: 'idle',
  LISTENING: 'listening',
  PROCESSING: 'processing',
  SPEAKING: 'speaking',
};

export const TacticalOrb = () => {
  const [orbState, setOrbState] = useState(OrbState.IDLE);

  const cycleState = useCallback(() => {
    const states = [
      OrbState.IDLE,
      OrbState.LISTENING,
      OrbState.PROCESSING,
      OrbState.SPEAKING,
    ];
    const next = states[(states.indexOf(orbState) + 1) % states.length];
    
    if (next === OrbState.LISTENING) {
      sounds.playCommsStatic('start');
    } else if (next === OrbState.PROCESSING) {
      sounds.playPneumaticHiss();
    } else if (next === OrbState.SPEAKING) {
      sounds.playAlertBeep();
      speechEngine.speak(
        "Tactical Neural Core active. Standing by for field telemetry."
      );
    } else if (next === OrbState.IDLE) {
      sounds.playRelayClick();
    }
    
    setOrbState(next);
  }, [orbState]);

  const getStateLabel = () => {
    switch (orbState) {
      case OrbState.IDLE: return 'SYSTEM_IDLE';
      case OrbState.LISTENING: return 'AWAITING_INPUT';
      case OrbState.PROCESSING: return 'PROCESSING_DATA';
      case OrbState.SPEAKING: return 'TRANSMITTING';
      default: return 'SYSTEM_IDLE';
    }
  };

  return (
    <div className={styles.container}>
      <div onClick={cycleState} className={styles.orbWrapper}>
        <div 
          className={`${styles.ringOuter1} ${orbState === OrbState.PROCESSING ? styles.ringAlert : ''}`}
        />
        <div 
          className={`${styles.ringOuter2} ${orbState === OrbState.PROCESSING ? styles.ringAlertReverse : ''}`}
        />
        <div className={`${styles.core} ${styles[orbState]}`}>
          {orbState === OrbState.SPEAKING ? (
            <div className={styles.equalizer}>
              <span className={styles.bar1} />
              <span className={styles.bar2} />
              <span className={styles.bar3} />
            </div>
          ) : (
            <div 
              className={`${styles.dot} ${orbState === OrbState.PROCESSING ? styles.dotAlert : ''}`} 
            />
          )}
        </div>
        <div className={styles.telemetryTag}>{getStateLabel()}</div>
        <div 
          className={styles.glowPulse}
          style={{
            backgroundColor: orbState === OrbState.PROCESSING 
              ? 'rgba(255, 138, 0, 0.3)' 
              : 'rgba(0, 245, 255, 0.2)',
          }}
        />
      </div>
      <div className={styles.hintText}>CLICK ORB TO CYCLE TRANSMISSION STATE</div>
    </div>
  );
};

export default TacticalOrb;
