import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'

const mocks = vi.hoisted(() => ({
  listChildren: vi.fn(),
  fetchChildRank: vi.fn(),
  deleteChild: vi.fn(),
  setActiveChildId: vi.fn(),
}))
vi.mock('../services/childrenService.js', () => ({
  listChildren: mocks.listChildren,
  deleteChild: mocks.deleteChild,
}))
vi.mock('../services/rankService.js', () => ({
  fetchChildRank: mocks.fetchChildRank,
}))
vi.mock('../utils/storage.js', async (importOriginal) => ({
  ...(await importOriginal()),
  setActiveChildId: mocks.setActiveChildId,
  getActiveChildId: () => 'c1',
}))
vi.mock('../utils/rank.js', () => ({
  deriveRank: (xp) => {
    const level = Math.floor((xp || 0) / 100) + 1
    return { level, rank: level <= 5 ? 'Recruit' : level <= 12 ? 'Specialist' : 'Commander', xpIntoLevel: (xp || 0) % 100, xpToNextLevel: 100 - ((xp || 0) % 100) }
  },
}))
vi.mock('../components/BuddyOrb.jsx', () => ({
  default: ({ status, rank, size }) => (
    <div data-testid="buddy-orb" data-status={status} data-rank={rank} data-size={size}>orb</div>
  ),
  RANK_TIERS: { Recruit: { tier: 1 }, Specialist: { tier: 2 } },
}))

import ParentDashboard from './ParentDashboard.jsx'

describe('ParentDashboard', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.listChildren.mockResolvedValue([
      { id: 'c1', name: 'Ada', buddy_name: 'Buddy', avatar_type: 'bear', avatar_color: '#7c3aed', created_at: '2026-01-01' },
      { id: 'c2', name: 'Leo', buddy_name: 'Leo', avatar_type: 'fox', avatar_color: '#ff8a00', created_at: '2026-01-02' },
    ])
    mocks.fetchChildRank.mockResolvedValue({ totalXp: 250 })
  })

  it("renders the child's name after loading", async () => {
    render(
      <MemoryRouter>
        <ParentDashboard session={{ access_token: 't', user: { id: 'u1' } }} />
      </MemoryRouter>
    )
    expect(await screen.findByText('Ada')).toBeInTheDocument()
  })

  it('shows the active child with level derived from rank data', async () => {
    render(
      <MemoryRouter>
        <ParentDashboard session={{ access_token: 't', user: { id: 'u1' } }} />
      </MemoryRouter>
    )
    // 250 XP => level 3 (floor(250/100)+1), rank Recruit (level <= 5)
    // Both children have 250 XP in the mock, so multiple matches expected
    expect(await screen.findAllByText('Level 3: Recruit')).toHaveLength(2)
  })

  it('renders BuddyOrb with the correct rank and size', async () => {
    render(
      <MemoryRouter>
        <ParentDashboard session={{ access_token: 't', user: { id: 'u1' } }} />
      </MemoryRouter>
    )
    await screen.findByText('Ada')
    const orbs = screen.getAllByTestId('buddy-orb')
    expect(orbs.length).toBeGreaterThanOrEqual(1)
    expect(orbs[0]).toHaveAttribute('data-rank', '3')
    expect(orbs[0]).toHaveAttribute('data-size', '80')
  })

  it('renders a Delete button for each child', async () => {
    render(
      <MemoryRouter>
        <ParentDashboard session={{ access_token: 't', user: { id: 'u1' } }} />
      </MemoryRouter>
    )
    await screen.findByText('Ada')
    // Two children => two delete buttons
    const deleteBtns = screen.getAllByText('Delete')
    expect(deleteBtns).toHaveLength(2)
  })

  it('renders an Add Cadet button', async () => {
    render(
      <MemoryRouter>
        <ParentDashboard session={{ access_token: 't', user: { id: 'u1' } }} />
      </MemoryRouter>
    )
    await screen.findByText('Ada')
    expect(screen.getByText('+ Add Cadet')).toBeInTheDocument()
  })
})
