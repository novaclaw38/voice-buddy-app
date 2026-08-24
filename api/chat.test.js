import { describe, it, expect, vi, beforeEach } from 'vitest'

const mocks = vi.hoisted(() => ({
  getUser: vi.fn(),
  isProMode: vi.fn(),
  isEntitled: vi.fn(),
  allowRequest: vi.fn(),
}))
vi.mock('./_auth.js', () => mocks)

import handler from './chat.js'

function mockRes() {
  const res = { statusCode: 0, body: null }
  res.status = (c) => { res.statusCode = c; return res }
  res.json = (b) => { res.body = b; return res }
  return res
}

function req(body) {
  return { method: 'POST', headers: {}, body }
}

const okMessages = [{ role: 'user', content: 'hi' }]

describe('api/chat classify-checkin mode', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.getUser.mockResolvedValue({ id: 'u1' })
    mocks.isEntitled.mockResolvedValue(false)
    mocks.allowRequest.mockResolvedValue(true)
    process.env.GROQ_API_KEY = 'test-key'
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ choices: [{ message: { content: '{"concern":false,"blurb":""}' } }] }),
    })
  })

  it('is not Pro-gated: isProMode is consulted but classify-checkin must not itself require entitlement', async () => {
    mocks.isProMode.mockReturnValue(false) // real _auth.js: 'classify-checkin' is added to FREE_MODES
    const res = mockRes()
    await handler(req({ messages: okMessages, mode: 'classify-checkin' }), res)
    expect(res.statusCode).toBe(200)
  })

  it('does not consume the chat-free-1d bucket for a free user', async () => {
    mocks.isProMode.mockReturnValue(false)
    await handler(req({ messages: okMessages, mode: 'classify-checkin' }), mockRes())
    const calledBuckets = mocks.allowRequest.mock.calls.map((c) => c[1])
    expect(calledBuckets).not.toContain('chat-free-1d')
  })

  it('checks its own classify-1d bucket', async () => {
    mocks.isProMode.mockReturnValue(false)
    await handler(req({ messages: okMessages, mode: 'classify-checkin' }), mockRes())
    expect(mocks.allowRequest).toHaveBeenCalledWith('u1', 'classify-1d', expect.any(Number), 86400)
  })

  it('returns 429 once the classify-1d cap is exceeded', async () => {
    mocks.isProMode.mockReturnValue(false)
    mocks.allowRequest.mockResolvedValue(false)
    const res = mockRes()
    await handler(req({ messages: okMessages, mode: 'classify-checkin' }), res)
    expect(res.statusCode).toBe(429)
  })

  it('a normal chat-mode call still consumes chat-free-1d for a free user, unaffected by the new branch', async () => {
    mocks.isProMode.mockReturnValue(false)
    await handler(req({ messages: okMessages, mode: 'chat' }), mockRes())
    const calledBuckets = mocks.allowRequest.mock.calls.map((c) => c[1])
    expect(calledBuckets).toContain('chat-free-1d')
    expect(calledBuckets).not.toContain('classify-1d')
  })
})

describe('api/chat error sanitization', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.getUser.mockResolvedValue({ id: 'u1' })
    mocks.isProMode.mockReturnValue(false)
    mocks.isEntitled.mockResolvedValue(true)
    mocks.allowRequest.mockResolvedValue(true)
    process.env.GROQ_API_KEY = 'test-key'
  })

  it('sanitizes upstream Groq error responses — does not leak raw Groq fields', async () => {
    // Simulate Groq returning a 400 with internal details
    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 400,
      json: async () => ({
        error: {
          message: 'model "meta-llama/test" not found',
          type: 'invalid_request_error',
          code: 'model_not_found',
          request_id: 'req_abc123',
        },
      }),
    })

    const res = mockRes()
    await handler(req({ messages: okMessages, mode: 'chat' }), res)

    expect(res.statusCode).toBe(400)
    // The safe message should be forwarded
    expect(res.body.error.message).toBe('model "meta-llama/test" not found')
    // But internal Groq-specific fields should NOT be present
    expect(res.body.error.type).toBeUndefined()
    expect(res.body.error.code).toBeUndefined()
    expect(res.body.error.request_id).toBeUndefined()
  })

  it('sanitizes network errors — does not leak internal details', async () => {
    global.fetch = vi.fn().mockRejectedValue(new Error('fetch failed: getaddrinfo ENOTFOUND api.groq.com'))

    const res = mockRes()
    await handler(req({ messages: okMessages, mode: 'chat' }), res)

    expect(res.statusCode).toBe(500)
    // The error message should NOT contain the internal ENOTFOUND detail
    expect(res.body.error.message).not.toContain('ENOTFOUND')
    expect(res.body.error.message).not.toContain('api.groq.com')
    expect(res.body.error.message).toBe('Buddy is temporarily unavailable. Please try again in a moment.')
  })

  it('sanitizes missing API key — does not leak env var name', async () => {
    delete process.env.GROQ_API_KEY
    global.fetch = vi.fn()

    const res = mockRes()
    await handler(req({ messages: okMessages, mode: 'chat' }), res)

    expect(res.statusCode).toBe(500)
    // Should NOT leak that GROQ_API_KEY is the missing var
    expect(res.body.error.message).not.toContain('GROQ_API_KEY')
    expect(res.body.error.message).not.toContain('Vercel')
    expect(res.body.error.message).toBe('Buddy is temporarily unavailable. Please try again in a moment.')
  })

  it('preserves client-handled error codes from 400/403/429 responses', async () => {
    // Our own Pro-required error (403) should still forward the code
    mocks.isEntitled.mockResolvedValue(false)
    mocks.isProMode.mockReturnValue(true)
    global.fetch = vi.fn()

    const res = mockRes()
    await handler(req({ messages: okMessages, mode: 'avatar' }), res)

    expect(res.statusCode).toBe(403)
    expect(res.body.error.message).toBe('This mode is part of Buddy Pro.')
    expect(res.body.error.code).toBe('PRO_REQUIRED')
  })
})
