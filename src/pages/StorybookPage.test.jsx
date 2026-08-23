import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter, Routes, Route } from 'react-router-dom'

vi.mock('../services/storybookService.js', () => ({ fetchRecapByToken: vi.fn() }))

import { fetchRecapByToken } from '../services/storybookService.js'
import StorybookPage from './StorybookPage.jsx'

function renderAt(token) {
  return render(
    <MemoryRouter initialEntries={[`/storybook/${token}`]}>
      <Routes>
        <Route path="/storybook/:token" element={<StorybookPage />} />
      </Routes>
    </MemoryRouter>
  )
}

describe('StorybookPage', () => {
  beforeEach(() => vi.clearAllMocks())

  it('shows a loading state before the recap resolves', () => {
    fetchRecapByToken.mockReturnValue(new Promise(() => {})) // never resolves
    renderAt('tok1')
    expect(screen.getByText(/loading/i)).toBeInTheDocument()
  })

  it('shows a not-found state for an invalid token', async () => {
    fetchRecapByToken.mockResolvedValue(null)
    renderAt('bad-token')
    await waitFor(() => expect(screen.getByText(/not found/i)).toBeInTheDocument())
  })

  it('renders the narrative, lessons, and XP for a valid recap', async () => {
    fetchRecapByToken.mockResolvedValue({
      narrative: 'Alex completed an amazing mission this week!',
      lessons_summary: [{ title: 'Operation Neural Uplink', masteryScore: 92 }],
      xp_earned: 40,
      week_start: '2026-08-17',
    })
    renderAt('tok1')
    await waitFor(() => expect(screen.getByText(/amazing mission/)).toBeInTheDocument())
    expect(screen.getByText('Operation Neural Uplink')).toBeInTheDocument()
    expect(screen.getByText(/92% mastery/)).toBeInTheDocument()
    expect(screen.getByText(/\+40 XP/)).toBeInTheDocument()
  })

  it('renders without a lessons section when nothing was completed', async () => {
    fetchRecapByToken.mockResolvedValue({
      narrative: 'A quiet week, but Buddy is still proud!',
      lessons_summary: [],
      xp_earned: 0,
      week_start: '2026-08-17',
    })
    renderAt('tok1')
    await waitFor(() => expect(screen.getByText(/quiet week/)).toBeInTheDocument())
    expect(screen.queryByText(/Missions completed/)).not.toBeInTheDocument()
  })
})
