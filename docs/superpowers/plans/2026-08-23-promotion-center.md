# Promotion Center Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a parent-facing "Promotion Center" page at `/parent/promotion` showing a child's tactical rank, a 6-month skill-tree map, a static tactical preview, and a re-skinned Buddy Pro upgrade card.

**Architecture:** A new `child_ranks` Postgres table + `security definer` RPC track XP per child, incremented once per newly-completed `ageBand: 'old'` lesson via the existing `useProgress.markComplete` codepath. A new `useChildRank` hook derives level/rank from that XP with a pure, independently-tested function. Four new presentational components (`RankStatusHeader`, `SkillTreeMap`, `TacticalPreview`, `EliteAcademyCard`) compose into a new `PromotionCenterPage`, linked from `ParentPage` and routed in `App.jsx`. The existing `UpgradePrompt` checkout call is extracted into a shared `checkoutService` so the new card and the existing modal both use one code path.

**Tech Stack:** React 18 (function components, hooks), react-router-dom v6, Supabase (Postgres + RLS + RPC), Vitest + React Testing Library, plain CSS Modules (no CSS framework).

**Spec:** `docs/superpowers/specs/2026-08-23-promotion-center-design.md`

## Global Constraints

- No new Payfast plan or entitlement flag — "Elite Academy" is the existing Buddy Pro tier (R149/month), just re-skinned copy.
- Months 2–6 render as `locked`/"Coming soon" in the skill tree — never fabricate lesson/course data for them.
- No confetti animation, no downloadable certificate, no custom illustration/texture assets in this build (explicitly deferred per spec).
- `child_ranks` is never client-writable directly — all XP writes go through the `bump_child_xp` RPC, which does its own ownership check (`security definer`).
- Sanctioned visual exception for this route only: Buddy Purple `#9D50BB`, Academy Gold `#D4AF37`, Tactical Green `#27AE60`, Roboto Mono for numeric stats — scoped via CSS custom properties on `PromotionCenterPage.module.css`'s root class, not added to the global `:root` in `src/index.css`.
- Follow existing patterns exactly: Supabase calls go through `src/services/*.js` wrapper functions (never inline in components), RLS policies match the ownership-check style already used for `children`/`lesson_completions`, tests mock `../lib/supabase.js` the same way `signalsService.test.js` does.

---

### Task 1: `child_ranks` table + `bump_child_xp` RPC

**Files:**
- Create: `supabase/migrations/2026-08-23-1-create-child-ranks.sql`

**Interfaces:**
- Produces: table `public.child_ranks(child_id uuid pk, total_xp integer, updated_at timestamptz)`; RPC `public.bump_child_xp(p_child_id uuid, p_xp_delta integer) returns integer` (returns the new `total_xp`).

- [ ] **Step 1: Write the migration**

```sql
-- Per-child rank/XP tracking for the Promotion Center parent dashboard.
-- Run in the Supabase SQL editor. See
-- docs/superpowers/specs/2026-08-23-promotion-center-design.md.
--
-- One row per child (not per user — a Pro account can have several
-- children, each ranking independently). Never client-writable directly:
-- all XP increments go through bump_child_xp below, a security definer
-- function that does its own ownership check, so a compromised or buggy
-- client can never set another child's XP or set XP to an arbitrary value.

create table if not exists public.child_ranks (
  child_id    uuid primary key references public.children(id) on delete cascade,
  total_xp    integer not null default 0,
  updated_at  timestamptz not null default now()
);

alter table public.child_ranks enable row level security;

do $$
declare p record;
begin
  for p in
    select policyname from pg_policies
    where schemaname = 'public' and tablename = 'child_ranks'
  loop
    execute format('drop policy %I on public.child_ranks', p.policyname);
  end loop;
end $$;

-- Read-only for the client — the owning parent account can see its
-- children's rank rows. No insert/update/delete policies: writes only
-- happen through bump_child_xp.
create policy "child_ranks_select_own" on public.child_ranks
  for select using (
    exists (
      select 1 from public.children c
      where c.id = child_ranks.child_id and c.user_id = auth.uid()
    )
  );

create or replace function public.bump_child_xp(
  p_child_id  uuid,
  p_xp_delta  integer
) returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  safe_delta integer := greatest(p_xp_delta, 0);
  new_xp integer;
begin
  if not exists (
    select 1 from public.children where id = p_child_id and user_id = auth.uid()
  ) then
    raise exception 'not authorized for this child';
  end if;

  insert into public.child_ranks (child_id, total_xp, updated_at)
  values (p_child_id, safe_delta, now())
  on conflict (child_id)
  do update set total_xp = child_ranks.total_xp + safe_delta, updated_at = now()
  returning total_xp into new_xp;

  return new_xp;
end $$;

revoke all on function public.bump_child_xp(uuid, integer) from public, anon;
grant execute on function public.bump_child_xp(uuid, integer) to authenticated;
```

- [ ] **Step 2: Apply the migration**

Run the file's contents in the Supabase SQL editor (or via Supabase MCP `apply_migration` if working against a connected project). This project does not run migrations through an automated test suite — confirm by running, in the SQL editor:

```sql
select column_name, data_type from information_schema.columns where table_name = 'child_ranks';
select proname from pg_proc where proname = 'bump_child_xp';
```

Expected: `child_ranks` has `child_id`, `total_xp`, `updated_at`; `bump_child_xp` exists.

- [ ] **Step 3: Manually verify the ownership check**

In the SQL editor, as a test authenticated role (or via `supabase.auth` in a scratch script), confirm calling `select bump_child_xp('<some-other-users-child-id>', 100)` raises `not authorized for this child`, and calling it with a child you own returns the new total.

- [ ] **Step 4: Commit**

```bash
git add supabase/migrations/2026-08-23-1-create-child-ranks.sql
git commit -m "feat: add child_ranks table and bump_child_xp RPC"
```

---

### Task 2: Pure rank derivation logic

**Files:**
- Create: `src/utils/rank.js`
- Test: `src/utils/rank.test.js`

**Interfaces:**
- Produces: `deriveRank(totalXp: number): { level: number, rank: 'Recruit'|'Specialist'|'Commander', xpIntoLevel: number, xpToNextLevel: number }`, `XP_PER_LEVEL = 100` (exported constant).

- [ ] **Step 1: Write the failing test**

```javascript
// src/utils/rank.test.js
import { describe, it, expect } from 'vitest'
import { deriveRank } from './rank.js'

describe('deriveRank', () => {
  it('starts at level 1, Recruit, with 0 XP', () => {
    expect(deriveRank(0)).toEqual({ level: 1, rank: 'Recruit', xpIntoLevel: 0, xpToNextLevel: 100 })
  })

  it('stays level 1 until 100 XP', () => {
    expect(deriveRank(99)).toEqual({ level: 1, rank: 'Recruit', xpIntoLevel: 99, xpToNextLevel: 1 })
  })

  it('reaches level 2 at exactly 100 XP', () => {
    expect(deriveRank(100)).toEqual({ level: 2, rank: 'Recruit', xpIntoLevel: 0, xpToNextLevel: 100 })
  })

  it('is still Recruit at level 5 (400-499 XP)', () => {
    expect(deriveRank(400).rank).toBe('Recruit')
    expect(deriveRank(400).level).toBe(5)
  })

  it('becomes Specialist at level 6 (500 XP)', () => {
    expect(deriveRank(500)).toEqual({ level: 6, rank: 'Specialist', xpIntoLevel: 0, xpToNextLevel: 100 })
  })

  it('is still Specialist at level 12 (1100-1199 XP)', () => {
    expect(deriveRank(1100).rank).toBe('Specialist')
    expect(deriveRank(1100).level).toBe(12)
  })

  it('becomes Commander at level 13 (1200 XP)', () => {
    expect(deriveRank(1200)).toEqual({ level: 13, rank: 'Commander', xpIntoLevel: 0, xpToNextLevel: 100 })
  })

  it('treats null/undefined XP as 0', () => {
    expect(deriveRank(null)).toEqual({ level: 1, rank: 'Recruit', xpIntoLevel: 0, xpToNextLevel: 100 })
    expect(deriveRank(undefined)).toEqual({ level: 1, rank: 'Recruit', xpIntoLevel: 0, xpToNextLevel: 100 })
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/utils/rank.test.js`
Expected: FAIL — `./rank.js` does not exist.

- [ ] **Step 3: Write the implementation**

```javascript
// src/utils/rank.js
// Rank/level are always derived from total_xp, never stored separately —
// one source of truth, same pattern as BAND_BY_AGE deriving an age band
// from a raw age (see src/utils/subjects.js). See
// docs/superpowers/specs/2026-08-23-promotion-center-design.md.
export const XP_PER_LEVEL = 100

export function deriveRank(totalXp) {
  const xp = totalXp || 0
  const level = Math.floor(xp / XP_PER_LEVEL) + 1
  const rank = level <= 5 ? 'Recruit' : level <= 12 ? 'Specialist' : 'Commander'
  const xpIntoLevel = xp % XP_PER_LEVEL
  const xpToNextLevel = XP_PER_LEVEL - xpIntoLevel
  return { level, rank, xpIntoLevel, xpToNextLevel }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/utils/rank.test.js`
Expected: PASS, 8 tests.

- [ ] **Step 5: Commit**

```bash
git add src/utils/rank.js src/utils/rank.test.js
git commit -m "feat: add pure rank/level derivation from XP"
```

---

### Task 3: `rankService.js` — Supabase wrapper functions

**Files:**
- Create: `src/services/rankService.js`
- Test: `src/services/rankService.test.js`

**Interfaces:**
- Consumes: `supabase` from `../lib/supabase.js` (mocked in tests, same pattern as `signalsService.test.js`).
- Produces: `fetchChildRank(childId: string): Promise<{ totalXp: number } | null>`, `bumpChildXp(childId: string, xpDelta: number): Promise<number | null>` (returns new total XP, or `null` on failure/no-op).

- [ ] **Step 1: Write the failing test**

```javascript
// src/services/rankService.test.js
import { describe, it, expect, vi, beforeEach } from 'vitest'

function makeBuilder(result) {
  const builder = {
    select: vi.fn(() => builder),
    eq: vi.fn(() => builder),
    maybeSingle: vi.fn(() => Promise.resolve(result)),
    then: (resolve) => resolve(result),
  }
  return builder
}

const mocks = vi.hoisted(() => ({
  from: vi.fn(),
  rpc: vi.fn(),
}))
vi.mock('../lib/supabase.js', () => ({
  supabase: { from: mocks.from, rpc: mocks.rpc },
}))

import { fetchChildRank, bumpChildXp } from './rankService.js'

describe('rankService', () => {
  beforeEach(() => vi.clearAllMocks())

  it('fetchChildRank returns null for a childId with no row yet', async () => {
    const builder = makeBuilder({ data: null, error: null })
    mocks.from.mockReturnValue(builder)
    const result = await fetchChildRank('c1')
    expect(result).toEqual({ totalXp: 0 })
    expect(mocks.from).toHaveBeenCalledWith('child_ranks')
  })

  it('fetchChildRank returns the stored totalXp', async () => {
    const builder = makeBuilder({ data: { total_xp: 350 }, error: null })
    mocks.from.mockReturnValue(builder)
    const result = await fetchChildRank('c1')
    expect(result).toEqual({ totalXp: 350 })
  })

  it('fetchChildRank returns null immediately for a null childId, without querying', async () => {
    const result = await fetchChildRank(null)
    expect(result).toBeNull()
    expect(mocks.from).not.toHaveBeenCalled()
  })

  it('bumpChildXp calls the RPC with the child id and delta, returns the new total', async () => {
    mocks.rpc.mockResolvedValue({ data: 450, error: null })
    const result = await bumpChildXp('c1', 100)
    expect(mocks.rpc).toHaveBeenCalledWith('bump_child_xp', { p_child_id: 'c1', p_xp_delta: 100 })
    expect(result).toBe(450)
  })

  it('bumpChildXp returns null and does not throw on an RPC error', async () => {
    mocks.rpc.mockResolvedValue({ data: null, error: { message: 'boom' } })
    const result = await bumpChildXp('c1', 100)
    expect(result).toBeNull()
  })

  it('bumpChildXp is a no-op for a null childId', async () => {
    const result = await bumpChildXp(null, 100)
    expect(result).toBeNull()
    expect(mocks.rpc).not.toHaveBeenCalled()
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/services/rankService.test.js`
Expected: FAIL — `./rankService.js` does not exist.

- [ ] **Step 3: Write the implementation**

```javascript
// src/services/rankService.js
import { supabase } from '../lib/supabase.js'

// child_ranks has no row until the child's first old-band completion —
// treat a missing row as 0 XP rather than surfacing "no data" to the UI.
export async function fetchChildRank(childId) {
  if (!childId) return null
  const { data, error } = await supabase
    .from('child_ranks')
    .select('total_xp')
    .eq('child_id', childId)
    .maybeSingle()
  if (error) { console.error('Failed to fetch child rank:', error.message); return { totalXp: 0 } }
  return { totalXp: data?.total_xp || 0 }
}

// Never writes child_ranks directly — bump_child_xp is a security definer
// RPC that checks the child belongs to the caller before writing. Fails
// closed (returns null) rather than throwing, since XP is a nice-to-have
// display, not something that should ever break a lesson completing.
export async function bumpChildXp(childId, xpDelta) {
  if (!childId) return null
  const { data, error } = await supabase.rpc('bump_child_xp', { p_child_id: childId, p_xp_delta: xpDelta })
  if (error) { console.error('Failed to bump child XP:', error.message); return null }
  return data
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/services/rankService.test.js`
Expected: PASS, 6 tests.

- [ ] **Step 5: Commit**

```bash
git add src/services/rankService.js src/services/rankService.test.js
git commit -m "feat: add rankService for fetching and bumping child XP"
```

---

### Task 4: Award XP on first-time old-band lesson completion

**Files:**
- Modify: `src/hooks/useProgress.js`
- Modify: `src/pages/LessonPage.jsx:199` (the `markComplete(courseId, lessonId, averageScore)` call)
- Test: `src/hooks/useProgress.test.js` (new file)

**Interfaces:**
- Consumes: `bumpChildXp` from `../services/rankService.js` (Task 3).
- Modifies: `markComplete`'s signature from `(courseId, lessonId, masteryScore = 100)` to `(courseId, lessonId, masteryScore = 100, ageBand = null)` — the 4th param is optional and additive, so every other existing call site (if any besides `LessonPage.jsx`) keeps working unchanged.

- [ ] **Step 1: Write the failing test**

```javascript
// src/hooks/useProgress.test.js
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'

const mocks = vi.hoisted(() => ({
  getUser: vi.fn(),
  from: vi.fn(),
  bumpChildXp: vi.fn(),
  getActiveChildId: vi.fn(),
}))
vi.mock('../lib/supabase.js', () => ({
  supabase: { auth: { getUser: mocks.getUser }, from: mocks.from },
}))
vi.mock('../services/rankService.js', () => ({ bumpChildXp: mocks.bumpChildXp }))
vi.mock('../utils/storage.js', () => ({ getActiveChildId: mocks.getActiveChildId }))

import { useProgress } from './useProgress.js'

// Supports both the hook's mount-time read chain
// (.from().select().eq().or().then()) and markComplete's .upsert() —
// useProgress calls both against the same mocked `supabase.from` return
// value, so one builder needs to answer to every method used in either
// codepath. Same pattern as signalsService.test.js's makeBuilder.
function makeBuilder() {
  const builder = {
    select: vi.fn(() => builder),
    eq: vi.fn(() => builder),
    or: vi.fn(() => builder),
    upsert: vi.fn(() => Promise.resolve({ error: null })),
    then: (resolve) => resolve({ data: [], error: null }),
  }
  return builder
}

describe('useProgress markComplete — XP awarding', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.getUser.mockResolvedValue({ data: { user: { id: 'u1' } }, error: null })
    mocks.getActiveChildId.mockReturnValue('c1')
    mocks.from.mockReturnValue(makeBuilder())
  })

  it('awards XP equal to the mastery score on a first-time old-band completion', async () => {
    const { result } = renderHook(() => useProgress())
    await act(async () => {
      await result.current.markComplete('robotics', 'mission-neural-uplink', 85, 'old')
    })
    expect(mocks.bumpChildXp).toHaveBeenCalledWith('c1', 85)
  })

  it('does not award XP for a non-old-band completion', async () => {
    const { result } = renderHook(() => useProgress())
    await act(async () => {
      await result.current.markComplete('literacy', 'blending-sounds', 90, 'middle')
    })
    expect(mocks.bumpChildXp).not.toHaveBeenCalled()
  })

  it('does not award XP when ageBand is omitted (legacy call sites)', async () => {
    const { result } = renderHook(() => useProgress())
    await act(async () => {
      await result.current.markComplete('robotics', 'mission-neural-uplink', 85)
    })
    expect(mocks.bumpChildXp).not.toHaveBeenCalled()
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/hooks/useProgress.test.js`
Expected: FAIL — `bumpChildXp` not called (current `markComplete` has no XP logic or 4th param).

- [ ] **Step 3: Modify `useProgress.js`**

Add the import and extend `markComplete`:

```javascript
// Add near the top, alongside the existing supabase import:
import { bumpChildXp } from '../services/rankService.js'
```

Replace the `markComplete` function body:

```javascript
  // masteryScore is 0-100, or omitted for legacy call sites — treated as
  // full marks so old courses (no scored steps yet) still show as mastered.
  // ageBand is passed by LessonPage from the fetched lesson's own ageBand
  // field — only 'old'-band completions award tactical rank XP (see
  // docs/superpowers/specs/2026-08-23-promotion-center-design.md). It's
  // checked against the *pre-upsert* completions set below so re-completing
  // an already-done mission never double-awards XP.
  const markComplete = useCallback(async (courseId, lessonId, masteryScore = 100, ageBand = null) => {
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) return
    const childId = getActiveChildId()
    const completedAt = new Date().toISOString()
    const key = `${courseId}:${lessonId}`
    const isFirstCompletion = !completionsRef.current.has(key)
    const { error: upsertError } = await supabase.from('lesson_completions').upsert(
      { user_id: user.id, course_id: courseId, lesson_id: lessonId, child_id: childId, mastery_score: masteryScore, completed_at: completedAt },
      { onConflict: 'user_id,course_id,lesson_id,child_id' }
    )
    if (upsertError) { console.error('Failed to save completion:', upsertError); return }
    setCompletions(prev => new Set([...prev, key]))
    setRecords(prev => new Map(prev).set(key, { masteryScore, completedAt }))
    if (isFirstCompletion && ageBand === 'old') {
      bumpChildXp(childId, masteryScore).catch(() => {})
    }
  }, [])
```

`completionsRef` doesn't exist yet — `completions` is state, and reading `completions` directly inside this `useCallback` (with an empty dep array) would close over a stale value. Add a ref that mirrors it, right after the existing `completions`/`records` state declarations:

```javascript
  const completionsRef = useRef(new Set())
  useEffect(() => { completionsRef.current = completions }, [completions])
```

Add `useRef` to the existing `import { useState, useEffect, useCallback } from 'react'` line (becomes `import { useState, useEffect, useCallback, useRef } from 'react'`).

- [ ] **Step 4: Update the `LessonPage.jsx` call site**

In `src/pages/LessonPage.jsx`, the `handleNext` function's final branch currently calls:

```javascript
      markComplete(courseId, lessonId, averageScore)
```

Change to:

```javascript
      markComplete(courseId, lessonId, averageScore, lesson.ageBand)
```

(`lesson` is already in scope in `handleNext` — it's the fetched lesson object used throughout the component, and `ageBand` is already a field on it per `api/_courseData/robotics.js`'s lesson shape.)

- [ ] **Step 5: Run test to verify it passes**

Run: `npx vitest run src/hooks/useProgress.test.js`
Expected: PASS, 3 tests.

- [ ] **Step 6: Run the full test suite to check for regressions**

Run: `npm run test`
Expected: all existing tests (including `LessonPage.test.jsx` and `LearningTab.test.jsx`, which exercise `markComplete`) still pass — the new 4th parameter is optional and additive.

- [ ] **Step 7: Commit**

```bash
git add src/hooks/useProgress.js src/hooks/useProgress.test.js src/pages/LessonPage.jsx
git commit -m "feat: award rank XP on first-time old-band mission completion"
```

---

### Task 5: `useChildRank` hook

**Files:**
- Create: `src/hooks/useChildRank.js`
- Test: `src/hooks/useChildRank.test.js`

**Interfaces:**
- Consumes: `fetchChildRank` (Task 3), `deriveRank` (Task 2).
- Produces: `useChildRank(childId: string | null): { totalXp: number, level: number, rank: string, xpIntoLevel: number, xpToNextLevel: number, loading: boolean }`.

- [ ] **Step 1: Write the failing test**

```javascript
// src/hooks/useChildRank.test.js
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'

const mocks = vi.hoisted(() => ({ fetchChildRank: vi.fn() }))
vi.mock('../services/rankService.js', () => ({ fetchChildRank: mocks.fetchChildRank }))

import { useChildRank } from './useChildRank.js'

describe('useChildRank', () => {
  beforeEach(() => vi.clearAllMocks())

  it('starts in a loading state with Recruit level 1 defaults', () => {
    mocks.fetchChildRank.mockReturnValue(new Promise(() => {})) // never resolves
    const { result } = renderHook(() => useChildRank('c1'))
    expect(result.current.loading).toBe(true)
    expect(result.current.rank).toBe('Recruit')
    expect(result.current.level).toBe(1)
  })

  it('derives level/rank from the fetched totalXp', async () => {
    mocks.fetchChildRank.mockResolvedValue({ totalXp: 550 })
    const { result } = renderHook(() => useChildRank('c1'))
    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(result.current.totalXp).toBe(550)
    expect(result.current.level).toBe(6)
    expect(result.current.rank).toBe('Specialist')
  })

  it('does not fetch when childId is null', () => {
    renderHook(() => useChildRank(null))
    expect(mocks.fetchChildRank).not.toHaveBeenCalled()
  })

  it('refetches when childId changes', async () => {
    mocks.fetchChildRank.mockResolvedValue({ totalXp: 0 })
    const { rerender } = renderHook(({ id }) => useChildRank(id), { initialProps: { id: 'c1' } })
    await waitFor(() => expect(mocks.fetchChildRank).toHaveBeenCalledWith('c1'))
    rerender({ id: 'c2' })
    await waitFor(() => expect(mocks.fetchChildRank).toHaveBeenCalledWith('c2'))
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/hooks/useChildRank.test.js`
Expected: FAIL — `./useChildRank.js` does not exist.

- [ ] **Step 3: Write the implementation**

```javascript
// src/hooks/useChildRank.js
import { useState, useEffect } from 'react'
import { fetchChildRank } from '../services/rankService.js'
import { deriveRank } from '../utils/rank.js'

export function useChildRank(childId) {
  const [totalXp, setTotalXp] = useState(0)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!childId) { setLoading(false); return }
    let cancelled = false
    setLoading(true)
    fetchChildRank(childId).then((row) => {
      if (cancelled) return
      setTotalXp(row?.totalXp || 0)
      setLoading(false)
    })
    return () => { cancelled = true }
  }, [childId])

  return { totalXp, loading, ...deriveRank(totalXp) }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/hooks/useChildRank.test.js`
Expected: PASS, 4 tests.

- [ ] **Step 5: Commit**

```bash
git add src/hooks/useChildRank.js src/hooks/useChildRank.test.js
git commit -m "feat: add useChildRank hook"
```

---

### Task 6: Extract shared checkout flow from `UpgradePrompt`

**Files:**
- Create: `src/services/checkoutService.js`
- Modify: `src/components/UpgradePrompt.jsx`
- Test: `src/services/checkoutService.test.js`

**Interfaces:**
- Produces: `startCheckout(session): Promise<{ ok: true } | { ok: false, message: string }>` — starts the Payfast checkout redirect on success (`window.location.href = paymentUrl`), returns an error message on failure instead of throwing, so callers can show it inline.

- [ ] **Step 1: Write the failing test**

```javascript
// src/services/checkoutService.test.js
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

const originalLocation = window.location

beforeEach(() => {
  vi.stubGlobal('fetch', vi.fn())
  delete window.location
  window.location = { href: '' }
})

afterEach(() => {
  window.location = originalLocation
  vi.unstubAllGlobals()
})

import { startCheckout } from './checkoutService.js'

describe('startCheckout', () => {
  const session = { access_token: 'tok', user: { user_metadata: { full_name: 'Ada Lovelace' } } }

  it('redirects to the returned paymentUrl on success', async () => {
    fetch.mockResolvedValue({ json: () => Promise.resolve({ paymentUrl: 'https://payfast.example/pay/1' }) })
    const result = await startCheckout(session)
    expect(result).toEqual({ ok: true })
    expect(window.location.href).toBe('https://payfast.example/pay/1')
    expect(fetch).toHaveBeenCalledWith('/api/payfast-create', expect.objectContaining({
      method: 'POST',
      headers: expect.objectContaining({ Authorization: 'Bearer tok' }),
    }))
  })

  it('returns a friendly error and does not redirect on API error', async () => {
    fetch.mockResolvedValue({ json: () => Promise.resolve({ error: 'boom' }) })
    const result = await startCheckout(session)
    expect(result.ok).toBe(false)
    expect(result.message).toMatch(/something went wrong/i)
    expect(window.location.href).toBe('')
  })

  it('returns a friendly error when there is no session', async () => {
    const result = await startCheckout(null)
    expect(result.ok).toBe(false)
    expect(fetch).not.toHaveBeenCalled()
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/services/checkoutService.test.js`
Expected: FAIL — `./checkoutService.js` does not exist.

- [ ] **Step 3: Write the implementation**

```javascript
// src/services/checkoutService.js
// Shared by UpgradePrompt (modal) and EliteAcademyCard (Promotion Center
// inline card) — both trigger the same Buddy Pro checkout, just from
// different UI shells. See
// docs/superpowers/specs/2026-08-23-promotion-center-design.md.
export async function startCheckout(session) {
  if (!session) return { ok: false, message: 'Something went wrong starting checkout. Please try again.' }
  try {
    const res = await fetch('/api/payfast-create', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${session.access_token}`,
      },
      body: JSON.stringify({
        firstName: session.user.user_metadata?.full_name?.split(' ')[0] || 'Parent',
      }),
    })
    const { paymentUrl, error } = await res.json()
    if (error) throw new Error(error)
    window.location.href = paymentUrl
    return { ok: true }
  } catch (err) {
    console.error('Upgrade error:', err)
    return { ok: false, message: 'Something went wrong starting checkout. Please try again.' }
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/services/checkoutService.test.js`
Expected: PASS, 3 tests.

- [ ] **Step 5: Update `UpgradePrompt.jsx` to use it**

Replace the `handleUpgrade` function and its imports:

```javascript
// Remove the inline fetch/redirect logic; add:
import { startCheckout } from '../services/checkoutService.js'

// Replace handleUpgrade with:
  const handleUpgrade = async () => {
    setLoading(true)
    setUpgradeError('')
    const result = await startCheckout(session)
    if (!result.ok) {
      setUpgradeError(result.message)
      setLoading(false)
    }
  }
```

Remove the now-unused `supabase` import from `UpgradePrompt.jsx` if nothing else in the file uses it (check with a quick grep first — `grep -n supabase src/components/UpgradePrompt.jsx`; the only reference was inside the old `handleUpgrade`, so it should be safe to drop the `import { supabase } from '../lib/supabase.js'` line).

- [ ] **Step 6: Run the full test suite to check for regressions**

Run: `npm run test`
Expected: all tests pass, including any existing `UpgradePrompt` tests exercising the upgrade button.

- [ ] **Step 7: Commit**

```bash
git add src/services/checkoutService.js src/services/checkoutService.test.js src/components/UpgradePrompt.jsx
git commit -m "refactor: extract checkout flow into shared checkoutService"
```

---

### Task 7: `RankStatusHeader` component

**Files:**
- Create: `src/components/promotionCenter/RankStatusHeader.jsx`
- Create: `src/components/promotionCenter/RankStatusHeader.module.css`
- Test: `src/components/promotionCenter/RankStatusHeader.test.jsx`

**Interfaces:**
- Consumes: `BuddyAvatar` (`../BuddyAvatar.jsx`), `useChildRank` (Task 5), `XP_PER_LEVEL` (Task 2).
- Props: `{ child: { id, name, buddy_name, avatar_type, avatar_color }, allChildren: [{ id, name, ... }], onSwitchChild: (id) => void }`. (Named `allChildren`, not `children` — that name is reserved for React's special `children` prop and passing it explicitly as a JSX attribute trips the `react/no-children-prop` lint rule.)

- [ ] **Step 1: Write the failing test**

```jsx
// src/components/promotionCenter/RankStatusHeader.test.jsx
import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'

const mocks = vi.hoisted(() => ({ useChildRank: vi.fn() }))
vi.mock('../../hooks/useChildRank.js', () => ({ useChildRank: mocks.useChildRank }))

import RankStatusHeader from './RankStatusHeader.jsx'

const child = { id: 'c1', name: 'Ada', buddy_name: 'Buddy', avatar_type: 'bear', avatar_color: '#7c3aed' }
const siblings = [child, { id: 'c2', name: 'Sam', buddy_name: 'Buddy', avatar_type: 'cat', avatar_color: '#db2777' }]

describe('RankStatusHeader', () => {
  it('shows the rank label and XP progress', () => {
    mocks.useChildRank.mockReturnValue({ totalXp: 250, level: 3, rank: 'Recruit', xpIntoLevel: 50, xpToNextLevel: 50, loading: false })
    render(<RankStatusHeader child={child} allChildren={siblings} onSwitchChild={vi.fn()} />)
    expect(screen.getByText(/recruit/i)).toBeInTheDocument()
    expect(screen.getByText(/level 3/i)).toBeInTheDocument()
    expect(screen.getByText(/50 xp to next/i)).toBeInTheDocument()
  })

  it('lists sibling children as switch options and calls onSwitchChild', () => {
    mocks.useChildRank.mockReturnValue({ totalXp: 0, level: 1, rank: 'Recruit', xpIntoLevel: 0, xpToNextLevel: 100, loading: false })
    const onSwitchChild = vi.fn()
    render(<RankStatusHeader child={child} allChildren={siblings} onSwitchChild={onSwitchChild} />)
    fireEvent.click(screen.getByRole('button', { name: /sam/i }))
    expect(onSwitchChild).toHaveBeenCalledWith('c2')
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/components/promotionCenter/RankStatusHeader.test.jsx`
Expected: FAIL — component does not exist.

- [ ] **Step 3: Write the implementation**

```jsx
// src/components/promotionCenter/RankStatusHeader.jsx
import BuddyAvatar from '../BuddyAvatar.jsx'
import { useChildRank } from '../../hooks/useChildRank.js'
import { XP_PER_LEVEL } from '../../utils/rank.js'
import styles from './RankStatusHeader.module.css'

export default function RankStatusHeader({ child, allChildren, onSwitchChild }) {
  const { level, rank, xpIntoLevel, xpToNextLevel, loading } = useChildRank(child?.id)
  const pct = loading ? 0 : Math.round((xpIntoLevel / XP_PER_LEVEL) * 100)
  const siblings = (allChildren || []).filter((c) => c.id !== child?.id)

  return (
    <div className={styles.header}>
      <div className={`${styles.avatarRing} ${styles[`rank_${rank}`]}`}>
        <BuddyAvatar status="idle" avatarColor={child?.avatar_color} type={child?.avatar_type} size={88} live={false} />
      </div>
      <p className={styles.childName}>{child?.name}</p>
      <p className={styles.rankLabel}>{rank} · Level {level}</p>
      <div className={styles.xpTrack}>
        <div className={styles.xpFill} style={{ transform: `scaleX(${pct / 100})` }} />
      </div>
      <p className={styles.xpCaption}>{xpToNextLevel} XP to next rank</p>

      {siblings.length > 0 && (
        <div className={styles.switcher}>
          {siblings.map((sib) => (
            <button key={sib.id} className={styles.switchBtn} onClick={() => onSwitchChild(sib.id)}>
              {sib.name}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 4: Write a minimal `RankStatusHeader.module.css`**

```css
.header {
  background: var(--surface, #fff);
  border-radius: var(--r-lg, 34px);
  padding: 20px 16px;
  text-align: center;
}

.avatarRing {
  width: 96px;
  height: 96px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  margin: 0 auto 10px;
  border: 3px solid var(--pc-purple, #9D50BB);
}

.rank_Specialist { border-color: var(--pc-gold, #D4AF37); }
.rank_Commander { border-color: var(--pc-green, #27AE60); }

.childName {
  font-family: var(--font-head, sans-serif);
  font-weight: 700;
  font-size: 1.1rem;
  color: var(--ink, #2D3436);
}

.rankLabel {
  font-family: 'Roboto Mono', monospace;
  font-size: 0.8rem;
  color: var(--pc-purple, #9D50BB);
  margin: 4px 0 10px;
}

.xpTrack {
  height: 8px;
  border-radius: 999px;
  background: rgba(157, 80, 187, 0.15);
  overflow: hidden;
}

.xpFill {
  height: 100%;
  width: 100%;
  background: var(--pc-purple, #9D50BB);
  transform-origin: left;
  transition: transform 0.3s ease;
}

.xpCaption {
  font-family: 'Roboto Mono', monospace;
  font-size: 0.7rem;
  color: var(--ink-dim, #6b5d8f);
  margin-top: 6px;
}

.switcher {
  display: flex;
  gap: 8px;
  justify-content: center;
  margin-top: 14px;
  flex-wrap: wrap;
}

.switchBtn {
  padding: 6px 12px;
  border-radius: 999px;
  background: var(--surface-tint, #f4f0fc);
  font-size: 0.8rem;
  color: var(--ink, #2D3436);
}
```

- [ ] **Step 5: Run test to verify it passes**

Run: `npx vitest run src/components/promotionCenter/RankStatusHeader.test.jsx`
Expected: PASS, 2 tests.

- [ ] **Step 6: Commit**

```bash
git add src/components/promotionCenter/RankStatusHeader.jsx src/components/promotionCenter/RankStatusHeader.module.css src/components/promotionCenter/RankStatusHeader.test.jsx
git commit -m "feat: add RankStatusHeader component"
```

---

### Task 8: `SkillTreeMap` component

**Files:**
- Create: `src/components/promotionCenter/SkillTreeMap.jsx`
- Create: `src/components/promotionCenter/SkillTreeMap.module.css`
- Test: `src/components/promotionCenter/SkillTreeMap.test.jsx`

**Interfaces:**
- Consumes: `completions: Set<string>` (the `"course:lesson"` keys from `useProgress`, same shape already used by `LearningTab.jsx`).
- Props: `{ completions: Set<string> }`.
- Internal: a hardcoded `MONTHS` array — only Month 1 has real lesson ids (from `api/_courseData/robotics.js`); Months 2–6 have no `lessonIds`, so they're always locked regardless of `completions`.

- [ ] **Step 1: Write the failing test**

```jsx
// src/components/promotionCenter/SkillTreeMap.test.jsx
import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import SkillTreeMap from './SkillTreeMap.jsx'

const MISSION_IDS = ['mission-neural-uplink', 'mission-sensory-array', 'mission-kinetic-deployment', 'mission-voltage-surge']

describe('SkillTreeMap', () => {
  it('renders all 6 months', () => {
    render(<SkillTreeMap completions={new Set()} />)
    expect(screen.getByText(/operation iron blueprint/i)).toBeInTheDocument()
    expect(screen.getByText(/path-finder/i)).toBeInTheDocument()
    expect(screen.getByText(/code-breaker/i)).toBeInTheDocument()
    expect(screen.getByText(/heavy-lift/i)).toBeInTheDocument()
    expect(screen.getByText(/autonomous-command/i)).toBeInTheDocument()
    expect(screen.getByText(/omniscience/i)).toBeInTheDocument()
  })

  it('shows Month 1 as locked with 0 of 4 missions when nothing is completed', () => {
    render(<SkillTreeMap completions={new Set()} />)
    expect(screen.getByText(/0\s*\/\s*4/)).toBeInTheDocument()
  })

  it('shows Month 1 as in-progress once some missions are completed', () => {
    const completions = new Set(MISSION_IDS.slice(0, 2).map((id) => `robotics:${id}`))
    render(<SkillTreeMap completions={completions} />)
    expect(screen.getByText(/2\s*\/\s*4/)).toBeInTheDocument()
  })

  it('always renders Months 2-6 as locked, regardless of completions', () => {
    const completions = new Set(MISSION_IDS.map((id) => `robotics:${id}`))
    render(<SkillTreeMap completions={completions} />)
    const lockedLabels = screen.getAllByText(/coming soon/i)
    expect(lockedLabels.length).toBe(5)
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/components/promotionCenter/SkillTreeMap.test.jsx`
Expected: FAIL — component does not exist.

- [ ] **Step 3: Write the implementation**

```jsx
// src/components/promotionCenter/SkillTreeMap.jsx
import styles from './SkillTreeMap.module.css'

// Only Month 1 has real lesson content today (api/_courseData/robotics.js's
// 4 old-band missions) — Months 2-6 are future content-authoring work (a
// separate subproject) and must never fabricate lesson ids. See
// docs/superpowers/specs/2026-08-23-promotion-center-design.md.
const MONTHS = [
  { title: 'Operation Iron Blueprint', courseId: 'robotics', lessonIds: ['mission-neural-uplink', 'mission-sensory-array', 'mission-kinetic-deployment', 'mission-voltage-surge'] },
  { title: 'Operation Path-Finder', lessonIds: null },
  { title: 'Operation Code-Breaker', lessonIds: null },
  { title: 'Operation Heavy-Lift', lessonIds: null },
  { title: 'Operation Autonomous-Command', lessonIds: null },
  { title: 'Operation Omniscience', lessonIds: null },
]

function monthState(month, completions) {
  if (!month.lessonIds) return 'locked'
  const done = month.lessonIds.filter((id) => completions.has(`${month.courseId}:${id}`)).length
  if (done === 0) return 'locked'
  if (done === month.lessonIds.length) return 'completed'
  return 'in-progress'
}

export default function SkillTreeMap({ completions }) {
  return (
    <ol className={styles.tree}>
      {MONTHS.map((month, i) => {
        const state = monthState(month, completions)
        const done = month.lessonIds ? month.lessonIds.filter((id) => completions.has(`${month.courseId}:${id}`)).length : 0
        const total = month.lessonIds ? month.lessonIds.length : 0
        return (
          <li key={month.title} className={`${styles.node} ${styles[state.replace('-', '')]}`}>
            <span className={styles.nodeIndex}>{i + 1}</span>
            <span className={styles.nodeTitle}>{month.title}</span>
            {month.lessonIds ? (
              <span className={styles.nodeProgress}>{done} / {total}</span>
            ) : (
              <span className={styles.nodeProgress}>Coming soon</span>
            )}
          </li>
        )
      })}
    </ol>
  )
}
```

- [ ] **Step 4: Write a minimal `SkillTreeMap.module.css`**

```css
.tree {
  list-style: none;
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.node {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 14px 16px;
  border-radius: var(--r-md, 24px);
  background: var(--surface, #fff);
  border: 1px dashed rgba(0,0,0,0.12);
}

.node.completed {
  background: var(--pc-purple, #9D50BB);
  border-style: solid;
  color: #fff;
}

.node.inprogress {
  border: 2px solid var(--pc-purple, #9D50BB);
  animation: pulse-ring-soft 2s ease-in-out infinite;
}

.node.locked {
  opacity: 0.6;
}

.nodeIndex {
  font-family: 'Roboto Mono', monospace;
  font-size: 0.75rem;
  width: 22px;
  height: 22px;
  border-radius: 50%;
  background: rgba(0,0,0,0.06);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.nodeTitle {
  flex: 1;
  font-family: var(--font-head, sans-serif);
  font-weight: 600;
  font-size: 0.9rem;
}

.nodeProgress {
  font-family: 'Roboto Mono', monospace;
  font-size: 0.75rem;
}

@keyframes pulse-ring-soft {
  0%, 100% { box-shadow: 0 0 0 0 rgba(157, 80, 187, 0.25); }
  50% { box-shadow: 0 0 0 6px rgba(157, 80, 187, 0); }
}
```

- [ ] **Step 5: Run test to verify it passes**

Run: `npx vitest run src/components/promotionCenter/SkillTreeMap.test.jsx`
Expected: PASS, 4 tests.

- [ ] **Step 6: Commit**

```bash
git add src/components/promotionCenter/SkillTreeMap.jsx src/components/promotionCenter/SkillTreeMap.module.css src/components/promotionCenter/SkillTreeMap.test.jsx
git commit -m "feat: add SkillTreeMap component"
```

---

### Task 9: `TacticalPreview` component

**Files:**
- Create: `src/components/promotionCenter/TacticalPreview.jsx`
- Create: `src/components/promotionCenter/TacticalPreview.module.css`

No dedicated test file for this task — it's a static presentational frame with no logic branches to cover (it's pure props → markup). Verified visually in Task 11's manual walkthrough instead, consistent with how purely-decorative pieces elsewhere in the codebase (e.g. `WorldBackdrop.jsx`) have no test file.

**Interfaces:**
- Props: `{ childName: string }`.

- [ ] **Step 1: Write the implementation**

```jsx
// src/components/promotionCenter/TacticalPreview.jsx
import styles from './TacticalPreview.module.css'

// Static mock of the child's Rank-Up HUD — deliberately NOT a live-rendered
// embed of ChildPage. See "Scope trim" decision in
// docs/superpowers/specs/2026-08-23-promotion-center-design.md.
export default function TacticalPreview({ childName }) {
  return (
    <figure className={styles.frame}>
      <div className={styles.hud}>
        <div className={styles.hudBar}>
          <span className={styles.hudRank}>RECRUIT</span>
          <span className={styles.hudMission}>MISSION 01</span>
        </div>
        <div className={styles.hudBody}>
          <p className={styles.hudText}>"Gear up, Recruit. Mission briefing incoming."</p>
        </div>
      </div>
      <figcaption className={styles.caption}>Live View: What {childName || 'your child'} sees during Rank-Up sessions.</figcaption>
    </figure>
  )
}
```

- [ ] **Step 2: Write `TacticalPreview.module.css`**

```css
.frame {
  border-radius: var(--r-lg, 34px);
  overflow: hidden;
}

.hud {
  aspect-ratio: 16 / 9;
  background: #0a0a12;
  color: #fff;
  padding: 16px;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  border: 2px solid var(--pc-purple, #9D50BB);
  box-shadow: 0 0 24px rgba(157, 80, 187, 0.35) inset;
}

.hudBar {
  display: flex;
  justify-content: space-between;
  font-family: 'Roboto Mono', monospace;
  font-size: 0.7rem;
  letter-spacing: 0.08em;
  color: var(--pc-gold, #D4AF37);
}

.hudBody {
  display: flex;
  align-items: center;
  justify-content: center;
  flex: 1;
}

.hudText {
  font-family: var(--font-head, sans-serif);
  text-align: center;
  font-size: 0.9rem;
  color: #fff;
  max-width: 80%;
}

.caption {
  font-size: 0.75rem;
  color: var(--ink-dim, #6b5d8f);
  text-align: center;
  margin-top: 8px;
}
```

- [ ] **Step 3: Commit**

```bash
git add src/components/promotionCenter/TacticalPreview.jsx src/components/promotionCenter/TacticalPreview.module.css
git commit -m "feat: add TacticalPreview component"
```

---

### Task 10: `EliteAcademyCard` component

**Files:**
- Create: `src/components/promotionCenter/EliteAcademyCard.jsx`
- Create: `src/components/promotionCenter/EliteAcademyCard.module.css`
- Test: `src/components/promotionCenter/EliteAcademyCard.test.jsx`

**Interfaces:**
- Consumes: `startCheckout` (Task 6).
- Props: `{ session }`.

- [ ] **Step 1: Write the failing test**

```jsx
// src/components/promotionCenter/EliteAcademyCard.test.jsx
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'

const mocks = vi.hoisted(() => ({ startCheckout: vi.fn() }))
vi.mock('../../services/checkoutService.js', () => ({ startCheckout: mocks.startCheckout }))

import EliteAcademyCard from './EliteAcademyCard.jsx'

describe('EliteAcademyCard', () => {
  beforeEach(() => vi.clearAllMocks())

  it('shows the R149/month price and Elite Academy heading', () => {
    render(<EliteAcademyCard session={{ access_token: 't' }} />)
    expect(screen.getByText(/elite academy/i)).toBeInTheDocument()
    expect(screen.getByText(/R149/)).toBeInTheDocument()
  })

  it('starts checkout when the CTA is clicked', async () => {
    mocks.startCheckout.mockResolvedValue({ ok: true })
    render(<EliteAcademyCard session={{ access_token: 't' }} />)
    fireEvent.click(screen.getByRole('button', { name: /unlock full potential/i }))
    await waitFor(() => expect(mocks.startCheckout).toHaveBeenCalled())
  })

  it('shows an error message if checkout fails', async () => {
    mocks.startCheckout.mockResolvedValue({ ok: false, message: 'Something went wrong starting checkout. Please try again.' })
    render(<EliteAcademyCard session={{ access_token: 't' }} />)
    fireEvent.click(screen.getByRole('button', { name: /unlock full potential/i }))
    expect(await screen.findByText(/something went wrong/i)).toBeInTheDocument()
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/components/promotionCenter/EliteAcademyCard.test.jsx`
Expected: FAIL — component does not exist.

- [ ] **Step 3: Write the implementation**

```jsx
// src/components/promotionCenter/EliteAcademyCard.jsx
import { useState } from 'react'
import { startCheckout } from '../../services/checkoutService.js'
import styles from './EliteAcademyCard.module.css'

const PERKS = [
  'Weekly PDF Reports',
  'Unlimited Missions',
  'Priority Skill Coaching',
  'Exclusive Avatar Gear',
]

export default function EliteAcademyCard({ session }) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleUpgrade = async () => {
    setLoading(true)
    setError('')
    const result = await startCheckout(session)
    if (!result.ok) {
      setError(result.message)
      setLoading(false)
    }
  }

  return (
    <div className={styles.card}>
      <h3 className={styles.heading}>Enroll in Elite Academy</h3>
      <p className={styles.price}>R149 <span className={styles.period}>/ month</span></p>
      <ul className={styles.perks}>
        {PERKS.map((perk) => <li key={perk} className={styles.perk}>{perk}</li>)}
      </ul>
      {error && <p className={styles.error} role="alert">{error}</p>}
      <button className={styles.cta} onClick={handleUpgrade} disabled={loading}>
        {loading ? 'Redirecting…' : 'Unlock Full Potential'}
      </button>
    </div>
  )
}
```

This is the *same* Buddy Pro entitlement as `UpgradePrompt` — no new trigger key is needed in `UpgradePrompt.jsx`'s `TRIGGERS` map, since this card doesn't use `UpgradePrompt` at all, it calls `startCheckout` directly with its own copy.

- [ ] **Step 4: Write `EliteAcademyCard.module.css`**

```css
.card {
  background: #0f1729;
  background-image: linear-gradient(135deg, #0f1729 0%, #1a2333 100%);
  border-radius: var(--r-lg, 34px);
  padding: 24px;
  color: #fff;
}

.heading {
  font-family: var(--font-head, sans-serif);
  color: var(--pc-gold, #D4AF37);
  font-size: 1.1rem;
  margin-bottom: 8px;
}

.price {
  font-family: var(--font-head, sans-serif);
  font-weight: 700;
  font-size: 1.75rem;
}

.period {
  font-size: 0.9rem;
  font-weight: 400;
  color: rgba(255,255,255,0.7);
}

.perks {
  list-style: none;
  margin: 16px 0;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.perk {
  font-size: 0.85rem;
  padding: 6px 12px;
  border-radius: 999px;
  background: rgba(255,255,255,0.08);
  width: fit-content;
}

.error {
  color: #ff8fa3;
  font-size: 0.8rem;
  margin-bottom: 10px;
}

.cta {
  width: 100%;
  padding: 14px;
  border-radius: var(--r-md, 24px);
  background: linear-gradient(135deg, #9D50BB, #6E48AA);
  color: #fff;
  font-weight: 700;
}

.cta:hover {
  filter: brightness(1.08);
}
```

- [ ] **Step 5: Run test to verify it passes**

Run: `npx vitest run src/components/promotionCenter/EliteAcademyCard.test.jsx`
Expected: PASS, 3 tests.

- [ ] **Step 6: Commit**

```bash
git add src/components/promotionCenter/EliteAcademyCard.jsx src/components/promotionCenter/EliteAcademyCard.module.css src/components/promotionCenter/EliteAcademyCard.test.jsx
git commit -m "feat: add EliteAcademyCard component"
```

---

### Task 11: `PromotionCenterPage`, routing, and `ParentPage` link

**Files:**
- Create: `src/pages/PromotionCenterPage.jsx`
- Create: `src/pages/PromotionCenterPage.module.css`
- Modify: `src/App.jsx`
- Modify: `src/pages/ParentPage.jsx`
- Test: `src/pages/PromotionCenterPage.test.jsx`

**Interfaces:**
- Consumes: `listChildren`, `getActiveChildId`, `setActiveChildId` (existing, from `childrenService.js`/`storage.js`), `useProgress` (existing), `RankStatusHeader`/`SkillTreeMap`/`TacticalPreview`/`EliteAcademyCard` (Tasks 7–10).

- [ ] **Step 1: Write the failing test**

```jsx
// src/pages/PromotionCenterPage.test.jsx
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'

const mocks = vi.hoisted(() => ({
  listChildren: vi.fn(),
  getActiveChildId: vi.fn(),
}))
vi.mock('../services/childrenService.js', () => ({ listChildren: mocks.listChildren }))
vi.mock('../utils/storage.js', async (importOriginal) => ({
  ...(await importOriginal()),
  getActiveChildId: mocks.getActiveChildId,
}))
vi.mock('../hooks/useProgress.js', () => ({ useProgress: () => ({ completions: new Set(), records: new Map(), markComplete: vi.fn() }) }))
vi.mock('../hooks/useChildRank.js', () => ({ useChildRank: () => ({ totalXp: 0, level: 1, rank: 'Recruit', xpIntoLevel: 0, xpToNextLevel: 100, loading: false }) }))

import PromotionCenterPage from './PromotionCenterPage.jsx'

describe('PromotionCenterPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.getActiveChildId.mockReturnValue('c1')
    mocks.listChildren.mockResolvedValue([{ id: 'c1', name: 'Ada', buddy_name: 'Buddy', avatar_type: 'bear', avatar_color: '#7c3aed' }])
  })

  it('renders the skill tree, rank header, tactical preview, and upgrade card once children load', async () => {
    render(
      <MemoryRouter>
        <PromotionCenterPage session={{ access_token: 't', user: { id: 'u1' } }} />
      </MemoryRouter>
    )
    expect(await screen.findByText(/operation iron blueprint/i)).toBeInTheDocument()
    expect(screen.getByText('Ada')).toBeInTheDocument()
    expect(screen.getByText(/live view/i)).toBeInTheDocument()
    expect(screen.getByText(/elite academy/i)).toBeInTheDocument()
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/pages/PromotionCenterPage.test.jsx`
Expected: FAIL — page does not exist.

- [ ] **Step 3: Write the implementation**

```jsx
// src/pages/PromotionCenterPage.jsx
import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { listChildren } from '../services/childrenService.js'
import { getActiveChildId, setActiveChildId } from '../utils/storage.js'
import { useProgress } from '../hooks/useProgress.js'
import RankStatusHeader from '../components/promotionCenter/RankStatusHeader.jsx'
import SkillTreeMap from '../components/promotionCenter/SkillTreeMap.jsx'
import TacticalPreview from '../components/promotionCenter/TacticalPreview.jsx'
import EliteAcademyCard from '../components/promotionCenter/EliteAcademyCard.jsx'
import SkipLink from '../components/SkipLink.jsx'
import { IconArrowLeft } from '../components/icons.jsx'
import styles from './PromotionCenterPage.module.css'

export default function PromotionCenterPage({ session }) {
  const navigate = useNavigate()
  const [children, setChildren] = useState([])
  const [activeId, setActiveId] = useState(() => getActiveChildId())
  const { completions } = useProgress()

  useEffect(() => {
    listChildren().then(setChildren).catch(() => {})
  }, [])

  const handleSwitchChild = (id) => {
    setActiveChildId(id)
    setActiveId(id)
  }

  const activeChild = children.find((c) => c.id === activeId) || children[0]

  return (
    <div className={styles.page}>
      <SkipLink />
      <main id="main">
        <div className={styles.header}>
          <button className={styles.backBtn} onClick={() => navigate('/parent')}>
            <IconArrowLeft size={16} /> Back to Dashboard
          </button>
          <h1 className={styles.title}>Promotion Center</h1>
        </div>

        <div className={styles.grid}>
          <aside className={styles.sidebar}>
            {activeChild && (
              <RankStatusHeader child={activeChild} allChildren={children} onSwitchChild={handleSwitchChild} />
            )}
          </aside>

          <section className={styles.hub}>
            <h2 className={styles.hubTitle}>6-Month Skill Tree</h2>
            <SkillTreeMap completions={completions} />
          </section>

          <aside className={styles.intel}>
            <TacticalPreview childName={activeChild?.name} />
            <EliteAcademyCard session={session} />
          </aside>
        </div>
      </main>
    </div>
  )
}
```

- [ ] **Step 4: Write `PromotionCenterPage.module.css`**

```css
.page {
  --pc-purple: #9D50BB;
  --pc-gold: #D4AF37;
  --pc-green: #27AE60;
  min-height: 100%;
  overflow-y: auto;
  background: #FDFDFF;
  background-image: radial-gradient(circle at top right, rgba(230, 210, 255, 0.4), rgba(255,255,255,0) 60%);
  padding: 20px;
}

.header {
  display: flex;
  align-items: center;
  gap: 16px;
  margin-bottom: 20px;
}

.backBtn {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 0.85rem;
  color: var(--ink-dim, #6b5d8f);
}

.title {
  font-family: var(--font-head, sans-serif);
  font-weight: 700;
  color: #2D3436;
  font-size: 1.4rem;
}

.grid {
  display: grid;
  grid-template-columns: 1fr;
  gap: 20px;
}

@media (min-width: 900px) {
  .grid {
    grid-template-columns: 15% 55% 30%;
  }
}

.hubTitle {
  font-family: var(--font-head, sans-serif);
  font-weight: 700;
  font-size: 1rem;
  margin-bottom: 14px;
  color: #2D3436;
}

.intel {
  display: flex;
  flex-direction: column;
  gap: 16px;
}
```

- [ ] **Step 5: Run test to verify it passes**

Run: `npx vitest run src/pages/PromotionCenterPage.test.jsx`
Expected: PASS, 1 test.

- [ ] **Step 6: Add the route in `App.jsx`**

Add the lazy import alongside the others:

```javascript
const PromotionCenterPage = lazy(() => import('./pages/PromotionCenterPage.jsx'))
```

Add the route in the "Authenticated" section, right after `/parent`:

```jsx
<Route path="/parent/promotion" element={session ? <PromotionCenterPage session={session} /> : <Navigate to="/" replace />} />
```

Add a dev-only preview route alongside the other `/dev-*` routes:

```jsx
<Route path="/dev-promotion" element={<PromotionCenterPage session={{ access_token: 'dev', user: { id: 'dev-preview' } }} />} />
```

- [ ] **Step 7: Link it from `ParentPage.jsx`**

In `src/pages/ParentPage.jsx`, add a banner right after the existing trial banners (after the `{tier === 'free' && ...}` block, before `{/* Tabs */}`):

```jsx
      <button className={styles.promotionBanner} onClick={() => navigate('/parent/promotion')}>
        <span>🎖️ See {settings.childName || 'your child'}'s rank and mission progress</span>
        <span aria-hidden="true">→</span>
      </button>
```

Add a matching rule to `ParentPage.module.css` (append to the file):

```css
.promotionBanner {
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: 100%;
  padding: 12px 18px;
  margin: 0 0 14px;
  border-radius: var(--r-md);
  background: var(--surface-tint);
  color: var(--ink);
  font-size: 0.85rem;
  font-weight: 600;
}
```

- [ ] **Step 8: Run the full test suite**

Run: `npm run test`
Expected: all tests pass, including the new `PromotionCenterPage.test.jsx`.

- [ ] **Step 9: Run the production build**

Run: `npm run build`
Expected: build succeeds with no new errors (a chunk-size warning for `livekit-client`/`index` is pre-existing and unrelated).

- [ ] **Step 10: Commit**

```bash
git add src/pages/PromotionCenterPage.jsx src/pages/PromotionCenterPage.module.css src/pages/PromotionCenterPage.test.jsx src/App.jsx src/pages/ParentPage.jsx src/pages/ParentPage.module.css
git commit -m "feat: add Promotion Center page, route, and dashboard link"
```

---

### Task 12: Document the sanctioned visual exception in `DESIGN.md`

**Files:**
- Modify: `DESIGN.md`

- [ ] **Step 1: Append a new section**

Add this section to `DESIGN.md`, after the existing `## Elevation & Depth` section (or at the end of the file if that section doesn't exist under that exact heading — check the file's current structure first and place it as its own top-level `##` section either way):

```markdown
## Promotion Center (sanctioned exception)

The Promotion Center (`/parent/promotion`) is a deliberate visual sub-brand, not drift from the system above — approved 2026-08-23 alongside the Tactical Specialist persona (see `docs/superpowers/specs/2026-08-23-promotion-center-design.md`). It mirrors how the child's tactical persona (9+ band) differs in tone from the gentle default persona: this is the parent-facing equivalent, scoped to exactly one route.

**Scope:** `src/pages/PromotionCenterPage.jsx` and everything under `src/components/promotionCenter/` only. Nothing outside that route uses these tokens.

**Palette:**
- Buddy Purple `#9D50BB` — primary accent (replaces grape on this route only)
- Academy Gold `#D4AF37` — elite/premium accents
- Tactical Green `#27AE60` — Commander rank, success states
- Deep Navy (`#0f1729` → `#1a2333` gradient) — the Elite Academy upgrade card
- Near-black (`#0a0a12`) — the Tactical Preview HUD frame only

**Typography:** Fredoka/Nunito as elsewhere (unchanged) for headings and body copy; **Roboto Mono** for numeric rank/XP stats only — the one new font on this route, loaded via Google Fonts alongside the existing faces.

These custom properties are declared locally on `PromotionCenterPage.module.css`'s `.page` class (`--pc-purple`, `--pc-gold`, `--pc-green`) — not added to `:root` in `src/index.css` — so they cascade to child components within this page's DOM subtree without becoming globally available tokens.
```

- [ ] **Step 2: Commit**

```bash
git add DESIGN.md
git commit -m "docs: document Promotion Center as a sanctioned design exception"
```

---

### Task 13: Full verification pass

- [ ] **Step 1: Run the full automated test suite**

Run: `npm run test`
Expected: all suites pass (existing + all new files from Tasks 1–12).

- [ ] **Step 2: Run the production build**

Run: `npm run build`
Expected: succeeds cleanly.

- [ ] **Step 3: Run the accessibility scan**

Run: `npm run dev` in one terminal, then in another: `npm run scan:a11y`
Expected: no new violations. (The existing `.pa11yci.json` URL list doesn't include `/parent/promotion` — add it if you want automated coverage of the new route: append `"http://localhost:5173/dev-promotion"` to the `urls` array, matching the existing `dev-parent`/`dev-courses` entries, then re-run.)

- [ ] **Step 4: Manual walkthrough**

With `npm run dev` running, visit `http://localhost:5173/dev-promotion` (bypasses auth via the dev-preview session, same as the other `/dev-*` routes) and confirm:
- The rank header shows a child avatar, "Recruit · Level 1", and an XP bar.
- The skill tree shows all 6 months; Month 1 shows real completion progress (0/4 until you complete missions via `/dev-lesson`), Months 2–6 show "Coming soon".
- The Tactical Preview panel renders the static dark HUD mock with the caption.
- The Elite Academy card shows R149/month and the perk list; clicking "Unlock Full Potential" attempts a checkout redirect (will error against `/api/payfast-create` without a real backend running locally — confirm the error message displays inline rather than crashing the page).
- From `/dev-parent`, the new "See your child's rank and mission progress" banner appears and navigates to the Promotion Center.

- [ ] **Step 5: Verify XP awarding end-to-end**

Complete a Month 1 mission via `/dev-lesson?course=robotics&lesson=mission-neural-uplink` through to the reward screen, then revisit `/dev-promotion` and confirm the rank header's XP total increased by the mastery score you earned, and the skill tree's Month 1 progress count increased by one. Complete the same mission again and confirm the XP total does *not* increase a second time (re-completion guard from Task 4).
