# Buddy Avatar Redesign — Squishy Living Blob — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the flat SVG animal-face avatar with one squishy jelly-blob character that breathes, blinks, glances, bounces, squishes when poked, and moves its mouth in sync with the real TTS audio — with the six animals kept as swappable costumes.

**Architecture:** `BuddyAvatar.jsx` keeps its exact public props (`status`, `avatarColor`, `type`, `size`) plus two new optional props (`audioRef`, `live`). All liveliness lives in one hook (`useBuddyLife`) that runs a single `requestAnimationFrame` loop, integrates springs for poke/bounce, schedules blinks/glances, synthesizes a poke "boing", and writes CSS custom properties directly to the container (no per-frame React re-render). A second hook (`useMouthLevel`) reads live TTS loudness via a Web Audio `AnalyserNode`, with an organic randomized fallback. The SVG (blob body + face + costume group) consumes those CSS variables.

**Tech Stack:** React 18, Vite 5, plain SVG + CSS Modules, Web Audio API. No new dependencies.

## Global Constraints

- **No new npm dependencies.** Pure SVG + CSS + Web Audio only.
- **Public API of `BuddyAvatar` must not break:** existing call sites pass `status`, `avatarColor`, `type`, `size`. New props (`audioRef`, `live`) are optional with safe defaults (`audioRef` → `undefined`, `live` → `true`).
- **SVG `viewBox` stays `0 0 100 100`** so costume coordinates and call-site sizing are unchanged.
- **No automated test framework exists in this repo.** Verification per task = `npm run build` (compile check) + manual check in `npm run dev`. Every task ends with a commit.
- **Respect `prefers-reduced-motion: reduce`:** no bouncing/wobble; gentle only.
- **Keep the existing color system:** `STATE_COLORS` for listening/speaking/thinking; `avatarColor` tints the body only when `status === 'idle'`.
- **Deviation from spec (approved inline):** poke sound is synthesized via Web Audio (zero-asset "boing"), not shipped `.mp3` files. Optional recorded giggles can be added to `public/sfx/` later without code changes required for the boing to work.
- **Commit message trailer:** end each commit body with `Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>`.

---

## File Structure

- `src/hooks/useMouthLevel.js` — **new.** Web Audio analyser + fallback; returns `getMouthLevel()`.
- `src/hooks/useBuddyLife.js` — **new.** Single rAF loop, spring integrator, blink/glance/bounce schedulers, poke boing, writes CSS vars; returns `{ containerRef, poke }`.
- `src/components/BuddyAvatar.jsx` — **rewrite.** Blob body + face + costume slot; wires both hooks; keeps public API.
- `src/components/BuddyAvatar.module.css` — **rewrite.** Ambient loops (breathing, glow), reduced-motion, CSS-var-driven transforms.
- `src/components/BuddyCostumes.jsx` — **new.** Six costume SVG groups + a `Costume` dispatcher.
- `src/pages/ChildPage.jsx` — **modify** one line (pass `audioRef`).
- `src/pages/LessonPage.jsx` — **modify** one line (pass `audioRef`).
- `src/components/AvatarPicker.jsx` — **modify** two lines (pass `live={false}` to thumbnails, keep preview live).

---

## Task 1: `useMouthLevel` hook (audio-synced mouth)

**Files:**
- Create: `src/hooks/useMouthLevel.js`

**Interfaces:**
- Consumes: nothing from other tasks.
- Produces: `export function useMouthLevel(audioRef, isSpeaking): () => number` — returns a stable callback `getMouthLevel()` that yields the current mouth openness `0..1`. Returns `0` when not speaking. Uses the Web Audio analyser when a Google-TTS `<audio>` element is present and its `AudioContext` is running; otherwise returns an organic randomized level.

- [ ] **Step 1: Create the hook**

Create `src/hooks/useMouthLevel.js`:

```js
import { useCallback, useEffect, useRef } from 'react'

/**
 * Returns getMouthLevel(): number in 0..1.
 * - Google TTS path: reads live loudness from the <audio> element via an
 *   AnalyserNode.
 * - Fallback (browser speechSynthesis => audioRef.current is null, or the
 *   AudioContext can't run): an organic randomized level so the mouth never
 *   looks frozen.
 */
export function useMouthLevel(audioRef, isSpeaking) {
  const ctxRef       = useRef(null)
  const analyserRef  = useRef(null)
  const dataRef      = useRef(null)
  const connectedRef = useRef(null)   // the <audio> element currently wired up
  const failedRef    = useRef(false)  // give up on Web Audio permanently on error
  const fbRef        = useRef({ level: 0, phase: Math.random() * 6.28 })

  const ensureGraph = useCallback(() => {
    if (failedRef.current) return false
    const el = audioRef?.current
    if (!el) return false
    try {
      if (!ctxRef.current) {
        const AC = window.AudioContext || window.webkitAudioContext
        if (!AC) { failedRef.current = true; return false }
        const ctx = new AC()
        const analyser = ctx.createAnalyser()
        analyser.fftSize = 256
        analyser.smoothingTimeConstant = 0.6
        analyser.connect(ctx.destination)
        ctxRef.current      = ctx
        analyserRef.current = analyser
        dataRef.current     = new Uint8Array(analyser.frequencyBinCount)
      }
      if (connectedRef.current !== el) {
        // A MediaElementSource can only be created once per element; useSpeech
        // makes a fresh <audio> per utterance, so connect each new one.
        const src = ctxRef.current.createMediaElementSource(el)
        src.connect(analyserRef.current)
        connectedRef.current = el
      }
      if (ctxRef.current.state === 'suspended') {
        ctxRef.current.resume().catch(() => {})
      }
      return ctxRef.current.state === 'running'
    } catch (_e) {
      failedRef.current = true
      return false
    }
  }, [audioRef])

  const getMouthLevel = useCallback(() => {
    if (!isSpeaking) return 0
    if (ensureGraph() && analyserRef.current) {
      const a = analyserRef.current
      const data = dataRef.current
      a.getByteTimeDomainData(data)
      let sum = 0
      for (let i = 0; i < data.length; i++) {
        const v = (data[i] - 128) / 128
        sum += v * v
      }
      const rms = Math.sqrt(sum / data.length)
      return Math.max(0, Math.min(1, rms * 3.5))
    }
    // Fallback: organic mouth motion (sine base + jitter, smoothed)
    const f = fbRef.current
    f.phase += 0.35
    const base = Math.sin(f.phase) * 0.5 + 0.5
    const target = base * (0.35 + Math.random() * 0.65)
    f.level += (target - f.level) * 0.45
    return Math.max(0, Math.min(1, f.level))
  }, [isSpeaking, ensureGraph])

  // Close the AudioContext on unmount to free resources.
  useEffect(() => {
    return () => {
      if (ctxRef.current) { ctxRef.current.close().catch(() => {}); ctxRef.current = null }
    }
  }, [])

  return getMouthLevel
}
```

- [ ] **Step 2: Build check**

Run: `npm run build`
Expected: build succeeds (no import/syntax errors). The hook isn't wired anywhere yet, so no runtime effect.

- [ ] **Step 3: Commit**

```bash
git add src/hooks/useMouthLevel.js
git commit -m "feat(avatar): add useMouthLevel hook for TTS-synced mouth

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

## Task 2: `useBuddyLife` hook (blink, glance, bounce, poke spring, CSS vars)

**Files:**
- Create: `src/hooks/useBuddyLife.js`

**Interfaces:**
- Consumes: `getMouthLevel: () => number` (from Task 1).
- Produces: `export function useBuddyLife({ status, live, getMouthLevel }): { containerRef, poke }`.
  - `containerRef` — attach to the outer `<div>` of the avatar; the loop writes CSS vars on it: `--blink` (0..1), `--pupil-x`/`--pupil-y` (px), `--sx`/`--sy` (scale), `--by` (px translateY), `--mouth` (0..1).
  - `poke()` — call on pointer-down; triggers a squash impulse (wobble) and a synthesized boing, with a 1500 ms cooldown.

- [ ] **Step 1: Create the hook**

Create `src/hooks/useBuddyLife.js`:

```js
import { useCallback, useEffect, useRef } from 'react'

const POKE_COOLDOWN_MS = 1500

// Gaze target per status: [x, y] in px, applied to pupils.
function gazeFor(status) {
  if (status === 'listening') return [0, -1.5]   // eyes forward/up, attentive
  if (status === 'thinking')  return [-3, -3]    // drift up-and-aside
  return [0, 0]
}

export function useBuddyLife({ status, live, getMouthLevel }) {
  const containerRef = useRef(null)
  const rafRef       = useRef(0)
  const sfxCtxRef    = useRef(null)
  const lastPokeRef  = useRef(0)

  const S = useRef({
    // blink
    blink: 0, blinkVel: 0, nextBlinkAt: 0, pendingDouble: false,
    // gaze
    pupilX: 0, pupilY: 0, gx: 0, gy: 0, nextGlanceAt: 0,
    // squash spring (x = deformation, 0 = neutral)
    sq: 0, sqVel: 0,
    // bounce
    by: 0, byVel: 0, bouncing: false, nextBounceAt: 0,
    // mouth
    mouth: 0,
    // timing
    last: 0,
  })

  const reduced = typeof window !== 'undefined' &&
    window.matchMedia?.('(prefers-reduced-motion: reduce)').matches

  const boing = useCallback(() => {
    try {
      const AC = window.AudioContext || window.webkitAudioContext
      if (!AC) return
      if (!sfxCtxRef.current) sfxCtxRef.current = new AC()
      const ctx = sfxCtxRef.current
      if (ctx.state === 'suspended') ctx.resume().catch(() => {})
      const t = ctx.currentTime
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      const detune = 0.85 + Math.random() * 0.4  // vary pitch per poke
      osc.type = 'sine'
      osc.frequency.setValueAtTime(440 * detune, t)
      osc.frequency.exponentialRampToValueAtTime(130 * detune, t + 0.18)
      gain.gain.setValueAtTime(0.0001, t)
      gain.gain.exponentialRampToValueAtTime(0.35, t + 0.02)
      gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.22)
      osc.connect(gain); gain.connect(ctx.destination)
      osc.start(t); osc.stop(t + 0.24)
    } catch (_e) { /* silent: poke still wobbles */ }
  }, [])

  const poke = useCallback(() => {
    const now = performance.now()
    if (now - lastPokeRef.current < POKE_COOLDOWN_MS) return
    lastPokeRef.current = now
    // Squash impulse -> underdamped spring gives the jelly wobble.
    S.current.sq = 0.28
    S.current.sqVel = -1.5
    if (!reduced) boing()
  }, [boing, reduced])

  // Write neutral values once, for static (live=false) or reduced use.
  const writeStatic = useCallback(() => {
    const el = containerRef.current
    if (!el) return
    el.style.setProperty('--blink', '0')
    el.style.setProperty('--pupil-x', '0px')
    el.style.setProperty('--pupil-y', '0px')
    el.style.setProperty('--sx', '1')
    el.style.setProperty('--sy', '1')
    el.style.setProperty('--by', '0px')
    el.style.setProperty('--mouth', '0')
  }, [])

  useEffect(() => {
    if (!live) { writeStatic(); return }

    const st = S.current
    const now = performance.now()
    st.last = now
    st.nextBlinkAt  = now + 2000 + Math.random() * 3000
    st.nextGlanceAt = now + 3000 + Math.random() * 4000
    st.nextBounceAt = now + 10000 + Math.random() * 5000

    const loop = () => {
      rafRef.current = requestAnimationFrame(loop)
      const el = containerRef.current
      if (!el || document.hidden) { st.last = performance.now(); return }

      const t = performance.now()
      const dt = Math.min(0.05, (t - st.last) / 1000)  // clamp big gaps
      st.last = t

      // ---- Blink (skin-squash of eye group; quick close, quick open) ----
      if (t >= st.nextBlinkAt) {
        st.blink = 1
        if (Math.random() < 0.3) st.pendingDouble = true
        st.nextBlinkAt = t + (st.pendingDouble ? 180 : 2500 + Math.random() * 3500)
        if (!st.pendingDouble) { /* normal reschedule above */ }
        else if (st.blink === 1 && st.pendingDouble) {
          // second blink scheduled shortly; clear flag after it fires
          st.pendingDouble = false
        }
      }
      // ease blink back open
      st.blink += (0 - st.blink) * Math.min(1, dt * 14)
      if (st.blink < 0.02) st.blink = 0

      // ---- Gaze ----
      const [tgx, tgy] = gazeFor(status)
      if (status === 'idle' && !reduced && t >= st.nextGlanceAt) {
        st.gx = (Math.random() * 2 - 1) * 3
        st.gy = (Math.random() * 2 - 1) * 2
        st.nextGlanceAt = t + 2500 + Math.random() * 4000
        // return to center shortly after a glance
        setTimeout(() => { st.gx = 0; st.gy = 0 }, 700)
      }
      const gxTarget = status === 'idle' ? st.gx : tgx
      const gyTarget = status === 'idle' ? st.gy : tgy
      st.pupilX += (gxTarget - st.pupilX) * Math.min(1, dt * 8)
      st.pupilY += (gyTarget - st.pupilY) * Math.min(1, dt * 8)

      // ---- Spontaneous bounce (idle only, not reduced) ----
      if (status === 'idle' && !reduced && !st.bouncing && t >= st.nextBounceAt) {
        st.bouncing = true
        st.byVel = -520          // launch up (px/s)
        st.sq = -0.12            // pre-stretch
        st.nextBounceAt = t + 10000 + Math.random() * 6000
      }
      if (st.bouncing) {
        st.byVel += 1600 * dt    // gravity
        st.by += st.byVel * dt
        // stretch while moving, squash near apex handled by spring on landing
        if (st.by >= 0) {        // landed
          st.by = 0
          st.bouncing = false
          st.sq = 0.22; st.sqVel = -1.2   // landing squash -> wobble
        }
      }

      // ---- Squash spring (underdamped => jelly wobble) ----
      if (!reduced) {
        const stiffness = 240, damping = 13
        const acc = -stiffness * st.sq - damping * st.sqVel
        st.sqVel += acc * dt
        st.sq += st.sqVel * dt
        if (Math.abs(st.sq) < 0.001 && Math.abs(st.sqVel) < 0.01) { st.sq = 0; st.sqVel = 0 }
      } else {
        st.sq = 0; st.sqVel = 0
      }

      // ---- Mouth (only meaningful while speaking) ----
      const mLevel = getMouthLevel ? getMouthLevel() : 0
      st.mouth += (mLevel - st.mouth) * Math.min(1, dt * 22)

      // ---- Write CSS vars ----
      // squash: positive sq => wider + shorter (jelly squish)
      const sx = 1 + st.sq * 0.9
      const sy = 1 - st.sq * 0.9
      el.style.setProperty('--blink', st.blink.toFixed(3))
      el.style.setProperty('--pupil-x', st.pupilX.toFixed(2) + 'px')
      el.style.setProperty('--pupil-y', st.pupilY.toFixed(2) + 'px')
      el.style.setProperty('--sx', sx.toFixed(3))
      el.style.setProperty('--sy', sy.toFixed(3))
      el.style.setProperty('--by', st.by.toFixed(2) + 'px')
      el.style.setProperty('--mouth', st.mouth.toFixed(3))
    }

    rafRef.current = requestAnimationFrame(loop)
    return () => cancelAnimationFrame(rafRef.current)
  }, [live, status, reduced, getMouthLevel, writeStatic])

  // Close the SFX context on unmount.
  useEffect(() => {
    return () => {
      if (sfxCtxRef.current) { sfxCtxRef.current.close().catch(() => {}); sfxCtxRef.current = null }
    }
  }, [])

  return { containerRef, poke }
}
```

- [ ] **Step 2: Build check**

Run: `npm run build`
Expected: build succeeds. Not wired anywhere yet.

- [ ] **Step 3: Commit**

```bash
git add src/hooks/useBuddyLife.js
git commit -m "feat(avatar): add useBuddyLife hook (blink, bounce, poke spring, CSS vars)

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

## Task 3: Rewrite `BuddyAvatar` — blob body, face, CSS (no costumes yet)

**Files:**
- Modify (rewrite): `src/components/BuddyAvatar.jsx`
- Modify (rewrite): `src/components/BuddyAvatar.module.css`

**Interfaces:**
- Consumes: `useMouthLevel` (Task 1), `useBuddyLife` (Task 2).
- Produces: `<BuddyAvatar status avatarColor type size audioRef live />` rendering the blob + face, wired to both hooks and the poke handler. Renders a costume slot that is empty until Task 4 (`Costume` import added there). Public props unchanged; `audioRef` defaults `undefined`, `live` defaults `true`.

- [ ] **Step 1: Rewrite the component**

Replace the entire contents of `src/components/BuddyAvatar.jsx` with:

```jsx
import styles from './BuddyAvatar.module.css'
import { useMouthLevel } from '../hooks/useMouthLevel.js'
import { useBuddyLife } from '../hooks/useBuddyLife.js'

const STATE_COLORS = {
  idle:      { face: '#7c3aed', glow: '#a855f7' },
  listening: { face: '#16a34a', glow: '#4ade80' },
  speaking:  { face: '#d97706', glow: '#fcd34d' },
  thinking:  { face: '#2563eb', glow: '#60a5fa' },
}

// Pear-ish blob: wider at the bottom so it reads as having weight.
const BLOB_PATH =
  'M50 18 C76 18 90 37 90 60 C90 85 73 97 50 97 C27 97 10 85 10 60 C10 37 24 18 50 18 Z'

export default function BuddyAvatar({
  status = 'idle',
  avatarColor,
  type = 'bear',
  size = 170,
  audioRef,
  live = true,
}) {
  const colors    = STATE_COLORS[status] || STATE_COLORS.idle
  const bodyColor = avatarColor && status === 'idle' ? avatarColor : colors.face
  const isListening = status === 'listening'
  const isSpeaking  = status === 'speaking'
  const isThinking  = status === 'thinking'

  const getMouthLevel = useMouthLevel(audioRef, isSpeaking && live)
  const { containerRef, poke } = useBuddyLife({ status, live, getMouthLevel })

  const eyeR = isListening ? 10 : 9

  return (
    <div
      ref={containerRef}
      className={`${styles.container} ${styles[status]} ${live ? '' : styles.static}`}
      style={{ width: size + 20, height: size + 20 }}
      onPointerDown={live ? poke : undefined}
    >
      <div className={styles.glow} style={{ background: colors.glow, width: size, height: size }} />

      <svg
        viewBox="0 0 100 100"
        className={styles.face}
        style={{ width: size, height: size, ['--body']: bodyColor }}
        aria-label={`Buddy is ${status}`}
      >
        {/* Body group — squash/stretch + bounce applied here so the whole
            character deforms like jelly. */}
        <g className={styles.bodyGroup}>
          {/* Costume behind the body (ears, spikes) — filled in Task 4 */}
          {/* <Costume type={type} isListening={isListening} /> */}

          {/* Blob body */}
          <path d={BLOB_PATH} className={styles.body} />
          {/* Bottom depth shadow */}
          <ellipse cx="50" cy="86" rx="30" ry="10" fill="rgba(0,0,0,0.10)" />
          {/* Glossy top highlight */}
          <ellipse cx="42" cy="40" rx="22" ry="14" fill="rgba(255,255,255,0.18)" />
          {/* Belly highlight */}
          <ellipse cx="50" cy="66" rx="20" ry="14" fill="rgba(255,255,255,0.10)" />

          {/* Cheek blush */}
          <circle cx="26" cy="64" r="8" fill="rgba(255,120,120,0.28)" />
          <circle cx="74" cy="64" r="8" fill="rgba(255,120,120,0.28)" />

          {/* Eyes (blink squashes each eye group vertically) */}
          <g className={styles.eye} style={{ ['--ex']: '35px' }}>
            <circle cx="35" cy="52" r={eyeR} fill="white" />
            <g className={styles.pupil}>
              <circle cx="35" cy="52" r="5" fill="#1e1b4b" />
              <circle cx="36.6" cy="50" r="1.8" fill="white" />
              <circle cx="33.6" cy="53.5" r="1" fill="rgba(255,255,255,0.7)" />
            </g>
          </g>
          <g className={styles.eye} style={{ ['--ex']: '65px' }}>
            <circle cx="65" cy="52" r={eyeR} fill="white" />
            <g className={styles.pupil}>
              <circle cx="65" cy="52" r="5" fill="#1e1b4b" />
              <circle cx="66.6" cy="50" r="1.8" fill="white" />
              <circle cx="63.6" cy="53.5" r="1" fill="rgba(255,255,255,0.7)" />
            </g>
          </g>

          {/* Raised brows when listening */}
          {isListening && (
            <>
              <path d="M 27 41 Q 35 36 43 41" className={styles.brow} />
              <path d="M 57 41 Q 65 36 73 41" className={styles.brow} />
            </>
          )}

          {/* Mouth: resting smile, or audio-driven open ellipse when speaking */}
          {isSpeaking ? (
            <g className={styles.mouthGroup}>
              <ellipse cx="50" cy="74" rx="8" ry="6" fill="rgba(60,20,20,0.55)" />
            </g>
          ) : isThinking ? (
            <path d="M 42 75 Q 50 75 58 75" className={styles.mouthLine} />
          ) : (
            <path d="M 40 73 Q 50 82 60 73" className={styles.smile} />
          )}

          {/* Speaking sparkles */}
          {isSpeaking && (
            <g>
              <polygon className={styles.spark1} points="8,20 9.5,24 13,24 10.5,26.5 11.5,30 8,28 4.5,30 5.5,26.5 3,24 6.5,24" fill="#fcd34d" />
              <polygon className={styles.spark2} points="92,17 93,20 96,20 94,22 94.5,25 92,23.5 89.5,25 90,22 88,20 91,20" fill="#fcd34d" />
              <circle className={styles.spark3} cx="18" cy="12" r="2.5" fill="#f9a8d4" />
              <circle className={styles.spark4} cx="82" cy="10" r="2" fill="#86efac" />
            </g>
          )}

          {/* Thinking dots */}
          {isThinking && (
            <g>
              <circle className={styles.thinkDot1} cx="38" cy="90" r="3.2" fill="rgba(255,255,255,0.75)" />
              <circle className={styles.thinkDot2} cx="50" cy="90" r="3.2" fill="rgba(255,255,255,0.75)" />
              <circle className={styles.thinkDot3} cx="62" cy="90" r="3.2" fill="rgba(255,255,255,0.75)" />
            </g>
          )}
        </g>
      </svg>
    </div>
  )
}
```

- [ ] **Step 2: Rewrite the CSS module**

Replace the entire contents of `src/components/BuddyAvatar.module.css` with:

```css
.container {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  touch-action: manipulation;
  -webkit-tap-highlight-color: transparent;
  cursor: pointer;
}

.glow {
  position: absolute;
  border-radius: 50%;
  filter: blur(32px);
  opacity: 0.5;
  transition: background 0.5s ease;
  animation: glowPulse 3s ease-in-out infinite;
}

@keyframes glowPulse {
  0%, 100% { transform: scale(1);    opacity: 0.45; }
  50%      { transform: scale(1.15); opacity: 0.65; }
}

.face {
  position: relative;
  z-index: 1;
  transition: filter 0.3s ease;
  filter: drop-shadow(0 6px 22px rgba(0,0,0,0.35));
  overflow: visible;
}

.body { fill: var(--body); transition: fill 0.4s ease; }

/* Body group: bounce (translateY) + squash/stretch from useBuddyLife vars,
   composed with a gentle idle breathing loop. */
.bodyGroup {
  transform-box: fill-box;
  transform-origin: 50% 90%;   /* pivot near the feet for weighty squash */
  transform:
    translateY(var(--by, 0px))
    scaleX(var(--sx, 1))
    scaleY(var(--sy, 1));
}

.idle .bodyGroup   { animation: breathe 3.4s ease-in-out infinite; }
.listening .bodyGroup { animation: leanIn 0.6s ease-in-out infinite; }
.thinking .bodyGroup  { animation: sway 2.4s ease-in-out infinite; }

/* Breathing multiplies onto the var-driven transform via a wrapper animation.
   We animate a separate scale on the SVG element to avoid clobbering the
   group's var transform. */
.idle .face      { animation: breathe 3.4s ease-in-out infinite; }
.listening .face { animation: leanIn 0.6s ease-in-out infinite; }
.speaking .face  { animation: none; }
.thinking .face  { animation: sway 2.4s ease-in-out infinite; }

@keyframes breathe {
  0%, 100% { transform: translateY(0) scale(1); }
  50%      { transform: translateY(-3px) scale(1.02); }
}
@keyframes leanIn {
  0%, 100% { transform: translateY(0) rotate(-1.5deg); }
  50%      { transform: translateY(-2px) rotate(1.5deg); }
}
@keyframes sway {
  0%, 100% { transform: rotate(-2deg); }
  50%      { transform: rotate(2deg); }
}

/* Eyes blink by squashing the eye group vertically around its center. */
.eye {
  transform-box: fill-box;
  transform-origin: 50% 50%;
  transform: scaleY(calc(1 - 0.9 * var(--blink, 0)));
}
/* Pupils track gaze. */
.pupil {
  transform: translate(var(--pupil-x, 0px), var(--pupil-y, 0px));
}

.brow  { stroke: rgba(255,255,255,0.75); stroke-width: 2.5; fill: none; stroke-linecap: round; }
.smile { stroke: rgba(255,255,255,0.8); stroke-width: 3; fill: none; stroke-linecap: round; }
.mouthLine { stroke: rgba(255,255,255,0.6); stroke-width: 2.5; fill: none; stroke-linecap: round; }

/* Mouth openness from --mouth (0..1): scale a mouth group vertically. */
.mouthGroup {
  transform-box: fill-box;
  transform-origin: 50% 40%;
  transform: scaleY(calc(0.22 + 0.9 * var(--mouth, 0)));
}

/* Sparkles */
.spark1 { animation: sparkle 0.7s ease-in-out 0s    infinite; transform-box: fill-box; transform-origin: center; }
.spark2 { animation: sparkle 0.7s ease-in-out 0.2s  infinite; transform-box: fill-box; transform-origin: center; }
.spark3 { animation: sparkle 0.8s ease-in-out 0.1s  infinite; transform-box: fill-box; transform-origin: center; }
.spark4 { animation: sparkle 0.8s ease-in-out 0.35s infinite; transform-box: fill-box; transform-origin: center; }
@keyframes sparkle {
  0%, 100% { opacity: 0;  transform: scale(0.4) rotate(0deg); }
  50%      { opacity: 1;  transform: scale(1.3) rotate(30deg); }
}

/* Thinking dots */
.thinkDot1 { animation: dotPop 1.2s ease-in-out 0s   infinite; transform-box: fill-box; transform-origin: center; }
.thinkDot2 { animation: dotPop 1.2s ease-in-out 0.2s infinite; transform-box: fill-box; transform-origin: center; }
.thinkDot3 { animation: dotPop 1.2s ease-in-out 0.4s infinite; transform-box: fill-box; transform-origin: center; }
@keyframes dotPop {
  0%, 100% { opacity: 0.25; transform: scale(0.7); }
  50%      { opacity: 1;    transform: scale(1.35); }
}

/* Static thumbnails: no ambient animation. */
.static .glow,
.static .bodyGroup,
.static .face { animation: none; }

/* Reduced motion: calm everything. */
@media (prefers-reduced-motion: reduce) {
  .glow,
  .bodyGroup,
  .face,
  .spark1, .spark2, .spark3, .spark4,
  .thinkDot1, .thinkDot2, .thinkDot3 { animation: none; }
}
```

Note: two elements (`.face` and `.bodyGroup`) both carry breathing/lean/sway to keep the CSS-var transform on `.bodyGroup` separate from the ambient CSS animation on `.face` — CSS `animation` on `.bodyGroup` would overwrite its inline var transform, so ambient loops ride on `.face` while the deformation vars ride on `.bodyGroup`. Remove the `.idle .bodyGroup`/`.listening .bodyGroup`/`.thinking .bodyGroup` rules (they conflict with the var transform) — keep only the `.face` ambient rules.

Correction to apply in this step: delete these three lines from the CSS above before saving:
```
.idle .bodyGroup   { animation: breathe 3.4s ease-in-out infinite; }
.listening .bodyGroup { animation: leanIn 0.6s ease-in-out infinite; }
.thinking .bodyGroup  { animation: sway 2.4s ease-in-out infinite; }
```

- [ ] **Step 3: Build check**

Run: `npm run build`
Expected: build succeeds.

- [ ] **Step 4: Manual verification**

Run: `npm run dev`, open the child page.
Expected:
- Blob renders with the child's color when idle; breathes gently; blinks on random intervals (watch ~10 s).
- Tapping the blob squishes it with a wobble rebound and plays a short boing; rapid taps are rate-limited (~1.5 s).
- Trigger speaking (talk to Buddy): mouth opens/closes roughly with the voice; sparkles show.
- Listening state: brows raise, eyes slightly larger. Thinking: dots + sway.

- [ ] **Step 5: Commit**

```bash
git add src/components/BuddyAvatar.jsx src/components/BuddyAvatar.module.css
git commit -m "feat(avatar): rebuild Buddy as squishy blob with live face

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

## Task 4: Costumes (six animal identities on the blob)

**Files:**
- Create: `src/components/BuddyCostumes.jsx`
- Modify: `src/components/BuddyAvatar.jsx` (import + render `Costume`)
- Modify: `src/components/BuddyAvatar.module.css` (costume listening accents)

**Interfaces:**
- Consumes: nothing beyond React.
- Produces: `export function Costume({ type, isListening })` rendering an SVG group for `bear|cat|dog|bunny|alien|dino`. Unknown type → bear. Rendered **inside** `.bodyGroup` so costumes inherit squash/stretch/bounce. Uses `currentColor`? No — costumes use `fill="var(--body)"` (matching body) and inner tints; listening accents use CSS classes exported from `BuddyAvatar.module.css` passed via a `styles` prop.

- [ ] **Step 1: Create the costume module**

Create `src/components/BuddyCostumes.jsx`:

```jsx
// Costume SVG groups drawn to sit on the blob body (viewBox 0 0 100 100).
// Ears/spikes/antenna use var(--body) so they match the tinted body, with
// soft inner tints. `s` is the CSS-modules object from BuddyAvatar for the
// listening-accent animation classes.

function Bear({ isListening, s }) {
  return (
    <g>
      <circle cx="22" cy="26" r="15" fill="var(--body)" />
      <circle cx="78" cy="26" r="15" fill="var(--body)" />
      <circle cx="22" cy="26" r="8.5" fill="rgba(255,190,190,0.5)" />
      <circle cx="78" cy="26" r="8.5" fill="rgba(255,190,190,0.5)" />
      {isListening && (
        <>
          <circle className={s.earPulse} cx="22" cy="26" r="4" fill="rgba(255,255,255,0.4)" />
          <circle className={s.earPulse} cx="78" cy="26" r="4" fill="rgba(255,255,255,0.4)" />
        </>
      )}
    </g>
  )
}

function Cat({ isListening, s }) {
  return (
    <g>
      <polygon points="14,40 26,8 40,38" fill="var(--body)" className={isListening ? s.earTwitch : ''} />
      <polygon points="60,38 74,8 86,40" fill="var(--body)" className={isListening ? s.earTwitchR : ''} />
      <polygon points="18,38 26,15 36,37" fill="rgba(255,190,190,0.5)" />
      <polygon points="64,37 74,15 82,38" fill="rgba(255,190,190,0.5)" />
      {/* whiskers */}
      <g stroke="rgba(255,255,255,0.5)" strokeWidth="1.4" strokeLinecap="round">
        <line x1="16" y1="60" x2="38" y2="63" />
        <line x1="16" y1="66" x2="38" y2="66" />
        <line x1="62" y1="63" x2="84" y2="60" />
        <line x1="62" y1="66" x2="84" y2="66" />
      </g>
    </g>
  )
}

function Dog({ isListening, s }) {
  return (
    <g>
      <ellipse cx="12" cy="52" rx="11" ry="22" fill="var(--body)" transform="rotate(-14 12 52)"
        className={isListening ? s.dogEarL : ''} style={{ transformBox: 'fill-box', transformOrigin: 'top center' }} />
      <ellipse cx="88" cy="52" rx="11" ry="22" fill="var(--body)" transform="rotate(14 88 52)"
        className={isListening ? s.dogEarR : ''} style={{ transformBox: 'fill-box', transformOrigin: 'top center' }} />
    </g>
  )
}

function Bunny({ isListening, s }) {
  return (
    <g>
      <g className={isListening ? s.bunnyEarL : ''} style={{ transformBox: 'fill-box', transformOrigin: '32px 38px' }}>
        <ellipse cx="32" cy="16" rx="9" ry="24" fill="var(--body)" />
        <ellipse cx="32" cy="16" rx="5" ry="18" fill="rgba(255,190,190,0.5)" />
      </g>
      <g className={isListening ? s.bunnyEarR : ''} style={{ transformBox: 'fill-box', transformOrigin: '68px 38px' }}>
        <ellipse cx="68" cy="16" rx="9" ry="24" fill="var(--body)" />
        <ellipse cx="68" cy="16" rx="5" ry="18" fill="rgba(255,190,190,0.5)" />
      </g>
    </g>
  )
}

function Alien({ isListening, s }) {
  return (
    <g>
      <line x1="50" y1="20" x2="50" y2="7" stroke="var(--body)" strokeWidth="3" strokeLinecap="round" />
      <circle cx="50" cy="5" r="5" fill="#86efac" className={isListening ? s.antenna : ''} />
    </g>
  )
}

function Dino({ isListening, s }) {
  return (
    <g fill="var(--body)">
      <polygon points="34,26 39,8 44,26" />
      <polygon points="45,22 50,3 55,22" className={isListening ? s.spike : ''} />
      <polygon points="56,26 61,8 66,26" />
    </g>
  )
}

const COSTUMES = { bear: Bear, cat: Cat, dog: Dog, bunny: Bunny, alien: Alien, dino: Dino }

export function Costume({ type, isListening, s }) {
  const C = COSTUMES[type] || COSTUMES.bear
  return <C isListening={isListening} s={s} />
}
```

- [ ] **Step 2: Wire the costume into `BuddyAvatar.jsx`**

Add the import near the top of `src/components/BuddyAvatar.jsx`:

```jsx
import { Costume } from './BuddyCostumes.jsx'
```

Replace the commented costume placeholder line inside `.bodyGroup` (the `{/* <Costume ... */}` comment) with:

```jsx
          <Costume type={type} isListening={isListening} s={styles} />
```

- [ ] **Step 3: Add costume listening-accent classes to the CSS module**

Append to `src/components/BuddyAvatar.module.css`:

```css
/* ── Costume listening accents ── */
.earPulse { animation: earBlink 0.6s ease-in-out infinite alternate; transform-box: fill-box; transform-origin: center; }
@keyframes earBlink { from { opacity: 0.2; transform: scale(0.7); } to { opacity: 0.6; transform: scale(1.3); } }

.earTwitch  { animation: twitch 0.4s ease-in-out infinite alternate; transform-box: fill-box; transform-origin: bottom center; }
.earTwitchR { animation: twitchR 0.4s ease-in-out infinite alternate; transform-box: fill-box; transform-origin: bottom center; }
@keyframes twitch  { from { transform: rotate(-5deg); } to { transform: rotate(5deg); } }
@keyframes twitchR { from { transform: rotate(5deg); }  to { transform: rotate(-5deg); } }

.dogEarL { animation: wagL 0.5s ease-in-out infinite alternate; }
.dogEarR { animation: wagR 0.5s ease-in-out infinite alternate; }
@keyframes wagL { from { transform: rotate(0deg); } to { transform: rotate(10deg); } }
@keyframes wagR { from { transform: rotate(0deg); } to { transform: rotate(-10deg); } }

.bunnyEarL { animation: wigL 0.5s ease-in-out infinite alternate; }
.bunnyEarR { animation: wigR 0.5s ease-in-out infinite alternate; }
@keyframes wigL { from { transform: rotate(-5deg); } to { transform: rotate(5deg); } }
@keyframes wigR { from { transform: rotate(5deg); }  to { transform: rotate(-5deg); } }

.antenna { animation: antennaBlink 0.5s ease-in-out infinite alternate; transform-box: fill-box; transform-origin: center; }
@keyframes antennaBlink { from { fill: #86efac; transform: scale(1); } to { fill: #fff; transform: scale(1.3); } }

.spike { animation: spikeFlash 0.6s ease-in-out infinite alternate; }
@keyframes spikeFlash { from { opacity: 0.6; } to { opacity: 1; } }
```

Also add these accent classes to the `prefers-reduced-motion` and `.static` `animation: none` groups at the bottom of the file (extend the existing selector lists to include `.earPulse, .earTwitch, .earTwitchR, .dogEarL, .dogEarR, .bunnyEarL, .bunnyEarR, .antenna, .spike`).

- [ ] **Step 4: Build check**

Run: `npm run build`
Expected: build succeeds.

- [ ] **Step 5: Manual verification**

Run: `npm run dev`, open the customize picker (🎨).
Expected:
- All six costumes render on the blob (ears/whiskers/spikes/antenna) and follow the body when it squishes.
- In listening state, each costume's accent animates (bear ear pulse, cat/dog/bunny ear motion, alien antenna blink, dino spike flash).
- Poke on the child page still squishes ears along with the body.

- [ ] **Step 6: Commit**

```bash
git add src/components/BuddyCostumes.jsx src/components/BuddyAvatar.jsx src/components/BuddyAvatar.module.css
git commit -m "feat(avatar): add six swappable costumes pinned to the blob

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

## Task 5: Wire real mouth sync at call sites + static thumbnails

**Files:**
- Modify: `src/pages/ChildPage.jsx:471`
- Modify: `src/pages/LessonPage.jsx:127-131`
- Modify: `src/components/AvatarPicker.jsx:31,54`

**Interfaces:**
- Consumes: `speech.audioRef` (already exposed by `useSpeech`), `BuddyAvatar` `audioRef`/`live` props (Task 3).
- Produces: full integration — real audio-driven mouth in the app, static blobs in the picker grid.

- [ ] **Step 1: Pass `audioRef` on ChildPage**

In `src/pages/ChildPage.jsx`, change the avatar render (around line 471) from:

```jsx
        <BuddyAvatar status={uiStatus} avatarColor={settings.avatarColor} type={avatarType} />
```
to:
```jsx
        <BuddyAvatar status={uiStatus} avatarColor={settings.avatarColor} type={avatarType} audioRef={speech.audioRef} />
```

- [ ] **Step 2: Pass `audioRef` on LessonPage**

In `src/pages/LessonPage.jsx`, change the avatar render (around lines 127-131) from:

```jsx
        <BuddyAvatar
          status={uiStatus}
          avatarColor={settings.avatarColor}
          type={settings.avatarType || 'bear'}
        />
```
to:
```jsx
        <BuddyAvatar
          status={uiStatus}
          avatarColor={settings.avatarColor}
          type={settings.avatarType || 'bear'}
          audioRef={speech.audioRef}
        />
```

- [ ] **Step 3: Make picker thumbnails static (keep the big preview live)**

In `src/components/AvatarPicker.jsx`, the grid thumbnails (around line 54) should not each run an animation loop. Change:

```jsx
              <BuddyAvatar type={a.type} status="idle" avatarColor={a.color} size={56} />
```
to:
```jsx
              <BuddyAvatar type={a.type} status="idle" avatarColor={a.color} size={56} live={false} />
```

Leave the large live preview (around line 31) unchanged so it still breathes and is pokeable.

- [ ] **Step 4: Build check**

Run: `npm run build`
Expected: build succeeds.

- [ ] **Step 5: Manual verification**

Run: `npm run dev`.
Expected:
- Talk to Buddy on the child page: the mouth now tracks the actual Google-TTS voice loudness (open on loud syllables, closed in pauses). On a browser using the speechSynthesis fallback (no `/api/tts` key), the mouth still animates via the organic fallback.
- Lesson page narration drives the mouth the same way.
- The picker grid shows six still blobs (no CPU spinning on seven animated avatars); the big preview above is still animated and pokeable.
- Navigate away while Buddy is speaking → no console errors (loops/contexts clean up).

- [ ] **Step 6: Commit**

```bash
git add src/pages/ChildPage.jsx src/pages/LessonPage.jsx src/components/AvatarPicker.jsx
git commit -m "feat(avatar): wire real TTS mouth sync and static picker thumbnails

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

## Self-Review Notes

- **Spec coverage:** character/blob (Task 3) · costumes (Task 4) · idle breathing/blink/glance/bounce (Task 2+3) · listening/thinking/speaking states (Task 3+4) · audio-synced mouth + fallback (Task 1+5) · poke squish + boing + cooldown (Task 2+3) · reduced-motion + static thumbnails + cleanup (Task 2+3+5). All covered.
- **Deviation flagged:** poke audio is synthesized (Web Audio boing), not shipped mp3s — documented in Global Constraints and Task 2.
- **Type consistency:** `useMouthLevel(audioRef, isSpeaking) → getMouthLevel`; `useBuddyLife({status, live, getMouthLevel}) → {containerRef, poke}`; `Costume({type, isListening, s})`. Names match across tasks. CSS vars (`--blink`, `--pupil-x/y`, `--sx/--sy`, `--by`, `--mouth`, `--body`) are written in Task 2 and consumed in Task 3 identically.
- **No test framework:** verification is `npm run build` + manual, stated up front and per task.
