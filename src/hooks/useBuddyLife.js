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
    // sway (continuous idle weight-shift) + spontaneous spin
    sway: 0,
    spinning: false, spinStart: 0, spinDeg: 0, nextSpinAt: 0,
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
    el.style.setProperty('--sway', '0px')
    el.style.setProperty('--spin', '0deg')
    el.style.setProperty('--mouth', '0')
    el.style.setProperty('--shadow-scale', '1')
  }, [])

  useEffect(() => {
    if (!live) { writeStatic(); return }

    const st = S.current
    const now = performance.now()
    st.last = now
    st.nextBlinkAt  = now + 2000 + Math.random() * 3000
    st.nextGlanceAt = now + 3000 + Math.random() * 4000
    st.nextBounceAt = now + 10000 + Math.random() * 5000
    st.nextSpinAt   = now + 14000 + Math.random() * 10000

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

      // ---- Sway (continuous side-to-side weight shift, idle only) ----
      const swayTarget = (status === 'idle' && !reduced) ? Math.sin(t / 1400) * 6 : 0
      st.sway += (swayTarget - st.sway) * Math.min(1, dt * 3)

      // ---- Spontaneous spin (idle only, not reduced) ----
      if (status === 'idle' && !reduced && !st.spinning && t >= st.nextSpinAt) {
        st.spinning = true
        st.spinStart = t
        st.nextSpinAt = t + 18000 + Math.random() * 12000
      }
      if (st.spinning) {
        const dur = 700
        const elapsed = t - st.spinStart
        if (elapsed >= dur) {
          st.spinning = false
          st.spinDeg = 0
        } else {
          const p = elapsed / dur
          const eased = p < 0.5 ? 4 * p * p * p : 1 - Math.pow(-2 * p + 2, 3) / 2
          st.spinDeg = eased * 360
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
      el.style.setProperty('--sway', st.sway.toFixed(2) + 'px')
      el.style.setProperty('--spin', st.spinDeg.toFixed(1) + 'deg')
      el.style.setProperty('--mouth', st.mouth.toFixed(3))
      // Ground shadow shrinks as Buddy rises during a bounce (st.by goes
      // negative while airborne), clamped so it never vanishes entirely.
      const shadowScale = Math.max(0.6, 1 + st.by / 60)
      el.style.setProperty('--shadow-scale', shadowScale.toFixed(3))
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
