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

export async function fetchUserDetail(userId) {
  return request(`/api/admin?userId=${encodeURIComponent(userId)}`)
}

export async function cancelSubscription(userId) {
  return request('/api/admin', {
    method: 'POST',
    body: JSON.stringify({ action: 'cancelSubscription', userId }),
  })
}

export async function grantPro(userId, endDate) {
  return request('/api/admin', {
    method: 'POST',
    body: JSON.stringify({ action: 'grantPro', userId, endDate }),
  })
}

export async function banUser(userId) {
  return request('/api/admin', {
    method: 'POST',
    body: JSON.stringify({ action: 'banUser', userId }),
  })
}

export async function unbanUser(userId) {
  return request('/api/admin', {
    method: 'POST',
    body: JSON.stringify({ action: 'unbanUser', userId }),
  })
}

export async function deleteUser(userId) {
  return request('/api/admin', {
    method: 'POST',
    body: JSON.stringify({ action: 'deleteUser', userId }),
  })
}
