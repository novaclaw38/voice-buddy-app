import React, { useState, useCallback } from 'react';
import styles from './RankProgressBar.module.css';
import { sounds } from '../audio/web-audio-synthesizer';
import { speechEngine } from '../audio/speech-engine';

// Rank progression logic - 6-month evolution
const RANKS = [
  { id: 1, name: 'RECRUIT', title: 'Basic Training', color: '#00f5ff', glow: 'rgba(0, 245, 255, 0.4)' },
  { id: 2, name: 'SPECIALIST', title: 'Tactical Skills', color: '#ff8a00', glow: 'rgba(255, 138, 0, 0.5)' },
  { id: 3, name: 'CORPORAL', title: 'Leadership', color: '#ff8a00', glow: 'rgba(255, 138, 0, 0.5)' },
  { id: 4, name: 'SERGEANT', title: 'Problem Solving', color: '#ff8a00', glow: 'rgba(255, 138, 0, 0.5)' },
  { id: 5, name: 'LIEUTENANT', title: 'Strategic Thinking', color: '#d4af37', glow: 'rgba(212, 175, 55, 0.6)' },
  { id: 6, name: 'COMMANDER', title: 'Graduation', color: '#d4af37', glow: 'rgba(212, 175, 55, 0.6)' },
];

// Mission briefings per rank
const RANK_MISSIONS = {
  1: "Mission Complete: Basic training protocols verified. Safety and discipline mastered.",
  2: "Mission Complete: Tactical skills deployed. Signal analysis operational.",
  3: "Mission Complete: Leadership protocols engaged. Team coordination achieved.",
  4: "Mission Complete: Advanced problem solving confirmed. Critical thinking applied.",
  5: "Mission Complete: Strategic operations initiated. High-level planning active.",
  6: "Mission Complete: Commander evolution achieved. Strategic mastery verified.",
};

export const RankProgressBar = ({ 
  currentLevel = 1, 
  totalPoints = 0,
  onRankUp, 
  showVoiceSample = true 
}) => {
  const [level, setLevel] = useState(currentLevel);
  const [missionComplete, setMissionComplete] = useState(false);

  const handleRankUp = useCallback(() => {
    sounds.playPneumaticHiss();
    
    // Check if we can rank up
    if (level < RANKS.length) {
      const nextLevel = level + 1;
      setLevel(nextLevel);
      setMissionComplete(true);
      
      // Trigger voice sample
      if (showVoiceSample) {
        speechEngine.speak(RANK_MISSIONS[nextLevel] || RANK_MISSIONS[1]);
      }
      
      // Auto-clear mission complete after delay
      setTimeout(() => setMissionComplete(false), 3000);
      
      if (onRankUp) {
        onRankUp(nextLevel);
      }
    } else {
      // Reset to recruit
      sounds.playAlertBeep();
      setLevel(1);
      if (showVoiceSample) {
        speechEngine.speak("Evolution cycle complete. Returning to base training.");
      }
      if (onRankUp) {
        onRankUp(1);
      }
    }
  }, [level, showVoiceSample, onRankUp]);

  const currentRank = RANKS.find(r => r.id === level) || RANKS[0];
  const progressPercent = ((level - 1) / (RANKS.length - 1)) * 100;
  const isMaxRank = level === RANKS.length;

  return (
    <div 
      className={styles.rankCard}
      style={{
        '--rank-color': currentRank.color,
        '--rank-glow': currentRank.glow,
      }}
    >
      <div className={styles.rankHeader}>
        <span className={styles.rankTitle}>[ SPECIALIST ASCENSION PATH ]</span>
        <button
          onClick={handleRankUp}
          className={styles.rankUpButton}
          disabled={missionComplete}
        >
          {isMaxRank ? 'RESET PATH' : 'DEMO RANK UP'}
        </button>
      </div>

      {/* Progress bar */}
      <div className={styles.progressContainer}>
        <div 
          className={styles.progressFill}
          style={{ 
            width: `${progressPercent}%`,
            backgroundColor: currentRank.color,
            boxShadow: `0 0 20px ${currentRank.glow}`,
          }}
        />
      </div>

      {/* Rank tiers */}
      <div className={styles.tiersGrid}>
        {RANKS.map((rank, idx) => {
          const isActive = rank.id <= level;
          const isCurrent = rank.id === level;
          
          return (
            <div
              key={rank.id}
              className={`${styles.tier} ${isActive ? styles.tierActive : ''} ${isCurrent ? styles.tierCurrent : ''}`}
              style={{
                backgroundColor: isActive ? rank.glow : 'rgba(255, 255, 255, 0.03)',
                borderColor: isActive ? rank.color : 'rgba(255, 255, 255, 0.05)',
              }}
            >
              <div className={styles.tierLevel}>LEVEL 0{rank.id}</div>
              <div className={styles.tierName}>{rank.name}</div>
              <div className={styles.tierTitle}>{rank.title}</div>
              {isCurrent && (
                <div 
                  className={styles.currentIndicator}
                  style={{ color: rank.color }}
                >
                  ACTIVE
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Mission status */}
      {missionComplete && (
        <div className={styles.missionStatus}>
          <div 
            className={styles.missionBadge}
            style={{ 
              backgroundColor: currentRank.glow,
              borderColor: currentRank.color,
            }}
          >
            MISSION COMPLETE: {RANKS[level - 1]?.title || ''}
          </div>
        </div>
      )}

      {/* Voice sample trigger */}
      {showVoiceSample && (
        <div className={styles.voiceSection}>
          <div className={styles.voiceLabel}>COMMAND VOICE FILTER SAMPLE:</div>
          <button
            onClick={() => {
              sounds.playCommsStatic('start');
              speechEngine.speak(
                `Attention Specialist. Current rank: ${currentRank.name}. ${RANKS[level - 1] ? RANKS[level - 1].title : ''} protocols active.`
              );
            }}
            className={styles.voiceButton}
          >
            ▶ PLAY COMMS AUDIO
          </button>
        </div>
      )}

      {/* Points display */}
      {totalPoints > 0 && (
        <div className={styles.pointsDisplay}>
          <span>TOTAL POINTS: {totalPoints}</span>
        </div>
      )}
    </div>
  );
};

export default RankProgressBar;
