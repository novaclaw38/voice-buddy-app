import { getUser } from './_auth.js'

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const user = await getUser(req)
  if (!user) {
    return res.status(401).json({ error: 'Sign in to use LiveKit avatar voice.' })
  }

  const { roomName, participantName, childName, buddyName, childAge } = req.body || {}

  if (!roomName || typeof roomName !== 'string') {
    return res.status(400).json({ error: 'roomName is required' })
  }

  if (!process.env.LIVEKIT_URL || !process.env.LIVEKIT_API_KEY || !process.env.LIVEKIT_API_SECRET) {
    return res.status(503).json({ error: 'LiveKit credentials are not configured' })
  }

  try {
    const { RoomServiceClient, AccessToken, RoomAgentDispatch } = await import('livekit-server-sdk')
    const roomService = new RoomServiceClient(process.env.LIVEKIT_URL, process.env.LIVEKIT_API_KEY, process.env.LIVEKIT_API_SECRET)

    const metadata = JSON.stringify({
      childName: typeof childName === 'string' ? childName.slice(0, 100) : undefined,
      buddyName: typeof buddyName === 'string' ? buddyName.slice(0, 100) : undefined,
      childAge: typeof childAge === 'number' ? childAge : undefined,
    })

    let roomExisted = true
    try {
      await roomService.createRoom({
        name: roomName,
        emptyTimeout: 10 * 60,
        maxParticipants: 2,
        // Set at creation (not a follow-up call) so it's in place before the
        // agent — dispatched by the `agents` field below — ever connects.
        // A separate updateRoomMetadata() call after createRoom() would race
        // the agent's own connect and could lose every time.
        metadata,
        // Dispatches the Buddy voice agent (agent/) into this room so it
        // actually joins and talks back — without this, a child's device
        // would connect to an empty room with nobody listening.
        agents: [new RoomAgentDispatch({ agentName: 'buddy-voice-agent' })],
      })
      roomExisted = false
    } catch {
      // Ignore already-exists so boot-time collisions are idempotent.
    }

    // The room already existed (e.g. rejoining within the empty-timeout
    // window) and its agent is already connected — refresh metadata for
    // next time in case the child's name/age/Buddy name changed since.
    if (roomExisted) {
      try {
        await roomService.updateRoomMetadata(roomName, metadata)
      } catch {
        // Non-fatal — the agent keeps using whatever it already read.
      }
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
