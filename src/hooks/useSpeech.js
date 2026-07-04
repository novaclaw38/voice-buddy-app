import { useState, useEffect, useRef, useCallback } from 'react'
import { supabase } from '../lib/supabase.js'
import { isValidVoiceKey, DEFAULT_VOICE } from '../utils/voiceOptions.js'

const SpeechRec =
  typeof window !== 'undefined'
    ? window.SpeechRecognition || window.webkitSpeechRecognition
    : null

export function useSpeech(settings) {
  const [status, setStatus] = useState('idle')
  const [transcript, setTranscript] = useState('')
  const [voices, setVoices] = useState([])
  const recRef    = useRef(null)
  const synthRef  = useRef(window.speechSynthesis)
  const audioRef  = useRef(null)         // Google TTS <Audio>
  const boundaryWordRef = useRef(-1)     // word index from Web Speech onboundary
  const onResultRef = useRef(null)
  const listeningRef = useRef(false)
  // speak() is async (network round-trip to /api/tts) but stopSpeaking()
  // only clears whatever audio already exists — if a second speak() call
  // starts before the first's fetch resolves, stopSpeaking() at the top of
  // each call finds nothing to stop yet, and both can end up playing at
  // once. This token lets a stale call's async continuation recognize a
  // newer call has since taken over and bail out instead of racing it.
  const speakTokenRef = useRef(0)

  const supported = { stt: !!SpeechRec, tts: true }

  // Load browser voices (used only as fallback)
  useEffect(() => {
    const load = () => {
      const v = synthRef.current?.getVoices() || []
      if (v.length) setVoices(v)
    }
    load()
    synthRef.current?.addEventListener('voiceschanged', load)
    return () => synthRef.current?.removeEventListener('voiceschanged', load)
  }, [])

  // ── Fallback: browser Web Speech API ──────────────────────────────────────
  // This only ever runs if Google TTS itself fails, so it can't offer the
  // same named voices — just pick a reasonable default English voice.
  const getFallbackVoice = useCallback(() => {
    if (!voices.length) return null
    if (settings?.voiceName) {
      const match = voices.find((v) => v.name === settings.voiceName)
      if (match) return match
    }
    return voices.find((v) => v.lang.startsWith('en')) || voices[0]
  }, [voices, settings?.voiceName])

  // voiceOpts lets a caller give a mode/category its own "voice color" on top
  // of the user's own accessibility settings: pitchOffset (~-20..20, same
  // semitone-ish scale as the Google TTS pitch below) and rateMul (a speed
  // multiplier applied to the base rate).
  const fallbackSpeak = useCallback((text, onDone, voiceOpts = {}) => {
    if (!synthRef.current || !text) { onDone?.(); return }
    synthRef.current.cancel()
    const utter = new SpeechSynthesisUtterance(text)
    const baseRate  = settings?.speechRate  ?? 0.9
    const basePitch = settings?.speechPitch ?? 1.1
    utter.voice  = getFallbackVoice()
    utter.rate   = Math.max(0.1, Math.min(10, baseRate * (voiceOpts.rateMul ?? 1)))
    utter.pitch  = Math.max(0, Math.min(2, basePitch + (voiceOpts.pitchOffset ?? 0) / 20))
    utter.volume = 1
    utter.onboundary = (e) => {
      if (e.name !== 'word') return
      boundaryWordRef.current = text.slice(0, e.charIndex).trim().split(/\s+/).filter(Boolean).length
    }
    utter.onend  = () => { boundaryWordRef.current = -1; setStatus('idle'); onDone?.() }
    utter.onerror = () => { boundaryWordRef.current = -1; setStatus('idle'); onDone?.() }
    setTimeout(() => synthRef.current?.speak(utter), 0)
  }, [getFallbackVoice, settings?.speechRate, settings?.speechPitch])

  // ── Stop helpers ──────────────────────────────────────────────────────────
  const stopListening = useCallback(() => {
    listeningRef.current = false
    if (recRef.current) { recRef.current.stop(); recRef.current = null }
  }, [])

  const stopSpeaking = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause()
      audioRef.current.src = ''
      audioRef.current = null
    }
    boundaryWordRef.current = -1
    synthRef.current?.cancel()
    setStatus('idle')
    // Invalidate any speak() call still awaiting its /api/tts response so it
    // can't play its audio after the fact once this one resolves.
    speakTokenRef.current++
  }, [])

  // ── Google TTS speak ──────────────────────────────────────────────────────
  // voiceOpts: optional { pitchOffset, rateMul } — see fallbackSpeak above.
  const speak = useCallback((text, onDone, voiceOpts = {}) => {
    if (!text) { onDone?.(); return }
    stopListening()
    stopSpeaking()
    setStatus('speaking')

    const callId = ++speakTokenRef.current
    const isStale = () => speakTokenRef.current !== callId

    const baseRate  = settings?.speechRate ?? 0.9
    const voice     = isValidVoiceKey(settings?.voiceName) ? settings.voiceName : DEFAULT_VOICE
    const rate  = Math.max(0.25, Math.min(4, baseRate * (voiceOpts.rateMul ?? 1)))
    const pitch = Math.max(-20, Math.min(20, voiceOpts.pitchOffset ?? 0))

    supabase.auth.getSession()
      .then(({ data }) => {
        const authToken = data?.session?.access_token
        return fetch('/api/tts', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}),
          },
          body: JSON.stringify({ text, rate, pitch, voice }),
        })
      })
      .then(async (r) => {
        if (!r.ok) {
          // Falls back to browser TTS below, but that silently masks real
          // failures (wrong/missing key, quota, bad request) as "it just
          // always sounds the same" — log the real reason so it's debuggable.
          const body = await r.json().catch(() => ({}))
          throw new Error(`tts_api_error (${r.status}): ${body.error || 'unknown'}`)
        }
        return r.blob()
      })
      .then((blob) => {
        if (isStale()) return // a newer speak() call has since taken over
        const url = URL.createObjectURL(blob)
        const audio = new Audio(url)
        audioRef.current = audio
        const finish = () => {
          URL.revokeObjectURL(url)
          audioRef.current = null
          setStatus('idle')
          onDone?.()
        }
        audio.onended = finish
        audio.onerror = finish
        audio.play().catch(() => {
          // Autoplay blocked — fall back
          URL.revokeObjectURL(url)
          audioRef.current = null
          if (!isStale()) fallbackSpeak(text, onDone, voiceOpts)
        })
      })
      .catch((err) => {
        // Falling back is intentional (Buddy should still speak), but the
        // reason should be visible in the console instead of just quietly
        // reusing whatever the browser's default voice is every time.
        console.warn('Google TTS failed, falling back to browser speech:', err.message)
        if (!isStale()) fallbackSpeak(text, onDone, voiceOpts)
      })
  }, [stopListening, stopSpeaking, fallbackSpeak,
      settings?.speechRate, settings?.voiceName])

  // ── Speech recognition ────────────────────────────────────────────────────
  const startListening = useCallback((onResult) => {
    if (!SpeechRec) return
    stopSpeaking()
    stopListening()

    onResultRef.current = onResult
    setTranscript('')
    setStatus('listening')
    listeningRef.current = true

    const rec = new SpeechRec()
    rec.lang = 'en-US'
    rec.continuous = false
    rec.interimResults = true
    recRef.current = rec

    let latestTranscript = ''
    let stopped = false
    const forceStop = () => { if (!stopped) { stopped = true; rec.stop() } }
    const timeout = setTimeout(forceStop, 10000)

    rec.onresult = (e) => {
      const results = Array.from(e.results)
      latestTranscript = results.map((r) => r[0].transcript).join('')
      setTranscript(latestTranscript)
      if (results[results.length - 1]?.isFinal) forceStop()
    }

    rec.onend = () => {
      clearTimeout(timeout)
      if (!listeningRef.current) return
      listeningRef.current = false
      recRef.current = null
      setStatus('idle')
      if (latestTranscript.trim() && onResultRef.current) {
        onResultRef.current(latestTranscript.trim())
      }
    }

    rec.onerror = (e) => {
      clearTimeout(timeout)
      if (e.error !== 'no-speech') console.warn('STT error:', e.error)
      listeningRef.current = false
      recRef.current = null
      setStatus('idle')
    }

    rec.start()
  }, [stopSpeaking, stopListening])

  return {
    status, transcript, voices, supported,
    startListening, stopListening, speak, stopSpeaking,
    audioRef,          // Google TTS audio element — currentTime/duration for word sync
    boundaryWordRef,   // Web Speech fallback — word index from onboundary event
  }
}
