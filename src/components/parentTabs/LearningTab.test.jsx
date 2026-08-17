import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'

const mockCompletions = new Set(['gardening:basics'])
const mockRecords = new Map([['gardening:basics', { completedAt: '2026-08-01', masteryScore: 92 }]])

vi.mock('../../hooks/useProgress.js', () => ({
  useProgress: () => ({ completions: mockCompletions, records: mockRecords }),
  masteryTier: (score) => (score >= 90 ? 'gold' : score >= 70 ? 'silver' : 'bronze'),
}))

vi.mock('../../hooks/useCourseCatalog.js', () => ({
  useCourseCatalog: () => ({
    courses: [
      {
        id: 'gardening', subject: 'science', title: 'Gardening for Kids',
        lessons: [{ id: 'basics', title: 'Garden Basics', objective: 'Plant a seed' }],
      },
    ],
  }),
}))

vi.mock('../../utils/subjects.js', () => ({
  SUBJECTS: [{ id: 'science', emoji: '🔬' }],
}))

import LearningTab from './LearningTab.jsx'

describe('LearningTab', () => {
  it('shows per-course progress counts', () => {
    render(<LearningTab childName="Sam" />)
    expect(screen.getByText('Gardening for Kids')).toBeInTheDocument()
    expect(screen.getByText('1/1 lessons')).toBeInTheDocument()
  })

  it('lists recently learned lessons with a mastery tier icon', () => {
    render(<LearningTab childName="Sam" />)
    expect(screen.getByText('Recently Learned')).toBeInTheDocument()
    expect(screen.getByText(/Plant a seed/)).toBeInTheDocument()
    expect(screen.getByText('🥇')).toBeInTheDocument()
  })

  it('falls back to "your child" when no name is set', () => {
    render(<LearningTab childName="" />)
    expect(screen.getByText(/What your child has completed/)).toBeInTheDocument()
  })
})
