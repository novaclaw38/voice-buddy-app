import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

const originalLocation = window.location

beforeEach(() => {
  vi.stubGlobal('fetch', vi.fn())
  delete window.location
  window.location = { href: '' }
})

afterEach(() => {
  window.location = originalLocation
  vi.unstubAllGlobals()
})

import { startCheckout } from './checkoutService.js'

describe('startCheckout', () => {
  const session = { access_token: 'tok', user: { user_metadata: { full_name: 'Ada Lovelace' } } }

  it('redirects to the returned paymentUrl on success', async () => {
    fetch.mockResolvedValue({ json: () => Promise.resolve({ paymentUrl: 'https://payfast.example/pay/1' }) })
    const result = await startCheckout(session)
    expect(result).toEqual({ ok: true })
    expect(window.location.href).toBe('https://payfast.example/pay/1')
    expect(fetch).toHaveBeenCalledWith('/api/payfast-create', expect.objectContaining({
      method: 'POST',
      headers: expect.objectContaining({ Authorization: 'Bearer tok' }),
    }))
  })

  it('returns a friendly error and does not redirect on API error', async () => {
    fetch.mockResolvedValue({ json: () => Promise.resolve({ error: 'boom' }) })
    const result = await startCheckout(session)
    expect(result.ok).toBe(false)
    expect(result.message).toMatch(/something went wrong/i)
    expect(window.location.href).toBe('')
  })

  it('returns a friendly error when there is no session', async () => {
    const result = await startCheckout(null)
    expect(result.ok).toBe(false)
    expect(fetch).not.toHaveBeenCalled()
  })
})
