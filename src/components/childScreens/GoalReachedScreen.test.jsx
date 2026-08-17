import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'

// ParentPin's own digit-lock/hashing mechanics have nothing to do with
// GoalReachedScreen's job (picking the right copy per variant and wiring
// PIN success to onUnlock) — stub it down to its onSuccess/onCreate seam.
vi.mock('../ParentPin.jsx', () => ({
  default: ({ onSuccess, onCreate }) => (
    <div data-testid="parent-pin">
      <button onClick={onSuccess}>Simulate correct PIN</button>
      <button onClick={() => onCreate('new-hash')}>Simulate first-run PIN create</button>
    </div>
  ),
}))

import GoalReachedScreen from './GoalReachedScreen.jsx'

const baseProps = {
  childName: 'Sam',
  buddyName: 'Buddy',
  avatarColor: '#7c3aed',
  avatarType: 'bear',
  costume: null,
  parentPinHash: 'hash',
  onCreatePin: vi.fn(),
  onUnlock: vi.fn(),
}

describe('GoalReachedScreen', () => {
  it('shows wind-down copy for the windDown variant', () => {
    render(<GoalReachedScreen {...baseProps} variant="windDown" />)
    expect(screen.getByText(/Great playing today, Sam!/)).toBeInTheDocument()
    expect(screen.getByText('Ask a grown-up for more time')).toBeInTheDocument()
  })

  it('shows free-limit copy for the freeLimit variant', () => {
    render(<GoalReachedScreen {...baseProps} variant="freeLimit" />)
    expect(screen.getByText(/Great chatting today, Sam!/)).toBeInTheDocument()
    expect(screen.getByText('Ask a grown-up')).toBeInTheDocument()
  })

  it('reveals the PIN gate on tapping the unlock button, and calls onUnlock after a correct PIN', () => {
    const onUnlock = vi.fn()
    render(<GoalReachedScreen {...baseProps} variant="windDown" onUnlock={onUnlock} />)

    expect(screen.queryByTestId('parent-pin')).not.toBeInTheDocument()
    fireEvent.click(screen.getByText('Ask a grown-up for more time'))
    expect(screen.getByTestId('parent-pin')).toBeInTheDocument()

    fireEvent.click(screen.getByText('Simulate correct PIN'))
    expect(onUnlock).toHaveBeenCalledTimes(1)
  })

  it('forwards a first-run PIN creation to onCreatePin', () => {
    const onCreatePin = vi.fn()
    render(<GoalReachedScreen {...baseProps} variant="freeLimit" onCreatePin={onCreatePin} />)

    fireEvent.click(screen.getByText('Ask a grown-up'))
    fireEvent.click(screen.getByText('Simulate first-run PIN create'))
    expect(onCreatePin).toHaveBeenCalledWith('new-hash')
  })
})
