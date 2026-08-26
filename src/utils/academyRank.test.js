import { describe, it, expect } from 'vitest'
import { getAcademyRank, modulesForTier, stateForStatus, RANK_TIERS, ACADEMY_WINGS, GRAND_MASTER, MAX_LEVEL } from './academyRank.js'

describe('getAcademyRank', () => {
  it('is Recruit tier with core-pulse and inner-ring modules at 0 XP', () => {
    const result = getAcademyRank(0)
    expect(result.level).toBe(1)
    expect(result.tier).toBe('Recruit')
    expect(result.rank).toBe('Recruit')
    expect(result.modules.map((m) => m.uniform)).toEqual(['uCoreIntensity', 'uInnerRing'])
    expect(result.color).toBe('#00F5FF')
  })

  it('matches deriveRank tier boundaries: Specialist at level 6 (500 XP)', () => {
    const result = getAcademyRank(500)
    expect(result.level).toBe(6)
    expect(result.tier).toBe('Specialist')
    expect(result.modules.map((m) => m.uniform)).toContain('uHalo')
    expect(result.modules.map((m) => m.uniform)).toContain('uEqStrength')
  })

  it('matches deriveRank tier boundaries: Commander at level 13 (1200 XP)', () => {
    const result = getAcademyRank(1200)
    expect(result.level).toBe(13)
    expect(result.tier).toBe('Commander')
    expect(result.modules.map((m) => m.uniform)).toContain('uDataHud')
    expect(result.color).toBe('#D4AF37')
  })

  it('caps rank label at Grand Master Specialist when level reaches MAX_LEVEL', () => {
    const result = getAcademyRank((MAX_LEVEL - 1) * 100)
    expect(result.level).toBe(MAX_LEVEL)
    expect(result.rank).toBe(GRAND_MASTER)
    expect(result.tier).toBe('Commander')
  })

  it('colorizes by wing when currentWing matches a known wing id', () => {
    const result = getAcademyRank(0, 'beast-intel')
    expect(result.wing.id).toBe('beast-intel')
    expect(result.color).toBe(result.wing.color)
  })

  it('falls back to tier color when currentWing is unknown or null', () => {
    const result = getAcademyRank(0, null)
    expect(result.wing).toBeNull()
    expect(result.color).toBe(RANK_TIERS.Recruit.color)
  })

  it('treats null/undefined XP as 0, same as deriveRank', () => {
    expect(getAcademyRank(null).level).toBe(1)
    expect(getAcademyRank(undefined).level).toBe(1)
  })
})

describe('modulesForTier', () => {
  it('returns the module keys for a known tier label', () => {
    expect(modulesForTier('Specialist')).toEqual(['core-pulse', 'inner-ring', 'secondary-halo', 'equalizer'])
  })

  it('falls back to the base modules for an unknown tier label', () => {
    expect(modulesForTier('NotATier')).toEqual(['core-pulse', 'inner-ring'])
  })
})

describe('stateForStatus', () => {
  it('maps thinking to processing', () => {
    expect(stateForStatus('thinking')).toBe('processing')
  })

  it('falls back to idle for an unknown status', () => {
    expect(stateForStatus('unknown')).toBe('idle')
  })
})

describe('ACADEMY_WINGS', () => {
  it('has exactly 5 wings with unique ids', () => {
    expect(ACADEMY_WINGS).toHaveLength(5)
    const ids = ACADEMY_WINGS.map((w) => w.id)
    expect(new Set(ids).size).toBe(5)
  })
})
