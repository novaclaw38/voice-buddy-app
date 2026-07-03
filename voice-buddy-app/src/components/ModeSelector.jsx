import { useSubscription } from '../hooks/useSubscription.jsx'
import ModeIcon from './ModeIcons.jsx'
import styles from './ModeSelector.module.css'

const MODES = [
  { id: 'story',    emoji: '📖', label: 'Story',    bg: 'linear-gradient(135deg,#7c3aed,#4f46e5)', glow: '#7c3aed',  free: true  },
  { id: 'sing',     emoji: '🎵', label: 'Sing',     bg: 'linear-gradient(135deg,#ec4899,#db2777)', glow: '#ec4899',  free: true  },
  { id: 'game',     emoji: '🎮', label: 'Games',    bg: 'linear-gradient(135deg,#db2777,#be185d)', glow: '#db2777',  free: false },
  { id: 'activity', emoji: '🎨', label: 'Activity', bg: 'linear-gradient(135deg,#ea580c,#c2410c)', glow: '#ea580c',  free: false },
  { id: 'quiz',     emoji: '🧠', label: 'Quiz',     bg: 'linear-gradient(135deg,#0891b2,#0e7490)', glow: '#0891b2',  free: false },
  { id: 'jokes',    emoji: '😂', label: 'Jokes',    bg: 'linear-gradient(135deg,#f59e0b,#d97706)', glow: '#f59e0b',  free: false },
  { id: 'move',     emoji: '🏃', label: 'Move',     bg: 'linear-gradient(135deg,#16a34a,#15803d)', glow: '#16a34a',  free: false },
  { id: 'learn',    emoji: '🔬', label: 'Learn',    bg: 'linear-gradient(135deg,#6366f1,#4f46e5)', glow: '#6366f1',  free: false },
  { id: 'feelings', emoji: '💙', label: 'Feelings', bg: 'linear-gradient(135deg,#2563eb,#1d4ed8)', glow: '#2563eb',  free: false },
  { id: 'routine',  emoji: '⭐', label: 'Routine',  bg: 'linear-gradient(135deg,#ca8a04,#a16207)', glow: '#ca8a04',  free: false },
]

export default function ModeSelector({ currentMode, onSelect, onUpgrade }) {
  const { isPro } = useSubscription()

  const handleClick = (mode) => {
    if (!isPro && !mode.free) {
      onUpgrade?.()
      return
    }
    onSelect(mode.id)
  }

  return (
    <div className={styles.row}>
      {MODES.map((m, i) => {
        const locked = !isPro && !m.free
        return (
          <button
            key={m.id}
            className={`${styles.tile} ${currentMode === m.id ? styles.active : ''} ${locked ? styles.locked : ''}`}
            style={{ background: m.bg, '--glow': m.glow, animationDelay: `${i * 0.06}s` }}
            onClick={() => handleClick(m)}
            aria-label={locked ? `${m.label} — Pro feature` : m.label}
          >
            <span className={styles.emoji}><ModeIcon id={m.id} /></span>
            <span className={styles.label}>{m.label}</span>
            {locked && <span className={styles.lockIcon}>Pro</span>}
          </button>
        )
      })}
    </div>
  )
}
