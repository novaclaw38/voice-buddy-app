// Tactical Audio Engine - Web Audio API Sound Effects
class SoundSystem {
  constructor() {
    this.ctx = null;
    this.init();
  }

  init() {
    if (!this.ctx && typeof window !== 'undefined') {
      try {
        this.ctx = new (window.AudioContext || window.webkitAudioContext)();
      } catch (e) {
        console.warn('Web Audio API not supported:', e);
      }
    }
  }

  // Relay click - tactical interface button press
  playRelayClick() {
    if (!this.ctx) return;
    
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    
    osc.type = 'square';
    osc.frequency.setValueAtTime(800, this.ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(120, this.ctx.currentTime + 0.03);
    
    gain.gain.setValueAtTime(0.1, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + 0.03);
    
    osc.connect(gain);
    gain.connect(this.ctx.destination);
    
    osc.start();
    osc.stop(this.ctx.currentTime + 0.03);
  }

  // Pneumatic hiss - vault opening / UI state change
  playPneumaticHiss() {
    if (!this.ctx) return;
    
    const bufferSize = this.ctx.sampleRate * 0.1;
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    
    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1;
    }
    
    const noise = this.ctx.createBufferSource();
    noise.buffer = buffer;
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(800, this.ctx.currentTime);
    filter.frequency.exponentialRampToValueAtTime(200, this.ctx.currentTime + 0.1);
    
    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.15, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + 0.1);
    
    noise.connect(filter);
    filter.connect(gain);
    gain.connect(this.ctx.destination);
    
    noise.start();
    noise.stop(this.ctx.currentTime + 0.1);
  }

  // Tactical alert beep - rank up / storybook unlock
  playAlertBeep() {
    if (!this.ctx) return;
    
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    
    osc.type = 'sine';
    osc.frequency.setValueAtTime(600, this.ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(1200, this.ctx.currentTime + 0.05);
    osc.frequency.exponentialRampToValueAtTime(400, this.ctx.currentTime + 0.2);
    
    gain.gain.setValueAtTime(0.2, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.2);
    
    osc.connect(gain);
    gain.connect(this.ctx.destination);
    
    osc.start();
    osc.stop(this.ctx.currentTime + 0.2);
  }

  // Comms static - transmission start/end
  playCommsStatic(type = 'start') {
    if (!this.ctx) return;
    
    const bufferSize = this.ctx.sampleRate * (type === 'start' ? 0.05 : 0.03);
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    
    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1;
    }
    
    const noise = this.ctx.createBufferSource();
    noise.buffer = buffer;
    const gain = this.ctx.createGain();
    
    gain.gain.setValueAtTime(type === 'start' ? 0.1 : 0.05, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.05);
    
    noise.connect(gain);
    gain.connect(this.ctx.destination);
    
    noise.start();
    noise.stop(this.ctx.currentTime + 0.05);
  }

  // Ensure audio context is resumed (required after page load)
  resume() {
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }
}

export const sounds = new SoundSystem();
