import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { fetchTacticalStorybook } from '../services/storybookService.js'
import SkipLink from '../components/SkipLink.jsx'
import TacticalOrb from '../components/TacticalOrb/TacticalOrb.jsx'
import styles from './TacticalStorybookPage.module.css'

// Tactical AAR headers per wing (Doc 3 + Master Blueprint §C)
const AAR_HEADERS = {
  robotics:     { rank: 'Jr. Engineer',     mission: 'ROBOTICS WING',    prompt: "Ask the Engineer: What does a circuit do when the power is off?" },
  'beast-intel': { rank: 'Bio-Analyst',     mission: 'BEAST INTELLIGENCE DIVISION', prompt: "Ask the Analyst: How does a chameleon 'disappear'?" },
  'field-rations': { rank: 'Logistics Officer', mission: 'FIELD RATIONS & LOGISTICS', prompt: "Ask the Officer: Which food powers our 'backup batteries'?" },
  'env-recon':   { rank: 'Senior Scout',    mission: 'ENVIRONMENTAL RECON', prompt: "Ask the Scout: What was the biggest 'natural obstacle'?" },
  'botany-ops':  { rank: 'Junior Botanist', mission: 'BOTANY OPS',        prompt: "Ask the Botanist: How does a leaf act like a solar panel?" },
  general:      { rank: 'Recruit',         mission: 'GENERAL TRAINING',   prompt: "Ask your Specialist: What was the coolest thing you learned?" },
}

// Map lesson titles to tactical Wing
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

// Rank progression mapping (used for display in tactical context)
const RANK_ORDER = ['Recruit', 'Specialist', 'Corporal', 'Sergeant', 'Lieutenant', 'Commander']
void RANK_ORDER // Available for rank display extensions

// Public page (no auth guard) — a parent opens this straight from the
// WhatsApp weekly-digest link, often signed out on a different device.
export default function TacticalStorybookPage() {
  const { token } = useParams()
  const navigate = useNavigate()
  const [recap, setRecap] = useState(undefined) // undefined = loading, null = not found

  useEffect(() => {
    fetchTacticalStorybook(token).then(setRecap)
  }, [token])

  const handleHome = () => {
    navigate('/')
  }

  if (recap === undefined) {
    return (
      <main className={styles.page} id="main">
        <SkipLink />
        <div className={styles.loading}>
          <TacticalOrb />
          <p>INITIALIZING STORYBOOK PROTOCOL…</p>
        </div>
      </main>
    )
  }

  if (recap === null) {
    return (
      <main className={styles.page} id="main">
        <SkipLink />
        <h1 className={styles.title}>Storybook not found</h1>
        <p className={styles.body}>This link may have expired or been mistyped.</p>
        <button className={styles.homeLink} onClick={handleHome}>Go home</button>
      </main>
    )
  }

  // Merge content_json (rich tactical data) with recap fields
  const content = recap.content_json || {}
  const narrativeText = content.narrative || recap.narrative || ''
  const storybookAchievements = content.achievements || recap.achievements || []
  const childName = content.childName || 'Specialist'
  const rankName = content.rankName || 'Recruit'

  // Determine which tactical wing the child focused on this week
  const wing = recap.lessons_summary.length > 0
    ? inferWing(recap.lessons_summary)
    : content.wing || 'general'
  const aar = AAR_HEADERS[wing] || AAR_HEADERS.general

  const formatDate = (dateStr) => {
    if (!dateStr) return 'N/A'
    try {
      return new Date(dateStr).toLocaleDateString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      })
    } catch {
      return dateStr
    }
  }

  return (
    <main className={styles.page} id="main">
      <SkipLink />

      {/* Tactical AAR Header */}
      <div className={styles.aarHeader}>
        <div className={styles.aarRank}>{aar.rank}</div>
        <div className={styles.aarMission}>{aar.mission}</div>
        <div className={styles.aarDate}>WEEK OF: {formatDate(recap.week_start)}</div>
        <div className={styles.aarOrb}>
          <TacticalOrb />
        </div>
      </div>

      {/* Mission Briefing Title */}
      <h1 className={styles.title}>
        {content.title || 'SPECIALIST DEBRIEF REPORT'}
      </h1>

      {/* Cadet identification */}
      {childName && (
        <div className={styles.childHeader}>
          <span className={styles.childName}>{childName}</span>
          <span className={styles.childRank}>Rank {content.childRank || 1} • {rankName}</span>
        </div>
      )}

      {/* The AI-generated narrative (tactical-specialist voice) */}
      {narrativeText && (
        <p className={styles.narrative}>{narrativeText}</p>
      )}

      {/* Missions completed section */}
      {recap.lessons_summary.length > 0 && (
        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>Missions Completed</h2>
          <ul className={styles.lessonList}>
            {recap.lessons_summary.map((l, i) => (
              <li key={i} className={styles.lessonItem}>
                <span className={styles.missionName}>{l.title}</span>
                {l.masteryScore != null && (
                  <span className={styles.mastery}> — {l.masteryScore}% mastery</span>
                )}
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* XP earned */}
      <div className={styles.xpSection}>
        <span className={styles.xpLabel}>OPERATIONS CREDIT EARNED:</span>
        <span className={styles.xpValue}>+{recap.xp_earned} XP</span>
      </div>

      {/* Achievements */}
      {storybookAchievements.length > 0 && (
        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>Badges Earned</h2>
          <div className={styles.achievementGrid}>
            {recap.achievements.map((badge, i) => (
              <div key={i} className={styles.achievementBadge}>
                <span className={styles.badgeIcon}>◆</span>
                <span>{badge}</span>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Parent Prompt - highlighted box */}
      <div className={styles.promptBox}>
        <span className={styles.promptLabel}>PARENT PROMPT:</span>
        <span className={styles.promptText}>
          {' '}
          {content.parentPrompt || aar.prompt}
        </span>
      </div>

      {/* Navigation */}
      <footer className={styles.footer}>
        <button className={styles.homeLink} onClick={handleHome}>
          RETURN TO COMMAND
        </button>
      </footer>
    </main>
  )
}
