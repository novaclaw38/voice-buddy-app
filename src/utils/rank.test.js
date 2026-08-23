import { describe, it, expect } from 'vitest'
import { deriveRank } from './rank.js'

describe('deriveRank', () => {
  it('starts at level 1, Recruit, with 0 XP', () => {
    expect(deriveRank(0)).toEqual({ level: 1, rank: 'Recruit', xpIntoLevel: 0, xpToNextLevel: 100 })
  })

  it('stays level 1 until 100 XP', () => {
    expect(deriveRank(99)).toEqual({ level: 1, rank: 'Recruit', xpIntoLevel: 99, xpToNextLevel: 1 })
  })

  it('reaches level 2 at exactly 100 XP', () => {
    expect(deriveRank(100)).toEqual({ level: 2, rank: 'Recruit', xpIntoLevel: 0, xpToNextLevel: 100 })
  })

  it('is still Recruit at level 5 (400-499 XP)', () => {
    expect(deriveRank(400).rank).toBe('Recruit')
    expect(deriveRank(400).level).toBe(5)
  })

  it('becomes Specialist at level 6 (500 XP)', () => {
    expect(deriveRank(500)).toEqual({ level: 6, rank: 'Specialist', xpIntoLevel: 0, xpToNextLevel: 100 })
  })

  it('is still Specialist at level 12 (1100-1199 XP)', () => {
    expect(deriveRank(1100).rank).toBe('Specialist')
    expect(deriveRank(1100).level).toBe(12)
  })

  it('becomes Commander at level 13 (1200 XP)', () => {
    expect(deriveRank(1200)).toEqual({ level: 13, rank: 'Commander', xpIntoLevel: 0, xpToNextLevel: 100 })
  })

  it('treats null/undefined XP as 0', () => {
    expect(deriveRank(null)).toEqual({ level: 1, rank: 'Recruit', xpIntoLevel: 0, xpToNextLevel: 100 })
    expect(deriveRank(undefined)).toEqual({ level: 1, rank: 'Recruit', xpIntoLevel: 0, xpToNextLevel: 100 })
  })
})
