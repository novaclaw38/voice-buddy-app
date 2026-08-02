// api/admin/overview.test.js
import { describe, it, expect, vi, beforeEach } from 'vitest'

const mocks = vi.hoisted(() => ({ requireAdmin: vi.fn(), computeTier: vi.fn() }))
vi.mock('../_admin.js', () => mocks)

import handler from './overview.js'

function mockRes() {
  const res = { statusCode: 0, body: null, headers: {} }
  res.status = (c) => { res.statusCode = c; return res }
  res.json = (b) => { res.body = b; return res }
  res.setHeader = (k, v) => { res.headers[k] = v }
  return res
}

describe('api/admin/overview access control', () => {
  beforeEach(() => vi.clearAllMocks())

  it('rejects a non-GET request with 405', async () => {
    const res = mockRes()
    await handler({ method: 'POST', headers: {} }, res)
    expect(res.statusCode).toBe(405)
  })

  it('rejects a non-admin request with 403', async () => {
    mocks.requireAdmin.mockResolvedValue(null)
    const res = mockRes()
    await handler({ method: 'GET', headers: {} }, res)
    expect(res.statusCode).toBe(403)
    expect(res.body.error.message).toBeTruthy()
  })
})
