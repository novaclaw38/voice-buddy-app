import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor, fireEvent } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router-dom'

vi.mock('../services/adminService.js', () => ({
  fetchUserDetail: vi.fn(),
  grantPro: vi.fn(),
  banUser: vi.fn(),
  unbanUser: vi.fn(),
  deleteUser: vi.fn(),
}))

import { fetchUserDetail, grantPro, deleteUser } from '../services/adminService.js'
import AdminUserDetailPage from './AdminUserDetailPage.jsx'

const detail = {
  banned: false,
  payments: [
    { id: 'p1', amount: 149, status: 'complete', paymentType: 'recurring', createdAt: '2026-08-01T00:00:00.000Z' },
  ],
  children: [
    { id: 'c1', name: 'Ada', buddyName: 'Buddy', avatarType: 'bear', avatarColor: '#7c3aed' },
  ],
  lessonActivity: [
    { childId: 'c1', childName: 'Ada', completions: 5, avgMastery: 80 },
  ],
}

function renderPage(id = 'u1') {
  return render(
    <MemoryRouter initialEntries={[`/admin/users/${id}`]}>
      <Routes>
        <Route path="/admin/users/:id" element={<AdminUserDetailPage />} />
      </Routes>
    </MemoryRouter>
  )
}

describe('AdminUserDetailPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    window.confirm = vi.fn().mockReturnValue(true)
  })

  it('renders payments, children, and lesson activity once loaded', async () => {
    fetchUserDetail.mockResolvedValue(detail)
    renderPage()
    await waitFor(() => expect(screen.getByText('Ada')).toBeInTheDocument())
    expect(screen.getByText('R149.00')).toBeInTheDocument()
    expect(screen.getByText(/80/)).toBeInTheDocument()
    expect(fetchUserDetail).toHaveBeenCalledWith('u1')
  })

  it('shows an error state with a retry button when loading fails', async () => {
    fetchUserDetail.mockRejectedValue(new Error('boom'))
    renderPage()
    await waitFor(() => expect(screen.getByText('boom')).toBeInTheDocument())
    expect(screen.getByRole('button', { name: /retry/i })).toBeInTheDocument()
  })

  it('grants Pro with the picked end date', async () => {
    fetchUserDetail.mockResolvedValue(detail)
    grantPro.mockResolvedValue({ ok: true })
    renderPage()
    await waitFor(() => expect(screen.getByText('Ada')).toBeInTheDocument())

    // fireEvent.change, not userEvent.type — jsdom/user-event's keystroke-by-
    // keystroke typing into input[type=date]'s month/day/year segments is
    // unreliable; a direct value change is what real date-picker input and
    // paste both funnel through anyway.
    fireEvent.change(screen.getByLabelText(/extend pro until/i), { target: { value: '2026-12-01' } })
    const user = userEvent.setup()
    await user.click(screen.getByRole('button', { name: /grant/i }))

    expect(grantPro).toHaveBeenCalledWith('u1', '2026-12-01')
  })

  it('shows Unban when the server reports the user as already banned', async () => {
    fetchUserDetail.mockResolvedValue({ ...detail, banned: true })
    renderPage()
    await waitFor(() => expect(screen.getByText('Ada')).toBeInTheDocument())
    expect(screen.getByRole('button', { name: /^unban$/i })).toBeInTheDocument()
  })

  it('deletes the user after confirming', async () => {
    fetchUserDetail.mockResolvedValue(detail)
    deleteUser.mockResolvedValue({ ok: true })
    renderPage()
    await waitFor(() => expect(screen.getByText('Ada')).toBeInTheDocument())

    const user = userEvent.setup()
    await user.click(screen.getByRole('button', { name: /^delete/i }))

    expect(window.confirm).toHaveBeenCalled()
    expect(deleteUser).toHaveBeenCalledWith('u1')
  })
})
