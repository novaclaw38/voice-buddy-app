import { useState, useEffect, useRef, useCallback } from 'react'
import { supabase } from '../lib/supabase.js'

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
  const getFallbackVoice = useCallback(() => {
    if (!voices.length) return null
    if (settings?.voiceName) {
      const match = voices.find((v) => v.name === settings.voiceName)
      if (match) return match
    }
    if (settings?.robotVoice) {
      return (
        voices.find((v) => v.lang.startsWith('en') && /male|man/i.test(v.name)) ||
        voices.find((v) => v.lang.startsWith('en')) ||
        voices[0]
      )
    }
    return (
      voices.find((v) => v.lang.startsWith('en') && /female|woman/i.test(v.name)) ||
      voices.find((v) => v.lang.startsWith('en')) ||
      voices[0]
    )
  }, [voices, settings?.voiceName, settings?.robotVoice])

  // voiceOpts lets a caller give a mode/category its own "voice color" on top
  // of the user's own accessibility settings: pitchOffset (~-20..20, same
  // semitone-ish scale as the Google TTS pitch below) and rateMul (a speed
  // multiplier applied to the base rate).
  const fallbackSpeak = useCallback((text, onDone, voiceOpts = {}) => {
    if (!synthRef.current || !text) { onDone?.(); return }
    synthRef.current.cancel()
    const utter = new SpeechSynthesisUtterance(text)
    const baseRate  = settings?.robotVoice ? 0.85 : (settings?.speechRate  ?? 0.9)
    const basePitch = settings?.robotVoice ? 0.3  : (settings?.speechPitch ?? 1.1)
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
  }, [getFallbackVoice, settings?.robotVoice, settings?.speechRate, settings?.speechPitch])

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
  }, [])

  // ── Google TTS speak ──────────────────────────────────────────────────────
  // voiceOpts: optional { pitchOffset, rateMul } — see fallbackSpeak above.
  const speak = useCallback((text, onDone, voiceOpts = {}) => {
    if (!text) { onDone?.(); return }
    stopListening()
    stopSpeaking()
    setStatus('speaking')

    const baseRate  = settings?.robotVoice ? 0.8  : (settings?.speechRate  ?? 0.9)
    const basePitch = settings?.robotVoice ? -8   : 0    // semitones for Google TTS
    const gender    = settings?.robotVoice ? 'male' : 'female'
    const rate  = Math.max(0.25, Math.min(4, baseRate * (voiceOpts.rateMul ?? 1)))
    const pitch = Math.max(-20, Math.min(20, basePitch + (voiceOpts.pitchOffset ?? 0)))

    supabase.auth.getSession()
      .then(({ data }) => {
        const token = data?.session?.access_token
        return fetch('/api/tts', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
          body: JSON.stringify({ text, rate, pitch, gender }),
        })
      })
      .then((r) => {
        if (!r.ok) throw new Error('tts_api_error')
        return r.blob()
      })
      .then((blob) => {
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
          fallbackSpeak(text, onDone, voiceOpts)
        })
      })
      .catch(() => {
        // Key not set or network error — fall back to browser TTS silently
        fallbackSpeak(text, onDone, voiceOpts)
      })
  }, [stopListening, stopSpeaking, fallbackSpeak,
      settings?.robotVoice, settings?.speechRate])

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

  // ── Wake word loop ────────────────────────────────────────────────────────
  const wakeRef      = useRef(null)   // current SpeechRec instance
  const wakeActiveRef = useRef(false) // whether the loop is running
  const wakeCallbackRef = useRef(null)
  const wakePhraseRef   = useRef('')

  const stopWakeWord = useCallback(() => {
    wakeActiveRef.current = false
    if (wakeRef.current) { try { wakeRef.current.stop() } catch (_) {} wakeRef.current = null }
  }, [])

  const startWakeWord = useCallback((phrase, onTrigger) => {
    if (!SpeechRec) return
    stopWakeWord()
    wakeActiveRef.current  = true
    wakeCallbackRef.current = onTrigger
    wakePhraseRef.current  = (phrase || '').toLowerCase().trim()

    const runCycle = () => {
      if (!wakeActiveRef.current) return
      const rec = new SpeechRec()
      wakeRef.current = rec
      rec.lang = 'en-US'
      rec.continuous = false
      rec.interimResults = true

      rec.onresult = (e) => {
        const heard = Array.from(e.results)
          .map((r) => r[0].transcript)
          .join('')
          .toLowerCase()
        if (wakePhraseRef.current && heard.includes(wakePhraseRef.current)) {
          wakeActiveRef.current = false
          wakeRef.current = null
          wakeCallbackRef.current?.()
        }
      }

      rec.onend = () => {
        if (!wakeActiveRef.current) return
        // Restart after a tiny gap so the browser doesn't complain
        setTimeout(runCycle, 300)
      }

      rec.onerror = (e) => {
        if (e.error === 'not-allowed') { wakeActiveRef.current = false; return }
        if (!wakeActiveRef.current) return
        setTimeout(runCycle, 1000)
      }

      try { rec.start() } catch (_) {
        if (wakeActiveRef.current) setTimeout(runCycle, 1000)
      }
    }

    runCycle()
  }, [stopWakeWord])

  return {
    status, transcript, voices, supported,
    startListening, stopListening, speak, stopSpeaking,
    startWakeWord, stopWakeWord,
    audioRef,          // Google TTS audio element — currentTime/duration for word sync
    boundaryWordRef,   // Web Speech fallback — word index from onboundary event
  }
}
