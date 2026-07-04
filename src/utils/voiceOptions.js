// Google Cloud TTS voices the app actually speaks with — keys match the
// VOICES map in api/tts.js. Shared between the Parent Settings dropdown
// and useSpeech.js's default-voice fallback so both agree on valid keys.
export const VOICE_OPTIONS = [
  { key: 'friendly-f', label: '😊 Friendly (default)' },
  { key: 'cheerful-f', label: '🎈 Cheerful' },
  { key: 'gentle-f',   label: '🌙 Gentle' },
  { key: 'calm-m',     label: '🌿 Calm' },
  { key: 'deep-m',     label: '🤖 Deep / Robot' },
  { key: 'bright-m',   label: '✨ Bright' },
]

export const DEFAULT_VOICE = 'friendly-f'

export function isValidVoiceKey(key) {
  return VOICE_OPTIONS.some((v) => v.key === key)
}
