// api/admin/index.test.js
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

const mocks = vi.hoisted(() => ({
  requireAdmin: vi.fn(),
  requireCronSecret: vi.fn(),
  computeTier: vi.fn(),
  createClient: vi.fn(),
}))
vi.mock('../_admin.js', () => mocks)
vi.mock('@supabase/supabase-js', () => ({ createClient: mocks.createClient }))

import handler from './index.js'

// Queue-based Supabase mock: each `.from(table)` call pops the next builder
// off the queue, in the exact order handleWeeklyDigest issues its queries.
// Every chain method returns the builder itself so any `.select().eq()...`
// shape works; `then`/`maybeSingle`/`single` resolve the canned result.
function makeBuilder(result) {
  const builder = {
    select: vi.fn(() => builder),
    eq: vi.fn(() => builder),
    not: vi.fn(() => builder),
    gte: vi.fn(() => builder),
    lt: vi.fn(() => builder),
    order: vi.fn(() => builder),
    limit: vi.fn(() => builder),
    insert: vi.fn(() => builder),
    update: vi.fn(() => builder),
    maybeSingle: vi.fn(() => Promise.resolve(result)),
    single: vi.fn(() => Promise.resolve(result)),
    then: (resolve) => resolve(result),
  }
  return builder
}

function fakeClientFromQueue(queue) {
  return { from: vi.fn(() => queue.shift()) }
}

function mockRes() {
  const res = { statusCode: 0, body: null, headers: {} }
  res.status = (c) => { res.statusCode = c; return res }
  res.json = (b) => { res.body = b; return res }
  res.setHeader = (k, v) => { res.headers[k] = v }
  return res
}

describe('api/admin access control', () => {
  beforeEach(() => vi.clearAllMocks())

  it('rejects a non-admin GET (overview) request with 403', async () => {
    mocks.requireAdmin.mockResolvedValue(null)
    const res = mockRes()
    await handler({ method: 'GET', headers: {} }, res)
    expect(res.statusCode).toBe(403)
    expect(res.body.error.message).toBeTruthy()
  })

  it('rejects a non-admin POST (cancel-subscription) request with 403', async () => {
    mocks.requireAdmin.mockResolvedValue(null)
    const res = mockRes()
    await handler({ method: 'POST', headers: {}, body: { userId: 'u1' } }, res)
    expect(res.statusCode).toBe(403)
  })

  it('rejects an unsupported method with 405 once admin-authorized', async () => {
    mocks.requireAdmin.mockResolvedValue({ id: 'admin', email: 'rebawntech@gmail.com' })
    const res = mockRes()
    await handler({ method: 'DELETE', headers: {} }, res)
    expect(res.statusCode).toBe(405)
  })

  it('rejects a cancel-subscription request missing userId with 400', async () => {
    mocks.requireAdmin.mockResolvedValue({ id: 'admin', email: 'rebawntech@gmail.com' })
    const res = mockRes()
    await handler({ method: 'POST', headers: {}, body: {} }, res)
    expect(res.statusCode).toBe(400)
  })
})

describe('api/admin new capabilities', () => {
  beforeEach(() => vi.clearAllMocks())

  it('rejects a POST with an unknown action with 400', async () => {
    mocks.requireAdmin.mockResolvedValue({ id: 'admin', email: 'rebawntech@gmail.com' })
    const res = mockRes()
    await handler({ method: 'POST', headers: {}, body: { action: 'nonsense', userId: 'u1' } }, res)
    expect(res.statusCode).toBe(400)
  })

  it('still accepts a cancelSubscription action (renamed from the old bare-userId shape)', async () => {
    mocks.requireAdmin.mockResolvedValue({ id: 'admin', email: 'rebawntech@gmail.com' })
    const res = mockRes()
    await handler({ method: 'POST', headers: {}, body: { action: 'cancelSubscription' } }, res)
    expect(res.statusCode).toBe(400) // missing userId still 400s, same as before
  })
})

describe('api/admin weeklyDigest cron trigger', () => {
  const OLD_ENV = process.env
  beforeEach(() => {
    vi.clearAllMocks()
    process.env = { ...OLD_ENV, SUPABASE_URL: 'https://x.supabase.co', SUPABASE_SERVICE_KEY: 'svc-key' }
  })
  afterEach(() => { process.env = OLD_ENV })

  it('rejects a weeklyDigest call without a valid cron secret, without ever checking requireAdmin', async () => {
    mocks.requireCronSecret.mockReturnValue(false)
    const res = mockRes()
    await handler({ method: 'POST', headers: {}, body: { action: 'weeklyDigest' } }, res)
    expect(res.statusCode).toBe(403)
    expect(mocks.requireAdmin).not.toHaveBeenCalled()
  })

  it('sends nothing and reports zero counts when no parent has opted in', async () => {
    mocks.requireCronSecret.mockReturnValue(true)
    const queue = [makeBuilder({ data: [], error: null })] // profiles query
    mocks.createClient.mockReturnValue(fakeClientFromQueue(queue))
    const res = mockRes()
    await handler({ method: 'POST', headers: {}, body: { action: 'weeklyDigest' } }, res)
    expect(res.statusCode).toBe(200)
    expect(res.body).toMatchObject({ ok: true, sent: 0, skipped: 0, failed: 0 })
  })

  it('skips a child that already has a recap for this week (idempotent re-run)', async () => {
    mocks.requireCronSecret.mockReturnValue(true)
    const queue = [
      makeBuilder({ data: [{ id: 'parent1', whatsapp_number: '+27123' }], error: null }), // profiles
      makeBuilder({ data: [{ id: 'child1', name: 'Alex' }], error: null }), // children
      makeBuilder({ data: { id: 'existing-recap' }, error: null }), // existing weekly_recaps row -> skip
    ]
    mocks.createClient.mockReturnValue(fakeClientFromQueue(queue))
    const res = mockRes()
    await handler({ method: 'POST', headers: {}, body: { action: 'weeklyDigest' } }, res)
    expect(res.statusCode).toBe(200)
    expect(res.body).toMatchObject({ ok: true, sent: 0, skipped: 1, failed: 0 })
  })
})
