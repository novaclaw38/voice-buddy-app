import { useState, useEffect } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { fetchUserDetail, grantPro, banUser, unbanUser, deleteUser } from '../services/adminService.js'
import SkipLink from '../components/SkipLink.jsx'
import styles from './AdminUserDetailPage.module.css'

function formatCurrency(amount) {
  return `R${Number(amount).toFixed(2)}`
}

export default function AdminUserDetailPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [detail, setDetail] = useState(null)
  const [endDate, setEndDate] = useState('')
  const [banned, setBanned] = useState(false)
  const [actionError, setActionError] = useState(null)
  const [actioning, setActioning] = useState(false)

  const load = () => {
    setLoading(true)
    setError(null)
    fetchUserDetail(id)
      .then((d) => {
        setDetail(d)
        // Seed from the server's real ban state — see AdminPage.jsx's load()
        // for why this can't just default to false.
        setBanned(!!d.banned)
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false))
  }

  useEffect(() => { load() }, [id])

  const runAction = async (fn, onSuccess) => {
    setActioning(true)
    setActionError(null)
    try {
      await fn()
      onSuccess()
    } catch (err) {
      setActionError(err.message)
    } finally {
      setActioning(false)
    }
  }

  const handleGrant = () => {
    if (!endDate) return
    runAction(() => grantPro(id, endDate), () => {})
  }

  const handleBanToggle = () => {
    const action = banned ? unbanUser : banUser
    if (!window.confirm(`${banned ? 'Unban' : 'Ban'} this user?`)) return
    runAction(() => action(id), () => setBanned((b) => !b))
  }

  const handleDelete = () => {
    if (!window.confirm('Permanently delete this user and all their data? This cannot be undone.')) return
    runAction(() => deleteUser(id), () => navigate('/admin'))
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

  return (
    <main className={styles.page} id="main">
      <header className={styles.header}>
        <Link className={styles.back} to="/admin">Back to admin</Link>
        <h1 className={styles.title}>User detail</h1>
      </header>

      <section className={styles.card}>
        <h2 className={styles.cardTitle}>Actions</h2>
        <div className={styles.grantRow}>
          <label htmlFor="extend-pro-date">Extend Pro until</label>
          <input
            id="extend-pro-date"
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
          />
          <button disabled={actioning || !endDate} onClick={handleGrant}>Grant</button>
        </div>
        <div className={styles.actionRow}>
          <button disabled={actioning} onClick={handleBanToggle}>{banned ? 'Unban' : 'Ban'}</button>
          <button disabled={actioning} onClick={handleDelete}>Delete user</button>
        </div>
        {actionError && <p className={styles.rowError} role="alert">{actionError}</p>}
      </section>

      <section className={styles.card}>
        <h2 className={styles.cardTitle}>Payment history</h2>
        {detail.payments.length === 0 && <p className={styles.empty}>No payments yet.</p>}
        {detail.payments.length > 0 && (
          <table className={styles.table}>
            <thead>
              <tr><th>Date</th><th>Amount</th><th>Status</th><th>Type</th></tr>
            </thead>
            <tbody>
              {detail.payments.map((p) => (
                <tr key={p.id}>
                  <td>{new Date(p.createdAt).toLocaleDateString()}</td>
                  <td>{formatCurrency(p.amount)}</td>
                  <td>{p.status}</td>
                  <td>{p.paymentType}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>

      <section className={styles.card}>
        <h2 className={styles.cardTitle}>Children</h2>
        {detail.children.length === 0 && <p className={styles.empty}>No children profiles.</p>}
        <ul className={styles.childList}>
          {detail.children.map((c) => (
            <li key={c.id}>{c.name} ({c.buddyName})</li>
          ))}
        </ul>
      </section>

      <section className={styles.card}>
        <h2 className={styles.cardTitle}>Lesson activity</h2>
        {detail.lessonActivity.length === 0 && <p className={styles.empty}>No activity yet.</p>}
        {detail.lessonActivity.length > 0 && (
          <table className={styles.table}>
            <thead>
              <tr><th>Child</th><th>Completions</th><th>Avg mastery</th></tr>
            </thead>
            <tbody>
              {detail.lessonActivity.map((a) => (
                <tr key={a.childId}>
                  <td>{a.childName}</td>
                  <td>{a.completions}</td>
                  <td>{a.avgMastery == null ? '—' : `${a.avgMastery}%`}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
    </main>
  )
}
