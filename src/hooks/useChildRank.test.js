import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'

const mocks = vi.hoisted(() => ({ fetchChildRank: vi.fn() }))
vi.mock('../services/rankService.js', () => ({ fetchChildRank: mocks.fetchChildRank }))

import { useChildRank } from './useChildRank.js'

describe('useChildRank', () => {
  beforeEach(() => vi.clearAllMocks())

  it('starts in a loading state with Recruit level 1 defaults', () => {
    mocks.fetchChildRank.mockReturnValue(new Promise(() => {})) // never resolves
    const { result } = renderHook(() => useChildRank('c1'))
    expect(result.current.loading).toBe(true)
    expect(result.current.rank).toBe('Recruit')
    expect(result.current.level).toBe(1)
  })

  it('derives level/rank from the fetched totalXp', async () => {
    mocks.fetchChildRank.mockResolvedValue({ totalXp: 550 })
    const { result } = renderHook(() => useChildRank('c1'))
    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(result.current.totalXp).toBe(550)
    expect(result.current.level).toBe(6)
    expect(result.current.rank).toBe('Specialist')
  })

  it('does not fetch when childId is null', () => {
    renderHook(() => useChildRank(null))
    expect(mocks.fetchChildRank).not.toHaveBeenCalled()
  })

  it('refetches when childId changes', async () => {
    mocks.fetchChildRank.mockResolvedValue({ totalXp: 0 })
    const { rerender } = renderHook(({ id }) => useChildRank(id), { initialProps: { id: 'c1' } })
    await waitFor(() => expect(mocks.fetchChildRank).toHaveBeenCalledWith('c1'))
    rerender({ id: 'c2' })
    await waitFor(() => expect(mocks.fetchChildRank).toHaveBeenCalledWith('c2'))
  })
})
