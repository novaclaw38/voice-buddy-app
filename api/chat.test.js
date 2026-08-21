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
