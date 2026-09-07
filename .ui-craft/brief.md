# Design Brief — Buddy

Pre-filled from `DESIGN.md` and `PRODUCT.md` at the repo root (2026-09-07); noted inline where sourced from those files versus newly defined here. This brief complements `DESIGN.md` — it never contradicts it.

## 1. Product purpose

Buddy — a voice-first AI companion for children (a "Tactical Specialist" mentor turning screen time into a structured, gamified learning curriculum), paired with a calm oversight dashboard for the parent who runs the account.

## 2. Primary user

Two-sided by design: the **child** (voice-first, pre-reader-friendly, touch-first interaction) and the **parent** (account owner, subscription decision-maker, reads progress reports). Neither is secondary — DESIGN.md treats the parent surface as "the same toy, lit differently," not a stripped-down afterthought.

## 3. Principles

Lifted directly from DESIGN.md's own Named Rules and Do's/Don'ts — these are already load-bearing in shipped code, not aspirational, in conflict-resolution order:

1. **The Squish Confirms Rule** — every pressable element on the child/parent surfaces visibly compresses on `:active` (`scale(0.93)`); a button that doesn't squish reads as broken.
2. **The Colored Shadow Rule** — shadows are never neutral gray/black; always tinted toward the surface's own accent.
3. **One signature character** — the Buddy Avatar (or its sanctioned Tactical-persona substitute, `TacticalOrb`) is the one mascot across every surface; never invent a second.
4. **Sub-brands are scoped, not viral** — the Tactical Command Black + Teal world (marketing + auth funnel) and the Promotion Center's purple-gold world are deliberate, narrowly-scoped exceptions to the base candy system, each documented with why and where they stop. Extending one requires updating DESIGN.md's stated scope, not silent drift.
5. **Anti-slop is a standing bar, not a one-time pass** — no generic AI-template defaults; every redesign/audit pass in this project treats this as non-negotiable.

## 4. Success metric

`[TO DEFINE — 2026-09-07]` — DESIGN.md documents *how* the product should look and behave, but no observable "user succeeded" behavioral metric was available to pre-fill from (e.g. signup completion rate, session-start-to-first-voice-reply time). Needs product input.

## 5. Out of scope

1. No light/dark theme toggle — each surface commits to one fixed theme (candy-saturated child surface, calm-neutral parent surface, Command-Black funnel), chosen by use context, not a user setting.
2. The saturated candy gradient never appears on parent-admin surfaces, and the Tactical Command Black world never appears outside the marketing+auth funnel (`/`, `/login`) — no cross-contamination between the three worlds.
3. No relying on window/body scroll — `body` is `overflow: hidden` by design; every scrollable region owns an explicit container.
4. `[TO DEFINE — 2026-09-07]` — any additional deliberate exclusions (e.g. specific browser/device support cutoffs) weren't recorded in DESIGN.md; add if relevant.
