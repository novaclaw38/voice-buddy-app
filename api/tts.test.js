import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

const mocks = vi.hoisted(() => ({
  getUser: vi.fn(),
  allowRequest: vi.fn(),
  isEntitled: vi.fn(),
}))
vi.mock('./_auth.js', () => mocks)

import handler, { VOICES, GROQ_VOICES } from './tts.js'

function mockRes() {
  const res = { statusCode: 0, body: null, headers: {} }
  res.status = (c) => { res.statusCode = c; return res }
  res.json = (b) => { res.body = b; return res }
  res.send = (b) => { res.body = b; return res }
  res.setHeader = (k, v) => { res.headers[k] = v }
  return res
}

const req = { method: 'POST', headers: {}, body: { text: 'hello' } }

describe('api/tts daily caps by entitlement', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.getUser.mockResolvedValue({ id: 'u1' })
    mocks.allowRequest.mockResolvedValue(true)
    process.env.GOOGLE_TTS_KEY = 'test-key'
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ audioContent: Buffer.from('audio').toString('base64') }),
    })
  })

  it('caps a free user at 60 calls per day', async () => {
    mocks.isEntitled.mockResolvedValue(false)
    await handler(req, mockRes())
    expect(mocks.allowRequest).toHaveBeenCalledWith('u1', 'tts-1d', 60, 86400)
  })

  it('allows an entitled user 1000 calls per day', async () => {
    mocks.isEntitled.mockResolvedValue(true)
    await handler(req, mockRes())
    expect(mocks.allowRequest).toHaveBeenCalledWith('u1', 'tts-1d', 1000, 86400)
  })

  it('returns 429 once the daily cap is exceeded', async () => {
    mocks.isEntitled.mockResolvedValue(false)
    mocks.allowRequest.mockResolvedValue(false)
    const res = mockRes()
    await handler(req, res)
    expect(res.statusCode).toBe(429)
  })
})

describe('api/tts Groq primary, Google fallback', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.getUser.mockResolvedValue({ id: 'u1' })
    mocks.allowRequest.mockResolvedValue(true)
    mocks.isEntitled.mockResolvedValue(true)
    process.env.GOOGLE_TTS_KEY = 'google-test-key'
    process.env.GROQ_API_KEY = 'groq-test-key'
  })

  afterEach(() => {
    delete process.env.GROQ_API_KEY
  })

  it('uses Groq for a mapped persona and never calls Google', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      arrayBuffer: async () => new TextEncoder().encode('groq-audio').buffer,
    })
    const res = mockRes()
    await handler({ ...req, body: { text: 'hello', voice: 'sunny' } }, res)

    expect(res.statusCode).toBe(200)
    expect(global.fetch).toHaveBeenCalledTimes(1)
    expect(global.fetch).toHaveBeenCalledWith(
      'https://api.groq.com/openai/v1/audio/speech',
      expect.objectContaining({ method: 'POST' })
    )
    expect(res.body.toString()).toBe('groq-audio')
  })

  it('falls back to Google when Groq errors', async () => {
    global.fetch = vi.fn()
      .mockResolvedValueOnce({ ok: false, status: 500, json: async () => ({ error: { message: 'groq down' } }) })
      .mockResolvedValueOnce({ ok: true, json: async () => ({ audioContent: Buffer.from('google-audio').toString('base64') }) })
    const res = mockRes()
    await handler({ ...req, body: { text: 'hello', voice: 'sunny' } }, res)

    expect(res.statusCode).toBe(200)
    expect(global.fetch).toHaveBeenCalledTimes(2)
    expect(res.body.toString()).toBe('google-audio')
  })

  it('skips Groq entirely for an unmapped voice key', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ audioContent: Buffer.from('google-audio').toString('base64') }),
    })
    const res = mockRes()
    await handler({ ...req, body: { text: 'hello', voice: 'not-a-real-persona' } }, res)

    expect(res.statusCode).toBe(200)
    expect(global.fetch).toHaveBeenCalledTimes(1)
    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining('texttospeech.googleapis.com'),
      expect.any(Object)
    )
  })

  it('skips Groq for text over its 200-character cap', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ audioContent: Buffer.from('google-audio').toString('base64') }),
    })
    const res = mockRes()
    const longText = 'a'.repeat(201)
    await handler({ ...req, body: { text: longText, voice: 'sunny' } }, res)

    expect(res.statusCode).toBe(200)
    expect(global.fetch).toHaveBeenCalledTimes(1)
    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining('texttospeech.googleapis.com'),
      expect.any(Object)
    )
  })

  it('every persona has a mapped Groq or Google voice', () => {
    for (const persona of Object.keys(VOICES)) {
      expect(VOICES[persona]).toBeTruthy()
      // Not every persona needs a Groq voice, but every one that has one
      // must point at a real, docs-confirmed Orpheus voice name.
      const groqVoice = GROQ_VOICES[persona]
      if (groqVoice) {
        expect(['autumn', 'diana', 'hannah', 'austin', 'daniel', 'troy']).toContain(groqVoice)
      }
    }
  })
})
