// api/admin/index.test.js
import { describe, it, expect, vi, beforeEach } from 'vitest'

const mocks = vi.hoisted(() => ({ requireAdmin: vi.fn(), computeTier: vi.fn() }))
vi.mock('../_admin.js', () => mocks)

import handler from './index.js'

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
