import { useState, useEffect } from 'react'
import { useSearchParams, Link } from 'react-router-dom'
import { supabase } from '../lib/supabase.js'
import { fetchChildRank } from '../services/rankService.js'
import { deriveRank } from '../utils/rank.js'
import { useProgress } from '../hooks/useProgress.js'
import BuddyOrb from '../components/BuddyOrb.jsx'
import { RANK_TIERS } from '../components/BuddyOrb.jsx'
import TacticalOrb from '../components/TacticalOrb.jsx'
import styles from './CadetHud.module.css'

const RANK_ORDER = ['Recruit', 'Specialist', 'Corporal', 'Sergeant', 'Lieutenant', 'Commander']

export default function CadetHud({ session: _session }) {
  const [searchParams] = useSearchParams()
  const childId = searchParams.get('child') || searchParams.get('cadet')
  const [child, setChild] = useState(null)
  const [rankData, setRankData] = useState(null)
  const [loading, setLoading] = useState(true)
  const { completions, records } = useProgress()

  useEffect(() => {
    if (childId) {
      loadChild()
    }
  }, [childId])

  const loadChild = async () => {
    const { data, error } = await supabase
      .from('children')
      .select('*')
      .eq('id', childId)
      .single()

    if (error) {
      console.error('Failed to load child:', error)
    } else {
      setChild(data)
      // Load rank data from child_ranks table (queries children.id)
      const rankRow = await fetchChildRank(childId)
      const derived = deriveRank(rankRow?.totalXp || 0)
      setRankData(derived)
    }
    setLoading(false)
  }

  if (loading) {
    return <div className={styles.loading}>Loading…</div>
  }

  if (!child) {
    return <div className={styles.error}>Cadet not found</div>
  }

  const level = rankData?.level || 1
  const rankName = RANK_ORDER[Math.min(level, RANK_ORDER.length - 1)] || 'Recruit'
  const rankTierInfo = RANK_TIERS[rankName] || RANK_TIERS.Recruit

  // Count completed lessons from useProgress (lesson_completions table)
  const completedLessons = completions.size
  const totalLessons = records.size

  return (
    <div className={styles.hud}>
      <header className={styles.header}>
        <div className={styles.headerLeft}>
          <h1>Cadet {child.name}</h1>

          {/* Visual modules unlocked per rank tier */}
          <div className={styles.rankModules}>
            <span className={styles.moduleBadge}>
              {rankTierInfo.tier >= 2
                ? '◆ HALO RING UNLOCKED'
                : 'HALO RING LOCKED'}
            </span>
            <span className={styles.moduleBadge}>
              {rankTierInfo.tier >= 3
                ? '◆ HUD RINGS UNLOCKED'
                : 'HUD RINGS LOCKED'}
            </span>
            <span className={styles.moduleBadge}>
              {rankTierInfo.tier >= 4
                ? '◆ SCAN RING UNLOCKED'
                : 'SCAN RING LOCKED'}
            </span>
            <span className={styles.moduleBadge}>
              {rankTierInfo.tier >= 5
                ? '◆ CORE PULSE UNLOCKED'
                : 'CORE PULSE LOCKED'}
            </span>
          </div>
        </div>

        {/* Orb as the command core — rank-driven visual modules */}
        <div className={styles.orbPod}>
          {/* Tactical Orb for comms interaction */}
          <div className={styles.tacticalOrbWrapper}>
            <TacticalOrb rank={level} />
          </div>

          {/* BuddyOrb 3D visualization */}
          <BuddyOrb
            status="idle"
            rank={level}
            size={120}
            interactive={false}
            onBootComplete={undefined}
          />
          <span className={styles.rankLabel}>
            {rankName}
          </span>
        </div>
      </header>

      <div className={styles.stats}>
        <div className={styles.statCard}>
          <span className={styles.statValue}>{rankData?.totalXp || 0}</span>
          <span className={styles.statLabel}>Total XP</span>
        </div>
        <div className={styles.statCard}>
          <span className={styles.statValue}>{completedLessons}</span>
          <span className={styles.statLabel}>Missions Completed</span>
        </div>
        <div className={styles.statCard}>
          <span className={styles.statValue}>{totalLessons}</span>
          <span className={styles.statLabel}>Total Missions</span>
        </div>
      </div>

      <div className={styles.objectives}>
        <h2>Current Objectives</h2>
        <div className={styles.objectiveList}>
          {Array.from(records.entries()).filter(([_, r]) => !r.completed).slice(0, 3).map(([key]) => (
            <div key={key} className={styles.objective}>
              <span className={styles.objectiveIcon}>🎯</span>
              <span className={styles.objectiveText}>{key.replace(':', ' / ')}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Tactical Academy Navigation */}
      <nav className={styles.tacticalNav}>
        <Link to="/academy/storybooks" className={styles.navButton}>STORYBOOK ARCHIVE</Link>
        <Link to="/academy/promotion" className={styles.navButton}>PROMOTION CENTER</Link>
        <Link to="/academy/briefing" className={styles.navButton}>WEEKLY BRIEFING</Link>
      </nav>
    </div>
  )
}
