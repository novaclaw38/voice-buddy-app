import { useNavigate, useLocation } from 'react-router-dom'
import { SUBJECTS, orderSubjects, lessonsForAge } from '../utils/subjects.js'
import { useSubscription } from '../hooks/useSubscription.jsx'
import { useProgress } from '../hooks/useProgress.js'
import { useCourseCatalog } from '../hooks/useCourseCatalog.js'
import { useSpeech } from '../hooks/useSpeech.js'
import UpgradePrompt from '../components/UpgradePrompt.jsx'
import BuddyAvatar from '../components/BuddyAvatar.jsx'
import SkipLink from '../components/SkipLink.jsx'
import { useState, useEffect, useMemo } from 'react'
import { getSettings } from '../utils/storage.js'
import { pickRandomDistinct } from '../utils/prompts.js'
import { IconArrowLeft, IconArrowRight, IconLock, IconCheck } from '../components/icons.jsx'
import styles from './CoursesPage.module.css'

const COURSES_INTRO = [
  (names) => `Here are your courses! ${names}. Tap one to hear what's inside!`,
  (names) => `Look what we can learn together! ${names}. Which one sounds fun?`,
  (names) => `So many things to discover — ${names}. Pick one and let's dive in!`,
  (names) => `Check out what's here — ${names}! Which one calls to you?`,
  (names) => `Ready to learn something new? ${names}. Tap one to peek inside!`,
  (names) => `Here's what we can explore — ${names}. What catches your eye?`,
]

// Module-level (not a component ref) so it survives remounts of this page —
// otherwise navigating away and back could repeat the same intro line.
const coursesIntroIndex = { current: -1 }

export default function CoursesPage({ session }) {
  const navigate = useNavigate()
  const location = useLocation()
  const [lessonNotFound, setLessonNotFound] = useState(() => !!location.state?.lessonNotFound)
  const { isPro } = useSubscription()
  const [showUpgrade, setShowUpgrade] = useState(false)
  const [expanded, setExpanded] = useState(null)
  const [settings] = useState(() => getSettings())
  // Per-lesson duration isn't real data — the catalog deliberately strips
  // step content (api/courses.js), so there's no per-lesson step count to
  // estimate from here. Rather than repeat a fabricated identical number on
  // every lesson row, show one course-level total, clearly averaged from
  // the real lesson count.
  const minutesPerLesson = (settings.childAge || 7) <= 6 ? 15 : 30
  const courseDurationLabel = (course) => `~${course.lessons.length * minutesPerLesson} min total`
  const { completions } = useProgress()
  const { courses: COURSES, loading: catalogLoading, error: catalogError, retry: retryCatalog } = useCourseCatalog()
  const speech = useSpeech(settings)

  const orderedSubjects = useMemo(
    () => orderSubjects(SUBJECTS).filter(s => COURSES.some(c => c.subject === s.id)),
    [COURSES]
  )

  // Read the course list aloud on arrival — a non-reader can't tell what's
  // here from text alone. Speaks once per visit.
  useEffect(() => {
    if (!COURSES.length) return
    const names = COURSES.map((c) => c.title).join(', ')
    speech.speak(pickRandomDistinct(COURSES_INTRO, coursesIntroIndex)(names))
    return () => speech.stopSpeaking()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [COURSES])

  useEffect(() => {
    if (!catalogError) return
    speech.speak("Oops, my books got a little mixed up! Let's try that again.")
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [catalogError])

  // Cleared from history state immediately so it doesn't reappear on a
  // later back/forward navigation to this same entry.
  useEffect(() => {
    if (!lessonNotFound) return
    navigate('.', { replace: true, state: {} })
    speech.speak("Hmm, that lesson wandered off! Here's everything else you can try.")
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

  if (catalogLoading) {
    return (
      <div className={styles.page}>
        <SkipLink />
        <div className={styles.bg} />
        <main id="main" className={styles.loadingState}>Finding your courses…</main>
      </div>
    )
  }

  return (
    <div className={styles.page}>
      <SkipLink />
      <div className={styles.bg} />

      <main id="main">
      <header className={styles.header}>
        <button className={styles.back} onClick={() => { speech.stopSpeaking(); navigate('/app') }}><IconArrowLeft size={17} /> Back to Buddy</button>
        <div className={styles.hero}>
          <BuddyAvatar status="happy" size={72} live={false} avatarColor={settings.avatarColor} type={settings.avatarType || 'bear'} costume={settings.costume} />
          <div className={styles.heroBubble}>
            <h1 className={styles.title}>Courses</h1>
            <p className={styles.sub}>Interactive lessons taught by Buddy, just for you</p>
          </div>
        </div>
      </header>

      {catalogError && (
        <div className={styles.catalogError} role="alert">
          <p className={styles.sub}>Oops, my books got a little mixed up! Let's try that again.</p>
          <button className={styles.retryBtn} onClick={retryCatalog}>Try again</button>
        </div>
      )}

      {lessonNotFound && (
        <div className={styles.catalogError} role="alert">
          <p className={styles.sub}>Hmm, that lesson wandered off! Here's everything else you can try.</p>
          <button className={styles.retryBtn} onClick={() => setLessonNotFound(false)}>Got it</button>
        </div>
      )}

      {orderedSubjects.map((subject) => (
        <section key={subject.id} className={styles.subjectSection}>
          <h2 className={styles.subjectHeading}>{subject.emoji} {subject.title}</h2>
          <div className={styles.grid}>
            {COURSES.filter(c => c.subject === subject.id).map((course) => (
              <div key={course.id} className={styles.courseCard}>
                <div
                  className={styles.courseHeader}
                  style={{ background: `linear-gradient(135deg, ${course.color[0]}, ${course.color[1]})` }}
                >
                  {/* Illustrated cover (FLUX-generated); the gradient behind it
                      doubles as the loading state. */}
                  <img
                    className={styles.courseCover}
                    src={`/courses/${course.id}.webp`}
                    alt=""
                    loading="lazy"
                    width="960"
                    height="549"
                  />
                  {!isPro && <span className={styles.lockBadge}><IconLock size={13} /> Pro</span>}
                </div>
                <div className={styles.courseBody}>
                  <h3 className={styles.courseName}>{course.title}</h3>
                  <p className={styles.courseDesc}>{course.description}</p>
                  <button
                    className={styles.expandBtn}
                    onClick={() => handleExpand(course)}
                    aria-expanded={expanded === course.id}
                    aria-controls={`lessons-${course.id}`}
                  >
                    {expanded === course.id ? 'Hide lessons ▲' : `${course.lessons.length} lessons — ${courseDurationLabel(course)} ▼`}
                  </button>

                  {expanded === course.id && (
                    <ul id={`lessons-${course.id}`} className={styles.lessons}>
                      {lessonsForAge(course, settings.childAge || 7).map((lesson, i) => (
                        <li key={lesson.id}>
                          <button
                            className={styles.lessonBtn}
                            onClick={() => handleLesson(course.id, lesson.id)}
                          >
                            <span className={styles.lessonNum}>{i + 1}</span>
                            <span className={styles.lessonEmoji}>{lesson.emoji}</span>
                            <span className={styles.lessonTextCol}>
                              <span className={styles.lessonTitle}>{lesson.title}</span>
                              {lesson.objective && <span className={styles.lessonObjective}>{lesson.objective}</span>}
                            </span>
                            {completions.has(`${course.id}:${lesson.id}`) && (
                              <span className={styles.lessonCheck}><IconCheck size={14} /></span>
                            )}
                            <span className={styles.lessonArrow}>{isPro ? <IconArrowRight size={16} /> : <IconLock size={16} label="Locked, upgrade to Pro" />}</span>
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </div>
            ))}
          </div>
        </section>
      ))}

      {showUpgrade && (
        <UpgradePrompt session={session} trigger="courses" onClose={() => setShowUpgrade(false)} />
      )}
    </main>
    </div>
  )
}
