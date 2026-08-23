import { describe, it, expect } from 'vitest'
import { robotics } from './robotics.js'

const MISSION_STEP_TYPES = ['explain', 'teach', 'quiz', 'activity', 'mastery-check']

describe('robotics course — Operation Iron Blueprint missions (old band)', () => {
  const missions = robotics.lessons.filter((l) => l.ageBand === 'old')

  it('has exactly 4 old-band mission lessons', () => {
    expect(missions.length).toBe(4)
  })

  it('each mission has the 5-step explain/teach/quiz/activity/mastery-check sequence', () => {
    for (const lesson of missions) {
      expect(lesson.steps.map((s) => s.type)).toEqual(MISSION_STEP_TYPES)
    }
  })

  it('each step carries the fields its component reads', () => {
    for (const lesson of missions) {
      const [explain, teach, quiz, activity, masteryCheck] = lesson.steps

      expect(explain.narration).toBeTruthy()
      expect(explain.emoji).toBeTruthy()
      expect(explain.fact).toBeTruthy()

      expect(teach.narration).toBeTruthy()
      expect(teach.emoji).toBeTruthy()
      expect(teach.fact).toBeTruthy()
      expect(teach.checkQuestion).toBeTruthy()
      expect(teach.checkAnswer).toBeTruthy()

      expect(quiz.narration).toBeTruthy()
      expect(quiz.question).toBeTruthy()
      expect(quiz.options.length).toBeGreaterThanOrEqual(2)
      expect(typeof quiz.correct).toBe('number')
      expect(quiz.options[quiz.correct]).toBeTruthy()

      expect(activity.narration).toBeTruthy()

      expect(masteryCheck.narration).toBeTruthy()
      expect(masteryCheck.items.length).toBeGreaterThanOrEqual(2)
      for (const item of masteryCheck.items) {
        expect(item.question).toBeTruthy()
        expect(item.options.length).toBeGreaterThanOrEqual(2)
        expect(typeof item.correct).toBe('number')
        expect(item.options[item.correct]).toBeTruthy()
        expect(item.hints.length).toBe(item.options.length)
      }
    }
  })

  it('each mission has a printSheet and an offScreenChallenge', () => {
    for (const lesson of missions) {
      expect(lesson.printSheet?.title).toBeTruthy()
      expect(lesson.printSheet?.facts?.length).toBeGreaterThan(0)
      expect(lesson.printSheet?.colourPrompt).toBeTruthy()

      expect(lesson.offScreenChallenge?.title).toBeTruthy()
      expect(lesson.offScreenChallenge?.description).toBeTruthy()
    }
  })

  it('has unique lesson ids across the whole course', () => {
    const ids = robotics.lessons.map((l) => l.id)
    expect(new Set(ids).size).toBe(ids.length)
  })

  it('no longer has the legacy sensors/code lessons', () => {
    const ids = robotics.lessons.map((l) => l.id)
    expect(ids).not.toContain('sensors')
    expect(ids).not.toContain('code')
  })

  it('left the young/middle band lessons untouched', () => {
    const untouchedIds = ['robot-friends', 'what', 'build', 'helper-robots', 'robot-safety', 'robot-moves']
    const ids = robotics.lessons.map((l) => l.id)
    for (const id of untouchedIds) {
      expect(ids).toContain(id)
    }
  })
})
