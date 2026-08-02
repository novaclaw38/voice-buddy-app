import { useState, useEffect, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { fetchOverview, cancelSubscription } from '../services/adminService.js'
import styles from './AdminPage.module.css'

const TIER_LABEL = { free: 'Free', trial: 'Trial', pro: 'Pro' }

export default function AdminPage() {
  const navigate = useNavigate()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [users, setUsers] = useState([])
  const [stats, setStats] = useState(null)
  const [query, setQuery] = useState('')
  const [cancelingId, setCancelingId] = useState(null)
  const [rowErrors, setRowErrors] = useState({})

  const load = () => {
    setLoading(true)
    setError(null)
    fetchOverview()
      .then((data) => { setUsers(data.users); setStats(data.stats) })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false))
  }

  useEffect(() => { load() }, [])

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return users
    return users.filter((u) => u.email.toLowerCase().includes(q))
  }, [users, query])

  const handleCancel = async (userId) => {
    if (!window.confirm("Cancel this user's subscription?")) return
    setCancelingId(userId)
    setRowErrors((prev) => ({ ...prev, [userId]: null }))
    try {
      await cancelSubscription(userId)
      setUsers((prev) => prev.map((u) => (u.id === userId ? { ...u, status: 'cancelled' } : u)))
    } catch (err) {
      setRowErrors((prev) => ({ ...prev, [userId]: err.message }))
    } finally {
      setCancelingId(null)
    }
  }

  if (loading) {
    return <div className={styles.page}><p className={styles.loading}>Loading…</p></div>
  }

  if (error) {
    return (
      <div className={styles.page}>
        <p className={styles.errorMsg} role="alert">{error}</p>
        <button className={styles.retryBtn} onClick={load}>Retry</button>
      </div>
    )
  }

  const maxDay = Math.max(1, ...stats.signupsByDay.map((d) => d.count))

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <h1 className={styles.title}>Admin</h1>
        <button className={styles.back} onClick={() => navigate('/app')}>Back to app</button>
      </header>
      <p className={styles.count}>{users.length} total users</p>

      <section className={styles.statsRow}>
        <div className={styles.statCard}>
          <span className={styles.statValue}>{stats.tierCounts.free}</span>
          <span className={styles.statLabel}>Free</span>
        </div>
        <div className={styles.statCard}>
          <span className={styles.statValue}>{stats.tierCounts.trial}</span>
          <span className={styles.statLabel}>Trial</span>
        </div>
        <div className={styles.statCard}>
          <span className={styles.statValue}>{stats.tierCounts.pro}</span>
          <span className={styles.statLabel}>Pro</span>
        </div>
      </section>

      <section className={styles.chart}>
        <h2 className={styles.chartTitle}>Signups, last 30 days</h2>
        <div className={styles.bars}>
          {stats.signupsByDay.map((day) => (
            <div key={day.date} className={styles.barCol} title={`${day.date}: ${day.count}`}>
              <div className={styles.bar} style={{ height: `${(day.count / maxDay) * 100}%` }} />
            </div>
          ))}
        </div>
      </section>

      <section className={styles.tableSection}>
        <input
          className={styles.search}
          type="text"
          placeholder="Search by email…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        <table className={styles.table}>
          <thead>
            <tr>
              <th>Email</th>
              <th>Signed up</th>
              <th>Tier</th>
              <th>Status</th>
              <th>Renews / expires</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((u) => {
              const canCancel = (u.tier === 'trial' || u.tier === 'pro') && u.status !== 'cancelled'
              const endDate = u.tier === 'pro' ? u.subscriptionEnd : u.trialEnd
              return (
                <tr key={u.id}>
                  <td>{u.email}</td>
                  <td>{new Date(u.createdAt).toLocaleDateString()}</td>
                  <td><span className={styles.badge}>{TIER_LABEL[u.tier]}</span></td>
                  <td>{u.status || '—'}</td>
                  <td>{endDate ? new Date(endDate).toLocaleDateString() : '—'}</td>
                  <td>
                    {canCancel && (
                      <button
                        className={styles.cancelBtn}
                        disabled={cancelingId === u.id}
                        onClick={() => handleCancel(u.id)}
                      >
                        {cancelingId === u.id ? 'Cancelling…' : 'Cancel subscription'}
                      </button>
                    )}
                    {rowErrors[u.id] && <p className={styles.rowError} role="alert">{rowErrors[u.id]}</p>}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
        {filtered.length === 0 && <p className={styles.empty}>No users match "{query}".</p>}
      </section>
    </div>
  )
}
