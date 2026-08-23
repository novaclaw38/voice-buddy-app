import { describe, it, expect, vi, beforeEach } from 'vitest'

const mocks = vi.hoisted(() => ({ getUser: vi.fn(), from: vi.fn() }))
vi.mock('../lib/supabase.js', () => ({
  supabase: { auth: { getUser: mocks.getUser }, from: mocks.from },
}))

import { addHistory } from './historyService.js'

describe('addHistory', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.getUser.mockResolvedValue({ data: { user: { id: 'u1' } } })
  })

  it('is a no-op when signed out', async () => {
    mocks.getUser.mockResolvedValue({ data: { user: null } })
    await addHistory({ ts: 1, mode: 'chat', userText: 'hi', buddyText: 'hey' })
    expect(mocks.from).not.toHaveBeenCalled()
  })

  it('inserts the active child id when provided, for the Sunday Storybook recap to attribute chat turns', async () => {
    const insert = vi.fn(() => Promise.resolve({ error: null }))
    mocks.from.mockReturnValue({ insert })
    await addHistory({ ts: 1, mode: 'chat', userText: 'hi', buddyText: 'hey', childId: 'c1' })
    expect(insert).toHaveBeenCalledWith(expect.objectContaining({ child_id: 'c1' }))
  })

  it('inserts a null child id when none is provided (legacy single-child path)', async () => {
    const insert = vi.fn(() => Promise.resolve({ error: null }))
    mocks.from.mockReturnValue({ insert })
    await addHistory({ ts: 1, mode: 'chat', userText: 'hi', buddyText: 'hey' })
    expect(insert).toHaveBeenCalledWith(expect.objectContaining({ child_id: null }))
  })
})
