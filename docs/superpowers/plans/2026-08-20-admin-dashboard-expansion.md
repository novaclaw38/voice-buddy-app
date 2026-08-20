# Admin Dashboard Expansion Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Extend the existing admin dashboard with a real payments ledger (financial tracking), user-management actions (grant/extend Pro, ban/unban, permanently delete), and a per-user detail page — all without adding any new Vercel serverless function files.

**Architecture:** A new `payments` table is populated by `api/payfast-webhook.js` on every ITN. `api/admin/index.js` (the single existing admin function) grows an `action`-routed POST body and a `userId`-scoped GET branch to serve everything new. `AdminPage.jsx` gains revenue stats/chart/transactions and per-row actions; a new `AdminUserDetailPage.jsx` covers the one-user drill-down.

**Tech Stack:** React 18 + react-router-dom, Vite, Vitest + Testing Library, Supabase (Postgres + Auth), Vercel serverless functions (Node).

**Spec:** `docs/superpowers/specs/2026-08-20-admin-dashboard-expansion-design.md`

## Global Constraints

- No new files under `api/` may be added except `_`-prefixed helpers (Vercel's Hobby-plan 12-function cap; the repo is already at 12).
- `ADMIN_EMAIL` stays hardcoded as `rebawntech@gmail.com` in both `api/_admin.js` and `src/App.jsx` — must match exactly in both places.
- All new mutating admin actions go through the service role (`SUPABASE_SERVICE_KEY`), never the anon key.
- `payments.user_id` uses `ON DELETE SET NULL` — payment history must survive user deletion.
- Every mutating API action requires `requireAdmin` to pass first (403 otherwise).
- Follow the existing per-row `actioningId` / `rowErrors` inline-error UI pattern — no global toasts, no silent failures.

---

## Task 1: `payments` table migration

**Files:**
- Create: `supabase/migrations/2026-08-20-create-payments-ledger.sql`

**Interfaces:**
- Produces: table `public.payments (id uuid, user_id uuid nullable, pf_payment_id text unique, amount numeric(10,2), status text, payment_type text, created_at timestamptz)`, consumed by Task 2 (webhook) and Task 3 (admin API).

- [ ] **Step 1: Write the migration file**

```sql
-- Payments ledger: one row per PayFast ITN, independent of the
-- subscriptions table's current-state row. Populated by
-- api/payfast-webhook.js; read by api/admin/index.js for financial
-- reporting. Only the service role ever touches this table.

create table public.payments (
  id             uuid primary key default gen_random_uuid(),
  user_id        uuid references auth.users(id) on delete set null,
  pf_payment_id  text not null unique,
  amount         numeric(10,2) not null,
  status         text not null,           -- 'complete' | 'failed' | 'cancelled'
  payment_type   text not null,           -- 'trial_setup' | 'recurring'
  created_at     timestamptz not null default now()
);

alter table public.payments enable row level security;
-- No policies: RLS-enabled + zero policies blocks anon/authenticated
-- entirely, matching the subscriptions table. Only the service role
-- (webhook, admin API) reads or writes this table.

create index payments_user_id_idx on public.payments (user_id);
create index payments_created_at_idx on public.payments (created_at desc);
```

- [ ] **Step 2: Apply the migration**

Run in the Supabase SQL editor (this repo has no local Supabase CLI workflow — every existing migration file is applied manually there; check `supabase/migrations/` for confirmation there's no `supabase db push` script in `package.json`).

- [ ] **Step 3: Verify the table exists with RLS locked down**

In the Supabase SQL editor:
```sql
select tablename, rowsecurity from pg_tables where tablename = 'payments';
select count(*) from pg_policies where tablename = 'payments';
```
Expected: `rowsecurity = true`, policy count `0`.

- [ ] **Step 4: Commit**

```bash
git add supabase/migrations/2026-08-20-create-payments-ledger.sql
git commit -m "feat: add payments ledger table for financial tracking"
```

---

## Task 2: Webhook writes to the payments ledger

**Files:**
- Modify: `api/payfast-webhook.js`
- Create: `api/payfast-webhook.test.js`

**Interfaces:**
- Consumes: `payments` table from Task 1.
- Produces: nothing new consumed by later tasks — this is a leaf change (the ledger's writer). Later tasks (3+) only read `payments` and don't depend on this file's internals.

- [ ] **Step 1: Write the failing tests**

Create `api/payfast-webhook.test.js`. The handler isn't currently unit-tested, so this file establishes the harness and covers both the pre-existing behavior and the new ledger writes. Mock `@supabase/supabase-js`'s `createClient` and `fetch` (for the PayFast postback validation call).

```js
import { describe, it, expect, vi, beforeEach } from 'vitest'

const insertedRows = { payfast_webhook_events: [], subscriptions: [], payments: [] }

function makeQueryBuilder(table) {
  return {
    insert: vi.fn((row) => {
      if (table === 'payfast_webhook_events') {
        const dup = insertedRows.payfast_webhook_events.some((r) => r.pf_payment_id === row.pf_payment_id)
        insertedRows.payfast_webhook_events.push(row)
        return Promise.resolve({ error: dup ? { code: '23505' } : null })
      }
      insertedRows[table].push(row)
      return Promise.resolve({ error: null })
    }),
    upsert: vi.fn((row) => {
      insertedRows[table].push(row)
      return Promise.resolve({ error: null })
    }),
  }
}

const mockDb = {
  from: vi.fn((table) => makeQueryBuilder(table)),
}

vi.mock('@supabase/supabase-js', () => ({
  createClient: () => mockDb,
}))

import handler from './payfast-webhook.js'

function mockRes() {
  const res = { statusCode: 0 }
  res.status = (c) => { res.statusCode = c; return res }
  res.end = () => res
  return res
}

function mockReq(body) {
  return { method: 'POST', body }
}

const crypto = await import('crypto')
function signBody(body, passphrase) {
  const paramString = Object.entries(body)
    .map(([k, v]) => `${k}=${encodeURIComponent(v).replace(/%20/g, '+')}`)
    .join('&')
  const signatureInput = `${paramString}&passphrase=${encodeURIComponent(passphrase).replace(/%20/g, '+')}`
  return crypto.createHash('md5').update(signatureInput).digest('hex')
}

describe('payfast-webhook payments ledger', () => {
  const passphrase = 'test-pass'

  beforeEach(() => {
    vi.clearAllMocks()
    insertedRows.payfast_webhook_events = []
    insertedRows.subscriptions = []
    insertedRows.payments = []
    process.env.PAYFAST_PASSPHRASE = passphrase
    process.env.SUPABASE_SERVICE_KEY = 'service-key'
    process.env.PAYFAST_SANDBOX = 'true'
    global.fetch = vi.fn().mockResolvedValue({ text: async () => 'VALID' })
  })

  it('logs a complete recurring charge as a payments row', async () => {
    const body = {
      m_payment_id: 'user-1',
      payment_status: 'COMPLETE',
      token: 'tok-1',
      amount_gross: '149.00',
      pf_payment_id: 'pf-1',
    }
    const signature = signBody(body, passphrase)
    await handler(mockReq({ ...body, signature }), mockRes())

    expect(insertedRows.payments).toHaveLength(1)
    expect(insertedRows.payments[0]).toMatchObject({
      pf_payment_id: 'pf-1',
      user_id: 'user-1',
      amount: 149,
      status: 'complete',
      payment_type: 'recurring',
    })
  })

  it('logs a complete trial setup (R0) as trial_setup', async () => {
    const body = {
      m_payment_id: 'user-2',
      payment_status: 'COMPLETE',
      token: 'tok-2',
      amount_gross: '0.00',
      pf_payment_id: 'pf-2',
    }
    const signature = signBody(body, passphrase)
    await handler(mockReq({ ...body, signature }), mockRes())

    expect(insertedRows.payments[0]).toMatchObject({
      pf_payment_id: 'pf-2',
      amount: 0,
      status: 'complete',
      payment_type: 'trial_setup',
    })
  })

  it('logs a cancelled notification as status cancelled', async () => {
    const body = {
      m_payment_id: 'user-3',
      payment_status: 'CANCELLED',
      amount_gross: '0.00',
      pf_payment_id: 'pf-3',
    }
    const signature = signBody(body, passphrase)
    await handler(mockReq({ ...body, signature }), mockRes())

    expect(insertedRows.payments[0]).toMatchObject({
      pf_payment_id: 'pf-3',
      status: 'cancelled',
    })
  })

  it('does not insert a duplicate payments row for a replayed pf_payment_id', async () => {
    const body = {
      m_payment_id: 'user-1',
      payment_status: 'COMPLETE',
      amount_gross: '149.00',
      pf_payment_id: 'pf-dupe',
    }
    const signature = signBody(body, passphrase)
    await handler(mockReq({ ...body, signature }), mockRes())
    await handler(mockReq({ ...body, signature }), mockRes())

    expect(insertedRows.payments).toHaveLength(1)
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run api/payfast-webhook.test.js`
Expected: FAIL — `insertedRows.payments` stays empty since the handler doesn't write to `payments` yet.

- [ ] **Step 3: Implement the ledger write**

In `api/payfast-webhook.js`, add a helper above `handler` and call it once per branch. Insert after the existing `ALLOWED_AMOUNTS` check (line ~81) and before the three `if (status === ...)` branches, capture a `payment_type` and `payment_status_normalized`, then call the insert once (all three branches converge to the same write — only the `status` value differs, which is already known before branching):

```js
function normalizeStatus(payfastStatus) {
  if (payfastStatus === 'COMPLETE') return 'complete'
  if (payfastStatus === 'CANCELLED') return 'cancelled'
  return 'failed'
}
```

Then, right after the `ALLOWED_AMOUNTS` check and before the three-way `if (status === 'COMPLETE' && amount >= 149) { ... }` branch, insert:

```js
  const paymentType = amount >= 149 ? 'recurring' : 'trial_setup'
  const { error: paymentInsertErr } = await db.from('payments').insert({
    pf_payment_id: pfPaymentId,
    user_id:       userId,
    amount,
    status:        normalizeStatus(status),
    payment_type:  paymentType,
  })
  if (paymentInsertErr) {
    console.error('PayFast ITN: payments ledger insert failed', paymentInsertErr)
    // Don't abort — the subscription-state update below is the
    // user-facing effect and must still happen even if the ledger write
    // fails.
  }
```

Leave the existing three `if (status === 'COMPLETE' && amount >= 149) { ... } else if (...) { ... } else if (...) { ... }` branches and their `subscriptions` upserts completely unchanged below this new block.

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run api/payfast-webhook.test.js`
Expected: PASS (all 4 tests)

- [ ] **Step 5: Run the full test suite to check for regressions**

Run: `npx vitest run`
Expected: PASS (no existing test touches `payfast-webhook.js` today, so this just confirms nothing else broke)

- [ ] **Step 6: Commit**

```bash
git add api/payfast-webhook.js api/payfast-webhook.test.js
git commit -m "feat: log every PayFast ITN to the payments ledger"
```

---

## Task 3: `api/admin/index.js` — action-routed POST + revenue stats + userId GET branch

**Files:**
- Modify: `api/admin/index.js`
- Modify: `api/admin/index.test.js`

**Interfaces:**
- Consumes: `payments`, `children`, `lesson_completions` tables (existing/Task 1); `requireAdmin`/`computeTier` from `api/_admin.js` (unchanged).
- Produces:
  - `GET /api/admin` response gains `stats.revenue = { total, mrr, byDay }` and `stats.failedPayments30d`.
  - `GET /api/admin?userId=<id>` → `{ payments, children, lessonActivity }`.
  - `POST /api/admin` body shape changes from `{ userId }` (cancel-only) to `{ action, userId, ...extra }` with `action` one of `cancelSubscription | grantPro | banUser | unbanUser | deleteUser`.
  - These exact shapes are consumed by Task 4 (`adminService.js`).

- [ ] **Step 1: Write the failing tests**

Append to `api/admin/index.test.js` (keep the existing 4 tests as-is, add these):

```js
describe('api/admin new capabilities', () => {
  beforeEach(() => vi.clearAllMocks())

  it('rejects a POST with an unknown action with 400', async () => {
    mocks.requireAdmin.mockResolvedValue({ id: 'admin', email: 'rebawntech@gmail.com' })
    const res = mockRes()
    await handler({ method: 'POST', headers: {}, body: { action: 'nonsense', userId: 'u1' } }, res)
    expect(res.statusCode).toBe(400)
  })

  it('still accepts a cancelSubscription action (renamed from the old bare-userId shape)', async () => {
    mocks.requireAdmin.mockResolvedValue({ id: 'admin', email: 'rebawntech@gmail.com' })
    const res = mockRes()
    await handler({ method: 'POST', headers: {}, body: { action: 'cancelSubscription' } }, res)
    expect(res.statusCode).toBe(400) // missing userId still 400s, same as before
  })
})
```

Note: full success-path coverage for `grantPro`/`banUser`/`unbanUser`/`deleteUser`/`userId` GET would require mocking the Supabase client's `.from()/.upsert()/.select()/.auth.admin.*` chain, which `api/admin/index.test.js` doesn't currently do (it only tests the `requireAdmin` gate and basic validation, per the existing file's scope). Keep this task's new tests at that same level — gate/validation only — consistent with the file's existing pattern; don't introduce a new mocking strategy here.

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run api/admin/index.test.js`
Expected: FAIL — unknown action currently falls through to whatever `handleCancelSubscription` does with a body shape it doesn't expect, not a clean 400.

- [ ] **Step 3: Implement the action router and new handlers**

Rewrite the bottom of `api/admin/index.js` (the `handleCancelSubscription` function and the `export default handler`) and add new handler functions above the export. Full replacement of everything from `handleCancelSubscription` (currently line 88) to the end of the file:

```js
async function handleCancelSubscription(client, userId) {
  const { data: sub, error: fetchErr } = await client
    .from('subscriptions')
    .select('payfast_token, status')
    .eq('user_id', userId)
    .maybeSingle()

  if (fetchErr) {
    console.error('admin/cancelSubscription: lookup failed', fetchErr)
    return { status: 500, body: { error: { message: 'Could not look up that subscription.' } } }
  }
  if (!sub || sub.status === 'cancelled') {
    return { status: 200, body: { ok: true, alreadyCancelled: true } }
  }
  if (!sub.payfast_token) {
    await client.from('subscriptions').update({
      status: 'cancelled',
      updated_at: new Date().toISOString(),
    }).eq('user_id', userId)
    return { status: 200, body: { ok: true } }
  }

  const merchantId = process.env.PAYFAST_MERCHANT_ID
  const passphrase = process.env.PAYFAST_PASSPHRASE
  const sandbox = process.env.PAYFAST_SANDBOX !== 'false'
  if (!merchantId || !passphrase) {
    return { status: 503, body: { error: { message: 'PayFast not configured' } } }
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
      console.error('admin/cancelSubscription: PayFast cancel failed', response.status, errText)
      return { status: 502, body: { error: { message: 'Could not cancel with PayFast. Please try again.' } } }
    }
  } catch (err) {
    console.error('admin/cancelSubscription: PayFast request failed', err)
    return { status: 502, body: { error: { message: 'Could not reach PayFast. Please try again.' } } }
  }

  await client.from('subscriptions').update({
    status: 'cancelled',
    updated_at: new Date().toISOString(),
  }).eq('user_id', userId)

  return { status: 200, body: { ok: true } }
}

async function handleGrantPro(client, userId, endDate) {
  if (!endDate) return { status: 400, body: { error: { message: 'endDate is required' } } }
  await client.from('subscriptions').upsert({
    user_id: userId,
    status: 'active',
    subscription_end: new Date(endDate).toISOString(),
    updated_at: new Date().toISOString(),
  }, { onConflict: 'user_id' })
  return { status: 200, body: { ok: true } }
}

async function handleSetBan(client, userId, banned) {
  const { error } = await client.auth.admin.updateUserById(userId, {
    ban_duration: banned ? '876000h' : 'none',
  })
  if (error) {
    console.error('admin/setBan: updateUserById failed', error)
    return { status: 500, body: { error: { message: 'Could not update ban status.' } } }
  }
  return { status: 200, body: { ok: true } }
}

async function handleDeleteUser(client, userId) {
  await client.from('subscriptions').delete().eq('user_id', userId)
  const { error } = await client.auth.admin.deleteUser(userId)
  if (error) {
    console.error('admin/deleteUser: deleteUser failed', error)
    return { status: 500, body: { error: { message: 'Could not delete that user.' } } }
  }
  return { status: 200, body: { ok: true } }
}

// Same zero-filled daily bucketing as bucketSignupsByDay, but summing an
// `amount` field off `complete` payments instead of counting users.
function bucketRevenueByDay(payments, days) {
  const sums = new Map()
  const now = new Date()
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(now)
    d.setUTCDate(d.getUTCDate() - i)
    sums.set(d.toISOString().slice(0, 10), 0)
  }
  for (const p of payments) {
    if (p.status !== 'complete') continue
    const day = p.created_at.slice(0, 10)
    if (sums.has(day)) sums.set(day, sums.get(day) + Number(p.amount))
  }
  return Array.from(sums, ([date, amount]) => ({ date, amount }))
}

async function handleUserDetail(client, userId) {
  const { data: payments, error: paymentsErr } = await client
    .from('payments')
    .select('id, amount, status, payment_type, created_at')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
  if (paymentsErr) {
    console.error('admin/userDetail: payments query failed', paymentsErr)
    return { status: 500, body: { error: { message: 'Could not load payment history.' } } }
  }

  const { data: children, error: childrenErr } = await client
    .from('children')
    .select('id, name, buddy_name, avatar_type, avatar_color')
    .eq('user_id', userId)
  if (childrenErr) {
    console.error('admin/userDetail: children query failed', childrenErr)
    return { status: 500, body: { error: { message: 'Could not load children.' } } }
  }

  const { data: completions, error: completionsErr } = await client
    .from('lesson_completions')
    .select('child_id, mastery_score')
    .in('child_id', children.map((c) => c.id))
  if (completionsErr) {
    console.error('admin/userDetail: lesson_completions query failed', completionsErr)
    return { status: 500, body: { error: { message: 'Could not load lesson activity.' } } }
  }

  const lessonActivity = children.map((c) => {
    const rows = completions.filter((r) => r.child_id === c.id)
    const scored = rows.filter((r) => r.mastery_score != null)
    const avgMastery = scored.length
      ? Math.round(scored.reduce((sum, r) => sum + r.mastery_score, 0) / scored.length)
      : null
    return { childId: c.id, childName: c.name, completions: rows.length, avgMastery }
  })

  return {
    status: 200,
    body: {
      payments: payments.map((p) => ({
        id: p.id, amount: Number(p.amount), status: p.status,
        paymentType: p.payment_type, createdAt: p.created_at,
      })),
      children: children.map((c) => ({
        id: c.id, name: c.name, buddyName: c.buddy_name,
        avatarType: c.avatar_type, avatarColor: c.avatar_color,
      })),
      lessonActivity,
    },
  }
}

export default async function handler(req, res) {
  const admin = await requireAdmin(req)
  if (!admin) return res.status(403).json({ error: { message: 'Forbidden' } })

  const client = db()

  if (req.method === 'GET') {
    if (req.query?.userId) {
      const result = await handleUserDetail(client, req.query.userId)
      return res.status(result.status).json(result.body)
    }
    return handleOverview(req, res)
  }

  if (req.method === 'POST') {
    const { action, userId, endDate } = req.body || {}
    if (!userId) return res.status(400).json({ error: { message: 'userId is required' } })

    let result
    if (action === 'cancelSubscription') result = await handleCancelSubscription(client, userId)
    else if (action === 'grantPro') result = await handleGrantPro(client, userId, endDate)
    else if (action === 'banUser') result = await handleSetBan(client, userId, true)
    else if (action === 'unbanUser') result = await handleSetBan(client, userId, false)
    else if (action === 'deleteUser') result = await handleDeleteUser(client, userId)
    else return res.status(400).json({ error: { message: `Unknown action: ${action}` } })

    return res.status(result.status).json(result.body)
  }

  return res.status(405).json({ error: { message: 'Method not allowed' } })
}
```

This reuses the existing `db()` and `buildSignature()` functions already defined earlier in the file (unchanged) and the existing `handleOverview` function (modified in Step 3b below). Note `handleCancelSubscription`'s signature changed from `(req, res)` to `(client, userId)` returning `{ status, body }` — this lets every action share one `client = db()` call and one response-writing site in `handler`, instead of each handler managing `res` directly.

- [ ] **Step 3b: Extend `handleOverview` with revenue stats**

In the existing `handleOverview` function, after the `tierCounts` loop and before the final `return res.status(200).json(...)`, add:

```js
  const { data: payments, error: paymentsErr } = await db()
    .from('payments')
    .select('id, user_id, amount, status, payment_type, created_at')
    .order('created_at', { ascending: false })
  if (paymentsErr) {
    console.error('admin/overview: payments query failed', paymentsErr)
    return res.status(500).json({ error: { message: 'Could not load payment data.' } })
  }

  const total = payments
    .filter((p) => p.status === 'complete')
    .reduce((sum, p) => sum + Number(p.amount), 0)

  const thirtyDaysAgo = new Date()
  thirtyDaysAgo.setUTCDate(thirtyDaysAgo.getUTCDate() - 30)
  const failedPayments30d = payments.filter(
    (p) => p.status !== 'complete' && new Date(p.created_at) >= thirtyDaysAgo
  ).length

  const emailByUserId = new Map(users.map((u) => [u.id, u.email]))
  const recentPayments = payments.slice(0, 50).map((p) => ({
    id: p.id,
    email: p.user_id ? (emailByUserId.get(p.user_id) || '(deleted user)') : '(deleted user)',
    amount: Number(p.amount),
    status: p.status,
    paymentType: p.payment_type,
    createdAt: p.created_at,
  }))
```

Then change the final return to:

```js
  res.setHeader('Cache-Control', 'private, no-store')
  return res.status(200).json({
    users,
    stats: {
      signupsByDay: bucketSignupsByDay(users, 30),
      tierCounts,
      revenue: {
        total,
        mrr: tierCounts.pro * 149,
        byDay: bucketRevenueByDay(payments, 30),
      },
      failedPayments30d,
      recentPayments,
    },
  })
```

(`bucketRevenueByDay` is defined in Step 3, above `handleUserDetail`; it still works unchanged since `payments` rows now carry extra fields it simply ignores.)

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run api/admin/index.test.js`
Expected: PASS (all tests, old and new)

- [ ] **Step 5: Run the full test suite to check for regressions**

Run: `npx vitest run`
Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add api/admin/index.js api/admin/index.test.js
git commit -m "feat: add grant/ban/delete admin actions and revenue stats to admin API"
```

---

## Task 4: `adminService.js` — client for the new API surface

**Files:**
- Modify: `src/services/adminService.js`
- Modify: `src/services/adminService.test.js`

**Interfaces:**
- Consumes: `GET/POST /api/admin` shapes from Task 3.
- Produces: `fetchOverview()`, `cancelSubscription(userId)`, `fetchUserDetail(userId)`, `grantPro(userId, endDate)`, `banUser(userId)`, `unbanUser(userId)`, `deleteUser(userId)` — all consumed by Task 5 and Task 6.

- [ ] **Step 1: Write the failing tests**

Replace the `cancelSubscription posts the userId` test in `adminService.test.js` (body shape changed) and add tests for the new functions:

```js
  it('cancelSubscription posts the action and userId, and returns the parsed body', async () => {
    global.fetch.mockResolvedValue({ ok: true, json: async () => ({ ok: true }) })
    const result = await cancelSubscription('u1')
    expect(result).toEqual({ ok: true })
    const [url, options] = global.fetch.mock.calls[0]
    expect(url).toBe('/api/admin')
    expect(options.method).toBe('POST')
    expect(JSON.parse(options.body)).toEqual({ action: 'cancelSubscription', userId: 'u1' })
  })

  it('fetchUserDetail requests the userId query param', async () => {
    global.fetch.mockResolvedValue({ ok: true, json: async () => ({ payments: [], children: [], lessonActivity: [] }) })
    await fetchUserDetail('u1')
    expect(global.fetch).toHaveBeenCalledWith('/api/admin?userId=u1', expect.objectContaining({ headers: expect.any(Object) }))
  })

  it('grantPro posts the action, userId, and endDate', async () => {
    global.fetch.mockResolvedValue({ ok: true, json: async () => ({ ok: true }) })
    await grantPro('u1', '2026-12-01')
    const [, options] = global.fetch.mock.calls[0]
    expect(JSON.parse(options.body)).toEqual({ action: 'grantPro', userId: 'u1', endDate: '2026-12-01' })
  })

  it('banUser posts the banUser action', async () => {
    global.fetch.mockResolvedValue({ ok: true, json: async () => ({ ok: true }) })
    await banUser('u1')
    const [, options] = global.fetch.mock.calls[0]
    expect(JSON.parse(options.body)).toEqual({ action: 'banUser', userId: 'u1' })
  })

  it('unbanUser posts the unbanUser action', async () => {
    global.fetch.mockResolvedValue({ ok: true, json: async () => ({ ok: true }) })
    await unbanUser('u1')
    const [, options] = global.fetch.mock.calls[0]
    expect(JSON.parse(options.body)).toEqual({ action: 'unbanUser', userId: 'u1' })
  })

  it('deleteUser posts the deleteUser action', async () => {
    global.fetch.mockResolvedValue({ ok: true, json: async () => ({ ok: true }) })
    await deleteUser('u1')
    const [, options] = global.fetch.mock.calls[0]
    expect(JSON.parse(options.body)).toEqual({ action: 'deleteUser', userId: 'u1' })
  })
```

Update the top import line to:
```js
import { fetchOverview, cancelSubscription, fetchUserDetail, grantPro, banUser, unbanUser, deleteUser } from './adminService.js'
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run src/services/adminService.test.js`
Expected: FAIL — new functions don't exist yet, and `cancelSubscription`'s body shape doesn't include `action` yet.

- [ ] **Step 3: Implement**

Replace `src/services/adminService.js` entirely:

```js
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
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run src/services/adminService.test.js`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/services/adminService.js src/services/adminService.test.js
git commit -m "feat: add adminService client functions for grant/ban/delete/user-detail"
```

---

## Task 5: `AdminPage.jsx` — revenue stats, transactions table, row actions

**Files:**
- Modify: `src/pages/AdminPage.jsx`
- Modify: `src/pages/AdminPage.module.css`
- Modify: `src/pages/AdminPage.test.jsx`

**Interfaces:**
- Consumes: `fetchOverview`, `cancelSubscription`, `banUser`, `unbanUser`, `deleteUser` from `adminService.js` (Task 4); `stats.revenue`, `stats.failedPayments30d` fields from Task 3's `GET /api/admin` response.
- Produces: a `/admin/users/:id` "View" link consumed by Task 6 (the link's target route is added to `App.jsx` in Task 6, not here — this task only renders the `<Link>`).

- [ ] **Step 1: Write the failing tests**

Update the `overview` fixture in `AdminPage.test.jsx` to include the new stats fields, mock the new service functions, and add test cases:

```js
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'

vi.mock('../services/adminService.js', () => ({
  fetchOverview: vi.fn(),
  cancelSubscription: vi.fn(),
  banUser: vi.fn(),
  unbanUser: vi.fn(),
  deleteUser: vi.fn(),
}))

import { fetchOverview, cancelSubscription, banUser, deleteUser } from '../services/adminService.js'
import AdminPage from './AdminPage.jsx'

const overview = {
  users: [
    { id: 'u1', email: 'trial@x.com', createdAt: '2026-07-20T00:00:00.000Z', tier: 'trial', status: 'trial', trialEnd: '2099-01-01T00:00:00.000Z', subscriptionEnd: null },
    { id: 'u2', email: 'free@x.com', createdAt: '2026-07-21T00:00:00.000Z', tier: 'free', status: null, trialEnd: null, subscriptionEnd: null },
  ],
  stats: {
    tierCounts: { free: 1, trial: 1, pro: 0 },
    signupsByDay: [{ date: '2026-08-02', count: 2 }],
    revenue: { total: 149, mrr: 0, byDay: [{ date: '2026-08-02', amount: 149 }] },
    failedPayments30d: 1,
    recentPayments: [{ id: 'p1', email: 'trial@x.com', amount: 149, status: 'complete', paymentType: 'recurring', createdAt: '2026-08-02T00:00:00.000Z' }],
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

  it('renders revenue stats and the transactions table', async () => {
    fetchOverview.mockResolvedValue(overview)
    renderPage()
    await waitFor(() => expect(screen.getByText('trial@x.com')).toBeInTheDocument())

    expect(screen.getByText('R149.00')).toBeInTheDocument() // total revenue
    expect(screen.getByText(/1/)).toBeInTheDocument() // failedPayments30d somewhere in stats
  })

  it('bans a user and shows Unban afterwards', async () => {
    fetchOverview.mockResolvedValue(overview)
    banUser.mockResolvedValue({ ok: true })
    renderPage()
    await waitFor(() => expect(screen.getByText('trial@x.com')).toBeInTheDocument())

    const user = userEvent.setup()
    const banButtons = screen.getAllByRole('button', { name: /^ban$/i })
    await user.click(banButtons[0])

    expect(banUser).toHaveBeenCalledWith('u1')
    await waitFor(() => expect(screen.getAllByRole('button', { name: /^unban$/i })[0]).toBeInTheDocument())
  })

  it('deletes a user after confirming, removing the row', async () => {
    fetchOverview.mockResolvedValue(overview)
    deleteUser.mockResolvedValue({ ok: true })
    renderPage()
    await waitFor(() => expect(screen.getByText('trial@x.com')).toBeInTheDocument())

    const user = userEvent.setup()
    const deleteButtons = screen.getAllByRole('button', { name: /delete/i })
    await user.click(deleteButtons[0])

    expect(window.confirm).toHaveBeenCalled()
    expect(deleteUser).toHaveBeenCalledWith('u1')
    await waitFor(() => expect(screen.queryByText('trial@x.com')).not.toBeInTheDocument())
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run src/pages/AdminPage.test.jsx`
Expected: FAIL — revenue section, ban/unban/delete buttons, and `Link` don't exist yet.

- [ ] **Step 3: Implement**

Replace `src/pages/AdminPage.jsx` entirely:

```jsx
import { useState, useEffect, useMemo } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { fetchOverview, cancelSubscription, banUser, unbanUser, deleteUser } from '../services/adminService.js'
import SkipLink from '../components/SkipLink.jsx'
import styles from './AdminPage.module.css'

const TIER_LABEL = { free: 'Free', trial: 'Trial', pro: 'Pro' }

function formatCurrency(amount) {
  return `R${Number(amount).toFixed(2)}`
}

export default function AdminPage() {
  const navigate = useNavigate()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [users, setUsers] = useState([])
  const [stats, setStats] = useState(null)
  const [query, setQuery] = useState('')
  const [actioningId, setActioningId] = useState(null)
  const [rowErrors, setRowErrors] = useState({})
  const [banned, setBanned] = useState({})

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

  const runRowAction = async (userId, fn, onSuccess) => {
    setActioningId(userId)
    setRowErrors((prev) => ({ ...prev, [userId]: null }))
    try {
      await fn()
      onSuccess()
    } catch (err) {
      setRowErrors((prev) => ({ ...prev, [userId]: err.message }))
    } finally {
      setActioningId(null)
    }
  }

  const handleCancel = (userId) => {
    if (!window.confirm("Cancel this user's subscription?")) return
    runRowAction(userId, () => cancelSubscription(userId), () => {
      setUsers((prev) => prev.map((u) => (u.id === userId ? { ...u, status: 'cancelled' } : u)))
    })
  }

  const handleBanToggle = (userId, isBanned) => {
    const action = isBanned ? unbanUser : banUser
    const label = isBanned ? 'Unban' : 'Ban'
    if (!window.confirm(`${label} this user?`)) return
    runRowAction(userId, () => action(userId), () => {
      setBanned((prev) => ({ ...prev, [userId]: !isBanned }))
    })
  }

  const handleDelete = (userId) => {
    if (!window.confirm('Permanently delete this user and all their data? This cannot be undone.')) return
    runRowAction(userId, () => deleteUser(userId), () => {
      setUsers((prev) => prev.filter((u) => u.id !== userId))
    })
  }

  if (loading) {
    return <div className={styles.page}><SkipLink /><p className={styles.loading}>Loading…</p></div>
  }

  if (error) {
    return (
      <div className={styles.page}>
        <SkipLink />
        <p className={styles.errorMsg} role="alert">{error}</p>
        <button className={styles.retryBtn} onClick={load}>Retry</button>
      </div>
    )
  }

  const maxDay = Math.max(1, ...stats.signupsByDay.map((d) => d.count))
  const maxRevenueDay = Math.max(1, ...stats.revenue.byDay.map((d) => d.amount))

  return (
    <main className={styles.page} id="main">
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
        <div className={styles.statCard}>
          <span className={styles.statValue}>{formatCurrency(stats.revenue.total)}</span>
          <span className={styles.statLabel}>Total revenue</span>
        </div>
        <div className={styles.statCard}>
          <span className={styles.statValue}>{formatCurrency(stats.revenue.mrr)}</span>
          <span className={styles.statLabel}>MRR</span>
        </div>
        <div className={styles.statCard}>
          <span className={styles.statValue}>{stats.failedPayments30d}</span>
          <span className={styles.statLabel}>Failed payments (30d)</span>
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

      <section className={styles.chart}>
        <h2 className={styles.chartTitle}>Revenue, last 30 days</h2>
        <div className={styles.bars}>
          {stats.revenue.byDay.map((day) => (
            <div key={day.date} className={styles.barCol} title={`${day.date}: ${formatCurrency(day.amount)}`}>
              <div className={styles.bar} style={{ height: `${(day.amount / maxRevenueDay) * 100}%` }} />
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
              const isBanned = !!banned[u.id]
              return (
                <tr key={u.id}>
                  <td>{u.email}</td>
                  <td>{new Date(u.createdAt).toLocaleDateString()}</td>
                  <td><span className={styles.badge}>{TIER_LABEL[u.tier]}</span></td>
                  <td>{u.status || '—'}</td>
                  <td>{endDate ? new Date(endDate).toLocaleDateString() : '—'}</td>
                  <td>
                    <div className={styles.rowActions}>
                      <Link className={styles.viewLink} to={`/admin/users/${u.id}`}>View</Link>
                      {canCancel && (
                        <button
                          className={styles.cancelBtn}
                          disabled={actioningId === u.id}
                          onClick={() => handleCancel(u.id)}
                        >
                          {actioningId === u.id ? 'Cancelling…' : 'Cancel subscription'}
                        </button>
                      )}
                      <button
                        className={styles.cancelBtn}
                        disabled={actioningId === u.id}
                        onClick={() => handleBanToggle(u.id, isBanned)}
                      >
                        {isBanned ? 'Unban' : 'Ban'}
                      </button>
                      <button
                        className={styles.cancelBtn}
                        disabled={actioningId === u.id}
                        onClick={() => handleDelete(u.id)}
                      >
                        Delete
                      </button>
                    </div>
                    {rowErrors[u.id] && <p className={styles.rowError} role="alert">{rowErrors[u.id]}</p>}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
        {filtered.length === 0 && <p className={styles.empty}>No users match "{query}".</p>}
      </section>

      <section className={styles.tableSection}>
        <h2 className={styles.chartTitle}>Recent transactions</h2>
        {stats.recentPayments.length === 0 && <p className={styles.empty}>No transactions yet.</p>}
        {stats.recentPayments.length > 0 && (
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Date</th>
                <th>Email</th>
                <th>Amount</th>
                <th>Status</th>
                <th>Type</th>
              </tr>
            </thead>
            <tbody>
              {stats.recentPayments.map((p) => (
                <tr key={p.id}>
                  <td>{new Date(p.createdAt).toLocaleDateString()}</td>
                  <td>{p.email}</td>
                  <td>{formatCurrency(p.amount)}</td>
                  <td>{p.status}</td>
                  <td>{p.paymentType}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
    </main>
  )
}
```

This uses `stats.recentPayments` (Task 3's `handleOverview` addition — already includes `email` resolved server-side, so no client-side join is needed here).

Add to `src/pages/AdminPage.module.css`, after `.cancelBtn`'s rules:

```css
.rowActions { display: flex; gap: 6px; flex-wrap: wrap; align-items: center; }
.viewLink {
  color: var(--c-grape);
  font-weight: 700;
  font-size: 12px;
  text-decoration: none;
}
.viewLink:hover { text-decoration: underline; }
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run src/pages/AdminPage.test.jsx`
Expected: PASS

- [ ] **Step 5: Run the full test suite to check for regressions**

Run: `npx vitest run`
Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add src/pages/AdminPage.jsx src/pages/AdminPage.module.css src/pages/AdminPage.test.jsx
git commit -m "feat: add revenue stats, transactions table, and ban/delete actions to AdminPage"
```

---

## Task 6: `AdminUserDetailPage.jsx` — per-user drill-down + route

**Files:**
- Create: `src/pages/AdminUserDetailPage.jsx`
- Create: `src/pages/AdminUserDetailPage.module.css`
- Create: `src/pages/AdminUserDetailPage.test.jsx`
- Modify: `src/App.jsx`

**Interfaces:**
- Consumes: `fetchUserDetail`, `grantPro`, `banUser`, `unbanUser`, `deleteUser` from `adminService.js` (Task 4); route param `:id` from `App.jsx`.
- Produces: nothing consumed by later tasks (final task in this plan).

- [ ] **Step 1: Write the failing tests**

Create `src/pages/AdminUserDetailPage.test.jsx`:

```js
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router-dom'

vi.mock('../services/adminService.js', () => ({
  fetchUserDetail: vi.fn(),
  grantPro: vi.fn(),
  banUser: vi.fn(),
  unbanUser: vi.fn(),
  deleteUser: vi.fn(),
}))

import { fetchUserDetail, grantPro, deleteUser } from '../services/adminService.js'
import AdminUserDetailPage from './AdminUserDetailPage.jsx'

const detail = {
  payments: [
    { id: 'p1', amount: 149, status: 'complete', paymentType: 'recurring', createdAt: '2026-08-01T00:00:00.000Z' },
  ],
  children: [
    { id: 'c1', name: 'Ada', buddyName: 'Buddy', avatarType: 'bear', avatarColor: '#7c3aed' },
  ],
  lessonActivity: [
    { childId: 'c1', childName: 'Ada', completions: 5, avgMastery: 80 },
  ],
}

function renderPage(id = 'u1') {
  return render(
    <MemoryRouter initialEntries={[`/admin/users/${id}`]}>
      <Routes>
        <Route path="/admin/users/:id" element={<AdminUserDetailPage />} />
      </Routes>
    </MemoryRouter>
  )
}

describe('AdminUserDetailPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    window.confirm = vi.fn().mockReturnValue(true)
  })

  it('renders payments, children, and lesson activity once loaded', async () => {
    fetchUserDetail.mockResolvedValue(detail)
    renderPage()
    await waitFor(() => expect(screen.getByText('Ada')).toBeInTheDocument())
    expect(screen.getByText('R149.00')).toBeInTheDocument()
    expect(screen.getByText(/80/)).toBeInTheDocument()
    expect(fetchUserDetail).toHaveBeenCalledWith('u1')
  })

  it('shows an error state with a retry button when loading fails', async () => {
    fetchUserDetail.mockRejectedValue(new Error('boom'))
    renderPage()
    await waitFor(() => expect(screen.getByText('boom')).toBeInTheDocument())
    expect(screen.getByRole('button', { name: /retry/i })).toBeInTheDocument()
  })

  it('grants Pro with the picked end date', async () => {
    fetchUserDetail.mockResolvedValue(detail)
    grantPro.mockResolvedValue({ ok: true })
    renderPage()
    await waitFor(() => expect(screen.getByText('Ada')).toBeInTheDocument())

    const user = userEvent.setup()
    await user.type(screen.getByLabelText(/extend pro until/i), '2026-12-01')
    await user.click(screen.getByRole('button', { name: /grant/i }))

    expect(grantPro).toHaveBeenCalledWith('u1', '2026-12-01')
  })

  it('deletes the user after confirming', async () => {
    fetchUserDetail.mockResolvedValue(detail)
    deleteUser.mockResolvedValue({ ok: true })
    renderPage()
    await waitFor(() => expect(screen.getByText('Ada')).toBeInTheDocument())

    const user = userEvent.setup()
    await user.click(screen.getByRole('button', { name: /^delete/i }))

    expect(window.confirm).toHaveBeenCalled()
    expect(deleteUser).toHaveBeenCalledWith('u1')
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run src/pages/AdminUserDetailPage.test.jsx`
Expected: FAIL — the module doesn't exist yet.

- [ ] **Step 3: Implement the page**

Create `src/pages/AdminUserDetailPage.jsx`:

```jsx
import { useState, useEffect } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { fetchUserDetail, grantPro, banUser, unbanUser, deleteUser } from '../services/adminService.js'
import SkipLink from '../components/SkipLink.jsx'
import styles from './AdminUserDetailPage.module.css'

function formatCurrency(amount) {
  return `R${Number(amount).toFixed(2)}`
}

export default function AdminUserDetailPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [detail, setDetail] = useState(null)
  const [endDate, setEndDate] = useState('')
  const [banned, setBanned] = useState(false)
  const [actionError, setActionError] = useState(null)
  const [actioning, setActioning] = useState(false)

  const load = () => {
    setLoading(true)
    setError(null)
    fetchUserDetail(id)
      .then(setDetail)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false))
  }

  useEffect(() => { load() }, [id])

  const runAction = async (fn, onSuccess) => {
    setActioning(true)
    setActionError(null)
    try {
      await fn()
      onSuccess()
    } catch (err) {
      setActionError(err.message)
    } finally {
      setActioning(false)
    }
  }

  const handleGrant = () => {
    if (!endDate) return
    runAction(() => grantPro(id, endDate), () => {})
  }

  const handleBanToggle = () => {
    const action = banned ? unbanUser : banUser
    if (!window.confirm(`${banned ? 'Unban' : 'Ban'} this user?`)) return
    runAction(() => action(id), () => setBanned((b) => !b))
  }

  const handleDelete = () => {
    if (!window.confirm('Permanently delete this user and all their data? This cannot be undone.')) return
    runAction(() => deleteUser(id), () => navigate('/admin'))
  }

  if (loading) {
    return <div className={styles.page}><SkipLink /><p className={styles.loading}>Loading…</p></div>
  }

  if (error) {
    return (
      <div className={styles.page}>
        <SkipLink />
        <p className={styles.errorMsg} role="alert">{error}</p>
        <button className={styles.retryBtn} onClick={load}>Retry</button>
      </div>
    )
  }

  return (
    <main className={styles.page} id="main">
      <header className={styles.header}>
        <Link className={styles.back} to="/admin">Back to admin</Link>
        <h1 className={styles.title}>User detail</h1>
      </header>

      <section className={styles.card}>
        <h2 className={styles.cardTitle}>Actions</h2>
        <div className={styles.grantRow}>
          <label htmlFor="extend-pro-date">Extend Pro until</label>
          <input
            id="extend-pro-date"
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
          />
          <button disabled={actioning || !endDate} onClick={handleGrant}>Grant</button>
        </div>
        <div className={styles.actionRow}>
          <button disabled={actioning} onClick={handleBanToggle}>{banned ? 'Unban' : 'Ban'}</button>
          <button disabled={actioning} onClick={handleDelete}>Delete user</button>
        </div>
        {actionError && <p className={styles.rowError} role="alert">{actionError}</p>}
      </section>

      <section className={styles.card}>
        <h2 className={styles.cardTitle}>Payment history</h2>
        {detail.payments.length === 0 && <p className={styles.empty}>No payments yet.</p>}
        {detail.payments.length > 0 && (
          <table className={styles.table}>
            <thead>
              <tr><th>Date</th><th>Amount</th><th>Status</th><th>Type</th></tr>
            </thead>
            <tbody>
              {detail.payments.map((p) => (
                <tr key={p.id}>
                  <td>{new Date(p.createdAt).toLocaleDateString()}</td>
                  <td>{formatCurrency(p.amount)}</td>
                  <td>{p.status}</td>
                  <td>{p.paymentType}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>

      <section className={styles.card}>
        <h2 className={styles.cardTitle}>Children</h2>
        {detail.children.length === 0 && <p className={styles.empty}>No children profiles.</p>}
        <ul className={styles.childList}>
          {detail.children.map((c) => (
            <li key={c.id}>{c.name} ({c.buddyName})</li>
          ))}
        </ul>
      </section>

      <section className={styles.card}>
        <h2 className={styles.cardTitle}>Lesson activity</h2>
        {detail.lessonActivity.length === 0 && <p className={styles.empty}>No activity yet.</p>}
        {detail.lessonActivity.length > 0 && (
          <table className={styles.table}>
            <thead>
              <tr><th>Child</th><th>Completions</th><th>Avg mastery</th></tr>
            </thead>
            <tbody>
              {detail.lessonActivity.map((a) => (
                <tr key={a.childId}>
                  <td>{a.childName}</td>
                  <td>{a.completions}</td>
                  <td>{a.avgMastery == null ? '—' : `${a.avgMastery}%`}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
    </main>
  )
}
```

- [ ] **Step 4: Add the CSS module**

Create `src/pages/AdminUserDetailPage.module.css` — reuse the existing token variables (`--bg-gradient`, `--ink`, `--font-body`, `--c-grape`, `--r-lg`, `--r-pill`, `--shadow-card`) already used by `AdminPage.module.css`:

```css
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
  gap: 16px;
  max-width: 900px;
  margin: 0 auto 20px;
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
  text-decoration: none;
}

.card {
  max-width: 900px;
  margin: 0 auto 20px;
  background: #fff;
  border-radius: var(--r-lg);
  box-shadow: var(--shadow-card);
  padding: 18px 22px;
}

.cardTitle { font-size: 14px; font-weight: 700; margin: 0 0 12px; }

.grantRow { display: flex; align-items: center; gap: 10px; margin-bottom: 12px; flex-wrap: wrap; }
.actionRow { display: flex; gap: 10px; }

.table { width: 100%; border-collapse: collapse; font-size: 13px; }
.table th { text-align: left; padding: 8px 10px; font-size: 11px; text-transform: uppercase; opacity: 0.5; border-bottom: 1px solid rgba(0,0,0,0.08); }
.table td { padding: 10px; border-bottom: 1px solid rgba(0,0,0,0.05); }

.childList { list-style: none; margin: 0; padding: 0; font-size: 14px; }
.childList li { padding: 6px 0; border-bottom: 1px solid rgba(0,0,0,0.05); }

.rowError { color: #b91c1c; font-size: 12px; margin: 8px 0 0; }
.empty { opacity: 0.6; font-size: 14px; }
.loading, .errorMsg { max-width: 900px; margin: 60px auto; text-align: center; }
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

- [ ] **Step 5: Wire the route in `App.jsx`**

In `src/App.jsx`, add the lazy import after `AdminPage`'s:

```js
const AdminUserDetailPage = lazy(() => import('./pages/AdminUserDetailPage.jsx'))
```

Add the route right after the existing `/admin` route (line 80):

```jsx
<Route path="/admin/users/:id" element={session?.user?.email === ADMIN_EMAIL ? <AdminUserDetailPage /> : <Navigate to={session ? '/app' : '/'} replace />} />
```

- [ ] **Step 6: Run tests to verify they pass**

Run: `npx vitest run src/pages/AdminUserDetailPage.test.jsx`
Expected: PASS

- [ ] **Step 7: Run the full test suite to check for regressions**

Run: `npx vitest run`
Expected: PASS

- [ ] **Step 8: Commit**

```bash
git add src/pages/AdminUserDetailPage.jsx src/pages/AdminUserDetailPage.module.css src/pages/AdminUserDetailPage.test.jsx src/App.jsx
git commit -m "feat: add per-user admin detail page with grant/ban/delete actions"
```

---

## Task 7: Manual verification in dev

**Files:** none (verification only)

- [ ] **Step 1: Start the dev server**

Run: `npm run dev`

- [ ] **Step 2: Sign in as the admin email and visit `/admin`**

Confirm: revenue stat cards render (will show R0.00/0 with no real payment data locally — that's expected), the two bar charts render without erroring, the transactions table renders, and each user row shows View/Cancel/Ban/Delete controls without console errors.

- [ ] **Step 3: Click "View" on a user row**

Confirm: `/admin/users/:id` loads, shows the Actions card, an empty (or populated, if that user has data) payments/children/lesson-activity set, and the Back-to-admin link returns to `/admin`.

- [ ] **Step 4: Exercise one non-destructive action end-to-end against a real test user**

Pick a throwaway/test account (not a real user). From the detail page, set an "Extend Pro until" date and click Grant; confirm no error, then reload `/admin` and check that user's row now shows `pro` tier with the chosen end date.

- [ ] **Step 5: Report findings**

If anything in steps 2-4 doesn't match, note the exact console error or visual mismatch before proceeding — do not mark this task done on a hunch.
