# Admin Page Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build an admin-only page at `/admin` that lists users with their subscription tier, lets the owner cancel a user's subscription, and shows signup/tier stats.

**Architecture:** Two new admin-only serverless endpoints (`api/admin/overview.js`, `api/admin/cancel-subscription.js`) gated by a shared `requireAdmin()` helper in `api/_admin.js` that checks the caller's email against a hardcoded constant. A new `AdminPage.jsx` client page fetches from these via a new `adminService.js`, reached only via direct URL (`/admin`), with a client-side email check as a UX-only redirect guard.

**Tech Stack:** React 18 + react-router-dom, Vite, Vitest, `@supabase/supabase-js` (service role client), existing PayFast REST cancel flow.

## Global Constraints

- Admin identity is the hardcoded email `rebawntech@gmail.com` — must match exactly in `api/_admin.js` (server, authoritative) and `App.jsx` (client, UX-only).
- Every admin API response error body uses the existing app-wide shape `{ error: { message: string } }` (see `api/courses.js`, `api/lesson.js`), not a bare string.
- No new npm dependencies — table/bars are plain CSS, no charting library.
- Course/lesson content management is out of scope for this plan (see spec).
- Automated tests cover only the access-control (403/405) paths and the pure `computeTier` logic, per the spec's Testing section — no live Supabase/PayFast calls in tests.

---

### Task 1: `api/_admin.js` — admin identity + tier helper

**Files:**
- Create: `api/_admin.js`
- Test: `api/_admin.test.js`

**Interfaces:**
- Consumes: `getUser(req)` from `api/_auth.js` (existing, signature: `(req) => Promise<{id, email, ...} | null>`).
- Produces:
  - `export const ADMIN_EMAIL = 'rebawntech@gmail.com'`
  - `export async function requireAdmin(req): Promise<User | null>` — returns the Supabase user object if `user.email === ADMIN_EMAIL`, else `null`.
  - `export function computeTier(sub): 'free' | 'trial' | 'pro'` — pure function, `sub` is a `subscriptions` row (`{status, trial_end, subscription_end}`) or `null`.

- [ ] **Step 1: Write the failing test**

```js
// api/_admin.test.js
import { describe, it, expect, vi, beforeEach } from 'vitest'

const mocks = vi.hoisted(() => ({ getUser: vi.fn() }))
vi.mock('./_auth.js', () => mocks)

import { requireAdmin, computeTier, ADMIN_EMAIL } from './_admin.js'

describe('requireAdmin', () => {
  beforeEach(() => vi.clearAllMocks())

  it('returns null when there is no signed-in user', async () => {
    mocks.getUser.mockResolvedValue(null)
    expect(await requireAdmin({})).toBeNull()
  })

  it('returns null when the signed-in user is not the admin', async () => {
    mocks.getUser.mockResolvedValue({ id: 'u1', email: 'someone@else.com' })
    expect(await requireAdmin({})).toBeNull()
  })

  it('returns the user when they are the admin', async () => {
    const user = { id: 'u1', email: ADMIN_EMAIL }
    mocks.getUser.mockResolvedValue(user)
    expect(await requireAdmin({})).toBe(user)
  })
})

describe('computeTier', () => {
  it('is free with no subscription row', () => {
    expect(computeTier(null)).toBe('free')
  })

  it('is trial when trial_end is in the future', () => {
    const future = new Date(Date.now() + 86400000).toISOString()
    expect(computeTier({ status: 'trial', trial_end: future })).toBe('trial')
  })

  it('is free when the trial has expired', () => {
    const past = new Date(Date.now() - 86400000).toISOString()
    expect(computeTier({ status: 'trial', trial_end: past })).toBe('free')
  })

  it('is pro when subscription_end is in the future', () => {
    const future = new Date(Date.now() + 86400000).toISOString()
    expect(computeTier({ status: 'active', subscription_end: future })).toBe('pro')
  })

  it('is free when the subscription has expired', () => {
    const past = new Date(Date.now() - 86400000).toISOString()
    expect(computeTier({ status: 'active', subscription_end: past })).toBe('free')
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run api/_admin.test.js`
Expected: FAIL — `api/_admin.js` does not exist yet.

- [ ] **Step 3: Write the implementation**

```js
// api/_admin.js
import { getUser } from './_auth.js'

// Single hardcoded admin — this is a solo-owner app. Must match the client-side
// guard in App.jsx exactly; that guard is UX-only, this check is the real
// security boundary.
export const ADMIN_EMAIL = 'rebawntech@gmail.com'

export async function requireAdmin(req) {
  const user = await getUser(req)
  if (!user || user.email !== ADMIN_EMAIL) return null
  return user
}

// Mirrors the entitlement logic in useSubscription.jsx / api/_auth.js's
// isEntitled, but returns the tier label rather than a boolean — kept
// separate since the admin overview needs the label, not just yes/no.
export function computeTier(sub) {
  if (!sub) return 'free'
  const now = Date.now()
  if (sub.status === 'trial' && sub.trial_end && new Date(sub.trial_end).getTime() > now) return 'trial'
  if (sub.status === 'active' && sub.subscription_end && new Date(sub.subscription_end).getTime() > now) return 'pro'
  return 'free'
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run api/_admin.test.js`
Expected: PASS (8 tests)

- [ ] **Step 5: Commit**

```bash
git add api/_admin.js api/_admin.test.js
git commit -m "feat: add admin identity check and tier helper"
```

---

### Task 2: `api/admin/overview.js` — users + stats endpoint

**Files:**
- Create: `api/admin/overview.js`
- Test: `api/admin/overview.test.js`

**Interfaces:**
- Consumes: `requireAdmin(req)`, `computeTier(sub)` from `../_admin.js` (Task 1).
- Produces: `GET /api/admin/overview` handler. On success, `200` with body:
  ```
  {
    users: [{ id, email, createdAt, tier, status, trialEnd, subscriptionEnd }],
    stats: {
      signupsByDay: [{ date: 'YYYY-MM-DD', count: number }],  // 30 entries, oldest first
      tierCounts: { free: number, trial: number, pro: number }
    }
  }
  ```
  Errors: `405` (wrong method), `403` (not admin), `500` (Supabase error) — all as `{ error: { message } }`.

- [ ] **Step 1: Write the failing test**

```js
// api/admin/overview.test.js
import { describe, it, expect, vi, beforeEach } from 'vitest'

const mocks = vi.hoisted(() => ({ requireAdmin: vi.fn(), computeTier: vi.fn() }))
vi.mock('../_admin.js', () => mocks)

import handler from './overview.js'

function mockRes() {
  const res = { statusCode: 0, body: null, headers: {} }
  res.status = (c) => { res.statusCode = c; return res }
  res.json = (b) => { res.body = b; return res }
  res.setHeader = (k, v) => { res.headers[k] = v }
  return res
}

describe('api/admin/overview access control', () => {
  beforeEach(() => vi.clearAllMocks())

  it('rejects a non-GET request with 405', async () => {
    const res = mockRes()
    await handler({ method: 'POST', headers: {} }, res)
    expect(res.statusCode).toBe(405)
  })

  it('rejects a non-admin request with 403', async () => {
    mocks.requireAdmin.mockResolvedValue(null)
    const res = mockRes()
    await handler({ method: 'GET', headers: {} }, res)
    expect(res.statusCode).toBe(403)
    expect(res.body.error.message).toBeTruthy()
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run api/admin/overview.test.js`
Expected: FAIL — `api/admin/overview.js` does not exist yet.

- [ ] **Step 3: Write the implementation**

```js
// api/admin/overview.js
import { createClient } from '@supabase/supabase-js'
import { requireAdmin, computeTier } from '../_admin.js'

function db() {
  const supabaseUrl = process.env.SUPABASE_URL
  const serviceKey = process.env.SUPABASE_SERVICE_KEY
  if (!supabaseUrl || !serviceKey) {
    throw new Error('SUPABASE_URL / SUPABASE_SERVICE_KEY not configured')
  }
  return createClient(supabaseUrl, serviceKey)
}

// Buckets signups into the last `days` calendar days (UTC), oldest first,
// including days with zero signups so the client can render a fixed-width bar chart.
function bucketSignupsByDay(users, days) {
  const counts = new Map()
  const now = new Date()
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(now)
    d.setUTCDate(d.getUTCDate() - i)
    counts.set(d.toISOString().slice(0, 10), 0)
  }
  for (const u of users) {
    const day = u.createdAt.slice(0, 10)
    if (counts.has(day)) counts.set(day, counts.get(day) + 1)
  }
  return Array.from(counts, ([date, count]) => ({ date, count }))
}

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ error: { message: 'Method not allowed' } })

  const admin = await requireAdmin(req)
  if (!admin) return res.status(403).json({ error: { message: 'Forbidden' } })

  let authUsers
  try {
    const { data, error } = await db().auth.admin.listUsers({ perPage: 1000 })
    if (error) throw error
    authUsers = data.users
  } catch (err) {
    console.error('admin/overview: listUsers failed', err)
    return res.status(500).json({ error: { message: 'Could not load users.' } })
  }

  const { data: subs, error: subsErr } = await db().from('subscriptions').select('*')
  if (subsErr) {
    console.error('admin/overview: subscriptions query failed', subsErr)
    return res.status(500).json({ error: { message: 'Could not load subscriptions.' } })
  }

  const subsByUser = new Map(subs.map((s) => [s.user_id, s]))

  const users = authUsers.map((u) => {
    const sub = subsByUser.get(u.id) || null
    return {
      id: u.id,
      email: u.email,
      createdAt: u.created_at,
      tier: computeTier(sub),
      status: sub?.status ?? null,
      trialEnd: sub?.trial_end ?? null,
      subscriptionEnd: sub?.subscription_end ?? null,
    }
  })

  const tierCounts = { free: 0, trial: 0, pro: 0 }
  for (const u of users) tierCounts[u.tier]++

  res.setHeader('Cache-Control', 'private, no-store')
  return res.status(200).json({
    users,
    stats: { signupsByDay: bucketSignupsByDay(users, 30), tierCounts },
  })
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run api/admin/overview.test.js`
Expected: PASS (2 tests)

- [ ] **Step 5: Commit**

```bash
git add api/admin/overview.js api/admin/overview.test.js
git commit -m "feat: add admin overview endpoint (users + signup/tier stats)"
```

---

### Task 3: `api/admin/cancel-subscription.js` — cancel on behalf of a user

**Files:**
- Create: `api/admin/cancel-subscription.js`
- Test: `api/admin/cancel-subscription.test.js`

**Interfaces:**
- Consumes: `requireAdmin(req)` from `../_admin.js` (Task 1).
- Produces: `POST /api/admin/cancel-subscription` handler, body `{ userId: string }`.
  Success: `200 { ok: true }` or `200 { ok: true, alreadyCancelled: true }`.
  Errors: `405`, `403`, `400` (missing `userId`), `500` (DB/config), `502` (PayFast unreachable) — all `{ error: { message } }`.

- [ ] **Step 1: Write the failing test**

```js
// api/admin/cancel-subscription.test.js
import { describe, it, expect, vi, beforeEach } from 'vitest'

const mocks = vi.hoisted(() => ({ requireAdmin: vi.fn() }))
vi.mock('../_admin.js', () => mocks)

import handler from './cancel-subscription.js'

function mockRes() {
  const res = { statusCode: 0, body: null, headers: {} }
  res.status = (c) => { res.statusCode = c; return res }
  res.json = (b) => { res.body = b; return res }
  return res
}

describe('api/admin/cancel-subscription access control', () => {
  beforeEach(() => vi.clearAllMocks())

  it('rejects a non-POST request with 405', async () => {
    const res = mockRes()
    await handler({ method: 'GET', headers: {} }, res)
    expect(res.statusCode).toBe(405)
  })

  it('rejects a non-admin request with 403', async () => {
    mocks.requireAdmin.mockResolvedValue(null)
    const res = mockRes()
    await handler({ method: 'POST', headers: {}, body: { userId: 'u1' } }, res)
    expect(res.statusCode).toBe(403)
  })

  it('rejects a missing userId with 400', async () => {
    mocks.requireAdmin.mockResolvedValue({ id: 'admin', email: 'rebawntech@gmail.com' })
    const res = mockRes()
    await handler({ method: 'POST', headers: {}, body: {} }, res)
    expect(res.statusCode).toBe(400)
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run api/admin/cancel-subscription.test.js`
Expected: FAIL — `api/admin/cancel-subscription.js` does not exist yet.

- [ ] **Step 3: Write the implementation**

```js
// api/admin/cancel-subscription.js
import crypto from 'crypto'
import { createClient } from '@supabase/supabase-js'
import { requireAdmin } from '../_admin.js'

// Same PayFast REST signing scheme as api/payfast-cancel.js — duplicated
// rather than shared since both handlers are small, self-contained, and
// otherwise unrelated (one acts on the caller, one on an admin-chosen target).
function buildSignature({ merchantId, passphrase, timestamp, version }) {
  const params = { 'merchant-id': merchantId, passphrase, timestamp, version }
  const sigString = Object.keys(params)
    .sort()
    .map((k) => `${k}=${encodeURIComponent(params[k])}`)
    .join('&')
  return crypto.createHash('md5').update(sigString).digest('hex')
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: { message: 'Method not allowed' } })

  const admin = await requireAdmin(req)
  if (!admin) return res.status(403).json({ error: { message: 'Forbidden' } })

  const { userId } = req.body || {}
  if (!userId) return res.status(400).json({ error: { message: 'userId is required' } })

  const supabaseUrl = process.env.SUPABASE_URL
  const serviceKey = process.env.SUPABASE_SERVICE_KEY
  if (!supabaseUrl || !serviceKey) return res.status(500).json({ error: { message: 'Server misconfigured' } })
  const db = createClient(supabaseUrl, serviceKey)

  const { data: sub, error: fetchErr } = await db
    .from('subscriptions')
    .select('payfast_token, status')
    .eq('user_id', userId)
    .maybeSingle()

  if (fetchErr) {
    console.error('admin/cancel-subscription: lookup failed', fetchErr)
    return res.status(500).json({ error: { message: 'Could not look up that subscription.' } })
  }
  if (!sub || sub.status === 'cancelled') {
    return res.status(200).json({ ok: true, alreadyCancelled: true })
  }
  if (!sub.payfast_token) {
    await db.from('subscriptions').update({
      status: 'cancelled',
      updated_at: new Date().toISOString(),
    }).eq('user_id', userId)
    return res.status(200).json({ ok: true })
  }

  const merchantId = process.env.PAYFAST_MERCHANT_ID
  const passphrase = process.env.PAYFAST_PASSPHRASE
  const sandbox = process.env.PAYFAST_SANDBOX !== 'false'
  if (!merchantId || !passphrase) {
    return res.status(503).json({ error: { message: 'PayFast not configured' } })
  }

  const timestamp = new Date().toISOString().split('.')[0]
  const version = 'v1'
  const signature = buildSignature({ merchantId, passphrase, timestamp, version })
  const url = `https://api.payfast.co.za/subscriptions/${encodeURIComponent(sub.payfast_token)}/cancel${sandbox ? '?testing=true' : ''}`

  try {
    const response = await fetch(url, {
      method: 'PUT',
      headers: {
        'merchant-id': merchantId,
        'version': version,
        'timestamp': timestamp,
        'signature': signature,
        'Content-Type': 'application/json',
      },
    })
    if (!response.ok) {
      const errText = await response.text().catch(() => '')
      console.error('admin/cancel-subscription: PayFast cancel failed', response.status, errText)
      return res.status(502).json({ error: { message: 'Could not cancel with PayFast. Please try again.' } })
    }
  } catch (err) {
    console.error('admin/cancel-subscription: PayFast request failed', err)
    return res.status(502).json({ error: { message: 'Could not reach PayFast. Please try again.' } })
  }

  await db.from('subscriptions').update({
    status: 'cancelled',
    updated_at: new Date().toISOString(),
  }).eq('user_id', userId)

  res.status(200).json({ ok: true })
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run api/admin/cancel-subscription.test.js`
Expected: PASS (3 tests)

- [ ] **Step 5: Commit**

```bash
git add api/admin/cancel-subscription.js api/admin/cancel-subscription.test.js
git commit -m "feat: add admin cancel-subscription endpoint"
```

---

### Task 4: `src/services/adminService.js` — client fetch wrappers

**Files:**
- Create: `src/services/adminService.js`
- Test: `src/services/adminService.test.js`

**Interfaces:**
- Consumes: `authHeaders()` from `./chatService.js` (existing, `() => Promise<{Authorization?, 'Content-Type'}>`).
- Produces:
  - `export async function fetchOverview(): Promise<{users, stats}>` — `GET /api/admin/overview`.
  - `export async function cancelSubscription(userId: string): Promise<{ok, alreadyCancelled?}>` — `POST /api/admin/cancel-subscription`.
  - Both throw `Error(message)` on non-2xx, reading `body.error.message` same as `courseService.js`.

- [ ] **Step 1: Write the failing test**

```js
// src/services/adminService.test.js
import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('./chatService.js', () => ({
  authHeaders: vi.fn().mockResolvedValue({ 'Content-Type': 'application/json', Authorization: 'Bearer t' }),
}))

import { fetchOverview, cancelSubscription } from './adminService.js'

describe('adminService', () => {
  beforeEach(() => {
    global.fetch = vi.fn()
  })

  it('fetchOverview returns the parsed body on success', async () => {
    global.fetch.mockResolvedValue({ ok: true, json: async () => ({ users: [], stats: { tierCounts: { free: 0, trial: 0, pro: 0 }, signupsByDay: [] } }) })
    const result = await fetchOverview()
    expect(result.users).toEqual([])
    expect(global.fetch).toHaveBeenCalledWith('/api/admin/overview', expect.objectContaining({ headers: expect.any(Object) }))
  })

  it('fetchOverview throws the server error message on failure', async () => {
    global.fetch.mockResolvedValue({ ok: false, status: 403, json: async () => ({ error: { message: 'Forbidden' } }) })
    await expect(fetchOverview()).rejects.toThrow('Forbidden')
  })

  it('cancelSubscription posts the userId and returns the parsed body', async () => {
    global.fetch.mockResolvedValue({ ok: true, json: async () => ({ ok: true }) })
    const result = await cancelSubscription('u1')
    expect(result).toEqual({ ok: true })
    const [url, options] = global.fetch.mock.calls[0]
    expect(url).toBe('/api/admin/cancel-subscription')
    expect(options.method).toBe('POST')
    expect(JSON.parse(options.body)).toEqual({ userId: 'u1' })
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/services/adminService.test.js`
Expected: FAIL — `src/services/adminService.js` does not exist yet.

- [ ] **Step 3: Write the implementation**

```js
// src/services/adminService.js
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
  return request('/api/admin/overview')
}

export async function cancelSubscription(userId) {
  return request('/api/admin/cancel-subscription', {
    method: 'POST',
    body: JSON.stringify({ userId }),
  })
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/services/adminService.test.js`
Expected: PASS (3 tests)

- [ ] **Step 5: Commit**

```bash
git add src/services/adminService.js src/services/adminService.test.js
git commit -m "feat: add admin client service"
```

---

### Task 5: `src/pages/AdminPage.jsx` — the admin UI

**Files:**
- Create: `src/pages/AdminPage.jsx`
- Create: `src/pages/AdminPage.module.css`
- Test: `src/pages/AdminPage.test.jsx`

**Interfaces:**
- Consumes: `fetchOverview()`, `cancelSubscription(userId)` from `../services/adminService.js` (Task 4). Response shape: `{ users: [{id, email, createdAt, tier, status, trialEnd, subscriptionEnd}], stats: { tierCounts: {free,trial,pro}, signupsByDay: [{date,count}] } }`.
- Produces: default-exported `AdminPage` component, no props (mounted standalone by the router in Task 6).

- [ ] **Step 1: Write the failing test**

```jsx
// src/pages/AdminPage.test.jsx
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'

vi.mock('../services/adminService.js', () => ({
  fetchOverview: vi.fn(),
  cancelSubscription: vi.fn(),
}))

import { fetchOverview, cancelSubscription } from '../services/adminService.js'
import AdminPage from './AdminPage.jsx'

const overview = {
  users: [
    { id: 'u1', email: 'trial@x.com', createdAt: '2026-07-20T00:00:00.000Z', tier: 'trial', status: 'trial', trialEnd: '2099-01-01T00:00:00.000Z', subscriptionEnd: null },
    { id: 'u2', email: 'free@x.com', createdAt: '2026-07-21T00:00:00.000Z', tier: 'free', status: null, trialEnd: null, subscriptionEnd: null },
  ],
  stats: {
    tierCounts: { free: 1, trial: 1, pro: 0 },
    signupsByDay: [{ date: '2026-08-02', count: 2 }],
  },
}

function renderPage() {
  return render(<MemoryRouter><AdminPage /></MemoryRouter>)
}

describe('AdminPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    window.confirm = vi.fn().mockReturnValue(true)
  })

  it('renders the user list once the overview loads', async () => {
    fetchOverview.mockResolvedValue(overview)
    renderPage()
    await waitFor(() => expect(screen.getByText('trial@x.com')).toBeInTheDocument())
    expect(screen.getByText('free@x.com')).toBeInTheDocument()
  })

  it('shows an error state with a retry button when loading fails', async () => {
    fetchOverview.mockRejectedValue(new Error('boom'))
    renderPage()
    await waitFor(() => expect(screen.getByText('boom')).toBeInTheDocument())
    expect(screen.getByRole('button', { name: /retry/i })).toBeInTheDocument()
  })

  it('cancels a subscription and marks the row cancelled on success', async () => {
    fetchOverview.mockResolvedValue(overview)
    cancelSubscription.mockResolvedValue({ ok: true })
    renderPage()
    await waitFor(() => expect(screen.getByText('trial@x.com')).toBeInTheDocument())

    const user = userEvent.setup()
    await user.click(screen.getByRole('button', { name: /cancel subscription/i }))

    expect(cancelSubscription).toHaveBeenCalledWith('u1')
    await waitFor(() => expect(screen.queryByRole('button', { name: /cancel subscription/i })).not.toBeInTheDocument())
  })

  it('filters the table by email search', async () => {
    fetchOverview.mockResolvedValue(overview)
    renderPage()
    await waitFor(() => expect(screen.getByText('trial@x.com')).toBeInTheDocument())

    const user = userEvent.setup()
    await user.type(screen.getByPlaceholderText(/search/i), 'free@')

    expect(screen.getByText('free@x.com')).toBeInTheDocument()
    expect(screen.queryByText('trial@x.com')).not.toBeInTheDocument()
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/pages/AdminPage.test.jsx`
Expected: FAIL — `src/pages/AdminPage.jsx` does not exist yet.

- [ ] **Step 3: Write the implementation**

```jsx
// src/pages/AdminPage.jsx
import { useState, useEffect, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { fetchOverview, cancelSubscription } from '../services/adminService.js'
import styles from './AdminPage.module.css'

const TIER_LABEL = { free: 'Free', trial: 'Trial', pro: 'Pro' }

export default function AdminPage() {
  const navigate = useNavigate()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [users, setUsers] = useState([])
  const [stats, setStats] = useState(null)
  const [query, setQuery] = useState('')
  const [cancelingId, setCancelingId] = useState(null)
  const [rowErrors, setRowErrors] = useState({})

  const load = () => {
    setLoading(true)
    setError(null)
    fetchOverview()
      .then((data) => { setUsers(data.users); setStats(data.stats) })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false))
  }

  useEffect(() => { load() }, [])

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return users
    return users.filter((u) => u.email.toLowerCase().includes(q))
  }, [users, query])

  const handleCancel = async (userId) => {
    if (!window.confirm("Cancel this user's subscription?")) return
    setCancelingId(userId)
    setRowErrors((prev) => ({ ...prev, [userId]: null }))
    try {
      await cancelSubscription(userId)
      setUsers((prev) => prev.map((u) => (u.id === userId ? { ...u, status: 'cancelled' } : u)))
    } catch (err) {
      setRowErrors((prev) => ({ ...prev, [userId]: err.message }))
    } finally {
      setCancelingId(null)
    }
  }

  if (loading) {
    return <div className={styles.page}><p className={styles.loading}>Loading…</p></div>
  }

  if (error) {
    return (
      <div className={styles.page}>
        <p className={styles.errorMsg} role="alert">{error}</p>
        <button className={styles.retryBtn} onClick={load}>Retry</button>
      </div>
    )
  }

  const maxDay = Math.max(1, ...stats.signupsByDay.map((d) => d.count))

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <h1 className={styles.title}>Admin</h1>
        <button className={styles.back} onClick={() => navigate('/app')}>Back to app</button>
      </header>
      <p className={styles.count}>{users.length} total users</p>

      <section className={styles.statsRow}>
        <div className={styles.statCard}>
          <span className={styles.statValue}>{stats.tierCounts.free}</span>
          <span className={styles.statLabel}>Free</span>
        </div>
        <div className={styles.statCard}>
          <span className={styles.statValue}>{stats.tierCounts.trial}</span>
          <span className={styles.statLabel}>Trial</span>
        </div>
        <div className={styles.statCard}>
          <span className={styles.statValue}>{stats.tierCounts.pro}</span>
          <span className={styles.statLabel}>Pro</span>
        </div>
      </section>

      <section className={styles.chart}>
        <h2 className={styles.chartTitle}>Signups, last 30 days</h2>
        <div className={styles.bars}>
          {stats.signupsByDay.map((day) => (
            <div key={day.date} className={styles.barCol} title={`${day.date}: ${day.count}`}>
              <div className={styles.bar} style={{ height: `${(day.count / maxDay) * 100}%` }} />
            </div>
          ))}
        </div>
      </section>

      <section className={styles.tableSection}>
        <input
          className={styles.search}
          type="text"
          placeholder="Search by email…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        <table className={styles.table}>
          <thead>
            <tr>
              <th>Email</th>
              <th>Signed up</th>
              <th>Tier</th>
              <th>Status</th>
              <th>Renews / expires</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((u) => {
              const canCancel = (u.tier === 'trial' || u.tier === 'pro') && u.status !== 'cancelled'
              const endDate = u.tier === 'pro' ? u.subscriptionEnd : u.trialEnd
              return (
                <tr key={u.id}>
                  <td>{u.email}</td>
                  <td>{new Date(u.createdAt).toLocaleDateString()}</td>
                  <td><span className={styles.badge}>{TIER_LABEL[u.tier]}</span></td>
                  <td>{u.status || '—'}</td>
                  <td>{endDate ? new Date(endDate).toLocaleDateString() : '—'}</td>
                  <td>
                    {canCancel && (
                      <button
                        className={styles.cancelBtn}
                        disabled={cancelingId === u.id}
                        onClick={() => handleCancel(u.id)}
                      >
                        {cancelingId === u.id ? 'Cancelling…' : 'Cancel subscription'}
                      </button>
                    )}
                    {rowErrors[u.id] && <p className={styles.rowError} role="alert">{rowErrors[u.id]}</p>}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
        {filtered.length === 0 && <p className={styles.empty}>No users match "{query}".</p>}
      </section>
    </div>
  )
}
```

```css
/* src/pages/AdminPage.module.css */
.page {
  min-height: 100vh;
  background: var(--bg-gradient);
  color: var(--ink);
  font-family: var(--font-body);
  padding: 28px 24px 60px;
}

.header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  max-width: 1100px;
  margin: 0 auto 8px;
}

.title { font-size: 24px; font-weight: 800; margin: 0; }

.back {
  background: #fff;
  color: var(--c-grape);
  font-weight: 700;
  font-size: 13px;
  padding: 8px 16px;
  border-radius: var(--r-pill);
  box-shadow: var(--shadow-card);
  cursor: pointer;
}

.count { max-width: 1100px; margin: 0 auto 20px; opacity: 0.7; font-size: 14px; }

.statsRow {
  max-width: 1100px;
  margin: 0 auto 20px;
  display: flex;
  gap: 14px;
  flex-wrap: wrap;
}

.statCard {
  background: #fff;
  border-radius: var(--r-lg);
  box-shadow: var(--shadow-card);
  padding: 16px 22px;
  display: flex;
  flex-direction: column;
  min-width: 100px;
}

.statValue { font-size: 26px; font-weight: 800; }
.statLabel { font-size: 12px; opacity: 0.6; text-transform: uppercase; letter-spacing: 0.04em; }

.chart {
  max-width: 1100px;
  margin: 0 auto 24px;
  background: #fff;
  border-radius: var(--r-lg);
  box-shadow: var(--shadow-card);
  padding: 18px 22px;
}

.chartTitle { font-size: 14px; font-weight: 700; margin: 0 0 12px; }

.bars {
  display: flex;
  align-items: flex-end;
  gap: 3px;
  height: 80px;
}

.barCol { flex: 1; height: 100%; display: flex; align-items: flex-end; }
.bar { width: 100%; min-height: 2px; background: var(--c-grape); border-radius: 2px 2px 0 0; }

.tableSection {
  max-width: 1100px;
  margin: 0 auto;
  background: #fff;
  border-radius: var(--r-lg);
  box-shadow: var(--shadow-card);
  padding: 18px 22px;
}

.search {
  width: 100%;
  max-width: 320px;
  padding: 9px 14px;
  border-radius: var(--r-pill);
  border: 1px solid rgba(0,0,0,0.1);
  margin-bottom: 14px;
  font-size: 14px;
}

.table { width: 100%; border-collapse: collapse; font-size: 13px; }
.table th { text-align: left; padding: 8px 10px; font-size: 11px; text-transform: uppercase; opacity: 0.5; border-bottom: 1px solid rgba(0,0,0,0.08); }
.table td { padding: 10px; border-bottom: 1px solid rgba(0,0,0,0.05); vertical-align: middle; }

.badge {
  display: inline-block;
  padding: 3px 10px;
  border-radius: var(--r-pill);
  background: rgba(124, 58, 237, 0.12);
  color: var(--c-grape);
  font-weight: 700;
  font-size: 12px;
}

.cancelBtn {
  background: #fee2e2;
  color: #b91c1c;
  font-weight: 700;
  font-size: 12px;
  padding: 6px 12px;
  border-radius: var(--r-pill);
  cursor: pointer;
}
.cancelBtn:disabled { opacity: 0.6; cursor: default; }

.rowError { color: #b91c1c; font-size: 12px; margin: 4px 0 0; }
.empty { text-align: center; opacity: 0.6; padding: 20px 0 0; }
.loading, .errorMsg { max-width: 1100px; margin: 60px auto; text-align: center; }
.retryBtn {
  display: block;
  margin: 12px auto 0;
  background: var(--c-grape);
  color: #fff;
  font-weight: 700;
  padding: 10px 20px;
  border-radius: var(--r-pill);
  cursor: pointer;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/pages/AdminPage.test.jsx`
Expected: PASS (4 tests)

- [ ] **Step 5: Commit**

```bash
git add src/pages/AdminPage.jsx src/pages/AdminPage.module.css src/pages/AdminPage.test.jsx
git commit -m "feat: add AdminPage UI"
```

---

### Task 6: Wire `/admin` into the router

**Files:**
- Modify: `src/App.jsx`

**Interfaces:**
- Consumes: default-exported `AdminPage` from `./pages/AdminPage.jsx` (Task 5).
- Produces: route `/admin`, reachable only when `session.user.email === ADMIN_EMAIL`; otherwise redirects to `/app` (or `/` if signed out), matching the existing route-guard pattern in this file.

- [ ] **Step 1: Add the lazy import**

In `src/App.jsx`, alongside the other `lazy(() => import(...))` declarations (after `CookiePolicyPage`):

```jsx
const AdminPage = lazy(() => import('./pages/AdminPage.jsx'))
```

- [ ] **Step 2: Add the admin email constant and route**

Add near the top of the file, after the imports:

```jsx
// Must match ADMIN_EMAIL in api/_admin.js exactly. This check is UX-only —
// the API endpoints re-check server-side, which is the real security boundary.
const ADMIN_EMAIL = 'rebawntech@gmail.com'
```

Add the route inside `<Routes>`, in the "Authenticated" block, after `/lesson`:

```jsx
<Route path="/admin" element={session?.user?.email === ADMIN_EMAIL ? <AdminPage /> : <Navigate to={session ? '/app' : '/'} replace />} />
```

- [ ] **Step 3: Manually verify in dev**

Run: `npm run dev`, sign in with a non-admin account, navigate to `/admin` — expect redirect to `/app`. This is a routing/auth-guard change with no isolated unit to test; existing `App.jsx` has no test file, consistent with the rest of the routing table.

- [ ] **Step 4: Commit**

```bash
git add src/App.jsx
git commit -m "feat: wire /admin route into the app"
```

---

### Task 7: Full test suite + manual admin verification

**Files:** none (verification only)

- [ ] **Step 1: Run the full test suite**

Run: `npm run test`
Expected: all tests pass, including the six files added in Tasks 1–5.

- [ ] **Step 2: Manual verification with the real admin account**

With `SUPABASE_SERVICE_KEY` set in the local environment, run `npm run dev`, sign in as `rebawntech@gmail.com`, navigate to `/admin`, and confirm:
- The user table renders with correct tiers and dates.
- The stats cards and signup bar chart render without errors.
- The email search box filters the table.
- Clicking "Cancel subscription" on a trial/pro user prompts for confirmation, then marks that row cancelled (verify against the `subscriptions` table in Supabase).

No commit for this task — it's a verification checkpoint before considering the plan complete.
