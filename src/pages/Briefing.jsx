import { useState, useEffect } from 'react'
import { useSearchParams } from 'react-router-dom'
import { supabase } from '../lib/supabase.js'
import styles from './Briefing.module.css'

const RANKS = ['Recruit', 'Specialist', 'Corporal', 'Sergeant', 'Lieutenant', 'Commander']

const BRIEFINGS = {
  1: [
    { title: 'Mission Safety Protocols', content: 'Learn the basics of staying safe during missions.' },
    { title: 'Discipline & Focus', content: 'Training your mind to stay focused on objectives.' },
    { title: 'Basic Navigation', content: 'Understanding directions and maps.' },
  ],
  2: [
    { title: 'Tactical Skills Overview', content: 'Introduction to specialized tactical operations.' },
    { title: 'Signal Analysis', content: 'Reading and interpreting communication signals.' },
    { title: 'Reconnaissance Basics', content: 'Gathering intelligence effectively.' },
  ],
  3: [
    { title: 'Leadership Fundamentals', content: 'Taking charge and guiding your team.' },
    { title: 'Responsibility & Duty', content: 'Understanding your role in the bigger picture.' },
    { title: 'Team Coordination', content: 'Working together to achieve objectives.' },
  ],
  4: [
    { title: 'Advanced Problem Solving', content: 'Tackling complex tactical challenges.' },
    { title: 'Strategic Planning', content: 'Developing multi-step mission plans.' },
    { title: 'Crisis Management', content: 'Staying calm under pressure.' },
  ],
  5: [
    { title: 'Strategic Thinking', content: 'Seeing the bigger picture in operations.' },
    { title: 'Resource Management', content: 'Allocating resources efficiently.' },
    { title: 'Long-term Planning', content: 'Setting and achieving long-term goals.' },
  ],
  6: [
    { title: 'Commander\'s Oath', content: 'The final commitment to leadership.' },
    { title: 'Graduation Protocol', content: 'Preparing for your final mission.' },
    { title: 'Legacy & Mentorship', content: 'Guiding the next generation.' },
  ],
}

export default function Briefing() {
  const [searchParams] = useSearchParams()
  const cadetId = searchParams.get('cadet')
  const [cadet, setCadet] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (cadetId) {
      loadCadet()
    }
  }, [cadetId])

  const loadCadet = async () => {
    const { data, error } = await supabase
      .from('cadets')
      .select('*')
      .eq('id', cadetId)
      .single()

    if (error) {
      console.error('Failed to load cadet:', error)
    } else {
      setCadet(data)
    }
    setLoading(false)
  }

  if (loading) {
    return <div className={styles.loading}>Loading...</div>
  }

  if (!cadet) {
    return <div className={styles.error}>Cadet not found</div>
  }

  const briefings = BRIEFINGS[cadet.current_rank] || BRIEFINGS[1]

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <h1>Weekly Briefing</h1>
        <p>Rank {cadet.current_rank}: {RANKS[cadet.current_rank - 1]} — Tactical Lessons</p>
      </header>

      <div className={styles.briefingList}>
        {briefings.map((briefing, i) => (
          <div key={i} className={styles.briefingCard}>
            <div className={styles.briefingNumber}>{i + 1}</div>
            <div className={styles.briefingContent}>
              <h3>{briefing.title}</h3>
              <p>{briefing.content}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
