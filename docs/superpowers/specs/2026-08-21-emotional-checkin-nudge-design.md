# Emotional check-in nudge — design

Date: 2026-08-21
Status: Approved

## Background

[2026-08-21-competitor-feature-research.md](../../research/2026-08-21-competitor-feature-research.md)
(produced via the new `research-competitor-features` skill) flagged real-time
distress/wellbeing signaling as the one gap across 8 reviewed kids'
AI-companion apps that most directly matches Buddy's own "peace of mind, not
surveillance" positioning. The brainstorming session that followed scoped it
down from a full alert system to a lightweight, dashboard-only nudge: if
Buddy notices something a parent would want to know about, surface a soft
banner in the Parent Dashboard — never a push notification, never a raw
transcript excerpt.

Decided during brainstorming: **free tier**, not Pro-gated. Every other
advanced capability in the app is gated via `FREE_MODES` in `api/_auth.js`,
but this one is part of the core safety promise, not a monetization lever.

## Correction to the initial sketch: no new serverless function

The brainstorming session's design sketch proposed "a new `api/` endpoint,
decoupled from the live chat turn." Two things about the actual codebase
make that the wrong shape:

1. **This repo has no server-side chat/history pipeline to hook into.**
   `api/chat.js` is a stateless proxy to Groq — it doesn't persist anything.
   History is written directly from the browser to Supabase
   (`src/services/historyService.js`'s `addHistory()`, called from
   `useChat.js`'s `sendMessage`), using the user's own Supabase session, not
   a service-role server call. There is no server-side "turn stored" event to
   trigger a follow-up job from.
2. **The repo is already at Vercel's Hobby-plan 12-serverless-function cap**
   (documented in
   [2026-08-20-admin-dashboard-expansion-design.md](./2026-08-20-admin-dashboard-expansion-design.md)'s
   "Function-count constraint" section, and still true today: 11 top-level
   `api/*.js` files + `api/admin/index.js` = 12). A new `api/classify.js`
   would break the build.

Both are addressed by reusing `api/chat.js` itself with a new `mode` value
(`'classify-checkin'`), the same way `api/admin/index.js` multiplexes
actions instead of adding files — and doing the "decoupled from the live
turn" part client-side: fire-and-forget, never awaited by the UI, exactly
matching how `addHistory()` already fires-and-forgets today.

## A second gap this surfaced: `history` isn't child-scoped

`historyService.addHistory()` writes `user_id`, `mode`, `user_text`,
`buddy_text`, `ts` — no `child_id`. The 2026-07-29 multi-child-profiles
migration added `child_id` to `lesson_completions` but never extended
`history` the same way, so multi-child accounts have no way to attribute a
past chat turn to a specific child from the `history` table alone. This is a
pre-existing gap, not something this feature needs to fix — but it does mean
`daily_signals` (below) must get its `child_id` from the client's
`getActiveChildId()` at classification time (the same source `ChildPage`
already uses), not by joining through `history`. Flagging this now in case
it's worth a real fix later; out of scope here.

## Data model

New migration, `supabase/migrations/2026-08-21-create-daily-signals.sql`:

```sql
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

Client-owned via `auth.uid() = user_id`, same pattern as `children` (not
`subscriptions`' service-role-only pattern — there's no fraud/entitlement
sensitivity here). The `unique (user_id, child_id, signal_date)` constraint
is what makes "one signal per child per day" a DB-level guarantee: the
client always upserts (`onConflict: 'user_id,child_id,signal_date'`), so a
second classification later the same day overwrites rather than duplicates.
No delete policy — dismissal is `dismissed = true`, not a row delete, so
there's a record if this ever needs a "how often does this fire" sanity
check.

## Detection: keyword pre-filter + LLM confirmation

Running an LLM classification call on every single message would roughly
double Groq spend for zero benefit on the ~99% of turns with nothing to
flag. Two-stage instead:

1. **Client-side keyword pre-filter**, new pure function `hasConcernSignal()`
   in `src/utils/emotionalSignal.js`, same shape as `topics.js`'s
   `STOPWORDS`/`extractTopics()`: a `CONCERN_WORDS` set (sad, scared, cry,
   alone, bully, hurt, hate myself, etc.) checked against the child's
   message. Free, synchronous, no network call. This is a coarse filter, not
   the final verdict — false positives are fine, false negatives just mean a
   later message catches it.
2. **Only on a hit**, and only if today's `daily_signals` row doesn't
   already exist for the active child (one cheap `select`), call
   `chatCompletion([...], { mode: 'classify-checkin' })` with a short system
   prompt asking for strict JSON: `{"concern": boolean, "blurb": string}`,
   over just the current message (not a multi-turn history fetch — keeps it
   fast and cheap). Parse defensively; a parse failure or `concern: false`
   means no write happens.

This runs from `useChat.js`'s `sendMessage`, fired-and-forgotten right after
the existing `addHistory()` call — never awaited, wrapped in its own
try/catch, any failure just means no nudge, never a surfaced error to the
child or a blocked chat turn.

## `api/chat.js` and `api/_auth.js` changes

- `api/_auth.js`: add `'classify-checkin'` to `FREE_MODES` — this keeps it
  off `isProMode()`'s Pro-required path, matching the free-tier decision.
- `api/chat.js`: the existing free-tier daily message cap
  (`FREE_CHAT_LIMIT_PER_DAY`, 10/day) must **not** count classify-checkin
  calls — this is a background safety check, not chat quota, and burning a
  child's free messages on it would be a real regression. Branch on
  `mode === 'classify-checkin'`: skip the `chat-free-1d` `allowRequest` call
  entirely, and instead apply its own small independent limit —
  `allowRequest(user.id, 'classify-1d', 20, 86400)` — as a cost guard against
  a runaway client bug, not a real usage cap (20/day is far above what the
  "skip if today's row already exists" check should ever let through).

## Client

### `src/utils/emotionalSignal.js` (new)

- `CONCERN_WORDS` set + `hasConcernSignal(text)`, pure, same style as
  `topics.js`.
- `buildClassifyPrompt(childName, text)` — the system prompt asking for the
  `{"concern", "blurb"}` JSON shape, kid-context-aware (told it's evaluating
  one message from a child talking to their AI companion, blurb should be
  gentle/non-alarming and parent-facing, under ~120 chars).

### `src/services/signalsService.js` (new)

Following `historyService.js`'s conventions exactly (`supabase.auth.getUser()`
guard, throw on error):

- `fetchTodaySignal(childId)` → `select * from daily_signals where
  user_id = <self> and child_id = childId and signal_date = today() and
  dismissed = false` → single row or null.
- `upsertSignal({ childId, blurb })` → upsert on
  `(user_id, child_id, signal_date)`.
- `dismissSignal(id)` → `update daily_signals set dismissed = true where
  id = id`.

### `src/hooks/useChat.js`

After the existing `addHistory({...})` call in `sendMessage`, add:

```js
maybeFlagEmotionalSignal(userText, currentM).catch(() => {})
```

`maybeFlagEmotionalSignal` (new, same file — small enough not to warrant its
own module, mirrors how `formatHistoryMemory`/`formatLessonsMemory` already
live inline here): checks `hasConcernSignal`, checks
`fetchTodaySignal(getActiveChildId())`, calls `chatCompletion` with
`mode: 'classify-checkin'`, parses the JSON, calls `upsertSignal` on a
confirmed hit. Every step short-circuits silently on any falsy/error
result — no code path here should ever throw into `sendMessage`'s own
try/catch.

### `src/pages/ParentPage.jsx`

New banner, shell-level (visible across tabs, like the existing trial
banner), fetched once on mount via `fetchTodaySignal(getActiveChildId())`:

```jsx
{signal && (
  <div className={styles.signalBanner}>
    <span>{signal.blurb} Want to check in?</span>
    <button onClick={() => setTab('History')}>Review chats</button>
    <button onClick={handleDismissSignal} aria-label="Dismiss">✕</button>
  </div>
)}
```

Styled distinctly from `trialBanner` (soft/reassuring, not urgent — no red,
no exclamation framing, matching the copy guidance `PRODUCT.md` already
states against "monitoring"/"surveillance" language). `handleDismissSignal`
calls `dismissSignal(signal.id)` then clears local state — same
optimistic-local-update pattern the admin dashboard spec uses for its row
actions, no full reload.

## Failure mode

Any error anywhere in the detection pipeline (keyword check, Supabase read,
Groq call, JSON parse, upsert) results in silent no-op — no row written, no
nudge shown, nothing surfaced to the child or a console error visible to
either the child or parent. This is a soft feature; failing open (never
showing a signal) is always preferable to failing loud.

## Testing

- `src/utils/emotionalSignal.test.js` (new): `hasConcernSignal()` boundary
  cases (hit, near-miss, empty string, case-insensitivity), same style as
  `topics.test.js`.
- `src/services/signalsService.test.js` (new): one test per function, mocked
  Supabase client, same pattern as `historyService` tests would follow.
- `src/hooks/useChat.test.js`: extend for `maybeFlagEmotionalSignal` —
  keyword-miss does not call `chatCompletion`; keyword-hit + existing
  today's-row skips the call; keyword-hit + no existing row + `concern:
  true` response calls `upsertSignal`; any thrown error inside it never
  reaches `sendMessage`'s caller.
- `api/chat.test.js` (new — no test file exists for this endpoint today, so
  this also covers existing behavior): classify-checkin mode is free-tier
  (no `PRO_REQUIRED`), does not consume `chat-free-1d`, is capped by its own
  `classify-1d` bucket.
- `src/pages/ParentPage.test.jsx`: extend for the signal banner rendering
  when a signal exists, not rendering when absent/dismissed, and the dismiss
  button calling `dismissSignal` + clearing local state.
- Live verification: same limitation noted in the 2026-08-17 architecture
  review for anything needing a real Supabase-authenticated session —
  dev-preview routes use a fake session, so the actual classify → upsert →
  banner round trip needs a manual check against a real account, not
  dev-preview. Automated tests + code review cover the rest, matching the
  bar already accepted for Candidate A's WebRTC work.
