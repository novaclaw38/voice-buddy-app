import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('./chatService.js', () => ({
  authHeaders: vi.fn().mockResolvedValue({ 'Content-Type': 'application/json', Authorization: 'Bearer t' }),
}))

import { fetchOverview, cancelSubscription, fetchUserDetail, grantPro, banUser, unbanUser, deleteUser } from './adminService.js'

describe('adminService', () => {
  beforeEach(() => {
    global.fetch = vi.fn()
  })

  it('fetchOverview returns the parsed body on success', async () => {
    global.fetch.mockResolvedValue({ ok: true, json: async () => ({ users: [], stats: { tierCounts: { free: 0, trial: 0, pro: 0 }, signupsByDay: [] } }) })
    const result = await fetchOverview()
    expect(result.users).toEqual([])
    expect(global.fetch).toHaveBeenCalledWith('/api/admin', expect.objectContaining({ headers: expect.any(Object) }))
  })

  it('fetchOverview throws the server error message on failure', async () => {
    global.fetch.mockResolvedValue({ ok: false, status: 403, json: async () => ({ error: { message: 'Forbidden' } }) })
    await expect(fetchOverview()).rejects.toThrow('Forbidden')
  })

  it('cancelSubscription posts the action and userId, and returns the parsed body', async () => {
    global.fetch.mockResolvedValue({ ok: true, json: async () => ({ ok: true }) })
    const result = await cancelSubscription('u1')
    expect(result).toEqual({ ok: true })
    const [url, options] = global.fetch.mock.calls[0]
    expect(url).toBe('/api/admin')
    expect(options.method).toBe('POST')
    expect(JSON.parse(options.body)).toEqual({ action: 'cancelSubscription', userId: 'u1' })
  })

  it('fetchUserDetail requests the userId query param', async () => {
    global.fetch.mockResolvedValue({ ok: true, json: async () => ({ payments: [], children: [], lessonActivity: [] }) })
    await fetchUserDetail('u1')
    expect(global.fetch).toHaveBeenCalledWith('/api/admin?userId=u1', expect.objectContaining({ headers: expect.any(Object) }))
  })

  it('grantPro posts the action, userId, and endDate', async () => {
    global.fetch.mockResolvedValue({ ok: true, json: async () => ({ ok: true }) })
    await grantPro('u1', '2026-12-01')
    const [, options] = global.fetch.mock.calls[0]
    expect(JSON.parse(options.body)).toEqual({ action: 'grantPro', userId: 'u1', endDate: '2026-12-01' })
  })

  it('banUser posts the banUser action', async () => {
    global.fetch.mockResolvedValue({ ok: true, json: async () => ({ ok: true }) })
    await banUser('u1')
    const [, options] = global.fetch.mock.calls[0]
    expect(JSON.parse(options.body)).toEqual({ action: 'banUser', userId: 'u1' })
  })

  it('unbanUser posts the unbanUser action', async () => {
    global.fetch.mockResolvedValue({ ok: true, json: async () => ({ ok: true }) })
    await unbanUser('u1')
    const [, options] = global.fetch.mock.calls[0]
    expect(JSON.parse(options.body)).toEqual({ action: 'unbanUser', userId: 'u1' })
  })

  it('deleteUser posts the deleteUser action', async () => {
    global.fetch.mockResolvedValue({ ok: true, json: async () => ({ ok: true }) })
    await deleteUser('u1')
    const [, options] = global.fetch.mock.calls[0]
    expect(JSON.parse(options.body)).toEqual({ action: 'deleteUser', userId: 'u1' })
  })
})
