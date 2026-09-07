import { useCallback, useRef, useState } from 'react'
import { isLiveKitAvatarVoiceEnabled, startLiveKitAvatarSession } from '../services/livekitAgentService.js'

// livekit-client is a full WebRTC SDK — loaded on demand only when a
// session actually starts, instead of bundled into every ChildPage load
// (the feature is off by default for most accounts).
let livekitClientPromise = null
function loadLiveKitClient() {
  if (!livekitClientPromise) livekitClientPromise = import('livekit-client')
  return livekitClientPromise
}

function attachRemoteAudio(track) {
  const element = track.attach()
  element.autoplay = true
  document.body.appendChild(element)
  return element
}

export function useLiveKitAgent() {
  const [status, setStatus] = useState('idle') // idle | connecting | connected | error
  const [room, setRoom] = useState(null)
  const roomRef = useRef(null)

  const disconnect = useCallback(() => {
    roomRef.current?.disconnect()
    roomRef.current = null
    setRoom(null)
    setStatus('idle')
  }, [])

  const start = useCallback(async ({ roomName, participantName, childName, buddyName, childAge, voice }) => {
    if (!isLiveKitAvatarVoiceEnabled()) {
      setStatus('error')
      return { ok: false, error: 'LiveKit avatar voice is disabled' }
    }

    setStatus('connecting')
    try {
      const [{ Room, RoomEvent, Track }, session] = await Promise.all([
        loadLiveKitClient(),
        startLiveKitAvatarSession({ roomName, participantName, childName, buddyName, childAge, voice }),
      ])

      const liveKitRoom = new Room()
      liveKitRoom.on(RoomEvent.TrackSubscribed, (track) => {
        if (track.kind === Track.Kind.Audio) attachRemoteAudio(track)
      })
      liveKitRoom.on(RoomEvent.Disconnected, () => {
        roomRef.current = null
        setRoom(null)
        setStatus('idle')
      })

      await liveKitRoom.connect(session.url, session.token)
      await liveKitRoom.localParticipant.setMicrophoneEnabled(true)

      roomRef.current = liveKitRoom
      setRoom(session)
      setStatus('connected')
      return { ok: true, ...session }
    } catch (error) {
      setStatus('error')
      return { ok: false, error: error.message }
    }
  }, [])

  return {
    enabled: isLiveKitAvatarVoiceEnabled(),
    status,
    room,
    start,
    disconnect,
  }
}
