// Named Google Cloud TTS voices a parent can actually pick between — the
// old setup only ever offered a binary female/male, ignoring the many
// distinct voices Google TTS provides. Keys here are shared with the
// Parent Settings "Voice" dropdown and useSpeech.js's default fallback.
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
const GROQ_TTS_MODEL = 'canopylabs/orpheus-v1-english'
// Orpheus caps input at 200 characters — most conversational replies run
// longer, so text over that limit skips Groq entirely rather than paying
// for a network round trip that's guaranteed to fail.
const GROQ_MAX_CHARS = 200

import { getUser, allowRequest, isEntitled } from './_auth.js'

const RATE_LIMIT_PER_MIN = 30
// Free accounts still need enough TTS to cover their 10 daily chats; the cap
// exists so an unpaid account can never out-spend a paid one on Google TTS.
const FREE_LIMIT_PER_DAY = 60
const PRO_LIMIT_PER_DAY  = 1000

// Returns raw MP3 bytes, or null if Groq isn't usable for this request (no
// key configured, no Groq voice for the requested persona, or text over
// Orpheus's 200-character cap) — the caller falls through to Google in
// every case. Throws only on an actual Groq API failure, so the caller can
// log it before falling back.
async function speakWithGroq(text, rate, voice) {
  const key = process.env.GROQ_API_KEY
  const groqVoice = GROQ_VOICES[voice]
  if (!key || !groqVoice || text.length > GROQ_MAX_CHARS) return null

  const response = await fetch('https://api.groq.com/openai/v1/audio/speech', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${key}`,
    },
    body: JSON.stringify({
      model: GROQ_TTS_MODEL,
      input: text,
      voice: groqVoice,
      response_format: 'mp3',
      speed: Math.max(0.5, Math.min(5, rate)),
    }),
  })

  if (!response.ok) {
    const err = await response.json().catch(() => ({}))
    throw new Error(`groq_tts_error (${response.status}): ${err.error?.message || JSON.stringify(err)}`)
  }

  return Buffer.from(await response.arrayBuffer())
}

async function speakWithGoogle(text, rate, pitch, voice) {
  const key = process.env.GOOGLE_TTS_KEY
  if (!key) throw new Error('GOOGLE_TTS_KEY not configured')

  const response = await fetch(
    `https://texttospeech.googleapis.com/v1/text:synthesize?key=${key}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        input: { text },
        voice: {
          languageCode: 'en-US',
          name: VOICES[voice] || VOICES.sunny,
        },
        audioConfig: {
          audioEncoding: 'MP3',
          speakingRate: Math.max(0.25, Math.min(4, rate)),
          pitch: Math.max(-20, Math.min(20, pitch)),
          effectsProfileId: ['headphone-class-device'],
        },
      }),
    }
  )

  if (!response.ok) {
    const err = await response.json().catch(() => ({}))
    throw new Error(err.error?.message || 'Google TTS error')
  }

  // Google returns base64; the caller sends raw bytes so the client skips
  // the ~33% base64 transfer overhead and plays via an object URL.
  const { audioContent } = await response.json()
  return Buffer.from(audioContent, 'base64')
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  // Require a signed-in user — this endpoint spends paid TTS credits.
  const user = await getUser(req)
  if (!user) return res.status(401).json({ error: 'Sign in to use Buddy.' })

  // Cost guard: cap how fast and how much any one account can spend, with a
  // much tighter daily ceiling for accounts that aren't paying.
  const entitled = await isEntitled(user.id)
  const dailyLimit = entitled ? PRO_LIMIT_PER_DAY : FREE_LIMIT_PER_DAY
  if (!(await allowRequest(user.id, 'tts-1m', RATE_LIMIT_PER_MIN, 60)) ||
      !(await allowRequest(user.id, 'tts-1d', dailyLimit, 86400))) {
    return res.status(429).json({ error: 'Too many requests — take a short break.' })
  }

  const { text, rate = 0.9, pitch = 0, voice = 'sunny' } = req.body
  if (!text || typeof text !== 'string') return res.status(400).json({ error: 'text is required' })
  if (text.length > 2000) return res.status(400).json({ error: 'text is too long' })

  // Groq first for the 3 personas it has a real voice for; Google covers
  // every persona, so it's both the fallback and the only path for the rest.
  let audio
  try {
    audio = await speakWithGroq(text, rate, voice)
  } catch (err) {
    console.warn('Groq TTS failed, falling back to Google:', err.message)
  }

  if (!audio) {
    try {
      audio = await speakWithGoogle(text, rate, pitch, voice)
    } catch (err) {
      console.error('Google TTS error:', err.message)
      return res.status(503).json({ error: err.message })
    }
  }

  res.setHeader('Content-Type', 'audio/mpeg')
  res.setHeader('Cache-Control', 'no-store')
  res.status(200).send(audio)
}
