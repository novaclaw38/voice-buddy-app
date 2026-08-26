import { describe, it, expect, vi, beforeEach } from 'vitest'

function makeBuilder(result) {
  const builder = {
    select: vi.fn(() => builder),
    eq: vi.fn(() => builder),
    order: vi.fn(() => builder),
    single: vi.fn(() => Promise.resolve(result)),
    insert: vi.fn(() => builder),
    update: vi.fn(() => builder),
    delete: vi.fn(() => builder),
    then: (resolve) => resolve(result),
  }
  return builder
}

const mocks = vi.hoisted(() => ({
  from: vi.fn(),
  getUser: vi.fn(),
}))
vi.mock('../lib/supabase.js', () => ({
  supabase: {
    from: mocks.from,
    auth: { getUser: mocks.getUser },
  },
}))

const storageMocks = vi.hoisted(() => ({
  getActiveChildId: vi.fn(),
  setActiveChildId: vi.fn(),
  getLegacySettingsRaw: vi.fn(),
  saveSettingsFor: vi.fn(),
}))
vi.mock('../utils/storage.js', () => ({
  getActiveChildId: storageMocks.getActiveChildId,
  setActiveChildId: storageMocks.setActiveChildId,
  getLegacySettingsRaw: storageMocks.getLegacySettingsRaw,
  saveSettingsFor: storageMocks.saveSettingsFor,
}))

import { listChildren, createChild, updateChild, deleteChild, ensureActiveChildMigrated } from './childrenService.js'

describe('childrenService', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.getUser.mockResolvedValue({ data: { user: { id: 'u1' } } })
  })

  it('listChildren returns children ordered by created_at ascending', async () => {
    const children = [
      { id: 'c1', name: 'Ada', buddy_name: 'Buddy', avatar_type: 'bear', avatar_color: '#7c3aed', created_at: '2026-01-01' },
      { id: 'c2', name: 'Leo', buddy_name: 'Leo', avatar_type: 'fox', avatar_color: '#ff8a00', created_at: '2026-01-02' },
    ]
    mocks.from.mockReturnValue(makeBuilder({ data: children, error: null }))
    const result = await listChildren()
    expect(mocks.from).toHaveBeenCalledWith('children')
    expect(result).toEqual(children)
  })

  it('listChildren returns empty array when not logged in', async () => {
    mocks.getUser.mockResolvedValue({ data: { user: null } })
    const result = await listChildren()
    expect(result).toEqual([])
    expect(mocks.from).not.toHaveBeenCalled()
  })

  it('listChildren throws when supabase returns an error', async () => {
    mocks.from.mockReturnValue(makeBuilder({ data: null, error: new Error('boom') }))
    await expect(listChildren()).rejects.toThrow('boom')
  })

  it('createChild inserts with defaults and returns the new child', async () => {
    const newChild = { id: 'c3', name: 'Max', buddy_name: 'Buddy', avatar_type: 'bear', avatar_color: '#7c3aed', created_at: '2026-01-03' }
    const builder = makeBuilder({ data: newChild, error: null })
    mocks.from.mockReturnValue(builder)
    const result = await createChild({ name: 'Max', buddyName: 'Buddy' })
    expect(mocks.from).toHaveBeenCalledWith('children')
    expect(builder.insert).toHaveBeenCalledWith({
      user_id: 'u1',
      name: 'Max',
      buddy_name: 'Buddy',
      avatar_type: 'bear',
      avatar_color: '#7c3aed',
    })
    expect(result).toEqual(newChild)
  })

  it('createChild throws when not logged in', async () => {
    mocks.getUser.mockResolvedValue({ data: { user: null } })
    await expect(createChild({ name: 'Max' })).rejects.toThrow('Not logged in')
  })

  it('updateChild maps camelCase patch to snake_case columns', async () => {
    const builder = makeBuilder({ data: null, error: null })
    mocks.from.mockReturnValue(builder)
    await updateChild('c1', { name: 'Updated', buddyName: 'Bud', avatarType: 'fox', avatarColor: '#ff8a00' })
    expect(builder.update).toHaveBeenCalledWith({
      name: 'Updated',
      buddy_name: 'Bud',
      avatar_type: 'fox',
      avatar_color: '#ff8a00',
    })
    expect(builder.eq).toHaveBeenCalledWith('id', 'c1')
  })

  it('updateChild only includes mapped fields', async () => {
    const builder = makeBuilder({ data: null, error: null })
    mocks.from.mockReturnValue(builder)
    await updateChild('c1', { name: 'Updated' })
    expect(builder.update).toHaveBeenCalledWith({ name: 'Updated' })
  })

  it('deleteChild deletes by id', async () => {
    const builder = makeBuilder({ data: null, error: null })
    mocks.from.mockReturnValue(builder)
    await deleteChild('c1')
    expect(builder.eq).toHaveBeenCalledWith('id', 'c1')
  })

  it('ensureActiveChildMigrated short-circuits when an active child already exists', async () => {
    storageMocks.getActiveChildId.mockReturnValue('c1')
    const result = await ensureActiveChildMigrated()
    expect(result).toBe('c1')
    expect(mocks.from).not.toHaveBeenCalled()
  })

  it('ensureActiveChildMigrated picks the first existing child and saves legacy settings', async () => {
    storageMocks.getActiveChildId.mockReturnValue(null)
    storageMocks.getLegacySettingsRaw.mockReturnValue({ childName: 'OldName' })
    mocks.from.mockReturnValue(makeBuilder({
      data: [{ id: 'c1', name: 'Ada', buddy_name: 'Buddy', avatar_type: 'bear', avatar_color: '#7c3aed', created_at: '2026-01-01' }],
      error: null,
    }))
    const result = await ensureActiveChildMigrated()
    expect(result).toBe('c1')
    expect(storageMocks.setActiveChildId).toHaveBeenCalledWith('c1')
    expect(storageMocks.saveSettingsFor).toHaveBeenCalledWith('c1', { childName: 'OldName' })
  })

  it('ensureActiveChildMigrated creates a child when no children exist', async () => {
    storageMocks.getActiveChildId.mockReturnValue(null)
    storageMocks.getLegacySettingsRaw.mockReturnValue(null)
    mocks.from.mockReturnValueOnce(makeBuilder({ data: [], error: null }))
    const builder = makeBuilder({ data: { id: 'c3', name: '', buddy_name: 'Buddy', avatar_type: 'bear', avatar_color: '#7c3aed', created_at: '2026-01-03' }, error: null })
    mocks.from.mockReturnValueOnce(builder)
    const result = await ensureActiveChildMigrated()
    expect(result).toBe('c3')
    expect(builder.insert).toHaveBeenCalledWith({
      user_id: 'u1',
      name: '',
      buddy_name: 'Buddy',
      avatar_type: 'bear',
      avatar_color: '#7c3aed',
    })
    expect(storageMocks.setActiveChildId).toHaveBeenCalledWith('c3')
  })
})
