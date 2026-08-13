import { useLiveKitAgent } from '../hooks/useLiveKitAgent.js'

export function useLiveKitAvatarVoice() {
  const liveKit = useLiveKitAgent()

  const speak = async ({ text, roomName, participantName }) => {
    if (!liveKit.enabled) return { ok: false, skipped: true }

    return liveKit.start({ roomName, participantName })
  }

  const disconnect = () => {
    liveKit.disconnect()
  }

  return {
    enabled: liveKit.enabled,
    status: liveKit.status,
    room: liveKit.room,
    speak,
    disconnect,
  }
}
