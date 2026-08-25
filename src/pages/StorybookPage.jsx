import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { fetchRecapByToken } from '../services/storybookService.js'
import SkipLink from '../components/SkipLink.jsx'
import styles from './StorybookPage.module.css'

// Map lesson titles to tactical Wing + rank + parent prompt.
// Uses keyword matching on lesson titles from the course catalog.
function inferWing(lessons) {
  const titles = lessons.map((l) => (l.title || '').toLowerCase()).join(' ')
  if (titles.includes('robotic') || titles.includes('logic') || titles.includes('circuit') || titles.includes('neural'))
    return 'robotics'
  if (titles.includes('animal') || titles.includes('beast') || titles.includes('camouflage') || titles.includes('predator') || titles.includes('creature'))
    return 'beast-intel'
  if (titles.includes('cook') || titles.includes('fuel') || titles.includes('nutri') || titles.includes('ingredient') || titles.includes('recipe'))
    return 'field-rations'
  if (titles.includes('nature') || titles.includes('weather') || titles.includes('environment') || titles.includes('recon') || titles.includes('season'))
    return 'env-recon'
  if (titles.includes('garden') || titles.includes('plant') || titles.includes('botany') || titles.includes('leaf') || titles.includes('photosynth'))
    return 'botany-ops'
  return 'general'
}

// Tactical AAR headers per wing (Doc 3 + Master Blueprint §C)
const AAR_HEADERS = {
  robotics:     { rank: 'Jr. Engineer',     mission: 'ROBOTICS WING',    prompt: "Ask the Engineer: What does a circuit do when the power is off?" },
  'beast-intel': { rank: 'Bio-Analyst',     mission: 'BEAST INTELLIGENCE DIVISION', prompt: "Ask the Analyst: How does a chameleon 'disappear'?" },
  'field-rations': { rank: 'Logistics Officer', mission: 'FIELD RATIONS & LOGISTICS', prompt: "Ask the Officer: Which food powers our 'backup batteries'?" },
  'env-recon':   { rank: 'Senior Scout',    mission: 'ENVIRONMENTAL RECON', prompt: "Ask the Scout: What was the biggest 'natural obstacle'?" },
  'botany-ops':  { rank: 'Junior Botanist', mission: 'BOTANY OPS',        prompt: "Ask the Botanist: How does a leaf act like a solar panel?" },
  general:      { rank: 'Recruit',         mission: 'GENERAL TRAINING',   prompt: "Ask your Specialist: What was the coolest thing you learned?" },
}

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

  // Determine which tactical wing the child focused on this week
  const wing = recap.lessons_summary.length > 0
    ? inferWing(recap.lessons_summary)
    : 'general'
  const aar = AAR_HEADERS[wing] || AAR_HEADERS.general

  return (
    <main className={styles.page} id="main">
      <SkipLink />

      {/* Tactical AAR Header */}
      <div className={styles.aarHeader}>
        <div className={styles.aarRank}>{aar.rank}</div>
        <div className={styles.aarMission}>{aar.mission}</div>
        <div className={styles.aarDate}>WEEK OF: {recap.week_start || 'N/A'}</div>
      </div>

      {/* The AI-generated narrative (tactical-specialist voice) */}
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

      {/* XP earned */}
      <p className={styles.xp}>+{recap.xp_earned} XP earned this week</p>

      {/* Parent Prompt */}
      <div className={styles.promptBox}>
        <span className={styles.promptLabel}>PARENT PROMPT:</span>
        <span className={styles.promptText}> {aar.prompt}</span>
      </div>
    </main>
  )
}
