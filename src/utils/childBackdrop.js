// Alternating illustrated backdrop scenes for ChildPage — generated once
// via scripts/generate-backdrops.mjs (NVIDIA NIM) and stored as static
// assets. One is picked at random per browser session so the world looks
// different each time the child opens the app, without changing mid-session
// across the page's many remounts (parent settings, courses, lessons).
const BACKDROP_IDS = [
  'candy-castle',
  'rainbow-meadow',
  'starry-space',
  'coral-kingdom',
  'enchanted-forest',
]

const STORAGE_KEY = 'buddy_session_backdrop'

export function pickSessionBackdrop() {
  try {
    const stored = sessionStorage.getItem(STORAGE_KEY)
    if (stored && BACKDROP_IDS.includes(stored)) return `/backdrops/${stored}.webp`
  } catch (_) {
    // sessionStorage unavailable (private mode etc.) — fall through to a
    // fresh pick every mount rather than crashing.
  }
  const id = BACKDROP_IDS[Math.floor(Math.random() * BACKDROP_IDS.length)]
  try { sessionStorage.setItem(STORAGE_KEY, id) } catch (_) {}
  return `/backdrops/${id}.webp`
}
