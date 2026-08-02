// api/admin/cancel-subscription.test.js
import { describe, it, expect, vi, beforeEach } from 'vitest'

const mocks = vi.hoisted(() => ({ requireAdmin: vi.fn() }))
vi.mock('../_admin.js', () => mocks)

import handler from './cancel-subscription.js'

function mockRes() {
  const res = { statusCode: 0, body: null, headers: {} }
  res.status = (c) => { res.statusCode = c; return res }
  res.json = (b) => { res.body = b; return res }
  return res
}

describe('api/admin/cancel-subscription access control', () => {
  beforeEach(() => vi.clearAllMocks())

  it('rejects a non-POST request with 405', async () => {
    const res = mockRes()
    await handler({ method: 'GET', headers: {} }, res)
    expect(res.statusCode).toBe(405)
  })

  it('rejects a non-admin request with 403', async () => {
    mocks.requireAdmin.mockResolvedValue(null)
    const res = mockRes()
    await handler({ method: 'POST', headers: {}, body: { userId: 'u1' } }, res)
    expect(res.statusCode).toBe(403)
  })

  it('rejects a missing userId with 400', async () => {
    mocks.requireAdmin.mockResolvedValue({ id: 'admin', email: 'rebawntech@gmail.com' })
    const res = mockRes()
    await handler({ method: 'POST', headers: {}, body: {} }, res)
    expect(res.statusCode).toBe(400)
  })
})
