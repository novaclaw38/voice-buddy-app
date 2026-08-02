import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('./chatService.js', () => ({
  authHeaders: vi.fn().mockResolvedValue({ 'Content-Type': 'application/json', Authorization: 'Bearer t' }),
}))

import { fetchOverview, cancelSubscription } from './adminService.js'

describe('adminService', () => {
  beforeEach(() => {
    global.fetch = vi.fn()
  })

  it('fetchOverview returns the parsed body on success', async () => {
    global.fetch.mockResolvedValue({ ok: true, json: async () => ({ users: [], stats: { tierCounts: { free: 0, trial: 0, pro: 0 }, signupsByDay: [] } }) })
    const result = await fetchOverview()
    expect(result.users).toEqual([])
    expect(global.fetch).toHaveBeenCalledWith('/api/admin/overview', expect.objectContaining({ headers: expect.any(Object) }))
  })

  it('fetchOverview throws the server error message on failure', async () => {
    global.fetch.mockResolvedValue({ ok: false, status: 403, json: async () => ({ error: { message: 'Forbidden' } }) })
    await expect(fetchOverview()).rejects.toThrow('Forbidden')
  })

  it('cancelSubscription posts the userId and returns the parsed body', async () => {
    global.fetch.mockResolvedValue({ ok: true, json: async () => ({ ok: true }) })
    const result = await cancelSubscription('u1')
    expect(result).toEqual({ ok: true })
    const [url, options] = global.fetch.mock.calls[0]
    expect(url).toBe('/api/admin/cancel-subscription')
    expect(options.method).toBe('POST')
    expect(JSON.parse(options.body)).toEqual({ userId: 'u1' })
  })
})
