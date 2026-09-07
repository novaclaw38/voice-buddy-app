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

// AGENT-SYNC:START
// Copied into agent/src/generated/voiceOptions.ts by
// scripts/sync-agent-persona.mjs. The actual Google Cloud TTS voice name
// behind each persona key above, so Buddy sounds the same whether a child
// talks over LiveKit voice or the in-app/api/tts.js chat path.
export const VOICES = {
  sunny:   'en-US-Neural2-F', // warm female (default)
  giggles: 'en-US-Neural2-C', // cheerful female
  lullaby: 'en-US-Neural2-G', // gentle female
  sparkle: 'en-US-Neural2-H', // bright female
  buddy:   'en-US-Neural2-A', // calm male
  captain: 'en-US-Neural2-I', // adventurous male
  zippy:   'en-US-Neural2-J', // energetic male
  robo:    'en-US-Neural2-D', // deep/robot male
}
// AGENT-SYNC:END

// Groq's Orpheus TTS ships 6 English voices (3 female, 3 male) — one short
// of our 8 personas, so two pairs double up on the same underlying voice.
// The pairing is a first pass by described character, not by ear (nobody's
// listened to samples yet) — trivial to reshuffle once someone has.
// Falls through to Google TTS on any failure, which still has a distinct
// voice for all 8. Groq also has no pitch parameter — voiceOpts'
// pitchOffset only applies on the Google path.
export const GROQ_VOICES = {
  sunny:   'hannah',  // warm female (default)
  giggles: 'autumn',  // cheerful female
  lullaby: 'diana',   // gentle female
  sparkle: 'autumn',  // bright female — shares with giggles
  buddy:   'troy',    // calm male
  captain: 'austin',  // adventurous male
  zippy:   'daniel',  // energetic male
  robo:    'troy',    // deep/robot male — shares with buddy
}
export const GROQ_TTS_MODEL = 'canopylabs/orpheus-v1-english'
// Orpheus caps input at 200 characters — most conversational replies run
// longer, so text over that limit skips Groq entirely rather than paying
// for a network round trip that's guaranteed to fail.
export const GROQ_MAX_CHARS = 200
