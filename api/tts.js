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

import { getUser, allowRequest } from './_auth.js'

const RATE_LIMIT_PER_MIN = 30
const RATE_LIMIT_PER_DAY = 1000

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  // Require a signed-in user — this endpoint spends paid Google TTS credits.
  const user = await getUser(req)
  if (!user) return res.status(401).json({ error: 'Sign in to use Buddy.' })

  // Cost guard: cap how fast and how much any one account can spend.
  if (!(await allowRequest(user.id, 'tts-1m', RATE_LIMIT_PER_MIN, 60)) ||
      !(await allowRequest(user.id, 'tts-1d', RATE_LIMIT_PER_DAY, 86400))) {
    return res.status(429).json({ error: 'Too many requests — take a short break.' })
  }

  const key = process.env.GOOGLE_TTS_KEY
  if (!key) return res.status(503).json({ error: 'GOOGLE_TTS_KEY not configured' })

  const { text, rate = 0.9, pitch = 0, voice = 'sunny' } = req.body
  if (!text || typeof text !== 'string') return res.status(400).json({ error: 'text is required' })
  if (text.length > 2000) return res.status(400).json({ error: 'text is too long' })

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
    console.error('Google TTS error:', response.status, err.error?.message || JSON.stringify(err))
    return res.status(response.status).json({ error: err.error?.message || 'Google TTS error' })
  }

  // Google returns base64; send raw MP3 bytes so the client skips the ~33%
  // base64 transfer overhead and plays via an object URL.
  const { audioContent } = await response.json()
  const audio = Buffer.from(audioContent, 'base64')
  res.setHeader('Content-Type', 'audio/mpeg')
  res.setHeader('Cache-Control', 'no-store')
  res.status(200).send(audio)
}
