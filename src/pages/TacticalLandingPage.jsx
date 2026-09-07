import { useState, useRef, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { motion, useScroll, useTransform, useSpring, useReducedMotion } from 'motion/react'
import TacticalOrb from '../components/TacticalOrb.jsx'
import SkipLink from '../components/SkipLink.jsx'
import { IconArrowRight, IconCheck } from '../components/icons.jsx'
import styles from './TacticalLandingPage.module.css'

/**
 * TacticalLandingPage — Buddy Tactical Academy landing page.
 * Structure IS the onboarding sequence: a skeptical parent scrolls through
 * the exact five steps that happen after signup, before ever clicking Enlist.
 */

const DIRECTION_CONTRACT = `
THESIS: The page's structure is the onboarding sequence itself, not stacked
marketing sections — replacing "confusing flow" with earned, load-bearing order.
OWN-WORLD: Command Black plus Tactical Teal HUD, JetBrains Mono throughout,
sharp 4-12px radii — the sanctioned Tactical Landing Page exception in
DESIGN.md, unchanged.
STORY: A skeptical parent watches the exact post-signup flow — Recruit Brief,
Assessment, Mission Assign, Parent Debrief, Enlist — before ever clicking, so
the one CTA feels earned, not blind.
FIRST VIEWPORT: Hero — orb left, headline and CTAs right, ticker cue below
reading "PREVIEW BELOW: exactly what happens after you enlist — 5 steps, no
surprises", pointing at the walkthrough beneath the fold.
FORM: Onboarding-simulation walkthrough, dealt lead of concept-seed --scope
surface --mode persuade, seed key 2409565c.
FINISH: unreviewed and undocumented is unfinished; this build ends with the
finish review, the verdict, DESIGN.md, and every shipping raster carrying its
provenance.
`

const WINGS = [
  { id: 'robotics', title: 'ROBOTICS WING', tagline: 'Build the Brains', description: 'From logic gates to autonomous command, train as an engineer.', image: '/backdrops/robotics-wing.webp' },
  { id: 'beast-intel', title: 'BEAST INTELLIGENCE', tagline: 'Decode the Wild', description: "Study nature's most advanced specialists and their bio-tech secrets.", image: '/backdrops/beast-intel-wing.webp' },
  { id: 'field-rations', title: 'FIELD RATIONS OPS', tagline: 'Fuel the Mission', description: 'Master the chemistry of cooking and the power of nutrition as fuel.', image: '/backdrops/field-rations-wing.webp' },
  { id: 'env-recon', title: 'ENVIRONMENTAL RECON', tagline: 'Map the Sector', description: 'Sharpen observation, navigation, and weather intelligence near home.', image: '/backdrops/env-recon-wing.webp' },
  { id: 'botany-ops', title: 'BOTANY OPS', tagline: 'Grow the Future', description: 'Treat gardening as a high-tech sustainment project in resource generation.', image: '/backdrops/botany-ops-wing.webp' },
]

const RECRUIT_BRIEF_PREVIEW = `> ENLISTMENT INTAKE — UNIT 01

CALLSIGN: [ your child picks one ]
UNIT: Buddy (Unit 01), reporting.

"Listen up, Recruit. Every elite unit
needs a commander — that's you.
Let's find out what you already know."

STATUS: Awaiting first mission assignment...`

const QUIZ_QUESTION = {
  prompt: `SAMPLE ASSESSMENT — LOGIC GATES

If an OR gate receives one 'ON' signal and
one 'OFF' signal, does the signal pass through?`,
  options: [
    { id: 'yes', label: 'YES — SIGNAL PASSES', correct: true },
    { id: 'no', label: 'NO — SIGNAL BLOCKED', correct: false },
  ],
  feedback: {
    yes: 'CORRECT. An OR gate passes the signal if at least one input is ON.',
    no: 'NOT QUITE. An OR gate only blocks the signal when every input is OFF.',
  },
}

const STORYBOOK_PREVIEW = `SUBJECT: Bio-Analyst Mia R. // Intelligence Report #1

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

SUBJECT: Specialist Mia R. // Rank: Recruit Grade II
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
  const [quizAnswer, setQuizAnswer] = useState(null)
  const heroRef = useRef(null)
  const dossierCloseRef = useRef(null)
  const reduce = useReducedMotion()

  // Modal focus management: move focus in on open, restore on close, dismiss on Escape.
  useEffect(() => {
    if (!showDossier) return
    dossierCloseRef.current?.focus()
    const onKeyDown = (e) => {
      if (e.key === 'Escape') setShowDossier(false)
    }
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [showDossier])

  const { scrollYProgress } = useScroll({ target: heroRef, offset: ['start start', 'end start'] })
  const heroY = useTransform(scrollYProgress, [0, 1], ['0%', '40%'])
  const heroOpacity = useTransform(scrollYProgress, [0, 0.8], [1, 0])
  const heroScale = useTransform(scrollYProgress, [0, 1], [1, 1.1])
  const smoothHeroY = useSpring(heroY, { stiffness: 100, damping: 30 })

  // When reduced motion is preferred, skip scroll-driven transforms entirely
  const heroStyle = reduce ? {} : { y: smoothHeroY, scale: heroScale }
  const contentStyle = reduce ? {} : { opacity: heroOpacity }

  // Below-the-fold sections use whileInView entrance animation; skip it entirely
  // when the visitor prefers reduced motion instead of only gating the hero.
  const anim = (props) => (reduce ? {} : props)

  return (
    <>
      {/* eslint-disable-next-line react/no-danger */}
      <div aria-hidden="true" style={{ display: 'none' }} dangerouslySetInnerHTML={{ __html: `<!--${DIRECTION_CONTRACT}-->` }} />
      <SkipLink />
      <main className={styles.page} id="main">
        {/* HERO — Split: Orb on left, commander hook on right */}
        <section ref={heroRef} className={styles.hero}>
          <motion.div
            className={styles.heroBg}
            style={heroStyle}
          >
            {/* CSS grid background pattern — tactical data field */}
            <div className={styles.heroGrid} aria-hidden="true" />
          </motion.div>

          <motion.div
            className={styles.heroContent}
            style={contentStyle}
          >
            <nav className={styles.nav}>
              <div className={styles.logoWrap}>
                <span className={styles.logoTactical}>⚙</span>
                <span className={styles.logo}>Buddy Tactical Academy</span>
              </div>
              <Link className={styles.navCta} to="/login" state={{ mode: 'signup', plan: 'pro' }}>ENLIST NOW</Link>
            </nav>

            {/* Split hero: Orb (left) + Hook (right) */}
            <div className={styles.heroSplit}>
              {/* Orb — the living command core */}
              <motion.div
                className={styles.heroOrb}
                {...anim({ initial: { opacity: 0, scale: 0.8 }, animate: { opacity: 1, scale: 1 }, transition: { duration: 1, delay: 0.5, ease: 'easeOut' } })}
              >
                <TacticalOrb status="idle" totalXp={0} interactive={false} style={{ width: 240, height: 240 }} />
              </motion.div>

              {/* Commander hook — right side */}
              <div className={styles.heroText}>
                <motion.h1
                  className={styles.heroTitle}
                  {...anim({ initial: { opacity: 0, y: 30 }, animate: { opacity: 1, y: 0 }, transition: { duration: 0.8, delay: 0.3 } })}
                >
                  Your Child. Our <span className={styles.teal}>Missions</span>. Their Future.
                </motion.h1>
                <motion.p
                  className={styles.heroSub}
                  {...anim({ initial: { opacity: 0, y: 20 }, animate: { opacity: 1, y: 0 }, transition: { duration: 0.7, delay: 0.6 } })}
                >
                  Buddy is the elite Tactical Specialist mentor turning screen time into field expertise. Robotics, Beast Intelligence, Enviro Recon, Field Rations, and Botany Ops, across a structured 6-month Academy path.
                </motion.p>
                <motion.div
                  className={styles.heroCtas}
                  {...anim({ initial: { opacity: 0, y: 20 }, animate: { opacity: 1, y: 0 }, transition: { duration: 0.7, delay: 0.9 } })}
                >
                  <Link className={styles.ctaPrimary} to="/login" state={{ mode: 'signup', plan: 'pro' }}>ENLIST NOW</Link>
                  <a href="#walkthrough" className={styles.ctaSecondary}>SEE THE WALKTHROUGH</a>
                </motion.div>
              </div>
            </div>
          </motion.div>

          <motion.div className={styles.heroTicker} style={contentStyle}>
            <div className={styles.tickerItem}>
              <span className={styles.tickerDot} />
              <span className={styles.tickerText}>PREVIEW BELOW: exactly what happens after you enlist — 5 steps, no surprises</span>
            </div>
            <div className={styles.tickerCount}>STEP 01 OF 05 ↓</div>
          </motion.div>
        </section>

        {/* STEP 01 — RECRUIT BRIEF */}
        <section className={styles.stepSection} id="walkthrough">
          <motion.div className={styles.sectionHeader} {...anim({ initial: { opacity: 0, y: 40 }, whileInView: { opacity: 1, y: 0 }, viewport: { once: true, amount: 0.3 }, transition: { duration: 0.7 } })}>
            <h2 className={styles.sectionTitle}>STEP 01 / 05 — RECRUIT BRIEF</h2>
            <p className={styles.sectionSub}>The moment you enlist, this is what your child sees first.</p>
          </motion.div>
          <motion.div className={styles.stepCard} {...anim({ initial: { opacity: 0, y: 30 }, whileInView: { opacity: 1, y: 0 }, viewport: { once: true, amount: 0.3 }, transition: { duration: 0.6 } })}>
            <span className={styles.previewTag}>PREVIEW</span>
            <pre className={styles.stepCardMono}>{RECRUIT_BRIEF_PREVIEW}</pre>
          </motion.div>
        </section>

        {/* STEP 02 — ASSESSMENT */}
        <section className={styles.stepSection}>
          <motion.div className={styles.sectionHeader} {...anim({ initial: { opacity: 0, y: 40 }, whileInView: { opacity: 1, y: 0 }, viewport: { once: true, amount: 0.3 }, transition: { duration: 0.7 } })}>
            <h2 className={styles.sectionTitle}>STEP 02 / 05 — ASSESSMENT</h2>
            <p className={styles.sectionSub}>A real question from Mission 01. Try it.</p>
          </motion.div>
          <motion.div className={styles.stepCard} {...anim({ initial: { opacity: 0, y: 30 }, whileInView: { opacity: 1, y: 0 }, viewport: { once: true, amount: 0.3 }, transition: { duration: 0.6 } })}>
            <span className={styles.previewTag}>PREVIEW</span>
            <pre className={styles.quizPrompt}>{QUIZ_QUESTION.prompt}</pre>
            <div className={styles.quizOptions}>
              {QUIZ_QUESTION.options.map((opt) => (
                <button
                  key={opt.id}
                  type="button"
                  className={`${styles.quizOption} ${quizAnswer === opt.id ? (opt.correct ? styles.quizCorrect : styles.quizWrong) : ''}`}
                  onClick={() => setQuizAnswer(opt.id)}
                  aria-pressed={quizAnswer === opt.id}
                >
                  {opt.label}
                </button>
              ))}
            </div>
            {quizAnswer && (
              <p className={styles.quizFeedback} aria-live="polite">{QUIZ_QUESTION.feedback[quizAnswer]}</p>
            )}
          </motion.div>
        </section>

        {/* STEP 03 — MISSION ASSIGN (5 WINGS) */}
        <section className={styles.wingsSection}>
          <motion.div className={styles.sectionHeader} {...anim({ initial: { opacity: 0, y: 40 }, whileInView: { opacity: 1, y: 0 }, viewport: { once: true, amount: 0.3 }, transition: { duration: 0.7 } })}>
            <h2 className={styles.sectionTitle}>STEP 03 / 05 — MISSION ASSIGN</h2>
            <p className={styles.sectionSub}>Your child's assigned track. Five specializations, one 6-month path.</p>
          </motion.div>
          <div className={styles.wingsGrid}>
            {WINGS.map((wing, i) => (
              <motion.div key={wing.id} className={styles.missionCard} {...anim({ initial: { opacity: 0, y: 40 }, whileInView: { opacity: 1, y: 0 }, viewport: { once: true, amount: 0.2 }, transition: { duration: 0.6, delay: i * 0.1 } })}>
                <div className={styles.missionCardImage}>
                  <img src={wing.image} alt="" aria-hidden="true" loading="lazy" />
                  <div className={styles.missionCardOverlay} />
                </div>
                <div className={styles.missionCardContent}>
                  <h3 className={styles.missionTitle}>{wing.title}</h3>
                  <p className={styles.missionTagline}>{wing.tagline}</p>
                  <p className={styles.missionDesc}>{wing.description}</p>
                  <Link className={styles.missionBtn} to="/login" state={{ mode: 'signup', plan: 'pro' }}>
                    ACCESS BRIEFING <IconArrowRight size={14} />
                  </Link>
                </div>
              </motion.div>
            ))}
          </div>
        </section>

        {/* STEP 04 — PARENT DEBRIEF */}
        <section className={styles.intelSection}>
          <motion.div className={styles.intelContent} {...anim({ initial: { opacity: 0, y: 40 }, whileInView: { opacity: 1, y: 0 }, viewport: { once: true, amount: 0.2 }, transition: { duration: 0.7 } })}>
            <h2 className={styles.intelTitle}>STEP 04 / 05 — PARENT DEBRIEF</h2>
            <p className={styles.intelBody}>Every Sunday at 6:00 PM, a "Mission Debrief" (AAR) arrives via WhatsApp. No more wondering what they're doing.</p>
            <p className={styles.intelTagline}>Intel you can be proud of.</p>
            <div className={styles.intelPreview}>
              <div className={styles.phoneMockup}>
                <div className={styles.phoneScreen}>
                  <pre className={styles.phoneText}>{STORYBOOK_PREVIEW}</pre>
                </div>
              </div>
              <button className={styles.sampleBtn} onClick={() => setShowDossier(true)}>GENERATE SAMPLE REPORT</button>
            </div>
          </motion.div>
        </section>

        {/* STEP 05 — ENLIST */}
        <section className={styles.pricingBoxSection}>
          <motion.div className={styles.sectionHeader} {...anim({ initial: { opacity: 0, y: 40 }, whileInView: { opacity: 1, y: 0 }, viewport: { once: true, amount: 0.3 }, transition: { duration: 0.7 } })}>
            <h2 className={styles.sectionTitle}>STEP 05 / 05 — ENLIST</h2>
            <p className={styles.sectionSub}>One plan. Everything included. No surprises.</p>
          </motion.div>
          <motion.div className={styles.pricingBox} {...anim({ initial: { opacity: 0, y: 40 }, whileInView: { opacity: 1, y: 0 }, viewport: { once: true, amount: 0.2 }, transition: { duration: 0.7 } })}>
            <p className={styles.pricingDesc}>At <span className={styles.pricingInline}>R149/month</span> — less than a weekend takeaway, and far less than R1,200+/month for one hour of private tutoring a week — you get 24/7 access to the Academy, the Sunday Storybook, and the elite 6-month curriculum. Everything included:</p>
            <ul className={styles.pricingFeatures}>
              <li><IconCheck size={16} /> 5 Specialization Wings</li>
              <li><IconCheck size={16} /> Weekly Mission Debriefs (AAR)</li>
              <li><IconCheck size={16} /> Unlimited Missions &amp; Gear Up</li>
              <li><IconCheck size={16} /> Priority Skill Coaching</li>
              <li><IconCheck size={16} /> Peace of Mind Camera</li>
              <li><IconCheck size={16} /> First 10 Days Free — No Card Needed</li>
            </ul>
            <Link className={styles.ctaEnlist} to="/login" state={{ mode: 'signup', plan: 'pro' }}>ENLIST NOW — START FREE TRIAL</Link>
          </motion.div>
        </section>

        {/* FOOTER */}
        <footer className={styles.footer}>
          <div className={styles.footerInner}>
            <div className={styles.footerLogo}><span className={styles.logoTactical}>⚙</span> BUDDY TACTICAL ACADEMY</div>
            <p className={styles.footerTrust}>
              Every Buddy account is created and run by a parent. Voice audio is used only to generate
              a live reply and isn't kept afterward, and we never sell or use a child's data for advertising.
            </p>
            <nav className={styles.footerLinks} aria-label="Legal">
              <Link className={styles.footerLink} to="/privacy">Privacy Policy</Link>
              <Link className={styles.footerLink} to="/terms">Terms of Service</Link>
              <Link className={styles.footerLink} to="/cookies">Cookie Policy</Link>
              <Link className={styles.footerLink} to="/data-deletion">Data Deletion</Link>
              <Link className={styles.footerLink} to="/refunds">Refund Policy</Link>
            </nav>
            <p className={styles.footerCopy}>© {new Date().getFullYear()} Buddy Tactical Academy. All rights reserved.</p>
          </div>
        </footer>

        {/* DOSSIER MODAL */}
        {showDossier && (
          <div className={styles.dossierOverlay} role="dialog" aria-modal="true" aria-label="Sample Mission Debrief">
            <div className={styles.dossierCard}>
              <button ref={dossierCloseRef} className={styles.dossierClose} onClick={() => setShowDossier(false)} aria-label="Close sample report">×</button>
              <h3 className={styles.dossierTitle}>AFTER-ACTION REPORT (AAR) — SAMPLE</h3>
              <pre className={styles.dossierContent}>{DOSSIER_CONTENT}</pre>
              <Link className={styles.dossierCta} to="/login" state={{ mode: 'signup', plan: 'pro' }} onClick={() => setShowDossier(false)}>VIEW FULL COMMANDER LOG IN DASHBOARD</Link>
            </div>
          </div>
        )}
      </main>
    </>
  )
}
