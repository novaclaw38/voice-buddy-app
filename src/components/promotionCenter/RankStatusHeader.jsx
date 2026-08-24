import BuddyAvatar from '../BuddyAvatar.jsx'
import { useChildRank } from '../../hooks/useChildRank.js'
import { XP_PER_LEVEL } from '../../utils/rank.js'
import styles from './RankStatusHeader.module.css'

export default function RankStatusHeader({ child, allChildren, onSwitchChild }) {
  const { level, rank, xpIntoLevel, xpToNextLevel, loading } = useChildRank(child?.id)
  const pct = loading ? 0 : Math.round((xpIntoLevel / XP_PER_LEVEL) * 100)
  const siblings = (allChildren || []).filter((c) => c.id !== child?.id)

  return (
    <div className={styles.header}>
      <div className={styles.headerLabel}>SECURE_STORAGE_V.04</div>
      <div className={`${styles.avatarRing} ${styles[`rank_${rank}`]}`}>
        <BuddyAvatar status="idle" avatarColor={child?.avatar_color} type={child?.avatar_type} size={88} live={false} />
      </div>
      <p className={styles.childName}>{child?.name}</p>
      <p className={styles.rankLabel}>{rank} · Level {level}</p>
      <div className={styles.xpTrack}>
        <div className={styles.xpFill} style={{ transform: `scaleX(${pct / 100})` }} />
      </div>
      <p className={styles.xpCaption}>{xpToNextLevel} XP to next rank</p>

      {siblings.length > 0 && (
        <div className={styles.switcher}>
          {siblings.map((sib) => (
            <button key={sib.id} className={styles.switchBtn} onClick={() => onSwitchChild(sib.id)}>
              {sib.name}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
