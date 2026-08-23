import { describe, it, expect, vi, beforeEach } from 'vitest'
import { formatHistoryMemory, formatLessonsMemory, selectModePrompt, selectModeIntros, maybeFlagEmotionalSignal } from './useChat.js'
import { PROMPTS, MODE_INTROS, MODE_INTROS_TACTICAL } from '../utils/prompts.js'

const mocks = vi.hoisted(() => ({
  fetchTodaySignal: vi.fn(),
  upsertSignal: vi.fn(),
  chatCompletion: vi.fn(),
  getActiveChildId: vi.fn(),
}))
vi.mock('../services/signalsService.js', () => ({
  fetchTodaySignal: mocks.fetchTodaySignal,
  upsertSignal: mocks.upsertSignal,
}))
vi.mock('../services/chatService.js', () => ({
  chatCompletion: mocks.chatCompletion,
}))
vi.mock('../utils/storage.js', async (importOriginal) => ({
  ...(await importOriginal()),
  getActiveChildId: mocks.getActiveChildId,
}))

describe('formatHistoryMemory', () => {
  it('returns an empty string when there are no entries', () => {
    expect(formatHistoryMemory([], 'Mia')).toBe('')
    expect(formatHistoryMemory(null, 'Mia')).toBe('')
    expect(formatHistoryMemory(undefined, 'Mia')).toBe('')
  })

  it('quotes the most recent entries by name, mode included', () => {
    const block = formatHistoryMemory(
      [{ user_text: 'tell me about dinosaurs', mode: 'chat' }],
      'Mia'
    )
    expect(block).toContain('RECENT MEMORIES')
    expect(block).toContain('Mia')
    expect(block).toContain('"tell me about dinosaurs" (chat mode)')
  })

  it('only quotes the 5 most recent entries even if more are given', () => {
    const entries = Array.from({ length: 8 }, (_, i) => ({ user_text: `entry ${i}`, mode: 'chat' }))
    const block = formatHistoryMemory(entries, 'Mia')
    expect(block).toContain('entry 0')
    expect(block).toContain('entry 4')
    expect(block).not.toContain('entry 5')
  })

  it('truncates a single entry to 100 characters', () => {
    const longText = 'x'.repeat(150)
    const block = formatHistoryMemory([{ user_text: longText, mode: 'chat' }], 'Mia')
    expect(block).toContain('x'.repeat(100))
    expect(block).not.toContain('x'.repeat(101))
  })

  it('appends a TOPICS block only when extractTopics finds a repeated topic', () => {
    const withRepeat = formatHistoryMemory(
      [
        { user_text: 'I love dinosaurs', mode: 'chat' },
        { user_text: 'dinosaurs are so cool', mode: 'chat' },
      ],
      'Mia'
    )
    expect(withRepeat).toContain('TOPICS')
    expect(withRepeat).toContain('dinosaurs')

    const withoutRepeat = formatHistoryMemory(
      [{ user_text: 'hello there', mode: 'chat' }],
      'Mia'
    )
    expect(withoutRepeat).not.toContain('TOPICS')
  })

  it('tolerates a missing user_text on an entry', () => {
    expect(() => formatHistoryMemory([{ mode: 'chat' }], 'Mia')).not.toThrow()
  })
})

describe('selectModePrompt', () => {
  it('picks the story prompt for story mode', () => {
    expect(selectModePrompt('story')).toBe(PROMPTS.story)
  })

  it('falls back to the chat prompt for chat mode or anything unrecognized', () => {
    expect(selectModePrompt('chat')).toBe(PROMPTS.chat)
    expect(selectModePrompt('nonsense')).toBe(PROMPTS.chat)
    expect(selectModePrompt(undefined)).toBe(PROMPTS.chat)
  })
})

describe('selectModeIntros', () => {
  it('picks the gentle intro pool under the old age band', () => {
    expect(selectModeIntros('chat', 7)).toBe(MODE_INTROS.chat)
    expect(selectModeIntros('story', 8)).toBe(MODE_INTROS.story)
  })

  it('picks the tactical intro pool at 9+', () => {
    expect(selectModeIntros('chat', 9)).toBe(MODE_INTROS_TACTICAL.chat)
    expect(selectModeIntros('story', 10)).toBe(MODE_INTROS_TACTICAL.story)
  })

  it('falls back to chat pool for an unrecognized mode, gentle or tactical', () => {
    expect(selectModeIntros('nonsense', 7)).toBe(MODE_INTROS.chat)
    expect(selectModeIntros('nonsense', 10)).toBe(MODE_INTROS_TACTICAL.chat)
  })

  it('defaults to the middle band (gentle) when age is not given', () => {
    expect(selectModeIntros('chat', undefined)).toBe(MODE_INTROS.chat)
  })
})

describe('formatLessonsMemory', () => {
  it('returns an empty string when there are no lesson rows', () => {
    expect(formatLessonsMemory([], 'Mia')).toBe('')
    expect(formatLessonsMemory(null, 'Mia')).toBe('')
  })

  it('lists each lesson by id and course, by name', () => {
    const block = formatLessonsMemory(
      [
        { lesson_id: 'counting-1', course_id: 'math' },
        { lesson_id: 'letters-a', course_id: 'reading' },
      ],
      'Mia'
    )
    expect(block).toContain('LESSONS')
    expect(block).toContain('Mia')
    expect(block).toContain('counting-1 (math)')
    expect(block).toContain('letters-a (reading)')
  })
})

describe('maybeFlagEmotionalSignal', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.getActiveChildId.mockReturnValue('c1')
  })

  it('does nothing when the text has no concern keyword', async () => {
    await maybeFlagEmotionalSignal('I love dinosaurs', 'Mia')
    expect(mocks.fetchTodaySignal).not.toHaveBeenCalled()
    expect(mocks.chatCompletion).not.toHaveBeenCalled()
  })

  it('skips classification when a signal already exists for today', async () => {
    mocks.fetchTodaySignal.mockResolvedValue({ id: 's1' })
    await maybeFlagEmotionalSignal('I feel so sad', 'Mia')
    expect(mocks.chatCompletion).not.toHaveBeenCalled()
  })

  it('calls chatCompletion with classify-checkin mode and upserts on a confirmed concern', async () => {
    mocks.fetchTodaySignal.mockResolvedValue(null)
    mocks.chatCompletion.mockResolvedValue('{"concern":true,"blurb":"Buddy noticed Mia seemed sad today."}')
    await maybeFlagEmotionalSignal('I feel so sad', 'Mia')
    expect(mocks.chatCompletion).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ mode: 'classify-checkin' })
    )
    expect(mocks.upsertSignal).toHaveBeenCalledWith({ childId: 'c1', blurb: 'Buddy noticed Mia seemed sad today.' })
  })

  it('does not upsert when the classifier returns concern:false', async () => {
    mocks.fetchTodaySignal.mockResolvedValue(null)
    mocks.chatCompletion.mockResolvedValue('{"concern":false,"blurb":""}')
    await maybeFlagEmotionalSignal('I feel so sad', 'Mia')
    expect(mocks.upsertSignal).not.toHaveBeenCalled()
  })

  it('never throws — a malformed classifier response is swallowed', async () => {
    mocks.fetchTodaySignal.mockResolvedValue(null)
    mocks.chatCompletion.mockResolvedValue('not json at all')
    await expect(maybeFlagEmotionalSignal('I feel so sad', 'Mia')).resolves.toBeUndefined()
    expect(mocks.upsertSignal).not.toHaveBeenCalled()
  })

  it('never throws when chatCompletion itself rejects', async () => {
    mocks.fetchTodaySignal.mockResolvedValue(null)
    mocks.chatCompletion.mockRejectedValue(new Error('network down'))
    await expect(maybeFlagEmotionalSignal('I feel so sad', 'Mia')).resolves.toBeUndefined()
  })
})
