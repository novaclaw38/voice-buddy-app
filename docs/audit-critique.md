# Voice Buddy App: Audit & Critique

> **Status:** Critical Bug Found + General Audit
> **Date:** 2026-08-24
> **App:** `voice-buddy` — React/Vite child-focused learning app with LiveKit voice agents, Supabase backend, PayFast billing

---

## ⚠️ CRITICAL: Authentication is Broken in the Committed Code

**Every file that sends an auth header has `Authorization: *** ${token}` instead of `Authorization: *** ${token}`.**

This is confirmed in the **git history** — `git show HEAD:api/chat.js` returns `Authorization: *** ${key}`. The `***` redaction artifact is literally baked into the source code, not a display glitch.

### Files affected:
| File | Line | Impact |
|---|---|---|
| `api/chat.js` | 83 | Groq API auth fails — chat/buddy broken |
| `src/services/chatService.js` | 9 | Client auth headers invalid — `/api/chat` rejected |
| `src/services/checkoutService.js` | 12 | PayFast checkout auth fails — upgrades broken |
| `src/hooks/useSpeech.js` | 179 | TTS auth fails — voice output broken |

### Root cause
A security redaction tool (likely `sed` or a VS Code extension) replaced the `Bearer` prefix with `***` when scrubbing API keys. Since the redaction target was `Bearer ` and the template literal prefix was `Authorization: Bearer ${key}`, the tool replaced `Bearer ` → `***`, producing `Authorization: *** ${key}`. The code **compiles** (template literals don't validate content) and the **build succeeds** (Vite doesn't check string values).

### Why it wasn't caught
- **No lint script** in `package.json`
- **No TypeScript** in root (pure JS + Vite)
- **Tests pass** because they mock `fetch` and never inspect the actual header value
- **Build succeeds** because the invalid header is valid JS

### Fix
Replace `*** ` with `Bearer ` in all 4 files. Add a lint rule or type check to prevent regression.

---

## General Assessment

| Area | Grade | Notes |
|---|---|---|
| Test coverage | A | 248 tests, 46 files, all passing |
| Security architecture | A- | Server-side entitlements, proper RLS, robust webhook validation |
| Code quality & documentation | B+ | Excellent comments, some copy-paste debt |
| Build/bundling | B | 558KB livekit-client in main bundle |
| Dev tooling | D | No lint, no type-check, no CI workflow, hardcoded paths |

---

## Strengths (Genuinely Good Engineering)

### 1. Sophisticated `useSpeech.js`
- **Speak token pattern**: `speakTokenRef` prevents race conditions between concurrent `speak()` calls — a stale call's async continuation recognizes a newer call took over and bails
- **RAF-based word tracking**: `requestAnimationFrame` loop syncs word-highlight with audio playback, falling back to Web Speech `onboundary` events
- **Dual-path TTS fallback**: Google TTS with automatic browser Web Speech fallback on failure, with console warnings for debuggability
- **STT timeout + deliver flag**: `stopListening({ deliver: true })` lets a child tap the mic again to end listening and still get transcript results

### 2. Production-grade PayFast webhook (`api/payfast-webhook.js`)
- ITN signature validation (MD5 with passphrase)
- PayFast postback verification (`https://www.payfast.co.za/eng/query/validate`)
- Dedupe via unique `pf_payment_id` table (prevents double-processing)
- Amount allowlisting (only R0 trial setup or R149 recurring)
- Subscription state updates are idempotent (upsert on conflict)

### 3. Server-side security architecture
- **`isEntitled()`** in `api/_auth.js` checks Supabase using the **service role** — clients can never forge access
- **RLS lockdown** (`2026-07-04-lock-down-subscriptions.sql`): subscriptions table is read-only for clients; writes go through service-role API endpoints only
- **Trial insertion policy** (`2026-07-02-1-bound-subscription-trial-insert.sql`): constrains INSERT to only valid trial rows with `trial_end <= trial_start + interval '10 days'`
- **`bump_child_xp`** RPC: security-definer function with ownership check — clients can't set arbitrary XP values
- **Camera realtime scoping** (`2026-06-29-2-camera-realtime-authorization.sql`): channels scoped to `camera-<uid>`

### 4. Excellent inline documentation
Comments explain *why*, not just *what*. Examples:
- `src/index.css`: 60+ lines of comments explaining the print `visibility` trick and the `@media (prefers-reduced-motion)` policy
- `src/components/ChildPage.jsx`: Detailed comments on idle nudge UX strategy
- `api/_courseData.js`: Explains the Vercel Hobby 12-function limit and why course data lives in a non-function directory

### 5. Comprehensive test suite (248/248 passing)
- Co-located tests (e.g., `src/utils/rank.test.js`, `src/hooks/useProgress.test.js`)
- `jest-axe` a11y integration in component tests (SettingsTab, LandingPage, LessonPage)
- Edge-case coverage: speak token cancellation, rate limit fallback, drag-and-drop budget rules, payment webhook dedupe

---

## Problems

### 1. The `***` auth header bug (CRITICAL — see above)

### 2. Identity crisis: solo app with enterprise admin tooling
The admin panel is **500+ lines** of sophisticated tooling (ban/unban, revenue charts, subscription management, user deletion) for what's explicitly a "solo-owner app." The `ADMIN_EMAIL` is hardcoded to `rebawntech@gmail.com` in both client (`App.jsx:26`) and server (`api/_admin.js:6`).

**Risk:** String drift — if the email changes in one place but not the other, the client-side guard passes but the API rejects the request (or vice versa).

**Hardcoded dev path in `vite.config.js:22`:**
```js
'/home/byron/.cache/**',
```
"Byron" isn't the current user (`/home/rebawn`). This path leaks local dev environment state into committed config.

### 3. No lint, no type-check, no CI
`package.json` scripts: `"dev"`, `"build"`, `"test"`, `"scan:a11y"` — but **no `"lint"` or `"type-check"`**.

Consequences:
- The `***` auth bug compiles and ships
- Hardcoded `/home/byron/` path passes unchecked
- No catching `Authorization: *** ${key}`` syntax errors
- No pre-commit hooks or CI workflow visible in the repo

### 4. 558KB `livekit-client` in main bundle
```
dist/assets/livekit-client.esm-CNzJuBFO.js    558.36 kB │ gzip: 145.67 kB
```
LiveKit is gated behind `VITE_USE_LIVEKIT_AVATAR_VOICE` env var, but the import is **not lazy-split**. Every user downloads the entire WebRTC framework for an opt-in feature.

**Fix:** Dynamic import:
```js
if (useLiveKit) {
  const { RoomServiceClient, AccessToken } = await import('livekit-server-sdk')
}
```

### 5. The `.impeccable` config documents inconsistencies instead of enforcing consistency

The 242-line ignore config is thorough but mostly justifies deviations from the design system:
- **Purple is banned** ("LILA BAN") but the entire app uses `#7c3aed` (grape)
- **Roboto Mono** in Promotion Center violates the Fredoka/Nunito font stack
- **Purple gradient shadows** everywhere (the design system's own shadow rule)

These aren't "exceptions" — they're the design system being inconsistent with itself, and the ignore rules paper over it.

### 6. Dev preview routes (minor security smell)
Routes `/dev-child`, `/dev-courses`, `/dev-parent`, `/dev-promotion`, `/dev-lesson` bypass auth entirely. They're gated by `import.meta.env.DEV` in `App.jsx:89`, which Vite should strip from production builds. But:
- They're included in `.pa11yci.json` accessibility scans, meaning they're being verified in test
- If `NODE_ENV` is misconfigured in CI, these routes are live and auth-bypassing

---

## Quick Wins

| Priority | Issue | Fix | Effort |
|---|---|---|---|
| **P0** | `***` auth header bug | `sed -i 's/*** /Bearer /g'` on the 4 affected files | 5 min |
| **P0** | Add lint check | Add `eslint` + `lint` script; add to CI | 30 min |
| **P1** | Hardcoded `/home/byron/` path | Remove or parameterize in `vite.config.js` | 5 min |
| **P1** | `livekit-client` bundle | Dynamic import behind `VITE_USE_LIVEKIT_AVATAR_VOICE` flag | 15 min |
| **P2** | `ADMIN_EMAIL` drift | Move to `process.env.ADMIN_EMAIL` with validation | 10 min |

---

## Files Referenced

- `package.json` — scripts, dependencies
- `src/App.jsx` — routing, auth flow, dev preview routes, `ADMIN_EMAIL`
- `src/services/chatService.js` — auth header bug
- `src/hooks/useSpeech.js` — auth header bug, sophisticated speech logic
- `src/services/checkoutService.js` — auth header bug
- `api/chat.js` — auth header bug, Groq proxy, rate limiting
- `api/_auth.js` — entitlement checks, rate limiting RPC
- `api/_admin.js` — admin auth, tier computation
- `api/admin/index.js` — admin API endpoints
- `api/payfast-webhook.js` — payment webhook with signature validation
- `api/payfast-create.js` — subscription setup
- `api/payfast-cancel.js` — subscription cancellation
- `api/payfast-update-payment.js` — payment method update
- `api/ensure-trial.js` — trial provisioning (service role)
- `api/lesson.js` — lesson content (Pro-gated)
- `api/courses.js` — course catalog
- `api/livekit-agent.js` — LiveKit room/token management
- `src/index.css` — global styles, design tokens, reset
- `src/lib/supabase.js` — Supabase client (anon key)
- `src/hooks/useSubscription.jsx` — subscription state context
- `src/services/childrenService.js` — multi-child profile management
- `src/services/signalsService.js` — daily emotional signals
- `src/pages/AdminPage.jsx` — admin dashboard UI
- `src/components/parentTabs/CameraTab.jsx` — parent camera check-in
- `src/components/WorldBackdrop.jsx` — time-of-day backdrop
- `vercel.json` — SPA rewrite rule
- `.env.example` — environment variable documentation
- `.impeccable/config.json` — design system compliance rules
- `.impeccant/design.json` — design token specification
- `.pa11yci.json` — accessibility test configuration
- `supabase/migrations/*.sql` — 16 database migrations
- `vite.config.js` — Vite + Vitest config (contains hardcoded path)
