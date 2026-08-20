# Admin dashboard expansion — design

Date: 2026-08-20
Status: Approved

## Background

[2026-08-02-admin-page-design.md](./2026-08-02-admin-page-design.md) shipped the base
admin surface: user list, tier/signup stats, cancel-subscription. Since then the
overview and cancel-subscription endpoints were merged into a single
`api/admin/index.js`, routed by HTTP method, to stay under Vercel's Hobby-plan
12-Serverless-Function cap (the repo is at exactly 11 top-level `api/*.js` files +
`api/admin/index.js` = 12 today).

The owner now wants the dashboard to cover full app management and financial
tracking: revenue visibility (there is currently no persisted payment history at
all — `payfast-webhook.js` receives each charge's amount but only ever updates the
`subscriptions` row, never logs the individual payment), plus the ability to
manually grant/extend Pro access, ban or permanently delete a user, and drill into
one user's detail (payments, children, lesson activity).

Course/lesson content management remains out of scope, as in the original spec.

## Function-count constraint

No new files may be added under `api/` (excluding `_`-prefixed helpers, which
Vercel doesn't count as functions). Every new admin capability is added to
`api/admin/index.js` as either a new `GET` query-param branch or a new `action`
value in the `POST` body, not a new route file.

## Data model

New migration, `supabase/migrations/2026-08-20-create-payments-ledger.sql`:

```sql
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
-- No policies defined: RLS-enabled + zero policies blocks anon/authenticated
-- entirely (matches subscriptions' pattern). Only the service role (webhook,
-- admin API) ever reads or writes this table.

create index payments_user_id_idx on public.payments (user_id);
create index payments_created_at_idx on public.payments (created_at desc);
```

`user_id` is `ON DELETE SET NULL`, not cascade — deleting a user must not erase
their payment history. This matches the existing promise in
`DataDeletionPage.jsx`: "Payment records required for tax, accounting, or
fraud-prevention purposes may be retained for a limited period as required by law,
even after account deletion."

`subscriptions.user_id` has no cascade on its FK to `auth.users` (unchanged by this
spec). The admin delete-user action must therefore delete the `subscriptions` row
itself before calling `auth.admin.deleteUser`, or the FK will reject the deletion.

Ban/unban uses Supabase's built-in `auth.users.banned_until` via
`auth.admin.updateUserById` — no schema change.

## Webhook change

`api/payfast-webhook.js`: after each of the three existing branches (`COMPLETE` +
amount ≥ 149, `COMPLETE` trial setup, `CANCELLED`/`FAILED`), insert one row into
`payments`:

- `pf_payment_id`: `body.pf_payment_id` (already validated non-null earlier in the
  handler; the pre-existing dedupe insert into `payfast_webhook_events` guarantees
  this handler only reaches this point once per `pf_payment_id`, so the insert here
  cannot conflict).
- `user_id`: `body.m_payment_id`.
- `amount`: the already-parsed `amount` float.
- `status`: `'complete'` | `'failed'` | `'cancelled'` (lowercased from
  `payment_status`, collapsing anything not `COMPLETE`/`CANCELLED`/`FAILED` — there
  are none today — to `'failed'`).
- `payment_type`: `'recurring'` when `amount >= 149`, else `'trial_setup'`.

This insert happens unconditionally for every ITN that reaches this point (i.e.
after signature verification and PayFast postback validation), so the ledger
reflects everything PayFast told us, including failed/cancelled attempts — not just
successful charges.

## API — `api/admin/index.js`

### `GET /api/admin` (overview, extended)

Adds to the existing response:

```json
{
  "stats": {
    "revenue": {
      "total": 4171.00,
      "mrr": 745.00,
      "byDay": [{ "date": "2026-07-21", "amount": 149.00 }, ...]
    },
    "failedPayments30d": 2
  }
}
```

- `total`: sum of `amount` across all `payments` where `status = 'complete'`.
- `mrr`: `tierCounts.pro * 149` (a live proxy from current active-Pro count, not a
  sum of the last 30 days of payments — simpler and not skewed by uneven billing
  dates).
- `byDay`: sum of `complete` payment amounts per day, last 30 days, same
  zero-filled bucketing style as `signupsByDay`.
- `failedPayments30d`: count of `payments` in the last 30 days where
  `status != 'complete'`.

### `GET /api/admin?userId=<id>`

New branch. After `requireAdmin`, returns:

```json
{
  "payments": [{ "id", "amount", "status", "paymentType", "createdAt" }],
  "children": [{ "id", "name", "buddyName", "avatarType", "avatarColor" }],
  "lessonActivity": [
    { "childId", "childName", "completions": 12, "avgMastery": 78 }
  ]
}
```

`payments` filtered by `user_id`, newest first. `children` by `user_id`.
`lessonActivity` groups `lesson_completions` by `child_id`, joined to the child's
name, with `count(*)` and `avg(mastery_score)` (nulls excluded from the average).

### `POST /api/admin` (action-routed)

Body always includes `action`. Existing cancel behavior is preserved verbatim,
just moved under this key:

- `{ action: 'cancelSubscription', userId }` — unchanged logic from today's
  `handleCancelSubscription`.
- `{ action: 'grantPro', userId, endDate }` — upserts `subscriptions` with
  `status: 'active'`, `subscription_end: endDate` (ISO date string from the
  client's date picker). No validation that `endDate` is in the future — the admin
  is trusted to set a sane value, same trust level as the rest of this surface.
- `{ action: 'banUser', userId }` — `auth.admin.updateUserById(userId, {
  ban_duration: '876000h' })` (~100 years; Supabase's documented convention for an
  effectively-permanent ban).
- `{ action: 'unbanUser', userId }` — same call with `ban_duration: 'none'`.
- `{ action: 'deleteUser', userId }` — deletes the `subscriptions` row for
  `userId`, then `auth.admin.deleteUser(userId)`. `children` and
  `lesson_completions` cascade automatically (existing FKs); `payments` rows are
  retained with `user_id` set to `null` by the FK's `ON DELETE SET NULL`.

Unknown `action` values return 400.

## Client

### `src/services/adminService.js`

Adds, following the existing `request()` helper and error-throwing convention:

- `fetchUserDetail(userId)` → `GET /api/admin?userId=...`
- `grantPro(userId, endDate)` → `POST /api/admin { action: 'grantPro', userId, endDate }`
- `banUser(userId)` / `unbanUser(userId)` → `POST /api/admin { action, userId }`
- `deleteUser(userId)` → `POST /api/admin { action: 'deleteUser', userId }`
- `cancelSubscription(userId)` body gains `action: 'cancelSubscription'` (API
  contract change; the function's external signature is unchanged).

### `src/pages/AdminPage.jsx`

- New "Revenue" stats row (reusing `statCard`/`statValue`/`statLabel` styles from
  the existing tier-counts row): Total revenue, MRR, Failed payments (30d).
- New bar chart, visually identical to the existing signup chart, for revenue by
  day.
- New "Recent transactions" table below the revenue chart: last 50 `payments`
  joined to user email client-side (via the existing `users` list already in
  state), newest first — Date, Email, Amount, Status, Type.
- User table gets a "View" link per row to `/admin/users/:id`, and inline
  Ban/Unban + Delete buttons alongside the existing Cancel-subscription button,
  following the same `actioningId`/`rowErrors` pattern `handleCancel` already
  uses (renamed generically since multiple action types now share it).
- Delete confirms via `window.confirm` with explicit "permanently delete" wording,
  consistent with the existing cancel-subscription confirm.

### `src/pages/AdminUserDetailPage.jsx` (new, + `.module.css`)

Route `/admin/users/:id`, guarded in `App.jsx` with the same
`session?.user?.email === ADMIN_EMAIL` ternary pattern used for `/admin` (not
extracted into a shared guard component — two occurrences isn't enough to justify
the indirection).

Layout:
- Header: email, signup date, current tier/status, back-to-admin link.
- Grant/extend Pro: a `<input type="date">` + button.
- Ban/Unban and Delete buttons (same actions as the table row, for when you're
  already on this page).
- Payment history table.
- Children list (name, buddy name, avatar).
- Lesson activity summary, one row per child (completions, avg mastery).

## Error handling

Same per-row/per-action pattern as today's `handleCancel`: a loading flag scoped
to the action being performed, an inline error via `role="alert"` next to the
control on failure, no global toasts, no silent failures. Successful mutations
update local state directly (remove the row for delete, flip status for
ban/cancel, update `subscriptionEnd` for grant) rather than triggering a full
reload — consistent with the existing `handleCancel` implementation.

`GET /api/admin?userId=<id>` for a `userId` with no matching auth user returns 404
with a generic message; the detail page shows a "user not found" state instead of
a table body.

## Testing

- `api/admin/index.test.js`: one success + one failure case per new `action`, plus
  the `userId` detail branch, plus the 400-unknown-action case. Mirrors the
  existing GET/POST test structure in that file.
- `api/payfast-webhook.test.js` (new — none exists today, so this also covers the
  existing behavior): the three status branches, asserting a `payments` row is
  inserted with the right `status`/`payment_type`/`amount` in each case.
- `src/services/adminService.test.js`: one test per new function, same
  mocked-`fetch` pattern as `fetchOverview`/`cancelSubscription`.
- `src/pages/AdminPage.test.jsx`: extend for the revenue stats row, transactions
  table, and the new row actions (ban/delete) rendering and firing correctly.
- `src/pages/AdminUserDetailPage.test.jsx` (new): render with mocked
  `fetchUserDetail`, assert payments/children/lesson sections render, assert
  grant/ban/delete actions call the right service functions.
- No new e2e/browser test — manual verification in dev via `/admin` with the real
  admin email, matching the original spec's testing approach.
