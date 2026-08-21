import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'

vi.mock('../services/adminService.js', () => ({
  fetchOverview: vi.fn(),
  cancelSubscription: vi.fn(),
  banUser: vi.fn(),
  unbanUser: vi.fn(),
  deleteUser: vi.fn(),
}))

import { fetchOverview, cancelSubscription, banUser, deleteUser } from '../services/adminService.js'
import AdminPage from './AdminPage.jsx'

const overview = {
  users: [
    { id: 'u1', email: 'trial@x.com', createdAt: '2026-07-20T00:00:00.000Z', tier: 'trial', status: 'trial', trialEnd: '2099-01-01T00:00:00.000Z', subscriptionEnd: null, banned: false },
    { id: 'u2', email: 'free@x.com', createdAt: '2026-07-21T00:00:00.000Z', tier: 'free', status: null, trialEnd: null, subscriptionEnd: null, banned: true },
  ],
  stats: {
    tierCounts: { free: 1, trial: 1, pro: 0 },
    signupsByDay: [{ date: '2026-08-02', count: 2 }],
    revenue: { total: 149, mrr: 0, byDay: [{ date: '2026-08-02', amount: 149 }] },
    failedPayments30d: 1,
    recentPayments: [{ id: 'p1', email: 'payer@x.com', amount: 75, status: 'complete', paymentType: 'recurring', createdAt: '2026-08-02T00:00:00.000Z' }],
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

  it('renders revenue stats and the transactions table', async () => {
    fetchOverview.mockResolvedValue(overview)
    renderPage()
    await waitFor(() => expect(screen.getByText('trial@x.com')).toBeInTheDocument())

    expect(screen.getByText('R149.00')).toBeInTheDocument() // total revenue
    const failedCard = screen.getByText('Failed payments (30d)').closest('div')
    expect(within(failedCard).getByText('1')).toBeInTheDocument()
  })

  it('shows Unban for a user the server already reports as banned', async () => {
    fetchOverview.mockResolvedValue(overview)
    renderPage()
    await waitFor(() => expect(screen.getByText('free@x.com')).toBeInTheDocument())

    const row = screen.getByText('free@x.com').closest('tr')
    expect(within(row).getByRole('button', { name: /^unban$/i })).toBeInTheDocument()
  })

  it('bans a user and shows Unban afterwards', async () => {
    fetchOverview.mockResolvedValue(overview)
    banUser.mockResolvedValue({ ok: true })
    renderPage()
    await waitFor(() => expect(screen.getByText('trial@x.com')).toBeInTheDocument())

    const user = userEvent.setup()
    const banButtons = screen.getAllByRole('button', { name: /^ban$/i })
    await user.click(banButtons[0])

    expect(banUser).toHaveBeenCalledWith('u1')
    await waitFor(() => expect(screen.getAllByRole('button', { name: /^unban$/i })[0]).toBeInTheDocument())
  })

  it('deletes a user after confirming, removing the row', async () => {
    fetchOverview.mockResolvedValue(overview)
    deleteUser.mockResolvedValue({ ok: true })
    renderPage()
    await waitFor(() => expect(screen.getByText('trial@x.com')).toBeInTheDocument())

    const user = userEvent.setup()
    const deleteButtons = screen.getAllByRole('button', { name: /delete/i })
    await user.click(deleteButtons[0])

    expect(window.confirm).toHaveBeenCalled()
    expect(deleteUser).toHaveBeenCalledWith('u1')
    await waitFor(() => expect(screen.queryByText('trial@x.com')).not.toBeInTheDocument())
  })
})
