---
target: landing page (TacticalLandingPage.jsx)
total_score: 15
max_score: 28
na_heuristics: 7,9,10
p0_count: 2
p1_count: 2
timestamp: 2026-09-04T18-38-08Z
slug: src-pages-tacticallandingpage-jsx
---
## Design Health Score

Persuade-mode surface — heuristics 7, 9, 10 scored n/a.

| # | Heuristic | Score | Key Issue |
|---|-----------|-------|-----------|
| 1 | Visibility of System Status | 2 | Ticker gestures at live status but is fabricated/static; orb fades in ~1.5s with no skeleton |
| 2 | Match System / Real World | 1 | Military-enlistment framing maps to no real-world model a parent buying a kids' voice app holds |
| 3 | User Control and Freedom | 3 | Dossier modal closes cleanly; no dead ends |
| 4 | Consistency and Standards | 2 | Section headers switch to rounded sans mid-page; three CTA verbs for one action |
| 5 | Error Prevention | 3 | No forms to break; no observed failure states |
| 6 | Recognition Rather Than Recall | 3 | CTA repeats every section |
| 7 | Flexibility and Efficiency | n/a | Single-path Persuade surface |
| 8 | Aesthetic and Minimalist Design | 1 | ASCII clutter, pricing shown twice, dead space in mobile hero and phone-mockup |
| 9 | Error Recovery | n/a | No error states present |
| 10 | Help and Documentation | n/a | N/A for Persuade mode, but absence of trust content matters more |
| **Total** | | **15/28** | **Poor (54%)** |

## Design Specificity Verdict

**LLM assessment:** Reskin, not bespoke. Strip the copy layer and the structure is the exact template shape of every subscription EdTech landing page. Voice — the actual product — is never depicted anywhere.

**Deterministic scan:** 88 findings (22 warning-severity). `design-system-font` 21, `design-system-font-size` 31, `design-system-color` 17, `design-system-radius` 17, `side-tab` 1, `codex-grid-background` 1. Browser injection caught 85 anti-patterns: `ai-color-palette` 47, `tiny-text`/`undersized-ui-text` 37 combined, `dark-glow` 17.

## Overall Impression

Technically well-executed in isolation but authored as if for a different product than PRODUCT.md/DESIGN.md describe — contradicts both the base design system and the product's core differentiator (voice) and positioning ("Guilt-Free Sitter").

## What's Working

- Five Wings cards use strong, specific photographic imagery.
- "MINDLESS vs. MEANINGFUL" contrast section targets the "Guilt-Free Sitter" pain point directly.
- Dark-mode glassmorphism execution is technically clean within hero/pricing components.

## Priority Issues

**[P0] Tonal/system mismatch: unsanctioned visual world.** DESIGN.md scopes tactical/HUD persona to Promotion Center only. Landing page is 100% sharp-cornered, mono-font, cyber-teal — the opposite of the base system — and it's the first surface any parent sees.

**[P0] Broken placeholder in the trust-building moment.** Sample-report modal renders `SUBJECT: Specialist [Name]` verbatim — unsubstituted template token shown to any visitor.

**[P1] No safety/trust content for an AI-voice-with-children product.** Zero mentions of data handling, recording, parental controls.

**[P1] Redundant, escalating CTA stack.** Three CTA blocks in ~1.5 screens with three different verbs for the identical action; pricing shown twice.

**[P2] Dead space: mobile hero gap and phone-mockup void.** ~300px empty space in mobile hero; phone-mockup content fills only ~60% of its fixed height.

**[P3] Typographic identity breaks after the hero.** Section titles switch to rounded sans while everything else is mono.

## Persona Red Flags

**Jordan (first-timer):** Jargon-first framing before any plain explanation; no way to hear the voice product at all.

**Riley (stress-tester):** Hits the `[Name]` placeholder bug within seconds of the first "prove it to me" interaction.

**Casey (mobile):** Confirmed blank gap pushes hero content down; partially-offscreen element clips over the "Field Rations Ops" card.

## Minor Observations

- Footer has zero links.
- Landing page's five "Wings" don't correspond to PRODUCT.md's actual 6-month curriculum.
- Pricing comparison against free YouTube reads as defensive.
- `/login?plan=pro#${wing.id}` hash fragments are dead deep-links.
- Text as small as 9-10.5px detected.

## Questions to Consider

- If the tactical persona was scoped to one dashboard route, why does the landing page skip the base system without the same sign-off?
- Why does a voice-first product's landing page contain no audio, waveform, or sample dialogue?
- Why does the emotional peak land on command-authority pressure instead of resolving trust/safety at the moment of payment?
