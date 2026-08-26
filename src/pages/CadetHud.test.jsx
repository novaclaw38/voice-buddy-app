import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'

const mocks = vi.hoisted(() => ({
  fetchChildRank: vi.fn(),
}))
vi.mock('../services/rankService.js', () => ({
  fetchChildRank: mocks.fetchChildRank,
}))
vi.mock('../lib/supabase.js', () => ({
  supabase: {
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          single: vi.fn().mockResolvedValue({ data: { id: 'c1', name: 'Ada' }, error: null }),
        })),
      })),
    })),
  },
}))
vi.mock('../hooks/useProgress.js', () => ({
  useProgress: () => ({
    completions: new Set(['robotics:m1']),
    records: new Map([
      ['robotics:m1', { completed: true }],
      ['robotics:m2', { completed: false }],
    ]),
  }),
}))
vi.mock('../components/TacticalOrb.jsx', () => ({
  default: ({ status, totalXp, style }) => (
    <div data-testid="tactical-orb" data-status={status} data-total-xp={totalXp} style={style}>orb</div>
  ),
}))

import CadetHud from './CadetHud.jsx'

describe('CadetHud', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.fetchChildRank.mockResolvedValue({ totalXp: 650 })
  })

  it('renders the cadet name after loading', async () => {
    render(
      <MemoryRouter initialEntries={['/academy/hud?child=c1']}>
        <CadetHud />
      </MemoryRouter>
    )
    expect(await screen.findByText('Cadet Ada')).toBeInTheDocument()
  })

  it('shows the correct total XP (regression: was always 0 before this fix)', async () => {
    render(
      <MemoryRouter initialEntries={['/academy/hud?child=c1']}>
        <CadetHud />
      </MemoryRouter>
    )
    await screen.findByText('Cadet Ada')
    expect(screen.getByText('650')).toBeInTheDocument()
  })

  it('renders exactly one TacticalOrb fed with the real totalXp', async () => {
    render(
      <MemoryRouter initialEntries={['/academy/hud?child=c1']}>
        <CadetHud />
      </MemoryRouter>
    )
    await screen.findByText('Cadet Ada')
    const orbs = screen.getAllByTestId('tactical-orb')
    expect(orbs).toHaveLength(1)
    expect(orbs[0]).toHaveAttribute('data-total-xp', '650')
  })

  it('shows Specialist-tier module badges unlocked at 650 XP (level 7)', async () => {
    render(
      <MemoryRouter initialEntries={['/academy/hud?child=c1']}>
        <CadetHud />
      </MemoryRouter>
    )
    await screen.findByText('Cadet Ada')
    expect(screen.getByText('◆ HALO RING UNLOCKED')).toBeInTheDocument()
    expect(screen.getByText('◆ EQUALIZER UNLOCKED')).toBeInTheDocument()
    expect(screen.getByText('DATA HUD LOCKED')).toBeInTheDocument()
  })

  it('renders the rank label from getAcademyRank, not a hardcoded array', async () => {
    render(
      <MemoryRouter initialEntries={['/academy/hud?child=c1']}>
        <CadetHud />
      </MemoryRouter>
    )
    await screen.findByText('Cadet Ada')
    expect(screen.getByText('Specialist')).toBeInTheDocument()
  })
})
