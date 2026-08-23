import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { listChildren } from '../services/childrenService.js'
import { getActiveChildId, setActiveChildId } from '../utils/storage.js'
import { useProgress } from '../hooks/useProgress.js'
import RankStatusHeader from '../components/promotionCenter/RankStatusHeader.jsx'
import SkillTreeMap from '../components/promotionCenter/SkillTreeMap.jsx'
import TacticalPreview from '../components/promotionCenter/TacticalPreview.jsx'
import EliteAcademyCard from '../components/promotionCenter/EliteAcademyCard.jsx'
import SkipLink from '../components/SkipLink.jsx'
import { IconArrowLeft } from '../components/icons.jsx'
import styles from './PromotionCenterPage.module.css'

export default function PromotionCenterPage({ session }) {
  const navigate = useNavigate()
  const [children, setChildren] = useState([])
  const [activeId, setActiveId] = useState(() => getActiveChildId())
  const { completions } = useProgress()

  useEffect(() => {
    listChildren().then(setChildren).catch(() => {})
  }, [])

  const handleSwitchChild = (id) => {
    setActiveChildId(id)
    setActiveId(id)
  }

  const activeChild = children.find((c) => c.id === activeId) || children[0]

  return (
    <div className={styles.page}>
      <SkipLink />
      <main id="main">
        <div className={styles.header}>
          <button className={styles.backBtn} onClick={() => navigate('/parent')}>
            <IconArrowLeft size={16} /> Back to Dashboard
          </button>
          <h1 className={styles.title}>Promotion Center</h1>
        </div>

        <div className={styles.grid}>
          <aside className={styles.sidebar}>
            {activeChild && (
              <RankStatusHeader child={activeChild} allChildren={children} onSwitchChild={handleSwitchChild} />
            )}
          </aside>

          <section className={styles.hub}>
            <h2 className={styles.hubTitle}>6-Month Skill Tree</h2>
            <SkillTreeMap completions={completions} />
          </section>

          <aside className={styles.intel}>
            <TacticalPreview childName={activeChild?.name} />
            <EliteAcademyCard session={session} />
          </aside>
        </div>
      </main>
    </div>
  )
}
