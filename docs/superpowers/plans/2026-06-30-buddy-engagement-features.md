# Buddy Engagement Features Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add five engagement features to Voice Buddy: lesson duration display, lesson completion tracking, random step narrations, a daily Buddy activity widget, and Buddy memory (referencing past conversations and completed lessons in chat).

**Architecture:** Lesson duration and completion are display-layer additions to CoursesPage and LessonPage, backed by a new Supabase `lesson_completions` table. Random narrations add a `narrations[]` array to each step in courses.js and a `pickNarration` utility. The daily activity and Buddy memory features add state to ChildPage and inject context into the existing `useChat` system prompt.

**Tech Stack:** React 18 + Vite, CSS Modules, Supabase (postgres + auth), localStorage.

## Global Constraints

- Git root: `/home/byron` (NOT `/home/byron/voice-buddy`). All `git` commands run from `/home/byron`. Build and dev server run from `/home/byron/voice-buddy`.
- No TypeScript, no PropTypes, no external animation libraries.
- No test runner (`npm test` does not exist). Verification = `npm run build` (must pass, 0 errors) + described browser steps.
- `npm run build` runs from `/home/byron/voice-buddy`.
- All source files live under `/home/byron/src/` (not under `voice-buddy/`).
- CSS Modules for all new component styles.
- React hooks rules: all hooks unconditionally before any early return.
- Commits from `/home/byron` using `git add <files> && git commit -m "..."`.
- No `navigate()` calls in render — only in effects or event handlers.

---

### Task 1: Lesson duration display on Courses page

**Files:**
- Modify: `src/pages/CoursesPage.jsx`
- Modify: `src/pages/CoursesPage.module.css`

**Context:** CoursesPage lists courses and lessons. `settings.childAge` is read from localStorage via `getSettings()`. If `childAge <= 6`, lessons show `~15 min`; otherwise `~30 min`. The duration badge sits inline with the lesson title.

**Interfaces:**
- Consumes: `getSettings()` from `src/utils/storage.js` — returns `{ childAge: number, ... }`
- Produces: nothing new (display only)

- [ ] **Step 1: Import getSettings and read childAge in CoursesPage**

In `src/pages/CoursesPage.jsx`, add to existing imports:
```jsx
import { useState } from 'react'  // already imported — confirm it's there
import { getSettings } from '../utils/storage.js'
```

Add inside the component body (after existing `useState` calls):
```jsx
const [settings] = useState(() => getSettings())
const durationLabel = (settings.childAge || 7) <= 6 ? '~15 min' : '~30 min'
```

- [ ] **Step 2: Add duration badge to lesson buttons**

In the lesson list `<ul>`, the lesson button currently ends with:
```jsx
<span className={styles.lessonArrow}>{isPro ? '→' : '🔒'}</span>
```

Change the full `<button>` inside `course.lessons.map(...)` to:
```jsx
<button
  className={styles.lessonBtn}
  onClick={() => handleLesson(course.id, lesson.id)}
>
  <span className={styles.lessonNum}>{i + 1}</span>
  <span className={styles.lessonEmoji}>{lesson.emoji}</span>
  <span className={styles.lessonTitle}>{lesson.title}</span>
  <span className={styles.lessonDuration}>{durationLabel}</span>
  <span className={styles.lessonArrow}>{isPro ? '→' : '🔒'}</span>
</button>
```

- [ ] **Step 3: Add .lessonDuration style**

In `src/pages/CoursesPage.module.css`, add after the existing `.lessonTitle` rule:
```css
.lessonDuration {
  font-size: 0.72rem;
  color: rgba(255,255,255,0.6);
  background: rgba(255,255,255,0.12);
  border-radius: 20px;
  padding: 2px 8px;
  margin-left: auto;
  white-space: nowrap;
  flex-shrink: 0;
}
```

- [ ] **Step 4: Build and verify**

```bash
cd /home/byron/voice-buddy && npm run build
```
Expected: `✓ built in X.XXs` — 0 errors.

Browser check: open `/courses`, expand a course, confirm each lesson shows `~15 min` or `~30 min` badge depending on childAge setting.

- [ ] **Step 5: Commit**

```bash
cd /home/byron && git add src/pages/CoursesPage.jsx src/pages/CoursesPage.module.css
git commit -m "feat: show lesson duration badge on courses page"
```

---

### Task 2: Lesson completion tracker

**Files:**
- Create: `src/hooks/useCompletions.js`
- Modify: `src/pages/LessonPage.jsx`
- Modify: `src/pages/CoursesPage.jsx`
- Modify: `src/pages/CoursesPage.module.css`

**Context:** When a child finishes a lesson (reaches the RewardScreen), the completion is saved to a Supabase table `lesson_completions`. CoursesPage reads completions and shows a ✅ on finished lessons. Requires a one-time Supabase table setup (step 1).

**Interfaces:**
- Produces: `useCompletions()` → `{ completions: Set<string>, markComplete(courseId, lessonId): Promise<void> }` where keys are `'courseId:lessonId'`
- Consumes (LessonPage): `markComplete(courseId, lessonId)` called when lesson finishes
- Consumes (CoursesPage): `completions.has('gardening:seeds')` → boolean

- [ ] **Step 1: Create Supabase table**

Go to the Supabase dashboard → SQL Editor and run:
```sql
CREATE TABLE IF NOT EXISTS lesson_completions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  course_id text NOT NULL,
  lesson_id text NOT NULL,
  completed_at timestamptz DEFAULT now() NOT NULL,
  UNIQUE(user_id, course_id, lesson_id)
);

ALTER TABLE lesson_completions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own completions" ON lesson_completions
  FOR ALL USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
```

- [ ] **Step 2: Create useCompletions hook**

Create `/home/byron/src/hooks/useCompletions.js`:
```js
import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase.js'

export function useCompletions() {
  const [completions, setCompletions] = useState(new Set())

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) return
      supabase
        .from('lesson_completions')
        .select('course_id, lesson_id')
        .eq('user_id', user.id)
        .then(({ data }) => {
          if (data) setCompletions(new Set(data.map(r => `${r.course_id}:${r.lesson_id}`)))
        })
    })
  }, [])

  const markComplete = useCallback(async (courseId, lessonId) => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    await supabase.from('lesson_completions').upsert(
      { user_id: user.id, course_id: courseId, lesson_id: lessonId },
      { onConflict: 'user_id,course_id,lesson_id' }
    )
    setCompletions(prev => new Set([...prev, `${courseId}:${lessonId}`]))
  }, [])

  return { completions, markComplete }
}
```

- [ ] **Step 3: Call markComplete from LessonPage when lesson finishes**

In `src/pages/LessonPage.jsx`, add import at the top:
```jsx
import { useCompletions } from '../hooks/useCompletions.js'
```

Inside the component body (after `const speech = useSpeech(settings)`):
```jsx
const { markComplete } = useCompletions()
```

Find the `handleNext` function and update the else branch:
```jsx
const handleNext = () => {
  if (stepIndex < steps.length - 1) {
    setStepIndex(i => i + 1)
  } else {
    speech.stopSpeaking()
    markComplete(courseId, lessonId)
    setPhase('reward')
  }
}
```

- [ ] **Step 4: Show completion checkmarks on CoursesPage**

In `src/pages/CoursesPage.jsx`, add import:
```jsx
import { useCompletions } from '../hooks/useCompletions.js'
```

Inside the component body (after the `durationLabel` line from Task 1):
```jsx
const { completions } = useCompletions()
```

In the lesson button markup, add a completion indicator between `lessonEmoji` and `lessonTitle`:
```jsx
<button
  className={styles.lessonBtn}
  onClick={() => handleLesson(course.id, lesson.id)}
>
  <span className={styles.lessonNum}>{i + 1}</span>
  <span className={styles.lessonEmoji}>{lesson.emoji}</span>
  <span className={styles.lessonTitle}>{lesson.title}</span>
  {completions.has(`${course.id}:${lesson.id}`) && (
    <span className={styles.lessonCheck}>✅</span>
  )}
  <span className={styles.lessonDuration}>{durationLabel}</span>
  <span className={styles.lessonArrow}>{isPro ? '→' : '🔒'}</span>
</button>
```

- [ ] **Step 5: Add .lessonCheck style**

In `src/pages/CoursesPage.module.css`, add:
```css
.lessonCheck {
  font-size: 0.9rem;
  flex-shrink: 0;
}
```

- [ ] **Step 6: Build and verify**

```bash
cd /home/byron/voice-buddy && npm run build
```
Expected: `✓ built in X.XXs` — 0 errors.

Browser check: complete a lesson (reach reward screen), go back to courses, confirm ✅ appears next to that lesson. Reload — confirm ✅ persists (fetched from Supabase).

- [ ] **Step 7: Commit**

```bash
cd /home/byron && git add src/hooks/useCompletions.js src/pages/LessonPage.jsx src/pages/CoursesPage.jsx src/pages/CoursesPage.module.css
git commit -m "feat: lesson completion tracker with Supabase persistence"
```

---

### Task 3: Random step narrations

**Files:**
- Create: `src/utils/pickNarration.js`
- Modify: `src/utils/courses.js`
- Modify: `src/pages/LessonPage.jsx`

**Context:** Each lesson step currently has a single `narration` string. This task adds optional `narrations: string[]` arrays to explain and activity steps (2 variants each). `pickNarration` selects randomly from the array, falling back to `narration` if no array exists. Age adaptation (`narrationYoung`) takes precedence for children ≤ 6.

**Interfaces:**
- Produces: `pickNarration(step, childAge)` → `string`
- Consumes (LessonPage): replaces inline narration logic with `pickNarration(step, childAge)`

- [ ] **Step 1: Create pickNarration utility**

Create `/home/byron/src/utils/pickNarration.js`:
```js
export function pickNarration(step, childAge) {
  if (childAge <= 6 && step.narrationYoung) return step.narrationYoung
  const pool = step.narrations?.length ? step.narrations : [step.narration]
  return pool[Math.floor(Math.random() * pool.length)]
}
```

- [ ] **Step 2: Update courses.js — add narrations arrays to explain and activity steps**

Replace the entire contents of `/home/byron/src/utils/courses.js` with the version below. Only `explain` and `activity` steps gain `narrations[]`; `quiz` and `label` steps are unchanged (their narration is instruction, not greeting).

```js
export const COURSES = [
  {
    id: 'gardening',
    title: 'Gardening for Kids',
    emoji: '🌱',
    color: ['#14532d', '#166534'],
    description: 'Learn to grow your own food and care for plants',
    lessons: [
      {
        id: 'seeds',
        title: 'How Seeds Grow',
        emoji: '🌰',
        steps: [
          {
            type: 'explain',
            narration: 'Did you know a tiny seed holds a whole plant sleeping inside it? Let\'s find out how it wakes up!',
            narrations: [
              'Did you know a tiny seed holds a whole plant sleeping inside it? Let\'s find out how it wakes up!',
              'Every big tree you\'ve ever seen started as a tiny little seed! Want to learn how it grows?',
            ],
            narrationYoung: 'A little seed has a baby plant sleeping inside! Let\'s wake it up!',
            emoji: '🌰',
            fact: 'Seeds need water and warmth to wake up and start growing. Inside every seed is a tiny baby plant!',
          },
          {
            type: 'quiz',
            narration: 'Now let\'s test what you learned — what does a seed need to wake up and start growing?',
            question: 'What wakes a seed up?',
            options: ['🌧️ Water & warmth', '🍦 Ice cream', '🌑 Darkness', '🎵 Music'],
            correct: 0,
          },
          {
            type: 'label',
            narration: 'Amazing! Now let\'s name the parts of a plant. Tap each label in order!',
            visual: '🌱',
            items: ['🌿 Roots', '🌾 Stem', '🍃 Leaves', '🌸 Flower'],
          },
          {
            type: 'activity',
            narration: 'Great job! Tell me — what is one thing a plant needs to grow?',
            narrations: [
              'Great job! Tell me — what is one thing a plant needs to grow?',
              'You\'re a plant expert now! Can you tell me — what does a plant need to be happy?',
            ],
          },
        ],
        printSheet: {
          title: 'How Seeds Grow',
          facts: [
            'Seeds need water and warmth to wake up and start growing.',
            'Roots drink water from the soil.',
            'Leaves catch sunlight to make food for the plant.',
          ],
          colourPrompt: 'Colour the plant and draw raindrops falling on it!',
          visual: '🌱',
        },
      },
      {
        id: 'soil',
        title: 'What Plants Need',
        emoji: '☀️',
        steps: [
          {
            type: 'explain',
            narration: 'Plants make their own food from sunlight, water, air, and nutrients in the soil — like a recipe with four ingredients!',
            narrations: [
              'Plants make their own food from sunlight, water, air, and nutrients in the soil — like a recipe with four ingredients!',
              'Here\'s something amazing — plants don\'t eat food like you do, they MAKE their own! Want to know how?',
            ],
            narrationYoung: 'Plants eat sunlight like you eat food! They also need water, air, and soil.',
            emoji: '☀️',
            fact: 'Plants make food using sunlight — this is called photosynthesis. They need sun, water, air and soil nutrients!',
          },
          {
            type: 'quiz',
            narration: 'Let\'s play a quiz! Which of these does a plant NOT need to grow?',
            question: 'Which does a plant NOT need?',
            options: ['☀️ Sunlight', '💧 Water', '🍦 Ice cream', '🌍 Soil'],
            correct: 2,
          },
          {
            type: 'explain',
            narration: 'Soil is full of tiny nutrients — like vitamins for plants. Earthworms help dig through the soil and make it better!',
            narrations: [
              'Soil is full of tiny nutrients — like vitamins for plants. Earthworms help dig through the soil and make it better!',
              'Here\'s a cool secret — the soil under your feet is full of tiny helpers! And earthworms are the very best ones!',
            ],
            narrationYoung: 'Soil has tiny food bits inside for plants! Worms help mix the soil.',
            emoji: '🌍',
            fact: 'Earthworms improve the soil by tunnelling through it and mixing in nutrients. They are a plant\'s best friend!',
          },
          {
            type: 'activity',
            narration: 'Wonderful! Can you name all four things a plant needs to grow? Say them out loud!',
            narrations: [
              'Wonderful! Can you name all four things a plant needs to grow? Say them out loud!',
              'You\'ve learned so much about plants! Can you remember the four things they need? Give it a try!',
            ],
          },
        ],
        printSheet: {
          title: 'What Plants Need',
          facts: [
            'Plants need sunlight, water, air, and soil nutrients to grow.',
            'Photosynthesis is how plants make food from sunlight.',
            'Earthworms improve the soil by tunnelling through it.',
          ],
          colourPrompt: 'Draw a plant soaking up sunlight and drinking water through its roots!',
          visual: '🌍',
        },
      },
      {
        id: 'grow',
        title: 'Grow Your First Plant',
        emoji: '🪴',
        steps: [
          {
            type: 'explain',
            narration: 'You can grow a bean plant at home with just a cup, some soil, a bean seed, and a little water. Let\'s learn how!',
            narrations: [
              'You can grow a bean plant at home with just a cup, some soil, a bean seed, and a little water. Let\'s learn how!',
              'Guess what? You can be a real gardener today! All you need is a cup, soil, a seed, and water!',
            ],
            narrationYoung: 'We can grow our own plant at home! We just need a cup, soil, a seed, and water!',
            emoji: '🪴',
            fact: 'Bean seeds sprout in 5 to 10 days! Keep the soil damp and put your cup in a sunny spot.',
          },
          {
            type: 'label',
            narration: 'Here are the steps to plant your bean seed. Tap them in order!',
            visual: '🪴',
            items: ['🪣 Fill cup with soil', '🫘 Push seed 2 cm in', '💧 Water gently', '🌤️ Place in sunlight'],
          },
          {
            type: 'quiz',
            narration: 'How deep should you plant a bean seed?',
            question: 'How deep does a bean seed go?',
            options: ['👍 About 2 cm — thumb depth', '⬇️ Very deep — 10 cm', '🪴 Just sit on top of soil'],
            correct: 0,
          },
          {
            type: 'activity',
            narration: 'Great! What container could you use to grow your plant at home? Be creative!',
            narrations: [
              'Great! What container could you use to grow your plant at home? Be creative!',
              'You know how to grow a bean plant now! What would you use as your pot if you tried it today?',
            ],
          },
        ],
        printSheet: {
          title: 'Grow Your First Plant',
          facts: [
            'Fill a cup with soil and push a bean seed in 2 cm deep.',
            'Water it gently and place it in a sunny spot.',
            'Your bean sprout will appear in 5 to 10 days!',
          ],
          colourPrompt: 'Draw your bean plant growing in its cup — add roots, a stem, and leaves!',
          visual: '🪴',
        },
      },
      {
        id: 'bugs',
        title: 'Garden Helpers & Bugs',
        emoji: '🐛',
        steps: [
          {
            type: 'explain',
            narration: 'Bees are garden superheroes! They carry pollen from flower to flower — this is called pollination and it helps plants make fruit and seeds.',
            narrations: [
              'Bees are garden superheroes! They carry pollen from flower to flower — this is called pollination and it helps plants make fruit and seeds.',
              'Did you know bees are some of the hardest workers in nature? They visit flowers all day carrying something very special!',
            ],
            narrationYoung: 'Bees carry pollen to flowers to help make fruit and seeds!',
            emoji: '🐝',
            fact: 'Without bees to pollinate flowers, most fruits and vegetables would not grow. Bees are essential for our food!',
          },
          {
            type: 'quiz',
            narration: 'Which creature helps the garden by improving the soil?',
            question: 'Who helps improve garden soil?',
            options: ['🪱 Earthworm', '🦟 Mosquito', '🦋 Butterfly', '🕷️ Spider'],
            correct: 0,
          },
          {
            type: 'explain',
            narration: 'Ladybugs are tiny garden protectors. They eat aphids — tiny bugs that damage plants. One ladybug can eat 5 000 aphids in its lifetime!',
            narrations: [
              'Ladybugs are tiny garden protectors. They eat aphids — tiny bugs that damage plants. One ladybug can eat 5 000 aphids in its lifetime!',
              'Here\'s a tiny but mighty garden hero — the ladybug! It eats the bad bugs that try to hurt plants!',
            ],
            narrationYoung: 'Ladybugs eat the bad bugs that hurt plants. They help keep the garden safe!',
            emoji: '🐞',
            fact: 'A single ladybug can eat up to 5 000 aphids in its lifetime, protecting plants from damage.',
          },
          {
            type: 'activity',
            narration: 'Which garden bug is your favourite, and why? Tell me!',
            narrations: [
              'Which garden bug is your favourite, and why? Tell me!',
              'Now you know about bees, earthworms, and ladybugs! Which one is your favourite? Tell me why!',
            ],
          },
        ],
        printSheet: {
          title: 'Garden Helpers & Bugs',
          facts: [
            'Bees pollinate flowers so plants can make fruit and seeds.',
            'Earthworms tunnel through soil and make it better for plants.',
            'Ladybugs eat aphids that would otherwise damage plants.',
          ],
          colourPrompt: 'Draw a bee visiting a flower and colour the whole garden scene!',
          visual: '🌸',
        },
      },
    ],
  },
  {
    id: 'robotics',
    title: 'Robotics for Kids',
    emoji: '🤖',
    color: ['#1e3a8a', '#1e40af'],
    description: 'Discover how robots work and learn to think like an engineer',
    lessons: [
      {
        id: 'what',
        title: 'What is a Robot?',
        emoji: '🦾',
        steps: [
          {
            type: 'explain',
            narration: 'A robot is a machine that can sense its surroundings, think about what to do, and then act. Just like you — but made of metal and code!',
            narrations: [
              'A robot is a machine that can sense its surroundings, think about what to do, and then act. Just like you — but made of metal and code!',
              'Have you ever wondered how robots work? They\'re actually a lot like you — they can sense, think, and move!',
            ],
            narrationYoung: 'A robot can see, think, and move — like a helpful machine friend!',
            emoji: '🤖',
            fact: 'Robots have three main abilities: sensing (cameras, microphones), thinking (a computer brain), and acting (motors that move things).',
          },
          {
            type: 'quiz',
            narration: 'Which of these is a real working robot?',
            question: 'Which one is a real robot?',
            options: ['🤖 A robot vacuum cleaner', '🚗 A toy car (no sensors)', '✏️ A pencil', '📚 A book'],
            correct: 0,
          },
          {
            type: 'label',
            narration: 'Every robot has three parts. Tap the labels to match them!',
            visual: '🤖',
            items: ['👁️ Sensors (sense)', '💻 Computer (think)', '⚙️ Motors (act)'],
          },
          {
            type: 'activity',
            narration: 'Can you name a robot you have seen in real life or on TV? Tell me about it!',
            narrations: [
              'Can you name a robot you have seen in real life or on TV? Tell me about it!',
              'You\'re a robot expert now! Tell me — have you ever seen a real robot, and what did it do?',
            ],
          },
        ],
        printSheet: {
          title: 'What is a Robot?',
          facts: [
            'Robots can sense, think, and act.',
            'A robot vacuum cleaner senses dirt and navigates around your house.',
            'Mars rovers are robots that explore another planet!',
          ],
          colourPrompt: 'Draw your own robot and label its sensors (eyes), computer brain, and motors (legs or wheels)!',
          visual: '🤖',
        },
      },
      {
        id: 'sensors',
        title: 'How Robots See & Feel',
        emoji: '👁️',
        steps: [
          {
            type: 'explain',
            narration: 'Robots use sensors to understand the world around them. Cameras are like eyes, microphones are like ears, and touch sensors are like skin!',
            narrations: [
              'Robots use sensors to understand the world around them. Cameras are like eyes, microphones are like ears, and touch sensors are like skin!',
              'How does a robot know what\'s happening around it? It uses special parts called sensors — like superpowers for robots!',
            ],
            narrationYoung: 'Robots have sensor eyes, ears, and skin to feel the world around them!',
            emoji: '👁️',
            fact: 'Some robots use infrared sensors to see heat, or sonar to detect distance — like a bat using echoes to navigate!',
          },
          {
            type: 'quiz',
            narration: 'What sensor would help a robot see clearly in total darkness?',
            question: 'What helps a robot see in the dark?',
            options: ['🌡️ Infrared camera', '🎙️ Microphone', '🎡 Wheel sensor', '🔘 Button'],
            correct: 0,
          },
          {
            type: 'label',
            narration: 'Match each sensor to what it does for the robot!',
            visual: '🤖',
            items: ['📷 Camera = Eyes', '🎙️ Microphone = Ears', '🤚 Touch pad = Skin'],
          },
          {
            type: 'activity',
            narration: 'If you were building a robot to cook food, which sensors would it need? Think carefully!',
            narrations: [
              'If you were building a robot to cook food, which sensors would it need? Think carefully!',
              'Great thinking! Now imagine your very own cooking robot — what would it need to see, hear, and touch? Tell me!',
            ],
          },
        ],
        printSheet: {
          title: 'How Robots See & Feel',
          facts: [
            'Cameras help robots see their environment.',
            'Microphones help robots hear and understand speech.',
            'Touch sensors help robots feel and handle objects safely.',
          ],
          colourPrompt: 'Draw a robot and add its sensors — label the camera (eyes), microphone (ears), and touch sensor (hands)!',
          visual: '👁️',
        },
      },
      {
        id: 'code',
        title: 'Giving Robots Instructions',
        emoji: '💻',
        steps: [
          {
            type: 'explain',
            narration: 'Code is like a recipe — it gives the robot step-by-step instructions. The robot follows every single step in exactly the right order!',
            narrations: [
              'Code is like a recipe — it gives the robot step-by-step instructions. The robot follows every single step in exactly the right order!',
              'Imagine giving your robot a list of instructions to follow perfectly every time. That list is called CODE!',
            ],
            narrationYoung: 'Code tells robots what to do, step by step — like a recipe!',
            emoji: '💻',
            fact: 'Robots follow code instructions perfectly. If you make even one mistake in your code, the robot does the wrong thing!',
          },
          {
            type: 'label',
            narration: 'Here is a robot\'s morning routine algorithm. Tap the steps in order!',
            visual: '🤖',
            items: ['😴 Wake up sensors', '👀 Check surroundings', '🤔 Make a decision', '⚙️ Move motors', '🔄 Repeat'],
          },
          {
            type: 'quiz',
            narration: 'What is code most like?',
            question: 'Code is most like a…',
            options: ['📖 Recipe with exact steps', '💭 Random idea', '✨ Magic spell', '🎨 Drawing'],
            correct: 0,
          },
          {
            type: 'activity',
            narration: 'If you were coding a robot to make a sandwich, what would be your very first step? Tell me!',
            narrations: [
              'If you were coding a robot to make a sandwich, what would be your very first step? Tell me!',
              'You know how to think like a coder! What would step one be if your robot had to make a sandwich?',
            ],
          },
        ],
        printSheet: {
          title: 'Giving Robots Instructions',
          facts: [
            'Code gives robots step-by-step instructions to follow.',
            'Robots follow every instruction exactly — no skipping allowed!',
            'Loops in code make robots repeat steps automatically.',
          ],
          colourPrompt: 'Write your own robot recipe! Draw the steps your robot takes to do a task of your choice.',
          visual: '💻',
        },
      },
      {
        id: 'build',
        title: 'Design Your Own Robot',
        emoji: '🔧',
        steps: [
          {
            type: 'explain',
            narration: 'Every great robot starts with a question: what problem does it solve? Engineers always design robots to help with something important!',
            narrations: [
              'Every great robot starts with a question: what problem does it solve? Engineers always design robots to help with something important!',
              'Before any engineer builds a robot, they ask one big question — what problem will this robot solve? That\'s the most important step!',
            ],
            narrationYoung: 'Robots are built to help solve problems. What problem could your robot fix?',
            emoji: '🔧',
            fact: 'The best engineers always start with the problem, not the gadget. Understanding the problem deeply leads to better inventions!',
          },
          {
            type: 'quiz',
            narration: 'What is the very first thing an engineer thinks about when designing a new robot?',
            question: 'What does an engineer design first?',
            options: ['🔧 What problem it solves', '🎨 What colour to paint it', '🛞 How many wheels it has', '🏷️ What name to give it'],
            correct: 0,
          },
          {
            type: 'label',
            narration: 'Engineers follow a design loop. Tap the steps in order!',
            visual: '🔧',
            items: ['🔍 Sense the problem', '💡 Plan a solution', '🔨 Build and test', '✨ Improve it'],
          },
          {
            type: 'activity',
            narration: 'Now it\'s your turn! Describe your dream robot — what problem does it solve and what does it look like?',
            narrations: [
              'Now it\'s your turn! Describe your dream robot — what problem does it solve and what does it look like?',
              'You think like a real engineer! Tell me about your dream robot — what would it do, and what would it look like?',
            ],
          },
        ],
        printSheet: {
          title: 'Design Your Own Robot',
          facts: [
            'Always start with the problem your robot will solve.',
            'Sensors help the robot sense its environment.',
            'Motors make the robot move, grab, and interact.',
          ],
          colourPrompt: 'Draw your dream robot! Label its sensors, computer brain, and motors. Give it a name!',
          visual: '🔧',
        },
      },
    ],
  },
  {
    id: 'science',
    title: 'Science Experiments',
    emoji: '🔬',
    color: ['#7c2d12', '#9a3412'],
    description: 'Do fun experiments and discover how the world works',
    lessons: [
      {
        id: 'volcano',
        title: 'Baking Soda Volcano',
        emoji: '🌋',
        steps: [
          {
            type: 'explain',
            narration: 'When baking soda — a base — meets vinegar — an acid — they react and make lots of carbon dioxide gas. That\'s what causes the fizzy eruption!',
            narrations: [
              'When baking soda — a base — meets vinegar — an acid — they react and make lots of carbon dioxide gas. That\'s what causes the fizzy eruption!',
              'Here\'s a fun science secret — two ordinary kitchen things can make a mini explosion when they meet! Want to find out what they are?',
            ],
            narrationYoung: 'Baking soda and vinegar have a fizzy reaction when they touch each other!',
            emoji: '🌋',
            fact: 'Acids and bases react together to make carbon dioxide gas. The bubbles rush out so fast they look like a volcano erupting!',
          },
          {
            type: 'label',
            narration: 'What do you need for the volcano experiment? Tap the ingredients in order!',
            visual: '🌋',
            items: ['🧪 Baking soda', '🫙 Vinegar', '🎨 Food colouring', '🥣 Container'],
          },
          {
            type: 'quiz',
            narration: 'Why does the baking soda volcano fizz?',
            question: 'Why does the volcano fizz?',
            options: ['⚗️ An acid meets a base', '🔥 It gets too hot', '💧 Water is boiling', '✨ Magic!'],
            correct: 0,
          },
          {
            type: 'activity',
            narration: 'Have you ever tried this experiment at home? Tell me what you saw — or what you think would happen!',
            narrations: [
              'Have you ever tried this experiment at home? Tell me what you saw — or what you think would happen!',
              'You\'re a scientist now! Have you done the volcano experiment? Tell me what happened — or what you predict would happen!',
            ],
          },
        ],
        printSheet: {
          title: 'Baking Soda Volcano',
          facts: [
            'Baking soda is a BASE and vinegar is an ACID.',
            'When an acid and base meet, they make carbon dioxide gas.',
            'The gas bubbles up and creates a fizzy "eruption"!',
          ],
          colourPrompt: 'Draw your volcano erupting! Colour the fizzy lava bursting out.',
          visual: '🌋',
        },
      },
      {
        id: 'rainbow',
        title: 'Make a Rainbow',
        emoji: '🌈',
        steps: [
          {
            type: 'explain',
            narration: 'White sunlight is actually made of ALL the colours mixed together. When light bends through water or glass, it splits into a beautiful rainbow!',
            narrations: [
              'White sunlight is actually made of ALL the colours mixed together. When light bends through water or glass, it splits into a beautiful rainbow!',
              'Here\'s an amazing secret about sunshine — it looks white, but it\'s hiding ALL the colours of the rainbow inside it!',
            ],
            narrationYoung: 'Sunlight has all the colours hiding inside it. Water bends the light and shows them all!',
            emoji: '🌈',
            fact: 'You can make a rainbow at home by holding a glass of water in bright sunlight over a white sheet of paper. Try it!',
          },
          {
            type: 'quiz',
            narration: 'What splits white sunlight into rainbow colours?',
            question: 'What splits light into colours?',
            options: ['💧 Water or glass', '🪞 A mirror', '🔦 A torch', '☁️ A cloud'],
            correct: 0,
          },
          {
            type: 'label',
            narration: 'Rainbows always have the same colours in the same order. Tap them from top to bottom!',
            visual: '🌈',
            items: ['🔴 Red', '🟡 Yellow', '🟢 Green', '🔵 Blue'],
          },
          {
            type: 'activity',
            narration: 'Can you describe a rainbow you have seen? Where were you, and what did it look like?',
            narrations: [
              'Can you describe a rainbow you have seen? Where were you, and what did it look like?',
              'Rainbows are so magical! Have you ever seen one? Tell me where you were and all the colours you spotted!',
            ],
          },
        ],
        printSheet: {
          title: 'Make a Rainbow',
          facts: [
            'White light contains all the colours of the rainbow mixed together.',
            'Water and glass bend light to reveal all the colours.',
            'Rainbow colours always appear in order: red, orange, yellow, green, blue, violet.',
          ],
          colourPrompt: 'Colour in the rainbow using all the colours in the right order from top to bottom!',
          visual: '🌈',
        },
      },
      {
        id: 'float',
        title: 'Why Things Float',
        emoji: '🚢',
        steps: [
          {
            type: 'explain',
            narration: 'Things float when they push aside more water than they weigh. A huge ship floats because it\'s hollow inside — it pushes out a lot of water!',
            narrations: [
              'Things float when they push aside more water than they weigh. A huge ship floats because it\'s hollow inside — it pushes out a lot of water!',
              'Have you ever wondered why a giant ship floats but a tiny coin sinks? The answer is all about how much water something pushes away!',
            ],
            narrationYoung: 'Big hollow ships float because they push lots of water out of the way. Small solid coins sink!',
            emoji: '🚢',
            fact: 'This is called buoyancy. If an object weighs less than the water it pushes aside, it floats. If it weighs more, it sinks.',
          },
          {
            type: 'quiz',
            narration: 'Why does a huge heavy ship float but a tiny coin sinks?',
            question: 'Why does a ship float?',
            options: ['🚢 It\'s hollow and pushes out lots of water', '🪵 Ships are made of wood', '🧲 Coins are magnetic', '⚙️ Ships have engines'],
            correct: 0,
          },
          {
            type: 'label',
            narration: 'Can you sort these objects? Tap them in order — which float first, then which sink!',
            visual: '🌊',
            items: ['🪶 Cork (floats)', '🪵 Wood (floats)', '🪙 Coin (sinks)', '🪨 Rock (sinks)'],
          },
          {
            type: 'activity',
            narration: 'Try dropping different objects in water at home. Which ones float and which ones sink? Tell me what you found!',
            narrations: [
              'Try dropping different objects in water at home. Which ones float and which ones sink? Tell me what you found!',
              'You\'re a floating expert! What do you think would happen if you dropped a grape and a cork in water? Tell me your prediction!',
            ],
          },
        ],
        printSheet: {
          title: 'Why Things Float',
          facts: [
            'Objects float when they weigh less than the water they push aside.',
            'Ships are hollow, so they push out lots of water and float.',
            'Density is how heavy something is for its size.',
          ],
          colourPrompt: 'Draw objects floating and sinking in a bucket of water. Label each one "floats" or "sinks"!',
          visual: '🌊',
        },
      },
    ],
  },
]
```

- [ ] **Step 3: Update LessonPage to use pickNarration**

In `src/pages/LessonPage.jsx`, add import:
```jsx
import { pickNarration } from '../utils/pickNarration.js'
```

Find and replace the narration computation line:
```jsx
// BEFORE:
const narration = (childAge <= 6 && step?.narrationYoung) ? step.narrationYoung : step?.narration

// AFTER:
const narration = step ? pickNarration(step, childAge) : ''
```

- [ ] **Step 4: Build and verify**

```bash
cd /home/byron/voice-buddy && npm run build
```
Expected: `✓ built in X.XXs` — 0 errors.

Browser check: open a lesson and complete it once, then go back and start it again — Buddy should sometimes say a different opening narration on the second visit.

- [ ] **Step 5: Commit**

```bash
cd /home/byron && git add src/utils/pickNarration.js src/utils/courses.js src/pages/LessonPage.jsx
git commit -m "feat: random step narrations — pickNarration utility with 2 variants per step"
```

---

### Task 4: Buddy's daily activity widget

**Files:**
- Create: `src/utils/dailyActivities.js`
- Create: `src/components/DailyActivity.jsx`
- Create: `src/components/DailyActivity.module.css`
- Modify: `src/pages/ChildPage.jsx`

**Context:** Each day Buddy suggests a fun offline activity. The activity is day-indexed (rotates through 30 options by day-of-year) so it changes daily. The child can dismiss it; the dismissal persists until midnight via localStorage. On first load (before dismissal), Buddy speaks the activity as part of the greeting.

**Interfaces:**
- Produces:
  - `getDailyActivity()` → `{ emoji: string, title: string, description: string }`
  - `isDailyActivityDismissed()` → `boolean`
  - `dismissDailyActivity()` → `void`
- `<DailyActivity activity onDismiss />` — card component, no TTS inside

- [ ] **Step 1: Create dailyActivities utility**

Create `/home/byron/src/utils/dailyActivities.js`:
```js
const ACTIVITIES = [
  { emoji: '🍃', title: 'Leaf Explorer', description: 'Go outside and find 3 different leaves. Line them up from smallest to biggest!' },
  { emoji: '⭐', title: 'Star Artist', description: 'Draw your own constellation using dots on paper, then connect them into a picture!' },
  { emoji: '🐛', title: 'Bug Safari', description: 'Look under a rock or leaf outside and count all the tiny creatures you find!' },
  { emoji: '🫧', title: 'Bubble Science', description: 'Blow soap bubbles outside and see how big you can make them without popping!' },
  { emoji: '🪨', title: 'Rock Painter', description: 'Find a smooth rock outside and draw a face or pattern on it with pens or paint!' },
  { emoji: '🎵', title: 'Dance Inventor', description: 'Make up a 10-second dance to your favourite song and teach it to someone at home!' },
  { emoji: '🌈', title: 'Colour Hunt', description: 'Find one object for every colour of the rainbow somewhere in your house!' },
  { emoji: '🏗️', title: 'Tower Builder', description: 'Build the tallest tower you can using only books or boxes, then knock it down!' },
  { emoji: '🍎', title: 'Fruit Faces', description: 'Use pieces of fruit or vegetables to make a funny face on a plate!' },
  { emoji: '🌬️', title: 'Wind Watcher', description: 'Hold a tissue outside and watch how the wind moves it. Draw an arrow for which way it blows!' },
  { emoji: '🐾', title: 'Animal Parade', description: 'Walk around your home pretending to be 3 different animals one after another!' },
  { emoji: '💧', title: 'Water Painter', description: 'Paint with water on the pavement or a dark surface and watch your picture slowly disappear!' },
  { emoji: '📦', title: 'Box Robot', description: 'Collect empty boxes and build your own cardboard robot or spaceship!' },
  { emoji: '🌿', title: 'Seed Planter', description: 'Find a seed in the kitchen like an apple pip or bean and plant it in a cup of soil!' },
  { emoji: '🎭', title: 'Mirror Actor', description: 'Stand in front of a mirror and make 10 completely different funny faces!' },
  { emoji: '🧊', title: 'Ice Racer', description: 'Put an ice cube in a sunny spot and one in the shade — time which melts faster!' },
  { emoji: '🎈', title: 'Balloon Games', description: 'Blow up a balloon and keep it in the air as long as possible without letting it touch the floor!' },
  { emoji: '🌀', title: 'Paper Spinner', description: 'Cut a circle from paper, colour it in, then spin it on a pencil like a top!' },
  { emoji: '🌙', title: 'Cloud Watcher', description: 'Go outside and find 3 clouds that look like something. Draw them and write what they look like!' },
  { emoji: '🐠', title: 'Paper Fish', description: 'Fold a piece of paper in half and cut a fish shape, then decorate it with scales and patterns!' },
  { emoji: '🏃', title: 'Obstacle Course', description: 'Use cushions, chairs, and tape to make an obstacle course and time yourself through it!' },
  { emoji: '🌺', title: 'Nature Printer', description: 'Press a leaf or flower onto paper with paint to make a beautiful nature print!' },
  { emoji: '🎲', title: 'Dice Movement', description: 'Roll a dice — do that many jumping jacks, then roll again and do that many hops!' },
  { emoji: '🐦', title: 'Bird Watcher', description: 'Sit near a window for 5 minutes and count how many different birds you see or hear!' },
  { emoji: '🎨', title: 'Emotion Painter', description: 'Draw how you are feeling today using only colours and shapes — no words or people!' },
  { emoji: '🌊', title: 'Sound Map', description: 'Close your eyes for 1 minute and then draw everything you HEARD on a piece of paper!' },
  { emoji: '🪄', title: 'Magic Show', description: 'Practise one magic trick — like hiding a coin in your hand — and perform it for your family!' },
  { emoji: '🧁', title: 'Kitchen Helper', description: 'Help someone at home make one food item today — even if it\'s just stirring or pouring!' },
  { emoji: '📸', title: 'Photo Safari', description: 'Take 5 photos of interesting things in your home or garden using a device — make them beautiful!' },
  { emoji: '🗺️', title: 'Treasure Map', description: 'Draw a map of your home or garden and hide a small object for someone to find!' },
]

const dateKey = () => new Date().toISOString().slice(0, 10)

export function getDailyActivity() {
  const day = Math.floor(Date.now() / 86400000)
  return ACTIVITIES[day % ACTIVITIES.length]
}

export function isDailyActivityDismissed() {
  try {
    return localStorage.getItem('buddy_activity_' + dateKey()) === '1'
  } catch {
    return false
  }
}

export function dismissDailyActivity() {
  try {
    localStorage.setItem('buddy_activity_' + dateKey(), '1')
  } catch {}
}
```

- [ ] **Step 2: Create DailyActivity component**

Create `/home/byron/src/components/DailyActivity.jsx`:
```jsx
import styles from './DailyActivity.module.css'

export default function DailyActivity({ activity, onDismiss }) {
  return (
    <div className={styles.card}>
      <span className={styles.emoji}>{activity.emoji}</span>
      <div className={styles.body}>
        <p className={styles.title}>Today&apos;s Activity: {activity.title}</p>
        <p className={styles.desc}>{activity.description}</p>
      </div>
      <button className={styles.dismiss} onClick={onDismiss} aria-label="Dismiss activity">✕</button>
    </div>
  )
}
```

- [ ] **Step 3: Create DailyActivity styles**

Create `/home/byron/src/components/DailyActivity.module.css`:
```css
.card {
  display: flex;
  align-items: flex-start;
  gap: 10px;
  background: rgba(255,255,255,0.88);
  border-radius: var(--r-lg);
  padding: 12px 14px;
  box-shadow: var(--shadow-card);
  margin: 6px 16px 0;
  animation: slideIn 0.35s var(--spring);
  position: relative;
}

@keyframes slideIn {
  from { opacity: 0; transform: translateY(10px) scale(0.97); }
  to   { opacity: 1; transform: translateY(0) scale(1); }
}

.emoji {
  font-size: 2rem;
  line-height: 1;
  flex-shrink: 0;
  margin-top: 2px;
}

.body {
  flex: 1;
  min-width: 0;
}

.title {
  font-family: var(--font-head);
  font-size: 0.82rem;
  font-weight: 700;
  color: var(--c-grape);
  margin-bottom: 3px;
}

.desc {
  font-family: var(--font-head);
  font-size: 0.8rem;
  color: var(--ink);
  line-height: 1.4;
}

.dismiss {
  font-size: 0.75rem;
  color: var(--ink-dim);
  background: rgba(0,0,0,0.06);
  border-radius: 50%;
  width: 22px;
  height: 22px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  margin-top: -2px;
}
```

- [ ] **Step 4: Wire DailyActivity into ChildPage**

In `src/pages/ChildPage.jsx`, add imports near the top:
```jsx
import DailyActivity from '../components/DailyActivity.jsx'
import { getDailyActivity, isDailyActivityDismissed, dismissDailyActivity } from '../utils/dailyActivities.js'
```

Inside the component body, after existing `useState` declarations:
```jsx
const [showActivity, setShowActivity] = useState(() => !isDailyActivityDismissed())
const dailyActivity = getDailyActivity()
```

Find the boot greeting `useEffect` (the one with `const greet = ...`). Modify it:
```jsx
useEffect(() => {
  const activityPart = showActivity
    ? ` Oh, and here is today\'s activity — ${dailyActivity.description}`
    : ''
  const greet = `Hi ${childName}! I\'m ${buddyName}! Pick something to do, or just tap the mic and talk to me!${activityPart}`
  setBuddyText(greet)
  setUiStatus('speaking')
  speech.speak(greet, () => {
    setUiStatus('idle')
    scheduleBubbleClear()
  })
}, []) // eslint-disable-line react-hooks/exhaustive-deps
```

Add a dismiss handler after `cancelBubbleClear`:
```jsx
const handleDismissActivity = () => {
  dismissDailyActivity()
  setShowActivity(false)
}
```

Find the `modesArea` div (the bottom strip) in the normal-mode return and add the activity card just ABOVE the `<ModeSelector>`:
```jsx
<div className={styles.modesArea}>
  {showActivity && chat.mode === 'chat' && (
    <DailyActivity activity={dailyActivity} onDismiss={handleDismissActivity} />
  )}
  <ModeSelector
    currentMode={chat.mode}
    onSelect={handleModeSelect}
    onUpgrade={() => setShowUpgrade(true)}
  />
  <div className={styles.coursesRow}>
    ...
  </div>
</div>
```

- [ ] **Step 5: Build and verify**

```bash
cd /home/byron/voice-buddy && npm run build
```
Expected: `✓ built in X.XXs` — 0 errors.

Browser check: open child view — Buddy's greeting should mention today's activity. Activity card appears above the mode strip. Tap ✕ — card disappears. Reload — card stays gone (localStorage). Next day it reappears.

- [ ] **Step 6: Commit**

```bash
cd /home/byron && git add src/utils/dailyActivities.js src/components/DailyActivity.jsx src/components/DailyActivity.module.css src/pages/ChildPage.jsx
git commit -m "feat: daily Buddy activity widget with 30 rotating offline activities"
```

---

### Task 5: Buddy remembers — inject history + completed lessons into chat

**Files:**
- Modify: `src/hooks/useChat.js`

**Context:** On mount, `useChat` fetches the last 5 history entries (from the existing `history` Supabase table via `fetchHistory`) and the last 5 completed lessons (from `lesson_completions`). These are formatted into a memory block and appended to every system prompt, so Buddy can naturally reference past conversations and celebrate completed lessons.

**Interfaces:**
- Consumes: `fetchHistory(limit)` from `src/services/historyService.js` — already exists, returns `[{ user_text, buddy_text, mode, ts }]`
- Consumes: `supabase` from `src/lib/supabase.js` — already imported (add import if missing)
- No new files, no interface changes visible to callers of `useChat`

**Dependency:** Task 2 must be complete so the `lesson_completions` table exists.

- [ ] **Step 1: Add memory fetch to useChat**

In `src/hooks/useChat.js`, add `supabase` import if not already present:
```js
import { supabase } from '../lib/supabase.js'
```

Add `fetchHistory` import (it's already in historyService):
```js
import { fetchHistory } from '../services/historyService.js'
```

Inside the `useChat` function body, add a `memoryRef` and a fetch effect. Place them BEFORE the `buildSystemPrompt` callback (since `buildSystemPrompt` reads `memoryRef`):

```js
const memoryRef = useRef('')

useEffect(() => {
  const childName = settings?.childName || 'there'

  // Fetch recent conversation topics
  fetchHistory(5).then(entries => {
    if (!entries?.length) return
    const lines = entries
      .map(e => `- "${(e.user_text || '').slice(0, 100)}" (${e.mode} mode)`)
      .join('\n')
    memoryRef.current = `\n\nRECENT MEMORIES — things ${childName} said in past chats:\n${lines}\nIf these come up naturally in conversation, reference them warmly to make ${childName} feel remembered.`
  }).catch(() => {})

  // Fetch completed lessons and append to memory
  supabase.auth.getUser().then(({ data: { user } }) => {
    if (!user) return
    supabase
      .from('lesson_completions')
      .select('course_id, lesson_id')
      .eq('user_id', user.id)
      .order('completed_at', { ascending: false })
      .limit(5)
      .then(({ data }) => {
        if (!data?.length) return
        const names = data.map(r => `${r.lesson_id} (${r.course_id})`).join(', ')
        memoryRef.current +=
          `\n\nLESSONS ${childName} HAS COMPLETED: ${names}. Celebrate their learning if the topic comes up!`
      })
  }).catch(() => {})
}, []) // eslint-disable-line react-hooks/exhaustive-deps
```

- [ ] **Step 2: Append memory to buildSystemPrompt**

Find the `buildSystemPrompt` callback. It currently returns a PROMPTS call directly. Wrap each return to append `memoryRef.current`:

```js
const buildSystemPrompt = useCallback((currentMode) => {
  const childName  = settings?.childName  || 'there'
  const buddyName  = settings?.buddyName  || 'Buddy'
  let base
  switch (currentMode) {
    case 'story':    base = PROMPTS.story(childName, buddyName);    break
    case 'game':     base = PROMPTS.game(childName, buddyName);     break
    case 'activity': base = PROMPTS.activity(childName, buddyName); break
    case 'routine':  base = PROMPTS.routine(childName, buddyName, settings?.morningRoutine || []); break
    case 'quiz':     base = PROMPTS.quiz(childName, buddyName);     break
    case 'jokes':    base = PROMPTS.jokes(childName, buddyName);    break
    case 'sing':     base = PROMPTS.sing(childName, buddyName);     break
    case 'feelings': base = PROMPTS.feelings(childName, buddyName); break
    case 'move':     base = PROMPTS.move(childName, buddyName);     break
    case 'learn':    base = PROMPTS.learn(childName, buddyName);    break
    default:         base = PROMPTS.chat(childName, buddyName);
  }
  return base + memoryRef.current
}, [settings])
```

- [ ] **Step 3: Build and verify**

```bash
cd /home/byron/voice-buddy && npm run build
```
Expected: `✓ built in X.XXs` — 0 errors.

Browser check: have a conversation where the child says something specific (e.g. "I love dinosaurs"). End the session. Start a new session — after a couple of messages, Buddy should naturally reference the earlier conversation ("I remember you said you love dinosaurs!"). Also: complete a lesson, then come back to chat mode — Buddy should acknowledge the completed lesson if the topic arises.

- [ ] **Step 4: Commit**

```bash
cd /home/byron && git add src/hooks/useChat.js
git commit -m "feat: Buddy remembers past chats and completed lessons via system prompt memory"
```

---

## Self-Review

**1. Spec coverage:**
- ✅ Lesson duration: Task 1 — `~15 min` / `~30 min` badge on CoursesPage per `childAge`
- ✅ Completion tracker: Task 2 — Supabase table, `useCompletions` hook, ✅ on CoursesPage, `markComplete` in LessonPage
- ✅ Random narrations: Task 3 — `pickNarration`, `narrations[]` in all 11 lessons, LessonPage uses it
- ✅ Daily activity: Task 4 — 30 activities, day-indexed, spoken in greeting, card with dismiss, localStorage per-day
- ✅ Buddy remembers: Task 5 — last 5 history entries + completed lessons injected into system prompt

**2. Placeholder scan:** No TBDs, no vague steps, all code blocks complete.

**3. Type consistency:**
- `useCompletions` produces `markComplete(courseId, lessonId)` — consumed in LessonPage with `markComplete(courseId, lessonId)` ✅
- `pickNarration(step, childAge)` → `string` — consumed in LessonPage replacing `narration` variable ✅
- `getDailyActivity()` → `{ emoji, title, description }` — `DailyActivity` props match ✅
- `memoryRef.current` is a string — appended to `base` string in `buildSystemPrompt` ✅
