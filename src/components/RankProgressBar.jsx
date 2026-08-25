import { useState } from 'react'
import styles from './RankProgressBar.module.css'

const RANKS = ['RECRUIT', 'BIO-ANALYST', 'SENIOR SCOUT', 'SPECIALIST']

export default function RankProgressBar() {
  const [currentLevel, setCurrentLevel] = useState(1)

  const handleRankUp = () => {
    setCurrentLevel((prev) => (prev < RANKS.length ? prev + 1 : 1))
  }

  return (
    <div className={styles.wrap}>
      <div className={styles.header}>
        <span>[ SPECIALIST ASCENSION PATH ]</span>
        <button onClick={handleRankUp} className={styles.demoBtn}>DEMO RANK UP</button>
      </div>
      <div className={styles.bar}>
        <div
          className={styles.fill}
          style={{ width: `${(currentLevel / RANKS.length) * 100}%` }}
        />
      </div>
      <div className={styles.ranks}>
        {RANKS.map((rank, idx) => (
          <div
            key={rank}
            className={`${styles.rank} ${idx + 1 <= currentLevel ? styles.active : ''}`}
          >
            <div className={styles.rankLevel}>LEVEL 0{idx + 1}</div>
            <div className={styles.rankName}>{rank}</div>
          </div>
        ))}
      </div>
    </div>
  )
}
