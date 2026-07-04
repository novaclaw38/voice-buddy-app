import { useState, useEffect, useMemo } from 'react'
import { isDaytime, getPartOfDay } from '../utils/timeOfDay.js'

const VALID_REALMS = ['morning', 'afternoon', 'evening', 'night']

// Re-checks once a minute so a session left open across dawn/dusk still
// flips the world and the greeting without needing a page reload.
export function useTimeOfDay() {
  const [now, setNow] = useState(() => new Date())

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 60000)
    return () => clearInterval(id)
  }, [])

  // Dev-only preview hook: ?realm=morning|afternoon|evening|night on the
  // /dev-child route forces a realm so all 4 sky states can be eyeballed
  // without waiting for real clock time. Inert for real users — nothing
  // ever links to, persists, or writes this query param.
  const realmOverride = useMemo(() => {
    if (!import.meta.env.DEV || typeof window === 'undefined') return null
    const p = new URLSearchParams(window.location.search).get('realm')
    return VALID_REALMS.includes(p) ? p : null
  }, [])

  if (realmOverride) {
    return { daytime: realmOverride === 'afternoon', partOfDay: realmOverride }
  }

  return { daytime: isDaytime(now), partOfDay: getPartOfDay(now) }
}
