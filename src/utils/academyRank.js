/**
 * Academy Rank Progression Model
 *
 * Maps a cadet's total XP → rank tier + the set of "Visual Modules" the
 * Tactical Orb should display. Each module unlocks progressively as the
 * cadet climbs from Recruit to Grand Master Specialist.
 *
 * The tier boundaries mirror deriveRank() in rank.js (level = floor(xp/100)+1;
 * Recruit 1–5, Specialist 6–12, Commander 13+), but this module adds the
 * 6-month Wing lattice and the Orb-specific visual unlocks that deriveRank()
 * deliberately keeps free of presentation concerns.
 */

// ── The 5 Academy Wings ──────────────────────────────────────────────────
export const ACADEMY_WINGS = [
  {
    id: 'robotics',
    title: 'ROBOTICS WING',
    tagline: 'Build the Brains',
    color: '#00F5FF', // Tactical Teal
    months: [1, 2],
  },
  {
    id: 'beast-intel',
    title: 'BEAST INTELLIGENCE DIVISION',
    tagline: 'Decode the Wild',
    color: '#FF8A00', // Alert Orange
    months: [1, 2],
  },
  {
    id: 'field-rations',
    title: 'FIELD RATIONS OPS',
    tagline: 'Fuel the Mission',
    color: '#D4AF37', // Academy Gold
    months: [3, 4],
  },
  {
    id: 'env-recon',
    title: 'ENVIRONMENTAL RECON',
    tagline: 'Map the Sector',
    color: '#9D50BB', // Buddy Purple (promotion sub-brand)
    months: [3, 4],
  },
  {
    id: 'botany-ops',
    title: 'BOTANY OPS',
    tagline: 'Grow the Future',
    color: '#27AE60', // Academy Green
    months: [5, 6],
  },
]

// ── Rank tiers ───────────────────────────────────────────────────────────
// Aligns with deriveRank(): Recruit (1–5), Specialist (6–12), Commander (13+)
export const RANK_TIERS = {
  Recruit: {
    label: 'Recruit',
    levels: [1, 2, 3, 4, 5],
    color: '#00F5FF',
    glow: 'var(--rank-recruit-glow, rgba(0,245,255,0.4))',
    modules: ['core-pulse', 'inner-ring'],
  },
  Specialist: {
    label: 'Specialist',
    levels: [6, 7, 8, 9, 10, 11, 12],
    color: '#FF8A00',
    glow: 'var(--rank-specialist-glow, rgba(255,138,0,0.5))',
    modules: ['core-pulse', 'inner-ring', 'secondary-halo', 'equalizer'],
  },
  Commander: {
    label: 'Commander',
    levels: [13, 14, 15, 16, 17, 18, 19, 20],
    color: '#D4AF37',
    glow: 'var(--rank-commander-glow, rgba(212,175,55,0.6))',
    modules: ['core-pulse', 'inner-ring', 'secondary-halo', 'equalizer', 'scanlines', 'data-hud'],
  },
}

// Grand Master Specialist is the aspirational cap at max level
export const GRAND_MASTER = 'Grand Master Specialist'
export const MAX_LEVEL = 20

// ── Module registry ───────────────────────────────────────────────────────
// Each entry describes what the Orb renders. The shader uniforms consume these.
export const ORB_MODULES = {
  'core-pulse': {
    name: 'Core Pulse',
    description: 'The central core breathes with voice input.',
    uniform: 'uCoreIntensity',
    default: 0.5,
  },
  'inner-ring': {
    name: 'Inner Ring',
    description: 'A spinning scanline ring around the core.',
    uniform: 'uInnerRing',
    default: 0.3,
  },
  'secondary-halo': {
    name: 'Secondary Halo',
    description: 'A secondary ring that unlocks at Specialist rank.',
    uniform: 'uHalo',
    default: 0.0,
  },
  'equalizer': {
    name: 'Equalizer Bars',
    description: 'Audio-reactive bars when speaking.',
    uniform: 'uEqStrength',
    default: 0.0,
  },
  'scanlines': {
    name: 'Scanline Overlay',
    description: 'Radial scanline overlay for Commander rank.',
    uniform: 'uScanline',
    default: 0.0,
  },
  'data-hud': {
    name: 'Data HUD Rings',
    description: 'Floating data rings around the orb for max rank.',
    uniform: 'uDataHud',
    default: 0.0,
  },
}

/**
 * Derive the rank tier + visual modules for a given total XP.
 * Returns { level, tier, rank, modules, color, glow, wing }.
 *
 * @param {number} totalXp
 * @param {string|null} currentWing — optional active wing id to colorize the orb
 */
export function getAcademyRank(totalXp, currentWing = null) {
  const xp = Number(totalXp) || 0
  const level = Math.floor(xp / 100) + 1

  let tier
  if (level <= 5) tier = RANK_TIERS.Recruit
  else if (level <= 12) tier = RANK_TIERS.Specialist
  else tier = RANK_TIERS.Commander

  const modules = tier.modules.map((m) => ORB_MODULES[m])

  // If a wing is active, override the core color to that wing's color
  const wing = currentWing
    ? ACADEMY_WINGS.find((w) => w.id === currentWing)
    : null

  return {
    level,
    tier: tier.label,
    rank: level >= MAX_LEVEL ? GRAND_MASTER : tier.label,
    modules,
    color: wing ? wing.color : tier.color,
    glow: tier.glow,
    wing,
  }
}

/**
 * Return the module keys to activate for a given rank tier.
 */
export function modulesForTier(tierLabel) {
  return RANK_TIERS[tierLabel]?.modules || ['core-pulse', 'inner-ring']
}

/**
 * Map a mission status string to an Orb visual state.
 * Mirrors the externalStatus values consumed by the old TacticalOrb.
 */
export function stateForStatus(status) {
  const map = {
    idle: 'idle',
    listening: 'listening',
    processing: 'processing',
    speaking: 'speaking',
    thinking: 'processing',
    happy: 'idle',
    confused: 'idle',
  }
  return map[status] || 'idle'
}
