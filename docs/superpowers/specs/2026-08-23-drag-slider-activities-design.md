# Drag/Slider/Breadboard Mission Activities — Design

## Context

Operation Iron Blueprint's 4 mission lessons (`api/_courseData/robotics.js`) each have a Step 04 "Activity" step. Today these are voice-only placeholders using the existing `ActivityCard` (tap mic, speak, no scoring). The original mission scripts call for real hands-on interactions: drag logic blocks (Mission 01), a sensitivity slider (Mission 02), drag a motor onto a chassis (Mission 03), and drag components onto a breadboard under a power budget (Mission 04).

This spec covers building those four interactions for real. It deliberately overrides an existing project decision: `ExploreCard.jsx` documents a "no drag, per mobile-first guidance" policy (`docs/superpowers/specs/2026-07-30-learn-section-redesign-design.md §2`), using tap-only sequence/sort/match mechanics instead. The stakeholder explicitly chose to build real drag gestures for this subproject, with a mandatory tap-based fallback per interaction to preserve WCAG 2.2 SC 2.5.7 (Dragging Movements, AA) and the app's clean axe/pa11y scan.

Out of scope: Months 2-6 content, WhatsApp automation, Promotion Center polish. No new Supabase schema.

## Goals

- Real, satisfying drag-and-drop and slider interactions for the 4 Step 04 activities.
- Every drag interaction has a single-pointer, non-drag alternative that reaches the identical state transition (not a degraded parallel path).
- Reuse the existing lesson engine's step-type dispatch pattern (`LessonPage.jsx`) rather than inventing a parallel rendering path.
- No regression to the current 0-violation WCAG2AA scan.

## Non-goals

- Physics simulation, realistic breadboard rendering, or SVG circuit diagrams — visuals are stylized/schematic, matching the app's existing card aesthetic.
- Timed/scored drag precision — scoring is complete-or-not per item placement, same granularity as `ExploreCard`'s existing sort/match modes.

## Architecture

Two new step-type components, both built around one shared idea: a single **placement state machine** (`{ itemId -> targetId }`) that can be advanced by either of two independent input paths — a Framer Motion drag gesture, or a tap-select-then-tap-target sequence. Both paths call the same `place(itemId, targetId)` function; there is no separate "fallback" code path to keep in sync, just a second way to invoke the same transition.

### 1. `DragMatchCard` (new step `type: 'drag-match'`)

Handles Missions 01, 03, and 04 — one or more drop targets, draggable item chips.

**Step data shape:**
```js
{
  type: 'drag-match',
  narration: '...',           // spoken before the card renders, same as other steps
  prompt: '...',               // short on-card instruction text
  targets: [
    { id: 'perimeter-response', label: '🚧 Perimeter Hit' }
  ],
  items: [
    { id: 'stop-reverse', label: '🛑 Stop, then reverse', value: 1 }
  ],
  rule: { kind: 'exact', correct: { 'perimeter-response': 'stop-reverse' } }
    // or, for Mission 04:
  rule: { kind: 'budget', targetId: 'breadboard', max: 9, required: ['cpu', 'sensor-array'] }
}
```

- `rule.kind === 'exact'`: each target has exactly one correct item id; card completes when every target holds its correct item (wrong placements bounce back with a shake, same visual language as `ExploreCard`'s existing wrong-bucket shake).
- `rule.kind === 'budget'`: all items drop onto one target; the card tracks a running sum of placed items' `value` against `max`, and requires every id in `required` to be present. Completes when all `required` items are placed and the sum is ≤ `max`; a placement that would exceed `max` is rejected (shake + snap back, sum never goes over) — this is the "you have a 9V limit" mechanic from Mission 04's script.

**Component internals:**
- `useState` for `placements: Record<targetId, itemId[]>` (arrays to support the budget rule's multi-item target).
- Drag path: each item chip is a Framer Motion `motion.div` with `drag`, `dragSnapToOrigin` (springs back on invalid drop), and `onDragEnd` that reads the drag pointer's final screen position and hit-tests it against each target's `getBoundingClientRect()` (refs collected via a `targetRefs` map) — first target whose rect contains the point wins; no match snaps back.
- Tap path: tapping an unplaced item chip marks it `selected` (visual highlight, matching `ExploreCard`'s existing selected-chip style); tapping a target then calls `place(selectedItemId, targetId)` — identical outcome to a successful drag onto that target. Tapping an already-selected item deselects it.
- Both paths converge on one `place(itemId, targetId)` function that applies the rule, updates `placements`, and checks for completion.
- `whileDrag={{ scale: 1.08 }}` and a snap-back transition; respects `prefers-reduced-motion` via Framer Motion's built-in reduced-motion handling (`useReducedMotion()` hook — disable the scale/spring, keep instant position change).

### 2. `SliderCard` (new step `type: 'slider'`)

Handles Mission 02's sensitivity calibration.

**Step data shape:**
```js
{
  type: 'slider',
  narration: '...',
  prompt: '...',
  min: 0,
  max: 100,
  target: { min: 60, max: 75 },   // valid zone
  startAt: 20
}
```

- Renders a horizontal track with a draggable handle (`motion.div` with `drag="x"` constrained to the track's `dragConstraints`) plus a numeric readout.
- Drag path: `onDrag` maps the handle's x-offset to a `value` between `min`/`max` in real time.
- Tap/keyboard fallback: the handle is a `role="slider"` element with `aria-valuemin/max/now`, focusable, responding to Arrow Left/Right (±1) and Home/End (min/max); additionally, tappable `−`/`+` buttons flank the track for pure-tap use without a keyboard, each step moving `value` by 1.
- Completes when `value` sits inside `[target.min, target.max]` for a short confirm delay (500ms, mirroring `ExploreCard`'s existing completion-delay pattern) — long enough to avoid accidental pass-throughs, short enough not to feel laggy.

### Shared hit-testing utility

`src/utils/dragHitTest.js` — pure function `findTargetAtPoint(point, targetRects)` used by `DragMatchCard`'s `onDragEnd`. Kept separate from the component so it's unit-testable without mounting Framer Motion or simulating real pointer events.

## Integration points

- **`LessonPage.jsx`**: add `'drag-match'` and `'slider'` branches alongside the existing `type` dispatch, in both the narration-speaking `useEffect` and the JSX render switch — same pattern as every other step type already there.
- **`api/_courseData/robotics.js`**: replace each mission's Step 04 `{ type: 'activity', narration }` with the real `drag-match`/`slider` step per the mapping below. `narration` is restored to (or adapted from) the original script's Step 04 dialogue rather than the voice-reframed placeholder text.

### Content mapping

| Mission | Step type | Shape |
|---|---|---|
| 01 — Neural Uplink | `drag-match`, `rule.kind: 'exact'` | One target ("Perimeter Hit Response"), 3-4 item chips (one correct: "Stop, then reverse"; distractors: "Speed up", "Ignore it", "Play a sound") |
| 02 — Sensory Array | `slider` | Sensitivity dial; narration frames it as "reduce false readings from bright floor reflections" — target zone represents correctly-calibrated sensitivity |
| 03 — Kinetic Deployment | `drag-match`, `rule.kind: 'exact'` | One target ("30° Incline Motor Choice"), 2-3 item chips ("Fast motor", "Strong/torque motor", correct: strong motor per the script's reasoning) |
| 04 — Voltage Surge | `drag-match`, `rule.kind: 'budget'` | One target ("Breadboard", max 9), 4-5 item chips with `value` = voltage draw (CPU: 3, sensor array: 2, motor: 5, extra light: 3 — sized so the correct required set fits under 9 and a naive "grab everything" attempt doesn't) |

`printSheet` and `offScreenChallenge` fields on each lesson are unaffected.

## Accessibility

- Every target and item chip is a real button/element with a visible focus ring (existing `shared.module.css` focus styles), not a bare `motion.div` with only pointer handlers.
- Drag gesture is always optional — the tap path alone is sufficient to complete every card, verified per-card in tests by driving only the tap path.
- Slider exposes native `role="slider"` semantics plus visible `−`/`+` buttons, covering pointer-drag, keyboard, and single-tap users.
- `prefers-reduced-motion` disables spring/scale drag animations (position still updates, just without the bounce/scale flourish) — matches the existing global reduced-motion handling already in `index.css`.
- After the 4 lessons are wired up, re-run the manual axe-core-in-Chrome check (pa11y-ci's Chrome binary isn't available in this sandbox) against `/dev-lesson` for each mission to confirm no new violations.

## Testing

- `src/utils/dragHitTest.test.js`: pure unit tests for `findTargetAtPoint` — point inside one rect, point in overlapping rects (first-match order), point in no rect.
- `src/components/lesson/DragMatchCard.test.jsx`: drive only the tap path (select item, tap target) via RTL — covers `exact` rule pass/fail-bounce and `budget` rule accumulation, rejection over max, and required-set completion. Drag/pointer physics aren't exercised by RTL; that gap is covered by manual verification.
- `src/components/lesson/SliderCard.test.jsx`: keyboard arrow/Home/End movement, +/− button taps, completion firing only once `value` is in the target zone and stays there through the confirm delay (use fake timers).
- `api/_courseData/robotics.test.js` (or extend the existing course-data shape test from the Month 1 plan): assert each mission's Step 04 matches its `drag-match`/`slider` shape per the content mapping table.
- Manual: `npm run dev`, play all 4 missions end-to-end using drag; separately, using tap-only; confirm both complete the step and advance the lesson identically.

## File summary

- New: `src/components/lesson/DragMatchCard.jsx`, `.module.css`, `.test.jsx`
- New: `src/components/lesson/SliderCard.jsx`, `.module.css`, `.test.jsx`
- New: `src/utils/dragHitTest.js`, `.test.js`
- Modify: `src/pages/LessonPage.jsx` (add two step-type branches)
- Modify: `api/_courseData/robotics.js` (Step 04 of all 4 `old`-band missions)
- Modify: `api/_courseData/robotics.test.js` (or wherever the Month 1 shape test lives) if it asserts the old `activity`-only shape
