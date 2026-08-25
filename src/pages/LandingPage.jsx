import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { flushSync } from 'react-dom'
import { Link } from 'react-router-dom'
import BuddyAvatar from '../components/BuddyAvatar.jsx'
import SkipLink from '../components/SkipLink.jsx'
import styles from './LandingPage.module.css'
import {
  IconSparkle, IconCamera, IconLock, IconBolt, IconMic, IconMail, IconHeart,
  IconBook, IconCheck, IconX, IconPlay, IconShield,
} from '../components/icons.jsx'

// Matches the inline `window.matchMedia?.(...)` check already used in
// useBuddyLife.js — same guard style, reused here across several components.
function prefersReducedMotion() {
  return typeof window !== 'undefined' && !!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
}

const CLOUD_COLORS = ['rgba(124,58,237,0.14)', 'rgba(255,107,169,0.14)', 'rgba(77,173,247,0.12)']
const SPARK_COLOR = 'rgba(124,58,237,0.55)'

// GPU-composited hero backdrop: soft drifting cloud layers (parallax-shifted
// by scroll, read from a ref so scrolling never triggers a React re-render)
// plus a twinkling sparkle field, replacing the old 36-DOM-node particle
// field with one canvas draw call. Pauses off-screen and collapses to a
// single static frame under prefers-reduced-motion.
function CloudField({ scrollRef }) {
  const canvasRef = useRef(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return undefined

    let ctx
    try { ctx = canvas.getContext('2d') } catch { ctx = null }
    if (!ctx) return undefined // no 2D canvas support (e.g. jsdom in tests) — static CSS background still shows

    const reduced = prefersReducedMotion()
    const mobile = window.innerWidth < 700
    let width = 0
    let height = 0
    const dpr = Math.min(window.devicePixelRatio || 1, 2)

    const clouds = Array.from({ length: mobile ? 3 : 6 }, (_, i) => ({
      x: Math.random(),
      y: Math.random() * 0.6,
      r: 90 + Math.random() * 140,
      color: CLOUD_COLORS[i % CLOUD_COLORS.length],
      speed: 0.15 + Math.random() * 0.2,
      depth: 0.3 + Math.random() * 0.7,
    }))
    const sparks = Array.from({ length: mobile ? 18 : 44 }, () => ({
      x: Math.random(),
      y: Math.random(),
      r: 0.6 + Math.random() * 1.6,
      phase: Math.random() * Math.PI * 2,
      speed: 0.4 + Math.random() * 0.8,
    }))

    const resize = () => {
      const rect = canvas.getBoundingClientRect()
      width = rect.width
      height = rect.height
      canvas.width = width * dpr
      canvas.height = height * dpr
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    }
    resize()
    const ro = new ResizeObserver(resize)
    ro.observe(canvas)

    const start = performance.now()
    let running = false
    let rafId = 0

    const draw = (now) => {
      const t = (now - start) / 1000
      const scrollY = scrollRef.current || 0
      ctx.clearRect(0, 0, width, height)
      clouds.forEach((c) => {
        const driftX = c.x * width + Math.sin(t * c.speed) * 30
        const parallaxY = c.y * height - scrollY * c.depth * 0.25
        const grad = ctx.createRadialGradient(driftX, parallaxY, 0, driftX, parallaxY, c.r)
        grad.addColorStop(0, c.color)
        grad.addColorStop(1, 'rgba(0,0,0,0)')
        ctx.fillStyle = grad
        ctx.beginPath()
        ctx.arc(driftX, parallaxY, c.r, 0, Math.PI * 2)
        ctx.fill()
      })
      sparks.forEach((s) => {
        ctx.globalAlpha = 0.25 + 0.55 * (0.5 + 0.5 * Math.sin(t * s.speed + s.phase))
        ctx.fillStyle = SPARK_COLOR
        ctx.beginPath()
        ctx.arc(s.x * width, s.y * height - scrollY * 0.08, s.r, 0, Math.PI * 2)
        ctx.fill()
      })
      ctx.globalAlpha = 1
      if (running) rafId = requestAnimationFrame(draw)
    }

    const startLoop = () => {
      if (running) return
      running = true
      rafId = requestAnimationFrame(draw)
    }
    const stopLoop = () => {
      running = false
      if (rafId) cancelAnimationFrame(rafId)
      rafId = 0
    }

    if (reduced) {
      draw(performance.now()) // one static frame, no loop
    } else {
      startLoop()
    }

    const io = new IntersectionObserver(([entry]) => {
      if (reduced) return
      if (entry.isIntersecting) startLoop()
      else stopLoop()
    }, { threshold: 0 })
    io.observe(canvas)

    return () => {
      stopLoop()
      ro.disconnect()
      io.disconnect()
    }
  }, [scrollRef])

  return <canvas ref={canvasRef} className={styles.cloudField} aria-hidden="true" />
}

// Hero buddy — uses the real BuddyAvatar component so visitors see the
// actual animated character their child will play with (including the
// double-tap celebration discovery).
const HERO_BUBBLE_TEXT = 'Hi! Want to hear a story about a cloud kingdom? ✨'

function BuddyHero() {
  // BuddyAvatar reacts to a real pointerdown on its own container (the same
  // "poke" mechanic live in the app), so the separate hint button forwards
  // a synthetic pointerdown to it instead of duplicating that logic here.
  const avatarRef = useRef(null)
  const wrapRef = useRef(null)
  const audioCtxRef = useRef(null)
  const soundOnRef = useRef(false)
  const [soundOn, setSoundOn] = useState(false)
  const words = useMemo(() => HERO_BUBBLE_TEXT.split(' '), [])
  const [wordCount, setWordCount] = useState(0)

  // Word-by-word bubble reveal, mirroring the real product's karaoke-style
  // TTS highlighting rather than a plain fade-in.
  useEffect(() => {
    if (prefersReducedMotion()) { setWordCount(words.length); return undefined }
    let i = 0
    const id = setInterval(() => {
      i += 1
      setWordCount(i)
      if (soundOnRef.current) playPop()
      if (i >= words.length) clearInterval(id)
    }, 140)
    return () => clearInterval(id)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [words.length])

  const playPop = useCallback(() => {
    try {
      const AC = window.AudioContext || window.webkitAudioContext
      if (!AC) return
      if (!audioCtxRef.current) audioCtxRef.current = new AC()
      const ctx = audioCtxRef.current
      if (ctx.state === 'suspended') ctx.resume().catch(() => {})
      const t = ctx.currentTime
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      osc.type = 'sine'
      osc.frequency.setValueAtTime(700 + Math.random() * 80, t)
      gain.gain.setValueAtTime(0.0001, t)
      gain.gain.exponentialRampToValueAtTime(0.1, t + 0.01)
      gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.08)
      osc.connect(gain); gain.connect(ctx.destination)
      osc.start(t); osc.stop(t + 0.09)
    } catch { /* silent: bubble still reveals visually */ }
  }, [])

  // Muted by default — sound only ever starts from this explicit tap, never
  // on page load, per the "no sound without opt-in" rule.
  const toggleSound = () => {
    const next = !soundOnRef.current
    soundOnRef.current = next
    setSoundOn(next)
    if (next) {
      const AC = window.AudioContext || window.webkitAudioContext
      if (AC && !audioCtxRef.current) audioCtxRef.current = new AC()
      audioCtxRef.current?.resume?.().catch(() => {})
    }
  }

  // Ambient "Buddy is aware of you" magnetic tilt: reads pointer position
  // page-wide (not just while hovering the card) and eases the whole hero
  // toward it. Skipped for touch input and prefers-reduced-motion.
  useEffect(() => {
    const wrap = wrapRef.current
    const float = avatarRef.current
    if (!wrap || !float) return undefined
    if (prefersReducedMotion()) return undefined
    if (!window.matchMedia?.('(pointer: fine)').matches) return undefined

    let targetX = 0, targetY = 0, curX = 0, curY = 0, rafId = 0

    const onMove = (e) => {
      const rect = wrap.getBoundingClientRect()
      const cx = rect.left + rect.width / 2
      const cy = rect.top + rect.height / 2
      const norm = Math.min(window.innerWidth, window.innerHeight) / 2
      targetX = Math.max(-1, Math.min(1, (e.clientX - cx) / norm))
      targetY = Math.max(-1, Math.min(1, (e.clientY - cy) / norm))
    }
    const onLeave = () => { targetX = 0; targetY = 0 }
    const tick = () => {
      curX += (targetX - curX) * 0.08
      curY += (targetY - curY) * 0.08
      float.style.setProperty('--tiltX', `${curY * -6}deg`)
      float.style.setProperty('--tiltY', `${curX * 8}deg`)
      float.style.setProperty('--shiftX', `${curX * 10}px`)
      rafId = requestAnimationFrame(tick)
    }

    window.addEventListener('pointermove', onMove)
    window.addEventListener('pointerleave', onLeave)
    rafId = requestAnimationFrame(tick)
    return () => {
      cancelAnimationFrame(rafId)
      window.removeEventListener('pointermove', onMove)
      window.removeEventListener('pointerleave', onLeave)
    }
  }, [])

  return (
    <div className={styles.buddyWrap} ref={wrapRef}>
      <div className={styles.buddyGlow} />
      <div className={styles.buddyRing} />
      <div className={styles.buddyFloat} ref={avatarRef}>
        <BuddyAvatar
          status="happy"
          avatarColor="#7c3aed"
          type="bear"
          size={190}
          live={true}
        />
      </div>
      {/* Speech bubble — hints at the real product experience, not just the mascot */}
      <div className={styles.heroBubble}>
        <span className={styles.heroBubbleText} aria-hidden="true">
          {words.slice(0, wordCount).join(' ')}
          {wordCount < words.length && <span className={styles.typeCaret} />}
        </span>
        <span className={styles.srOnly}>{HERO_BUBBLE_TEXT}</span>
        <button
          type="button"
          className={styles.soundToggle}
          onClick={toggleSound}
          aria-pressed={soundOn}
          aria-label={soundOn ? "Mute Buddy's chime" : "Hear Buddy's chime as he talks"}
        >
          {soundOn ? '🔊' : '🔈'}
        </button>
      </div>
      <button
        className={styles.tapHint}
        onClick={(e) => {
          e.stopPropagation()
          avatarRef.current?.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true }))
        }}
        aria-label="Tap Buddy to see him react! He loves attention."
      >
        👆 Tap Buddy!
      </button>
    </div>
  )
}

// Animated waveform for voice section
function Waveform() {
  return (
    <svg viewBox="0 0 200 60" className={styles.waveform} aria-hidden="true">
      {[10, 25, 40, 55, 70, 85, 100, 115, 130, 145, 160, 175, 190].map((x, i) => (
        <rect
          key={i}
          x={x - 3}
          y={30 - (i % 3 === 0 ? 22 : i % 3 === 1 ? 14 : 8)}
          width="6"
          height={i % 3 === 0 ? 44 : i % 3 === 1 ? 28 : 16}
          rx="3"
          fill="rgba(168,85,247,0.7)"
          className={styles.bar}
          style={{ animationDelay: `${i * 0.12}s` }}
        />
      ))}
    </svg>
  )
}

// Phone mockup for camera section — a real screenshot of the child screen,
// framed as the live view a parent sees from the dashboard.
function PhoneMockup() {
  return (
    <div className={styles.phone}>
      <div className={styles.phoneScreen}>
        <img
          className={styles.screenShot}
          src="/screenshots/child-home.webp"
          alt="Live view of the Buddy child screen"
          loading="lazy"
          width="390"
          height="625"
        />
        <div className={styles.cameraOverlay}>
          <span className={styles.liveTag}>● LIVE</span>
          <span className={styles.childTag}>Sam</span>
        </div>
      </div>
      <div className={styles.phoneNotch} />
    </div>
  )
}

const CHAT_BUBBLES = [
  { role: 'child', text: 'Tell me a story!' },
  { role: 'buddy', text: 'Once upon a time, in a cloud kingdom…' },
  { role: 'child', text: 'What happens next?' },
  { role: 'buddy', text: 'A brave little dragon found a magical seed…' },
]

// Chat bubble sequence — typewriter reveal + a "typing…" indicator before
// each Buddy line, so the marketing preview mirrors the real conversational
// pacing instead of a static fade-in. Starts once scrolled into view.
function ChatDemo() {
  const containerRef = useRef(null)
  const [charCounts, setCharCounts] = useState(() => CHAT_BUBBLES.map(() => 0))
  const [typingSet, setTypingSet] = useState(() => new Set())

  useEffect(() => {
    const el = containerRef.current
    if (!el) return undefined

    if (prefersReducedMotion()) {
      setCharCounts(CHAT_BUBBLES.map((b) => b.text.length))
      return undefined
    }

    const timers = []
    const obs = new IntersectionObserver(([entry]) => {
      if (!entry.isIntersecting) return
      obs.unobserve(el)

      const CHAR_MS = 22, GAP_MS = 350, TYPING_MS = 500
      let cursor = 0

      CHAT_BUBBLES.forEach((bubble, i) => {
        if (bubble.role === 'buddy') {
          timers.push(setTimeout(() => {
            setTypingSet((prev) => new Set(prev).add(i))
          }, cursor))
          cursor += TYPING_MS
          timers.push(setTimeout(() => {
            setTypingSet((prev) => { const next = new Set(prev); next.delete(i); return next })
          }, cursor))
        }
        const textStart = cursor
        for (let c = 0; c <= bubble.text.length; c += 1) {
          const at = textStart + c * CHAR_MS
          timers.push(setTimeout(() => {
            setCharCounts((prev) => {
              if (prev[i] >= c) return prev
              const next = prev.slice()
              next[i] = c
              return next
            })
          }, at))
        }
        cursor = textStart + bubble.text.length * CHAR_MS + GAP_MS
      })
    }, { threshold: 0.4 })
    obs.observe(el)

    return () => { obs.disconnect(); timers.forEach(clearTimeout) }
  }, [])

  return (
    <div className={styles.chatDemo} ref={containerRef}>
      {CHAT_BUBBLES.map((b, i) => (
        <div
          key={i}
          className={`${styles.chatBubble} ${b.role === 'child' ? styles.chatChild : styles.chatBuddy}`}
          style={{ animationDelay: `${i * 0.08}s` }}
        >
          {b.role === 'buddy' && (
            <span className={styles.chatAvatar} aria-hidden="true">
              <svg viewBox="0 0 40 40" width="26" height="26">
                <circle cx="9" cy="9" r="7" fill="#7c3aed" />
                <circle cx="31" cy="9" r="7" fill="#7c3aed" />
                <circle cx="20" cy="24" r="16" fill="#7c3aed" />
                <circle cx="14" cy="21" r="4" fill="white" />
                <circle cx="26" cy="21" r="4" fill="white" />
                <circle cx="15" cy="20" r="2.2" fill="#1e1b4b" />
                <circle cx="27" cy="20" r="2.2" fill="#1e1b4b" />
                <path d="M 13 29 Q 20 34 27 29" stroke="rgba(255,255,255,0.7)" strokeWidth="1.5" fill="none" strokeLinecap="round" />
              </svg>
            </span>
          )}
          {typingSet.has(i) ? (
            <span className={`${styles.chatText} ${styles.typingDots}`} aria-hidden="true">
              <span className={styles.typingDot} />
              <span className={styles.typingDot} />
              <span className={styles.typingDot} />
            </span>
          ) : (
            <span className={styles.chatText} aria-hidden="true">
              {b.text.slice(0, charCounts[i])}
              {charCounts[i] < b.text.length && <span className={styles.typeCaret} />}
            </span>
          )}
          <span className={styles.srOnly}>{b.text}</span>
        </div>
      ))}
    </div>
  )
}

// Scroll reveal hook
function useReveal() {
  const ref = useRef(null)
  useEffect(() => {
    const el = ref.current
    if (!el) return
    const obs = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) { el.classList.add(styles.visible); obs.unobserve(el) } },
      { threshold: 0.15 }
    )
    obs.observe(el)
    return () => obs.disconnect()
  }, [])
  return ref
}

function RevealSection({ children, className = '' }) {
  const ref = useReveal()
  return <div ref={ref} className={`${styles.reveal} ${className}`}>{children}</div>
}

// Staggered spring "pop" for a list's children once scrolled into view —
// used on the pricing checkmarks so they feel like they're checking
// themselves off, not just fading in as a block.
function useStaggerPop() {
  const ref = useRef(null)
  useEffect(() => {
    const el = ref.current
    if (!el || prefersReducedMotion()) return undefined
    const children = Array.from(el.children)
    if (!children.length || typeof children[0].animate !== 'function') return undefined
    const obs = new IntersectionObserver(([entry]) => {
      if (!entry.isIntersecting) return
      obs.unobserve(el)
      children.forEach((child, i) => {
        child.animate(
          [
            { opacity: 0, transform: 'scale(0.82) translateY(8px)' },
            { opacity: 1, transform: 'scale(1.06) translateY(0)', offset: 0.7 },
            { opacity: 1, transform: 'scale(1) translateY(0)' },
          ],
          { duration: 440, delay: i * 60, easing: 'cubic-bezier(0.34, 1.56, 0.64, 1)', fill: 'both' }
        )
      })
    }, { threshold: 0.35 })
    obs.observe(el)
    return () => obs.disconnect()
  }, [])
  return ref
}

// Scrolling ticker
function Ticker() {
  const items = [
    '10 day free trial', 'No credit card needed', 'Cancel anytime',
    'Peace of mind camera', 'Parent voice messages', 'AI storytelling',
    'Kids courses', 'Safe & child-friendly', 'Made in South Africa 🇿🇦',
  ]
  const doubled = [...items, ...items]
  return (
    <div className={styles.tickerWrap} aria-hidden="true">
      <div className={styles.ticker}>
        {doubled.map((item, i) => (
          <span key={i} className={styles.tickerItem}>
            {item} <span className={styles.tickerDot}>✦</span>
          </span>
        ))}
      </div>
    </div>
  )
}

export default function LandingPage() {
  const [navHidden, setNavHidden] = useState(false)
  const [pastHero, setPastHero] = useState(false)
  const lastY = useRef(0)
  const pageRef = useRef(null)
  // Read by CloudField's rAF draw loop for scroll parallax — a ref, not
  // state, so scrolling never triggers a React re-render on top of the
  // canvas's own animation loop.
  const scrollYRef = useRef(0)
  const navHiddenRef = useRef(false)
  const freeFeaturesRef = useStaggerPop()
  const proFeaturesRef = useStaggerPop()

  // Hide nav on scroll down, show on scroll up (rAF-throttled, one measurement per frame).
  // Also tracks whether we've scrolled past the hero, to show a sticky mobile
  // CTA bar — on a long single-page scroll, the only "Start Free Trial"
  // button shouldn't require scrolling all the way back to the top.
  // NOTE: the page scrolls inside .page (body is overflow:hidden), so the
  // listener must attach to that element — window.scrollY never changes here.
  useEffect(() => {
    const el = pageRef.current
    if (!el) return undefined
    let ticking = false
    const onScroll = () => {
      if (ticking) return
      ticking = true
      requestAnimationFrame(() => {
        const y = el.scrollTop
        scrollYRef.current = y
        const nextHidden = y > 80 && y > lastY.current
        if (nextHidden !== navHiddenRef.current) {
          navHiddenRef.current = nextHidden
          // The nav bar carries view-transition-name: site-nav (see CSS), so
          // supporting browsers get a native cross-fade/morph on this state
          // flip instead of the plain CSS transform fallback below.
          if (typeof document.startViewTransition === 'function' && !prefersReducedMotion()) {
            document.startViewTransition(() => flushSync(() => setNavHidden(nextHidden)))
          } else {
            setNavHidden(nextHidden)
          }
        }
        setPastHero(y > window.innerHeight * 0.6)
        lastY.current = y
        ticking = false
      })
    }
    el.addEventListener('scroll', onScroll, { passive: true })
    return () => el.removeEventListener('scroll', onScroll)
  }, [])

  return (
    <>
      <SkipLink />
      <div className={styles.page} ref={pageRef}>
      {/* ── NAV ── */}
      {/* inert (not just the transform) keeps the off-screen nav's buttons out of
          the tab order and accessibility tree while it's visually hidden. */}
      <nav className={`${styles.nav} ${navHidden ? styles.navHidden : ''}`} inert={navHidden ? '' : undefined}>
        <div className={styles.navInner}>
          <div className={styles.logo}>
            <svg viewBox="0 0 40 40" width="36" height="36">
              <circle cx="9" cy="9" r="7" fill="#7c3aed" />
              <circle cx="31" cy="9" r="7" fill="#7c3aed" />
              <circle cx="20" cy="24" r="16" fill="#7c3aed" />
              <circle cx="14" cy="21" r="4" fill="white" />
              <circle cx="26" cy="21" r="4" fill="white" />
              <circle cx="15" cy="20" r="2.2" fill="#1e1b4b" />
              <circle cx="27" cy="20" r="2.2" fill="#1e1b4b" />
              <path d="M 13 29 Q 20 34 27 29" stroke="rgba(255,255,255,0.7)" strokeWidth="1.5" fill="none" strokeLinecap="round" />
            </svg>
            <span className={styles.logoText}>Buddy</span>
          </div>
          <div className={styles.navActions}>
            <Link className={styles.navLogin} to="/login">Log In</Link>
            <Link className={styles.navCta} to="/login" state={{ mode: 'signup', plan: 'pro' }}>Start Free Trial</Link>
          </div>
        </div>
      </nav>

      {/* ── HERO ── */}
      <main id="main">
      <section className={styles.hero}>
        <CloudField scrollRef={scrollYRef} />
        <div className={styles.heroContent}>
          <div className={styles.heroText}>
            <h1 className={styles.heroTitle}>
              Meet <span className={styles.gradientText}>Buddy</span>
              <br />
              your child&rsquo;s AI best friend
            </h1>
            <p className={styles.heroSub}>
              <span className={styles.heroSubLede}>An always-on companion that chats and teaches courses,</span>{' '}
              and gives parents peace of mind, all in one magical app.
            </p>
            <div className={styles.heroCtas}>
              <Link
                className={styles.ctaPrimary}
                to="/login"
                state={{ mode: 'signup', plan: 'pro' }}
              >
                <span className={styles.ctaRipple} />
                Start Free Trial
              </Link>
              <Link to="/login" className={styles.heroLoginLink}>
                Already have an account? Log in
              </Link>
            </div>
          </div>
          <div className={styles.heroBuddy}>
            <BuddyHero />
          </div>
        </div>
      </section>

      {/* ── TICKER ── */}
      <Ticker />

      {/* ── FEATURES ── */}
      <section className={styles.features}>

        {/* Feature 1: Camera */}
        <RevealSection className={styles.featureRow}>
          <div className={styles.featureVisual}>
            <PhoneMockup />
          </div>
          <div className={styles.featureText}>
            <div className={styles.featureTag}>Peace of Mind</div>
            <h2 className={styles.featureTitle}>See your child, anytime</h2>
            <p className={styles.featureDesc}>
              Open the parent dashboard and stream a live view of your child&rsquo;s screen
              in real time. Whether you&rsquo;re at work or in another room, you&rsquo;re always
              just a tap away.
            </p>
            <div className={styles.featureChips}>
              <span><IconCamera size={14} /> Peace of mind camera</span>
              <span><IconLock size={14} /> Signed-in parents only</span>
              <span><IconBolt size={14} /> Real-time</span>
            </div>
          </div>
        </RevealSection>

        {/* Feature 2: Voice messages */}
        <RevealSection className={`${styles.featureRow} ${styles.featureRowReverse}`}>
          <div className={styles.featureText}>
            <div className={styles.featureTag}>Stay Connected</div>
            <h2 className={styles.featureTitle}>Leave voice messages for your child</h2>
            <p className={styles.featureDesc}>
              Record a voice note from the parent dashboard. Buddy delivers it instantly,
              even if you&rsquo;re not home. Your child hears your voice whenever they need it most.
            </p>
            <div className={styles.featureChips}>
              <span><IconMic size={14} /> Voice notes</span>
              <span><IconMail size={14} /> Instant delivery</span>
              <span><IconHeart size={14} /> Buddy plays it back</span>
            </div>
          </div>
          <div className={styles.featureVisual}>
            <div className={styles.voiceCard}>
              <div className={styles.voiceAvatar}><IconHeart size={22} filled /></div>
              <div className={styles.voiceInfo}>
                <span className={styles.voiceName}>Message from Mum</span>
                <Waveform />
              </div>
              <div className={styles.playBtn}><IconPlay size={16} /></div>
            </div>
          </div>
        </RevealSection>

        {/* Feature 3: AI Chat - full-width showcase, breaks the left/right split rhythm */}
        <RevealSection className={styles.featureShowcase}>
          <div className={styles.featureTag}>AI Companion</div>
          <h2 className={styles.featureTitle}>Buddy talks, plays and imagines with your child</h2>
          <p className={styles.featureDesc}>
            From bedtime stories to quiz games, jokes to feelings check-ins, Buddy adapts
            to whatever your child needs. Fully child-safe, always kind.
          </p>
          <div className={styles.showcaseChat}>
            <ChatDemo />
          </div>
          <div className={styles.featureChips}>
            <span><IconBook size={14} /> Chat</span>
            <span><IconSparkle size={14} /> Playful</span>
            <span><IconShield size={14} /> Child-safe</span>
          </div>
        </RevealSection>

        {/* Feature 4: Courses */}
        <RevealSection className={`${styles.featureRow} ${styles.featureRowReverse}`}>
          <div className={styles.featureText}>
            <div className={styles.featureTag}>Learn Something New</div>
            <h2 className={styles.featureTitle}>Interactive courses your child will love</h2>
            <p className={styles.featureDesc}>
              Buddy guides kids through real lessons in gardening, robotics, science,
              cooking, animals, and space, all delivered conversationally, at their pace,
              with no screens or worksheets required.
            </p>
            <div className={styles.featureChips}>
              <span>Gardening</span>
              <span>Robotics</span>
              <span>Science</span>
              <span>More coming</span>
            </div>
          </div>
          <div className={styles.featureVisual}>
            {/* Mirrors the real CoursesPage card shape (colored header + white
                body) so this preview matches what the product actually looks like. */}
            <div className={styles.courseCards}>
              {[
                { id: 'gardening', title: 'Gardening for Kids', color: ['#3ddc97', '#16a34a'] },
                { id: 'robotics', title: 'Robotics Basics', color: ['#4dadf7', '#2563eb'] },
                { id: 'science', title: 'Science Experiments', color: ['#ff9a3c', '#ec4899'] },
              ].map((c, i) => (
                <div
                  key={i}
                  className={styles.courseCard}
                  style={{ animationDelay: `${i * 0.15}s` }}
                >
                  <div
                    className={styles.courseCardHeader}
                    style={{ background: `linear-gradient(135deg, ${c.color[0]}, ${c.color[1]})` }}
                  >
                    <img
                      className={styles.courseCardCover}
                      src={`/courses/${c.id}.webp`}
                      alt=""
                      loading="lazy"
                      width="960"
                      height="549"
                    />
                  </div>
                  <div className={styles.courseCardBody}>
                    <span className={styles.courseTitle}>{c.title}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </RevealSection>

      </section>

      {/* ── PRICING ── */}
      <section className={styles.pricing}>
        <RevealSection>
          <div className={styles.pricingLabel}>Simple Pricing</div>
          <h2 className={styles.pricingTitle}>Start free. Upgrade when you&rsquo;re ready.</h2>
        </RevealSection>

        <RevealSection className={styles.pricingCards}>
          {/* Free */}
          <div className={styles.pricingCard}>
            <div className={styles.planName}>Free</div>
            <div className={styles.planPrice}>
              <span className={styles.planAmount}>R0</span>
            </div>
            <p className={styles.planDesc}>Great for getting started</p>
            <ul className={styles.planFeatures} ref={freeFeaturesRef}>
              <li className={styles.yes}><IconCheck size={14} /> Chat with Buddy (10/day)</li>
              <li className={styles.no}><IconX size={14} /> Peace of mind camera</li>
              <li className={styles.no}><IconX size={14} /> Parent voice messages</li>
              <li className={styles.no}><IconX size={14} /> Courses &amp; lessons</li>
              <li className={styles.no}><IconX size={14} /> Progress tracking</li>
            </ul>
            <Link className={styles.planBtn} to="/login" state={{ mode: 'signup', plan: 'free' }}>
              Continue Free
            </Link>
          </div>

          {/* Pro */}
          <div className={`${styles.pricingCard} ${styles.pricingCardPro}`}>
            <div className={styles.auroraRing} />
            <div className={styles.popularBadge}>Most Popular</div>
            <div className={styles.planName}>Pro</div>
            <div className={styles.planPrice}>
              <span className={styles.planAmount}>R149</span>
              <span className={styles.planPer}>/month</span>
            </div>
            <p className={styles.planDesc}>
              <strong className={styles.trialHighlight}>First 10 days free — no card needed.</strong>{' '}
              We&rsquo;ll ask for payment details on day 10. Then R149/month, cancel anytime.
            </p>
            <ul className={styles.planFeatures} ref={proFeaturesRef}>
              <li className={styles.yes}><IconCheck size={14} /> Unlimited daily messages</li>
              <li className={styles.yes}><IconCheck size={14} /> All 6 courses — gardening, robotics, science &amp; more</li>
              <li className={styles.yes}><IconCheck size={14} /> Progress &amp; mastery tracking</li>
              <li className={styles.yes}><IconCheck size={14} /> Peace of mind camera</li>
              <li className={styles.yes}><IconCheck size={14} /> Parent voice messages</li>
              <li className={styles.yes}><IconCheck size={14} /> Avatar &amp; costume customisation</li>
              <li className={styles.yes}><IconCheck size={14} /> Priority support</li>
            </ul>
            <Link
              className={`${styles.planBtn} ${styles.planBtnPro}`}
              to="/login"
              state={{ mode: 'signup', plan: 'pro' }}
            >
              Start Free Trial
            </Link>
          </div>
        </RevealSection>
      </section>

      {/* ── FOOTER ── */}
      <footer className={styles.footer}>
        <div className={styles.footerTop}>
          <div className={styles.footerBrand}>
            <div className={styles.footerLogo}>
              <svg viewBox="0 0 40 40" width="28" height="28">
                <circle cx="9" cy="9" r="7" fill="#7c3aed" />
                <circle cx="31" cy="9" r="7" fill="#7c3aed" />
                <circle cx="20" cy="24" r="16" fill="#7c3aed" />
                <circle cx="14" cy="21" r="4" fill="white" />
                <circle cx="26" cy="21" r="4" fill="white" />
              </svg>
              <span>Buddy</span>
            </div>
            <p className={styles.footerTagline}>
              Your child&rsquo;s AI best friend. Made with ❤️ in South Africa.
            </p>
            <div className={styles.paymentLogos} aria-label="Accepted payment methods via PayFast">
              <img src="/payment-logos/visa.svg" alt="Visa" width="63" height="21" loading="lazy" />
              <img src="/payment-logos/mastercard.svg" alt="Mastercard" width="34" height="21" loading="lazy" />
              <img src="/payment-logos/instant-eft.svg" alt="Instant EFT" width="90" height="30" loading="lazy" />
              <img src="/payment-logos/snapscan.svg" alt="SnapScan" width="90" height="23" loading="lazy" />
            </div>
          </div>

          <div className={styles.footerCol}>
            <span className={styles.footerColTitle}>Product</span>
            <Link to="/login" state={{ mode: 'signup', plan: 'pro' }}>Start Free Trial</Link>
            <Link to="/login">Log In</Link>
          </div>

          <div className={styles.footerCol}>
            <span className={styles.footerColTitle}>Legal</span>
            <Link to="/terms">Terms of Service</Link>
            <Link to="/privacy">Privacy Policy</Link>
            <Link to="/refunds">Refund &amp; Cancellation</Link>
            <Link to="/cookies">Cookie Policy</Link>
            <Link to="/data-deletion">Data Deletion</Link>
          </div>
        </div>

        <div className={styles.footerBottom}>
          <p className={styles.footerCopy}>© {new Date().getFullYear()} Buddy. All rights reserved.</p>
        </div>
      </footer>

      {/* Mobile-only sticky CTA — on a long phone-scroll, the signup button
          shouldn't require scrolling back to the top. */}
      <div className={`${styles.stickyCta} ${pastHero ? styles.stickyCtaVisible : ''}`} inert={pastHero ? undefined : ''}>
        <Link className={styles.stickyCtaBtn} to="/login" state={{ mode: 'signup', plan: 'pro' }} tabIndex={pastHero ? undefined : -1}>
          Start Free Trial
        </Link>
      </div>
      </main>
    </div>
    </>
  )
}
