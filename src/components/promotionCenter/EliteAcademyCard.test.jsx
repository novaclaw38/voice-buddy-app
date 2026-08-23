import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'

const mocks = vi.hoisted(() => ({ startCheckout: vi.fn() }))
vi.mock('../../services/checkoutService.js', () => ({ startCheckout: mocks.startCheckout }))

import EliteAcademyCard from './EliteAcademyCard.jsx'

describe('EliteAcademyCard', () => {
  beforeEach(() => vi.clearAllMocks())

  it('shows the R149/month price and Elite Academy heading', () => {
    render(<EliteAcademyCard session={{ access_token: 't' }} />)
    expect(screen.getByText(/elite academy/i)).toBeInTheDocument()
    expect(screen.getByText(/R149/)).toBeInTheDocument()
  })

  it('starts checkout when the CTA is clicked', async () => {
    mocks.startCheckout.mockResolvedValue({ ok: true })
    render(<EliteAcademyCard session={{ access_token: 't' }} />)
    fireEvent.click(screen.getByRole('button', { name: /unlock full potential/i }))
    await waitFor(() => expect(mocks.startCheckout).toHaveBeenCalled())
  })

  it('shows an error message if checkout fails', async () => {
    mocks.startCheckout.mockResolvedValue({ ok: false, message: 'Something went wrong starting checkout. Please try again.' })
    render(<EliteAcademyCard session={{ access_token: 't' }} />)
    fireEvent.click(screen.getByRole('button', { name: /unlock full potential/i }))
    expect(await screen.findByText(/something went wrong/i)).toBeInTheDocument()
  })
})
