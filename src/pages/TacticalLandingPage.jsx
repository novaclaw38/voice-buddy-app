import { useState, useEffect, useRef } from 'react'
import { Link } from 'react-router-dom'
import { motion, useScroll, useTransform, useSpring } from 'motion/react'
import SkipLink from '../components/SkipLink.jsx'
import { IconArrowRight, IconCheck } from '../components/icons.jsx'
import styles from './TacticalLandingPage.module.css'

/**
 * TacticalLandingPage — Buddy Tactical Academy landing page.
 * 
 * Design: Premium tactical command center aesthetic.
 * Command Black (#0A0A0B) + Tactical Teal (#00F5FF) + Alert Orange (#FF8A00).
 * Glassmorphism HUD panels, parallax hero, scroll-driven motion.
 * Real FLUX-generated imagery for hero + wing cards.
 */

const WINGS = [
  {
    id: 'robotics',
    title: 'ROBOTICS WING',
    tagline: 'Build the Brains',
    description: 'From logic gates to autonomous command, train as an engineer.',
    image: '/backdrops/robotics-wing.webp',
  },
  {
    id: 'beast-intel',
    title: 'BEAST INTELLIGENCE',
    tagline: 'Decode the Wild',
    description: "Study nature's most advanced specialists and their bio-tech secrets.",
    image: '/backdrops/beast-intel-wing.webp',
  },
  {
    id: 'field-rations',
    title: 'FIELD RATIONS OPS',
    tagline: 'Fuel the Mission',
    description: 'Master the chemistry of cooking and the power of nutrition as fuel.',
    image: '/backdrops/field-rations-wing.webp',
  },
  {
    id: 'env-recon',
    title: 'ENVIRONMENTAL RECON',
    tagline: 'Map the Sector',
    description: 'Sharpen observation, navigation, and weather intelligence near home.',
    image: '/backdrops/env-recon-wing.webp',
  },
  {
    id: 'botany-ops',
    title: 'BOTANY OPS',
    tagline: 'Grow the Future',
    description: 'Treat gardening as a high-tech sustainment project in resource generation.',
    image: '/backdrops/botany-ops-wing.webp',
  },
]

const PRICING_COMPARISON = [
  { label: 'PRIVATE TUTORING', price: 'R1,200+/mo', desc: '1 hour a week. High cost. Inconvenient.', dim: true },
  { label: 'BUDDY ACADEMY', price: 'R149/mo', desc: '24/7 Professional Mentorship. Structured Curricula. Sunday Storybooks.', highlight: true },
  { label: 'YOUTUBE / GAMES', price: 'R0 / R150+', desc: 'Mindless loops. Passive learning. Zero reporting.', dim: true },
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
═══════════════════════════════════════`

export default function TacticalLandingPage() {
  const [showDossier, setShowDossier] = useState(false)
  const [liveCount, setLiveCount] = useState(5287)
  const heroRef = useRef(null)

  // Parallax scroll for hero
  const { scrollYProgress } = useScroll({
    target: heroRef,
    offset: ['start start', 'end start'],
  })
  const heroY = useTransform(scrollYProgress, [0, 1], ['0%', '40%'])
  const heroOpacity = useTransform(scrollYProgress, [0, 0.8], [1, 0])
  const heroScale = useTransform(scrollYProgress, [0, 1], [1, 1.1])
  const smoothHeroY = useSpring(heroY, { stiffness: 100, damping: 30 })

  // Live count ticker
  useEffect(() => {
    const interval = setInterval(() => {
      setLiveCount((prev) => prev + Math.floor(Math.random() * 10))
    }, 3000)
    return () => clearInterval(interval)
  }, [])

  return (
    <>
      <SkipLink />
      <div className={styles.page}>
        {/* ── HERO ── */}
        <section ref={heroRef} className={styles.hero}>
          <motion.div
            className={styles.heroBg}
            style={{ y: smoothHeroY, scale: heroScale }}
          >
            <img src="/backdrops/tactical-hero.webp" alt="" aria-hidden="true" />
            <div className={styles.heroOverlay} />
          </motion.div>

          <motion.div
            className={styles.heroContent}
            style={{ opacity: heroOpacity }}
          >
            <nav className={styles.nav}>
              <div className={styles.logoWrap}>
                <span className={styles.logoTactical}>⚙</span>
                <span className={styles.logo}>Buddy Tactical Academy</span>
              </div>
              <Link className={styles.navCta} to="/login" state={{ mode: 'signup', plan: 'pro' }}>
                ENLIST NOW
              </Link>
            </nav>

            <div className={styles.heroText}>
              <motion.div
                className={styles.heroBadge}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.2 }}
              >
                SECTOR_AUTH_REQUIRED
              </motion.div>
              <motion.h1
                className={styles.heroTitle}
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8, delay: 0.4 }}
              >
                Give Your Child the{' '}
                <span className={styles.teal}>Command Center</span>.
              </motion.h1>
              <motion.p
                className={styles.heroSub}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.7, delay: 0.7 }}
              >
                Buddy isn't just an app — it's an elite Tactical Academy that turns screen time
                into high-stakes learning. From Robotics to Beast Intelligence, Buddy is the
                zero-guilt mentor your child deserves.
              </motion.p>
              <motion.div
                className={styles.heroCtas}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.7, delay: 1.0 }}
              >
                <Link className={styles.ctaPrimary} to="/login" state={{ mode: 'signup', plan: 'pro' }}>
                  ENLIST NOW — R149/Mo
                </Link>
                <a href="#how-it-works" className={styles.ctaSecondary}>
                  HOW THE ACADEMY WORKS
                </a>
              </motion.div>
            </div>
          </motion.div>

          <motion.div className={styles.heroTicker} style={{ opacity: heroOpacity }}>
            <div className={styles.tickerItem}>
              <span className={styles.tickerDot} /> LIVE_OPS: Commander Leo completed OBSTACLE_RECON_01
            </div>
            <div className={styles.tickerCount}>
              TOTAL MISSIONS: {liveCount.toLocaleString()}
            </div>
          </motion.div>
        </section>

        {/* ── MINDLESS vs BUDDY ── */}
        <section className={styles.contrastSection} id="how-it-works">
          <motion.div
            className={styles.sectionHeader}
            initial={{ opacity: 0, y: 40 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.3 }}
            transition={{ duration: 0.7 }}
          >
            <h2 className={styles.sectionTitle}>MINDLESS vs. MEANINGFUL</h2>
          </motion.div>
          <div className={styles.contrastGrid}>
            <motion.div
              className={`${styles.contrastCard} ${styles.old}`}
              initial={{ opacity: 0, x: -40 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true, amount: 0.3 }}
              transition={{ duration: 0.6 }}
            >
              <div className={styles.contrastCardHeader}>
                <h3 className={styles.contrastTitle}>THE OLD WAY</h3>
              </div>
              <ul className={styles.contrastList}>
                <li>Mindless Loops: Endless scrolling that dulls the senses.</li>
                <li>Zero Impact: Hours spent watching other people do things.</li>
                <li>Parent Guilt: The feeling of "plugging them in" for peace.</li>
              </ul>
            </motion.div>
            <motion.div
              className={`${styles.contrastCard} ${styles.new}`}
              initial={{ opacity: 0, x: 40 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true, amount: 0.3 }}
              transition={{ duration: 0.6, delay: 0.15 }}
            >
              <div className={styles.contrastCardHeader}>
                <h3 className={styles.contrastTitle}>THE BUDDY WAY</h3>
              </div>
              <ul className={styles.contrastList}>
                <li>Active Field Ops: Missions that require real-world action.</li>
                <li>Skill Mastery: 6-month structured curricula by experts.</li>
                <li>Zero Guilt: Give them a mentor, not just a screen.</li>
              </ul>
            </motion.div>
          </div>
        </section>

        {/* ── THE 5 WINGS ── */}
        <section className={styles.wingsSection}>
          <motion.div
            className={styles.sectionHeader}
            initial={{ opacity: 0, y: 40 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.3 }}
            transition={{ duration: 0.7 }}
          >
            <h2 className={styles.sectionTitle}>THE FIVE WINGS</h2>
            <p className={styles.sectionSub}>Five specialization tracks. One elite curriculum path.</p>
          </motion.div>
          <div className={styles.wingsGrid}>
            {WINGS.map((wing, i) => (
              <motion.div
                key={wing.id}
                className={styles.missionCard}
                initial={{ opacity: 0, y: 40 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, amount: 0.2 }}
                transition={{ duration: 0.6, delay: i * 0.1 }}
              >
                <div className={styles.missionCardImage}>
                  <img src={wing.image} alt="" aria-hidden="true" />
                  <div className={styles.missionCardOverlay} />
                </div>
                <div className={styles.missionCardContent}>
                  <h3 className={styles.missionTitle}>{wing.title}</h3>
                  <p className={styles.missionTagline}>{wing.tagline}</p>
                  <p className={styles.missionDesc}>{wing.description}</p>
                  <Link className={styles.missionBtn} to={`/login?plan=pro#${wing.id}`} state={{ mode: 'signup', plan: 'pro' }}>
                    ACCESS BRIEFING <IconArrowRight size={14} />
                  </Link>
                </div>
              </motion.div>
            ))}
          </div>
        </section>

        {/* ── PARENT INTELLIGENCE FEED ── */}
        <section className={styles.intelSection}>
          <motion.div
            className={styles.intelContent}
            initial={{ opacity: 0, y: 40 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.2 }}
            transition={{ duration: 0.7 }}
          >
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
                  <pre className={styles.phoneText}>{STORYBOOK_PREVIEW}</pre>
                </div>
              </div>
              <button className={styles.sampleBtn} onClick={() => setShowDossier(true)}>
                GENERATE SAMPLE REPORT
              </button>
            </div>
          </motion.div>
        </section>

        {/* ── PRICING COMPARISON ── */}
        <section className={styles.pricing}>
          <motion.div
            className={styles.comparisonWrap}
            initial={{ opacity: 0, y: 40 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.2 }}
            transition={{ duration: 0.7 }}
          >
            <h2 className={styles.comparisonTitle}>THE INVESTMENT</h2>
            <p className={styles.comparisonSub}>Compare true elite mentorship against alternatives.</p>
            <div className={styles.comparisonGrid}>
              {PRICING_COMPARISON.map((plan, i) => (
                <motion.div
                  key={plan.label}
                  className={`${styles.comparisonCard} ${plan.dim ? styles.dim : ''} ${plan.highlight ? styles.highlighted : ''}`}
                  initial={{ opacity: 0, y: 30 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.5, delay: i * 0.1 }}
                >
                  <h3>{plan.label}</h3>
                  <div className={styles.price}>{plan.price}</div>
                  <p>{plan.desc}</p>
                  {plan.highlight && (
                    <Link className={styles.comparisonCta} to="/login" state={{ mode: 'signup', plan: 'pro' }}>
                      ENLIST NOW
                    </Link>
                  )}
                </motion.div>
              ))}
            </div>
          </motion.div>
        </section>

        {/* ── PRICING BOX ── */}
        <section className={styles.pricingBoxSection}>
          <motion.div
            className={styles.pricingBox}
            initial={{ opacity: 0, y: 40 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.2 }}
            transition={{ duration: 0.7 }}
          >
            <h2 className={styles.pricingTitle}>UNLOCK THE FULL SPECIALIST PATH</h2>
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
            <Link className={styles.ctaEnlist} to="/login" state={{ mode: 'signup', plan: 'pro' }}>
              ENLIST NOW — START FREE TRIAL
            </Link>
          </motion.div>
        </section>

        {/* ── RANK UP CTA ── */}
        <section className={styles.rankUp}>
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.7 }}
          >
            <h2 className={styles.rankUpTitle}>Stop the Scroll. Start the Mission.</h2>
            <p className={styles.rankUpSub}>Enlist today. Your first 3 missions are free.</p>
            <Link className={styles.ctaAuthorize} to="/login" state={{ mode: 'signup', plan: 'pro' }}>
              AUTHORIZE ENLISTMENT
            </Link>
          </motion.div>
        </section>

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
          </div>
        </footer>

        {/* ── DOSSIER MODAL ── */}
        {showDossier && (
          <div className={styles.dossierOverlay} role="dialog" aria-modal="true" aria-label="Sample Mission Debrief">
            <div className={styles.dossierCard}>
              <button className={styles.dossierClose} onClick={() => setShowDossier(false)} aria-label="Close sample report">×</button>
              <h3 className={styles.dossierTitle}>AFTER-ACTION REPORT (AAR) — SAMPLE</h3>
              <pre className={styles.dossierContent}>{DOSSIER_CONTENT}</pre>
              <Link className={styles.dossierCta} to="/login" state={{ mode: 'signup', plan: 'pro' }} onClick={() => setShowDossier(false)}>
                VIEW FULL COMMANDER LOG IN DASHBOARD
              </Link>
            </div>
          </div>
        )}
      </div>
    </>
  )
}
