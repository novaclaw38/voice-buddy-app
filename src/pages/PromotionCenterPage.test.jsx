import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'

const mocks = vi.hoisted(() => ({
  listChildren: vi.fn(),
  getActiveChildId: vi.fn(),
}))
vi.mock('../services/childrenService.js', () => ({ listChildren: mocks.listChildren }))
vi.mock('../utils/storage.js', async (importOriginal) => ({
  ...(await importOriginal()),
  getActiveChildId: mocks.getActiveChildId,
}))
vi.mock('../hooks/useProgress.js', () => ({ useProgress: () => ({ completions: new Set(), records: new Map(), markComplete: vi.fn() }) }))
vi.mock('../hooks/useChildRank.js', () => ({ useChildRank: () => ({ totalXp: 0, level: 1, rank: 'Recruit', xpIntoLevel: 0, xpToNextLevel: 100, loading: false }) }))

import PromotionCenterPage from './PromotionCenterPage.jsx'

describe('PromotionCenterPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.getActiveChildId.mockReturnValue('c1')
    mocks.listChildren.mockResolvedValue([{ id: 'c1', name: 'Ada', buddy_name: 'Buddy', avatar_type: 'bear', avatar_color: '#7c3aed' }])
  })

  it('renders the skill tree, rank header, tactical preview, and upgrade card once children load', async () => {
    render(
      <MemoryRouter>
        <PromotionCenterPage session={{ access_token: 't', user: { id: 'u1' } }} />
      </MemoryRouter>
    )
    expect(await screen.findByText(/operation iron blueprint/i)).toBeInTheDocument()
    expect(screen.getByText('Ada')).toBeInTheDocument()
    expect(screen.getByText(/live view/i)).toBeInTheDocument()
    expect(screen.getByText(/elite academy/i)).toBeInTheDocument()
  })
})
