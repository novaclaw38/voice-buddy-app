import { useState, useEffect, useMemo } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { fetchOverview, cancelSubscription, banUser, unbanUser, deleteUser } from '../services/adminService.js'
import SkipLink from '../components/SkipLink.jsx'
import styles from './AdminPage.module.css'

const TIER_LABEL = { free: 'Free', trial: 'Trial', pro: 'Pro' }

function formatCurrency(amount) {
  return `R${Number(amount).toFixed(2)}`
}

export default function AdminPage() {
  const navigate = useNavigate()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [users, setUsers] = useState([])
  const [stats, setStats] = useState(null)
  const [query, setQuery] = useState('')
  const [actioningId, setActioningId] = useState(null)
  const [rowErrors, setRowErrors] = useState({})
  const [banned, setBanned] = useState({})

  const load = () => {
    setLoading(true)
    setError(null)
    fetchOverview()
      .then((data) => {
        setUsers(data.users)
        setStats(data.stats)
        // Seed from the server's real ban state, not an empty object — otherwise
        // every row would read "Ban" on load even for already-banned users.
        setBanned(Object.fromEntries(data.users.map((u) => [u.id, !!u.banned])))
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false))
  }

  useEffect(() => { load() }, [])

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return users
    return users.filter((u) => u.email.toLowerCase().includes(q))
  }, [users, query])

  const runRowAction = async (userId, fn, onSuccess) => {
    setActioningId(userId)
    setRowErrors((prev) => ({ ...prev, [userId]: null }))
    try {
      await fn()
      onSuccess()
    } catch (err) {
      setRowErrors((prev) => ({ ...prev, [userId]: err.message }))
    } finally {
      setActioningId(null)
    }
  }

  const handleCancel = (userId) => {
    if (!window.confirm("Cancel this user's subscription?")) return
    runRowAction(userId, () => cancelSubscription(userId), () => {
      setUsers((prev) => prev.map((u) => (u.id === userId ? { ...u, status: 'cancelled' } : u)))
    })
  }

  const handleBanToggle = (userId, isBanned) => {
    const action = isBanned ? unbanUser : banUser
    const label = isBanned ? 'Unban' : 'Ban'
    if (!window.confirm(`${label} this user?`)) return
    runRowAction(userId, () => action(userId), () => {
      setBanned((prev) => ({ ...prev, [userId]: !isBanned }))
    })
  }

  const handleDelete = (userId) => {
    if (!window.confirm('Permanently delete this user and all their data? This cannot be undone.')) return
    runRowAction(userId, () => deleteUser(userId), () => {
      setUsers((prev) => prev.filter((u) => u.id !== userId))
    })
  }

  if (loading) {
    return <div className={styles.page}><SkipLink /><p className={styles.loading}>Loading…</p></div>
  }

  if (error) {
    return (
      <div className={styles.page}>
        <SkipLink />
        <p className={styles.errorMsg} role="alert">{error}</p>
        <button className={styles.retryBtn} onClick={load}>Retry</button>
      </div>
    )
  }

  const maxDay = Math.max(1, ...stats.signupsByDay.map((d) => d.count))
  const maxRevenueDay = Math.max(1, ...stats.revenue.byDay.map((d) => d.amount))

  return (
    <main className={styles.page} id="main">
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
        <div className={styles.statCard}>
          <span className={styles.statValue}>{formatCurrency(stats.revenue.total)}</span>
          <span className={styles.statLabel}>Total revenue</span>
        </div>
        <div className={styles.statCard}>
          <span className={styles.statValue}>{formatCurrency(stats.revenue.mrr)}</span>
          <span className={styles.statLabel}>MRR</span>
        </div>
        <div className={styles.statCard}>
          <span className={styles.statValue}>{stats.failedPayments30d}</span>
          <span className={styles.statLabel}>Failed payments (30d)</span>
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

      <section className={styles.chart}>
        <h2 className={styles.chartTitle}>Revenue, last 30 days</h2>
        <div className={styles.bars}>
          {stats.revenue.byDay.map((day) => (
            <div key={day.date} className={styles.barCol} title={`${day.date}: ${formatCurrency(day.amount)}`}>
              <div className={styles.bar} style={{ height: `${(day.amount / maxRevenueDay) * 100}%` }} />
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
              const isBanned = !!banned[u.id]
              return (
                <tr key={u.id}>
                  <td>{u.email}</td>
                  <td>{new Date(u.createdAt).toLocaleDateString()}</td>
                  <td><span className={styles.badge}>{TIER_LABEL[u.tier]}</span></td>
                  <td>{u.status || '—'}</td>
                  <td>{endDate ? new Date(endDate).toLocaleDateString() : '—'}</td>
                  <td>
                    <div className={styles.rowActions}>
                      <Link className={styles.viewLink} to={`/admin/users/${u.id}`}>View</Link>
                      {canCancel && (
                        <button
                          className={styles.cancelBtn}
                          disabled={actioningId === u.id}
                          onClick={() => handleCancel(u.id)}
                        >
                          {actioningId === u.id ? 'Cancelling…' : 'Cancel subscription'}
                        </button>
                      )}
                      <button
                        className={styles.cancelBtn}
                        disabled={actioningId === u.id}
                        onClick={() => handleBanToggle(u.id, isBanned)}
                      >
                        {isBanned ? 'Unban' : 'Ban'}
                      </button>
                      <button
                        className={styles.cancelBtn}
                        disabled={actioningId === u.id}
                        onClick={() => handleDelete(u.id)}
                      >
                        Delete
                      </button>
                    </div>
                    {rowErrors[u.id] && <p className={styles.rowError} role="alert">{rowErrors[u.id]}</p>}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
        {filtered.length === 0 && <p className={styles.empty}>No users match "{query}".</p>}
      </section>

      <section className={styles.tableSection}>
        <h2 className={styles.chartTitle}>Recent transactions</h2>
        {stats.recentPayments.length === 0 && <p className={styles.empty}>No transactions yet.</p>}
        {stats.recentPayments.length > 0 && (
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Date</th>
                <th>Email</th>
                <th>Amount</th>
                <th>Status</th>
                <th>Type</th>
              </tr>
            </thead>
            <tbody>
              {stats.recentPayments.map((p) => (
                <tr key={p.id}>
                  <td>{new Date(p.createdAt).toLocaleDateString()}</td>
                  <td>{p.email}</td>
                  <td>{formatCurrency(p.amount)}</td>
                  <td>{p.status}</td>
                  <td>{p.paymentType}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
    </main>
  )
}
