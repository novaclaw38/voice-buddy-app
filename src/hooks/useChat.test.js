import { describe, it, expect } from 'vitest'
import { formatHistoryMemory, formatLessonsMemory, selectModePrompt } from './useChat.js'
import { PROMPTS } from '../utils/prompts.js'

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
  it('picks the sing prompt for sing mode', () => {
    expect(selectModePrompt('sing')).toBe(PROMPTS.sing)
  })

  it('picks the story prompt for story mode', () => {
    expect(selectModePrompt('story')).toBe(PROMPTS.story)
  })

  it('falls back to the chat prompt for chat mode or anything unrecognized', () => {
    expect(selectModePrompt('chat')).toBe(PROMPTS.chat)
    expect(selectModePrompt('nonsense')).toBe(PROMPTS.chat)
    expect(selectModePrompt(undefined)).toBe(PROMPTS.chat)
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
