import { useState, useEffect, useRef } from 'react'
import { Link } from 'react-router-dom'
import SkipLink from '../components/SkipLink.jsx'
import { IconArrowRight, IconCheck } from '../components/icons.jsx'
import styles from './TacticalLandingPage.module.css'

/**
 * TacticalLandingPage — Buddy Tactical Academy landing page.
 *
 * Design: docs/reference/PULSE-TRAINING-ACADEMY.md +
 *         "Buddy Tactical Academy Master Landing Page Blueprint.txt" +
 *         "Doc 4: Detailed Copy & Taglines.txt"
 *
 * Theme: Command Black (#0A0A0B), Tactical Teal (#00F5FF), Alert Orange (#FF8A00),
 *        JetBrains Mono for data/HUD, Inter for headlines.
 */

// 5 Wings — the core curriculum (Doc 4 §3 + Master Blueprint §3)
const WINGS = [
  {
    id: 'robotics',
    title: 'ROBOTICS WING',
    tagline: 'Build the Brains',
    description: 'From logic gates to autonomous command, train as an engineer.',
    emoji: '🤖',
  },
  {
    id: 'beast-intel',
    title: 'BEAST INTELLIGENCE',
    tagline: 'Decode the Wild',
    description: "Study nature's most advanced specialists and their bio-tech secrets.",
    emoji: '🦁',
  },
  {
    id: 'field-rations',
    title: 'FIELD RATIONS OPS',
    tagline: 'Fuel the Mission',
    description: 'Master the chemistry of cooking and the power of nutrition as fuel.',
    emoji: '🍳',
  },
  {
    id: 'env-recon',
    title: 'ENVIRONMENTAL RECON',
    tagline: 'Map the Sector',
    description: 'Sharpen observation, navigation, and weather intelligence near home.',
    emoji: '🧭',
  },
  {
    id: 'botany-ops',
    title: 'BOTANY OPS',
    tagline: 'Grow the Future',
    description: 'Treat gardening as a high-tech sustainment project in resource generation.',
    emoji: '🌱',
  },
]

// Scrolling ticker (Master Blueprint §5: "Live Count")
const TICKER_ITEMS = [
  '5,000+ JUNIOR COMMANDERS',
  '6-MONTH SKILL TREE',
  'R149/MONTH',
  '10-DAY FREE TRIAL',
  'NO CARD NEEDED',
  'SOUTH AFRICAN BUILT',
]

// Price comparison widget (Master Blueprint §4D)
const PRICING_COMPARISON = [
  {
    label: 'PRIVATE TUTORING',
    price: 'R1,200+/mo',
    desc: '1 hour a week. High cost. Inconvenient.',
    dim: true,
  },
  {
    label: 'BUDDY ACADEMY',
    price: 'R149/mo',
    desc: '24/7 Professional Mentorship. Structured Curricula. Sunday Storybooks.',
    highlight: true,
  },
  {
    label: 'YOUTUBE / GAMES',
    price: 'R0 / R150+',
    desc: 'Mindless loops. Passive learning. Zero reporting.',
    dim: true,
  },
]

const STORYBOOK_PREVIEW = `SUBJECT: Bio-Analyst [Name] // Intelligence Report #1

The Narrative: "This week, the Analyst
successfully decrypted nature's "Ghost Protocol."
By identifying camouflage techniques in their
local environment, they've demonstrated
advanced pattern recognition.

SKILL MASTERY:
Visual Analysis: 90%
Patience: HIGH

NEXT MISSION:
Sonic Sonar (Auditory Mapping)

Parent Prompt:
"Ask the Analyst: How does a
chameleon 'disappear'?"

═════════════════════`

// Dossier sample report content
const DOSSIER_CONTENT = `╔══════════════════════════════════════╗
║  BUDDY TACTICAL ACADEMY              ║
║  AFTER-ACTION REPORT (AAR)            ║
║  WEEK OF: ${new Date().toLocaleDateString('en-ZA', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })} ║
╚══════════════════════════════════════╝

SUBJECT: Specialist [Name] // Rank: Recruit Grade II
MISSION: Operation Iron Blueprint — Month 1

COMPLETION STATUS: ████████░░ 80%

SKILLS MASTERED:
• Logic Gates: Binary communication protocols
• Sensors: Ultrasonic echo-location theory
• Electronics: Voltage vs. Current fundamentals

PARENT CHALLENGE COMPLETED:
"The Human Algorithm" — Successfully
programmed a sandwich-making routine with
100% instruction precision.

COMMANDER'S NOTES:
Outstanding protocol adherence. Ready for
promotion to Specialist upon completion of
"Operation Sensory Array."

NEXT BRIEFING: Sunday 6:00 PM
═══════════════════════════════════════
`

/**
 * TacticalLandingPage — the Buddy Tactical Academy landing page.
 * Preview route: /tactical-landing (dev-only). Swap to "/" once approved.
 */
export default function TacticalLandingPage() {
  const [scanComplete, setScanComplete] = useState(false)
  const [showDossier, setShowDossier] = useState(false)
  const pageRef = useRef(null)

  // Scanline wipe on mount (Doc 1: "First Command Script")
  useEffect(() => {
    const timer = setTimeout(() => setScanComplete(true), 1500)
    return () => clearTimeout(timer)
  }, [])

  // Live count ticker — increment randomly (Master Blueprint §5)
  const [liveCount, setLiveCount] = useState(5287)
  useEffect(() => {
    const interval = setInterval(() => {
      setLiveCount((prev) => prev + Math.floor(Math.random() * 10))
    }, 3000)
    return () => clearInterval(interval)
  }, [])

  // Floating tactical elements (background)
  const floatingItems = [
    'DEPLOYMENT_MODE: ACTIVE',
    'SECTOR: HOME_BASE',
    'ENCRYPTION: AES_256',
    'RANK_UP_PATHWAY: UNLOCKED',
  ]

  return (
    <>
      <SkipLink />
      {/* Scanline wipe overlay — triggers once on page load */}
      {!scanComplete && <div className={styles.scanline} />}

      <div className={`${styles.page} tactical-landing`} ref={pageRef}>
        {/* Floating tactical elements in hero background */}
        <div className={styles.floatingElements}>
          {floatingItems.map((item, i) => (
            <div
              key={i}
              className={styles.floatingElement}
              style={{
                top: `${20 + i * 15}%`,
                left: `${10 + (i % 2) * 80}%`,
                animationDelay: `${i * 0.5}s`,
              }}
            >
              {item}
            </div>
          ))}
        </div>

        <div className={styles.content}>
          {/* ── NAV ── */}
          <nav className={styles.nav}>
            <div className={styles.logoWrap}>
              <span className={styles.logoTactical}>⚙</span>
              <span className={styles.logo}>Buddy Tactical Academy</span>
            </div>
            <Link
              className={styles.navCta}
              to="/login"
              state={{ mode: 'signup', plan: 'pro' }}
            >
              ENLIST NOW
            </Link>
          </nav>

          {/* ── HERO ── */}
          <main id="main">
            <section className={styles.hero}>
              <div className={styles.heroContent}>
                <div className={styles.heroBadge}>SECTOR_AUTH_REQUIRED</div>
                <h1 className={styles.heroTitle}>
                  Give Your Child the{' '}
                  <span className={styles.teal}>Command Center</span>.
                </h1>
                <p className={styles.heroSub}>
                  Buddy isn't just an app — it's an elite Tactical Academy that turns screen time
                  into high-stakes learning. From Robotics to Beast Intelligence, Buddy is the
                  zero-guilt mentor your child deserves.
                </p>
                <div className={styles.heroCtas}>
                  <Link
                    className={styles.ctaPrimary}
                    to="/login"
                    state={{ mode: 'signup', plan: 'pro' }}
                  >
                    ENLIST NOW — R149/Mo
                  </Link>
                  <a href="#how-it-works" className={styles.ctaSecondary}>
                    HOW THE ACADEMY WORKS
                  </a>
                </div>
              </div>
            </section>

            {/* ── TICKER ── */}
            <div className={styles.tickerWrap}>
              <div className={styles.ticker}>
                {TICKER_ITEMS.map((item, i) => (
                  <span key={i} className={styles.tickerItem}>
                    {item}
                    <span className={styles.tickerDot}>⚡</span>
                  </span>
                ))}
                <span className={styles.tickerItem}>
                  NEW MISSIONS COMPLETED: {liveCount} <span className={styles.tickerDot}>⚡</span>
                  <span className={styles.illustrativeLabel}>(demo data)</span>
                </span>
              </div>
            </div>

            {/* ── MINDLESS vs BUDDY ── */}
            <section className={styles.contrastSection} id="how-it-works">
              <div className={styles.contrastGrid}>
                {/* The Old Way */}
                <div className={`${styles.contrastCard} ${styles.old}`}>
                  <div className={styles.contrastCardHeader}>
                    <span className={styles.contrastIcon}>💤</span>
                    <h3 className={styles.contrastTitle}>THE OLD WAY</h3>
                  </div>
                  <ul className={styles.contrastList}>
                    <li className={styles.contrastItem}>Mindless Loops: Endless scrolling that dulls the senses.</li>
                    <li className={styles.contrastItem}>Zero Impact: Hours spent watching other people do things.</li>
                    <li className={styles.contrastItem}>Parent Guilt: The feeling of "plugging them in" for peace.</li>
                  </ul>
                </div>

                {/* The Buddy Way */}
                <div className={`${styles.contrastCard} ${styles.new}`}>
                  <div className={styles.contrastCardHeader}>
                    <span className={styles.contrastIcon}>⚡</span>
                    <h3 className={styles.contrastTitle}>THE BUDDY WAY</h3>
                  </div>
                  <ul className={styles.contrastList}>
                    <li className={styles.contrastItem}>Active Field Ops: Missions that require real-world action.</li>
                    <li className={styles.contrastItem}>Skill Mastery: 6-month structured curricula by experts.</li>
                    <li className={styles.contrastItem}>Zero Guilt: Give them a mentor, not just a screen.</li>
                  </ul>
                </div>
              </div>
            </section>

            {/* ── THE 5 WINGS ── */}
            <section className={styles.wingsSection}>
              <h2 className={styles.wingsTitle}>THE FIVE WINGS</h2>
              <p className={styles.wingsSub}>Five specialization tracks. One elite curriculum path.</p>
              <div className={styles.wingsGrid}>
                {WINGS.map((wing) => (
                  <div key={wing.id} className={styles.missionCard}>
                    <div className={styles.missionCardHeader}>
                      <span className={styles.missionEmoji}>{wing.emoji}</span>
                      <h3 className={styles.missionTitle}>{wing.title}</h3>
                      <span className={styles.missionTag}>SECTOR_AUTH_REQUIRED</span>
                    </div>
                    <p className={styles.missionTagline}>{wing.tagline}</p>
                    <p className={styles.missionDesc}>{wing.description}</p>
                    <Link
                      className={styles.missionBtn}
                      to={`/login?plan=pro#${wing.id}`}
                      state={{ mode: 'signup', plan: 'pro' }}
                    >
                      <span className={styles.missionBtnText}>ACCESS BRIEFING</span>
                      <IconArrowRight size={14} />
                    </Link>
                  </div>
                ))}
              </div>
            </section>

            {/* ── PARENT INTELLIGENCE FEED ── */}
            <section className={styles.intelSection} id="intel-section">
              <div className={styles.intelContent}>
                <h2 className={styles.intelTitle}>PARENT INTELLIGENCE FEED</h2>
                <p className={styles.intelBody}>
                  Every Sunday at 6:00 PM, a "Mission Debrief" (AAR) arrives via WhatsApp.
                  No more wondering what they're doing. See their skill growth, tactical
                  decisions, and the "Memory Gifts" they've created just for you.
                </p>
                <p className={styles.intelTagline}>Intel you can be proud of.</p>
                <div className={styles.intelPreview}>
                  <div className={styles.phoneMockup}>
                    <div className={styles.phoneScreen}>
                      <div className={styles.phoneContent}>
                        <div className={styles.phoneHeader}>
                          <span className={styles.phoneStatus}>● LIVE</span>
                          <span className={styles.phoneLabel}>Intel Report</span>
                        </div>
                        <pre className={styles.phoneText}>{STORYBOOK_PREVIEW}</pre>
                        <div className={styles.scanlineOverlay} />
                      </div>
                    </div>
                  </div>
                  <button className={styles.sampleBtn} onClick={() => setShowDossier(true)}>
                    GENERATE SAMPLE REPORT
                  </button>
                </div>
              </div>
            </section>

            {/* ── Interactive Dossier Modal ── */}
            {showDossier && (
              <div
                className={styles.dossierOverlay}
                role="dialog"
                aria-modal="true"
                aria-label="Sample Mission Debrief"
              >
                <div className={styles.dossierCard}>
                  <button
                    className={styles.dossierClose}
                    onClick={() => setShowDossier(false)}
                    aria-label="Close sample report"
                  >
                    ×
                  </button>
                  <h3 className={styles.dossierTitle}>AFTER-ACTION REPORT (AAR) — SAMPLE</h3>
                  <pre className={styles.dossierContent}>{DOSSIER_CONTENT}</pre>
                  <Link
                    className={styles.dossierCta}
                    to="/login"
                    state={{ mode: 'signup', plan: 'pro' }}
                    onClick={() => setShowDossier(false)}
                  >
                    VIEW FULL COMMANDER LOG IN DASHBOARD
                  </Link>
                </div>
              </div>
            )}

            {/* ── PRICE COMPARISON WIDGET ── */}
            <section className={styles.pricing}>
              <div className={styles.comparisonWrap}>
                <h2 className={styles.comparisonTitle}>THE INVESTMENT</h2>
                <p className={styles.comparisonSub}>
                  Compare true elite mentorship against alternatives.
                </p>
                <div className={styles.comparisonGrid}>
                  {PRICING_COMPARISON.map((plan) => (
                    <div
                      key={plan.label}
                      className={[
                        styles.comparisonCard,
                        plan.dim ? styles.dim : '',
                        plan.highlight ? styles.highlighted : '',
                      ].join(' ')}
                    >
                      <h3>{plan.label}</h3>
                      <div className={styles.price}>{plan.price}</div>
                      <p>{plan.desc}</p>
                      {plan.highlight && (
                        <Link
                          className={styles.comparisonCta}
                          to="/login"
                          state={{ mode: 'signup', plan: 'pro' }}
                        >
                          ENLIST NOW
                        </Link>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </section>

            {/* ── PRICING BOX ── */}
            <div className={styles.pricingBox}>
              <div className={styles.pricingHeader}>
                <span className={styles.pricingTag}>ELITE ACADEMY</span>
                <h2 className={styles.pricingTitle}>UNLOCK THE FULL SPECIALIST PATH</h2>
              </div>
              <div className={styles.pricingPrice}>
                <span className={styles.pricingBracket}>[</span>
                <span className={styles.pricingAmount}>R149</span>
                <span className={styles.pricingPeriod}>/month</span>
                <span className={styles.pricingBracket}>]</span>
              </div>
              <p className={styles.pricingDesc}>
                For less than the price of a weekend takeaway, you get 24/7 access
                to the Academy, the Sunday Storybook, and the elite 6-month curriculum.
              </p>
              <ul className={styles.pricingFeatures}>
                <li><IconCheck size={16} /> 5 Specialization Wings</li>
                <li><IconCheck size={16} /> Weekly Mission Debriefs (AAR)</li>
                <li><IconCheck size={16} /> Unlimited Missions &amp; Gear Up</li>
                <li><IconCheck size={16} /> Priority Skill Coaching</li>
                <li><IconCheck size={16} /> Peace of Mind Camera</li>
                <li><IconCheck size={16} /> First 10 Days Free — No Card Needed</li>
              </ul>
              <Link
                className={styles.ctaEnlist}
                to="/login"
                state={{ mode: 'signup', plan: 'pro' }}
              >
                ENLIST NOW — START FREE TRIAL
              </Link>
            </div>

            {/* ── RANK UP CTA ── */}
            <section className={styles.rankUp}>
              <h2 className={styles.rankUpTitle}>Stop the Scroll. Start the Mission.</h2>
              <p className={styles.rankUpSub}>Enlist today. Your first 3 missions are free.</p>
              <p className={styles.rankUpText}>
                Ranking up to "Specialist" starts at R149/mo.
              </p>
              <Link
                className={styles.ctaAuthorize}
                to="/login"
                state={{ mode: 'signup', plan: 'pro' }}
              >
                AUTHORIZE ENLISTMENT
              </Link>
            </section>

            {/* ── TRUST BAR ── */}
            <section className={styles.trustSection}>
              <p className={styles.trustText}>
                Join 5,000+ Junior Commanders in South Africa who have already ranked up.
              </p>
              <div className={styles.trustLinks}>
                <Link to="/privacy">Privacy Policy (Safe &amp; Secure)</Link>
                <span className={styles.trustDivider}>|</span>
                <Link to="/terms">Mission Schedule</Link>
                <span className={styles.trustDivider}>|</span>
                <Link to="/contact">Contact Command</Link>
              </div>
            </section>
          </main>

          {/* ── FOOTER ── */}
          <footer className={styles.footer}>
            <div className={styles.footerInner}>
              <div className={styles.footerLogo}>
                <span className={styles.logoTactical}>⚙</span>
                <span>BUDDY TACTICAL ACADEMY</span>
              </div>
              <p className={styles.footerCopy}>
                © {new Date().getFullYear()} Buddy Tactical Academy. All rights reserved.
              </p>
              <div
                className={styles.paymentLogos}
                aria-label="Accepted payment methods via PayFast"
              >
                <img src="/payment-logos/visa.svg" alt="Visa" width="63" height="21" loading="lazy" />
                <img src="/payment-logos/mastercard.svg" alt="Mastercard" width="34" height="21" loading="lazy" />
                <img src="/payment-logos/instant-eft.svg" alt="Instant EFT" width="90" height="30" loading="lazy" />
                <img src="/payment-logos/snapscan.svg" alt="SnapScan" width="90" height="23" loading="lazy" />
              </div>
            </div>
          </footer>
        </div>
      </div>
    </>
  )
}
