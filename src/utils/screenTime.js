// Daily screen-time tracking (Pro feature). Keyed by child + local date so
// it resets naturally at midnight with no server/cron needed.

function todayKey() {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function storageKey(childId) {
  return `buddy_screentime::${childId || 'default'}::${todayKey()}`
}

export function getTodayMinutesUsed(childId) {
  try {
    return Number(localStorage.getItem(storageKey(childId))) || 0
  } catch {
    return 0
  }
}

export function addMinutesUsed(childId, minutes) {
  const next = getTodayMinutesUsed(childId) + minutes
  try {
    localStorage.setItem(storageKey(childId), String(next))
  } catch { /* storage unavailable — worst case the limit under-counts today */ }
  return next
}

// A parent entering their PIN from the wind-down screen grants the rest of
// today back, rather than a fixed bonus — simplest mental model for "my
// grown-up said it's OK".
export function resetTodayUsage(childId) {
  try {
    localStorage.removeItem(storageKey(childId))
  } catch { /* no-op */ }
}

// ── Policy ──────────────────────────────────────────────────────────────
// The screen-time rule itself: warn with 5 minutes left, wind down at 0.
// Pure and side-effect-free on purpose — ChildPage's ticking effect owns
// how often to check (tick cadence is a polling detail, not part of the
// rule) and whether a warning has already been spoken this session (that's
// view-state about a side effect, not a fact about the policy).
export const WARNING_THRESHOLD_MINUTES = 5

export function evaluateScreenTime(minutesUsed, dailyLimitMinutes) {
  const minutesLeft = dailyLimitMinutes - minutesUsed
  return {
    minutesLeft,
    shouldWarn: minutesLeft <= WARNING_THRESHOLD_MINUTES,
    shouldWindDown: minutesLeft <= 0,
  }
}
