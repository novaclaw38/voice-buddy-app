import { useCallback, useRef, useState } from 'react'
import { Room, RoomEvent, Track } from 'livekit-client'
import { isLiveKitAvatarVoiceEnabled, startLiveKitAvatarSession } from '../services/livekitAgentService.js'

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

  const start = useCallback(async ({ roomName, participantName }) => {
    if (!isLiveKitAvatarVoiceEnabled()) {
      setStatus('error')
      return { ok: false, error: 'LiveKit avatar voice is disabled' }
    }

    setStatus('connecting')
    try {
      const session = await startLiveKitAvatarSession({ roomName, participantName })

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
