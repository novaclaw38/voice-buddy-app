import { describe, it, expect } from 'vitest'
import { robotics } from './robotics.js'

describe('robotics course — Operation Iron Blueprint missions (old band)', () => {
  const missions = robotics.lessons.filter((l) => l.ageBand === 'old')

  it('has exactly 4 old-band mission lessons', () => {
    expect(missions.length).toBe(4)
  })

  it('each mission has the explain/teach/quiz/[drag-match|slider]/mastery-check sequence', () => {
    for (const lesson of missions) {
      const types = lesson.steps.map((s) => s.type)
      expect(types.slice(0, 3)).toEqual(['explain', 'teach', 'quiz'])
      expect(['drag-match', 'slider']).toContain(types[3])
      expect(types[4]).toBe('mastery-check')
    }
  })

  it('each step carries the fields its component reads', () => {
    for (const lesson of missions) {
      const [explain, teach, quiz, interactive, masteryCheck] = lesson.steps

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

      expect(interactive.narration).toBeTruthy()
      if (interactive.type === 'drag-match') {
        expect(interactive.targets.length).toBeGreaterThanOrEqual(1)
        expect(interactive.items.length).toBeGreaterThanOrEqual(2)
        expect(['exact', 'budget']).toContain(interactive.rule.kind)
        if (interactive.rule.kind === 'exact') {
          for (const target of interactive.targets) {
            expect(interactive.items.map((it) => it.id)).toContain(interactive.rule.correct[target.id])
          }
        } else {
          expect(interactive.rule.max).toBeGreaterThan(0)
          expect(interactive.rule.required.length).toBeGreaterThanOrEqual(1)
          const requiredSum = interactive.rule.required.reduce(
            (sum, id) => sum + interactive.items.find((it) => it.id === id).value, 0
          )
          expect(requiredSum).toBeLessThanOrEqual(interactive.rule.max)
        }
      } else {
        expect(typeof interactive.min).toBe('number')
        expect(typeof interactive.max).toBe('number')
        expect(interactive.target.min).toBeGreaterThanOrEqual(interactive.min)
        expect(interactive.target.max).toBeLessThanOrEqual(interactive.max)
        expect(interactive.target.min).toBeLessThan(interactive.target.max)
      }

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
