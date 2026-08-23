import { describe, it, expect, vi, afterEach } from 'vitest'
import { render, screen, cleanup, fireEvent } from '@testing-library/react'
import SliderCard from './SliderCard.jsx'

afterEach(cleanup)

const step = {
  type: 'slider',
  prompt: 'Dial in the sensitivity',
  min: 0,
  max: 100,
  target: { min: 60, max: 75 },
  startAt: 20,
}

describe('SliderCard', () => {
  it('moves value with arrow keys and completes once inside the target zone', () => {
    vi.useFakeTimers()
    const onComplete = vi.fn()
    render(<SliderCard step={step} onComplete={onComplete} />)

    const handle = screen.getByRole('slider')
    expect(handle).toHaveAttribute('aria-valuenow', '20')

    for (let i = 0; i < 40; i++) fireEvent.keyDown(handle, { key: 'ArrowRight' })
    expect(handle).toHaveAttribute('aria-valuenow', '60')

    vi.advanceTimersByTime(500)
    expect(onComplete).toHaveBeenCalledWith(100)
    vi.useRealTimers()
  })

  it('does not complete while the value sits outside the target zone', () => {
    vi.useFakeTimers()
    const onComplete = vi.fn()
    render(<SliderCard step={step} onComplete={onComplete} />)

    vi.advanceTimersByTime(1000)
    expect(onComplete).not.toHaveBeenCalled()
    vi.useRealTimers()
  })

  it('moves value with the tap +/- buttons and clamps at min/max', () => {
    const onComplete = vi.fn()
    render(<SliderCard step={step} onComplete={onComplete} />)

    const decrease = screen.getByLabelText('Decrease')
    const increase = screen.getByLabelText('Increase')
    const handle = screen.getByRole('slider')

    for (let i = 0; i < 25; i++) fireEvent.click(decrease)
    expect(handle).toHaveAttribute('aria-valuenow', '0')

    for (let i = 0; i < 200; i++) fireEvent.click(increase)
    expect(handle).toHaveAttribute('aria-valuenow', '100')
  })

  it('Home and End jump to min and max', () => {
    const onComplete = vi.fn()
    render(<SliderCard step={step} onComplete={onComplete} />)
    const handle = screen.getByRole('slider')

    fireEvent.keyDown(handle, { key: 'End' })
    expect(handle).toHaveAttribute('aria-valuenow', '100')

    fireEvent.keyDown(handle, { key: 'Home' })
    expect(handle).toHaveAttribute('aria-valuenow', '0')
  })
})
