import { describe, it, expect } from 'vitest'
import { findTargetAtPoint } from './dragHitTest.js'

describe('findTargetAtPoint', () => {
  const rectA = { left: 0, right: 100, top: 0, bottom: 100 }
  const rectB = { left: 200, right: 300, top: 0, bottom: 100 }

  it('returns the id of the target whose rect contains the point', () => {
    expect(findTargetAtPoint({ x: 50, y: 50 }, { a: rectA, b: rectB })).toBe('a')
  })

  it('returns null when the point is outside every rect', () => {
    expect(findTargetAtPoint({ x: 150, y: 50 }, { a: rectA, b: rectB })).toBeNull()
  })

  it('returns the first matching target id when rects overlap', () => {
    const overlapping = { left: 40, right: 140, top: 0, bottom: 100 }
    expect(findTargetAtPoint({ x: 60, y: 50 }, { a: rectA, c: overlapping })).toBe('a')
  })
})
