import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

const mocks = vi.hoisted(() => ({ getUser: vi.fn() }))
vi.mock('./_auth.js', () => mocks)

import { requireAdmin, requireCronSecret, computeTier, ADMIN_EMAIL } from './_admin.js'

describe('requireAdmin', () => {
  beforeEach(() => vi.clearAllMocks())

  it('returns null when there is no signed-in user', async () => {
    mocks.getUser.mockResolvedValue(null)
    expect(await requireAdmin({})).toBeNull()
  })

  it('returns null when the signed-in user is not the admin', async () => {
    mocks.getUser.mockResolvedValue({ id: 'u1', email: 'someone@else.com' })
    expect(await requireAdmin({})).toBeNull()
  })

  it('returns the user when they are the admin', async () => {
    const user = { id: 'u1', email: ADMIN_EMAIL }
    mocks.getUser.mockResolvedValue(user)
    expect(await requireAdmin({})).toBe(user)
  })
})

describe('computeTier', () => {
  it('is free with no subscription row', () => {
    expect(computeTier(null)).toBe('free')
  })

  it('is trial when trial_end is in the future', () => {
    const future = new Date(Date.now() + 86400000).toISOString()
    expect(computeTier({ status: 'trial', trial_end: future })).toBe('trial')
  })

  it('is free when the trial has expired', () => {
    const past = new Date(Date.now() - 86400000).toISOString()
    expect(computeTier({ status: 'trial', trial_end: past })).toBe('free')
  })

  it('is pro when subscription_end is in the future', () => {
    const future = new Date(Date.now() + 86400000).toISOString()
    expect(computeTier({ status: 'active', subscription_end: future })).toBe('pro')
  })

  it('is free when the subscription has expired', () => {
    const past = new Date(Date.now() - 86400000).toISOString()
    expect(computeTier({ status: 'active', subscription_end: past })).toBe('free')
  })
})

describe('requireCronSecret', () => {
  const OLD_ENV = process.env
  beforeEach(() => { process.env = { ...OLD_ENV, CRON_SECRET: 'super-secret' } })
  afterEach(() => { process.env = OLD_ENV })

  it('returns false when CRON_SECRET is not configured', () => {
    process.env.CRON_SECRET = ''
    expect(requireCronSecret({ headers: { 'x-cron-secret': 'anything' } })).toBe(false)
  })

  it('returns false when the header is missing', () => {
    expect(requireCronSecret({ headers: {} })).toBe(false)
  })

  it('returns false when the header does not match', () => {
    expect(requireCronSecret({ headers: { 'x-cron-secret': 'wrong' } })).toBe(false)
  })

  it('returns true when the header matches exactly', () => {
    expect(requireCronSecret({ headers: { 'x-cron-secret': 'super-secret' } })).toBe(true)
  })
})
