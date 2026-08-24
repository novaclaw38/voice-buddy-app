import { describe, it, expect, vi, beforeEach } from 'vitest'

function makeBuilder(result) {
  const builder = {
    select: vi.fn(() => builder),
    eq: vi.fn(() => builder),
    update: vi.fn(() => builder),
    maybeSingle: vi.fn(() => Promise.resolve(result)),
    then: (resolve) => resolve(result),
  }
  return builder
}

const mocks = vi.hoisted(() => ({ getUser: vi.fn(), from: vi.fn() }))
vi.mock('../lib/supabase.js', () => ({
  supabase: { auth: { getUser: mocks.getUser }, from: mocks.from },
}))

import { fetchWhatsAppPrefs, updateWhatsAppPrefs } from './profileService.js'

describe('profileService', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.getUser.mockResolvedValue({ data: { user: { id: 'u1' } } })
  })

  it('fetchWhatsAppPrefs returns null when signed out', async () => {
    mocks.getUser.mockResolvedValue({ data: { user: null } })
    expect(await fetchWhatsAppPrefs()).toBeNull()
    expect(mocks.from).not.toHaveBeenCalled()
  })

  it('fetchWhatsAppPrefs returns defaults when no row exists', async () => {
    mocks.from.mockReturnValue(makeBuilder({ data: null, error: null }))
    expect(await fetchWhatsAppPrefs()).toEqual({ number: '', optIn: false })
  })

  it('fetchWhatsAppPrefs returns the stored number and opt-in flag', async () => {
    mocks.from.mockReturnValue(makeBuilder({ data: { whatsapp_number: '+27123', whatsapp_opt_in: true }, error: null }))
    expect(await fetchWhatsAppPrefs()).toEqual({ number: '+27123', optIn: true })
  })

  it('fetchWhatsAppPrefs throws on a Supabase error', async () => {
    mocks.from.mockReturnValue(makeBuilder({ data: null, error: new Error('boom') }))
    await expect(fetchWhatsAppPrefs()).rejects.toThrow('boom')
  })

  it('updateWhatsAppPrefs is a no-op when signed out', async () => {
    mocks.getUser.mockResolvedValue({ data: { user: null } })
    await updateWhatsAppPrefs({ number: '+27123', optIn: true })
    expect(mocks.from).not.toHaveBeenCalled()
  })

  it('updateWhatsAppPrefs writes number and opt-in for the current user', async () => {
    const builder = makeBuilder({ error: null })
    mocks.from.mockReturnValue(builder)
    await updateWhatsAppPrefs({ number: '+27123', optIn: true })
    expect(builder.update).toHaveBeenCalledWith({ whatsapp_number: '+27123', whatsapp_opt_in: true })
    expect(builder.eq).toHaveBeenCalledWith('id', 'u1')
  })

  it('updateWhatsAppPrefs stores null instead of an empty string number', async () => {
    const builder = makeBuilder({ error: null })
    mocks.from.mockReturnValue(builder)
    await updateWhatsAppPrefs({ number: '', optIn: false })
    expect(builder.update).toHaveBeenCalledWith({ whatsapp_number: null, whatsapp_opt_in: false })
  })

  it('updateWhatsAppPrefs throws on a Supabase error', async () => {
    mocks.from.mockReturnValue(makeBuilder({ error: new Error('boom') }))
    await expect(updateWhatsAppPrefs({ number: '+27123', optIn: true })).rejects.toThrow('boom')
  })
})
