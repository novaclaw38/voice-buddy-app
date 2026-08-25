/**
 * SoundFX — Web Audio API sound effects engine for the child app.
 * Provides button clicks, menu navigation, alerts, and rank-up sounds.
 */

class SoundFX {
  constructor() {
    this.ctx = null
  }

  init() {
    if (!this.ctx && typeof window !== 'undefined') {
      this.ctx = new (window.AudioContext || window.webkitAudioContext)()
    }
  }

  /**
   * Mechanical relay click — crisp button press sound.
   */
  click() {
    this.init()
    if (!this.ctx) return
    const osc = this.ctx.createOscillator()
    const gain = this.ctx.createGain()
    osc.type = 'square'
    osc.frequency.setValueAtTime(800, this.ctx.currentTime)
    osc.frequency.exponentialRampToValueAtTime(120, this.ctx.currentTime + 0.03)
    gain.gain.setValueAtTime(0.1, this.ctx.currentTime)
    gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + 0.03)
    osc.connect(gain)
    gain.connect(this.ctx.destination)
    osc.start()
    osc.stop(this.ctx.currentTime + 0.03)
  }

  /**
   * Soft sweep sine — menu navigation.
   */
  nav() {
    this.init()
    if (!this.ctx) return
    const osc = this.ctx.createOscillator()
    const gain = this.ctx.createGain()
    osc.type = 'sine'
    osc.frequency.setValueAtTime(400, this.ctx.currentTime)
    osc.frequency.exponentialRampToValueAtTime(600, this.ctx.currentTime + 0.1)
    gain.gain.setValueAtTime(0.05, this.ctx.currentTime)
    gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.1)
    osc.connect(gain)
    gain.connect(this.ctx.destination)
    osc.start()
    osc.stop(this.ctx.currentTime + 0.1)
  }

  /**
   * Sonar ping — alert/warning (pulses 3 times).
   */
  alert() {
    this.init()
    if (!this.ctx) return
    for (let i = 0; i < 3; i++) {
      const osc = this.ctx.createOscillator()
      const gain = this.ctx.createGain()
      osc.type = 'sine'
      osc.frequency.setValueAtTime(800, this.ctx.currentTime + i * 0.2)
      gain.gain.setValueAtTime(0, this.ctx.currentTime + i * 0.2)
      gain.gain.linearRampToValueAtTime(0.08, this.ctx.currentTime + i * 0.2 + 0.02)
      gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + i * 0.2 + 0.15)
      osc.connect(gain)
      gain.connect(this.ctx.destination)
      osc.start(this.ctx.currentTime + i * 0.2)
      osc.stop(this.ctx.currentTime + i * 0.2 + 0.15)
    }
  }

  /**
   * Pneumatic hiss — rank up / tool unlock.
   */
  hiss() {
    this.init()
    if (!this.ctx) return
    const bufferSize = this.ctx.sampleRate * 0.3
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate)
    const data = buffer.getChannelData(0)
    for (let i = 0; i < bufferSize; i++) {
      data[i] = (Math.random() * 2 - 1) * (1 - i / bufferSize)
    }
    const noise = this.ctx.createBufferSource()
    noise.buffer = buffer
    const gain = this.ctx.createGain()
    gain.gain.setValueAtTime(0.15, this.ctx.currentTime)
    gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + 0.3)
    noise.connect(gain)
    gain.connect(this.ctx.destination)
    noise.start()
  }

  /**
   * Success chime — mission complete.
   */
  success() {
    this.init()
    if (!this.ctx) return
    const notes = [523, 659, 784] // C5, E5, G5
    notes.forEach((freq, i) => {
      const osc = this.ctx.createOscillator()
      const gain = this.ctx.createGain()
      osc.type = 'sine'
      osc.frequency.setValueAtTime(freq, this.ctx.currentTime + i * 0.1)
      gain.gain.setValueAtTime(0, this.ctx.currentTime + i * 0.1)
      gain.gain.linearRampToValueAtTime(0.1, this.ctx.currentTime + i * 0.1 + 0.02)
      gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + i * 0.1 + 0.3)
      osc.connect(gain)
      gain.connect(this.ctx.destination)
      osc.start(this.ctx.currentTime + i * 0.1)
      osc.stop(this.ctx.currentTime + i * 0.1 + 0.3)
    })
  }
}

export const sfx = new SoundFX()
