import { useState, useEffect, useCallback } from 'react'
import { fetchCatalog } from '../services/courseService.js'

// Shared by CoursesPage and the Parent dashboard's progress view. The catalog
// is small and rarely changes, so each consumer fetching once on mount is
// cheaper than threading it through context.
export function useCourseCatalog() {
  const [courses, setCourses] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [attempt, setAttempt] = useState(0)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError(null)
    fetchCatalog()
      .then((data) => { if (!cancelled) setCourses(data) })
      .catch((err) => { if (!cancelled) setError(err) })
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [attempt])

  const retry = useCallback(() => setAttempt((n) => n + 1), [])

  return { courses, loading, error, retry }
}
