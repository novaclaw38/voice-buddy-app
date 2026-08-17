import { useProgress, masteryTier } from '../../hooks/useProgress.js'
import { useCourseCatalog } from '../../hooks/useCourseCatalog.js'
import { SUBJECTS } from '../../utils/subjects.js'
import shared from './shared.module.css'
import styles from './LearningTab.module.css'

const TIER_ICON = { gold: '🥇', silver: '🥈', bronze: '🥉' }

export default function LearningTab({ childName }) {
  const { completions, records } = useProgress()
  const { courses: COURSES } = useCourseCatalog()

  const learned = [...completions]
    .map((key) => {
      const [courseId, lessonId] = key.split(':')
      const course = COURSES.find((c) => c.id === courseId)
      const lesson = course?.lessons.find((l) => l.id === lessonId)
      const record = records.get(key)
      return lesson ? { course, lesson, ...record } : null
    })
    .filter(Boolean)
    .sort((a, b) => new Date(b.completedAt || 0) - new Date(a.completedAt || 0))
    .slice(0, 8)

  return (
    <div className={shared.section}>
      <h2 className={shared.sectionTitle}>Learning Progress</h2>
      <p className={shared.hint} style={{ marginBottom: 20 }}>
        What {childName || 'your child'} has completed in Courses so far.
      </p>
      <div className={styles.courseProgressList}>
        {COURSES.map((course) => {
          const done = course.lessons.filter((l) => completions.has(`${course.id}:${l.id}`)).length
          const total = course.lessons.length
          const pct = total ? Math.round((done / total) * 100) : 0
          return (
            <div key={course.id} className={styles.courseProgressCard}>
              <div className={styles.courseProgressHeader}>
                <span className={styles.courseProgressName}>{course.title}</span>
                <span className={styles.courseProgressCount}>{done}/{total} lessons</span>
              </div>
              <div className={styles.progressBarTrack}>
                <div className={styles.progressBarFill} style={{ transform: `scaleX(${pct / 100})` }} />
              </div>
            </div>
          )
        })}
      </div>

      {learned.length > 0 && (
        <div style={{ marginTop: 28 }}>
          <h3 className={shared.sectionTitle} style={{ fontSize: 15 }}>Recently Learned</h3>
          <p className={shared.hint} style={{ marginBottom: 14 }}>
            What {childName || 'your child'} can actually do now — not just what they clicked through.
          </p>
          <ul className={styles.courseProgressList}>
            {learned.map(({ course, lesson, masteryScore }) => {
              const tier = masteryTier(masteryScore)
              const subject = SUBJECTS.find((s) => s.id === course.subject)
              return (
                <li key={`${course.id}:${lesson.id}`} className={styles.courseProgressCard}>
                  <div className={styles.courseProgressHeader}>
                    <span className={styles.courseProgressName}>
                      {subject?.emoji} {lesson.objective || lesson.title}
                    </span>
                    {tier && <span>{TIER_ICON[tier]}</span>}
                  </div>
                </li>
              )
            })}
          </ul>
        </div>
      )}
    </div>
  )
}
