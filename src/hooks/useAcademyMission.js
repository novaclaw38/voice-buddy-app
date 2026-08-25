/**
 * useAcademyMission — Manages the Academy mission lifecycle:
 *   Briefing → Field-Op → Debrief (AAR)
 *
 * Returns the current phase, the Orb status that corresponds to it,
 * and action handlers to advance through the mission loop.
 *
 * The Orb status mapping:
 *   briefing    → 'idle'      (amber pulse, system ready)
 *   field-op    → 'processing' (amber core, active mission)
 *   debrief     → 'speaking'   (teal core, AAR generation)
 *   completed   → 'completed'  (green core, mission done)
 *   idle        → 'idle'      (teal core, standing by)
 *
 * @param {string} initialPhase - 'idle' | 'briefing' | 'field-op' | 'debrief' | 'completed'
 * @returns {{
 *   phase: string,
 *   orbStatus: string,
 *   rank: number,
 *   startBriefing: () => void,
 *   beginFieldOp: () => void,
 *   enterDebrief: () => void,
 *   completeMission: () => void,
 *   reset: () => void,
 *   setRank: (n: number) => void,
 * }}
 */
import { useState, useCallback } from 'react'

const PHASE_ORB_STATUS = {
  idle: 'idle',
  briefing: 'idle',
  'field-op': 'processing',
  debrief: 'speaking',
  completed: 'completed',
}

export function useAcademyMission(initialPhase = 'idle') {
  const [phase, setPhase] = useState(initialPhase)
  const [rank, setRank] = useState(1)

  const startBriefing = useCallback(() => {
    setPhase('briefing')
  }, [])

  const beginFieldOp = useCallback(() => {
    setPhase('field-op')
  }, [])

  const enterDebrief = useCallback(() => {
    setPhase('debrief')
  }, [])

  const completeMission = useCallback(() => {
    setPhase('completed')
  }, [])

  const reset = useCallback(() => {
    setPhase('idle')
  }, [])

  const orbStatus = PHASE_ORB_STATUS[phase] || PHASE_ORB_STATUS.idle

  return {
    phase,
    orbStatus,
    rank,
    startBriefing,
    beginFieldOp,
    enterDebrief,
    completeMission,
    reset,
    setRank,
  }
}

export default useAcademyMission
