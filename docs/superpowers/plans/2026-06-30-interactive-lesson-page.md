# Interactive Lesson Page Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the "courses launch chat mode" hack with a dedicated `/lesson` page that has structured step cards (explain, quiz, label, voice activity), Buddy TTS narration, a star-burst reward screen, and printable worksheet + completion certificate.

**Architecture:** New `LessonPage` at `/lesson?course=X&lesson=Y`; each lesson in `courses.js` gets a `steps` array; step cards live in `src/components/lesson/`; print components use `@media print`-only divs toggled by state. CoursesPage navigates to `/lesson`; the dead query-param branch in ChildPage is removed.

**Tech Stack:** React 18, Vite, CSS Modules, React Router v6, existing `useSpeech` hook, existing design tokens in `src/index.css`.

## Global Constraints

- All colours from CSS custom properties: `--c-grape`, `--c-pink`, `--c-mint`, `--c-sunny`, `--c-sky`, `--ink`, `--ink-dim`
- Border radii: `--r-sm` (16px), `--r-md` (24px), `--r-lg` (34px), `--r-pill` (999px)
- Shadows: `--shadow-card`, `--shadow-squish`, `--shadow-pop`
- Spring easing: `--spring: cubic-bezier(0.34, 1.56, 0.64, 1)`
- Font: `var(--font-head)` (Fredoka) for headings, `var(--font-body)` (Nunito) for body
- Global animation keyframes available without import: `bounce-in`, `fade-up`, `pop-in`, `jelly`, `wiggle`, `float-soft`
- Global utility classes: `.bounce-in`, `.fade-up`
- Build check: `cd /home/byron && npm run build` — must exit 0

---

## File Map

| Status | Path | Responsibility |
|---|---|---|
| Modify | `src/utils/courses.js` | Replace `prompt` strings with `steps` arrays + `printSheet` per lesson |
| Modify | `src/App.jsx` | Add `/lesson` protected route |
| Modify | `src/pages/CoursesPage.jsx` | Change nav target from `/app?...` to `/lesson?...` |
| Modify | `src/pages/ChildPage.jsx` | Remove dead `?course=&lesson=` boot branch (lines ~193–217) |
| Create | `src/pages/LessonPage.jsx` | Lesson player: header, progress dots, step routing, Buddy narration, Next button |
| Create | `src/pages/LessonPage.module.css` | Styles for LessonPage |
| Create | `src/components/lesson/ExplainCard.jsx` | Animated emoji + fact display card |
| Create | `src/components/lesson/ExplainCard.module.css` | |
| Create | `src/components/lesson/QuizCard.jsx` | Multiple choice with correct/wrong feedback + confetti |
| Create | `src/components/lesson/QuizCard.module.css` | |
| Create | `src/components/lesson/LabelCard.jsx` | Tap-to-place label activity |
| Create | `src/components/lesson/LabelCard.module.css` | |
| Create | `src/components/lesson/ActivityCard.jsx` | Voice response using VoiceButton |
| Create | `src/components/lesson/ActivityCard.module.css` | |
| Create | `src/components/lesson/RewardScreen.jsx` | Star-burst, print buttons, back button |
| Create | `src/components/lesson/RewardScreen.module.css` | |
| Create | `src/components/lesson/LessonPrintSheet.jsx` | `@media print` worksheet |
| Create | `src/components/lesson/LessonPrintSheet.module.css` | |
| Create | `src/components/lesson/LessonCertificate.jsx` | `@media print` landscape certificate |
| Create | `src/components/lesson/LessonCertificate.module.css` | |

---

## Task 1: Update courses.js with steps arrays

**Files:**
- Modify: `src/utils/courses.js`

**Interfaces:**
- Produces: `COURSES` array where each lesson has `steps: Step[]` and `printSheet: PrintSheet`
- `Step` union: `ExplainStep | QuizStep | LabelStep | ActivityStep`
- `ExplainStep`: `{ type:'explain', narration:string, narrationYoung?:string, emoji:string, fact:string }`
- `QuizStep`: `{ type:'quiz', narration:string, question:string, options:string[], correct:number }`
- `LabelStep`: `{ type:'label', narration:string, visual:string, items:string[] }`
- `ActivityStep`: `{ type:'activity', narration:string }`
- `PrintSheet`: `{ title:string, facts:string[], colourPrompt:string, visual:string }`

- [ ] **Step 1: Replace `src/utils/courses.js` with the following complete file**

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
            narrationYoung: 'A little seed has a baby plant sleeping inside! Let\'s wake it up!',
            emoji: '🌰',
            fact: 'Seeds need water and warmth to wake up and start growing. Inside every seed is a tiny baby plant!',
          },
          {
            type: 'quiz',
            narration: 'Now let\'s test what you learned — what does a seed need to wake up and start growing?',
            question: 'What wakes a seed up?',
            options: ['Water & warmth', 'Ice cream', 'Darkness', 'Music'],
            correct: 0,
          },
          {
            type: 'label',
            narration: 'Amazing! Now let\'s name the parts of a plant. Tap each label in order!',
            visual: '🌱',
            items: ['Roots', 'Stem', 'Leaves', 'Flower'],
          },
          {
            type: 'activity',
            narration: 'Great job! Tell me — what is one thing a plant needs to grow?',
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
            narrationYoung: 'Plants eat sunlight like you eat food! They also need water, air, and soil.',
            emoji: '☀️',
            fact: 'Plants make food using sunlight — this is called photosynthesis. They need sun, water, air and soil nutrients!',
          },
          {
            type: 'quiz',
            narration: 'Let\'s play a quiz! Which of these does a plant NOT need to grow?',
            question: 'Which does a plant NOT need?',
            options: ['Sunlight', 'Water', 'Ice cream', 'Soil'],
            correct: 2,
          },
          {
            type: 'explain',
            narration: 'Soil is full of tiny nutrients — like vitamins for plants. Earthworms help dig through the soil and make it better!',
            narrationYoung: 'Soil has tiny food bits inside for plants! Worms help mix the soil.',
            emoji: '🌍',
            fact: 'Earthworms improve the soil by tunnelling through it and mixing in nutrients. They are a plant\'s best friend!',
          },
          {
            type: 'activity',
            narration: 'Wonderful! Can you name all four things a plant needs to grow? Say them out loud!',
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
            narrationYoung: 'We can grow our own plant at home! We just need a cup, soil, a seed, and water!',
            emoji: '🪴',
            fact: 'Bean seeds sprout in 5 to 10 days! Keep the soil damp and put your cup in a sunny spot.',
          },
          {
            type: 'label',
            narration: 'Here are the steps to plant your bean seed. Tap them in order!',
            visual: '🪴',
            items: ['Fill cup with soil', 'Push seed 2 cm in', 'Water gently', 'Place in sunlight'],
          },
          {
            type: 'quiz',
            narration: 'How deep should you plant a bean seed?',
            question: 'How deep does a bean seed go?',
            options: ['About 2 cm — thumb depth', 'Very deep — 10 cm', 'Just sit on top of soil'],
            correct: 0,
          },
          {
            type: 'activity',
            narration: 'Great! What container could you use to grow your plant at home? Be creative!',
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
            narrationYoung: 'Bees carry pollen to flowers to help make fruit and seeds!',
            emoji: '🐝',
            fact: 'Without bees to pollinate flowers, most fruits and vegetables would not grow. Bees are essential for our food!',
          },
          {
            type: 'quiz',
            narration: 'Which creature helps the garden by improving the soil?',
            question: 'Who helps improve garden soil?',
            options: ['Earthworm', 'Mosquito', 'Butterfly', 'Spider'],
            correct: 0,
          },
          {
            type: 'explain',
            narration: 'Ladybugs are tiny garden protectors. They eat aphids — tiny bugs that damage plants. One ladybug can eat 5 000 aphids in its lifetime!',
            narrationYoung: 'Ladybugs eat the bad bugs that hurt plants. They help keep the garden safe!',
            emoji: '🐞',
            fact: 'A single ladybug can eat up to 5 000 aphids in its lifetime, protecting plants from damage.',
          },
          {
            type: 'activity',
            narration: 'Which garden bug is your favourite, and why? Tell me!',
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
            narrationYoung: 'A robot can see, think, and move — like a helpful machine friend!',
            emoji: '🤖',
            fact: 'Robots have three main abilities: sensing (cameras, microphones), thinking (a computer brain), and acting (motors that move things).',
          },
          {
            type: 'quiz',
            narration: 'Which of these is a real working robot?',
            question: 'Which one is a real robot?',
            options: ['A robot vacuum cleaner', 'A toy car (no sensors)', 'A pencil', 'A book'],
            correct: 0,
          },
          {
            type: 'label',
            narration: 'Every robot has three parts. Tap the labels to match them!',
            visual: '🤖',
            items: ['Sensors (sense)', 'Computer (think)', 'Motors (act)'],
          },
          {
            type: 'activity',
            narration: 'Can you name a robot you have seen in real life or on TV? Tell me about it!',
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
            narrationYoung: 'Robots have sensor eyes, ears, and skin to feel the world around them!',
            emoji: '👁️',
            fact: 'Some robots use infrared sensors to see heat, or sonar to detect distance — like a bat using echoes to navigate!',
          },
          {
            type: 'quiz',
            narration: 'What sensor would help a robot see clearly in total darkness?',
            question: 'What helps a robot see in the dark?',
            options: ['Infrared camera', 'Microphone', 'Wheel sensor', 'Button'],
            correct: 0,
          },
          {
            type: 'label',
            narration: 'Match each sensor to what it does for the robot!',
            visual: '🤖',
            items: ['Camera = Eyes', 'Microphone = Ears', 'Touch pad = Skin'],
          },
          {
            type: 'activity',
            narration: 'If you were building a robot to cook food, which sensors would it need? Think carefully!',
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
            narrationYoung: 'Code tells robots what to do, step by step — like a recipe!',
            emoji: '💻',
            fact: 'Robots follow code instructions perfectly. If you make even one mistake in your code, the robot does the wrong thing!',
          },
          {
            type: 'label',
            narration: 'Here is a robot\'s morning routine algorithm. Tap the steps in order!',
            visual: '🤖',
            items: ['Wake up sensors', 'Check surroundings', 'Make a decision', 'Move motors', 'Repeat'],
          },
          {
            type: 'quiz',
            narration: 'What is code most like?',
            question: 'Code is most like a…',
            options: ['Recipe with exact steps', 'Random idea', 'Magic spell', 'Drawing'],
            correct: 0,
          },
          {
            type: 'activity',
            narration: 'If you were coding a robot to make a sandwich, what would be your very first step? Tell me!',
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
            narrationYoung: 'Robots are built to help solve problems. What problem could your robot fix?',
            emoji: '🔧',
            fact: 'The best engineers always start with the problem, not the gadget. Understanding the problem deeply leads to better inventions!',
          },
          {
            type: 'quiz',
            narration: 'What is the very first thing an engineer thinks about when designing a new robot?',
            question: 'What does an engineer design first?',
            options: ['What problem it solves', 'What colour to paint it', 'How many wheels it has', 'What name to give it'],
            correct: 0,
          },
          {
            type: 'label',
            narration: 'Engineers follow a design loop. Tap the steps in order!',
            visual: '🔧',
            items: ['Sense the problem', 'Plan a solution', 'Build and test', 'Improve it'],
          },
          {
            type: 'activity',
            narration: 'Now it\'s your turn! Describe your dream robot — what problem does it solve and what does it look like?',
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
            narrationYoung: 'Baking soda and vinegar have a fizzy reaction when they touch each other!',
            emoji: '🌋',
            fact: 'Acids and bases react together to make carbon dioxide gas. The bubbles rush out so fast they look like a volcano erupting!',
          },
          {
            type: 'label',
            narration: 'What do you need for the volcano experiment? Tap the ingredients in order!',
            visual: '🌋',
            items: ['Baking soda', 'Vinegar', 'Food colouring', 'Container'],
          },
          {
            type: 'quiz',
            narration: 'Why does the baking soda volcano fizz?',
            question: 'Why does the volcano fizz?',
            options: ['An acid meets a base', 'It gets too hot', 'Water is boiling', 'Magic!'],
            correct: 0,
          },
          {
            type: 'activity',
            narration: 'Have you ever tried this experiment at home? Tell me what you saw — or what you think would happen!',
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
            narrationYoung: 'Sunlight has all the colours hiding inside it. Water bends the light and shows them all!',
            emoji: '🌈',
            fact: 'You can make a rainbow at home by holding a glass of water in bright sunlight over a white sheet of paper. Try it!',
          },
          {
            type: 'quiz',
            narration: 'What splits white sunlight into rainbow colours?',
            question: 'What splits light into colours?',
            options: ['Water or glass', 'A mirror', 'A torch', 'A cloud'],
            correct: 0,
          },
          {
            type: 'label',
            narration: 'Rainbows always have the same colours in the same order. Tap them from top to bottom!',
            visual: '🌈',
            items: ['Red', 'Yellow', 'Green', 'Blue'],
          },
          {
            type: 'activity',
            narration: 'Can you describe a rainbow you have seen? Where were you, and what did it look like?',
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
            narrationYoung: 'Big hollow ships float because they push lots of water out of the way. Small solid coins sink!',
            emoji: '🚢',
            fact: 'This is called buoyancy. If an object weighs less than the water it pushes aside, it floats. If it weighs more, it sinks.',
          },
          {
            type: 'quiz',
            narration: 'Why does a huge heavy ship float but a tiny coin sinks?',
            question: 'Why does a ship float?',
            options: ['It\'s hollow and pushes out lots of water', 'Ships are made of wood', 'Coins are magnetic', 'Ships have engines'],
            correct: 0,
          },
          {
            type: 'label',
            narration: 'Can you sort these objects? Tap them in order — which float first, then which sink!',
            visual: '🌊',
            items: ['Cork (floats)', 'Wood (floats)', 'Coin (sinks)', 'Rock (sinks)'],
          },
          {
            type: 'activity',
            narration: 'Try dropping different objects in water at home. Which ones float and which ones sink? Tell me what you found!',
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

- [ ] **Step 2: Verify build passes**

```bash
cd /home/byron && npm run build
```

Expected: `✓ built in` with no errors.

- [ ] **Step 3: Commit**

```bash
cd /home/byron && git add src/utils/courses.js && git commit -m "feat: replace lesson prompts with structured steps arrays"
```

---

## Task 2: Routing — stub LessonPage, update CoursesPage, clean ChildPage

**Files:**
- Modify: `src/App.jsx`
- Modify: `src/pages/CoursesPage.jsx`
- Modify: `src/pages/ChildPage.jsx`
- Create: `src/pages/LessonPage.jsx` (stub only)

**Interfaces:**
- Produces: `/lesson?course=X&lesson=Y` route renders a stub `<div>` without crashing
- CoursesPage navigates to `/lesson?course=${courseId}&lesson=${lessonId}`

- [ ] **Step 1: Create stub `src/pages/LessonPage.jsx`**

```jsx
import { useSearchParams, useNavigate } from 'react-router-dom'
import { COURSES } from '../utils/courses.js'

export default function LessonPage() {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const courseId = searchParams.get('course')
  const lessonId = searchParams.get('lesson')
  const course = COURSES.find(c => c.id === courseId)
  const lesson = course?.lessons.find(l => l.id === lessonId)

  if (!lesson) {
    navigate('/courses')
    return null
  }

  return (
    <div style={{ padding: 32, fontFamily: 'sans-serif' }}>
      <h1>{lesson.emoji} {lesson.title}</h1>
      <p>Lesson page coming soon — {lesson.steps.length} steps</p>
      <button onClick={() => navigate('/courses')}>← Back</button>
    </div>
  )
}
```

- [ ] **Step 2: Add `/lesson` route in `src/App.jsx`**

Add this lazy import at the top with the other lazy imports:
```jsx
const LessonPage = lazy(() => import('./pages/LessonPage.jsx'))
```

Add this route inside `<Routes>`, after the `/courses` route:
```jsx
<Route path="/lesson" element={session ? <LessonPage session={session} /> : <Navigate to="/" replace />} />
```

- [ ] **Step 3: Update `src/pages/CoursesPage.jsx` — change nav target**

Find line:
```jsx
navigate(`/app?course=${courseId}&lesson=${lessonId}`)
```
Replace with:
```jsx
navigate(`/lesson?course=${courseId}&lesson=${lessonId}`)
```

- [ ] **Step 4: Remove dead lesson boot branch from `src/pages/ChildPage.jsx`**

Find the boot `useEffect` (around line 193). It currently reads:
```js
const courseId  = searchParams.get('course')
const lessonId  = searchParams.get('lesson')
const courseObj = courseId ? COURSES.find(c => c.id === courseId) : null
const lesson    = courseObj ? courseObj.lessons.find(l => l.id === lessonId) : null

if (lesson) {
  chat.switchMode('learn')
  const intro = `Let's learn about "${lesson.title}"! ${lesson.prompt.slice(0, 80)}…`
  setBuddyText(intro)
  setUiStatus('speaking')
  speech.speak(intro, () => {
    setUiStatus('idle')
    scheduleBubbleClear()
  })
} else {
  const greet = `Hi ${childName}! I'm ${buddyName}! Pick something to do, or just tap the mic and talk to me!`
  ...
```

Replace the entire `if (lesson) { ... } else {` block with just the else body (removing the if/else wrapper):
```js
const greet = `Hi ${childName}! I'm ${buddyName}! Pick something to do, or just tap the mic and talk to me!`
setBuddyText(greet)
setUiStatus('speaking')
speech.speak(greet, () => {
  setUiStatus('idle')
  scheduleBubbleClear()
})
```

Also remove the now-unused `useSearchParams` import and `searchParams` const if they are no longer used elsewhere in ChildPage. Check with:
```bash
grep -n "searchParams\|useSearchParams\|COURSES" /home/byron/src/pages/ChildPage.jsx
```
Remove any that only served the dead branch.

- [ ] **Step 5: Verify build and check route works**

```bash
cd /home/byron && npm run build
```

Expected: `✓ built in` with no errors.

- [ ] **Step 6: Commit**

```bash
cd /home/byron && git add src/App.jsx src/pages/CoursesPage.jsx src/pages/ChildPage.jsx src/pages/LessonPage.jsx && git commit -m "feat: wire /lesson route, update CoursesPage nav, remove dead lesson boot code"
```

---

## Task 3: LessonPage — full layout, state, header, progress dots, Next button

**Files:**
- Modify: `src/pages/LessonPage.jsx` (replace stub with full implementation)
- Create: `src/pages/LessonPage.module.css`

**Interfaces:**
- Consumes: `COURSES` from `courses.js`; `getSettings()` from `storage.js`; `useSpeech(settings)` from `hooks/useSpeech.js`; `BuddyAvatar`, `SpeechBubble` components
- Consumes step card components (will be stubs in next tasks — LessonPage imports them but they can be empty divs for now)
- Produces: full lesson player shell — header with back/title/dots, BuddyAvatar area, SpeechBubble, card slot, Next button, phase state machine (`'steps' | 'reward'`)

- [ ] **Step 1: Create `src/pages/LessonPage.module.css`**

```css
.page {
  height: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  background: linear-gradient(160deg, #c4b5fd 0%, #7dd3fc 100%);
  overflow: hidden;
  position: relative;
  padding-bottom: env(safe-area-inset-bottom);
}

.page::before {
  content: '';
  position: absolute;
  inset: 0;
  background-image:
    radial-gradient(100px 100px at 10% 15%, rgba(255,255,255,0.4) 0%, transparent 70%),
    radial-gradient(80px 80px at 85% 10%, rgba(255,255,255,0.3) 0%, transparent 70%),
    radial-gradient(120px 120px at 90% 75%, rgba(255,255,255,0.35) 0%, transparent 70%);
  pointer-events: none;
}

/* ── Header ── */
.header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: 100%;
  padding: 14px 16px 6px;
  flex-shrink: 0;
  z-index: 10;
  gap: 8px;
}

.back {
  font-family: var(--font-head);
  font-size: 0.95rem;
  font-weight: 700;
  color: var(--ink);
  background: rgba(255,255,255,0.75);
  border-radius: var(--r-pill);
  padding: 8px 16px;
  box-shadow: 0 3px 0 rgba(91,33,182,0.12);
  white-space: nowrap;
  flex-shrink: 0;
}

.back:active { transform: translateY(2px); box-shadow: 0 1px 0 rgba(91,33,182,0.12); }

.lessonTitle {
  font-family: var(--font-head);
  font-size: 1rem;
  font-weight: 700;
  color: var(--ink);
  text-align: center;
  flex: 1;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.dots {
  display: flex;
  gap: 6px;
  flex-shrink: 0;
}

.dot {
  width: 10px;
  height: 10px;
  border-radius: 50%;
  background: rgba(255,255,255,0.45);
  transition: background 0.3s, transform 0.3s;
}

.dotActive {
  background: var(--c-grape);
  transform: scale(1.25);
}

.dotDone {
  background: rgba(124,58,237,0.45);
}

/* ── Avatar ── */
.avatarArea {
  flex-shrink: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 4px 0 0;
  z-index: 1;
}

/* ── Speech bubble ── */
.bubbleArea {
  width: 100%;
  max-width: 500px;
  padding: 0 16px;
  flex-shrink: 0;
  z-index: 1;
}

/* ── Step card slot ── */
.cardArea {
  flex: 1;
  width: 100%;
  max-width: 500px;
  padding: 8px 16px;
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 0;
  z-index: 1;
}

/* ── Navigation ── */
.navArea {
  flex-shrink: 0;
  padding: 8px 24px 16px;
  width: 100%;
  max-width: 500px;
  z-index: 1;
}

.nextBtn {
  width: 100%;
  padding: 18px;
  background: linear-gradient(135deg, var(--c-grape), var(--c-berry));
  color: #fff;
  font-family: var(--font-head);
  font-size: 1.2rem;
  font-weight: 700;
  border-radius: var(--r-pill);
  box-shadow: 0 6px 0 var(--c-grape-d), var(--shadow-pop);
  transition: opacity 0.2s, transform 0.15s, box-shadow 0.15s;
}

.nextBtn:disabled {
  opacity: 0.38;
  cursor: not-allowed;
  box-shadow: 0 3px 0 var(--c-grape-d);
}

.nextBtn:not(:disabled):active {
  transform: translateY(3px);
  box-shadow: 0 3px 0 var(--c-grape-d);
}
```

- [ ] **Step 2: Replace `src/pages/LessonPage.jsx` with full implementation**

```jsx
import { useState, useEffect, useRef } from 'react'
import { useSearchParams, useNavigate } from 'react-router-dom'
import { COURSES } from '../utils/courses.js'
import { getSettings } from '../utils/storage.js'
import { useSpeech } from '../hooks/useSpeech.js'
import BuddyAvatar from '../components/BuddyAvatar.jsx'
import SpeechBubble from '../components/SpeechBubble.jsx'
import ExplainCard from '../components/lesson/ExplainCard.jsx'
import QuizCard from '../components/lesson/QuizCard.jsx'
import LabelCard from '../components/lesson/LabelCard.jsx'
import ActivityCard from '../components/lesson/ActivityCard.jsx'
import RewardScreen from '../components/lesson/RewardScreen.jsx'
import styles from './LessonPage.module.css'

export default function LessonPage() {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const settings = getSettings()
  const speech = useSpeech(settings)

  const courseId = searchParams.get('course')
  const lessonId = searchParams.get('lesson')
  const course = COURSES.find(c => c.id === courseId)
  const lesson = course?.lessons.find(l => l.id === lessonId)

  const [stepIndex, setStepIndex] = useState(0)
  const [stepComplete, setStepComplete] = useState(false)
  const [phase, setPhase] = useState('steps') // 'steps' | 'reward'
  const [buddyText, setBuddyText] = useState('')
  const [uiStatus, setUiStatus] = useState('idle')
  const stepKeyRef = useRef(0)

  const childAge = settings.childAge || 7

  if (!lesson) {
    navigate('/courses')
    return null
  }

  const steps = lesson.steps
  const step = steps[stepIndex]
  const narration = (childAge <= 6 && step.narrationYoung) ? step.narrationYoung : step.narration

  // Speak narration when step changes
  useEffect(() => {
    stepKeyRef.current += 1
    setStepComplete(false)
    setBuddyText(narration)
    setUiStatus('speaking')
    speech.speak(narration, () => {
      setUiStatus('idle')
      // explain cards auto-complete after narration
      if (step.type === 'explain') setStepComplete(true)
    })
    return () => speech.stopSpeaking()
  }, [stepIndex]) // eslint-disable-line react-hooks/exhaustive-deps

  const handleNext = () => {
    if (stepIndex < steps.length - 1) {
      setStepIndex(i => i + 1)
    } else {
      speech.stopSpeaking()
      setPhase('reward')
    }
  }

  const handleBack = () => {
    speech.stopSpeaking()
    if (stepIndex > 0) {
      setStepIndex(i => i - 1)
    } else {
      navigate('/courses')
    }
  }

  if (phase === 'reward') {
    return (
      <RewardScreen
        lesson={lesson}
        course={course}
        childName={settings.childName}
        onBack={() => navigate('/courses')}
      />
    )
  }

  const stepKey = `${stepIndex}-${stepKeyRef.current}`

  return (
    <div className={styles.page}>
      {/* Header */}
      <div className={styles.header}>
        <button className={styles.back} onClick={handleBack}>← Back</button>
        <span className={styles.lessonTitle}>{lesson.emoji} {lesson.title}</span>
        <div className={styles.dots}>
          {steps.map((_, i) => (
            <span
              key={i}
              className={`${styles.dot} ${i === stepIndex ? styles.dotActive : ''} ${i < stepIndex ? styles.dotDone : ''}`}
            />
          ))}
        </div>
      </div>

      {/* Buddy avatar */}
      <div className={styles.avatarArea}>
        <BuddyAvatar
          status={uiStatus}
          avatarColor={settings.avatarColor}
          type={settings.avatarType || 'bear'}
        />
      </div>

      {/* Narration bubble */}
      <div className={styles.bubbleArea}>
        <SpeechBubble
          buddyText={buddyText}
          userText=""
          status={uiStatus}
          storyMode={false}
          wordIndex={-1}
        />
      </div>

      {/* Step card */}
      <div className={styles.cardArea}>
        {step.type === 'explain' && (
          <ExplainCard key={stepKey} step={step} />
        )}
        {step.type === 'quiz' && (
          <QuizCard key={stepKey} step={step} onComplete={() => setStepComplete(true)} />
        )}
        {step.type === 'label' && (
          <LabelCard key={stepKey} step={step} onComplete={() => setStepComplete(true)} />
        )}
        {step.type === 'activity' && (
          <ActivityCard
            key={stepKey}
            step={step}
            settings={settings}
            speech={speech}
            onComplete={() => setStepComplete(true)}
          />
        )}
      </div>

      {/* Next button */}
      <div className={styles.navArea}>
        <button
          className={styles.nextBtn}
          disabled={!stepComplete}
          onClick={handleNext}
        >
          {stepIndex === steps.length - 1 ? '🌟 Finish!' : 'Next →'}
        </button>
      </div>
    </div>
  )
}
```

- [ ] **Step 3: Create placeholder components so the build doesn't fail**

Create `src/components/lesson/ExplainCard.jsx`:
```jsx
export default function ExplainCard({ step }) {
  return <div style={{ padding: 16, textAlign: 'center' }}>{step.emoji} {step.fact}</div>
}
```

Create `src/components/lesson/QuizCard.jsx`:
```jsx
export default function QuizCard({ step, onComplete }) {
  return <div style={{ padding: 16 }}>{step.question} <button onClick={onComplete}>Answer</button></div>
}
```

Create `src/components/lesson/LabelCard.jsx`:
```jsx
export default function LabelCard({ step, onComplete }) {
  return <div style={{ padding: 16 }}>{step.visual} <button onClick={onComplete}>Label</button></div>
}
```

Create `src/components/lesson/ActivityCard.jsx`:
```jsx
export default function ActivityCard({ step, settings, speech, onComplete }) {
  return <div style={{ padding: 16 }}><button onClick={onComplete}>Speak</button></div>
}
```

Create `src/components/lesson/RewardScreen.jsx`:
```jsx
export default function RewardScreen({ lesson, course, childName, onBack }) {
  return (
    <div style={{ padding: 32, textAlign: 'center' }}>
      <h1>🌟 You did it!</h1>
      <button onClick={onBack}>← Back to Courses</button>
    </div>
  )
}
```

- [ ] **Step 4: Verify build passes**

```bash
cd /home/byron && npm run build
```

Expected: `✓ built in` with no errors.

- [ ] **Step 5: Commit**

```bash
cd /home/byron && git add src/pages/LessonPage.jsx src/pages/LessonPage.module.css src/components/lesson/ && git commit -m "feat: LessonPage shell with header, progress dots, narration, and step routing"
```

---

## Task 4: ExplainCard and QuizCard

**Files:**
- Modify: `src/components/lesson/ExplainCard.jsx` (replace placeholder)
- Create: `src/components/lesson/ExplainCard.module.css`
- Modify: `src/components/lesson/QuizCard.jsx` (replace placeholder)
- Create: `src/components/lesson/QuizCard.module.css`

**Interfaces:**
- `ExplainCard` props: `{ step: ExplainStep }` — renders and auto-completes via LessonPage's `onComplete` (auto-triggered by narration end — no `onComplete` prop needed)
- `QuizCard` props: `{ step: QuizStep, onComplete: () => void }` — calls `onComplete()` 600 ms after correct tap

- [ ] **Step 1: Create `src/components/lesson/ExplainCard.module.css`**

```css
.card {
  background: rgba(255,255,255,0.92);
  border-radius: var(--r-lg);
  padding: 28px 24px 24px;
  width: 100%;
  text-align: center;
  box-shadow: var(--shadow-card);
  animation: fadeIn 0.35s var(--spring);
}

@keyframes fadeIn {
  from { opacity: 0; transform: scale(0.92) translateY(12px); }
  to   { opacity: 1; transform: scale(1)    translateY(0); }
}

.emoji {
  font-size: 4rem;
  display: block;
  margin-bottom: 16px;
  animation: msgBounce 0.9s ease-in-out infinite alternate;
}

@keyframes msgBounce {
  from { transform: translateY(0); }
  to   { transform: translateY(-10px); }
}

.fact {
  font-family: var(--font-head);
  font-size: 1.1rem;
  font-weight: 600;
  color: var(--ink);
  line-height: 1.45;
}
```

- [ ] **Step 2: Replace `src/components/lesson/ExplainCard.jsx`**

```jsx
import styles from './ExplainCard.module.css'

export default function ExplainCard({ step }) {
  return (
    <div className={styles.card}>
      <span className={styles.emoji}>{step.emoji}</span>
      <p className={styles.fact}>{step.fact}</p>
    </div>
  )
}
```

- [ ] **Step 3: Create `src/components/lesson/QuizCard.module.css`**

```css
.card {
  background: rgba(255,255,255,0.92);
  border-radius: var(--r-lg);
  padding: 24px 20px;
  width: 100%;
  box-shadow: var(--shadow-card);
  animation: fadeIn 0.35s var(--spring);
}

@keyframes fadeIn {
  from { opacity: 0; transform: scale(0.92) translateY(12px); }
  to   { opacity: 1; transform: scale(1)    translateY(0); }
}

.question {
  font-family: var(--font-head);
  font-size: 1.05rem;
  font-weight: 700;
  color: var(--ink);
  text-align: center;
  margin-bottom: 16px;
  line-height: 1.3;
}

.options {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.option {
  padding: 14px 20px;
  background: #f3ecfc;
  border-radius: var(--r-md);
  font-family: var(--font-head);
  font-size: 1rem;
  font-weight: 600;
  color: var(--ink);
  text-align: left;
  transition: background 0.15s, transform 0.12s;
  border: 2px solid transparent;
}

.option:not(.correct):not(.wrong):not(.correctReveal):active {
  transform: scale(0.97);
  background: #ede0fc;
}

.correct {
  background: #dcfce7;
  border-color: #16a34a;
  color: #14532d;
  animation: correctPop 0.4s var(--spring);
}

@keyframes correctPop {
  0%   { transform: scale(1); }
  50%  { transform: scale(1.06); }
  100% { transform: scale(1); }
}

.wrong {
  background: #fee2e2;
  border-color: #dc2626;
  color: #7f1d1d;
  animation: wrongShake 0.4s ease;
}

@keyframes wrongShake {
  0%, 100% { transform: translateX(0); }
  20%       { transform: translateX(-8px); }
  40%       { transform: translateX(8px); }
  60%       { transform: translateX(-5px); }
  80%       { transform: translateX(5px); }
}

.correctReveal {
  background: #dcfce7;
  border-color: #16a34a;
  color: #14532d;
  opacity: 0.7;
}

/* Confetti burst — 8 particles positioned with CSS custom props */
.confettiWrap {
  position: relative;
}

.confetti {
  position: absolute;
  inset: 0;
  pointer-events: none;
  overflow: visible;
}

.confetti span {
  position: absolute;
  top: 50%;
  left: 50%;
  width: 10px;
  height: 10px;
  border-radius: 2px;
  animation: burst 0.65s var(--spring) forwards;
  transform: translate(-50%, -50%) scale(0);
}

@keyframes burst {
  0%   { transform: translate(-50%, -50%) scale(0); opacity: 1; }
  60%  { opacity: 1; }
  100% { transform: translate(calc(-50% + var(--tx)), calc(-50% + var(--ty))) scale(1); opacity: 0; }
}

.confetti span:nth-child(1)  { background: #facc15; --tx: 0px;    --ty: -50px; }
.confetti span:nth-child(2)  { background: #f472b6; --tx: 35px;   --ty: -35px; }
.confetti span:nth-child(3)  { background: #34d399; --tx: 50px;   --ty: 0px;   }
.confetti span:nth-child(4)  { background: #60a5fa; --tx: 35px;   --ty: 35px;  }
.confetti span:nth-child(5)  { background: #facc15; --tx: 0px;    --ty: 50px;  }
.confetti span:nth-child(6)  { background: #f472b6; --tx: -35px;  --ty: 35px;  }
.confetti span:nth-child(7)  { background: #34d399; --tx: -50px;  --ty: 0px;   }
.confetti span:nth-child(8)  { background: #60a5fa; --tx: -35px;  --ty: -35px; }
```

- [ ] **Step 4: Replace `src/components/lesson/QuizCard.jsx`**

```jsx
import { useState } from 'react'
import styles from './QuizCard.module.css'

export default function QuizCard({ step, onComplete }) {
  const [selected, setSelected] = useState(null)
  const [showConfetti, setShowConfetti] = useState(false)

  const handleSelect = (i) => {
    if (selected !== null) return
    setSelected(i)
    if (i === step.correct) {
      setShowConfetti(true)
      setTimeout(onComplete, 650)
    }
  }

  const getOptionClass = (i) => {
    if (selected === null) return styles.option
    if (i === step.correct) return `${styles.option} ${selected === i ? styles.correct : styles.correctReveal}`
    if (i === selected) return `${styles.option} ${styles.wrong}`
    return styles.option
  }

  return (
    <div className={styles.card}>
      <p className={styles.question}>{step.question}</p>
      <div className={`${styles.options} ${styles.confettiWrap}`}>
        {showConfetti && (
          <div className={styles.confetti} aria-hidden="true">
            {Array.from({ length: 8 }).map((_, i) => <span key={i} />)}
          </div>
        )}
        {step.options.map((opt, i) => (
          <button
            key={i}
            className={getOptionClass(i)}
            onClick={() => handleSelect(i)}
            disabled={selected !== null}
          >
            {opt}
          </button>
        ))}
      </div>
    </div>
  )
}
```

- [ ] **Step 5: Verify build**

```bash
cd /home/byron && npm run build
```

Expected: `✓ built in` with no errors.

- [ ] **Step 6: Commit**

```bash
cd /home/byron && git add src/components/lesson/ExplainCard.jsx src/components/lesson/ExplainCard.module.css src/components/lesson/QuizCard.jsx src/components/lesson/QuizCard.module.css && git commit -m "feat: ExplainCard with bounce animation and QuizCard with confetti feedback"
```

---

## Task 5: LabelCard and ActivityCard

**Files:**
- Modify: `src/components/lesson/LabelCard.jsx` (replace placeholder)
- Create: `src/components/lesson/LabelCard.module.css`
- Modify: `src/components/lesson/ActivityCard.jsx` (replace placeholder)
- Create: `src/components/lesson/ActivityCard.module.css`

**Interfaces:**
- `LabelCard` props: `{ step: LabelStep, onComplete: () => void }` — calls `onComplete()` 500 ms after all items tapped
- `ActivityCard` props: `{ step: ActivityStep, settings: object, speech: useSpeechReturn, onComplete: () => void }` — calls `onComplete()` after any voice transcript received

- [ ] **Step 1: Create `src/components/lesson/LabelCard.module.css`**

```css
.card {
  background: rgba(255,255,255,0.92);
  border-radius: var(--r-lg);
  padding: 20px 20px 24px;
  width: 100%;
  text-align: center;
  box-shadow: var(--shadow-card);
  animation: fadeIn 0.35s var(--spring);
}

@keyframes fadeIn {
  from { opacity: 0; transform: scale(0.92) translateY(12px); }
  to   { opacity: 1; transform: scale(1)    translateY(0); }
}

.visual {
  font-size: 3.5rem;
  display: block;
  margin-bottom: 10px;
}

.instruction {
  font-family: var(--font-head);
  font-size: 0.9rem;
  font-weight: 600;
  color: var(--ink-dim);
  margin-bottom: 12px;
}

/* Placed labels row */
.placed {
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: 8px;
  min-height: 38px;
  margin-bottom: 16px;
}

.labelSlot {
  padding: 7px 16px;
  border-radius: var(--r-pill);
  font-family: var(--font-head);
  font-size: 0.9rem;
  font-weight: 700;
  transition: all 0.25s var(--spring);
}

.labelEmpty {
  background: rgba(124,58,237,0.08);
  color: var(--ink-dim);
  border: 2px dashed rgba(124,58,237,0.25);
  min-width: 60px;
}

.labelFilled {
  background: linear-gradient(135deg, var(--c-mint), var(--c-sky));
  color: #0a3d2b;
  border: 2px solid transparent;
  animation: popIn 0.35s var(--spring);
}

@keyframes popIn {
  0%   { transform: scale(0); opacity: 0; }
  70%  { transform: scale(1.15); }
  100% { transform: scale(1);  opacity: 1; }
}

/* Chip bank */
.chips {
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: 8px;
}

.chip {
  padding: 10px 18px;
  background: linear-gradient(135deg, var(--c-grape), var(--c-berry));
  color: #fff;
  border-radius: var(--r-pill);
  font-family: var(--font-head);
  font-size: 0.95rem;
  font-weight: 700;
  box-shadow: 0 4px 0 var(--c-grape-d);
  transition: transform 0.1s, box-shadow 0.1s;
}

.chip:active { transform: translateY(2px) scale(0.96); box-shadow: 0 2px 0 var(--c-grape-d); }
```

- [ ] **Step 2: Replace `src/components/lesson/LabelCard.jsx`**

```jsx
import { useState } from 'react'
import styles from './LabelCard.module.css'

export default function LabelCard({ step, onComplete }) {
  const [placed, setPlaced] = useState([])

  const handleTap = (item) => {
    const next = [...placed, item]
    setPlaced(next)
    if (next.length === step.items.length) {
      setTimeout(onComplete, 500)
    }
  }

  const remaining = step.items.filter(item => !placed.includes(item))

  return (
    <div className={styles.card}>
      <span className={styles.visual}>{step.visual}</span>
      <p className={styles.instruction}>Tap the labels in order ↓</p>

      <div className={styles.placed}>
        {step.items.map((item, i) => (
          <span
            key={item}
            className={`${styles.labelSlot} ${placed.includes(item) ? styles.labelFilled : styles.labelEmpty}`}
          >
            {placed.includes(item) ? item : `${i + 1}`}
          </span>
        ))}
      </div>

      <div className={styles.chips}>
        {remaining.map(item => (
          <button key={item} className={styles.chip} onClick={() => handleTap(item)}>
            {item}
          </button>
        ))}
      </div>
    </div>
  )
}
```

- [ ] **Step 3: Create `src/components/lesson/ActivityCard.module.css`**

```css
.card {
  background: rgba(255,255,255,0.92);
  border-radius: var(--r-lg);
  padding: 28px 24px;
  width: 100%;
  text-align: center;
  box-shadow: var(--shadow-card);
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 18px;
  animation: fadeIn 0.35s var(--spring);
}

@keyframes fadeIn {
  from { opacity: 0; transform: scale(0.92) translateY(12px); }
  to   { opacity: 1; transform: scale(1)    translateY(0); }
}

.hint {
  font-family: var(--font-head);
  font-size: 0.95rem;
  font-weight: 600;
  color: var(--ink-dim);
}

.transcript {
  font-family: var(--font-head);
  font-size: 1rem;
  font-weight: 600;
  color: var(--ink);
  background: #f3ecfc;
  border-radius: var(--r-md);
  padding: 12px 16px;
  width: 100%;
  text-align: left;
  animation: fadeIn 0.3s var(--spring);
  line-height: 1.4;
}
```

- [ ] **Step 4: Replace `src/components/lesson/ActivityCard.jsx`**

```jsx
import { useState } from 'react'
import VoiceButton from '../VoiceButton.jsx'
import styles from './ActivityCard.module.css'

export default function ActivityCard({ step, settings, speech, onComplete }) {
  const [transcript, setTranscript] = useState('')
  const [listening, setListening] = useState(false)
  const buddyName = settings.buddyName || 'Buddy'

  const handlePress = () => {
    if (listening) {
      speech.stopListening()
      setListening(false)
      return
    }
    setListening(true)
    speech.startListening((text) => {
      setTranscript(text)
      setListening(false)
      onComplete()
    })
  }

  const status = listening ? 'listening' : 'idle'

  return (
    <div className={styles.card}>
      {!transcript && (
        <p className={styles.hint}>Tap the mic and speak your answer!</p>
      )}
      <VoiceButton status={status} onPress={handlePress} buddyName={buddyName} />
      {transcript && (
        <p className={styles.transcript}>"{transcript}"</p>
      )}
    </div>
  )
}
```

- [ ] **Step 5: Verify build**

```bash
cd /home/byron && npm run build
```

Expected: `✓ built in` with no errors.

- [ ] **Step 6: Commit**

```bash
cd /home/byron && git add src/components/lesson/LabelCard.jsx src/components/lesson/LabelCard.module.css src/components/lesson/ActivityCard.jsx src/components/lesson/ActivityCard.module.css && git commit -m "feat: LabelCard tap-to-label and ActivityCard voice response"
```

---

## Task 6: RewardScreen with star-burst animation

**Files:**
- Modify: `src/components/lesson/RewardScreen.jsx` (replace placeholder)
- Create: `src/components/lesson/RewardScreen.module.css`

**Interfaces:**
- Props: `{ lesson: Lesson, course: Course, childName: string, onBack: () => void }`
- Internal state: `printTarget: 'sheet' | 'cert' | null` — controls which `@media print` component is visible when `window.print()` fires
- Produces: calls `setPrintTarget` then `window.print()` 80 ms later (time for React to re-render the print component into DOM)

- [ ] **Step 1: Create `src/components/lesson/RewardScreen.module.css`**

```css
.screen {
  height: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  background: linear-gradient(160deg, #fde68a 0%, #fca5a5 50%, #c4b5fd 100%);
  position: relative;
  overflow: hidden;
  padding: 32px 24px;
  padding-bottom: env(safe-area-inset-bottom);
}

/* Star burst container */
.starsWrap {
  position: absolute;
  inset: 0;
  pointer-events: none;
  overflow: visible;
}

.star {
  position: absolute;
  top: 50%;
  left: 50%;
  font-size: 1.6rem;
  animation: starBurst 0.9s var(--spring) forwards;
  animation-delay: calc(var(--i) * 0.06s);
  opacity: 0;
}

@keyframes starBurst {
  0%   { transform: translate(-50%, -50%) scale(0); opacity: 0; }
  40%  { opacity: 1; }
  100% { transform: translate(calc(-50% + var(--tx)), calc(-50% + var(--ty))) scale(1.2); opacity: 0; }
}

/* 12 stars fanning out in all directions */
.star:nth-child(1)  { --tx:   0px;  --ty: -180px; }
.star:nth-child(2)  { --tx:  90px;  --ty: -155px; }
.star:nth-child(3)  { --tx: 155px;  --ty:  -90px; }
.star:nth-child(4)  { --tx: 180px;  --ty:    0px; }
.star:nth-child(5)  { --tx: 155px;  --ty:   90px; }
.star:nth-child(6)  { --tx:  90px;  --ty:  155px; }
.star:nth-child(7)  { --tx:   0px;  --ty:  180px; }
.star:nth-child(8)  { --tx: -90px;  --ty:  155px; }
.star:nth-child(9)  { --tx:-155px;  --ty:   90px; }
.star:nth-child(10) { --tx:-180px;  --ty:    0px; }
.star:nth-child(11) { --tx:-155px;  --ty:  -90px; }
.star:nth-child(12) { --tx: -90px;  --ty: -155px; }

/* Content card */
.content {
  background: rgba(255,255,255,0.92);
  border-radius: var(--r-lg);
  padding: 36px 28px 28px;
  text-align: center;
  max-width: 360px;
  width: 100%;
  box-shadow: var(--shadow-card);
  z-index: 1;
  animation: cardIn 0.5s var(--spring) 0.3s both;
}

@keyframes cardIn {
  from { transform: scale(0.7); opacity: 0; }
  to   { transform: scale(1);   opacity: 1; }
}

.trophy {
  font-size: 4rem;
  display: block;
  margin-bottom: 10px;
  animation: trophyBounce 0.8s ease-in-out infinite alternate;
}

@keyframes trophyBounce {
  from { transform: translateY(0); }
  to   { transform: translateY(-12px); }
}

.heading {
  font-family: var(--font-head);
  font-size: 2rem;
  font-weight: 700;
  color: var(--ink);
  margin-bottom: 6px;
}

.sub {
  font-family: var(--font-head);
  font-size: 1rem;
  color: var(--ink-dim);
  margin-bottom: 24px;
}

.actions {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.sheetBtn {
  display: block;
  width: 100%;
  padding: 15px;
  background: linear-gradient(135deg, var(--c-mint), var(--c-sky));
  color: #0a3d2b;
  border-radius: var(--r-md);
  font-family: var(--font-head);
  font-weight: 700;
  font-size: 1rem;
  box-shadow: 0 5px 0 #15803d;
}

.sheetBtn:active { transform: translateY(2px); box-shadow: 0 3px 0 #15803d; }

.certBtn {
  display: block;
  width: 100%;
  padding: 15px;
  background: linear-gradient(135deg, var(--c-sunny), var(--c-tangerine));
  color: #7a3e00;
  border-radius: var(--r-md);
  font-family: var(--font-head);
  font-weight: 700;
  font-size: 1rem;
  box-shadow: 0 5px 0 #b45309;
}

.certBtn:active { transform: translateY(2px); box-shadow: 0 3px 0 #b45309; }

.backBtn {
  display: block;
  width: 100%;
  padding: 13px;
  background: #f3ecfc;
  color: var(--ink-dim);
  border-radius: var(--r-sm);
  font-family: var(--font-head);
  font-weight: 700;
  font-size: 0.95rem;
}

.backBtn:active { background: #ede0fc; }

/* Print-only wrapper — hidden on screen */
.printOnly {
  display: none;
}

@media print {
  .printOnly {
    display: block;
  }
  /* Hide everything except the active print target */
  .screen > *:not(.printOnly) {
    display: none !important;
  }
}
```

- [ ] **Step 2: Replace `src/components/lesson/RewardScreen.jsx`**

```jsx
import { useState } from 'react'
import LessonPrintSheet from './LessonPrintSheet.jsx'
import LessonCertificate from './LessonCertificate.jsx'
import styles from './RewardScreen.module.css'

const STAR_COUNT = 12

export default function RewardScreen({ lesson, course, childName, onBack }) {
  const [printTarget, setPrintTarget] = useState(null)

  const handlePrint = (target) => {
    setPrintTarget(target)
    // Let React commit the print component to the DOM before opening print dialog
    setTimeout(() => window.print(), 80)
  }

  return (
    <div className={styles.screen}>
      {/* Star burst */}
      <div className={styles.starsWrap} aria-hidden="true">
        {Array.from({ length: STAR_COUNT }).map((_, i) => (
          <span key={i} className={styles.star} style={{ '--i': i }}>⭐</span>
        ))}
      </div>

      {/* Result card */}
      <div className={styles.content}>
        <span className={styles.trophy}>🏆</span>
        <h1 className={styles.heading}>You did it!</h1>
        <p className={styles.sub}>
          You finished <strong>{lesson.title}</strong>!
        </p>

        <div className={styles.actions}>
          <button className={styles.sheetBtn} onClick={() => handlePrint('sheet')}>
            🖨️ Print your worksheet
          </button>
          <button className={styles.certBtn} onClick={() => handlePrint('cert')}>
            🏆 Print your certificate
          </button>
          <button className={styles.backBtn} onClick={onBack}>
            ← Back to Courses
          </button>
        </div>
      </div>

      {/* Print targets — hidden on screen, shown only during window.print() */}
      <div className={styles.printOnly}>
        {printTarget === 'sheet' && (
          <LessonPrintSheet lesson={lesson} childName={childName} />
        )}
        {printTarget === 'cert' && (
          <LessonCertificate lesson={lesson} course={course} childName={childName} />
        )}
      </div>
    </div>
  )
}
```

- [ ] **Step 3: Verify build**

```bash
cd /home/byron && npm run build
```

Expected: `✓ built in` with no errors.

- [ ] **Step 4: Commit**

```bash
cd /home/byron && git add src/components/lesson/RewardScreen.jsx src/components/lesson/RewardScreen.module.css && git commit -m "feat: RewardScreen with 12-star burst animation and print buttons"
```

---

## Task 7: LessonPrintSheet and LessonCertificate

**Files:**
- Modify: `src/components/lesson/LessonPrintSheet.jsx` (replace placeholder — was never created, create fresh)
- Create: `src/components/lesson/LessonPrintSheet.module.css`
- Modify: `src/components/lesson/LessonCertificate.jsx` (replace placeholder — was never created, create fresh)
- Create: `src/components/lesson/LessonCertificate.module.css`

**Interfaces:**
- `LessonPrintSheet` props: `{ lesson: Lesson, childName: string }`
- `LessonCertificate` props: `{ lesson: Lesson, course: Course, childName: string }`
- Both render inside `RewardScreen`'s `.printOnly` wrapper; styled purely for `@media print`

- [ ] **Step 1: Create `src/components/lesson/LessonPrintSheet.module.css`**

```css
/* Screen — invisible (RewardScreen's .printOnly wrapper handles this) */
.sheet {
  font-family: Georgia, serif;
  font-size: 13pt;
  color: #000;
  padding: 24pt;
  max-width: 100%;
}

.header {
  border-bottom: 2pt solid #333;
  padding-bottom: 12pt;
  margin-bottom: 18pt;
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.logo {
  font-size: 14pt;
  font-weight: bold;
  letter-spacing: 0.04em;
}

.title {
  font-size: 18pt;
  font-weight: bold;
  text-align: center;
  flex: 1;
}

.nameField {
  font-size: 12pt;
  text-align: right;
}

.section {
  margin-bottom: 20pt;
}

.section h2 {
  font-size: 14pt;
  font-weight: bold;
  border-bottom: 1pt solid #999;
  padding-bottom: 4pt;
  margin-bottom: 10pt;
}

.section ul {
  padding-left: 20pt;
  line-height: 2;
}

.colourBox {
  border: 2pt dashed #ccc;
  border-radius: 8pt;
  padding: 20pt;
  text-align: center;
  min-height: 180pt;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 10pt;
}

.colourEmoji {
  font-size: 60pt;
  display: block;
}

.colourPrompt {
  font-size: 11pt;
  color: #555;
  font-style: italic;
}

.footer {
  border-top: 1pt solid #ccc;
  padding-top: 6pt;
  font-size: 9pt;
  color: #888;
  text-align: center;
  margin-top: 24pt;
}
```

- [ ] **Step 2: Create `src/components/lesson/LessonPrintSheet.jsx`**

```jsx
import styles from './LessonPrintSheet.module.css'

export default function LessonPrintSheet({ lesson, childName }) {
  return (
    <div className={styles.sheet}>
      <div className={styles.header}>
        <span className={styles.logo}>🐻 Voice Buddy</span>
        <h1 className={styles.title}>{lesson.emoji} {lesson.printSheet.title}</h1>
        <div className={styles.nameField}>
          Name: {childName || '______________________'}
        </div>
      </div>

      <section className={styles.section}>
        <h2>What I Learned</h2>
        <ul>
          {lesson.printSheet.facts.map((fact, i) => (
            <li key={i}>{fact}</li>
          ))}
        </ul>
      </section>

      <section className={styles.section}>
        <h2>Colour & Draw</h2>
        <div className={styles.colourBox}>
          <span className={styles.colourEmoji}>{lesson.printSheet.visual}</span>
          <p className={styles.colourPrompt}>{lesson.printSheet.colourPrompt}</p>
        </div>
      </section>

      <footer className={styles.footer}>Voice Buddy | voicebuddy.app</footer>
    </div>
  )
}
```

- [ ] **Step 3: Create `src/components/lesson/LessonCertificate.module.css`**

```css
@page {
  size: A4 landscape;
  margin: 16pt;
}

.cert {
  font-family: Georgia, serif;
  color: #1a0533;
  display: flex;
  align-items: center;
  justify-content: center;
  height: 100%;
  width: 100%;
}

.border {
  border: 6pt double #7c3aed;
  border-radius: 12pt;
  padding: 32pt 48pt;
  text-align: center;
  box-shadow: inset 0 0 0 3pt #c4b5fd;
  width: 100%;
  max-width: 720pt;
}

.stars {
  font-size: 18pt;
  letter-spacing: 8pt;
  margin-bottom: 14pt;
  color: #eab308;
}

.heading {
  font-size: 30pt;
  font-weight: bold;
  letter-spacing: 0.06em;
  margin-bottom: 18pt;
  text-transform: uppercase;
}

.body {
  font-size: 14pt;
  line-height: 2;
  margin-bottom: 20pt;
}

.childName {
  font-size: 22pt;
  font-style: italic;
  font-weight: bold;
  display: block;
}

.date {
  font-size: 11pt;
  color: #555;
  margin-bottom: 16pt;
}

.signature {
  font-size: 16pt;
  font-style: italic;
  margin-top: 10pt;
  color: #7c3aed;
}
```

- [ ] **Step 4: Create `src/components/lesson/LessonCertificate.jsx`**

```jsx
import styles from './LessonCertificate.module.css'

export default function LessonCertificate({ lesson, course, childName }) {
  const date = new Date().toLocaleDateString('en-ZA', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })

  return (
    <div className={styles.cert}>
      <div className={styles.border}>
        <div className={styles.stars}>⭐ ⭐ ⭐ ⭐ ⭐</div>
        <h1 className={styles.heading}>Certificate of Achievement</h1>
        <p className={styles.body}>
          This certifies that<br />
          <strong className={styles.childName}>{childName || 'Explorer'}</strong><br />
          has successfully completed<br />
          <strong>{lesson.title}</strong><br />
          in <em>{course.title}</em>
        </p>
        <p className={styles.date}>{date}</p>
        <p className={styles.signature}>🐻 — Buddy</p>
        <div className={styles.stars}>⭐ ⭐ ⭐ ⭐ ⭐</div>
      </div>
    </div>
  )
}
```

- [ ] **Step 5: Verify build**

```bash
cd /home/byron && npm run build
```

Expected: `✓ built in` with no errors.

- [ ] **Step 6: Commit**

```bash
cd /home/byron && git add src/components/lesson/LessonPrintSheet.jsx src/components/lesson/LessonPrintSheet.module.css src/components/lesson/LessonCertificate.jsx src/components/lesson/LessonCertificate.module.css && git commit -m "feat: printable worksheet and completion certificate with landscape layout"
```

---

## Self-Review

**Spec coverage check:**

| Requirement | Covered by |
|---|---|
| New `/lesson` route | Task 2 |
| Steps: explain, quiz, label, activity | Tasks 1, 4, 5 |
| Buddy TTS narration per step | Task 3 (LessonPage useEffect) |
| BuddyAvatar animated | Task 3 |
| Progress dots | Task 3 |
| ExplainCard: bounce emoji + fact | Task 4 |
| QuizCard: correct/wrong feedback + confetti | Task 4 |
| LabelCard: tap-to-place labels | Task 5 |
| ActivityCard: VoiceButton + transcript | Task 5 |
| Age-adaptive narration (narrationYoung) | Task 3 (LessonPage narration selector) |
| Reward screen with star burst | Task 6 |
| Printable worksheet | Task 7 |
| Completion certificate (landscape) | Task 7 |
| CoursesPage nav update | Task 2 |
| ChildPage dead code removal | Task 2 |
| All lessons updated with steps | Task 1 (all 11 lessons) |

**Placeholder scan:** No TBDs, no TODOs, all code is complete.

**Type consistency:**
- `lesson.printSheet.facts`, `.visual`, `.colourPrompt`, `.title` — used in Task 1 (data) and Task 7 (components) ✓
- `step.type`, `step.narration`, `step.emoji`, `step.fact` — defined in Task 1, consumed in Tasks 3/4 ✓
- `step.options`, `step.correct`, `step.question` — defined in Task 1, consumed in Task 4 ✓
- `step.visual`, `step.items` — defined in Task 1, consumed in Task 5 ✓
- `speech.speak`, `speech.stopSpeaking`, `speech.startListening`, `speech.stopListening` — all confirmed from useSpeech hook ✓
- `onComplete` callback name consistent across all card components ✓
