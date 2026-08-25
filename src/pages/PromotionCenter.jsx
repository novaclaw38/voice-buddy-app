import { useState, useEffect } from 'react'
import { useSearchParams } from 'react-router-dom'
import { supabase } from '../lib/supabase.js'
import RankProgressBar from '../components/RankProgressBar/RankProgressBar.jsx'
import { speechEngine } from '../components/audio/speech-engine.js'
import { sounds } from '../components/audio/web-audio-synthesizer.js'
import styles from './PromotionCenter.module.css'

const RANKS = ['Recruit', 'Specialist', 'Corporal', 'Sergeant', 'Lieutenant', 'Commander']

export default function PromotionCenter() {
  const [searchParams] = useSearchParams()
  const cadetId = searchParams.get('cadet')
  const [cadet, setCadet] = useState(null)
  const [progress, setProgress] = useState([])
  const [loading, setLoading] = useState(true)
  const [promoting, setPromoting] = useState(false)

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

    if (error) {
      console.error('Failed to load progress:', error)
    } else {
      setProgress(data || [])
    }
  }

  const handlePromote = async () => {
    if (!cadet || cadet.current_rank >= 6) return

    sounds.playPneumaticHiss()
    setPromoting(true)
    const nextRankName = RANKS[cadet.current_rank]

    // Update rank
    const { error } = await supabase
      .from('cadets')
      .update({ current_rank: cadet.current_rank + 1 })
      .eq('id', cadet.id)

    if (error) {
      console.error('Failed to promote cadet:', error)
    } else {
      speechEngine.speak(
        `Rank ascension verified. Specialist now operating at ${nextRankName} level.`
      )
      loadCadet()
    }

    setPromoting(false)
  }

  const completedCount = progress.filter(p => p.completed).length
  const totalCount = progress.length
  const progressPercent = totalCount > 0 ? (completedCount / totalCount) * 100 : 0

  if (loading) {
    return <div className={styles.loading}>Loading...</div>
  }

  if (!cadet) {
    return <div className={styles.error}>Cadet not found</div>
  }

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <h1>Promotion Center</h1>
        <p>Advance through the ranks by completing missions</p>
      </header>

      <div className={styles.rankDisplay}>
        <div className={styles.currentRank}>
          <span className={styles.rankNumber}>{cadet.current_rank}</span>
          <span className={styles.rankName}>{RANKS[cadet.current_rank - 1]}</span>
        </div>
        {cadet.current_rank < 6 && (
          <div className={styles.nextRank}>
            <span className={styles.nextLabel}>Next:</span>
            <span className={styles.nextName}>{RANKS[cadet.current_rank]}</span>
          </div>
        )}
      </div>

      {/* Tactical Rank Progression HUD */}
      <div className={styles.tacticalRankSection}>
        <RankProgressBar
          currentLevel={cadet.current_rank}
          totalPoints={cadet.total_points}
          showVoiceSample={true}
          onRankUp={(_newLevel) => {
            sounds.playPneumaticHiss()
          }}
        />
      </div>

      <div className={styles.progressSection}>
        <h2>Progress</h2>
        <div className={styles.progressBar}>
          <div className={styles.progressFill} style={{ width: `${progressPercent}%` }} />
        </div>
        <p>{completedCount} of {totalCount} missions completed</p>
      </div>

      {cadet.current_rank < 6 && (
        <div className={styles.promoteSection}>
          <button
            className={styles.promoteBtn}
            onClick={handlePromote}
            disabled={promoting}
          >
            {promoting ? 'Promoting...' : `Promote to ${RANKS[cadet.current_rank]}`}
          </button>
        </div>
      )}

      {cadet.current_rank === 6 && (
        <div className={styles.graduate}>
          <h2>🎖️ Commander — Graduated!</h2>
          <p>Your cadet has completed the 6-month program.</p>
        </div>
      )}
    </div>
  )
}
