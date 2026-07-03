import { useCallback, useEffect, useRef } from 'react'

/**
 * Returns getMouthLevel(): number in 0..1.
 * - Google TTS path: reads live loudness from the <audio> element via an
 *   AnalyserNode.
 * - Fallback (browser speechSynthesis => audioRef.current is null, or the
 *   AudioContext can't run): an organic randomized level so the mouth never
 *   looks frozen.
 */
export function useMouthLevel(audioRef, isSpeaking) {
  const ctxRef       = useRef(null)
  const analyserRef  = useRef(null)
  const dataRef      = useRef(null)
  const connectedRef = useRef(null)   // the <audio> element currently wired up
  const failedRef    = useRef(false)  // give up on Web Audio permanently on error
  const fbRef        = useRef({ level: 0, phase: Math.random() * 6.28 })

  const ensureGraph = useCallback(() => {
    if (failedRef.current) return false
    const el = audioRef?.current
    if (!el) return false
    try {
      if (!ctxRef.current) {
        const AC = window.AudioContext || window.webkitAudioContext
        if (!AC) { failedRef.current = true; return false }
        const ctx = new AC()
        const analyser = ctx.createAnalyser()
        analyser.fftSize = 256
        analyser.smoothingTimeConstant = 0.6
        analyser.connect(ctx.destination)
        ctxRef.current      = ctx
        analyserRef.current = analyser
        dataRef.current     = new Uint8Array(analyser.frequencyBinCount)
      }
      if (connectedRef.current !== el) {
        // A MediaElementSource can only be created once per element; useSpeech
        // makes a fresh <audio> per utterance, so connect each new one.
        const src = ctxRef.current.createMediaElementSource(el)
        src.connect(analyserRef.current)
        connectedRef.current = el
      }
      if (ctxRef.current.state === 'suspended') {
        ctxRef.current.resume().catch(() => {})
      }
      return ctxRef.current.state === 'running'
    } catch (_e) {
      failedRef.current = true
      return false
    }
  }, [audioRef])

  const getMouthLevel = useCallback(() => {
    if (!isSpeaking) return 0
    if (ensureGraph() && analyserRef.current) {
      const a = analyserRef.current
      const data = dataRef.current
      a.getByteTimeDomainData(data)
      let sum = 0
      for (let i = 0; i < data.length; i++) {
        const v = (data[i] - 128) / 128
        sum += v * v
      }
      const rms = Math.sqrt(sum / data.length)
      return Math.max(0, Math.min(1, rms * 3.5))
    }
    // Fallback: organic mouth motion (sine base + jitter, smoothed)
    const f = fbRef.current
    f.phase += 0.35
    const base = Math.sin(f.phase) * 0.5 + 0.5
    const target = base * (0.35 + Math.random() * 0.65)
    f.level += (target - f.level) * 0.45
    return Math.max(0, Math.min(1, f.level))
  }, [isSpeaking, ensureGraph])

  // Close the AudioContext on unmount to free resources.
  useEffect(() => {
    return () => {
      if (ctxRef.current) { ctxRef.current.close().catch(() => {}); ctxRef.current = null }
    }
  }, [])

  return getMouthLevel
}
