import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useSpeech } from './useSpeech.js'

// useSpeech reaches Supabase only to attach an auth token to the /api/tts
// request — not exercised by these tests, so a bare no-session stub is enough.
vi.mock('../lib/supabase.js', () => ({
  supabase: { auth: { getSession: () => Promise.resolve({ data: { session: null } }) } },
}))

// requestAnimationFrame fake with a manually-triggerable queue, so a test can
// assert the karaoke loop actually starts/stops instead of racing real frames.
function mockRaf() {
  let nextId = 0
  const pending = new Map()
  vi.stubGlobal('requestAnimationFrame', (cb) => { const id = ++nextId; pending.set(id, cb); return id })
  vi.stubGlobal('cancelAnimationFrame', (id) => { pending.delete(id) })
  return {
    tick() {
      const callbacks = [...pending.values()]
      pending.clear()
      callbacks.forEach((cb) => cb())
    },
    pendingCount: () => pending.size,
  }
}

// jsdom has no SpeechSynthesisUtterance — this captures the instance
// fallbackSpeak() creates so a test can fire its onboundary/onend/onerror
// handlers directly, the same way the real Web Speech API would.
let capturedUtter
class FakeUtterance {
  constructor(text) {
    this.text = text
    this.onboundary = null
    this.onend = null
    this.onerror = null
    // eslint-disable-next-line @typescript-eslint/no-this-alias
    capturedUtter = this
  }
}

async function flushMicrotasks() {
  await Promise.resolve()
  await new Promise((r) => setTimeout(r, 0))
}

describe('useSpeech word tracking', () => {
  let raf

  beforeEach(() => {
    raf = mockRaf()
    capturedUtter = undefined
    vi.stubGlobal('SpeechSynthesisUtterance', FakeUtterance)
    // Google TTS always fails in these tests, forcing the Web Speech
    // fallback path (fallbackSpeak) that boundaryWordRef-driven tracking
    // depends on.
    vi.stubGlobal('fetch', vi.fn(() => Promise.reject(new Error('network down'))))
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('starts at -1', () => {
    const { result } = renderHook(() => useSpeech({}))
    expect(result.current.wordIndex).toBe(-1)
  })

  it('starts the RAF loop synchronously as soon as speak() is called, before the TTS fetch resolves', async () => {
    const { result } = renderHook(() => useSpeech({}))
    act(() => { result.current.speak('hello little buddy') })
    expect(raf.pendingCount()).toBe(1)
    await act(async () => { await flushMicrotasks() }) // let the rejected fetch settle before the test ends
  })

  it('tracks word position from the Web Speech fallback once Google TTS fails', async () => {
    const { result } = renderHook(() => useSpeech({}))
    await act(async () => {
      result.current.speak('hello little buddy')
      await flushMicrotasks()
    })

    expect(capturedUtter).toBeTruthy()
    act(() => { capturedUtter.onboundary({ name: 'word', charIndex: 6 } ) }) // just past "hello "
    act(() => { raf.tick() })

    expect(result.current.wordIndex).toBe(1)
  })

  it('resets to -1 and stops the RAF loop when the fallback utterance ends', async () => {
    const { result } = renderHook(() => useSpeech({}))
    await act(async () => {
      result.current.speak('hello little buddy')
      await flushMicrotasks()
    })
    act(() => { capturedUtter.onboundary({ name: 'word', charIndex: 6 }) })
    act(() => { raf.tick() })
    expect(result.current.wordIndex).toBe(1)

    act(() => { capturedUtter.onend() })

    expect(result.current.wordIndex).toBe(-1)
    expect(raf.pendingCount()).toBe(0)
  })

  it('resets to -1 and stops the RAF loop on fallback error too', async () => {
    const { result } = renderHook(() => useSpeech({}))
    await act(async () => {
      result.current.speak('hello little buddy')
      await flushMicrotasks()
    })
    act(() => { capturedUtter.onerror() })

    expect(result.current.wordIndex).toBe(-1)
    expect(raf.pendingCount()).toBe(0)
  })

  it('stopSpeaking() resets wordIndex and stops the RAF loop immediately', async () => {
    const { result } = renderHook(() => useSpeech({}))
    act(() => { result.current.speak('hello little buddy') })
    expect(raf.pendingCount()).toBe(1)

    act(() => { result.current.stopSpeaking() })

    expect(result.current.wordIndex).toBe(-1)
    expect(raf.pendingCount()).toBe(0)
    await act(async () => { await flushMicrotasks() }) // let the rejected fetch settle before the test ends
  })

  it('a second speak() call resets tracking for the new text instead of leaving two loops running', async () => {
    const { result } = renderHook(() => useSpeech({}))
    act(() => { result.current.speak('first phrase') })
    expect(raf.pendingCount()).toBe(1)

    act(() => { result.current.speak('second phrase here') })

    // stopSpeaking() (called at the top of speak()) cancels the first loop's
    // frame before the new one is requested, so exactly one is pending.
    expect(raf.pendingCount()).toBe(1)
    await act(async () => { await flushMicrotasks() }) // let both rejected fetches settle before the test ends
  })
})
