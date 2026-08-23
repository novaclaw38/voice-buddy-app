import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { sendWhatsAppTemplateMessage } from './_whatsapp.js'

describe('sendWhatsAppTemplateMessage', () => {
  const OLD_ENV = process.env
  beforeEach(() => {
    process.env = { ...OLD_ENV, WHATSAPP_ACCESS_TOKEN: 'token123', WHATSAPP_PHONE_NUMBER_ID: 'pnid1' }
  })
  afterEach(() => {
    process.env = OLD_ENV
    vi.restoreAllMocks()
  })

  it('returns ok:false without calling fetch when not configured', async () => {
    process.env.WHATSAPP_ACCESS_TOKEN = ''
    const fetchSpy = vi.spyOn(global, 'fetch')
    const result = await sendWhatsAppTemplateMessage('+27123', 'weekly_storybook', ['Alex'])
    expect(result).toEqual({ ok: false, error: 'WhatsApp not configured' })
    expect(fetchSpy).not.toHaveBeenCalled()
  })

  it('sends a template message with body parameters and the right auth header', async () => {
    const fetchSpy = vi.spyOn(global, 'fetch').mockResolvedValue({
      ok: true,
      json: async () => ({ messages: [{ id: 'wamid.abc' }] }),
    })
    const result = await sendWhatsAppTemplateMessage('+27123', 'weekly_storybook', ['Alex', 'https://x/y'])
    expect(result).toEqual({ ok: true, messageId: 'wamid.abc' })
    expect(fetchSpy).toHaveBeenCalledWith(
      'https://graph.facebook.com/v20.0/pnid1/messages',
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({ Authorization: 'Bearer token123' }),
      })
    )
    const body = JSON.parse(fetchSpy.mock.calls[0][1].body)
    expect(body).toMatchObject({
      messaging_product: 'whatsapp',
      to: '+27123',
      type: 'template',
      template: {
        name: 'weekly_storybook',
        language: { code: 'en' },
        components: [{ type: 'body', parameters: [{ type: 'text', text: 'Alex' }, { type: 'text', text: 'https://x/y' }] }],
      },
    })
  })

  it('returns a sanitized error when Meta responds with an error', async () => {
    vi.spyOn(global, 'fetch').mockResolvedValue({
      ok: false,
      status: 400,
      json: async () => ({ error: { message: 'Invalid parameter' } }),
    })
    const result = await sendWhatsAppTemplateMessage('+27123', 'weekly_storybook', [])
    expect(result).toEqual({ ok: false, error: 'Invalid parameter' })
  })

  it('returns ok:false when the request itself throws', async () => {
    vi.spyOn(global, 'fetch').mockRejectedValue(new Error('network down'))
    const result = await sendWhatsAppTemplateMessage('+27123', 'weekly_storybook', [])
    expect(result).toEqual({ ok: false, error: 'Could not reach WhatsApp' })
  })
})
