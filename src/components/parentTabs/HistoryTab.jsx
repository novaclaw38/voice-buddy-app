import { useState, useEffect } from 'react'
import { fetchHistory, deleteHistory } from '../../services/historyService.js'
import shared from './shared.module.css'
import styles from './HistoryTab.module.css'

// onSelectPrint writes the shell-owned printData/printType and switches to
// the Print tab — a real cross-tab dependency (same shape as ChildPage's
// showActivity/dailyActivity, Candidate B), so it stays a callback prop
// rather than local state.
export default function HistoryTab({ onSelectPrint }) {
  const [history, setHistory] = useState([])
  const [historyLoading, setHistoryLoading] = useState(false)
  // A native window.confirm() would break out of the app's own focus-trap
  // dialog system with inconsistent screen-reader behavior versus the rest
  // of the app — same reasoning as everywhere else this pattern is used.
  const [clearingHistory, setClearingHistory] = useState(false)

  useEffect(() => {
    setHistoryLoading(true)
    fetchHistory().then((rows) => {
      setHistory(rows.map((r) => ({
        ts: r.ts,
        mode: r.mode,
        userText: r.user_text,
        buddyText: r.buddy_text,
      })))
    }).catch(console.error).finally(() => setHistoryLoading(false))
  }, [])

  const handleClearHistory = async () => {
    setClearingHistory(false)
    await deleteHistory()
    setHistory([])
  }

  return (
    <div className={shared.section}>
      <div className={styles.historyHeader}>
        <h2 className={shared.sectionTitle}>Chat History</h2>
        {history.length > 0 && !clearingHistory && (
          <button className={shared.btnDanger} onClick={() => setClearingHistory(true)}>
            Clear All
          </button>
        )}
      </div>
      {clearingHistory && (
        <div className={shared.field} style={{ marginBottom: 16 }}>
          <p className={shared.hint} style={{ marginBottom: 10 }}>
            Clear all chat history? This cannot be undone.
          </p>
          <div className={shared.btnRow}>
            <button className={shared.btnDanger} onClick={handleClearHistory}>Yes, clear it</button>
            <button className={shared.btnTest} onClick={() => setClearingHistory(false)}>Cancel</button>
          </div>
        </div>
      )}
      {historyLoading ? (
        <p className={shared.empty}>Loading history...</p>
      ) : history.length === 0 ? (
        <p className={shared.empty}>No conversations yet. Go talk to Buddy!</p>
      ) : (
        <div className={shared.historyList}>
          {history.map((entry, i) => (
            <div key={i} className={shared.historyEntry}>
              <div className={shared.entryMeta}>
                <span className={`${shared.modeBadge} ${shared[entry.mode]}`}>
                  {entry.mode}
                </span>
                <span className={shared.entryDate}>
                  {new Date(entry.ts).toLocaleDateString()} {new Date(entry.ts).toLocaleTimeString([], {hour:'2-digit',minute:'2-digit'})}
                </span>
              </div>
              <p className={styles.entryUser}><strong>Child:</strong> {entry.userText}</p>
              <p className={styles.entryBuddy}><strong>Buddy:</strong> {entry.buddyText}</p>
              <button
                className={shared.btnSmall}
                onClick={() => onSelectPrint(entry)}
              >
                Print this
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
