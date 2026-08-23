# Drag/Slider/Breadboard Mission Activities Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the 4 Month-1 mission lessons' voice-only Step 04 placeholder with real drag-gesture interactions (with a mandatory tap/keyboard fallback), using two new step types: `drag-match` (Missions 01, 03, 04) and `slider` (Mission 02).

**Architecture:** One shared placement/value state machine per new card component, advanced by two independent input paths (Framer Motion drag gesture, and tap-select-then-tap-target / keyboard) that both call the same state-transition function. New step types are added to `LessonPage.jsx`'s existing type-dispatch pattern. No new backend/schema.

**Tech Stack:** React 18, Framer Motion (`motion` npm package, imported from `motion/react`, already a dependency), Vitest + React Testing Library, CSS Modules.

**Spec:** `docs/superpowers/specs/2026-08-23-drag-slider-activities-design.md`

## Global Constraints

- Every drag interaction must be fully completable via tap-only or keyboard-only input — no drag-required path (WCAG 2.2 SC 2.5.7).
- New CSS must reuse existing DESIGN.md tokens already used by `ExploreCard.module.css`/`shared.module.css` (`--font-head`, `--ink`, `--ink-dim`, `--c-mint`, `--c-sky`, `--c-grape`, `--c-berry`, `--c-grape-d`, `--r-md`, `--r-pill`, `--r-lg`, `--shadow-card`, `--spring`) — no new arbitrary values.
- RTL/Vitest tests drive the tap/keyboard path only; real pointer-drag physics are verified manually (documented in Task 7).
- `prefers-reduced-motion` must disable the drag scale/spring flourish (`useReducedMotion()` from `motion/react`), consistent with the app's existing global reduced-motion handling.

---

### Task 1: `dragHitTest` utility

**Files:**
- Create: `src/utils/dragHitTest.js`
- Test: `src/utils/dragHitTest.test.js`

**Interfaces:**
- Produces: `findTargetAtPoint(point: {x, y}, targetRects: Record<string, DOMRect-like>): string | null` — used by `DragMatchCard` (Task 2) to resolve which target a dropped item landed on.

- [ ] **Step 1: Write the failing test**

```js
// src/utils/dragHitTest.test.js
import { describe, it, expect } from 'vitest'
import { findTargetAtPoint } from './dragHitTest.js'

describe('findTargetAtPoint', () => {
  const rectA = { left: 0, right: 100, top: 0, bottom: 100 }
  const rectB = { left: 200, right: 300, top: 0, bottom: 100 }

  it('returns the id of the target whose rect contains the point', () => {
    expect(findTargetAtPoint({ x: 50, y: 50 }, { a: rectA, b: rectB })).toBe('a')
  })

  it('returns null when the point is outside every rect', () => {
    expect(findTargetAtPoint({ x: 150, y: 50 }, { a: rectA, b: rectB })).toBeNull()
  })

  it('returns the first matching target id when rects overlap', () => {
    const overlapping = { left: 40, right: 140, top: 0, bottom: 100 }
    expect(findTargetAtPoint({ x: 60, y: 50 }, { a: rectA, c: overlapping })).toBe('a')
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/utils/dragHitTest.test.js`
Expected: FAIL — `dragHitTest.js` doesn't exist yet.

- [ ] **Step 3: Write minimal implementation**

```js
// src/utils/dragHitTest.js
export function findTargetAtPoint(point, targetRects) {
  for (const [targetId, rect] of Object.entries(targetRects)) {
    if (point.x >= rect.left && point.x <= rect.right && point.y >= rect.top && point.y <= rect.bottom) {
      return targetId
    }
  }
  return null
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/utils/dragHitTest.test.js`
Expected: PASS (3 tests)

- [ ] **Step 5: Commit**

```bash
git add src/utils/dragHitTest.js src/utils/dragHitTest.test.js
git commit -m "feat: add pure hit-testing utility for drag-and-drop targets"
```

---

### Task 2: `DragMatchCard` component — exact rule

**Files:**
- Create: `src/components/lesson/DragMatchCard.jsx`
- Create: `src/components/lesson/DragMatchCard.module.css`
- Test: `src/components/lesson/DragMatchCard.test.jsx`

**Interfaces:**
- Consumes: `findTargetAtPoint` from `../../utils/dragHitTest.js` (Task 1).
- Produces: `DragMatchCard({ step, onComplete })` — `onComplete(score: number)` called once, matching the calling convention already used by `ExploreCard`/`MasteryCheckCard`/`PracticeCard` (`onComplete(100)` on success). `step` shape: `{ prompt?, targets: [{id, label}], items: [{id, label, value}], rule }` where `rule` is `{ kind: 'exact', correct: Record<targetId, itemId> }` for this task (the `budget` variant is added in Task 3).

- [ ] **Step 1: Write the failing test (exact rule only)**

```jsx
// src/components/lesson/DragMatchCard.test.jsx
import { describe, it, expect, vi, afterEach } from 'vitest'
import { render, screen, cleanup, fireEvent } from '@testing-library/react'
import DragMatchCard from './DragMatchCard.jsx'

afterEach(cleanup)

const exactStep = {
  type: 'drag-match',
  prompt: 'Tap the right response',
  targets: [{ id: 'perimeter-response', label: '🚧 Perimeter Hit' }],
  items: [
    { id: 'stop-reverse', label: '🛑 Stop, then reverse', value: 1 },
    { id: 'speed-up', label: '⚡ Speed up', value: 1 },
  ],
  rule: { kind: 'exact', correct: { 'perimeter-response': 'stop-reverse' } },
}

describe('DragMatchCard — exact rule, tap path', () => {
  it('completes when the correct item is tapped onto the target', () => {
    vi.useFakeTimers()
    const onComplete = vi.fn()
    render(<DragMatchCard step={exactStep} onComplete={onComplete} />)

    fireEvent.click(screen.getByText('Stop, then reverse'))
    fireEvent.click(screen.getByText('🚧 Perimeter Hit'))

    vi.advanceTimersByTime(500)
    expect(onComplete).toHaveBeenCalledWith(100)
    vi.useRealTimers()
  })

  it('bounces back a wrong item without completing', () => {
    vi.useFakeTimers()
    const onComplete = vi.fn()
    render(<DragMatchCard step={exactStep} onComplete={onComplete} />)

    fireEvent.click(screen.getByText('Speed up'))
    fireEvent.click(screen.getByText('🚧 Perimeter Hit'))

    vi.advanceTimersByTime(500)
    expect(onComplete).not.toHaveBeenCalled()
    expect(screen.getByText('Speed up')).toBeInTheDocument()
    vi.useRealTimers()
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/components/lesson/DragMatchCard.test.jsx`
Expected: FAIL — `DragMatchCard.jsx` doesn't exist yet.

- [ ] **Step 3: Write the component (exact rule + drag gesture) and its stylesheet**

```jsx
// src/components/lesson/DragMatchCard.jsx
import { useState, useMemo, useRef, useEffect } from 'react'
import { motion, useReducedMotion } from 'motion/react'
import styles from './DragMatchCard.module.css'
import { findTargetAtPoint } from '../../utils/dragHitTest.js'

function splitEmoji(s) {
  const i = s.indexOf(' ')
  return { emoji: i > -1 ? s.slice(0, i) : '', text: i > -1 ? s.slice(i + 1) : s }
}

export default function DragMatchCard({ step, onComplete }) {
  const { targets, items, rule, prompt } = step
  const [placements, setPlacements] = useState(() =>
    Object.fromEntries(targets.map((t) => [t.id, []]))
  )
  const [selectedId, setSelectedId] = useState(null)
  const [shakeTargetId, setShakeTargetId] = useState(null)
  const targetRefs = useRef({})
  const timerRef = useRef(null)
  const shakeTimerRef = useRef(null)
  const prefersReducedMotion = useReducedMotion()

  useEffect(() => () => {
    clearTimeout(timerRef.current)
    clearTimeout(shakeTimerRef.current)
  }, [])

  const placedItemIds = useMemo(() => new Set(Object.values(placements).flat()), [placements])
  const remainingItems = items.filter((it) => !placedItemIds.has(it.id))

  const rejectPlacement = (targetId) => {
    setShakeTargetId(targetId)
    shakeTimerRef.current = setTimeout(() => setShakeTargetId(null), 400)
    setSelectedId(null)
  }

  const place = (itemId, targetId) => {
    if (placedItemIds.has(itemId)) return
    const item = items.find((it) => it.id === itemId)

    if (rule.kind === 'exact') {
      if (rule.correct[targetId] !== itemId) {
        rejectPlacement(targetId)
        return
      }
      const next = { ...placements, [targetId]: [itemId] }
      setPlacements(next)
      setSelectedId(null)
      if (targets.every((t) => next[t.id][0] === rule.correct[t.id])) {
        timerRef.current = setTimeout(() => onComplete(100), 500)
      }
      return
    }

    const currentSum = placements[targetId].reduce(
      (sum, id) => sum + items.find((it) => it.id === id).value, 0
    )
    if (currentSum + item.value > rule.max) {
      rejectPlacement(targetId)
      return
    }
    const next = { ...placements, [targetId]: [...placements[targetId], itemId] }
    setPlacements(next)
    setSelectedId(null)
    if (rule.required.every((id) => next[targetId].includes(id))) {
      timerRef.current = setTimeout(() => onComplete(100), 500)
    }
  }

  const handleChipTap = (itemId) => {
    setSelectedId((current) => (current === itemId ? null : itemId))
  }

  const handleTargetTap = (targetId) => {
    if (!selectedId) return
    place(selectedId, targetId)
  }

  const handleDragEnd = (itemId, point) => {
    const rects = Object.fromEntries(
      Object.entries(targetRefs.current)
        .filter(([, el]) => el)
        .map(([id, el]) => [id, el.getBoundingClientRect()])
    )
    const targetId = findTargetAtPoint(point, rects)
    if (targetId) place(itemId, targetId)
  }

  return (
    <div className={styles.card}>
      {prompt && <p className={styles.instruction}>{prompt}</p>}
      <div className={styles.targets}>
        {targets.map((target) => (
          <button
            key={target.id}
            ref={(el) => { targetRefs.current[target.id] = el }}
            type="button"
            className={`${styles.target} ${selectedId ? styles.targetActive : ''} ${shakeTargetId === target.id ? styles.shake : ''}`}
            onClick={() => handleTargetTap(target.id)}
          >
            <span className={styles.targetLabel}>{target.label}</span>
            <span className={styles.targetItems}>
              {placements[target.id].map((id) => splitEmoji(items.find((it) => it.id === id).label).emoji).join(' ')}
            </span>
          </button>
        ))}
      </div>
      <div className={styles.chips}>
        {remainingItems.map((item) => {
          const { emoji, text } = splitEmoji(item.label)
          return (
            <motion.div
              key={item.id}
              role="button"
              tabIndex={0}
              drag
              dragSnapToOrigin
              dragElastic={0.15}
              whileDrag={prefersReducedMotion ? undefined : { scale: 1.08, zIndex: 1 }}
              onDragEnd={(_, info) => handleDragEnd(item.id, { x: info.point.x, y: info.point.y })}
              onClick={() => handleChipTap(item.id)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); handleChipTap(item.id) }
              }}
              className={`${styles.chip} ${selectedId === item.id ? styles.chipSelected : ''}`}
            >
              {emoji && <span className={styles.chipEmoji}>{emoji}</span>}
              <span className={styles.chipText}>{text}</span>
            </motion.div>
          )
        })}
      </div>
    </div>
  )
}
```

```css
/* src/components/lesson/DragMatchCard.module.css */
.card {
  composes: card from './shared.module.css';
  padding: 20px 20px 24px;
  text-align: center;
}

.instruction {
  font-family: var(--font-head);
  font-size: 0.9rem;
  font-weight: 600;
  color: var(--ink-dim);
  margin-bottom: 12px;
}

.targets {
  display: flex;
  gap: 10px;
  justify-content: center;
  margin-bottom: 16px;
  flex-wrap: wrap;
}

.target {
  flex: 1;
  min-width: 140px;
  padding: 14px 10px;
  border-radius: var(--r-md);
  background: rgba(124,58,237,0.06);
  border: 2px dashed rgba(124,58,237,0.25);
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
  transition: background 0.15s, border-color 0.15s;
}

.targetActive {
  border-color: var(--c-mint);
  background: rgba(52,211,153,0.12);
}

.targetLabel {
  font-family: var(--font-head);
  font-size: 0.85rem;
  font-weight: 700;
  color: var(--ink);
}

.targetItems {
  font-size: 1.3rem;
  min-height: 1.6rem;
}

.chips {
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: 8px;
}

.chip {
  padding: 10px 14px;
  background: linear-gradient(135deg, var(--c-grape), var(--c-berry));
  color: #fff;
  border-radius: var(--r-md);
  font-family: var(--font-head);
  font-weight: 700;
  box-shadow: 0 4px 0 var(--c-grape-d);
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;
  min-width: 72px;
  cursor: grab;
  touch-action: none;
}

.chip:active {
  cursor: grabbing;
}

.chipEmoji {
  font-size: 1.8rem;
  line-height: 1;
  display: block;
}

.chipText {
  font-size: 0.75rem;
  line-height: 1.2;
  text-align: center;
}

.chipSelected {
  box-shadow: 0 0 0 3px var(--c-mint), 0 4px 0 var(--c-grape-d);
}

.shake {
  animation: shakeTarget 0.4s ease;
}

@keyframes shakeTarget {
  0%, 100% { transform: translateX(0); }
  25% { transform: translateX(-6px); }
  75% { transform: translateX(6px); }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/components/lesson/DragMatchCard.test.jsx`
Expected: PASS (2 tests)

- [ ] **Step 5: Commit**

```bash
git add src/components/lesson/DragMatchCard.jsx src/components/lesson/DragMatchCard.module.css src/components/lesson/DragMatchCard.test.jsx
git commit -m "feat: add DragMatchCard with drag gesture and tap fallback (exact rule)"
```

---

### Task 3: `DragMatchCard` — budget rule (Mission 04)

**Files:**
- Modify: `src/components/lesson/DragMatchCard.test.jsx` (the `place` budget branch already exists in the Task 2 implementation — this task only adds test coverage)

**Interfaces:**
- Consumes: `DragMatchCard` from Task 2 (already implements `rule.kind === 'budget'` — `{ kind: 'budget', max, required: itemId[] }`, one target).
- No new production code — Task 2's `place()` function already branches on `rule.kind`.

- [ ] **Step 1: Write the failing test**

```jsx
// append to src/components/lesson/DragMatchCard.test.jsx
const budgetStep = {
  type: 'drag-match',
  prompt: 'Stay under the limit',
  targets: [{ id: 'breadboard', label: '🔋 Breadboard' }],
  items: [
    { id: 'cpu', label: '🧠 CPU', value: 3 },
    { id: 'sensor', label: '📡 Sensor array', value: 2 },
    { id: 'motor', label: '⚙️ Motor', value: 5 },
    { id: 'light', label: '💡 Extra light', value: 3 },
  ],
  rule: { kind: 'budget', max: 9, required: ['cpu', 'sensor'] },
}

describe('DragMatchCard — budget rule, tap path', () => {
  it('accumulates items and completes once the required set is placed', () => {
    vi.useFakeTimers()
    const onComplete = vi.fn()
    render(<DragMatchCard step={budgetStep} onComplete={onComplete} />)

    fireEvent.click(screen.getByText('CPU'))
    fireEvent.click(screen.getByText('🔋 Breadboard'))
    fireEvent.click(screen.getByText('Sensor array'))
    fireEvent.click(screen.getByText('🔋 Breadboard'))

    vi.advanceTimersByTime(500)
    expect(onComplete).toHaveBeenCalledWith(100)
    vi.useRealTimers()
  })

  it('rejects a placement that would exceed the budget max', () => {
    vi.useFakeTimers()
    const onComplete = vi.fn()
    render(<DragMatchCard step={budgetStep} onComplete={onComplete} />)

    fireEvent.click(screen.getByText('Motor'))
    fireEvent.click(screen.getByText('🔋 Breadboard'))
    fireEvent.click(screen.getByText('Extra light'))
    fireEvent.click(screen.getByText('🔋 Breadboard'))
    fireEvent.click(screen.getByText('CPU'))
    fireEvent.click(screen.getByText('🔋 Breadboard'))

    vi.advanceTimersByTime(500)
    expect(onComplete).not.toHaveBeenCalled()
    expect(screen.getByText('CPU')).toBeInTheDocument()
    vi.useRealTimers()
  })
})
```

- [ ] **Step 2: Run test to verify it fails (or already passes)**

Run: `npx vitest run src/components/lesson/DragMatchCard.test.jsx`
Expected: The two new tests should already PASS since Task 2's `place()` implements the budget branch — this step confirms that, rather than driving new production code. If either fails, fix `place()`'s budget branch in `DragMatchCard.jsx` before proceeding.

- [ ] **Step 3: N/A — no new implementation needed**

- [ ] **Step 4: Run full test file to verify all 4 tests pass**

Run: `npx vitest run src/components/lesson/DragMatchCard.test.jsx`
Expected: PASS (4 tests)

- [ ] **Step 5: Commit**

```bash
git add src/components/lesson/DragMatchCard.test.jsx
git commit -m "test: cover DragMatchCard budget rule (Mission 04 breadboard)"
```

---

### Task 4: `SliderCard` component (Mission 02)

**Files:**
- Create: `src/components/lesson/SliderCard.jsx`
- Create: `src/components/lesson/SliderCard.module.css`
- Test: `src/components/lesson/SliderCard.test.jsx`

**Interfaces:**
- Produces: `SliderCard({ step, onComplete })` — `onComplete(100)` called once value settles inside `step.target` for 500ms. `step` shape: `{ prompt?, min, max, target: {min, max}, startAt? }`.

- [ ] **Step 1: Write the failing test**

```jsx
// src/components/lesson/SliderCard.test.jsx
import { describe, it, expect, vi, afterEach } from 'vitest'
import { render, screen, cleanup, fireEvent } from '@testing-library/react'
import SliderCard from './SliderCard.jsx'

afterEach(cleanup)

const step = {
  type: 'slider',
  prompt: 'Dial in the sensitivity',
  min: 0,
  max: 100,
  target: { min: 60, max: 75 },
  startAt: 20,
}

describe('SliderCard', () => {
  it('moves value with arrow keys and completes once inside the target zone', () => {
    vi.useFakeTimers()
    const onComplete = vi.fn()
    render(<SliderCard step={step} onComplete={onComplete} />)

    const handle = screen.getByRole('slider')
    expect(handle).toHaveAttribute('aria-valuenow', '20')

    for (let i = 0; i < 40; i++) fireEvent.keyDown(handle, { key: 'ArrowRight' })
    expect(handle).toHaveAttribute('aria-valuenow', '60')

    vi.advanceTimersByTime(500)
    expect(onComplete).toHaveBeenCalledWith(100)
    vi.useRealTimers()
  })

  it('does not complete while the value sits outside the target zone', () => {
    vi.useFakeTimers()
    const onComplete = vi.fn()
    render(<SliderCard step={step} onComplete={onComplete} />)

    vi.advanceTimersByTime(1000)
    expect(onComplete).not.toHaveBeenCalled()
    vi.useRealTimers()
  })

  it('moves value with the tap +/- buttons and clamps at min/max', () => {
    const onComplete = vi.fn()
    render(<SliderCard step={step} onComplete={onComplete} />)

    const decrease = screen.getByLabelText('Decrease')
    const increase = screen.getByLabelText('Increase')
    const handle = screen.getByRole('slider')

    for (let i = 0; i < 25; i++) fireEvent.click(decrease)
    expect(handle).toHaveAttribute('aria-valuenow', '0')

    for (let i = 0; i < 200; i++) fireEvent.click(increase)
    expect(handle).toHaveAttribute('aria-valuenow', '100')
  })

  it('Home and End jump to min and max', () => {
    const onComplete = vi.fn()
    render(<SliderCard step={step} onComplete={onComplete} />)
    const handle = screen.getByRole('slider')

    fireEvent.keyDown(handle, { key: 'End' })
    expect(handle).toHaveAttribute('aria-valuenow', '100')

    fireEvent.keyDown(handle, { key: 'Home' })
    expect(handle).toHaveAttribute('aria-valuenow', '0')
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/components/lesson/SliderCard.test.jsx`
Expected: FAIL — `SliderCard.jsx` doesn't exist yet.

- [ ] **Step 3: Write the component and its stylesheet**

```jsx
// src/components/lesson/SliderCard.jsx
import { useState, useRef, useEffect } from 'react'
import { motion, useMotionValue, useReducedMotion } from 'motion/react'
import styles from './SliderCard.module.css'

const CONFIRM_DELAY_MS = 500
const STEP = 1
const HANDLE_WIDTH = 28

function clamp(value, lo, hi) {
  return Math.min(hi, Math.max(lo, value))
}

export default function SliderCard({ step, onComplete }) {
  const { min, max, target, startAt, prompt } = step
  const [value, setValue] = useState(startAt ?? min)
  const trackRef = useRef(null)
  const timerRef = useRef(null)
  const x = useMotionValue(0)
  const prefersReducedMotion = useReducedMotion()

  const inTarget = value >= target.min && value <= target.max

  useEffect(() => {
    if (!inTarget) return undefined
    timerRef.current = setTimeout(() => onComplete(100), CONFIRM_DELAY_MS)
    return () => clearTimeout(timerRef.current)
  }, [inTarget, onComplete])

  useEffect(() => {
    const track = trackRef.current
    if (!track) return
    const travel = track.clientWidth - HANDLE_WIDTH
    const ratio = (value - min) / (max - min)
    x.set(travel > 0 ? ratio * travel : 0)
  }, [value, min, max, x])

  const setClamped = (next) => setValue(clamp(next, min, max))

  const handleKeyDown = (e) => {
    if (e.key === 'ArrowRight' || e.key === 'ArrowUp') { e.preventDefault(); setClamped(value + STEP) }
    if (e.key === 'ArrowLeft' || e.key === 'ArrowDown') { e.preventDefault(); setClamped(value - STEP) }
    if (e.key === 'Home') { e.preventDefault(); setClamped(min) }
    if (e.key === 'End') { e.preventDefault(); setClamped(max) }
  }

  const handleDrag = () => {
    const track = trackRef.current
    if (!track) return
    const travel = track.clientWidth - HANDLE_WIDTH
    const ratio = travel > 0 ? clamp(x.get() / travel, 0, 1) : 0
    setValue(Math.round(min + ratio * (max - min)))
  }

  return (
    <div className={styles.card}>
      {prompt && <p className={styles.instruction}>{prompt}</p>}
      <div className={styles.sliderRow}>
        <button type="button" className={styles.stepBtn} onClick={() => setClamped(value - STEP)} aria-label="Decrease">−</button>
        <div className={styles.track} ref={trackRef}>
          <div
            className={styles.targetZone}
            style={{
              left: `${((target.min - min) / (max - min)) * 100}%`,
              width: `${((target.max - target.min) / (max - min)) * 100}%`,
            }}
          />
          <motion.div
            role="slider"
            tabIndex={0}
            aria-valuemin={min}
            aria-valuemax={max}
            aria-valuenow={value}
            className={styles.handle}
            style={{ x }}
            drag="x"
            dragConstraints={trackRef}
            dragElastic={0}
            dragMomentum={false}
            whileDrag={prefersReducedMotion ? undefined : { scale: 1.15 }}
            onDrag={handleDrag}
            onKeyDown={handleKeyDown}
          />
        </div>
        <button type="button" className={styles.stepBtn} onClick={() => setClamped(value + STEP)} aria-label="Increase">+</button>
      </div>
      <p className={styles.readout}>{value}</p>
    </div>
  )
}
```

```css
/* src/components/lesson/SliderCard.module.css */
.card {
  composes: card from './shared.module.css';
  padding: 20px 20px 24px;
  text-align: center;
}

.instruction {
  font-family: var(--font-head);
  font-size: 0.9rem;
  font-weight: 600;
  color: var(--ink-dim);
  margin-bottom: 16px;
}

.sliderRow {
  display: flex;
  align-items: center;
  gap: 10px;
}

.stepBtn {
  width: 44px;
  height: 44px;
  border-radius: var(--r-pill);
  background: linear-gradient(135deg, var(--c-grape), var(--c-berry));
  color: #fff;
  font-size: 1.4rem;
  font-weight: 700;
  flex-shrink: 0;
}

.stepBtn:active {
  transform: scale(0.94);
}

.track {
  position: relative;
  flex: 1;
  height: 10px;
  border-radius: var(--r-pill);
  background: rgba(124,58,237,0.12);
}

.targetZone {
  position: absolute;
  top: 0;
  bottom: 0;
  border-radius: var(--r-pill);
  background: rgba(52,211,153,0.35);
}

.handle {
  position: absolute;
  top: 50%;
  width: 28px;
  height: 28px;
  margin-top: -14px;
  border-radius: 50%;
  background: linear-gradient(135deg, var(--c-mint), var(--c-sky));
  box-shadow: var(--shadow-card);
  touch-action: none;
}

.readout {
  margin-top: 14px;
  font-family: var(--font-head);
  font-size: 1.4rem;
  font-weight: 700;
  color: var(--ink);
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/components/lesson/SliderCard.test.jsx`
Expected: PASS (4 tests)

- [ ] **Step 5: Commit**

```bash
git add src/components/lesson/SliderCard.jsx src/components/lesson/SliderCard.module.css src/components/lesson/SliderCard.test.jsx
git commit -m "feat: add SliderCard with drag handle and keyboard/tap fallback"
```

---

### Task 5: Wire `drag-match` and `slider` step types into `LessonPage.jsx`

**Files:**
- Modify: `src/pages/LessonPage.jsx`

**Interfaces:**
- Consumes: `DragMatchCard` (Task 2/3), `SliderCard` (Task 4).
- No new exports — this task only extends `LessonPage`'s existing step-type dispatch.

- [ ] **Step 1: Add imports**

In `src/pages/LessonPage.jsx`, after the existing `import MasteryCheckCard from '../components/lesson/MasteryCheckCard.jsx'` line:

```jsx
import DragMatchCard from '../components/lesson/DragMatchCard.jsx'
import SliderCard from '../components/lesson/SliderCard.jsx'
```

- [ ] **Step 2: Add the render branches**

In the JSX render switch (the block containing `{step.type === 'mastery-check' && (...)}` around line 316-318), add immediately after it, before the closing `</div>` of `cardArea`:

```jsx
{step.type === 'drag-match' && (
  <DragMatchCard key={stepKey} step={step} onComplete={handleStepComplete} />
)}
{step.type === 'slider' && (
  <SliderCard key={stepKey} step={step} onComplete={handleStepComplete} />
)}
```

No change is needed to the narration-speaking `useEffect` (lines ~100-156): neither `drag-match` nor `slider` needs special post-narration speech (unlike `quiz`/`label`/`practice`/`explore`, which read options aloud) — the existing default fallthrough (`setUiStatus('idle')` at line 140) already applies to any unmatched step type, which is exactly the behavior wanted here.

- [ ] **Step 3: Manual smoke check**

Run: `npm run dev` (or confirm an already-running dev server), navigate to `/dev-lesson`, and confirm the page still renders for the existing step types (no regression) — full mission playthrough is deferred to Task 7 once `robotics.js` is updated.

- [ ] **Step 4: Run the full unit test suite to check for regressions**

Run: `npx vitest run`
Expected: All existing suites still PASS (no `LessonPage.test.jsx` assertions reference the new types yet, so none should break).

- [ ] **Step 5: Commit**

```bash
git add src/pages/LessonPage.jsx
git commit -m "feat: dispatch drag-match and slider step types in LessonPage"
```

---

### Task 6: Replace mission Step 04 content in `robotics.js`

**Files:**
- Modify: `api/_courseData/robotics.js`
- Modify: `api/_courseData/robotics.test.js`

**Interfaces:**
- Consumes: the `drag-match`/`slider` step shapes defined in Tasks 2-4.
- Produces: updated `MISSION_STEP_TYPES` expectations for the course-data shape test.

- [ ] **Step 1: Update the shape test first (RED)**

In `api/_courseData/robotics.test.js`, change the constant and the per-step assertions:

```js
const MISSION_STEP_TYPES = ['explain', 'teach', 'quiz', 'drag-match-or-slider', 'mastery-check']
```

Replace the whole file's step-type-sequence assertion with one that checks Step 04's type is one of the two new kinds, and update the per-step field assertions block (replacing the old `expect(activity.narration).toBeTruthy()` check) with:

```js
import { describe, it, expect } from 'vitest'
import { robotics } from './robotics.js'

describe('robotics course — Operation Iron Blueprint missions (old band)', () => {
  const missions = robotics.lessons.filter((l) => l.ageBand === 'old')

  it('has exactly 4 old-band mission lessons', () => {
    expect(missions.length).toBe(4)
  })

  it('each mission has the explain/teach/quiz/[drag-match|slider]/mastery-check sequence', () => {
    for (const lesson of missions) {
      const types = lesson.steps.map((s) => s.type)
      expect(types.slice(0, 3)).toEqual(['explain', 'teach', 'quiz'])
      expect(['drag-match', 'slider']).toContain(types[3])
      expect(types[4]).toBe('mastery-check')
    }
  })

  it('each step carries the fields its component reads', () => {
    for (const lesson of missions) {
      const [explain, teach, quiz, interactive, masteryCheck] = lesson.steps

      expect(explain.narration).toBeTruthy()
      expect(explain.emoji).toBeTruthy()
      expect(explain.fact).toBeTruthy()

      expect(teach.narration).toBeTruthy()
      expect(teach.emoji).toBeTruthy()
      expect(teach.fact).toBeTruthy()
      expect(teach.checkQuestion).toBeTruthy()
      expect(teach.checkAnswer).toBeTruthy()

      expect(quiz.narration).toBeTruthy()
      expect(quiz.question).toBeTruthy()
      expect(quiz.options.length).toBeGreaterThanOrEqual(2)
      expect(typeof quiz.correct).toBe('number')
      expect(quiz.options[quiz.correct]).toBeTruthy()

      expect(interactive.narration).toBeTruthy()
      if (interactive.type === 'drag-match') {
        expect(interactive.targets.length).toBeGreaterThanOrEqual(1)
        expect(interactive.items.length).toBeGreaterThanOrEqual(2)
        expect(['exact', 'budget']).toContain(interactive.rule.kind)
        if (interactive.rule.kind === 'exact') {
          for (const target of interactive.targets) {
            expect(interactive.items.map((it) => it.id)).toContain(interactive.rule.correct[target.id])
          }
        } else {
          expect(interactive.rule.max).toBeGreaterThan(0)
          expect(interactive.rule.required.length).toBeGreaterThanOrEqual(1)
          const requiredSum = interactive.rule.required.reduce(
            (sum, id) => sum + interactive.items.find((it) => it.id === id).value, 0
          )
          expect(requiredSum).toBeLessThanOrEqual(interactive.rule.max)
        }
      } else {
        expect(typeof interactive.min).toBe('number')
        expect(typeof interactive.max).toBe('number')
        expect(interactive.target.min).toBeGreaterThanOrEqual(interactive.min)
        expect(interactive.target.max).toBeLessThanOrEqual(interactive.max)
        expect(interactive.target.min).toBeLessThan(interactive.target.max)
      }

      expect(masteryCheck.narration).toBeTruthy()
      expect(masteryCheck.items.length).toBeGreaterThanOrEqual(2)
      for (const item of masteryCheck.items) {
        expect(item.question).toBeTruthy()
        expect(item.options.length).toBeGreaterThanOrEqual(2)
        expect(typeof item.correct).toBe('number')
        expect(item.options[item.correct]).toBeTruthy()
        expect(item.hints.length).toBe(item.options.length)
      }
    }
  })

  it('each mission has a printSheet and an offScreenChallenge', () => {
    for (const lesson of missions) {
      expect(lesson.printSheet?.title).toBeTruthy()
      expect(lesson.printSheet?.facts?.length).toBeGreaterThan(0)
      expect(lesson.printSheet?.colourPrompt).toBeTruthy()

      expect(lesson.offScreenChallenge?.title).toBeTruthy()
      expect(lesson.offScreenChallenge?.description).toBeTruthy()
    }
  })

  it('has unique lesson ids across the whole course', () => {
    const ids = robotics.lessons.map((l) => l.id)
    expect(new Set(ids).size).toBe(ids.length)
  })

  it('no longer has the legacy sensors/code lessons', () => {
    const ids = robotics.lessons.map((l) => l.id)
    expect(ids).not.toContain('sensors')
    expect(ids).not.toContain('code')
  })

  it('left the young/middle band lessons untouched', () => {
    const untouchedIds = ['robot-friends', 'what', 'build', 'helper-robots', 'robot-safety', 'robot-moves']
    const ids = robotics.lessons.map((l) => l.id)
    for (const id of untouchedIds) {
      expect(ids).toContain(id)
    }
  })
})
```

(Delete the stray unused `MISSION_STEP_TYPES` line from Step 1 above — it was scaffolding for this rewrite, not part of the final file.)

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run api/_courseData/robotics.test.js`
Expected: FAIL — Step 04 in `robotics.js` is still `{ type: 'activity', narration }` for all 4 missions, which doesn't satisfy the new `['drag-match', 'slider']` / field assertions.

- [ ] **Step 3: Replace each mission's Step 04 in `robotics.js`**

Mission 01 (`mission-neural-uplink`, currently lines 157-160) — replace:

```js
          {
            type: 'activity',
            narration: 'I\'ve uploaded a digital logic board, Recruit. Tell me out loud: if the bot hits a perimeter line, what should it do next?',
          },
```

with:

```js
          {
            type: 'drag-match',
            narration: 'I\'ve uploaded a digital logic board, Recruit. Drag the correct response onto the Perimeter Hit target — or tap it, then tap the target.',
            prompt: 'What should the bot do when it hits a perimeter line?',
            targets: [{ id: 'perimeter-response', label: '🚧 Perimeter Hit' }],
            items: [
              { id: 'stop-reverse', label: '🛑 Stop, then reverse', value: 1 },
              { id: 'speed-up', label: '🏎️ Speed up', value: 1 },
              { id: 'ignore', label: '🙈 Ignore it', value: 1 },
              { id: 'play-sound', label: '🔊 Play a sound', value: 1 },
            ],
            rule: { kind: 'exact', correct: { 'perimeter-response': 'stop-reverse' } },
          },
```

Mission 02 (`mission-sensory-array`, currently lines 214-217) — replace:

```js
          {
            type: 'activity',
            narration: 'Calibration time, Recruit — tell me: if an IR sensor keeps picking up false readings from bright floor reflections, what would you adjust to fix it?',
          },
```

with:

```js
          {
            type: 'slider',
            narration: 'Calibration time, Recruit. Drag the sensitivity dial — or use the arrow keys or the plus and minus buttons — until it\'s tuned right, away from those bright floor reflections.',
            prompt: 'Dial in the IR sensor\'s sensitivity',
            min: 0,
            max: 100,
            target: { min: 55, max: 70 },
            startAt: 15,
          },
```

Mission 03 (`mission-kinetic-deployment`, currently lines 271-274) — replace:

```js
          {
            type: 'activity',
            narration: 'I\'ve dropped a chassis into the sim, Recruit. Tell me: to clear a 30-degree incline, would you choose a fast motor or a strong motor — and why?',
          },
```

with:

```js
          {
            type: 'drag-match',
            narration: 'I\'ve dropped a chassis into the sim, Recruit. Drag the right motor onto the chassis — or tap it, then tap the target — to clear that 30-degree incline.',
            prompt: 'Which motor clears a 30° incline?',
            targets: [{ id: 'incline-motor', label: '⛰️ 30° Incline' }],
            items: [
              { id: 'torque-motor', label: '💪 Strong (high-torque) motor', value: 1 },
              { id: 'fast-motor', label: '⚡ Fast motor', value: 1 },
            ],
            rule: { kind: 'exact', correct: { 'incline-motor': 'torque-motor' } },
          },
```

Mission 04 (`mission-voltage-surge`, currently lines 328-331) — replace:

```js
          {
            type: 'activity',
            narration: 'You have a 9V limit, Recruit. Tell me out loud: if your components are about to draw more power than the battery can handle, what\'s your move?',
          },
```

with:

```js
          {
            type: 'drag-match',
            narration: 'You have a 9-volt limit, Recruit. Drag components onto the breadboard — or tap them, then tap the board — but don\'t go over budget.',
            prompt: 'Wire the breadboard without exceeding 9V',
            targets: [{ id: 'breadboard', label: '🔋 Breadboard (max 9V)' }],
            items: [
              { id: 'cpu', label: '🧠 CPU', value: 3 },
              { id: 'sensor-array', label: '📡 Sensor array', value: 2 },
              { id: 'motor', label: '⚙️ Motor', value: 5 },
              { id: 'extra-light', label: '💡 Extra light', value: 3 },
            ],
            rule: { kind: 'budget', max: 9, required: ['cpu', 'sensor-array'] },
          },
```

(Mission 04's required set — `cpu` 3 + `sensor-array` 2 = 5 — fits under the 9V max; adding `motor` (5) would push it to 10 and correctly gets rejected, matching the script's "don't exceed the limit" stakes. `extra-light` is an optional distractor that also fits.)

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run api/_courseData/robotics.test.js`
Expected: PASS (all 6 tests)

- [ ] **Step 5: Commit**

```bash
git add api/_courseData/robotics.js api/_courseData/robotics.test.js
git commit -m "feat: replace mission Step 04 voice placeholder with real drag/slider interactions"
```

---

### Task 7: Full suite, manual playthrough, and accessibility re-check

**Files:** none (verification only)

- [ ] **Step 1: Run the full automated test suite**

Run: `npx vitest run`
Expected: All suites PASS, including the new/updated ones from Tasks 1-6.

- [ ] **Step 2: Manual playthrough — drag path**

`npm run dev`, open `/dev-lesson` (or the real Courses → Robotics for Kids flow with a 9+ profile), play each of the 4 missions end-to-end using real drag gestures for Step 04. Confirm: Mission 01 & 03 complete only when the correct item is dropped on the target (wrong item bounces back with a shake); Mission 02's handle drags smoothly and the step completes once it settles in the target zone; Mission 04 accepts the required components and rejects any drop that would exceed 9V.

- [ ] **Step 3: Manual playthrough — tap/keyboard-only path**

Repeat the same 4 missions using only tap (no drag gesture) for Missions 01/03/04, and only the `−`/`+` buttons plus Tab+Arrow-key control for Mission 02's slider. Confirm every mission completes identically to the drag path.

- [ ] **Step 4: Re-run the manual axe-core-in-Chrome accessibility check**

`pa11y-ci` cannot run in this sandbox (no Chrome binary — same limitation hit earlier this session). Reuse the established workaround: with the dev server running, use the `claude-in-chrome` MCP tools to navigate to `/dev-lesson`, inject axe-core 4.9.1 via a CDN `<script>` tag, and run `axe.run(document, {runOnly:{type:'tag',values:['wcag2a','wcag2aa']}})` for each of the 4 missions' Step 04 screen (both an empty-state render and a mid-interaction render with an item selected/placed). Confirm 0 violations, matching the app's existing clean scan.

- [ ] **Step 5: Report results to the user**

Summarize: test suite status, manual drag/tap playthrough results, and the axe-core scan results (violation count per mission). Do not commit anything in this task — it's verification-only.

---

## Testing Summary

- Unit: `dragHitTest.test.js`, `DragMatchCard.test.jsx` (exact + budget rules, tap path), `SliderCard.test.jsx` (keyboard, tap buttons, Home/End), `robotics.test.js` (content shape).
- Manual: full drag playthrough, full tap/keyboard-only playthrough, axe-core WCAG2AA scan — all documented in Task 7 since RTL cannot simulate real pointer-drag physics.
