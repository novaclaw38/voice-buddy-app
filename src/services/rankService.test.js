import { describe, it, expect, vi, beforeEach } from 'vitest'

function makeBuilder(result) {
  const builder = {
    select: vi.fn(() => builder),
    eq: vi.fn(() => builder),
    maybeSingle: vi.fn(() => Promise.resolve(result)),
    then: (resolve) => resolve(result),
  }
  return builder
}

const mocks = vi.hoisted(() => ({
  from: vi.fn(),
  rpc: vi.fn(),
}))
vi.mock('../lib/supabase.js', () => ({
  supabase: { from: mocks.from, rpc: mocks.rpc },
}))

import { fetchChildRank, bumpChildXp } from './rankService.js'

describe('rankService', () => {
  beforeEach(() => vi.clearAllMocks())

  it('fetchChildRank returns null for a childId with no row yet', async () => {
    const builder = makeBuilder({ data: null, error: null })
    mocks.from.mockReturnValue(builder)
    const result = await fetchChildRank('c1')
    expect(result).toEqual({ totalXp: 0 })
    expect(mocks.from).toHaveBeenCalledWith('child_ranks')
  })

  it('fetchChildRank returns the stored totalXp', async () => {
    const builder = makeBuilder({ data: { total_xp: 350 }, error: null })
    mocks.from.mockReturnValue(builder)
    const result = await fetchChildRank('c1')
    expect(result).toEqual({ totalXp: 350 })
  })

  it('fetchChildRank returns null immediately for a null childId, without querying', async () => {
    const result = await fetchChildRank(null)
    expect(result).toBeNull()
    expect(mocks.from).not.toHaveBeenCalled()
  })

  it('bumpChildXp calls the RPC with the child id and delta, returns the new total', async () => {
    mocks.rpc.mockResolvedValue({ data: 450, error: null })
    const result = await bumpChildXp('c1', 100)
    expect(mocks.rpc).toHaveBeenCalledWith('bump_child_xp', { p_child_id: 'c1', p_xp_delta: 100 })
    expect(result).toBe(450)
  })

  it('bumpChildXp returns null and does not throw on an RPC error', async () => {
    mocks.rpc.mockResolvedValue({ data: null, error: { message: 'boom' } })
    const result = await bumpChildXp('c1', 100)
    expect(result).toBeNull()
  })

  it('bumpChildXp is a no-op for a null childId', async () => {
    const result = await bumpChildXp(null, 100)
    expect(result).toBeNull()
    expect(mocks.rpc).not.toHaveBeenCalled()
  })
})
