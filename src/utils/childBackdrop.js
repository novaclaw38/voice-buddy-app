// Alternating illustrated backdrop scenes for ChildPage — generated via
// scripts/generate-backdrops.mjs (NVIDIA NIM) and stored as static assets.
//
// Scene choice is tied to two things, not pure randomness:
//   1. Time of day — each scene is tagged with the partOfDay buckets its
//      lighting actually matches, so a bright sunlit meadow never shows up
//      at midnight behind a "time for a little break" message.
//   2. What Buddy is doing — 'story' mode prefers a storybook-like scene
//      instead of the general rotation, so the world reflects the activity
//      rather than being static wallpaper.
const SCENES = {
  'candy-castle':     { partsOfDay: ['morning', 'afternoon', 'evening'] },
  'rainbow-meadow':    { partsOfDay: ['morning', 'afternoon'] },
  'starry-space':      { partsOfDay: ['night'] },
  'coral-kingdom':     { partsOfDay: ['afternoon', 'evening'] },
  'enchanted-forest':  { partsOfDay: ['evening', 'night'] },
}

// Preferred scenes per chat mode, in priority order, filtered down to
// whichever of those actually suit the current time of day. Modes not
// listed here (e.g. 'chat') fall through to the general time-gated
// rotation below.
const MODE_SCENE_PREFERENCE = {
  story: ['enchanted-forest', 'starry-space'],
}

const STORAGE_KEY = 'buddy_session_backdrop'

function scenesForPartOfDay(partOfDay) {
  const matches = Object.keys(SCENES).filter((id) => SCENES[id].partsOfDay.includes(partOfDay))
  return matches.length ? matches : Object.keys(SCENES)
}

function toUrl(id) {
  return `/backdrops/${id}.webp`
}

// Session-stable random pick for the general (non-mode-specific) rotation.
// Re-picks if the stored scene no longer fits the current time-of-day
// bucket — the app can stay open long enough to cross a realm boundary
// (afternoon into evening), and a stale pick would look as wrong as never
// gating by time at all.
function pickSessionScene(candidates) {
  try {
    const stored = sessionStorage.getItem(STORAGE_KEY)
    if (stored && candidates.includes(stored)) return stored
  } catch (_) {
    // sessionStorage unavailable (private mode etc.) — fall through to a
    // fresh pick every mount rather than crashing.
  }
  const id = candidates[Math.floor(Math.random() * candidates.length)]
  try { sessionStorage.setItem(STORAGE_KEY, id) } catch (_) {}
  return id
}

export function pickBackdropForContext(mode, partOfDay) {
  const dayMatches = scenesForPartOfDay(partOfDay)
  const preferred = MODE_SCENE_PREFERENCE[mode]
  if (preferred) {
    const match = preferred.find((id) => dayMatches.includes(id))
    if (match) return toUrl(match)
  }
  return toUrl(pickSessionScene(dayMatches))
}
