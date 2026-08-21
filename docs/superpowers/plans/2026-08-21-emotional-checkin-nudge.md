# Emotional Check-In Nudge Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** A free-tier, dashboard-only "Buddy noticed your child seemed a little sad today — want to check in?" nudge for parents, detected from the child's own chat turns without adding a new server-side surveillance pipeline.

**Architecture:** Client-side keyword pre-filter decides whether a chat turn is worth an LLM confirmation call; that call reuses the existing `api/chat.js` Groq proxy under a new `mode: 'classify-checkin'` value (no new serverless function — see Global Constraints); a confirmed signal is upserted into a new `daily_signals` Supabase table (client-writable, RLS-scoped to the owning parent account) keyed one-per-child-per-day; the Parent Dashboard reads today's row and shows a dismissible banner via a new small presentational component.

**Tech Stack:** React 18 (hooks, no new deps), Supabase Postgres + RLS, Vercel serverless function (`api/chat.js`, extended not created), Groq LLM (existing `GROQ_API_KEY`/model list), Vitest + @testing-library/react.

**Spec:** [docs/superpowers/specs/2026-08-21-emotional-checkin-nudge-design.md](../specs/2026-08-21-emotional-checkin-nudge-design.md)

## Global Constraints

- No new files under `api/` (excluding `_`-prefixed helpers) — this repo is at Vercel's Hobby-plan 12-serverless-function cap. New behavior goes into `api/chat.js` as a new `mode` value, not a new route.
- The feature is **free-tier**, not Pro-gated: `'classify-checkin'` must be added to `FREE_MODES` in `api/_auth.js`.
- Classify-checkin calls must **never** consume the free-tier `chat-free-1d` daily message quota (10/day) — it gets its own independent rate-limit bucket.
- `daily_signals` rows are client-owned via `auth.uid() = user_id` RLS (same pattern as `children`), not service-role-only (unlike `subscriptions`).
- `child_id` on `daily_signals` comes from the client's `getActiveChildId()` at classification time — the existing `history` table has no `child_id` column to join through (a pre-existing gap, out of scope to fix here).
- Any failure anywhere in the detection pipeline (keyword check, Supabase read, Groq call, JSON parse, upsert) must fail silently — no error surfaced to the child or parent, no row written, no nudge shown.

---

## Task 1: `daily_signals` migration

**Files:**
- Create: `supabase/migrations/2026-08-21-create-daily-signals.sql`

**Interfaces:**
- Produces: table `public.daily_signals(id, user_id, child_id, signal_date, blurb, dismissed, created_at)`, unique on `(user_id, child_id, signal_date)`, consumed by Task 3's `signalsService.js`.

- [ ] **Step 1: Write the migration file**

```sql
-- Emotional check-in nudge: one soft, dismissible parent-facing signal per
-- child per day. Client-owned (auth.uid() = user_id), same RLS shape as
-- `children` — no fraud/entitlement sensitivity here, unlike subscriptions.
-- Run in the Supabase SQL editor.

create table public.daily_signals (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references auth.users(id) on delete cascade,
  child_id     uuid references public.children(id) on delete cascade,
  signal_date  date not null default current_date,
  blurb        text not null,
  dismissed    boolean not null default false,
  created_at   timestamptz not null default now(),
  unique (user_id, child_id, signal_date)
);

alter table public.daily_signals enable row level security;

create policy "daily_signals_select_own" on public.daily_signals
  for select using (auth.uid() = user_id);
create policy "daily_signals_insert_own" on public.daily_signals
  for insert with check (auth.uid() = user_id);
create policy "daily_signals_update_own" on public.daily_signals
  for update using (auth.uid() = user_id);

create index daily_signals_user_date_idx
  on public.daily_signals (user_id, signal_date desc);
```

- [ ] **Step 2: Verify the SQL is well-formed**

Run: `cat supabase/migrations/2026-08-21-create-daily-signals.sql | grep -c ';'`
Expected: `6` (one per statement: create table, alter table, 3 create policy, create index — count confirms nothing was truncated mid-statement).

This migration is **not** applied automatically — like every other migration in `supabase/migrations/`, it's run manually against the live project via the Supabase SQL editor. Note this for the user at the end of this task; do not attempt to apply it via any automated tool against the live `dubz-buddy` project.

- [ ] **Step 3: Commit**

```bash
git add supabase/migrations/2026-08-21-create-daily-signals.sql
git commit -m "feat: add daily_signals table for the emotional check-in nudge"
```

---

## Task 2: Keyword pre-filter + classify prompt (`emotionalSignal.js`)

**Files:**
- Create: `src/utils/emotionalSignal.js`
- Test: `src/utils/emotionalSignal.test.js`

**Interfaces:**
- Produces: `hasConcernSignal(text: string): boolean`, `buildClassifyPrompt(childName: string): string`. Consumed by Task 5's `maybeFlagEmotionalSignal` in `useChat.js`.

- [ ] **Step 1: Write the failing test**

```js
// src/utils/emotionalSignal.test.js
import { describe, it, expect } from 'vitest'
import { hasConcernSignal, buildClassifyPrompt } from './emotionalSignal.js'

describe('hasConcernSignal', () => {
  it('returns false for ordinary chatter', () => {
    expect(hasConcernSignal('I love dinosaurs so much!')).toBe(false)
  })

  it('returns true when a concern word is present', () => {
    expect(hasConcernSignal('I feel really sad today')).toBe(true)
  })

  it('matches case-insensitively', () => {
    expect(hasConcernSignal('I am SO Scared of the dark')).toBe(true)
  })

  it('does not match a concern word as a substring of another word', () => {
    expect(hasConcernSignal('I made a sandcastle')).toBe(false)
  })

  it('returns false for empty, null, or undefined input', () => {
    expect(hasConcernSignal('')).toBe(false)
    expect(hasConcernSignal(null)).toBe(false)
    expect(hasConcernSignal(undefined)).toBe(false)
  })
})

describe('buildClassifyPrompt', () => {
  it('includes the child name and asks for strict JSON with concern/blurb keys', () => {
    const prompt = buildClassifyPrompt('Mia')
    expect(prompt).toContain('Mia')
    expect(prompt).toContain('"concern"')
    expect(prompt).toContain('"blurb"')
  })

  it('falls back to a generic phrase when no name is given', () => {
    expect(buildClassifyPrompt(undefined)).toContain('a child')
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/utils/emotionalSignal.test.js`
Expected: FAIL — `emotionalSignal.js` doesn't exist yet.

- [ ] **Step 3: Write the implementation**

```js
// src/utils/emotionalSignal.js

// Cheap client-side pre-filter, checked before any Groq call — most turns
// have nothing to flag, so this keeps classification calls rare rather than
// running an LLM check on every single message. False positives here are
// fine (the LLM confirmation step below is the real gate); false negatives
// just mean a later message catches it.
const CONCERN_WORDS = new Set([
  'sad', 'scared', 'afraid', 'cry', 'crying', 'lonely', 'alone', 'hurt',
  'bully', 'bullied', 'hate', 'nightmare', 'worried', 'angry', 'mad',
  'hit', 'hitting', 'yell', 'yelled', 'yelling', 'nobody', 'die', 'dying',
  'scary', 'terrified', 'ashamed', 'hopeless', 'unsafe',
])

export function hasConcernSignal(text) {
  const words = (text || '').toLowerCase().match(/[a-z']+/g) || []
  return words.some((w) => CONCERN_WORDS.has(w))
}

// System prompt for the confirmation call — asks for strict JSON so the
// caller can parse defensively (a parse failure is treated as "no
// concern", never as an error surfaced to the child).
export function buildClassifyPrompt(childName) {
  const name = childName || 'a child'
  return `You are a safety classifier reviewing one message from ${name} to their AI companion app. Decide if this message suggests something a caring parent would want a gentle heads-up about (sadness, fear, being bullied, feeling alone, etc.) — not routine kid chatter, jokes, or normal ups and downs.
Respond with ONLY strict JSON, no other text: {"concern": true or false, "blurb": "..."}
If concern is true, "blurb" is a short (under 120 characters), warm, non-alarming, parent-facing sentence, for example: "Buddy noticed ${name} seemed a little sad while chatting today." Never quote the child's exact words in the blurb. If concern is false, "blurb" must be an empty string.`
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/utils/emotionalSignal.test.js`
Expected: PASS, 7 tests.

- [ ] **Step 5: Commit**

```bash
git add src/utils/emotionalSignal.js src/utils/emotionalSignal.test.js
git commit -m "feat: add keyword pre-filter and classify prompt for emotional check-in"
```

---

## Task 3: `signalsService.js`

**Files:**
- Create: `src/services/signalsService.js`
- Test: `src/services/signalsService.test.js`

**Interfaces:**
- Consumes: `supabase` client from `../lib/supabase.js` (`.auth.getUser()`, `.from(table).select/eq/maybeSingle/update/upsert` — Supabase's query builder is itself thenable, no separate terminal call needed after the last `.eq()`).
- Produces: `fetchTodaySignal(childId: string): Promise<object|null>`, `upsertSignal({ childId: string, blurb: string }): Promise<void>`, `dismissSignal(id: string): Promise<void>`. Consumed by Task 5 (`upsertSignal`) and Task 7 (`fetchTodaySignal`, `dismissSignal`).

**Note:** No existing service test in this codebase mocks Supabase's chained query builder (`.from().select().eq()...`) — `adminService.test.js` mocks `fetch` instead, and `AccountTab.test.jsx` only mocks `auth.getSession`. This task introduces a small reusable chainable-mock helper for that; it's new test infrastructure for this codebase, not an existing pattern being followed.

- [ ] **Step 1: Write the failing test**

```js
// src/services/signalsService.test.js
import { describe, it, expect, vi, beforeEach } from 'vitest'

// Supabase's query builder methods each return the same thenable object,
// so a chain like .select().eq().eq().maybeSingle() and a bare
// .update().eq() (no explicit terminal call — the builder itself is
// awaitable) both resolve through this one mock.
function makeBuilder(result) {
  const builder = {
    select: vi.fn(() => builder),
    eq: vi.fn(() => builder),
    update: vi.fn(() => builder),
    upsert: vi.fn(() => Promise.resolve(result)),
    maybeSingle: vi.fn(() => Promise.resolve(result)),
    then: (resolve) => resolve(result),
  }
  return builder
}

const mocks = vi.hoisted(() => ({
  getUser: vi.fn(),
  from: vi.fn(),
}))
vi.mock('../lib/supabase.js', () => ({
  supabase: { auth: { getUser: mocks.getUser }, from: mocks.from },
}))

import { fetchTodaySignal, upsertSignal, dismissSignal } from './signalsService.js'

describe('signalsService', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.getUser.mockResolvedValue({ data: { user: { id: 'u1' } } })
  })

  it('fetchTodaySignal returns null when signed out', async () => {
    mocks.getUser.mockResolvedValue({ data: { user: null } })
    const result = await fetchTodaySignal('c1')
    expect(result).toBeNull()
    expect(mocks.from).not.toHaveBeenCalled()
  })

  it('fetchTodaySignal returns the row from maybeSingle', async () => {
    const builder = makeBuilder({ data: { id: 's1', blurb: 'hi' }, error: null })
    mocks.from.mockReturnValue(builder)
    const result = await fetchTodaySignal('c1')
    expect(result).toEqual({ id: 's1', blurb: 'hi' })
    expect(mocks.from).toHaveBeenCalledWith('daily_signals')
  })

  it('fetchTodaySignal throws on a Supabase error', async () => {
    const builder = makeBuilder({ data: null, error: new Error('boom') })
    mocks.from.mockReturnValue(builder)
    await expect(fetchTodaySignal('c1')).rejects.toThrow('boom')
  })

  it('upsertSignal upserts with the current user and child id', async () => {
    const builder = makeBuilder({ error: null })
    mocks.from.mockReturnValue(builder)
    await upsertSignal({ childId: 'c1', blurb: 'Buddy noticed...' })
    expect(builder.upsert).toHaveBeenCalledWith(
      expect.objectContaining({ user_id: 'u1', child_id: 'c1', blurb: 'Buddy noticed...', dismissed: false }),
      expect.objectContaining({ onConflict: 'user_id,child_id,signal_date' })
    )
  })

  it('upsertSignal is a no-op when signed out', async () => {
    mocks.getUser.mockResolvedValue({ data: { user: null } })
    await upsertSignal({ childId: 'c1', blurb: 'x' })
    expect(mocks.from).not.toHaveBeenCalled()
  })

  it('dismissSignal updates dismissed=true for the given id', async () => {
    const builder = makeBuilder({ error: null })
    mocks.from.mockReturnValue(builder)
    await dismissSignal('s1')
    expect(builder.update).toHaveBeenCalledWith({ dismissed: true })
    expect(builder.eq).toHaveBeenCalledWith('id', 's1')
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/services/signalsService.test.js`
Expected: FAIL — `signalsService.js` doesn't exist yet.

- [ ] **Step 3: Write the implementation**

```js
// src/services/signalsService.js
import { supabase } from '../lib/supabase.js'

function todayISO() {
  return new Date().toISOString().slice(0, 10)
}

export async function fetchTodaySignal(childId) {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null
  const { data, error } = await supabase
    .from('daily_signals')
    .select('*')
    .eq('user_id', user.id)
    .eq('child_id', childId)
    .eq('signal_date', todayISO())
    .eq('dismissed', false)
    .maybeSingle()
  if (error) throw error
  return data
}

export async function upsertSignal({ childId, blurb }) {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return
  const { error } = await supabase
    .from('daily_signals')
    .upsert(
      { user_id: user.id, child_id: childId, signal_date: todayISO(), blurb, dismissed: false },
      { onConflict: 'user_id,child_id,signal_date' }
    )
  if (error) throw error
}

export async function dismissSignal(id) {
  const { error } = await supabase.from('daily_signals').update({ dismissed: true }).eq('id', id)
  if (error) throw error
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/services/signalsService.test.js`
Expected: PASS, 6 tests.

- [ ] **Step 5: Commit**

```bash
git add src/services/signalsService.js src/services/signalsService.test.js
git commit -m "feat: add signalsService for reading/writing daily emotional signals"
```

---

## Task 4: `api/chat.js` classify-checkin mode

**Files:**
- Modify: `api/_auth.js:7`
- Modify: `api/chat.js:1-9`, `api/chat.js:42-51` (free-tier gating block)
- Test: `api/chat.test.js` (new — no test file exists for this endpoint today, so this also locks in existing behavior)

**Interfaces:**
- Consumes: nothing new from earlier tasks (this task is server-side, independent of Tasks 1-3).
- Produces: `POST /api/chat` accepts `mode: 'classify-checkin'` as free-tier, rate-limited independently of `chat-free-1d` via a new `classify-1d` bucket. Consumed by Task 5's client-side call.

- [ ] **Step 1: Write the failing test**

```js
// api/chat.test.js
import { describe, it, expect, vi, beforeEach } from 'vitest'

const mocks = vi.hoisted(() => ({
  getUser: vi.fn(),
  isProMode: vi.fn(),
  isEntitled: vi.fn(),
  allowRequest: vi.fn(),
}))
vi.mock('./_auth.js', () => mocks)

import handler from './chat.js'

function mockRes() {
  const res = { statusCode: 0, body: null }
  res.status = (c) => { res.statusCode = c; return res }
  res.json = (b) => { res.body = b; return res }
  return res
}

function req(body) {
  return { method: 'POST', headers: {}, body }
}

const okMessages = [{ role: 'user', content: 'hi' }]

describe('api/chat classify-checkin mode', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.getUser.mockResolvedValue({ id: 'u1' })
    mocks.isEntitled.mockResolvedValue(false)
    mocks.allowRequest.mockResolvedValue(true)
    process.env.GROQ_API_KEY = 'test-key'
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ choices: [{ message: { content: '{"concern":false,"blurb":""}' } }] }),
    })
  })

  it('is not Pro-gated: isProMode is consulted but classify-checkin must not itself require entitlement', async () => {
    mocks.isProMode.mockReturnValue(false) // real _auth.js: 'classify-checkin' is added to FREE_MODES
    const res = mockRes()
    await handler(req({ messages: okMessages, mode: 'classify-checkin' }), res)
    expect(res.statusCode).toBe(200)
  })

  it('does not consume the chat-free-1d bucket for a free user', async () => {
    mocks.isProMode.mockReturnValue(false)
    await handler(req({ messages: okMessages, mode: 'classify-checkin' }), mockRes())
    const calledBuckets = mocks.allowRequest.mock.calls.map((c) => c[1])
    expect(calledBuckets).not.toContain('chat-free-1d')
  })

  it('checks its own classify-1d bucket', async () => {
    mocks.isProMode.mockReturnValue(false)
    await handler(req({ messages: okMessages, mode: 'classify-checkin' }), mockRes())
    expect(mocks.allowRequest).toHaveBeenCalledWith('u1', 'classify-1d', expect.any(Number), 86400)
  })

  it('returns 429 once the classify-1d cap is exceeded', async () => {
    mocks.isProMode.mockReturnValue(false)
    mocks.allowRequest.mockResolvedValue(false)
    const res = mockRes()
    await handler(req({ messages: okMessages, mode: 'classify-checkin' }), res)
    expect(res.statusCode).toBe(429)
  })

  it('a normal chat-mode call still consumes chat-free-1d for a free user, unaffected by the new branch', async () => {
    mocks.isProMode.mockReturnValue(false)
    await handler(req({ messages: okMessages, mode: 'chat' }), mockRes())
    const calledBuckets = mocks.allowRequest.mock.calls.map((c) => c[1])
    expect(calledBuckets).toContain('chat-free-1d')
    expect(calledBuckets).not.toContain('classify-1d')
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run api/chat.test.js`
Expected: FAIL — the `classify-1d` branch doesn't exist yet, so the free user's `classify-checkin` call hits the `chat-free-1d` branch instead (`calledBuckets` contains `'chat-free-1d'`, not `'classify-1d'`).

- [ ] **Step 3: Modify `api/_auth.js`**

In `api/_auth.js:7`, change:

```js
const FREE_MODES = new Set(['chat', 'sing'])
```

to:

```js
const FREE_MODES = new Set(['chat', 'sing', 'classify-checkin'])
```

- [ ] **Step 4: Modify `api/chat.js`**

Add a constant near the top (`api/chat.js:8`, right after `FREE_CHAT_LIMIT_PER_DAY`):

```js
const FREE_CHAT_LIMIT_PER_DAY = 10 // matches the "Chat with Buddy (10/day)" free-plan claim on the pricing page
const CLASSIFY_LIMIT_PER_DAY = 20 // cost-guard against a runaway client bug, not a real usage cap — the client only calls this on a keyword hit with no existing row for today
```

Replace the free-tier gating block (`api/chat.js:42-51`):

```js
  // Free-tier daily message cap — the one thing that's supposed to make
  // free chat/story/sing "10/day" rather than unlimited.
  if (!entitled) {
    const withinFreeLimit = await allowRequest(user.id, 'chat-free-1d', FREE_CHAT_LIMIT_PER_DAY, 86400)
    if (!withinFreeLimit) {
      return res.status(403).json({ error: { message: "You've used today's free chats with Buddy.", code: 'FREE_LIMIT_REACHED' } })
    }
  }
```

with:

```js
  if (mode === 'classify-checkin') {
    // Background safety-signal check, not user-facing chat — its own small
    // cap, never the free-tier chat quota below.
    const withinClassifyLimit = await allowRequest(user.id, 'classify-1d', CLASSIFY_LIMIT_PER_DAY, 86400)
    if (!withinClassifyLimit) {
      return res.status(429).json({ error: { message: 'Too many requests — take a short break.' } })
    }
  } else if (!entitled) {
    // Free-tier daily message cap — the one thing that's supposed to make
    // free chat/story/sing "10/day" rather than unlimited.
    const withinFreeLimit = await allowRequest(user.id, 'chat-free-1d', FREE_CHAT_LIMIT_PER_DAY, 86400)
    if (!withinFreeLimit) {
      return res.status(403).json({ error: { message: "You've used today's free chats with Buddy.", code: 'FREE_LIMIT_REACHED' } })
    }
  }
```

- [ ] **Step 5: Run test to verify it passes**

Run: `npx vitest run api/chat.test.js`
Expected: PASS, 5 tests.

- [ ] **Step 6: Run the full test suite to check for regressions**

Run: `npx vitest run`
Expected: PASS, all suites (this touches shared gating logic in `api/chat.js` used by every mode).

- [ ] **Step 7: Commit**

```bash
git add api/_auth.js api/chat.js api/chat.test.js
git commit -m "feat: add free-tier classify-checkin mode to api/chat.js"
```

---

## Task 5: Wire detection into `useChat.js`

**Files:**
- Modify: `src/hooks/useChat.js` (add new export near `formatLessonsMemory`/`selectModePrompt`; call from `sendMessage` around `useChat.js:144`)
- Modify: `src/hooks/useChat.test.js` (extend)

**Interfaces:**
- Consumes: `hasConcernSignal`, `buildClassifyPrompt` from `../utils/emotionalSignal.js` (Task 2); `fetchTodaySignal`, `upsertSignal` from `../services/signalsService.js` (Task 3); `chatCompletion` from `../services/chatService.js` (existing); `getActiveChildId` from `../utils/storage.js` (existing).
- Produces: exported `maybeFlagEmotionalSignal(userText: string, childName: string): Promise<void>` — directly testable without rendering the hook, same reason `formatHistoryMemory`/`formatLessonsMemory` are already factored out this way (see the comment at the top of `useChat.js`). Called fire-and-forget from `sendMessage`.

- [ ] **Step 1: Write the failing test**

```js
// Add to src/hooks/useChat.test.js — new imports and a new describe block.
// The existing top-of-file imports become:
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { formatHistoryMemory, formatLessonsMemory, selectModePrompt, maybeFlagEmotionalSignal } from './useChat.js'
import { PROMPTS } from '../utils/prompts.js'

const mocks = vi.hoisted(() => ({
  fetchTodaySignal: vi.fn(),
  upsertSignal: vi.fn(),
  chatCompletion: vi.fn(),
  getActiveChildId: vi.fn(),
}))
vi.mock('../services/signalsService.js', () => ({
  fetchTodaySignal: mocks.fetchTodaySignal,
  upsertSignal: mocks.upsertSignal,
}))
vi.mock('../services/chatService.js', () => ({
  chatCompletion: mocks.chatCompletion,
}))
vi.mock('../utils/storage.js', async (importOriginal) => ({
  ...(await importOriginal()),
  getActiveChildId: mocks.getActiveChildId,
}))

// ... existing formatHistoryMemory/formatLessonsMemory/selectModePrompt describes stay unchanged ...

describe('maybeFlagEmotionalSignal', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.getActiveChildId.mockReturnValue('c1')
  })

  it('does nothing when the text has no concern keyword', async () => {
    await maybeFlagEmotionalSignal('I love dinosaurs', 'Mia')
    expect(mocks.fetchTodaySignal).not.toHaveBeenCalled()
    expect(mocks.chatCompletion).not.toHaveBeenCalled()
  })

  it('skips classification when a signal already exists for today', async () => {
    mocks.fetchTodaySignal.mockResolvedValue({ id: 's1' })
    await maybeFlagEmotionalSignal('I feel so sad', 'Mia')
    expect(mocks.chatCompletion).not.toHaveBeenCalled()
  })

  it('calls chatCompletion with classify-checkin mode and upserts on a confirmed concern', async () => {
    mocks.fetchTodaySignal.mockResolvedValue(null)
    mocks.chatCompletion.mockResolvedValue('{"concern":true,"blurb":"Buddy noticed Mia seemed sad today."}')
    await maybeFlagEmotionalSignal('I feel so sad', 'Mia')
    expect(mocks.chatCompletion).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ mode: 'classify-checkin' })
    )
    expect(mocks.upsertSignal).toHaveBeenCalledWith({ childId: 'c1', blurb: 'Buddy noticed Mia seemed sad today.' })
  })

  it('does not upsert when the classifier returns concern:false', async () => {
    mocks.fetchTodaySignal.mockResolvedValue(null)
    mocks.chatCompletion.mockResolvedValue('{"concern":false,"blurb":""}')
    await maybeFlagEmotionalSignal('I feel so sad', 'Mia')
    expect(mocks.upsertSignal).not.toHaveBeenCalled()
  })

  it('never throws — a malformed classifier response is swallowed', async () => {
    mocks.fetchTodaySignal.mockResolvedValue(null)
    mocks.chatCompletion.mockResolvedValue('not json at all')
    await expect(maybeFlagEmotionalSignal('I feel so sad', 'Mia')).resolves.toBeUndefined()
    expect(mocks.upsertSignal).not.toHaveBeenCalled()
  })

  it('never throws when chatCompletion itself rejects', async () => {
    mocks.fetchTodaySignal.mockResolvedValue(null)
    mocks.chatCompletion.mockRejectedValue(new Error('network down'))
    await expect(maybeFlagEmotionalSignal('I feel so sad', 'Mia')).resolves.toBeUndefined()
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/hooks/useChat.test.js`
Expected: FAIL — `maybeFlagEmotionalSignal` is not exported from `useChat.js` yet.

- [ ] **Step 3: Write the implementation**

Add these two new imports near the top of `src/hooks/useChat.js`, alongside the existing ones (`chatCompletion` and `getActiveChildId` are already imported there — don't duplicate them):

```js
import { hasConcernSignal, buildClassifyPrompt } from '../utils/emotionalSignal.js'
import { fetchTodaySignal, upsertSignal } from '../services/signalsService.js'
```

Add the new exported function near `formatLessonsMemory`/`selectModePrompt` (same "factored out for direct testability" section):

```js
// Fire-and-forget from sendMessage, after the turn is already stored via
// addHistory. Every branch below short-circuits silently — this must never
// throw into sendMessage's own try/catch, and never delay or block the
// child's chat turn. See docs/superpowers/specs/2026-08-21-emotional-checkin-nudge-design.md.
export async function maybeFlagEmotionalSignal(userText, childName) {
  try {
    if (!hasConcernSignal(userText)) return
    const childId = getActiveChildId()
    const existing = await fetchTodaySignal(childId)
    if (existing) return

    const raw = await chatCompletion(
      [
        { role: 'system', content: buildClassifyPrompt(childName) },
        { role: 'user', content: userText },
      ],
      { mode: 'classify-checkin', maxTokens: 100, temperature: 0 }
    )

    let parsed
    try {
      parsed = JSON.parse(raw)
    } catch {
      return
    }
    if (!parsed?.concern || !parsed.blurb) return

    await upsertSignal({ childId, blurb: parsed.blurb })
  } catch {
    // Silent by default — a background safety-signal check failing must
    // never surface an error to the child or block their conversation.
  }
}
```

In `sendMessage`, right after the existing `addHistory({...})` call (`useChat.js:144-149`), add:

```js
      addHistory({
        ts: Date.now(),
        mode: currentM,
        userText,
        buddyText: reply,
      })

      maybeFlagEmotionalSignal(userText, settings?.childName || 'there').catch(() => {})
```

`settings?.childName || 'there'` matches the exact fallback pattern already used at `useChat.js:68`, `useChat.js:98`, and `useChat.js:114` for this same value — kept consistent rather than introducing a second, differently-defaulted source for the child's name.

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/hooks/useChat.test.js`
Expected: PASS, all tests (existing `formatHistoryMemory`/`formatLessonsMemory`/`selectModePrompt` tests plus the 6 new `maybeFlagEmotionalSignal` tests).

- [ ] **Step 5: Commit**

```bash
git add src/hooks/useChat.js src/hooks/useChat.test.js
git commit -m "feat: detect and record emotional check-in signals from chat turns"
```

---

## Task 6: `SignalBanner` component

**Files:**
- Create: `src/components/SignalBanner.jsx`
- Create: `src/components/SignalBanner.module.css`
- Test: `src/components/SignalBanner.test.jsx`

**Interfaces:**
- Consumes: props `{ signal: { blurb: string } | null, onReview: () => void, onDismiss: () => void }`.
- Produces: a presentational component rendering nothing when `signal` is falsy. Consumed by Task 7's `ParentPage.jsx`.

This is extracted as its own component (spec's illustrative JSX showed it inline in `ParentPage.jsx`) so it's independently testable — `ParentPage.jsx` has no existing test file today, and building one from scratch (mocking `useSubscription`, `supabase`, and all 8 tab components) is disproportionate scope for one banner. This follows the same "shared/focused UI gets its own component + test" convention already used for `childScreens/*` and `parentTabs/*`.

- [ ] **Step 1: Write the failing test**

```jsx
// src/components/SignalBanner.test.jsx
import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import SignalBanner from './SignalBanner.jsx'

describe('SignalBanner', () => {
  it('renders nothing when signal is null', () => {
    const { container } = render(<SignalBanner signal={null} onReview={vi.fn()} onDismiss={vi.fn()} />)
    expect(container).toBeEmptyDOMElement()
  })

  it('renders the blurb when a signal is present', () => {
    render(<SignalBanner signal={{ blurb: 'Buddy noticed Mia seemed a little sad today.' }} onReview={vi.fn()} onDismiss={vi.fn()} />)
    expect(screen.getByText(/Buddy noticed Mia seemed a little sad today\./)).toBeInTheDocument()
  })

  it('calls onReview when the review button is clicked', () => {
    const onReview = vi.fn()
    render(<SignalBanner signal={{ blurb: 'x' }} onReview={onReview} onDismiss={vi.fn()} />)
    fireEvent.click(screen.getByText(/review/i))
    expect(onReview).toHaveBeenCalledTimes(1)
  })

  it('calls onDismiss when the dismiss button is clicked', () => {
    const onDismiss = vi.fn()
    render(<SignalBanner signal={{ blurb: 'x' }} onReview={vi.fn()} onDismiss={onDismiss} />)
    fireEvent.click(screen.getByLabelText(/dismiss/i))
    expect(onDismiss).toHaveBeenCalledTimes(1)
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/components/SignalBanner.test.jsx`
Expected: FAIL — `SignalBanner.jsx` doesn't exist yet.

- [ ] **Step 3: Write the implementation**

```jsx
// src/components/SignalBanner.jsx
import styles from './SignalBanner.module.css'

// Soft, non-alarming — deliberately not styled like the trial-ending
// banner (no red, no exclamation framing), matching PRODUCT.md's copy
// guidance against "monitoring"/"surveillance" language.
export default function SignalBanner({ signal, onReview, onDismiss }) {
  if (!signal) return null
  return (
    <div className={styles.banner}>
      <span>{signal.blurb} Want to check in?</span>
      <button className={styles.reviewBtn} onClick={onReview}>Review chats</button>
      <button className={styles.dismissBtn} onClick={onDismiss} aria-label="Dismiss">✕</button>
    </div>
  )
}
```

```css
/* src/components/SignalBanner.module.css */
.banner {
  display: flex;
  align-items: center;
  gap: 12px;
  flex-wrap: wrap;
  padding: 10px 16px;
  font-size: 13px;
  font-weight: 600;
  flex-shrink: 0;
  background: rgba(77,173,247,0.12);
  color: var(--ink);
  border-bottom: 1px solid rgba(77,173,247,0.2);
}

.reviewBtn {
  min-height: 44px;
  border: none;
  border-radius: 999px;
  padding: 5px 14px;
  font-size: 12px;
  font-weight: 700;
  color: #fff;
  background: var(--c-sky);
  cursor: pointer;
  flex-shrink: 0;
}

.dismissBtn {
  border: none;
  background: transparent;
  color: var(--ink);
  opacity: 0.6;
  cursor: pointer;
  font-size: 14px;
  flex-shrink: 0;
  margin-left: auto;
}

.dismissBtn:hover {
  opacity: 1;
}
```

Uses `--ink` and `--c-sky` (both real global tokens defined in `src/index.css`), and matches `ParentPage.module.css`'s `.trialBanner`/`.trialBannerBtn` structure/sizing exactly — same flex layout, padding, font sizing, 44px min-height on the action button — but with a sky-blue tint instead of the trial banner's purple, so it reads as its own distinct, calmer surface rather than a visual variant of the urgency-toned trial banner.

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/components/SignalBanner.test.jsx`
Expected: PASS, 4 tests.

- [ ] **Step 5: Commit**

```bash
git add src/components/SignalBanner.jsx src/components/SignalBanner.module.css src/components/SignalBanner.test.jsx
git commit -m "feat: add SignalBanner component for the emotional check-in nudge"
```

---

## Task 7: Wire `SignalBanner` into `ParentPage.jsx`

**Files:**
- Modify: `src/pages/ParentPage.jsx`

**Interfaces:**
- Consumes: `SignalBanner` (Task 6); `fetchTodaySignal`, `dismissSignal` from `../services/signalsService.js` (Task 3); `getActiveChildId` from `../utils/storage.js` (existing).

`ParentPage.jsx` has no existing test file, and this task is thin integration glue (fetch on mount, render, one dismiss handler) around already-tested pieces (`SignalBanner`'s rendering/click behavior in Task 6, `fetchTodaySignal`/`dismissSignal`'s Supabase behavior in Task 3). Building a full `ParentPage.test.jsx` harness from scratch (mocking `useSubscription`, `supabase`, `ChildrenManager`, and all 8 tab components) is disproportionate scope for this task. Verification here is: the full existing test suite still passes (no regression), plus a live browser check per Step 4 below — matching this repo's established bar for changes that need a real Supabase-authenticated session (dev-preview routes use a fake session, so this can't be checked there; see the 2026-08-17 architecture review's Candidate A/D notes on the same limitation).

- [ ] **Step 1: Add imports and state**

Add to the import block at the top of `src/pages/ParentPage.jsx`:

```js
import SignalBanner from '../components/SignalBanner.jsx'
import { fetchTodaySignal, dismissSignal } from '../services/signalsService.js'
import { getActiveChildId } from '../utils/storage.js'
```

(`ParentPage.jsx` currently imports `getSettings`, `saveSettings`, `migratePinIfNeeded` from `../utils/storage.js` but not `getActiveChildId` — add it to that same import line rather than a separate one.)

Add state near the other `useState` declarations (`ParentPage.jsx:44-53`):

```js
  const [signal, setSignal] = useState(null)
```

- [ ] **Step 2: Fetch today's signal on mount**

Add a new `useEffect`, alongside the existing ones (`ParentPage.jsx:56-64`):

```js
  useEffect(() => {
    const childId = getActiveChildId()
    if (!childId) return
    fetchTodaySignal(childId).then(setSignal).catch(() => {})
  }, [])
```

- [ ] **Step 3: Render the banner and wire dismiss**

Add a handler alongside `handleSelectPrint` (`ParentPage.jsx:80-87`):

```js
  const handleDismissSignal = () => {
    if (!signal) return
    dismissSignal(signal.id).catch(() => {})
    setSignal(null)
  }
```

In the JSX, render `SignalBanner` right before the existing trial-status banners (`ParentPage.jsx:103`):

```jsx
      <SignalBanner
        signal={signal}
        onReview={() => setTab('History')}
        onDismiss={handleDismissSignal}
      />

      {/* Trial status banner */}
      {tier === 'trial' && daysLeft !== null && daysLeft <= 3 && (
```

- [ ] **Step 4: Run the full test suite, build, and do a live check**

Run: `npx vitest run`
Expected: PASS, all existing suites — this task adds no new automated tests of its own (see rationale above), so this run is purely a regression check.

Run: `npx vite build`
Expected: builds cleanly, no new errors/warnings beyond the pre-existing chunk-size warning.

Live check: start the dev server, sign in with a real account that has at least one child profile, and confirm the Parent Dashboard renders without the banner when no signal exists for today (the common case). A full end-to-end check of the classify → upsert → banner path requires triggering a real concern-keyword message from the child app and a real Supabase session — note in the task report whether this was done or deferred, don't silently skip mentioning it either way.

- [ ] **Step 5: Commit**

```bash
git add src/pages/ParentPage.jsx
git commit -m "feat: show the emotional check-in nudge banner on the Parent Dashboard"
```
