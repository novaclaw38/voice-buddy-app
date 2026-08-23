import { describe, it, expect, vi, afterEach } from 'vitest'
import { render, screen, cleanup, fireEvent } from '@testing-library/react'
import DragMatchCard from './DragMatchCard.jsx'

afterEach(cleanup)

const exactStep = {
  type: 'drag-match',
  prompt: 'Tap the right response',
  targets: [{ id: 'perimeter-response', label: '🚧 Perimeter Hit' }],
  items: [
    { id: 'stop-reverse', label: '🛑 Stop, then reverse', value: 1 },
    { id: 'speed-up', label: '⚡ Speed up', value: 1 },
  ],
  rule: { kind: 'exact', correct: { 'perimeter-response': 'stop-reverse' } },
}

describe('DragMatchCard — exact rule, tap path', () => {
  it('completes when the correct item is tapped onto the target', () => {
    vi.useFakeTimers()
    const onComplete = vi.fn()
    render(<DragMatchCard step={exactStep} onComplete={onComplete} />)

    fireEvent.click(screen.getByText('Stop, then reverse'))
    fireEvent.click(screen.getByText('🚧 Perimeter Hit'))

    vi.advanceTimersByTime(500)
    expect(onComplete).toHaveBeenCalledWith(100)
    vi.useRealTimers()
  })

  it('bounces back a wrong item without completing', () => {
    vi.useFakeTimers()
    const onComplete = vi.fn()
    render(<DragMatchCard step={exactStep} onComplete={onComplete} />)

    fireEvent.click(screen.getByText('Speed up'))
    fireEvent.click(screen.getByText('🚧 Perimeter Hit'))

    vi.advanceTimersByTime(500)
    expect(onComplete).not.toHaveBeenCalled()
    expect(screen.getByText('Speed up')).toBeInTheDocument()
    vi.useRealTimers()
  })
})
