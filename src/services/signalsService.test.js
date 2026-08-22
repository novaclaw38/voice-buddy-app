import { describe, it, expect, vi, beforeEach } from 'vitest'

// Supabase's query builder methods each return the same thenable object,
// so a chain like .select().eq().eq().maybeSingle() and a bare
// .update().eq() (no explicit terminal call — the builder itself is
// awaitable) both resolve through this one mock.
function makeBuilder(result) {
  const builder = {
    select: vi.fn(() => builder),
    eq: vi.fn(() => builder),
    is: vi.fn(() => builder),
    update: vi.fn(() => builder),
    upsert: vi.fn(() => Promise.resolve(result)),
    maybeSingle: vi.fn(() => Promise.resolve(result)),
    then: (resolve) => resolve(result),
  }
  return builder
}

const mocks = vi.hoisted(() => ({
  getUser: vi.fn(),
  from: vi.fn(),
}))
vi.mock('../lib/supabase.js', () => ({
  supabase: { auth: { getUser: mocks.getUser }, from: mocks.from },
}))

import { fetchTodaySignal, upsertSignal, dismissSignal } from './signalsService.js'

describe('signalsService', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.getUser.mockResolvedValue({ data: { user: { id: 'u1' } } })
  })

  it('fetchTodaySignal returns null when signed out', async () => {
    mocks.getUser.mockResolvedValue({ data: { user: null } })
    const result = await fetchTodaySignal('c1')
    expect(result).toBeNull()
    expect(mocks.from).not.toHaveBeenCalled()
  })

  it('fetchTodaySignal returns the row from maybeSingle', async () => {
    const builder = makeBuilder({ data: { id: 's1', blurb: 'hi' }, error: null })
    mocks.from.mockReturnValue(builder)
    const result = await fetchTodaySignal('c1')
    expect(result).toEqual({ id: 's1', blurb: 'hi' })
    expect(mocks.from).toHaveBeenCalledWith('daily_signals')
  })

  // Regression: `.eq('child_id', null)` compiles to `child_id = NULL`, which
  // Postgres evaluates as NULL (never true), so the dedupe lookup silently
  // missed every existing row for users with no active child profile — the
  // legacy single-child path, which still writes child_id IS NULL rows. That
  // fired a fresh Groq classify call and inserted a duplicate row on every
  // concern-keyword message. NULL child_id must be matched with `.is()`.
  it('fetchTodaySignal matches a null child_id with .is(), not .eq()', async () => {
    const builder = makeBuilder({ data: null, error: null })
    mocks.from.mockReturnValue(builder)
    await fetchTodaySignal(null)
    expect(builder.is).toHaveBeenCalledWith('child_id', null)
    expect(builder.eq).not.toHaveBeenCalledWith('child_id', null)
  })

  it('fetchTodaySignal still matches a concrete child_id with .eq()', async () => {
    const builder = makeBuilder({ data: null, error: null })
    mocks.from.mockReturnValue(builder)
    await fetchTodaySignal('c1')
    expect(builder.eq).toHaveBeenCalledWith('child_id', 'c1')
    expect(builder.is).not.toHaveBeenCalled()
  })

  it('fetchTodaySignal throws on a Supabase error', async () => {
    const builder = makeBuilder({ data: null, error: new Error('boom') })
    mocks.from.mockReturnValue(builder)
    await expect(fetchTodaySignal('c1')).rejects.toThrow('boom')
  })

  it('upsertSignal upserts with the current user and child id', async () => {
    const builder = makeBuilder({ error: null })
    mocks.from.mockReturnValue(builder)
    await upsertSignal({ childId: 'c1', blurb: 'Buddy noticed...' })
    expect(builder.upsert).toHaveBeenCalledWith(
      expect.objectContaining({ user_id: 'u1', child_id: 'c1', blurb: 'Buddy noticed...', dismissed: false }),
      expect.objectContaining({ onConflict: 'user_id,child_id,signal_date' })
    )
  })

  it('upsertSignal is a no-op when signed out', async () => {
    mocks.getUser.mockResolvedValue({ data: { user: null } })
    await upsertSignal({ childId: 'c1', blurb: 'x' })
    expect(mocks.from).not.toHaveBeenCalled()
  })

  it('dismissSignal updates dismissed=true for the given id', async () => {
    const builder = makeBuilder({ error: null })
    mocks.from.mockReturnValue(builder)
    await dismissSignal('s1')
    expect(builder.update).toHaveBeenCalledWith({ dismissed: true })
    expect(builder.eq).toHaveBeenCalledWith('id', 's1')
  })
})
