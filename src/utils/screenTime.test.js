import { describe, it, expect } from 'vitest'
import { evaluateScreenTime, WARNING_THRESHOLD_MINUTES } from './screenTime.js'

describe('evaluateScreenTime', () => {
  it('warns neither nor winds down with plenty of time left', () => {
    const result = evaluateScreenTime(10, 30)
    expect(result.minutesLeft).toBe(20)
    expect(result.shouldWarn).toBe(false)
    expect(result.shouldWindDown).toBe(false)
  })

  it('warns once minutesLeft drops to the threshold', () => {
    const result = evaluateScreenTime(30 - WARNING_THRESHOLD_MINUTES, 30)
    expect(result.minutesLeft).toBe(WARNING_THRESHOLD_MINUTES)
    expect(result.shouldWarn).toBe(true)
    expect(result.shouldWindDown).toBe(false)
  })

  it('does not warn just above the threshold', () => {
    const result = evaluateScreenTime(30 - WARNING_THRESHOLD_MINUTES - 1, 30)
    expect(result.shouldWarn).toBe(false)
  })

  it('winds down once minutesLeft reaches zero', () => {
    const result = evaluateScreenTime(30, 30)
    expect(result.minutesLeft).toBe(0)
    expect(result.shouldWarn).toBe(true)
    expect(result.shouldWindDown).toBe(true)
  })

  it('winds down (and stays wound down) past the limit', () => {
    const result = evaluateScreenTime(45, 30)
    expect(result.minutesLeft).toBe(-15)
    expect(result.shouldWindDown).toBe(true)
  })
})
