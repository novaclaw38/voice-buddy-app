import { describe, it, expect, vi } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { usePendingAsk } from './usePendingAsk.js'

// Bare call-recording fake — not a real speech engine. Captures whichever
// callback speak()/startListening() were given so a test can fire it
// directly, mirroring how useSpeech.js actually invokes them.
function createFakeSpeech({ stt = true } = {}) {
  return {
    supported: { stt, tts: true },
    stopListening: vi.fn(),
    speak: vi.fn(),
    startListening: vi.fn(),
  }
}

function setup(speechOverrides) {
  const speech = createFakeSpeech(speechOverrides)
  const setBuddyText = vi.fn()
  const setUiStatus = vi.fn()
  const { result } = renderHook(() => usePendingAsk({ speech, setBuddyText, setUiStatus }))
  return { speech, setBuddyText, setUiStatus, result }
}

describe('usePendingAsk', () => {
  it('starts with no pending ask', () => {
    const { result } = setup()
    expect(result.current.phase).toBe(null)
  })

  it('ask() speaks the prompt and moves to the ask phase', () => {
    const { result, speech, setBuddyText, setUiStatus } = setup()
    act(() => { result.current.ask('Want to hear it?', vi.fn()) })

    expect(result.current.phase).toBe('ask')
    expect(setBuddyText).toHaveBeenCalledWith('Want to hear it?')
    expect(setUiStatus).toHaveBeenCalledWith('speaking')
    expect(speech.speak).toHaveBeenCalledWith('Want to hear it?', expect.any(Function))
  })

  it('listens after speaking when STT is supported, and branches to onYes on a yes transcript', () => {
    const onYes = vi.fn()
    const { result, speech, setUiStatus } = setup()
    act(() => { result.current.ask('Want to hear it?', onYes) })

    const onSpeakDone = speech.speak.mock.calls[0][1]
    act(() => { onSpeakDone() })
    expect(setUiStatus).toHaveBeenCalledWith('listening')
    expect(speech.startListening).toHaveBeenCalled()

    const onResult = speech.startListening.mock.calls[0][0]
    act(() => { onResult('yes please') })

    expect(onYes).toHaveBeenCalled()
    expect(result.current.phase).toBe(null)
    expect(setUiStatus).toHaveBeenCalledWith('idle')
  })

  it('declines on a no transcript: clears phase, buddyText, and runs onNo', () => {
    const onYes = vi.fn()
    const onNo = vi.fn()
    const { result, speech, setBuddyText } = setup()
    act(() => { result.current.ask('Want to hear it?', onYes, onNo) })

    const onSpeakDone = speech.speak.mock.calls[0][1]
    act(() => { onSpeakDone() })
    const onResult = speech.startListening.mock.calls[0][0]
    act(() => { onResult('nah no thanks') })

    expect(onYes).not.toHaveBeenCalled()
    expect(onNo).toHaveBeenCalled()
    expect(result.current.phase).toBe(null)
    expect(setBuddyText).toHaveBeenCalledWith('')
  })

  it('when STT is unsupported, stops at idle after speaking instead of listening', () => {
    const { result, speech, setUiStatus } = setup({ stt: false })
    act(() => { result.current.ask('Want to hear it?', vi.fn()) })

    const onSpeakDone = speech.speak.mock.calls[0][1]
    act(() => { onSpeakDone() })

    expect(speech.startListening).not.toHaveBeenCalled()
    expect(setUiStatus).toHaveBeenCalledWith('idle')
    // Stays in the ask phase so a tap-button UI (rendered by the caller) can
    // still resolve it via accept()/decline().
    expect(result.current.phase).toBe('ask')
  })

  it('accept() resolves a pending ask without going through voice (tap "Yes" path)', () => {
    const onYes = vi.fn()
    const { result } = setup()
    act(() => { result.current.ask('Want to hear it?', onYes) })

    act(() => { result.current.accept() })

    expect(onYes).toHaveBeenCalled()
    expect(result.current.phase).toBe(null)
  })

  it('decline() resolves a pending ask without going through voice (tap "Not now" path), running onNo', () => {
    const onNo = vi.fn()
    const { result, speech, setBuddyText } = setup()
    act(() => { result.current.ask('Want to hear it?', vi.fn(), onNo) })

    act(() => { result.current.decline() })

    expect(speech.stopListening).toHaveBeenCalled()
    expect(onNo).toHaveBeenCalled()
    expect(setBuddyText).toHaveBeenCalledWith('')
    expect(result.current.phase).toBe(null)
  })

  it('accept()/decline() are no-ops when nothing is pending', () => {
    const { result } = setup()
    act(() => { result.current.accept() })
    act(() => { result.current.decline() })
    expect(result.current.phase).toBe(null)
  })
})
