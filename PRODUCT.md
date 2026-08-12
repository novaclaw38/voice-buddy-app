# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Stack

React 18, Vite 5, React Router v6, Supabase (auth + Postgres), Vercel serverless functions (`api/*.js`), Groq LLM, Google Cloud TTS (fallback to browser Web Speech API), PayFast subscription billing (ZAR, South Africa). Tests: Vitest + @testing-library/react + jsdom. CSS Modules for component-scoped styles; global tokens and animation keyframes in `src/index.css`.

## Users

- **Child (end user, 3–10 years):** The primary daily user of Buddy. Opens the app to chat with Buddy, sing songs, hear stories, and take interactive courses. Uses voice-first interaction (mic button) and visual tap targets. Has a customizable Buddy avatar (type, color, name, costume) and a PIN-gated parent-settings gate.
- **Parent (buyer + admin):** The person who signs up, subscribes (Pro), and manages the household from the Parent Dashboard (`/parent`). Uses the parent-facing surface to check in via live camera, send voice messages, request custom bedtime stories, review chat history, set daily screen-time limits, manage children's profiles, and handle billing.

## Product Purpose

Buddy is a voice-first AI companion app for children that chats, tells stories, sings songs, and teaches interactive courses, paired with a parent dashboard for peace of mind. Success means a child is safely engaged (entertained + learning through natural conversation) while a parent remotely stays connected and in control via the parent dashboard.

## Positioning

Most kids' apps are either passive video or generic chatbots — neither safe for children nor paired with parent visibility. Buddy uniquely combines a child-safe AI companion with a full parent-presence surface (live camera streaming, instant voice messages, PIN-gated settings, print activity sheets, screen-time limits) in one subscription, delivered through conversational courses taught via voice dialogue rather than worksheets or screens.

## Operating Context

- A parent signs up and gets a 10-day free trial provisioned server-side (no card required). After trial, R149/month via PayFast (cancel anytime).
- The child opens `/app` (or the PWA on their device), sees their customized Buddy avatar, and speaks or taps to chat. Buddy has two conversational modes: **chat** and **sing**. No "story mode" or "wake word" exists yet.
- Parents access `/parent` to manage children profiles, check the live camera, send voice notes, review history, print activity sheets, set daily limits, and manage billing.
- Course lessons are gated behind Pro entitlement. Free-tier children get 10 chat messages/day.

## Capabilities and Constraints

### Implemented features
- Child chat interface with Buddy avatar (bear/cat/bunny/dog/robot/custom costumes), emotional states (idle/listening/speaking/thinking/happy/confused), squash/stretch + bounce animations, blinking, sparkle effects, time-of-day adaptive glow.
- Voice interaction: speech-to-text (browser Web Speech API or Groq), text-to-speech (Google Cloud TTS server-side or browser speechSynthesis).
- Word-by-word karaoke highlighting during Buddy's speech.
- Two conversational modes: **chat** and **sing**.
- Interactive courses: Gardening, Robotics, Science, Cooking, Animals, Space — each with multiple lessons containing structured step cards (explain, quiz, label, practice, explore, teach, activity, open-response, story-build, mastery-check).
- Printable worksheets and completion certificates (via `@media print` with visibility toggling).
- Reward screen with star-burst animation on lesson completion.
- Parent dashboard: child profile management, live camera streaming (WebRTC via Supabase Realtime channels), voice message recording and playback, custom bedtime story requests, chat history review, print sheets, subscription management (PayFast), PIN-protected settings.
- Screen-time limits (Pro): daily minute caps with 5-minute warning and gentle wind-down screen, PIN-gated.
- Daily activities (age-banded: young 3–5, middle 6–8, old 9–10).
- Parent PIN: hashed and stored, never in plaintext. Migration from any legacy plaintext PIN on first run.
- Progressive Web App: installable, standalone display mode, portrait orientation, iOS touch-icon support, safe-area insets for notches.

### Paywall
- Free tier: 10 chat messages/day, sing-along mode.
- Pro tier (trial → R149/month): unlimited messages, all courses + lessons, live camera, parent voice messages, progress/mastery tracking, avatar/costume customization, priority support.
- Entitlement is enforced server-side via `isEntitled()` in `api/_auth.js`. Client-side `isPro` from `useSubscription()` is a UX hint only.
- Free tier is restricted to `['chat', 'sing']` conversational modes (see `api/_auth.js` `FREE_MODES`).

### Technical constraints
- Mobile-first / tablet design: all tap targets ≥ 44px; primary device class is touch.
- Page scroll happens inside `.page` (body is `overflow: hidden`), not `window` — scroll listeners attach to the page element.
- `onAuthStateChange` callbacks must not await DB/auth calls (defer with `setTimeout` or fire-and-forget to avoid deadlocks).
- CSS custom property animation values are set inline (e.g., particle animation delay/duration).
- Vercel serverless functions in `api/` are plain ESM default-export handlers `(req, res)`, not bundled by Vite.
- Dev-preview routes (`/dev-*`) are stripped from production builds via `import.meta.env.DEV` guard.
- Fonts: Fredoka (headings) + Nunito (body), loaded from Google Fonts.

### Explicitly absent (known gaps)
- "Story mode" does not exist (only chat + sing).
- "10 activity modes" is not real (two modes exist).
- "Wake word" activation is not implemented (child taps the mic).
- Managing agent / enterprise features are not yet built.

## Brand Commitments

- **Name:** Buddy
- **Tagline:** "your child's AI best friend" / "Your child's AI buddy"
- **Product title:** Voice Buddy (app title on install)
- **Voice:** Warm, playful, reassuring — magical, always-on, child-friendly without being childish in parent-facing copy.
- **Visual identity:** "Candy" palette — grape (#7c3aed), pink (#ff6ba9), tangerine (#ff9a3c), mint (#3ddc97), sky (#4dadf7), sunny (#ffd23f). Fat border radii (16/24/34px). Soft chunky candy shadows. Squish effect on button press (`scale(0.93)` on `:active`). Fredoka (heading) + Nunito (body) fonts.
- **Mascot:** A bear/cat/bunny/dog/robot SVG character with two ears/eyes, customizable body color, emotional expressions, and costume overlays. Appears in the landing page hero, auth page, courses page header, lesson page, parent dashboard preview, and as the PWA icon.
- **Color usage:** Parent dashboard uses a calm neutral background (light purple gradient `#f7f6fb → #efedf6`); child-facing app uses the candy gradient background (`--bg-gradient`).
- **South African market:** ZAR pricing (R149/month), PayFast payment integration, "Made in South Africa" footer tagline.
- **Copy words to use:** peace of mind, buddy/companion, safe, kind, always-on, magical.
- **Copy words to avoid:** "monitoring," "surveillance," "AI chatbot" (generic/impersonal framing).

## Evidence on Hand

- Product marketing context: `.agents/product-marketing.md` (v1, 2026-07-30).
- Implementation plan (Phase 1 & Phase 2 scope): `docs/superpowers/plans/2026-07-31-mvp-monetization-readiness.md`.
- Lesson page design spec: `docs/superpowers/specs/2026-06-30-courses-lesson-page-design.md`.
- Visual assets: hero cloud backgrounds (`public/hero-clouds.webp`, `public/pricing-clouds.webp`), child home screenshot (`public/screenshots/child-home.webp`), course cover art (`public/courses/*.webp`), payment logos (`public/payment-logos/`).
- App icon: `public/icons/icon-192.png`, `icon-512.png`, `icon-maskable-512.png`.
- **No live tests, no analytics data, no real testimonials or customer logos in the codebase.**

## Product Principles

1. **Safety first, always.** Everything funnels through child-safe, always-kind interaction. Parent has full visibility and control.
2. **Voice-first for children.** A pre-reader can't navigate text-heavy UIs; voice narration, spoken quiz options, and voice messages are the primary interaction.
3. **Parent presence, not surveillance.** Camera and messages are opt-in, parent-initiated, and framed as peace-of-mind features — never monitoring.
4. **Mobile touch, not mouse.** Design for small hands: 44px+ tap targets, fat radii, big hit areas. Body scrolling is disabled; content scrolls inside `.page`.
5. **Server-side entitlement is the only real paywall.** Client `isPro` is a UX hint; API endpoints re-check every time.
6. **No false advertising.** Only advertise features that exist (chat + sing modes; 10-day trial; no card needed). Never claim "story mode," "10 activity modes," or "wake word."
7. **Make the boring delightful.** Print sheets, settings pages, and PIN entry all carry the candy aesthetic and squish interactions.

## Accessibility & Inclusion

- Global `prefers-reduced-motion: reduce` media query collapses all animations to effectively instant/one-shot (0.01ms duration, single iteration) without breaking animation-end-dependent logic.
- BuddyAvatar has a dedicated `!important` reduced-motion block because its per-state animation classes use higher specificity.
- App-wide color contrast targets WCAG AA (4.5:1 for body text; `--ink-dim` was deliberately darkened from the legacy value to pass).
- `inert` attribute used on hidden mobile nav to remove it from the tab order and accessibility tree.
- ARIA labels on icons (`role="img"` when `label` provided, `aria-hidden` otherwise).
- Form inputs have proper `label` + `htmlFor`, `autoComplete` attributes, and `minLength` validation.
- Touch targets: minimum 44px (`min-height: 44px` on buttons); phone mockup has safe-area insets.
