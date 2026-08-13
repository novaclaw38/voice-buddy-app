import { getUser } from './_auth.js'

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const user = await getUser(req)
  if (!user) {
    return res.status(401).json({ error: 'Sign in to use LiveKit avatar voice.' })
  }

  const { roomName, participantName } = req.body || {}

  if (!roomName || typeof roomName !== 'string') {
    return res.status(400).json({ error: 'roomName is required' })
  }

  if (!process.env.LIVEKIT_URL || !process.env.LIVEKIT_API_KEY || !process.env.LIVEKIT_API_SECRET) {
    return res.status(503).json({ error: 'LiveKit credentials are not configured' })
  }

  try {
    const { RoomServiceClient, AccessToken } = await import('livekit-server-sdk')
    const roomService = new RoomServiceClient(process.env.LIVEKIT_URL, process.env.LIVEKIT_API_KEY, process.env.LIVEKIT_API_SECRET)

    try {
      await roomService.createRoom({ name: roomName, emptyTimeout: 10 * 60, maxParticipants: 2 })
    } catch (_) {
      // Ignore already-exists so boot-time collisions are idempotent.
    }

    const token = new AccessToken(process.env.LIVEKIT_API_KEY, process.env.LIVEKIT_API_SECRET, { identity: participantName || user.id })
    token.addGrant({ roomJoin: true, room: roomName, canPublish: true, canSubscribe: true })

    return res.status(200).json({
      url: process.env.LIVEKIT_URL,
      token: await token.toJwt(),
      roomName,
    })
  } catch (error) {
    return res.status(500).json({ error: error?.message || 'LiveKit JWT creation failed' })
  }
}
