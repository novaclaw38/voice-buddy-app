import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { listChildren, deleteChild } from '../services/childrenService.js'
import { fetchChildRank } from '../services/rankService.js'
import { deriveRank } from '../utils/rank.js'
import TacticalOrb from '../components/TacticalOrb.jsx'
import styles from './ParentDashboard.module.css'

// Fetch rank data for all children in one pass so the dashboard can show
// level/rank badges. Each child_ranks row maps 1:1 to a child.
async function loadChildRanks(childIds) {
  const map = {}
  for (const id of childIds) {
    const row = await fetchChildRank(id)
    map[id] = row
  }
  return map
}

export default function ParentDashboard({ session: _session }) {
  const navigate = useNavigate()
  const [children, setChildren] = useState([])
  const [ranks, setRanks] = useState({})
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadChildren()
  }, [])

  const loadChildren = async () => {
    try {
      const data = await listChildren()
      setChildren(data || [])
      // Fetch rank data for each child
      const childIds = (data || []).map((c) => c.id)
      const rankMap = await loadChildRanks(childIds)
      setRanks(rankMap)
    } catch (error) {
      console.error('Failed to load children:', error)
    } finally {
      setLoading(false)
    }
  }

  const createChild = async () => {
    const name = prompt('Cadet name:')
    if (!name) return

    // Use childrenService to create — it handles parent_id/user_id correctly
    const { createChild } = await import('../services/childrenService.js')
    try {
      const data = await createChild({
        name,
        buddyName: 'Buddy',
        avatarType: 'bear',
        avatarColor: '#7c3aed',
      })
      // Seed a child_ranks row with 0 XP so the rank system has a row
      await fetchChildRank(data.id) // triggers rankService fetch (returns {totalXp: 0})
      setChildren((prev) => [...prev, data])
      setRanks((prev) => ({ ...prev, [data.id]: { totalXp: 0 } }))
    } catch (error) {
      console.error('Failed to create child:', error)
    }
  }

  const handleDelete = async (id) => {
    if (!confirm('Delete this child?')) return
    try {
      await deleteChild(id)
      setChildren((prev) => prev.filter((c) => c.id !== id))
      setRanks((prev) => {
        const next = { ...prev }
        delete next[id]
        return next
      })
    } catch (error) {
      console.error('Failed to delete child:', error)
    }
  }

  if (loading) {
    return <div className={styles.loading}>Loading…</div>
  }

  return (
    <div className={styles.dashboard}>
      <header className={styles.header}>
        <h1>Parent Command Center</h1>
        <button className={styles.addBtn} onClick={createChild}>+ Add Cadet</button>
      </header>

      <div className={styles.cadetGrid}>
        {children.map((child) => {
          const rankData = ranks[child.id] || { totalXp: 0 }
          const derived = deriveRank(rankData.totalXp || 0)
          const level = derived.level
          const rankName = derived.rank

          // Derive Orb status from child activity
          // amber (processing) = active mission in progress
          // teal (idle) = standing by or AAR generated
          // green (completed) = rank-up milestone
          const orbStatus = 'idle'

          return (
            <div key={child.id} className={styles.cadetCard}>
              <div className={styles.cadetHeader}>
                <span className={styles.cadetName}>{child.name}</span>
                <span className={styles.cadetRank}>Level {level}: {rankName}</span>
              </div>

              {/* Mission Status Orb */}
              <div className={styles.missionOrb}>
                <TacticalOrb
                  status={orbStatus}
                  totalXp={rankData.totalXp || 0}
                  interactive={false}
                  style={{ width: 80, height: 80 }}
                />
                <span className={styles.orbStatusLabel}>STANDING BY</span>
              </div>

              <div className={styles.cadetStats}>
                <div className={styles.stat}>
                  <span className={styles.statLabel}>XP</span>
                  <span className={styles.statValue}>{rankData.totalXp || 0}</span>
                </div>
                <div className={styles.stat}>
                  <span className={styles.statLabel}>Enrolled</span>
                  <span className={styles.statValue}>{new Date(child.created_at).toLocaleDateString()}</span>
                </div>
              </div>
              <div className={styles.cadetActions}>
                <button className={styles.actionBtn} onClick={() => navigate(`/academy/hud?child=${child.id}`)}>View Progress</button>
                <button className={styles.deleteBtn} onClick={() => handleDelete(child.id)}>Delete</button>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
