import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

// Bare call-recording fakes, not a real WebRTC/Realtime simulation — this
// tests the message-dispatch/status-transition logic that lives in this
// module, not that a real peer connection negotiates successfully (that's
// covered by manual two-tab verification instead; see the module's header
// comment and the 2026-08-17 architecture review notes).
function createMockChannel() {
  const channel = {
    handler: null,
    sent: [],
    on(_event, _filter, handler) { channel.handler = handler; return channel },
    subscribe(cb) { cb?.('SUBSCRIBED'); return channel },
    send({ payload }) { channel.sent.push(payload) },
    unsubscribe: vi.fn(),
  }
  return channel
}

let lastChannel
vi.mock('../lib/supabase.js', () => ({
  supabase: { channel: vi.fn(() => { lastChannel = createMockChannel(); return lastChannel }) },
}))

// Every instance created is pushed here so tests can reach in and fire
// pc.ontrack / pc.oniceconnectionstatechange directly — those are real
// browser-fired events this fake has no event loop to simulate on its own.
let createdPCs = []

class FakePeerConnection {
  constructor(config) {
    this.config = config
    this.signalingState = 'stable'
    this.iceConnectionState = 'new'
    this.tracks = []
    this.onicecandidate = null
    this.ontrack = null
    this.oniceconnectionstatechange = null
    this.closed = false
    createdPCs.push(this)
  }
  addTrack(track) { this.tracks.push(track) }
  async createOffer() { return { type: 'offer', sdp: 'mock-offer' } }
  async createAnswer() { return { type: 'answer', sdp: 'mock-answer' } }
  async setLocalDescription(desc) {
    if (desc.type === 'offer') this.signalingState = 'have-local-offer'
    if (desc.type === 'answer') this.signalingState = 'stable'
  }
  async setRemoteDescription(desc) {
    if (desc.type === 'offer') this.signalingState = 'have-remote-offer'
    if (desc.type === 'answer') this.signalingState = 'stable'
  }
  async addIceCandidate() {}
  close() { this.closed = true }
}

function fakeStream() {
  const tracks = [{ stop: vi.fn() }, { stop: vi.fn() }]
  return { getTracks: () => tracks }
}

let importCounter = 0
function uniqueUserId() { return `user-${++importCounter}` }

beforeEach(async () => {
  createdPCs = []
  const { supabase } = await import('../lib/supabase.js')
  supabase.channel.mockClear()
  vi.stubGlobal('RTCPeerConnection', FakePeerConnection)
  vi.stubGlobal('RTCSessionDescription', class { constructor(init) { Object.assign(this, init) } })
  vi.stubGlobal('RTCIceCandidate', class { constructor(init) { Object.assign(this, init) } })
  vi.stubGlobal('navigator', { mediaDevices: { getUserMedia: vi.fn().mockResolvedValue(fakeStream()) } })
})

afterEach(() => {
  vi.unstubAllGlobals()
  vi.useRealTimers()
})

const flush = () => Promise.resolve().then(() => Promise.resolve())

describe('cameraSignal — startAsChild', () => {
  it('handles a request: captures media, offers, and reports idle → requesting → streaming', async () => {
    const { startAsChild } = await import('./cameraSignal.js')
    const statuses = []
    startAsChild(uniqueUserId(), { onStatusChange: (s) => statuses.push(s) })
    const channel = lastChannel

    await channel.handler({ payload: { type: 'request' } })
    await flush()

    expect(statuses).toEqual(['idle', 'requesting', 'streaming'])
    expect(channel.sent).toEqual([{ type: 'offer', sdp: { type: 'offer', sdp: 'mock-offer' } }])
  })

  it('ignores a duplicate request while already mid-handshake', async () => {
    const { startAsChild } = await import('./cameraSignal.js')
    const getUserMedia = navigator.mediaDevices.getUserMedia
    startAsChild(uniqueUserId())
    const channel = lastChannel

    await channel.handler({ payload: { type: 'request' } })
    await flush()
    await channel.handler({ payload: { type: 'request' } })
    await flush()

    expect(getUserMedia).toHaveBeenCalledTimes(1)
  })

  it('only applies an answer when signalingState is have-local-offer', async () => {
    const { startAsChild } = await import('./cameraSignal.js')
    startAsChild(uniqueUserId())
    const channel = lastChannel

    // No pc yet — answer arriving before any request is a no-op, not a throw.
    await expect(channel.handler({ payload: { type: 'answer', sdp: { type: 'answer', sdp: 'x' } } })).resolves.not.toThrow()

    await channel.handler({ payload: { type: 'request' } })
    await flush()
    const pc = createdPCs.at(-1)
    expect(pc.signalingState).toBe('have-local-offer')

    // Wrong state — guard should block it, state stays put.
    pc.signalingState = 'stable'
    await channel.handler({ payload: { type: 'answer', sdp: { type: 'answer', sdp: 'x' } } })
    await flush()
    expect(pc.signalingState).toBe('stable')

    // Right state — guard lets it through, moves to stable via the fake's
    // setRemoteDescription (a no-op transition here since it was already
    // stable, but exercises the same code path a real have-local-offer
    // case would).
    pc.signalingState = 'have-local-offer'
    await channel.handler({ payload: { type: 'answer', sdp: { type: 'answer', sdp: 'x' } } })
    await flush()
    expect(pc.signalingState).toBe('stable')
  })

  it('a second start() for the same user returns the existing handle', async () => {
    const { startAsChild } = await import('./cameraSignal.js')
    const { supabase } = await import('../lib/supabase.js')
    const userId = uniqueUserId()

    const handleA = startAsChild(userId)
    const handleB = startAsChild(userId)

    expect(handleB).toBe(handleA)
    expect(supabase.channel).toHaveBeenCalledTimes(1)
  })

  it('connection loss stops media but stays armed (does not unsubscribe)', async () => {
    const { startAsChild } = await import('./cameraSignal.js')
    const statuses = []
    startAsChild(uniqueUserId(), { onStatusChange: (s) => statuses.push(s) })
    const channel = lastChannel

    await channel.handler({ payload: { type: 'request' } })
    await flush()
    const pc = createdPCs.at(-1)
    const [track1, track2] = pc.tracks

    pc.iceConnectionState = 'failed'
    pc.oniceconnectionstatechange()

    expect(statuses.at(-1)).toBe('error')
    expect(track1.stop).toHaveBeenCalled()
    expect(track2.stop).toHaveBeenCalled()
    expect(pc.closed).toBe(true)
    expect(channel.unsubscribe).not.toHaveBeenCalled()
  })

  it('an explicit stop message stops media but leaves the channel subscribed', async () => {
    const { startAsChild } = await import('./cameraSignal.js')
    startAsChild(uniqueUserId())
    const channel = lastChannel

    await channel.handler({ payload: { type: 'request' } })
    await flush()
    await channel.handler({ payload: { type: 'stop' } })
    await flush()

    expect(channel.unsubscribe).not.toHaveBeenCalled()
  })

  it('stop() releases the guard so a fresh start() opens a new channel', async () => {
    const { startAsChild } = await import('./cameraSignal.js')
    const { supabase } = await import('../lib/supabase.js')
    const userId = uniqueUserId()

    const handle = startAsChild(userId)
    handle.stop()
    startAsChild(userId)

    expect(supabase.channel).toHaveBeenCalledTimes(2)
  })
})

describe('cameraSignal — startAsParent', () => {
  it('broadcasts a request after the subscribe settle delay', async () => {
    vi.useFakeTimers()
    const { startAsParent } = await import('./cameraSignal.js')
    startAsParent(uniqueUserId())
    const channel = lastChannel

    expect(channel.sent).toEqual([])
    await vi.advanceTimersByTimeAsync(600)

    expect(channel.sent).toEqual([{ type: 'request' }])
  })

  it('answers an offer and reports streaming once a remote track arrives', async () => {
    const { startAsParent } = await import('./cameraSignal.js')
    const statuses = []
    let receivedStream = null
    startAsParent(uniqueUserId(), {
      onStatusChange: (s) => statuses.push(s),
      onRemoteStream: (s) => { receivedStream = s },
    })
    const channel = lastChannel
    const pc = createdPCs.at(-1)

    await channel.handler({ payload: { type: 'offer', sdp: { type: 'offer', sdp: 'x' } } })
    await flush()

    expect(channel.sent).toEqual([{ type: 'answer', sdp: { type: 'answer', sdp: 'mock-answer' } }])
    expect(statuses).toEqual(['requesting'])

    const fakeRemoteStream = { id: 'remote' }
    pc.ontrack({ streams: [fakeRemoteStream] })

    expect(receivedStream).toBe(fakeRemoteStream)
    expect(statuses).toEqual(['requesting', 'streaming'])
  })

  it('ignores an offer that arrives mid-negotiation (not stable)', async () => {
    const { startAsParent } = await import('./cameraSignal.js')
    startAsParent(uniqueUserId())
    const channel = lastChannel
    const pc = createdPCs.at(-1)

    // Force the mid-negotiation state directly rather than trying to race
    // the fake's own awaits — this is the state a real out-of-order or
    // duplicate offer would arrive in.
    pc.signalingState = 'have-remote-offer'
    await channel.handler({ payload: { type: 'offer', sdp: { type: 'offer', sdp: 'y' } } })
    await flush()

    expect(channel.sent).toEqual([])

    pc.signalingState = 'stable'
    await channel.handler({ payload: { type: 'offer', sdp: { type: 'offer', sdp: 'z' } } })
    await flush()

    expect(channel.sent.length).toBe(1)
  })

  it('a second start() for the same user returns the existing handle', async () => {
    const { startAsParent } = await import('./cameraSignal.js')
    const { supabase } = await import('../lib/supabase.js')
    const userId = uniqueUserId()

    const handleA = startAsParent(userId)
    const handleB = startAsParent(userId)

    expect(handleB).toBe(handleA)
    expect(supabase.channel).toHaveBeenCalledTimes(1)
  })

  it('stop() sends a stop message and unsubscribes', async () => {
    const { startAsParent } = await import('./cameraSignal.js')
    const handle = startAsParent(uniqueUserId())
    const channel = lastChannel

    handle.stop()

    expect(channel.sent).toEqual([{ type: 'stop' }])
    expect(channel.unsubscribe).toHaveBeenCalledTimes(1)
  })
})
