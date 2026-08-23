import { useState, useEffect } from 'react'
import { fetchChildRank } from '../services/rankService.js'
import { deriveRank } from '../utils/rank.js'

export function useChildRank(childId) {
  const [totalXp, setTotalXp] = useState(0)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!childId) { setLoading(false); return }
    let cancelled = false
    setLoading(true)
    fetchChildRank(childId).then((row) => {
      if (cancelled) return
      setTotalXp(row?.totalXp || 0)
      setLoading(false)
    })
    return () => { cancelled = true }
  }, [childId])

  return { totalXp, loading, ...deriveRank(totalXp) }
}
