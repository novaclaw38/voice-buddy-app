import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { fetchRecapByToken } from '../services/storybookService.js'
import SkipLink from '../components/SkipLink.jsx'
import styles from './StorybookPage.module.css'

// Public page (no auth guard) — a parent opens this straight from the
// WhatsApp weekly-digest link, often signed out on a different device.
export default function StorybookPage() {
  const { token } = useParams()
  const navigate = useNavigate()
  const [recap, setRecap] = useState(undefined) // undefined = loading, null = not found

  useEffect(() => {
    fetchRecapByToken(token).then(setRecap)
  }, [token])

  if (recap === undefined) {
    return (
      <main className={styles.page} id="main">
        <SkipLink />
        <p className={styles.loading}>Loading this week's storybook…</p>
      </main>
    )
  }

  if (recap === null) {
    return (
      <main className={styles.page} id="main">
        <SkipLink />
        <h1 className={styles.title}>Storybook not found</h1>
        <p className={styles.body}>This link may have expired or been mistyped.</p>
        <button className={styles.homeLink} onClick={() => navigate('/')}>Go home</button>
      </main>
    )
  }

  return (
    <main className={styles.page} id="main">
      <SkipLink />
      <h1 className={styles.title}>This Week's Mission Debrief</h1>
      <p className={styles.narrative}>{recap.narrative}</p>

      {recap.lessons_summary.length > 0 && (
        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>Missions completed</h2>
          <ul className={styles.lessonList}>
            {recap.lessons_summary.map((l, i) => (
              <li key={i} className={styles.lessonItem}>
                {l.title}
                {l.masteryScore != null && <span className={styles.mastery}> — {l.masteryScore}% mastery</span>}
              </li>
            ))}
          </ul>
        </section>
      )}

      <p className={styles.xp}>+{recap.xp_earned} XP earned this week</p>
    </main>
  )
}
