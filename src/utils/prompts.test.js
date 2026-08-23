import { describe, it, expect } from 'vitest'
import { PROMPTS, MODE_INTROS, MODE_INTROS_TACTICAL } from './prompts.js'

describe('PROMPTS age targeting', () => {
  it('addresses the child at their real age, not a hardcoded 6 (gentle persona, middle band)', () => {
    const prompt = PROMPTS.chat('Ada', 'Buddy', 7)
    expect(prompt).toContain('7-year-old')
    expect(prompt).not.toContain('6-year-old')
  })

  it('gentle persona is used under the old-band age threshold', () => {
    const prompt = PROMPTS.chat('Ada', 'Buddy', 8)
    expect(prompt).not.toContain('Recruit')
  })
})

describe('tactical persona (old band, 9+)', () => {
  it('addresses the child as Recruit and uses mission framing', () => {
    const prompt = PROMPTS.chat('Ada', 'Buddy', 9)
    expect(prompt).toContain('Recruit')
    expect(prompt).toMatch(/mission/i)
  })

  it('preserves the safety escalation instruction verbatim', () => {
    const gentle = PROMPTS.chat('Ada', 'Buddy', 7)
    const tactical = PROMPTS.chat('Ada', 'Buddy', 9)
    const safetyLine = 'That sounds really important — please go find a grown-up right now and tell them!'
    expect(gentle).toContain(safetyLine)
    expect(tactical).toContain(safetyLine)
  })

  it('applies to story mode as well as chat', () => {
    const prompt = PROMPTS.story('Ada', 'Buddy', 10)
    expect(prompt).toContain('Recruit')
    expect(prompt).toMatch(/mission/i)
  })

  it('offers several tactical intro pools with no repeats-required minimum', () => {
    expect(MODE_INTROS_TACTICAL.chat.length).toBeGreaterThanOrEqual(3)
    expect(MODE_INTROS_TACTICAL.story.length).toBeGreaterThanOrEqual(3)
    expect(MODE_INTROS_TACTICAL.chat[0]('Ada', 'Buddy')).toMatch(/Ada/)
  })

  it('has no sing key (sing mode was removed)', () => {
    expect(PROMPTS.sing).toBeUndefined()
    expect(MODE_INTROS.sing).toBeUndefined()
    expect(MODE_INTROS_TACTICAL.sing).toBeUndefined()
  })
})

describe('story mode prompt', () => {
  it('exists and instructs interactive, age-appropriate storytelling', () => {
    const prompt = PROMPTS.story('Ada', 'Buddy', 7)
    expect(prompt).toMatch(/story/i)
    expect(prompt).toMatch(/Ada/)
    // Stories must pause for the child rather than monologue to the end.
    expect(prompt).toMatch(/ask|choose|what happens next/i)
  })

  it('offers several story intros so it does not repeat verbatim', () => {
    expect(MODE_INTROS.story.length).toBeGreaterThanOrEqual(3)
    expect(MODE_INTROS.story[0]('Ada', 'Buddy')).toMatch(/Ada/)
  })
})
