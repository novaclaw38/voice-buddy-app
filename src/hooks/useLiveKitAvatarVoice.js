import { useLiveKitAgent } from '../hooks/useLiveKitAgent.js'

export function useLiveKitAvatarVoice() {
  const liveKit = useLiveKitAgent()

  const speak = async ({ text: _text, roomName, participantName, childName, buddyName, childAge, voice }) => {
    if (!liveKit.enabled) return { ok: false, skipped: true }

    return liveKit.start({ roomName, participantName, childName, buddyName, childAge, voice })
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
