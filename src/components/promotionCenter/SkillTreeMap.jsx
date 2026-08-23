import styles from './SkillTreeMap.module.css'

// Only Month 1 has real lesson content today (api/_courseData/robotics.js's
// 4 old-band missions) — Months 2-6 are future content-authoring work (a
// separate subproject) and must never fabricate lesson ids. See
// docs/superpowers/specs/2026-08-23-promotion-center-design.md.
const MONTHS = [
  { title: 'Operation Iron Blueprint', courseId: 'robotics', lessonIds: ['mission-neural-uplink', 'mission-sensory-array', 'mission-kinetic-deployment', 'mission-voltage-surge'] },
  { title: 'Operation Path-Finder', lessonIds: null },
  { title: 'Operation Code-Breaker', lessonIds: null },
  { title: 'Operation Heavy-Lift', lessonIds: null },
  { title: 'Operation Autonomous-Command', lessonIds: null },
  { title: 'Operation Omniscience', lessonIds: null },
]

function monthState(month, completions) {
  if (!month.lessonIds) return 'locked'
  const done = month.lessonIds.filter((id) => completions.has(`${month.courseId}:${id}`)).length
  if (done === 0) return 'locked'
  if (done === month.lessonIds.length) return 'completed'
  return 'in-progress'
}

export default function SkillTreeMap({ completions }) {
  return (
    <ol className={styles.tree}>
      {MONTHS.map((month, i) => {
        const state = monthState(month, completions)
        const done = month.lessonIds ? month.lessonIds.filter((id) => completions.has(`${month.courseId}:${id}`)).length : 0
        const total = month.lessonIds ? month.lessonIds.length : 0
        return (
          <li key={month.title} className={`${styles.node} ${styles[state.replace('-', '')]}`}>
            <span className={styles.nodeIndex}>{i + 1}</span>
            <span className={styles.nodeTitle}>{month.title}</span>
            {month.lessonIds ? (
              <span className={styles.nodeProgress}>{done} / {total}</span>
            ) : (
              <span className={styles.nodeProgress}>Coming soon</span>
            )}
          </li>
        )
      })}
    </ol>
  )
}
