---
target: landing page (TacticalLandingPage.jsx)
total_score: 25
max_score: 28
na_heuristics: 7,9,10
p0_count: 0
p1_count: 0
timestamp: 2026-09-07T00-00-00Z
slug: src-pages-tacticallandingpage-jsx
method: manual static review (source + computed contrast ratios); no browser-injection deterministic scan run this pass
supersedes: 2026-09-04T18-38-08Z__src-pages-tacticallandingpage-jsx.md
---
## Design Health Score

Persuade-mode surface — heuristics 7, 9, 10 scored n/a. Up from 15/28 (54%) on 2026-09-04, then all findings below fixed same session.

| # | Heuristic | Score | Key Issue |
|---|-----------|-------|-----------|
| 1 | Visibility of System Status | 4 | Ticker now labeled "SAMPLE MISSION LOG (illustrative)" and the pulsing dot removed — no longer implies live/real activity |
| 2 | Match System / Real World | 3 | DESIGN.md now sanctions the tactical persona for this route (resolved from 1) |
| 3 | User Control and Freedom | 3 | Dossier modal closes cleanly; no dead ends |
| 4 | Consistency and Standards | 4 | Typography unified (JetBrains Mono throughout); CTA verbs consolidated to ENLIST NOW at every primary tier |
| 5 | Error Prevention | 3 | No forms to break; no observed failure states |
| 6 | Recognition Rather Than Recall | 3 | CTA repeats every section |
| 7 | Flexibility and Efficiency | n/a | Single-path Persuade surface |
| 8 | Aesthetic and Minimalist Design | 3 | Mobile hero gap, phone-mockup void, and duplicate giant pricing display all fixed |
| 9 | Error Recovery | n/a | No error states present |
| 10 | Help and Documentation | n/a | N/A for Persuade mode |
| **Total** | | **25/28** | **Good (89%)** |

## Correction to the 2026-09-04 Draft of This Pass

An earlier draft of this critique flagged "Five Wings doesn't match PRODUCT.md's 6-month curriculum" as a P1. That was wrong: `src/utils/tacticalCourseReskin.js` shows the Five Wings (robotics/beast-intel/field-rations/env-recon/botany-ops) are the real, already-shipped tactical-persona reskin of the base courses (robotics/animals/cooking/weather/gardening) for the 9+ age band — PRODUCT.md's month-by-month plan predates that reskin and is the stale document, not the landing page. Withdrawn; no code change made on this point.

## What Changed Since 2026-09-04 (verified via `git diff`)

- **[Fixed]** P0 placeholder bug — `SUBJECT: Specialist [Name]` → `SUBJECT: Specialist Mia R.`
- **[Fixed]** P0 tonal mismatch — DESIGN.md now has a "Tactical Landing Page (sanctioned exception)" section scoping this palette/font to the route.
- **[Fixed]** P3 typography break — section titles all set `font-family: 'JetBrains Mono'`.
- **[Fixed]** P2 dead space — phone-mockup `min-height` instead of fixed height; mobile hero padding-top 8rem → 2rem.
- **[Fixed]** Undersized text — floor confirmed at 11.2px, no more 9-10.5px text.

## Fixed This Pass

- **No focus-visible styling.** Added a page-scoped `a:focus-visible, button:focus-visible` rule (teal outline + existing `--glow-teal`) covering every interactive element on the page.
- **Reduced-motion was hero-only.** Added an `anim()` helper in `TacticalLandingPage.jsx` that no-ops every below-the-fold `whileInView` animation when `useReducedMotion()` is true, instead of only gating the hero. Also removed the `pulse-dot` keyframe animation from the ticker dot (see below), which wasn't reduced-motion-gated either.
- **Fake live-activity ticker.** Relabeled from `LIVE_OPS: Commander Leo completed OBSTACLE_RECON_01` to `SAMPLE MISSION LOG (illustrative): "Specialist Mia R." completed OBSTACLE_RECON_01`, dropped the fabricated "SAMPLE TOTAL: 5,287" counter in favor of a plain descriptor (`5 WINGS · 6-MONTH ACADEMY PATH`), and removed the pulsing dot animation that visually implied live status.
- **No safety/trust content.** Added a footer trust line and a legal-links row (Privacy Policy, Terms of Service, Cookie Policy, Data Deletion, Refund Policy — all routes that already existed in `App.jsx` but weren't linked from this page). The trust line's claims (parent-controlled accounts, voice not retained, no ad use/sale of children's data) were checked against `PrivacyPolicyPage.jsx` before writing, not invented.
- **Pricing shown twice.** Removed the second giant bracketed `[R149/month]` display block from the pricing-features section; the price now appears once there, inline in the description sentence (`At R149/month — less than a weekend takeaway...`), while the comparison grid above keeps its own price for competitive contrast. Removed the now-orphaned `.pricingPrice`/`.pricingBracket`/`.pricingAmount`/`.pricingPeriod` CSS rules.
- **Three CTA verbs for one action.** Unified the final-CTA verb from `AUTHORIZE ENLISTMENT` to `ENLIST NOW`, matching nav/hero/pricing. `ACCESS BRIEFING` on the five wing cards was left as-is — it's internally consistent across all five cards and reads as an intentional secondary-tier CTA, not the inconsistency the heuristic score was penalizing.
- **Dead deep-links.** `/login?plan=pro#${wing.id}` hash fragments on wing cards removed — confirmed via `App.jsx` that `/login` never reads `location.hash`, so they were inert. Wing cards now link straight to `/login` like every other CTA.

## What's Working

- Contrast is solid: dimmed text (`rgba(224,224,224,0.6)`) on `#0A0A0B` measures 5.76:1, full text 14.99:1, teal accent 14.61:1 — all comfortably pass WCAG AA.
- Image CLS is mitigated — `.missionCardImage` has a fixed 180px container height.
- Typography is one consistent voice (JetBrains Mono) hero to footer.
- Wings section imagery and hover scale are clean, purposeful executions.

## Remaining / Not Addressed This Pass

None outstanding from this review. Re-run a full `/audit` (deterministic browser-injection scan) before shipping, since this pass was manual/static only and won't catch runtime-only issues (actual rendered contrast under the JetBrains Mono web-font load, real focus-ring visibility in each target browser, etc.).
