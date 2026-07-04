import { useState, useEffect } from 'react'
import { isDaytime, getPartOfDay } from '../utils/timeOfDay.js'

// Re-checks once a minute so a session left open across dawn/dusk still
// flips the world and the greeting without needing a page reload.
export function useTimeOfDay() {
  const [now, setNow] = useState(() => new Date())

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 60000)
    return () => clearInterval(id)
  }, [])

  return { daytime: isDaytime(now), partOfDay: getPartOfDay(now) }
}
