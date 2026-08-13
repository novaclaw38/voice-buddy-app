import { useState, useCallback } from 'react'
import { isLiveKitAvatarVoiceEnabled, startLiveKitAvatarSession } from '../services/livekitAgentService.js'

export function useLiveKitAgent() {
  const [status, setStatus] = useState('idle') // idle | connecting | connected | error
  const [room, setRoom] = useState(null)

  const start = useCallback(async ({ roomName, participantName }) => {
    if (!isLiveKitAvatarVoiceEnabled()) {
      setStatus('error')
      return { ok: false, error: 'LiveKit avatar voice is disabled' }
    }

    setStatus('connecting')
    try {
      const result = await startLiveKitAvatarSession({ roomName, participantName })
      setRoom(result)
      setStatus('connected')
      return { ok: true, ...result }
    } catch (error) {
      setStatus('error')
      return { ok: false, error: error.message }
    }
  }, [])

  const disconnect = useCallback(() => {
    setRoom(null)
    setStatus('idle')
  }, [])

  return {
    enabled: isLiveKitAvatarVoiceEnabled(),
    status,
    room,
    start,
    disconnect,
  }
}
