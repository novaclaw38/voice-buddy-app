# Promotion Center (Parent Dashboard)

## Context

Subproject 1 (Tactical Specialist persona + "Operation Iron Blueprint" Month 1 curriculum) shipped with sing mode removed and the 4-mission robotics content live for 9+ children. That work deliberately deferred any rank/XP tracking or parent-facing progress dashboard, since the original master doc bundled several independent subsystems into one document.

This spec covers subproject 3: a parent-facing "Promotion Center" that visualizes a child's progress through the 6-month curriculum, shows their tactical rank, and surfaces the Buddy Pro upgrade in the same tactical framing. Source material is a stakeholder-provided UI spec (colors, typography, layout, component list) plus confirmation that Months 2–6 (Path-Finder, Code-Breaker, Heavy-Lift, Autonomous-Command, Omniscience) are the authoritative curriculum — though only Month 1 has real lesson content today; Months 2–6 are future content-authoring work (a separate subproject) and this dashboard must render them as locked/coming-soon, not fabricate lesson data for them.

Scoping decisions made with the stakeholder:
1. **Placement**: a new full-page route (`/parent/promotion`), not a tab inside the existing `ParentPage` tab shell.
2. **Pricing**: "Elite Academy" is a re-skinned presentation of the *existing* Buddy Pro tier (R149/month) — no new subscription tier, no new Payfast plan, no new entitlement flag.
3. **Rank data**: a new persisted table (not purely derived at read time) — the stakeholder wants rank/XP to be a stored fact, not recomputed differently every time.
4. **Scope trim for this build**: rank header, skill-tree map, a *static* tactical preview (not a live embedded HUD), and the upgrade card. Confetti rank-up animation, a downloadable "Promotion Certificate," and custom illustration/texture assets (3D graduation-cap Buddy, carbon-fiber overlay) are explicitly deferred to a follow-up polish pass — no placeholder code for them in this build.
5. **Visual system**: the stakeholder's palette/typography (Buddy Purple `#9D50BB`, Academy Gold `#D4AF37`, Tactical Green `#27AE60`, Roboto Mono for stats, dark HUD panel) is an **intentional sanctioned exception** to `DESIGN.md`'s existing calm-neutral parent-dashboard system, scoped to this one route — not drift to be reconciled into the main palette.

## Data model

### New table: `child_ranks`

```sql
create table public.child_ranks (
  child_id    uuid primary key references public.children(id) on delete cascade,
  total_xp    integer not null default 0,
  updated_at  timestamptz not null default now()
);
```

- One row per child (not per user — a Pro account can have multiple children, each with independent rank).
- RLS: same ownership pattern as `children`/`lesson_completions` — a row is readable/writable only when its `child_id` belongs to a child owned by `auth.uid()`. Written via a `bump_child_xp(p_child_id uuid, p_xp_delta int)` RPC (mirrors the existing `bump_api_usage` RPC pattern) rather than a raw client upsert, so XP can only ever be *added*, never arbitrarily set, from the client.
- **XP source**: called once per newly-completed old-band (`ageBand: 'old'`) robotics mission, immediately after `useProgress`'s existing `markComplete` succeeds — `p_xp_delta` is that mission's `mastery_score` (0–100). Re-completing an already-completed mission does not re-award XP (the RPC checks the mission wasn't already in `lesson_completions` before this call — enforced by calling it only from the `markComplete` codepath, which already upserts on `(user_id, course_id, lesson_id, child_id)`, so a first-time completion is distinguishable from a re-run by comparing to the pre-upsert completions set client-side).

### Rank derivation (computed, not stored)

```
level = floor(total_xp / 100) + 1
rank  = level <= 5 ? 'Recruit' : level <= 12 ? 'Specialist' : 'Commander'
```

With only Month 1's 4 missions live (max 400 XP), the reachable ceiling today is Recruit level 5 — Specialist/Commander unlock naturally once Months 2–6 ship real content. This mirrors `BAND_BY_AGE`'s existing pattern of a small pure function over a stored value, not a second source of truth.

## Components

New directory `src/components/promotionCenter/`, new page `src/pages/PromotionCenterPage.jsx`, new route in `App.jsx`:

```
<Route path="/parent/promotion" element={session ? <PromotionCenterPage session={session} /> : <Navigate to="/" replace />} />
```

Linked from a new banner/card on the existing `ParentPage` (near the top, above or alongside the tab bar) — reuses the page's existing session, doesn't duplicate auth.

- **`useChildRank(childId)`** (`src/hooks/useChildRank.js`) — fetches the `child_ranks` row for the active child (defaulting to `{ total_xp: 0 }` if none exists yet), exposes `{ totalXp, level, rank, xpToNextLevel }`. Pure derivation logic (the `level`/`rank` formula above) factored into an exported pure function for unit testing, same pattern as `masteryTier` in `useProgress.js`.
- **`RankStatusHeader`** — child avatar (reuses `BuddyAvatar`) with a rank-colored glow border, rank label, and an XP progress bar to the next level. Reads `useChildRank` + the existing child list for the switcher (reuses `listChildren`/`getActiveChildId`/`setActiveChildId` from `childrenService.js`/`storage.js` — no new child-switching logic).
- **`SkillTreeMap`** — renders a fixed `MONTHS` array (6 entries: Iron Blueprint, Path-Finder, Code-Breaker, Heavy-Lift, Autonomous-Command, Omniscience) as connected nodes. Month 1's `completed`/`in-progress` state is derived from real `useProgress` completions against the 4 mission lesson IDs in `robotics.js`; Months 2–6 always render `locked` with "Coming soon" — no fabricated lesson/course data for them. Hover reveals a static 3-point syllabus string per month (hardcoded copy, not fetched), reflecting the actual 4-mission structure already authored per month in the stakeholder's content (not the original mockup's placeholder "12 Missions" figure).
- **`TacticalPreview`** — a static image/frame (an actual screenshot or a simple mocked illustration, not a live-rendered child HUD) captioned "Live View: What {childName} sees during Rank-Up sessions." No toggle between standard/tactical view in this build (deferred with the other polish items) unless trivial — if it turns out to be a two-line conditional, include it; otherwise cut it too rather than half-build it.
- **`EliteAcademyCard`** — reuses `UpgradePrompt`'s existing `TRIGGERS`-keyed copy pattern (add a new `'promotionCenter'` trigger entry) and its real checkout flow. Visually restyled for this page's palette, but functionally the same Buddy Pro entitlement — no new pricing/plan logic.

## Visual treatment

Add a new `## Promotion Center (sanctioned exception)` section to `DESIGN.md`, explicitly scoped to `/parent/promotion`:
- Palette: Buddy Purple `#9D50BB`, Academy Gold `#D4AF37`, Tactical Green `#27AE60`, Deep Navy for the upgrade card.
- Typography: Fredoka (headings, matches existing), Nunito (body, matches existing), Roboto Mono for rank/XP numeric stats only.
- Dark HUD styling confined to `TacticalPreview`'s frame — the rest of the page (rank header, skill tree, upgrade card) sits on the spec's calm neutral background with the radial gradient accent, not full dark mode.

This keeps the design-quality hook from flagging these colors as drift on this route while leaving the rest of the app's tokens untouched.

## Testing

- `useChildRank`'s pure derivation function: unit tests for level/rank boundaries (99/100/400/500/1200 XP → Recruit 1/Recruit 2/Recruit 5/Specialist 6/Commander 13), same style as `masteryTier`'s existing tests.
- `bump_child_xp` RPC: covered the way `bump_api_usage` is — a migration-level check that RLS prevents writing another user's child's XP.
- `SkillTreeMap`: RTL test asserting Months 2–6 always render as locked regardless of `useProgress` state (no way to accidentally "complete" a month with no content), and Month 1's state reflects real completions.
- `PromotionCenterPage`: smoke test that it redirects unauthenticated sessions like `ParentPage` does.

## Out of scope (explicit)

- Confetti rank-up animation, downloadable Promotion Certificate, custom 3D illustration/carbon-fiber texture — follow-up polish subproject.
- Months 2–6 lesson content authoring — separate subproject, this dashboard only needs to render their *absence* correctly.
- Any WhatsApp/image-gen automation (Memory Gift, Sunday Storybook) — separate subproject, unrelated to this dashboard.
