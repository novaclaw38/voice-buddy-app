import '@testing-library/jest-dom/vitest'
import { expect } from 'vitest'
import { toHaveNoViolations } from 'jest-axe'

// Lets any test call `expect(await axe(container)).toHaveNoViolations()`
// for real rendered-DOM a11y assertions (contrast, ARIA, roles) that static
// detector/lint passes can't check.
expect.extend(toHaveNoViolations)

// LandingPage's RevealSection observes scroll position; jsdom has no
// IntersectionObserver, so stub it out and never fire the callback.
class IntersectionObserverStub {
  constructor(callback) { this.callback = callback }
  observe() {}
  unobserve() {}
  disconnect() {}
  takeRecords() { return [] }
}
globalThis.IntersectionObserver = IntersectionObserverStub

// useSpeech reads window.speechSynthesis on mount for its browser-TTS
// fallback. jsdom doesn't implement the Web Speech API.
globalThis.speechSynthesis = {
  getVoices: () => [],
  cancel: () => {},
  speak: () => {},
  addEventListener: () => {},
  removeEventListener: () => {},
}
