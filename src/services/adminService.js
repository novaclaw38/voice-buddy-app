import { authHeaders } from './chatService.js'

async function request(url, options) {
  const response = await fetch(url, {
    ...options,
    headers: await authHeaders(),
  })
  if (!response.ok) {
    const body = await response.json().catch(() => ({}))
    throw new Error(body.error?.message || `HTTP ${response.status}`)
  }
  return response.json()
}

export async function fetchOverview() {
  return request('/api/admin')
}

export async function cancelSubscription(userId) {
  return request('/api/admin', {
    method: 'POST',
    body: JSON.stringify({ userId }),
  })
}
