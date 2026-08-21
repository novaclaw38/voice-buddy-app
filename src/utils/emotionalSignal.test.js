import { describe, it, expect } from 'vitest'
import { hasConcernSignal, buildClassifyPrompt } from './emotionalSignal.js'

describe('hasConcernSignal', () => {
  it('returns false for ordinary chatter', () => {
    expect(hasConcernSignal('I love dinosaurs so much!')).toBe(false)
  })

  it('returns true when a concern word is present', () => {
    expect(hasConcernSignal('I feel really sad today')).toBe(true)
  })

  it('matches case-insensitively', () => {
    expect(hasConcernSignal('I am SO Scared of the dark')).toBe(true)
  })

  it('does not match a concern word as a substring of another word', () => {
    expect(hasConcernSignal('I made a sandcastle')).toBe(false)
  })

  it('returns false for empty, null, or undefined input', () => {
    expect(hasConcernSignal('')).toBe(false)
    expect(hasConcernSignal(null)).toBe(false)
    expect(hasConcernSignal(undefined)).toBe(false)
  })
})

describe('buildClassifyPrompt', () => {
  it('includes the child name and asks for strict JSON with concern/blurb keys', () => {
    const prompt = buildClassifyPrompt('Mia')
    expect(prompt).toContain('Mia')
    expect(prompt).toContain('"concern"')
    expect(prompt).toContain('"blurb"')
  })

  it('falls back to a generic phrase when no name is given', () => {
    expect(buildClassifyPrompt(undefined)).toContain('a child')
  })
})
