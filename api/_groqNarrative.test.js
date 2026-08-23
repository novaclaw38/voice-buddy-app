import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { generateWeeklyNarrative } from './_groqNarrative.js'

describe('generateWeeklyNarrative', () => {
  const OLD_ENV = process.env
  beforeEach(() => {
    process.env = { ...OLD_ENV, GROQ_API_KEY: 'key123' }
  })
  afterEach(() => {
    process.env = OLD_ENV
    vi.restoreAllMocks()
  })

  it('returns null without calling fetch when GROQ_API_KEY is missing', async () => {
    process.env.GROQ_API_KEY = ''
    const fetchSpy = vi.spyOn(global, 'fetch')
    const result = await generateWeeklyNarrative('Alex', [], [])
    expect(result).toBeNull()
    expect(fetchSpy).not.toHaveBeenCalled()
  })

  it('returns the trimmed narrative text on success', async () => {
    vi.spyOn(global, 'fetch').mockResolvedValue({
      ok: true,
      json: async () => ({ choices: [{ message: { content: '  Great mission this week!  ' } }] }),
    })
    const result = await generateWeeklyNarrative('Alex', [{ title: 'Mission 01', masteryScore: 90 }], ['I love robots'])
    expect(result).toBe('Great mission this week!')
  })

  it('returns null when Groq responds with an error status', async () => {
    vi.spyOn(global, 'fetch').mockResolvedValue({ ok: false, status: 500 })
    const result = await generateWeeklyNarrative('Alex', [], [])
    expect(result).toBeNull()
  })

  it('returns null when the request throws', async () => {
    vi.spyOn(global, 'fetch').mockRejectedValue(new Error('timeout'))
    const result = await generateWeeklyNarrative('Alex', [], [])
    expect(result).toBeNull()
  })
})
