# Learn Section: Real Teaching for Every Course + Under-6 Content

Status: approved · 2026-08-18

## 1. The Problem

`docs/superpowers/specs/2026-07-30-learn-section-redesign-design.md` built a
real teaching engine — step types that actually check and evaluate answers
(`teach`/`practice`/`explore`/`open-response`/`mastery-check`/`story-build`)
instead of the old fake ones (`explain` narrates once, `quiz` silently
resets on a wrong pick, `label` is tap-memorization, `activity` accepts any
spoken sound as "correct"). It also built age-banded lessons
(`ageBand: 'young'|'middle'|'old'`, sorted to the top of a course by
`lessonsForAge()`).

That redesign only shipped to 3 of 10 courses: Literacy, Numeracy, Feelings
& Friends. It explicitly deferred (§7) the other 7 — Gardening, Robotics,
Science, Cooking, Animals, Space, Music — which still run 100% on the old
fake step types, with zero `young`-band content. A pre-reader taking
Gardening gets the identical lesson a 9-year-old gets.

This pass finishes that migration and adds 4 new courses, all built on the
real engine from day one.

## 2. Reference pattern (already shipped — copy this exactly)

`api/_courseData.js` → `literacy`, `numeracy`, `sel` courses are the
canonical example. Every lesson:

```js
{
  id, title, emoji,
  ageBand: 'young' | 'middle' | 'old',   // young=3-5, middle=6-8, old=9-10
  objective: 'One sentence, parent-facing: what they will learn.',
  steps: [ ...6-7 steps built from: teach, practice, explore, open-response,
           mastery-check, story-build (SEL-style judgment calls only) ],
  printSheet: { title, facts: [...], colourPrompt, visual },
}
```

Step shapes (copy field names exactly — `api/lesson.js` and the card
components read these verbatim):
- `teach`: `{ type, narration, emoji, fact, checkQuestion, checkAnswer }`
- `practice`: `{ type, narration, question, options: ['emoji Text', ...], correct: index, hints: [per-option hint or null] }`
- `explore`: `{ type, mode: 'sequence'|'sort'|'match', narration, instruction?, items, visual? }`
  - `sequence`: `items: ['emoji Text', ...]` (tap in order)
  - `sort`: `items: [{text}], buckets: ['Label', 'Label']`
  - `match`: `items: [{left, right}, ...]`
- `open-response`: `{ type, narration, objective, rubric }` — rubric is sent
  to the LLM verbatim, keep it lenient and warm, especially for young band.
- `mastery-check`: `{ type, narration, items: [{question, options, correct, hints}] }`
- `story-build` (judgment-call content, mainly SEL-flavored moments): `{ type, beats: [{prompt, choices: [{text, response, isIdeal?}]}] }`

## 3. Under-6 UI (already implemented this session)

`LessonPage.jsx` passes `young={lesson.ageBand === 'young'}` into
`TeachCard`/`PracticeCard`/`ExploreCard`. When true, emoji render larger and
option/chip text becomes a smaller de-emphasized caption (narration already
carries the words aloud) — see `PracticeCard.module.css` `.optionYoung`,
`ExploreCard.module.css` `.chipYoung`, `TeachCard.module.css`
`.emojiYoung`/`.factYoung`. No further code changes needed — authoring a
lesson with `ageBand: 'young'` gets this automatically.

**Authoring rules for young-band content:**
- Max 2-3 options per `practice`/`mastery-check` item (fewer choices, bigger targets).
- Prefer `explore` `sequence`/`sort` over `match` — `match` shows plain text
  pairs with no emoji, which a pre-reader can't read at all. If `match` is
  used for young band, put an emoji in both `left` and `right`.
- Keep `fact` and `narration` short (1 sentence, concrete, no abstraction).
- `open-response` rubrics must be lenient — young band is evaluated for
  *any* reasonable attempt, never precision.

## 4. Legacy course migration (7 courses)

For each of Gardening, Robotics, Science, Cooking, Animals, Space, Music:
1. Migrate every existing lesson's steps: `explain`→`teach` (add a spoken
   `checkQuestion`/`checkAnswer`), `quiz`→`practice` (add per-option
   `hints`), `label`→`explore` (`mode: 'sequence'`, same items), `activity`→
   `open-response` (add `objective` + lenient `rubric`).
2. Add an `objective` string to every lesson.
3. Tag existing lessons `ageBand: 'middle'` or `'old'` by actual complexity
   (e.g. Gardening's "How Seeds Grow" → middle; Space's "Understanding
   Gravity" or Robotics' sensor/coding lessons → old).
4. Author ONE new `ageBand: 'young'` lesson per course covering the single
   most concrete, foundational idea in that subject (e.g. Gardening young =
   "what a plant needs" with real objects, not seed biology; Space young =
   "day and night"; Music young = "loud and quiet sounds"). 4-5 steps, no
   `mastery-check` needed at this band if it doesn't fit — `teach` +
   `explore` + `practice` + `open-response` is enough.
5. Keep `printSheet` for every lesson (existing pattern, unchanged shape).
6. Do not remove or rename lesson `id`s that already exist elsewhere (progress
   records in Supabase key off `courseId`+`lessonId`) — only add the new
   young lesson as a new id, and keep the existing ids for migrated lessons.

## 5. Four new courses

Fill real gaps in the `SUBJECTS` taxonomy (`src/utils/subjects.js`), each
authored across all 3 bands from the start using only the real step types:

| Course id | subject | Title | Why |
|---|---|---|---|
| `art` | `creativity` | Art & Colors | Colors, shapes, mixing, drawing — concrete and highly young-band-friendly; pairs with Music under Creativity. |
| `body` | `life-skills` | My Body & Health | Body parts, hygiene, staying healthy; pairs with Cooking under Life Skills. |
| `weather` | `science` | Weather & Seasons | Clouds, rain, seasons, dressing for weather; pairs with Gardening/Science/Animals/Space under Science & Nature. |
| `community` | `community` (new subject) | Community Helpers | Jobs, kindness, sharing — narrative-driven like SEL; add `{ id: 'community', title: 'Community Helpers', emoji: '🤝' }` to `SUBJECTS` in `src/utils/subjects.js`. |

Each new course gets 3 lessons (one per band, mirroring literacy/numeracy/sel
exactly) unless a course naturally supports more — err toward 3 to keep
scope real and match the shipped pattern.

Cover art: generate `public/courses/{art,body,weather,community}.webp` via
the NVIDIA NIM API (`NVIDIA_API_KEY` in `.env`), matching the style/palette
of the existing `public/courses/*.webp` set (flat, friendly, single-subject
icon-style illustration). If generation isn't feasible in this pass, fall
back to reusing the course's `emoji` as the visual (already how `CoursesPage`
renders when a cover image is missing — check `CoursesPage.jsx` before
assuming a webp is required).

## 6. Registration

New courses must be appended to the `COURSES` array in `api/_courseData.js`
(same array literacy/numeracy/sel are in) — `api/courses.js` and
`api/lesson.js` read from this array directly, no other registration point
exists. New subject `community` must be added to `SUBJECTS` in
`src/utils/subjects.js`.

## 7. Verification

- `npm run test` (Vitest) must still pass — no schema field typos.
- `npm run build` must succeed.
- Spot check in `api/_courseData.js`: every lesson has `ageBand`, `objective`,
  and only uses the 6 real step types (no stray `explain`/`quiz`/`label`/
  `activity` left in migrated courses).
