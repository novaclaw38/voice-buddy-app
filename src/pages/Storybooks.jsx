import { useState, useEffect } from 'react'
import { useSearchParams } from 'react-router-dom'
import { supabase } from '../lib/supabase.js'
import styles from './Storybooks.module.css'

export default function Storybooks() {
  const [searchParams] = useSearchParams()
  const cadetId = searchParams.get('cadet')
  const [storybooks, setStorybooks] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (cadetId) {
      loadStorybooks()
    }
  }, [cadetId])

  const loadStorybooks = async () => {
    const { data, error } = await supabase
      .from('storybooks')
      .select('*')
      .eq('cadet_id', cadetId)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Failed to load storybooks:', error)
    } else {
      setStorybooks(data || [])
    }
    setLoading(false)
  }

  if (loading) {
    return <div className={styles.loading}>Loading...</div>
  }

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <h1>Sunday Storybooks</h1>
        <p>AI-generated tactical adventures featuring your cadet</p>
      </header>

      <div className={styles.grid}>
        {storybooks.map((book) => (
          <div key={book.id} className={styles.card}>
            <div className={styles.cardHeader}>
              <h3>{book.title}</h3>
              <span className={styles.rankBadge}>Rank {book.rank_at_time}</span>
            </div>
            <div className={styles.cardBody}>
              <p>{book.content_json?.content?.slice(0, 150)}...</p>
            </div>
            <div className={styles.cardFooter}>
              <span>{new Date(book.created_at).toLocaleDateString()}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
