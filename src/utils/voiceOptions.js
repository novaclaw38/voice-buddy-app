// Google Cloud TTS voices the app actually speaks with — keys match the
// VOICES map in api/tts.js. Shared between the Parent Settings dropdown
// and useSpeech.js's default-voice fallback so both agree on valid keys.
export const VOICE_OPTIONS = [
  { key: 'sunny',   label: '😊 Sunny (default)' },
  { key: 'giggles', label: '🎈 Giggles' },
  { key: 'lullaby', label: '🌙 Lullaby' },
  { key: 'sparkle', label: '✨ Sparkle' },
  { key: 'buddy',   label: '🧸 Buddy' },
  { key: 'captain', label: '⚓ Captain' },
  { key: 'zippy',   label: '⚡ Zippy' },
  { key: 'robo',    label: '🤖 Robo (deep)' },
]

export const DEFAULT_VOICE = 'sunny'

export function isValidVoiceKey(key) {
  return VOICE_OPTIONS.some((v) => v.key === key)
}
