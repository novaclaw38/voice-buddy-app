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

  const roomResponse = await fetch(`${process.env.LIVEKIT_URL}/twirp/livekit.AuthService/ListRooms`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Basic ${Buffer.from(`${process.env.LIVEKIT_API_KEY}:${process.env.LIVEKIT_API_SECRET}`).toString('base64')}`,
    },
    body: JSON.stringify({}),
  }).catch(() => null)

  let roomExists = false
  if (roomResponse?.ok) {
    try {
      const roomData = await roomResponse.json()
      roomExists = Array.isArray(roomData.rooms) && roomData.rooms.some((room) => room.name === roomName)
    } catch (_) {}
  }

  try {
    const { LiveKitServerClient } = await import('livekit-server-sdk')
    const client = new LiveKitServerClient(process.env.LIVEKIT_URL, process.env.LIVEKIT_API_KEY, process.env.LIVEKIT_API_SECRET)

    try {
      await client.createRoom(roomName, { emptyTimeout: 10 * 60, maxParticipants: 2, agentDisabled: true })
    } catch (_) {
      // Ignore 409 already-exists so boot-time collisions are idempotent.
    }

    const { AccessToken } = await import('livekit-server-sdk')
    const token = new AccessToken(process.env.LIVEKIT_API_KEY, process.env.LIVEKIT_API_SECRET, { identity: participantName || user.id })
    token.addGrant({ roomJoin: true, room: roomName })

    return res.status(200).json({
      url: process.env.LIVEKIT_URL,
      token: token.toJwt(),
      metadata,
      roomName,
    })
  } catch (error) {
    return res.status(500).json({ error: error?.message || 'LiveKit JWT creation failed' })
  }
}
