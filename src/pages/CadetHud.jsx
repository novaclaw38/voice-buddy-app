import { useState, useEffect } from 'react'
import { useSearchParams, Link } from 'react-router-dom'
import { supabase } from '../lib/supabase.js'
import BuddyOrb from '../components/BuddyOrb.jsx'
import { RANK_NAMES, RANK_TIERS } from '../components/BuddyOrb.jsx'
import TacticalOrb from '../components/TacticalOrb/TacticalOrb.jsx'
import { sounds } from '../components/audio/web-audio-synthesizer.js'
import styles from './CadetHud.module.css'

const RANK_ORDER = ['Recruit', 'Specialist', 'Corporal', 'Sergeant', 'Lieutenant', 'Commander']

export default function CadetHud() {
  const [searchParams] = useSearchParams()
  const cadetId = searchParams.get('cadet')
  const [cadet, setCadet] = useState(null)
  const [progress, setProgress] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (cadetId) {
      loadCadet()
      loadProgress()
    }
  }, [cadetId])

  const loadCadet = async () => {
    const { data, error } = await supabase
      .from('cadets')
      .select('*')
      .eq('id', cadetId)
      .single()

    if (error) {
      console.error('Failed to load cadet:', error)
    } else {
      setCadet(data)
    }
    setLoading(false)
  }

  const loadProgress = async () => {
    const { data, error } = await supabase
      .from('curriculum_progress')
      .select('*')
      .eq('cadet_id', cadetId)
      .order('created_at', { ascending: true })

    if (error) {
      console.error('Failed to load progress:', error)
    } else {
      setProgress(data || [])
    }
  }

  if (loading) {
    return <div className={styles.loading}>Loading...</div>
  }

  if (!cadet) {
    return <div className={styles.error}>Cadet not found</div>
  }

  return (
    <div className={styles.hud}>
      <header className={styles.header}>
        <div className={styles.headerLeft}>
          <h1>Cadet {cadet.name}</h1>

          {/* Visual modules unlocked per rank tier */}
          <div className={styles.rankModules}>
            <span className={styles.moduleBadge}>
              {RANK_TIERS[RANK_ORDER[cadet.current_rank - 1]]?.tier >= 2
                ? '◆ HALO RING UNLOCKED'
                : 'HALO RING LOCKED'}
            </span>
            <span className={styles.moduleBadge}>
              {RANK_TIERS[RANK_ORDER[cadet.current_rank - 1]]?.tier >= 3
                ? '◆ HUD RINGS UNLOCKED'
                : 'HUD RINGS LOCKED'}
            </span>
            <span className={styles.moduleBadge}>
              {RANK_TIERS[RANK_ORDER[cadet.current_rank - 1]]?.tier >= 4
                ? '◆ SCAN RING UNLOCKED'
                : 'SCAN RING LOCKED'}
            </span>
            <span className={styles.moduleBadge}>
              {RANK_TIERS[RANK_ORDER[cadet.current_rank - 1]]?.tier >= 5
                ? '◆ CORE PULSE UNLOCKED'
                : 'CORE PULSE LOCKED'}
            </span>
          </div>
        </div>

        {/* Orb as the command core — rank-driven visual modules */}
        <div className={styles.orbPod}>
          {/* Tactical Orb for comms interaction */}
          <div className={styles.tacticalOrbWrapper}>
            <TacticalOrb />
          </div>

          {/* BuddyOrb 3D visualization */}
          <BuddyOrb
            status={
              cadet.last_mission_status === 'active' ? 'processing' :
              cadet.last_mission_status === 'completed' ? 'completed' :
              'idle'
            }
            rank={cadet.current_rank}
            size={120}
            interactive={false}
          />
          <span className={styles.rankLabel}>
            {RANK_ORDER[cadet.current_rank - 1]}
          </span>
        </div>
      </header>

      <div className={styles.stats}>
        <div className={styles.statCard}>
          <span className={styles.statValue}>{cadet.total_points}</span>
          <span className={styles.statLabel}>Total Points</span>
        </div>
        <div className={styles.statCard}>
          <span className={styles.statValue}>{progress.filter(p => p.completed).length}</span>
          <span className={styles.statLabel}>Missions Completed</span>
        </div>
        <div className={styles.statCard}>
          <span className={styles.statValue}>{progress.length}</span>
          <span className={styles.statLabel}>Total Missions</span>
        </div>
      </div>

      <div className={styles.objectives}>
        <h2>Current Objectives</h2>
        <div className={styles.objectiveList}>
          {progress.filter(p => !p.completed).slice(0, 3).map((p) => (
            <div key={p.id} className={styles.objective}>
              <span className={styles.objectiveIcon}>🎯</span>
              <span className={styles.objectiveText}>{p.module_id}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Tactical Academy Navigation */}
      <nav className={styles.tacticalNav}>
        <Link 
          to="/academy/storybooks" 
          className={styles.navButton}
          onClick={() => sounds.playRelayClick()}
        >
          STORYBOOK ARCHIVE
        </Link>
        <Link 
          to="/academy/promotion-center" 
          className={styles.navButton}
          onClick={() => sounds.playPneumaticHiss()}
        >
          PROMOTION CENTER
        </Link>
        <Link 
          to="/academy/briefing" 
          className={styles.navButton}
          onClick={() => sounds.playCommsStatic?.('start')}
        >
          WEEKLY BRIEFING
        </Link>
      </nav>
    </div>
  )
}
