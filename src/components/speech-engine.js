/**
 * TacticalSpeechEngine — Web Speech API with comms beeps and tactical voice selection.
 * Provides speak() with radio-comms beep effects and a tactical voice filter.
 */

class TacticalSpeechEngine {
  constructor() {
    this.audioCtx = null
  }

  init() {
    if (!this.audioCtx && typeof window !== 'undefined') {
      this.audioCtx = new (window.AudioContext || window.webkitAudioContext)()
    }
  }

  /**
   * Speak text with a tactical voice and comms beep effects.
   * @param {string} text - Text to speak
   * @param {() => void} onEnd - Callback when speech ends
   */
  speak(text, onEnd) {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
      onEnd?.()
      return
    }

    window.speechSynthesis.cancel()

    const utterance = new SpeechSynthesisUtterance(text)
    utterance.rate = 0.95
    utterance.pitch = 0.85

    // Select a tactical-sounding voice
    const voices = window.speechSynthesis.getVoices()
    const tacticalVoice = voices.find(
      (v) =>
        v.name.includes('Natural') ||
        v.name.includes('David') ||
        v.name.includes('Google UK English Male')
    )
    if (tacticalVoice) utterance.voice = tacticalVoice

    // Play start beep
    this.playCommsBeep('start')

    utterance.onend = () => {
      this.playCommsBeep('end')
      onEnd?.()
    }

    utterance.onerror = () => {
      this.playCommsBeep('end')
      onEnd?.()
    }

    window.speechSynthesis.speak(utterance)
  }

  /**
   * Play a radio comms beep effect.
   * @param {'start' | 'end'} type
   */
  playCommsBeep(type) {
    this.init()
    if (!this.audioCtx) return

    const osc = this.audioCtx.createOscillator()
    const gain = this.audioCtx.createGain()

    osc.type = 'sine'
    osc.frequency.setValueAtTime(type === 'start' ? 1200 : 800, this.audioCtx.currentTime)
    gain.gain.setValueAtTime(0.05, this.audioCtx.currentTime)
    gain.gain.exponentialRampToValueAtTime(0.001, this.audioCtx.currentTime + 0.05)

    osc.connect(gain)
    gain.connect(this.audioCtx.destination)

    osc.start()
    osc.stop(this.audioCtx.currentTime + 0.05)
  }
}

export const speechEngine = new TacticalSpeechEngine()
