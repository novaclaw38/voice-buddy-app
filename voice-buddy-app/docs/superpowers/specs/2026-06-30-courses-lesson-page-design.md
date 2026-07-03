# Courses — Interactive Lesson Page Design

**Date:** 2026-06-30  
**Status:** Approved  

---

## Context

The existing "courses" feature navigates children back to the main Buddy chat screen with a generic system prompt. There is no visual structure, no interactive activities, and no sense of progression — it does not feel like a lesson. This redesign replaces that with a dedicated lesson page that has animated step cards, Buddy narration, interactive activities (quiz, label, voice), a printable worksheet, and a completion certificate.

---

## Architecture

### New route
`/lesson?course=<id>&lesson=<id>` — auth-protected, added to `App.jsx`.

### Files changed
| File | Change |
|---|---|
| `src/App.jsx` | Add `/lesson` route pointing to `LessonPage` |
| `src/pages/CoursesPage.jsx` | Navigate to `/lesson?...` instead of `/app?...` |
| `src/pages/ChildPage.jsx` | Remove dead `?course=&lesson=` boot useEffect branch |
| `src/utils/courses.js` | Replace `prompt` strings with `steps` arrays + `printSheet` object per lesson |
| `src/pages/LessonPage.jsx` | **New** — lesson player page |
| `src/pages/LessonPage.module.css` | **New** — styles |

### Reused unchanged
`BuddyAvatar`, `SpeechBubble`, `VoiceButton`, `useSpeech`, `PrintSheet`, all CSS design tokens and animation keyframes from `index.css`.

---

## Data Structure

`courses.js` — each lesson replaces `prompt: '...'` with:

```js
{
  id: 'seeds',
  title: 'How Seeds Grow',
  emoji: '🌰',
  steps: [
    {
      type: 'explain',
      narration: 'Did you know a tiny seed holds a whole plant inside it?',
      narrationYoung: 'A little seed has a baby plant sleeping inside!',  // optional, 3-6 yr
      emoji: '🌰',
      fact: 'Seeds need water and warmth to wake up and start growing.',
    },
    {
      type: 'quiz',
      narration: 'What does a seed need to wake up and grow?',
      question: 'What wakes a seed up?',
      options: ['Water & warmth', 'Ice cream', 'Music', 'Darkness'],
      correct: 0,
    },
    {
      type: 'label',
      narration: "Let's name the parts of a plant!",
      visual: '🌱',
      items: ['Roots', 'Stem', 'Leaves', 'Flower'],
    },
    {
      type: 'activity',
      narration: 'Amazing! Tell me one thing a plant needs to grow.',
      prompt: 'voice',
    },
  ],
  printSheet: {
    title: 'How Seeds Grow',
    facts: ['Seeds need water and warmth.', 'Roots drink water from the soil.', 'Leaves catch sunlight to make food.'],
    colourPrompt: 'Colour the plant and draw where it gets its water from!',
    visual: '🌱',
  },
}
```

**Step types:** `explain` | `quiz` | `label` | `activity`  
**Steps per lesson:** 3–4  
**Typical order:** explain → quiz → label or activity → (optional second quiz)

Age adaptation: if `settings.childAge <= 6` and `narrationYoung` exists on a step, use it. Otherwise use `narration`.

---

## LessonPage Layout

```
┌─────────────────────────────────┐
│ ← Back   🌱 How Seeds Grow  ●●○○ │  header: back, title, step progress dots
├─────────────────────────────────┤
│        [BuddyAvatar]            │  animated avatar (speaking / idle)
│   "A tiny seed holds a whole    │  SpeechBubble (current step narration)
│    plant inside!"               │
├─────────────────────────────────┤
│  ┌───────────────────────────┐  │
│  │       STEP CARD           │  │  swaps per step type (animated entry)
│  └───────────────────────────┘  │
├─────────────────────────────────┤
│         [ Next → ]              │  disabled until step completion condition met
└─────────────────────────────────┘
```

### Step card behaviours

**ExplainCard**
- Large emoji bounces in (`msgBounce` keyframe), fact text fades up below.
- Buddy speaks narration via `useSpeech.speak()`.
- "Next" unlocks automatically when TTS finishes.

**QuizCard**
- 2–4 pill buttons rendered from `step.options`.
- Tap correct → green flash + confetti particle burst (CSS-only, no library).
- Tap wrong → red background + `@keyframes jelly` shake.
- "Next" unlocks after correct answer is tapped.

**LabelCard**
- Emoji visual at top centre.
- Label chips displayed in a shuffled row below.
- Child taps each label; correct ones animate into position above the visual with a `bounce-in`.
- "Next" unlocks when all labels placed.

**ActivityCard**
- Shows `VoiceButton` centred.
- Child speaks; transcript appears in a read-only bubble below.
- "Next" unlocks after any voice response is received (no answer-checking).

### Reward screen (after last step)

Triggered when `stepIndex === steps.length`.

- Full-screen star-burst: 12 star emojis radiate outward from centre (`@keyframes` scale + translate, staggered delays).
- "You did it! 🌟" heading fades in.
- Two buttons:
  - `🖨️ Print your worksheet` — triggers `window.print()` with `LessonPrintSheet` rendered into a `@media print` div.
  - `🏆 Print your certificate` — triggers `window.print()` with `LessonCertificate` rendered into the same `@media print` div (swap active print target via state).
  - `← Back to Courses` — navigates to `/courses`.

---

## Printable Worksheet

Rendered as a `@media print`-only `<div>` inside LessonPage (hidden on screen).

Layout:
- Header: Buddy emoji logo + lesson title
- "What I learned" — 3 key facts from `printSheet.facts`
- Colouring area — large outlined emoji + `printSheet.colourPrompt` caption
- Footer: "Voice Buddy | voicebuddy.app"

Uses `@media print` CSS to hide all other page content and show only the sheet.

---

## Completion Certificate

Second `@media print`-only `<div>`, toggled by state when child taps "Print your certificate".

Layout (landscape orientation via `@page { size: A4 landscape }`):
- Decorative border (CSS box-shadow layers, no images needed)
- "Certificate of Achievement" heading (Fredoka, large)
- "This certifies that **[childName]** has completed **[lesson.title]** in **[course.title]**"
- Date (auto from `new Date().toLocaleDateString()`)
- Buddy avatar emoji + "— Buddy 🐻" signature line
- Star row decoration

---

## Navigation & State

```
lessonState = {
  stepIndex: number,          // current step (0-based)
  stepComplete: boolean,      // unlocks Next button
  quizSelected: number|null,  // selected option index
  labelPlaced: string[],      // placed label names
  transcript: string,         // voice activity response
  phase: 'steps' | 'reward',  // controls reward screen
  printTarget: 'sheet' | 'cert' | null,
}
```

Progress dots in the header reflect `stepIndex`. Back button on step 0 navigates to `/courses`; on step > 0 it goes to previous step.

---

## Verification

1. `npm run build` — no errors
2. Navigate to `/courses`, tap a lesson — lands on `/lesson?course=X&lesson=Y`
3. Buddy speaks the first step narration; avatar shows `speaking` state
4. ExplainCard: Next auto-unlocks after TTS ends
5. QuizCard: wrong answer shakes red; correct answer flashes green; Next unlocks
6. LabelCard: tapping labels places them with animation; Next unlocks when all placed
7. ActivityCard: VoiceButton records; Next unlocks after transcript received
8. Reward screen: stars burst; both print buttons trigger correct `@media print` layout
9. Certificate shows child's name, lesson title, course title, and today's date
10. Back to Courses navigates to `/courses`
