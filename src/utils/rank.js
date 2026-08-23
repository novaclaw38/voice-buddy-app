// Rank/level are always derived from total_xp, never stored separately —
// one source of truth, same pattern as BAND_BY_AGE deriving an age band
// from a raw age (see src/utils/subjects.js). See
// docs/superpowers/specs/2026-08-23-promotion-center-design.md.
export const XP_PER_LEVEL = 100

export function deriveRank(totalXp) {
  const xp = totalXp || 0
  const level = Math.floor(xp / XP_PER_LEVEL) + 1
  const rank = level <= 5 ? 'Recruit' : level <= 12 ? 'Specialist' : 'Commander'
  const xpIntoLevel = xp % XP_PER_LEVEL
  const xpToNextLevel = XP_PER_LEVEL - xpIntoLevel
  return { level, rank, xpIntoLevel, xpToNextLevel }
}
