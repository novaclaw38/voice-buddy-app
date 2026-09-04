import { useState, useEffect } from 'react'
import { useSearchParams, Link } from 'react-router-dom'
import { supabase } from '../lib/supabase.js'
import { fetchChildRank } from '../services/rankService.js'
import { getAcademyRank } from '../utils/academyRank.js'
import { useProgress } from '../hooks/useProgress.js'
import TacticalOrb from '../components/TacticalOrb.jsx'
import styles from './CadetHud.module.css'

export default function CadetHud({ session: _session }) {
  const [searchParams] = useSearchParams()
  const childId = searchParams.get('child') || searchParams.get('cadet')
  const [child, setChild] = useState(null)
  const [rankInfo, setRankInfo] = useState(null)
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
      const totalXp = rankRow?.totalXp || 0
      setRankInfo({ ...getAcademyRank(totalXp), totalXp })
    }
    setLoading(false)
  }

  if (loading) {
    return <div className={styles.loading}>Loading…</div>
  }

  if (!child) {
    return <div className={styles.error}>Cadet not found</div>
  }

  const moduleUniforms = rankInfo.modules.map((m) => m.uniform)
  const hasHalo = moduleUniforms.includes('uHalo')
  const hasEqualizer = moduleUniforms.includes('uEqStrength')
  const hasDataHud = moduleUniforms.includes('uDataHud')

  // Count completed lessons from useProgress (lesson_completions table)
  const completedLessons = completions.size
  const totalLessons = records.size

  return (
    <div className={styles.hud}>
      <header className={styles.header}>
        <div className={styles.headerLeft}>
          <h1>Cadet {child.name}</h1>

          {/* Visual modules unlocked per rank tier — mirrors what TacticalOrb actually renders */}
          <div className={styles.rankModules}>
            <span className={styles.moduleBadge}>
              {hasHalo ? '◆ HALO RING UNLOCKED' : 'HALO RING LOCKED'}
            </span>
            <span className={styles.moduleBadge}>
              {hasEqualizer ? '◆ EQUALIZER UNLOCKED' : 'EQUALIZER LOCKED'}
            </span>
            <span className={styles.moduleBadge}>
              {hasDataHud ? '◆ DATA HUD UNLOCKED' : 'DATA HUD LOCKED'}
            </span>
          </div>
        </div>

        {/* Orb as the command core — rank-driven visual modules */}
        <div className={styles.orbPod}>
          <div className={styles.tacticalOrbWrapper}>
            <TacticalOrb status="idle" totalXp={rankInfo.totalXp} rank={rankInfo.level} style={{ width: 120, height: 120 }} />
          </div>
          <span className={styles.rankLabel}>
            {rankInfo.rank}
          </span>
        </div>
      </header>

      <div className={styles.stats}>
        <div className={styles.statCard}>
          <span className={styles.statValue}>{rankInfo.totalXp}</span>
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
