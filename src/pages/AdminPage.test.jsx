import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'

vi.mock('../services/adminService.js', () => ({
  fetchOverview: vi.fn(),
  cancelSubscription: vi.fn(),
}))

import { fetchOverview, cancelSubscription } from '../services/adminService.js'
import AdminPage from './AdminPage.jsx'

const overview = {
  users: [
    { id: 'u1', email: 'trial@x.com', createdAt: '2026-07-20T00:00:00.000Z', tier: 'trial', status: 'trial', trialEnd: '2099-01-01T00:00:00.000Z', subscriptionEnd: null },
    { id: 'u2', email: 'free@x.com', createdAt: '2026-07-21T00:00:00.000Z', tier: 'free', status: null, trialEnd: null, subscriptionEnd: null },
  ],
  stats: {
    tierCounts: { free: 1, trial: 1, pro: 0 },
    signupsByDay: [{ date: '2026-08-02', count: 2 }],
  },
}

function renderPage() {
  return render(<MemoryRouter><AdminPage /></MemoryRouter>)
}

describe('AdminPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    window.confirm = vi.fn().mockReturnValue(true)
  })

  it('renders the user list once the overview loads', async () => {
    fetchOverview.mockResolvedValue(overview)
    renderPage()
    await waitFor(() => expect(screen.getByText('trial@x.com')).toBeInTheDocument())
    expect(screen.getByText('free@x.com')).toBeInTheDocument()
  })

  it('shows an error state with a retry button when loading fails', async () => {
    fetchOverview.mockRejectedValue(new Error('boom'))
    renderPage()
    await waitFor(() => expect(screen.getByText('boom')).toBeInTheDocument())
    expect(screen.getByRole('button', { name: /retry/i })).toBeInTheDocument()
  })

  it('cancels a subscription and marks the row cancelled on success', async () => {
    fetchOverview.mockResolvedValue(overview)
    cancelSubscription.mockResolvedValue({ ok: true })
    renderPage()
    await waitFor(() => expect(screen.getByText('trial@x.com')).toBeInTheDocument())

    const user = userEvent.setup()
    await user.click(screen.getByRole('button', { name: /cancel subscription/i }))

    expect(cancelSubscription).toHaveBeenCalledWith('u1')
    await waitFor(() => expect(screen.queryByRole('button', { name: /cancel subscription/i })).not.toBeInTheDocument())
  })

  it('filters the table by email search', async () => {
    fetchOverview.mockResolvedValue(overview)
    renderPage()
    await waitFor(() => expect(screen.getByText('trial@x.com')).toBeInTheDocument())

    const user = userEvent.setup()
    await user.type(screen.getByPlaceholderText(/search/i), 'free@')

    expect(screen.getByText('free@x.com')).toBeInTheDocument()
    expect(screen.queryByText('trial@x.com')).not.toBeInTheDocument()
  })
})
