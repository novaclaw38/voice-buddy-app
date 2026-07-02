import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import styles from './LandingPage.module.css'

// Floating particle field
function Particles({ count = 36 }) {
  const particles = Array.from({ length: count }, (_, i) => ({
    id: i,
    x: Math.random() * 100,
    y: Math.random() * 100,
    size: Math.random() * 3 + 1,
    delay: Math.random() * 6,
    duration: Math.random() * 8 + 6,
  }))
  return (
    <div className={styles.particles} aria-hidden="true">
      {particles.map(p => (
        <span
          key={p.id}
          className={styles.particle}
          style={{
            left: `${p.x}%`,
            top: `${p.y}%`,
            width: `${p.size}px`,
            height: `${p.size}px`,
            animationDelay: `${p.delay}s`,
            animationDuration: `${p.duration}s`,
          }}
        />
      ))}
    </div>
  )
}

// Bear SVG (reused from auth, enhanced with glow)
function BuddyHero() {
  return (
    <div className={styles.buddyWrap}>
      <div className={styles.buddyGlow} />
      <div className={styles.buddyRing} />
      <svg viewBox="0 0 100 100" className={styles.buddySvg}>
        <circle cx="22" cy="24" r="18" fill="#7c3aed" />
        <circle cx="78" cy="24" r="18" fill="#7c3aed" />
        <circle cx="22" cy="24" r="11" fill="rgba(255,190,190,0.45)" />
        <circle cx="78" cy="24" r="11" fill="rgba(255,190,190,0.45)" />
        <circle cx="50" cy="58" r="39" fill="#7c3aed" />
        <ellipse cx="50" cy="71" rx="17" ry="12" fill="rgba(255,255,255,0.18)" />
        {/* Eyes with glow */}
        <circle cx="35" cy="50" r="9" fill="white" />
        <circle cx="37" cy="50" r="5" fill="#1e1b4b" />
        <circle className={styles.eyeGlow} cx="38" cy="48" r="2" fill="white" />
        <circle cx="65" cy="50" r="9" fill="white" />
        <circle cx="63" cy="50" r="5" fill="#1e1b4b" />
        <circle className={styles.eyeGlow} cx="64" cy="48" r="2" fill="white" />
        <ellipse cx="50" cy="63" rx="5.5" ry="4" fill="rgba(0,0,0,0.35)" />
        <path d="M 38 72 Q 50 81 62 72" stroke="rgba(255,255,255,0.7)" strokeWidth="3" fill="none" strokeLinecap="round" />
        <circle cx="24" cy="65" r="9" fill="rgba(255,140,140,0.22)" />
        <circle cx="76" cy="65" r="9" fill="rgba(255,140,140,0.22)" />
      </svg>
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

// Phone mockup for camera section
function PhoneMockup() {
  return (
    <div className={styles.phone}>
      <div className={styles.phoneScreen}>
        <div className={styles.cameraFeed}>
          <div className={styles.scanLine} />
          <div className={styles.cameraGrid}>
            {Array.from({ length: 9 }).map((_, i) => (
              <div key={i} className={styles.gridCell} />
            ))}
          </div>
          <div className={styles.cameraOverlay}>
            <span className={styles.liveTag}>● LIVE</span>
            <span className={styles.childTag}>Sam 😊</span>
          </div>
        </div>
      </div>
      <div className={styles.phoneNotch} />
    </div>
  )
}

// Chat bubble sequence
function ChatDemo() {
  const bubbles = [
    { role: 'child', text: 'Tell me a story!', delay: 0 },
    { role: 'buddy', text: 'Once upon a time, in a cloud kingdom…', delay: 0.6 },
    { role: 'child', text: 'What happens next?', delay: 1.2 },
    { role: 'buddy', text: 'A brave little dragon found a magical seed…', delay: 1.8 },
  ]
  return (
    <div className={styles.chatDemo}>
      {bubbles.map((b, i) => (
        <div
          key={i}
          className={`${styles.chatBubble} ${b.role === 'child' ? styles.chatChild : styles.chatBuddy}`}
          style={{ animationDelay: `${b.delay}s` }}
        >
          {b.role === 'buddy' && <span className={styles.chatAvatar}>🐻</span>}
          <span className={styles.chatText}>{b.text}</span>
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
  const navigate = useNavigate()
  const [navHidden, setNavHidden] = useState(false)
  const lastY = useRef(0)

  // Hide nav on scroll down, show on scroll up (rAF-throttled, one measurement per frame)
  useEffect(() => {
    let ticking = false
    const onScroll = () => {
      if (ticking) return
      ticking = true
      requestAnimationFrame(() => {
        const y = window.scrollY
        setNavHidden(y > 80 && y > lastY.current)
        lastY.current = y
        ticking = false
      })
    }
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  // 3D tilt on CTA button
  const handleTilt = (e) => {
    const btn = e.currentTarget
    const rect = btn.getBoundingClientRect()
    const x = ((e.clientX - rect.left) / rect.width - 0.5) * 14
    const y = ((e.clientY - rect.top) / rect.height - 0.5) * -14
    btn.style.transform = `perspective(600px) rotateX(${y}deg) rotateY(${x}deg) scale(1.04)`
  }
  const resetTilt = (e) => {
    e.currentTarget.style.transform = ''
  }

  return (
    <div className={styles.page}>
      {/* ── NAV ── */}
      <nav className={`${styles.nav} ${navHidden ? styles.navHidden : ''}`}>
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
            <button className={styles.navLogin} onClick={() => navigate('/login')}>Log In</button>
            <button className={styles.navCta} onClick={() => navigate('/login')}>Start Free Trial</button>
          </div>
        </div>
      </nav>

      {/* ── HERO ── */}
      <section className={styles.hero}>
        <Particles />
        <div className={styles.heroContent}>
          <div className={styles.heroBadge}>✨ 10 days free, no card needed</div>
          <h1 className={styles.heroTitle}>
            Meet <span className={styles.gradientText}>Buddy</span>
            <br />your child's AI best friend
          </h1>
          <p className={styles.heroSub}>
            An always-on companion that tells stories, teaches courses, sings songs,
            and gives parents peace of mind, all in one magical app.
          </p>
          <div className={styles.heroCtas}>
            <button
              className={styles.ctaPrimary}
              onMouseMove={handleTilt}
              onMouseLeave={resetTilt}
              onClick={() => navigate('/login')}
            >
              <span className={styles.ctaRipple} />
              Start Free Trial
            </button>
            <button className={styles.ctaGhost} onClick={() => navigate('/login')}>
              Log In →
            </button>
          </div>
          <BuddyHero />
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
              Open the parent dashboard and stream a live view of your child's screen
              in real time. Whether you're at work or in another room, you're always
              just a tap away.
            </p>
            <div className={styles.featureChips}>
              <span>📹 Live camera</span>
              <span>🔒 Signed-in parents only</span>
              <span>⚡ Real-time</span>
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
              even if you're not home. Your child hears your voice whenever they need it most.
            </p>
            <div className={styles.featureChips}>
              <span>🎙️ Voice notes</span>
              <span>💌 Instant delivery</span>
              <span>🐻 Buddy plays it back</span>
            </div>
          </div>
          <div className={styles.featureVisual}>
            <div className={styles.voiceCard}>
              <div className={styles.voiceAvatar}>👩‍👧</div>
              <div className={styles.voiceInfo}>
                <span className={styles.voiceName}>Message from Mum</span>
                <Waveform />
              </div>
              <div className={styles.playBtn}>▶</div>
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
            <span>📖 Stories</span>
            <span>🎮 Games</span>
            <span>🎵 Sing-along</span>
            <span>🧠 Quiz</span>
          </div>
        </RevealSection>

        {/* Feature 4: Courses */}
        <RevealSection className={`${styles.featureRow} ${styles.featureRowReverse}`}>
          <div className={styles.featureText}>
            <div className={styles.featureTag}>Learn Something New</div>
            <h2 className={styles.featureTitle}>Interactive courses your child will love</h2>
            <p className={styles.featureDesc}>
              Buddy guides kids through real lessons in gardening, robotics, and science
              experiments, all delivered conversationally, at their pace, with no screens
              or worksheets required.
            </p>
            <div className={styles.featureChips}>
              <span>🌱 Gardening</span>
              <span>🤖 Robotics</span>
              <span>🔬 Science</span>
              <span>More coming</span>
            </div>
          </div>
          <div className={styles.featureVisual}>
            {/* Mirrors the real CoursesPage card shape (colored header + white
                body) so this preview matches what the product actually looks like. */}
            <div className={styles.courseCards}>
              {[
                { emoji: '🌱', title: 'Gardening for Kids', color: ['#3ddc97', '#16a34a'] },
                { emoji: '🤖', title: 'Robotics Basics', color: ['#4dadf7', '#2563eb'] },
                { emoji: '🔬', title: 'Science Experiments', color: ['#ff9a3c', '#ec4899'] },
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
                    <span className={styles.courseEmoji}>{c.emoji}</span>
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
          <h2 className={styles.pricingTitle}>Start free. Upgrade when you're ready.</h2>
        </RevealSection>

        <RevealSection className={styles.pricingCards}>
          {/* Free */}
          <div className={styles.pricingCard}>
            <div className={styles.planName}>Free</div>
            <div className={styles.planPrice}>
              <span className={styles.planAmount}>R0</span>
            </div>
            <p className={styles.planDesc}>Great for getting started</p>
            <ul className={styles.planFeatures}>
              <li className={styles.yes}>✓ Chat with Buddy (10/day)</li>
              <li className={styles.yes}>✓ Story mode</li>
              <li className={styles.yes}>✓ Sing mode</li>
              <li className={styles.no}>✗ Live camera</li>
              <li className={styles.no}>✗ Parent voice messages</li>
              <li className={styles.no}>✗ All activity modes</li>
              <li className={styles.no}>✗ Courses</li>
            </ul>
            <button className={styles.planBtn} onClick={() => navigate('/login')}>
              Continue Free
            </button>
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
              <strong className={styles.trialHighlight}>First 10 days free</strong>, then
              R149/month. Cancel anytime before day 10 and you won't be charged.
            </p>
            <ul className={styles.planFeatures}>
              <li className={styles.yes}>✓ Unlimited daily messages</li>
              <li className={styles.yes}>✓ All 10 activity modes</li>
              <li className={styles.yes}>✓ Peace of mind camera</li>
              <li className={styles.yes}>✓ Parent voice messages</li>
              <li className={styles.yes}>✓ Gardening, Robotics & Science courses</li>
              <li className={styles.yes}>✓ Wake word &amp; avatar customisation</li>
              <li className={styles.yes}>✓ Priority support</li>
            </ul>
            <button
              className={`${styles.planBtn} ${styles.planBtnPro}`}
              onClick={() => navigate('/login')}
            >
              Start Free Trial →
            </button>
          </div>
        </RevealSection>
      </section>

      {/* ── FOOTER ── */}
      <footer className={styles.footer}>
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
        <p className={styles.footerTagline}>Made with ❤️ in South Africa</p>
        <p className={styles.footerLinks}>
          <button onClick={() => navigate('/login')}>Start Free Trial</button>
          <span>·</span>
          <button onClick={() => navigate('/login')}>Log In</button>
        </p>
        <p className={styles.footerCopy}>© {new Date().getFullYear()} Buddy. All rights reserved.</p>
      </footer>
    </div>
  )
}
