import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase.js'
import BuddyOrb from '../components/BuddyOrb.jsx'
import { RANK_NAMES } from '../components/BuddyOrb.jsx'
import styles from './ParentDashboard.module.css'

const RANK_ORDER = ['Recruit', 'Specialist', 'Corporal', 'Sergeant', 'Lieutenant', 'Commander']

export default function ParentDashboard({ session }) {
  const navigate = useNavigate()
  const [cadets, setCadets] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadCadets()
  }, [])

  const loadCadets = async () => {
    const { data, error } = await supabase
      .from('cadets')
      .select('*')
      .order('created_at', { ascending: true })

    if (error) {
      console.error('Failed to load cadets:', error)
    } else {
      setCadets(data || [])
    }
    setLoading(false)
  }

  const createCadet = async () => {
    const name = prompt('Cadet name:')
    if (!name) return

    const { error } = await supabase
      .from('cadets')
      .insert({ name, parent_id: session.user.id })

    if (error) {
      console.error('Failed to create cadet:', error)
    } else {
      loadCadets()
    }
  }

  const deleteCadet = async (id) => {
    if (!confirm('Delete this cadet?')) return

    const { error } = await supabase
      .from('cadets')
      .delete()
      .eq('id', id)

    if (error) {
      console.error('Failed to delete cadet:', error)
    } else {
      loadCadets()
    }
  }

  if (loading) {
    return <div className={styles.loading}>Loading...</div>
  }

  return (
    <div className={styles.dashboard}>
      <header className={styles.header}>
        <h1>Parent Command Center</h1>
        <button className={styles.addBtn} onClick={createCadet}>+ Add Cadet</button>
      </header>

      <div className={styles.cadetGrid}>
        {cadets.map((cadet) => {
          // Derive Orb status from cadet activity
          // amber (processing) = active mission in progress
          // teal (idle) = standing by or AAR generated
          // green (completed) = rank-up milestone
          const orbStatus = cadet.last_mission_status === 'active'
            ? 'processing'
            : cadet.last_mission_status === 'completed'
              ? 'completed'
              : 'idle'

          return (
          <div key={cadet.id} className={styles.cadetCard}>
            <div className={styles.cadetHeader}>
              <span className={styles.cadetName}>{cadet.name}</span>
              <span className={styles.cadetRank}>Rank {cadet.current_rank}: {RANK_ORDER[cadet.current_rank - 1]}</span>
            </div>

            {/* Mission Status Orb — amber pulse = active mission, teal steady = AAR ready */}
            <div className={styles.missionOrb}>
              <BuddyOrb
                status={orbStatus}
                rank={cadet.current_rank}
                size={80}
                interactive={false}
              />
              <span className={styles.orbStatusLabel}>
                {orbStatus === 'processing' ? 'ACTIVE MISSION' :
                 orbStatus === 'completed' ? 'MISSION COMPLETE' :
                 'STANDING BY'}
              </span>
            </div>

            <div className={styles.cadetStats}>
              <div className={styles.stat}>
                <span className={styles.statLabel}>Points</span>
                <span className={styles.statValue}>{cadet.total_points}</span>
              </div>
              <div className={styles.stat}>
                <span className={styles.statLabel}>Enrolled</span>
                <span className={styles.statValue}>{new Date(cadet.enrolled_at).toLocaleDateString()}</span>
              </div>
            </div>
            <div className={styles.cadetActions}>
              <button className={styles.actionBtn} onClick={() => navigate(`/academy/hud?cadet=${cadet.id}`)}>View Progress</button>
              <button className={styles.deleteBtn} onClick={() => deleteCadet(cadet.id)}>Delete</button>
            </div>
          </div>
          )
        })}
      </div>
    </div>
  )
}
