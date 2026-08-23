import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'

const mocks = vi.hoisted(() => ({ useChildRank: vi.fn() }))
vi.mock('../../hooks/useChildRank.js', () => ({ useChildRank: mocks.useChildRank }))

import RankStatusHeader from './RankStatusHeader.jsx'

const child = { id: 'c1', name: 'Ada', buddy_name: 'Buddy', avatar_type: 'bear', avatar_color: '#7c3aed' }
const siblings = [child, { id: 'c2', name: 'Sam', buddy_name: 'Buddy', avatar_type: 'cat', avatar_color: '#db2777' }]

describe('RankStatusHeader', () => {
  it('shows the rank label and XP progress', () => {
    mocks.useChildRank.mockReturnValue({ totalXp: 250, level: 3, rank: 'Recruit', xpIntoLevel: 50, xpToNextLevel: 50, loading: false })
    render(<RankStatusHeader child={child} allChildren={siblings} onSwitchChild={vi.fn()} />)
    expect(screen.getByText(/recruit/i)).toBeInTheDocument()
    expect(screen.getByText(/level 3/i)).toBeInTheDocument()
    expect(screen.getByText(/50 xp to next/i)).toBeInTheDocument()
  })

  it('lists sibling children as switch options and calls onSwitchChild', () => {
    mocks.useChildRank.mockReturnValue({ totalXp: 0, level: 1, rank: 'Recruit', xpIntoLevel: 0, xpToNextLevel: 100, loading: false })
    const onSwitchChild = vi.fn()
    render(<RankStatusHeader child={child} allChildren={siblings} onSwitchChild={onSwitchChild} />)
    fireEvent.click(screen.getByRole('button', { name: /sam/i }))
    expect(onSwitchChild).toHaveBeenCalledWith('c2')
  })
})
