// Tactical Comms Voice Speech Engine
class TacticalSpeechEngine {
  constructor() {
    this.audioCtx = null;
    this.init();
  }

  init() {
    if (!this.audioCtx && typeof window !== 'undefined') {
      try {
        this.audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      } catch (e) {
        console.warn('Audio context not available');
      }
    }
  }

  speak(text, options = {}) {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
      console.warn('Web Speech API not available');
      return;
    }

    // Cancel any ongoing speech
    window.speechSynthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(text);
    
    // Tactical voice settings
    utterance.rate = options.rate ?? 0.95;
    utterance.pitch = options.pitch ?? 0.85;
    utterance.volume = options.volume ?? 1;

    // Try to find a tactical-sounding voice
    const voices = window.speechSynthesis.getVoices();
    const tacticalVoice = voices.find(v =>
      v.name.includes('Natural') ||
      v.name.includes('Google UK English Male') ||
      v.name.includes('David') ||
      v.name.includes('Male') ||
      v.name.includes('Male 1')
    );

    if (tacticalVoice) {
      utterance.voice = tacticalVoice;
    }

    if (options.onStart) {
      utterance.onstart = options.onStart;
    }

    utterance.onend = () => {
      this.playCommsBeep('end');
      if (options.onEnd) options.onEnd();
    };

    // Play start beep before speech
    this.playCommsBeep('start');
    
    window.speechSynthesis.speak(utterance);
  }

  // Comms beep for transmission start/end
  playCommsBeep(type) {
    if (!this.audioCtx) return;
    
    const osc = this.audioCtx.createOscillator();
    const gain = this.audioCtx.createGain();
    
    osc.type = 'sine';
    osc.frequency.setValueAtTime(
      type === 'start' ? 1200 : 800, 
      this.audioCtx.currentTime
    );
    
    gain.gain.setValueAtTime(0.05, this.audioCtx.currentTime);
    gain.gain.exponentialRampToValueAtTime(
      0.001, 
      this.audioCtx.currentTime + 0.05
    );
    
    osc.connect(gain);
    gain.connect(this.audioCtx.destination);
    
    osc.start();
    osc.stop(this.audioCtx.currentTime + 0.05);
  }

  // Stop all speech
  stop() {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
  }
}

export const speechEngine = new TacticalSpeechEngine();
