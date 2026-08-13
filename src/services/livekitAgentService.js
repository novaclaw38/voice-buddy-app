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

export async function startLiveKitAvatarSession({ roomName, participantName }) {
  if (!isLiveKitAvatarVoiceEnabled()) {
    throw new Error('LiveKit avatar voice is disabled')
  }

  const response = await fetch('/api/livekit-agent', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ roomName, participantName }),
  })

  if (!response.ok) {
    const body = await response.json().catch(() => ({}))
    throw new Error(body.error || `livekit_request_failed (${response.status})`)
  }

  return response.json()
}
