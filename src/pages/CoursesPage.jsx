import { useNavigate } from 'react-router-dom'
import { COURSES } from '../utils/courses.js'
import { useSubscription } from '../hooks/useSubscription.jsx'
import { useCompletions } from '../hooks/useCompletions.js'
import { useSpeech } from '../hooks/useSpeech.js'
import UpgradePrompt from '../components/UpgradePrompt.jsx'
import { useState, useEffect } from 'react'
import { getSettings } from '../utils/storage.js'
import { pickRandom } from '../utils/prompts.js'
import styles from './CoursesPage.module.css'

const COURSES_INTRO = [
  (names) => `Here are your courses! ${names}. Tap one to hear what's inside!`,
  (names) => `Look what we can learn together! ${names}. Which one sounds fun?`,
  (names) => `So many things to discover — ${names}. Pick one and let's dive in!`,
]

// Simple illustrated scene per course, drawn in the same white line-art
// family as the mode tiles. Sits on the course's gradient header.
function CourseArt({ courseId }) {
  const S = { stroke: 'white', strokeWidth: 3, strokeLinecap: 'round', strokeLinejoin: 'round', fill: 'none' }
  return (
    <svg className={styles.courseArt} viewBox="0 0 160 80" aria-hidden="true">
      {/* shared ground */}
      <path d="M0 68 Q40 60 80 66 T160 63 V80 H0 Z" fill="rgba(255,255,255,0.25)" />
      {courseId === 'gardening' && (
        <>
          <circle cx="138" cy="16" r="9" fill="#ffd23f" />
          <path {...S} d="M40 66 V48" />
          <path d="M40 54 C32 52 29 45 30 39 C37 41 41 47 40 54 Z" fill="rgba(255,255,255,0.9)" />
          <path d="M40 58 C48 56 51 49 50 43 C43 45 39 51 40 58 Z" fill="rgba(255,255,255,0.7)" />
          <path {...S} d="M80 67 V54" />
          <path d="M80 58 C73 56 71 50 72 46 C78 48 81 52 80 58 Z" fill="rgba(255,255,255,0.85)" />
          <path {...S} d="M112 67 V58" />
          <path d="M112 61 C118 59 120 54 119 51 C114 53 111 56 112 61 Z" fill="rgba(255,255,255,0.8)" />
        </>
      )}
      {courseId === 'robotics' && (
        <>
          <rect {...S} fill="rgba(255,255,255,0.25)" x="62" y="30" width="36" height="26" rx="6" />
          <rect {...S} fill="rgba(255,255,255,0.35)" x="69" y="12" width="22" height="15" rx="4" />
          <line {...S} x1="80" y1="12" x2="80" y2="6" />
          <circle cx="80" cy="5" r="2.5" fill="#ffd23f" />
          <circle cx="75.5" cy="19.5" r="2.4" fill="white" />
          <circle cx="84.5" cy="19.5" r="2.4" fill="white" />
          <circle {...S} cx="70" cy="61" r="5" fill="rgba(255,255,255,0.5)" />
          <circle {...S} cx="90" cy="61" r="5" fill="rgba(255,255,255,0.5)" />
          <path d="M30 22 l2 5 5 2 -5 2 -2 5 -2-5 -5-2 5-2 Z" fill="rgba(255,255,255,0.8)" />
          <path d="M132 34 l1.6 4 4 1.6 -4 1.6 -1.6 4 -1.6-4 -4-1.6 4-1.6 Z" fill="rgba(255,255,255,0.6)" />
        </>
      )}
      {courseId === 'science' && (
        <>
          <path {...S} fill="rgba(255,255,255,0.2)" d="M72 14 v14 L56 56 a6 6 0 0 0 5.2 9 h37.6 a6 6 0 0 0 5.2-9 L88 28 V14" />
          <line {...S} x1="67" y1="14" x2="93" y2="14" />
          <path d="M62 46 h36 l6 10 a6 6 0 0 1-5.2 9 H61.2 A6 6 0 0 1 56 56 Z" fill="rgba(255,255,255,0.55)" />
          <circle cx="74" cy="42" r="2.5" fill="white" />
          <circle cx="84" cy="36" r="2" fill="white" />
          <circle cx="80" cy="28" r="1.6" fill="white" />
          <path d="M126 18 l2 5 5 2 -5 2 -2 5 -2-5 -5-2 5-2 Z" fill="rgba(255,255,255,0.85)" />
          <path d="M34 30 l1.6 4 4 1.6 -4 1.6 -1.6 4 -1.6-4 -4-1.6 4-1.6 Z" fill="rgba(255,255,255,0.6)" />
        </>
      )}
    </svg>
  )
}

export default function CoursesPage({ session }) {
  const navigate = useNavigate()
  const { isPro } = useSubscription()
  const [showUpgrade, setShowUpgrade] = useState(false)
  const [expanded, setExpanded] = useState(null)
  const [settings] = useState(() => getSettings())
  const durationLabel = (settings.childAge || 7) <= 6 ? '~15 min' : '~30 min'
  const { completions } = useCompletions()
  const speech = useSpeech(settings)

  // Read the course list aloud on arrival — a non-reader can't tell what's
  // here from text alone. Speaks once per visit.
  useEffect(() => {
    const names = COURSES.map((c) => c.title).join(', ')
    speech.speak(pickRandom(COURSES_INTRO)(names))
    return () => speech.stopSpeaking()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const handleExpand = (course) => {
    const opening = expanded !== course.id
    setExpanded(opening ? course.id : null)
    if (opening) {
      const lessonNames = course.lessons.map((l) => l.title).join(', ')
      speech.speak(`${course.title}. ${course.description}. It has ${course.lessons.length} lessons: ${lessonNames}.`)
    } else {
      speech.stopSpeaking()
    }
  }

  const handleLesson = (courseId, lessonId) => {
    if (!isPro) { setShowUpgrade(true); return }
    speech.stopSpeaking()
    navigate(`/lesson?course=${courseId}&lesson=${lessonId}`)
  }

  return (
    <div className={styles.page}>
      <div className={styles.bg} />

      <header className={styles.header}>
        <button className={styles.back} onClick={() => { speech.stopSpeaking(); navigate('/app') }}>← Back to Buddy</button>
        <h1 className={styles.title}>Courses</h1>
        <p className={styles.sub}>Interactive lessons taught by Buddy, just for you</p>
      </header>

      <div className={styles.grid}>
        {COURSES.map((course) => (
          <div key={course.id} className={styles.courseCard}>
            <div
              className={styles.courseHeader}
              style={{ background: `linear-gradient(135deg, ${course.color[0]}, ${course.color[1]})` }}
            >
              <CourseArt courseId={course.id} />
              {!isPro && <span className={styles.lockBadge}>🔒 Pro</span>}
            </div>
            <div className={styles.courseBody}>
              <h2 className={styles.courseName}>{course.title}</h2>
              <p className={styles.courseDesc}>{course.description}</p>
              <button
                className={styles.expandBtn}
                onClick={() => handleExpand(course)}
              >
                {expanded === course.id ? 'Hide lessons ▲' : `${course.lessons.length} lessons ▼`}
              </button>

              {expanded === course.id && (
                <ul className={styles.lessons}>
                  {course.lessons.map((lesson, i) => (
                    <li key={lesson.id}>
                      <button
                        className={styles.lessonBtn}
                        onClick={() => handleLesson(course.id, lesson.id)}
                      >
                        <span className={styles.lessonNum}>{i + 1}</span>
                        <span className={styles.lessonEmoji}>{lesson.emoji}</span>
                        <span className={styles.lessonTitle}>{lesson.title}</span>
                        {completions.has(`${course.id}:${lesson.id}`) && (
                          <span className={styles.lessonCheck}>✅</span>
                        )}
                        <span className={styles.lessonDuration}>{durationLabel}</span>
                        <span className={styles.lessonArrow}>{isPro ? '→' : '🔒'}</span>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        ))}
      </div>

      {showUpgrade && (
        <UpgradePrompt session={session} onClose={() => setShowUpgrade(false)} />
      )}
    </div>
  )
}
