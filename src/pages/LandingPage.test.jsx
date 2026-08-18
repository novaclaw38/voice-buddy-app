import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { axe } from 'jest-axe'

vi.mock('../lib/supabase.js', () => ({
  supabase: {
    auth: {
      getUser: vi.fn().mockResolvedValue({ data: { user: null } }),
      getSession: vi.fn().mockResolvedValue({ data: { session: null } }),
    },
  },
}))

import LandingPage from './LandingPage.jsx'

const renderLanding = () =>
  render(<MemoryRouter><LandingPage /></MemoryRouter>)

describe('LandingPage accessibility', () => {
  it('has no detectable a11y violations', async () => {
    const { container } = renderLanding()
    expect(await axe(container)).toHaveNoViolations()
  })
})

describe('LandingPage pricing honesty', () => {
  it('does not advertise features that are not implemented', () => {
    renderLanding()
    expect(screen.queryByText(/10 activity modes/i)).not.toBeInTheDocument()
    expect(screen.queryByText(/wake word/i)).not.toBeInTheDocument()
  })

  it('advertises the real 6-course catalog under Pro, never a fake "10 courses" claim', () => {
    renderLanding()
    expect(screen.queryByText(/10 courses/i)).not.toBeInTheDocument()
    expect(screen.queryByText(/interactive story time/i)).not.toBeInTheDocument()
    expect(screen.getByText(/all 6 courses/i)).toBeInTheDocument()
  })

  it('states the trial terms without implying a card is on file', () => {
    renderLanding()
    expect(screen.queryByText(/won't be charged/i)).not.toBeInTheDocument()
    // Appears in both the hero badge and the pricing card — assert presence,
    // not uniqueness.
    expect(screen.getAllByText(/no card needed/i).length).toBeGreaterThan(0)
  })
})
