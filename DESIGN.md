---
name: Voice Buddy
description: A voice-first AI companion app for children, paired with a calm parent dashboard
colors:
  grape: "#7c3aed"
  grape-deep: "#5b21b6"
  pink: "#ff6ba9"
  pink-deep: "#e0408a"
  tangerine: "#ff9a3c"
  mint: "#3ddc97"
  sky: "#4dadf7"
  sunny: "#ffd23f"
  berry: "#c026d3"
  alert: "#ef4444"
  alert-deep: "#b91c1c"
  success-text: "#128a5a"
  success-bg: "#d8f7e9"
  ink: "#3a2a5d"
  ink-dim: "#6b5d8f"
  surface: "#ffffff"
  card-border: "rgba(124, 58, 237, 0.12)"
  surface-tint: "#f4f0fc"
  surface-tint-strong: "#e9e0fb"
  parent-border: "#e9e5f2"
  parent-danger-bg: "#ffe4ef"
  parent-danger-text: "#c0285a"
  parent-plum-text: "#6d28d9"
  parent-rose-text: "#be185d"
  parent-green-text: "#15803d"
typography:
  display:
    fontFamily: "Fredoka, Nunito, system-ui, sans-serif"
    fontSize: "clamp(2.25rem, 6vw, 4rem)"
    fontWeight: 600
    lineHeight: 1.1
    letterSpacing: "-0.01em"
  headline:
    fontFamily: "Fredoka, Nunito, system-ui, sans-serif"
    fontSize: "1.75rem"
    fontWeight: 600
    letterSpacing: "-0.01em"
  title:
    fontFamily: "Fredoka, Nunito, system-ui, sans-serif"
    fontSize: "1.375rem"
    fontWeight: 600
  body:
    fontFamily: "Nunito, system-ui, sans-serif"
    fontSize: "0.875rem"
    fontWeight: 400
    lineHeight: 1.5
  label:
    fontFamily: "Nunito, system-ui, sans-serif"
    fontSize: "0.75rem"
    fontWeight: 600
rounded:
  sm: "16px"
  md: "24px"
  lg: "34px"
  pill: "999px"
  default: "28px"
spacing:
  xs: "8px"
  sm: "12px"
  md: "16px"
  lg: "24px"
  xl: "32px"
components:
  button-primary:
    backgroundColor: "{colors.grape}"
    textColor: "{colors.surface}"
    rounded: "{rounded.md}"
    padding: "14px 28px"
  button-primary-active:
    backgroundColor: "{colors.grape}"
    textColor: "{colors.surface}"
    rounded: "{rounded.md}"
    padding: "14px 28px"
  card:
    backgroundColor: "{colors.surface}"
    rounded: "{rounded.lg}"
    padding: "24px"
---

# Design System: Voice Buddy

## Overview

**Creative North Star: "The Squishy Candy Companion"**

Voice Buddy's child-facing surface is built like a physical toy: soft, oversized, bouncy, and built to be pressed. Every interactive element squishes on press (`scale(0.93)`), every corner is generously rounded, and every shadow reads as a soft chunky drop rather than a sharp technical elevation. The palette is a saturated, joyful "candy" set — grape, pink, tangerine, mint, sky, sunny — laid over a pastel gradient backdrop, never a flat white. This is a world for small hands and pre-readers: everything is big, tappable, and forgiving.

The parent-facing surface (`/parent`) deliberately steps down in intensity. It keeps the same rounded, squishy bones (buttons still press, cards still use the fat radii) but trades the saturated candy gradient for a calm neutral wash (`#f7f6fb → #efedf6`) and muted status colors (plum, rose, green text on pale tinted backgrounds). This is not a second brand — it's the same toy, lit differently for an adult doing admin work rather than a child at play.

Typography pairs a rounded, friendly display face (Fredoka) for anything a child reads or hears named aloud, with a warm, legible body face (Nunito) for everything else. The type scale (11px–64px) was reverse-engineered from ad-hoc sizes already in wide use across the app rather than an abstract ratio — it optimizes for "matches what's already there," not mathematical purity.

**Key Characteristics:**
- Everything squishes: `:active { transform: scale(0.93) }` on every button, universally.
- Fat radii everywhere: nothing under 16px, most surfaces at 24–34px, pills at 999px.
- Soft chunky shadows (offset + blur), never a sharp 1-2px "material" shadow.
- Candy-saturated child surface vs. calm-neutral parent surface — same bones, different intensity.
- Fredoka (headings) + Nunito (body): rounded, friendly, never a sharp geometric sans.

## Colors

The palette is a bright, saturated "candy" set for the child surface, restrained to a calm neutral + muted-status set for the parent surface. One primary accent (grape) carries authority everywhere; the rest are playful, situational highlights.

### Primary
- **Grape** (`#7c3aed`, deep: `#5b21b6`): the anchor accent — primary buttons, active states, focus rings, the Buddy avatar's default color, and headline accents. Used on both child and parent surfaces as the one color that ties them together.

### Secondary
- **Candy Pink** (`#ff6ba9`, deep: `#e0408a`): warmth accent — secondary buttons, sing mode, playful highlights.
- **Sunny Yellow** (`#ffd23f`): energetic accent — rewards, stars, celebratory moments (reward screen star-burst).

### Tertiary
- **Tangerine** (`#ff9a3c`), **Mint** (`#3ddc97`), **Sky** (`#4dadf7`), **Berry** (`#c026d3`): rotating avatar/costume colors and course-category accents. None dominates; they exist so a child's Buddy can look different from every other Buddy.

### Neutral
- **Ink** (`#3a2a5d`): primary text color on light surfaces — a deep muted violet-black, not true black, to stay in-family with the candy palette.
- **Ink Dim** (`#6b5d8f`): secondary/dimmed text. Deliberately darkened from a legacy `#8478a0` to clear WCAG AA 4.5:1 contrast at body size — do not lighten this back.
- **Surface** (`#ffffff`): card and panel backgrounds.
- **Surface Tint** (`#f4f0fc`) / **Surface Tint Strong** (`#e9e0fb`): light-purple background washes for sections that need to feel "inside the candy world" without being a full card.

### Named Rules
**The Squish Confirms Rule.** Any element the child can press must visibly compress on `:active` (`scale(0.93)`). A button that doesn't squish reads as broken, not calm.

## Typography

**Display/Heading Font:** Fredoka (with Nunito, system-ui, sans-serif fallback)
**Body Font:** Nunito (with system-ui, sans-serif fallback)

**Character:** Fredoka is a rounded, geometric-but-friendly display face — it reads as a toy's logotype, never corporate. Nunito is a warm, humanist body face with enough weight range to carry both casual body copy and small dense labels without feeling thin.

### Hierarchy
- **Display** (600, `clamp(2.25rem, 6vw, 4rem)` / 36–64px, 1.1 line-height): hero headlines, landing page.
- **Headline** (600, 1.75rem/28px): section labels, logo lockups.
- **Title** (600, 1.375rem/22px): card and small-heading titles.
- **Body** (400, 0.875rem/14px, 1.5 line-height): default body and button text.
- **Label** (600, 0.75rem/12px): captions, meta text, badges (down to 11px for the smallest badges/tags).

### Named Rules
**The Reverse-Engineered Scale Rule.** The 9-step type scale (11px–64px) was fit to sizes already in wide production use, not derived from a ratio. Add new sizes only when none of the existing 9 steps fit; don't introduce a 10th ad-hoc value.

## Layout

Mobile-first, tablet-primary: the app is designed for touch, not mouse, with all tap targets ≥ 44px. Page scroll is intentionally contained inside `.page` elements — `body` is `overflow: hidden` — so any new scrollable region must attach its own scroll container rather than relying on window scroll. The child surface uses a full-bleed gradient background (`--bg-gradient`) behind centered, card-based content. The parent dashboard uses a calmer, more conventional panel/tab layout over its neutral gradient.

## Elevation & Depth

Depth is conveyed through soft, chunky, colored shadows rather than sharp material-style elevation. Shadows are large-radius, low-opacity-but-colored (tinted toward grape/violet, not neutral gray-black), and often paired with a small hard offset that reads like a toy sitting on a surface (`0 8px 0 rgba(...)` beneath a softer blur layer) rather than a single soft blur.

### Shadow Vocabulary
- **Squish** (`0 8px 0 rgba(91, 33, 182, 0.12), 0 16px 30px rgba(80, 40, 120, 0.16)`): the default "resting on the world" shadow for primary interactive elements — a hard offset ledge plus a broad soft glow.
- **Pop** (`0 10px 26px rgba(124, 58, 237, 0.34)`): a stronger, more saturated glow for elements that need to visually lift off the page (active/selected states, floating action buttons).
- **Card** (`0 14px 34px rgba(124, 58, 237, 0.14)`): the standard panel/card shadow — softer and lower-opacity than Pop, for surfaces that are present but not the focal point.

### Named Rules
**The Colored Shadow Rule.** Shadows are never neutral gray/black — they're tinted violet (`rgba(91,33,182,...)` or `rgba(124,58,237,...)`) to stay inside the candy palette even in their depth cues.

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

## Tactical Landing Page (sanctioned exception)

The marketing landing page (`/`, `TacticalLandingPage.jsx`) is a second deliberate sub-brand, extended 2026-09-04 alongside the Promotion Center exception above — it is the top-of-funnel counterpart to the same Tactical Specialist persona: a "Command Black + Tactical Teal" HUD aesthetic aimed at a parent evaluating the product before ever meeting Buddy or the child-facing app.

**Scope:** `src/pages/TacticalLandingPage.jsx` and `TacticalLandingPage.module.css` only. Nothing outside this route uses these tokens.

**Palette:**
- Command Black `#0A0A0B` / `#141416` — page background and section fills
- Tactical Teal `#00F5FF` — primary accent (CTAs, links, active/highlighted states, glow)
- Alert Orange `#FF8A00` — "the old way" contrast accents only; not used for CTAs
- Tactical text `#E0E0E0` on dark, with a dimmed variant at `rgba(224,224,224,0.6)`

**Typography:** **JetBrains Mono** throughout — nav, hero, body copy, and section headers — as the page's one consistent voice; not paired with Fredoka/Nunito. Loaded via the same Google Fonts mechanism as the Promotion Center's Roboto Mono.

**Shape:** Sharp, technical radii (4–12px) are intentional here, not drift — a deliberate departure from the base system's fat radii to read as a command terminal rather than a toy. Do not "fix" these back to the base radius scale.

These custom properties are declared locally on `TacticalLandingPage.module.css`'s `.page` class — not added to `:root` — so they stay scoped to this route only.

## Shapes

Radii are fat and consistent: 16px (small elements — pills' inner controls, tags), 24px (default cards, inputs, buttons), 34px (large modals/panels), and 999px (true pills — avatars, badges, toggle tracks). Nothing in the system uses a sharp corner (0–8px) except where a circle (50%) is the correct shape (avatars, icon buttons). Borders are rare and, when present, a faint tinted violet (`rgba(124, 58, 237, 0.12)`) rather than a solid neutral gray line.

## Components

### Buttons
- **Shape:** 24px radius (`--r-md`) as the default; large primary CTAs may use 28px (`--radius`).
- **Primary:** grape background, white text, generous padding (14px 28px), Fredoka type.
- **Hover / Focus:** subtle transform/shadow shift on hover; on `:active`, universal `scale(0.93)` squish is non-negotiable across all button variants.
- **Secondary / Ghost:** transparent or tinted-surface background with grape text/border; same squish behavior.

### Cards / Containers
- **Corner Style:** 34px (`--r-lg`) for prominent panels (avatar picker, PIN modal), 24px (`--r-md`) for standard content cards.
- **Background:** white (`--surface`) on the child surface; white or pale neutral on the parent surface.
- **Shadow Strategy:** Card shadow (see Elevation) by default; Pop shadow for anything that should feel selected or elevated above its neighbors.
- **Border:** faint tinted violet border (`rgba(124, 58, 237, 0.12)`) on modal/panel surfaces; most content cards rely on shadow alone.
- **Internal Padding:** 24px standard.

### Buddy Avatar (signature component)
The customizable child companion character — a bear/cat/bunny/dog/robot SVG with two ears/eyes, a body color drawn from the candy palette, emotional-state animations (idle/listening/speaking/thinking/happy/confused via `wiggle`, `bounce-in`, `jelly`, `breathe`, `pop-in` keyframes), blinking, and costume overlays. It is the single element every surface (landing, auth, courses, lesson, parent-dashboard preview, PWA icon) uses to visually anchor the brand — treat any new "friendly character" need as a variant of this component, not a new mascot.

## Do's and Don'ts

### Do:
- **Do** squish every pressable element on `:active` (`scale(0.93)`) — this is universal, not per-component.
- **Do** use fat radii (16/24/34/999px) on every surface; nothing sharp except true circles.
- **Do** tint shadows toward violet, never neutral gray/black.
- **Do** keep the child surface on the saturated candy gradient background and the parent surface on the calm neutral gradient — don't cross them.
- **Do** keep all tap targets ≥ 44px; this is a touch-first, pre-reader-friendly product.
- **Do** use Fredoka only for headings/buttons/logotype contexts; body copy stays in Nunito.

### Don't:
- **Don't** introduce a sharp-cornered (0–8px radius) surface anywhere in the child-facing UI — it breaks the "toy" reading.
- **Don't** use a neutral gray/black shadow; every shadow in this system carries a violet/grape tint.
- **Don't** apply the saturated candy gradient to parent-facing admin surfaces — they use the calm neutral gradient (`#f7f6fb → #efedf6`) by design.
- **Don't** invent a new mascot or character system; the Buddy Avatar is the one signature character across every surface.
- **Don't** rely on `window` scroll for new scrollable content — `body` is `overflow: hidden` by design; scroll containers must be explicit.
