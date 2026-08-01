# Admin page — design

Date: 2026-08-02
Status: Approved

## Background

Voice Buddy has no admin/back-office surface today. The owner (rebawntech@gmail.com)
needs a way to see who's signed up, what tier they're on, cancel a subscription on
someone's behalf (support cases), and glance at growth stats — without going into the
Supabase dashboard for routine checks.

Course/lesson content management is explicitly **out of scope**: courses live as a
hardcoded array in `api/_courseData.js`, and building an editor for that nested
structure (or migrating it to a DB schema first) is a separate, much larger project.
This spec covers only: view users & subscriptions, cancel a subscription, and view
signup/tier stats.

## Access control

Single hardcoded admin email, checked server-side on every admin API call — this is
the actual security boundary. `api/_admin.js` exports `requireAdmin(req)`:

```js
const ADMIN_EMAIL = 'rebawntech@gmail.com'

export async function requireAdmin(req) {
  const user = await getUser(req)
  if (!user || user.email !== ADMIN_EMAIL) return null
  return user
}
```

Each admin endpoint calls this first and returns 403 if it's null. The client route
guard in `App.jsx` checks `session?.user?.email === 'rebawntech@gmail.com'` before
rendering `AdminPage` (redirect to `/app` otherwise) — this is a UX nicety only, not
a security boundary, since the API is what actually enforces access.

No nav link is added anywhere in the regular app. `/admin` is reached by typing the
URL directly, consistent with a single-owner admin model.

## API

### `GET /api/admin/overview`

One combined endpoint (low-traffic, solo-owner — no need for separate round trips).
After `requireAdmin`:

1. `supabase.auth.admin.listUsers()` (service role — the only place emails and
   signup timestamps are legally readable; the client-side `subscriptions` table has
   no email column by design).
2. `SELECT * FROM subscriptions` (service role bypasses RLS).
3. Join in memory by `user_id`. For each user compute `tier` (`'free' | 'trial' |
   'pro'`) using the same status/date logic already duplicated in
   `useSubscription.jsx` and `api/_courseData.js`'s `isEntitled` — inlined here
   rather than extracted into a shared module, since it's ~10 lines and pulling it
   into a shared import across the `src`/`api` boundary isn't worth the indirection
   for one more callsite.
4. Compute stats from the same in-memory data:
   - `signupsByDay`: count of `auth.users.created_at` bucketed by day, last 30 days.
   - `tierCounts`: `{ free, trial, pro }` counts across all users.

Response shape:

```json
{
  "users": [
    { "id", "email", "createdAt", "tier", "trialEnd", "subscriptionEnd", "status" }
  ],
  "stats": {
    "signupsByDay": [{ "date": "2026-07-04", "count": 3 }, ...],
    "tierCounts": { "free": 12, "trial": 4, "pro": 7 }
  }
}
```

Users with no `subscriptions` row (shouldn't normally happen post-`ensure-trial`,
but possible for brand-new signups mid-provisioning) are treated as `tier: 'free'`,
`status: null`.

### `POST /api/admin/cancel-subscription`

Body: `{ userId }`. After `requireAdmin`, this is the same PayFast-cancel flow as
`api/payfast-cancel.js` (look up `payfast_token`, call PayFast's cancel endpoint if
present, update `subscriptions.status = 'cancelled'`), parameterized by the target
`userId` instead of the caller's own id. The PayFast signature-building helper is
duplicated from `payfast-cancel.js` rather than extracted — both files are small and
self-contained, and a shared module would be the only thing connecting two otherwise
independent request handlers.

If the target user has no subscription row, or is already cancelled, respond
`{ ok: true, alreadyCancelled: true }` same as the existing endpoint.

## Client

`src/pages/AdminPage.jsx` (+ `AdminPage.module.css`), route `/admin` added to
`App.jsx` next to the other authenticated routes, guarded as described above.

`src/services/adminService.js`:
- `fetchOverview()` → `GET /api/admin/overview`
- `cancelSubscription(userId)` → `POST /api/admin/cancel-subscription`

**Layout**, reusing the visual language of `ParentPage` (plain CSS module, no new
dependency):

- Header: "Admin" + total user count.
- Stats row: three cards — Free / Trial / Pro counts — plus a simple bar/sparkline
  of signups for the last 30 days (bars sized by day count, no charting library).
- User table: Email, Signed up, Tier (badge), Status, Trial/Sub end date, Action
  column with a "Cancel subscription" button (shown only when `tier` is `trial` or
  `pro` and `status` isn't already `cancelled`). Clicking confirms
  (`window.confirm`) then calls `cancelSubscription`, optimistically updates the row
  to `cancelled` on success, shows an inline error on failure.
- A text search box filtering the table client-side by email substring (no
  server-side search needed at this scale).

## Error handling

- `requireAdmin` failure → 403 with a generic message; the client redirects to
  `/app` rather than showing an error, since a non-admin should never see this page
  at all (mirrors the existing dev-route pattern of just not being reachable).
- `listUsers()` or DB errors on `/api/admin/overview` → 500, client shows a retry
  button (no partial-render — either the whole page loads or it shows an error
  state, consistent with the DB-driven pages elsewhere in the app like
  `CoursesPage`).
- Cancel failures (PayFast unreachable, etc.) → same messages as
  `payfast-cancel.js` today, surfaced inline next to that row rather than a global
  toast.

## Testing

- Unit test `api/admin/overview.js` and `api/admin/cancel-subscription.js` for the
  403 path (non-admin / no session) — matches the existing pattern of testing
  auth-gated API handlers (`api/lesson.test.js`).
- No new e2e/browser test; manual verification in dev via `/admin` with the real
  admin email.
