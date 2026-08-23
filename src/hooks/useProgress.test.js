import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'

const mocks = vi.hoisted(() => ({
  getUser: vi.fn(),
  from: vi.fn(),
  bumpChildXp: vi.fn(),
  getActiveChildId: vi.fn(),
}))
vi.mock('../lib/supabase.js', () => ({
  supabase: { auth: { getUser: mocks.getUser }, from: mocks.from },
}))
vi.mock('../services/rankService.js', () => ({ bumpChildXp: mocks.bumpChildXp }))
vi.mock('../utils/storage.js', () => ({ getActiveChildId: mocks.getActiveChildId }))

import { useProgress } from './useProgress.js'

// Supports both the hook's mount-time read chain
// (.from().select().eq().or().then()) and markComplete's .upsert() —
// useProgress calls both against the same mocked `supabase.from` return
// value, so one builder needs to answer to every method used in either
// codepath. Same pattern as signalsService.test.js's makeBuilder.
function makeBuilder() {
  const builder = {
    select: vi.fn(() => builder),
    eq: vi.fn(() => builder),
    or: vi.fn(() => builder),
    upsert: vi.fn(() => Promise.resolve({ error: null })),
    then: (resolve) => resolve({ data: [], error: null }),
  }
  return builder
}

describe('useProgress markComplete — XP awarding', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.getUser.mockResolvedValue({ data: { user: { id: 'u1' } }, error: null })
    mocks.getActiveChildId.mockReturnValue('c1')
    mocks.from.mockReturnValue(makeBuilder())
    mocks.bumpChildXp.mockResolvedValue(100)
  })

  it('awards XP equal to the mastery score on a first-time old-band completion', async () => {
    const { result } = renderHook(() => useProgress())
    await act(async () => {
      await result.current.markComplete('robotics', 'mission-neural-uplink', 85, 'old')
    })
    expect(mocks.bumpChildXp).toHaveBeenCalledWith('c1', 85)
  })

  it('does not award XP for a non-old-band completion', async () => {
    const { result } = renderHook(() => useProgress())
    await act(async () => {
      await result.current.markComplete('literacy', 'blending-sounds', 90, 'middle')
    })
    expect(mocks.bumpChildXp).not.toHaveBeenCalled()
  })

  it('does not award XP when ageBand is omitted (legacy call sites)', async () => {
    const { result } = renderHook(() => useProgress())
    await act(async () => {
      await result.current.markComplete('robotics', 'mission-neural-uplink', 85)
    })
    expect(mocks.bumpChildXp).not.toHaveBeenCalled()
  })
})
