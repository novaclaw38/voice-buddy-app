import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'

vi.mock('../components/TacticalOrb.jsx', () => ({
  default: ({ status, totalXp }) => (
    <div data-testid="tactical-orb" data-status={status} data-total-xp={totalXp}>orb</div>
  ),
}))

import TacticalLandingPage from './TacticalLandingPage.jsx'

describe('TacticalLandingPage', () => {
  it('renders the hero heading', () => {
    render(
      <MemoryRouter>
        <TacticalLandingPage />
      </MemoryRouter>
    )
    expect(screen.getByText(/Your Child\. Our/)).toBeInTheDocument()
  })

  it('renders the TacticalOrb in the hero', () => {
    render(
      <MemoryRouter>
        <TacticalLandingPage />
      </MemoryRouter>
    )
    expect(screen.getByTestId('tactical-orb')).toBeInTheDocument()
  })

  it('shows a static sample total with no live-incrementing counter', async () => {
    vi.useFakeTimers()
    render(
      <MemoryRouter>
        <TacticalLandingPage />
      </MemoryRouter>
    )
    const before = screen.getByText(/SAMPLE TOTAL:/).textContent
    vi.advanceTimersByTime(10000)
    const after = screen.getByText(/SAMPLE TOTAL:/).textContent
    expect(after).toBe(before)
    vi.useRealTimers()
  })
})
