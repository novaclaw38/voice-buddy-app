import { authHeaders } from './chatService.js'

function getMetaEnv() {
  if (typeof import.meta !== 'undefined' && import.meta && import.meta.env) {
    return import.meta.env
  }
  return undefined
}

const enabled = getMetaEnv()?.VITE_USE_LIVEKIT_AVATAR_VOICE === 'true'

export function isLiveKitAvatarVoiceEnabled() {
  return !!enabled
}

export async function startLiveKitAvatarSession({ roomName, participantName, childName, buddyName, childAge, voice }) {
  if (!isLiveKitAvatarVoiceEnabled()) {
    throw new Error('LiveKit avatar voice is disabled')
  }

  const response = await fetch('/api/livekit-agent', {
    method: 'POST',
    headers: await authHeaders(),
    body: JSON.stringify({ roomName, participantName, childName, buddyName, childAge, voice }),
  })

  if (!response.ok) {
    const body = await response.json().catch(() => ({}))
    throw new Error(body.error || `livekit_request_failed (${response.status})`)
  }

  return response.json()
}
