import { useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import useFocusTrap from '../../hooks/useFocusTrap.js'
import BuddyAvatar from '../BuddyAvatar.jsx'
import SpeechBubble from '../SpeechBubble.jsx'
import VoiceButton from '../VoiceButton.jsx'
import WorldBackdrop from '../WorldBackdrop.jsx'
import Clock from '../Clock.jsx'
import DailyActivity from '../DailyActivity.jsx'
import SkipLink from '../SkipLink.jsx'
import { IconMail, IconCamera, IconPlay, IconMusic, IconBook, IconPalette, IconGear, IconSparkle } from '../icons.jsx'
import { SING_MODE_ENABLED } from '../../config/featureFlags.js'
import styles from './NormalScreen.module.css'

// The default chat/story-mode screen — Buddy's world, the dock, the speech
// bubble. Karaoke word-highlight tracking lives in useSpeech (speech.wordIndex)
// since that hook already knows which TTS backend is live; this screen just
// renders it. Owns the story overlay's focus trap (moved down alongside the
// only JSX that uses it).
export default function NormalScreen({
  settings,
  buddyName,
  chatMode,
  partOfDay,
  speech,
  uiStatus,
  buddyText,
  userText,
  cameraOn,
  parentMessage,
  onShowMessage,
  showActivity,
  dailyActivity,
  onDismissActivity,
  storyPhase,
  onPlayStory,
  onDeclineStory,
  onExitMode,
  onStartSing,
  onStartStory,
  onVoicePress,
  onShowPicker,
  onShowPin,
}) {
  const navigate = useNavigate()
  const storyTrapRef = useRef(null)

  useFocusTrap(storyTrapRef, storyPhase === 'ask', onDeclineStory)

  const wordIndex = speech.wordIndex

  const avatarType = settings.avatarType || 'bear'
  const isDarkRealm = partOfDay === 'evening' || partOfDay === 'night'

  return (
    <>
      <SkipLink />
      <div className={`${styles.page} ${isDarkRealm ? styles.darkRealm : ''} ${styles[`realmTint${partOfDay.charAt(0).toUpperCase() + partOfDay.slice(1)}`]}`}>
      <main id="main">
      <h1 className={styles.visuallyHidden}>Chat with {buddyName}</h1>
      <WorldBackdrop mode={chatMode} />
      {/* Ground plane and floating sky decorations — paper planes, kites,
          butterflies, bubbles that drift across the sky above Buddy. */}
      <div className={styles.ground} />
      <div className={styles.skyDeco}>
        <span className={styles.sdB1}>✈️</span>
        <span className={styles.sdP1}>🎈</span>
        <span className={styles.sdP2}>🦋</span>
        <span className={styles.sdB2}>✈️</span>
        <span className={styles.sdS1}>⭐</span>
        <span className={styles.sdP3}>🎈</span>
        <span className={styles.sdB3}>🦋</span>
        <span className={styles.sdP4}>✈️</span>
        <span className={styles.sdS2}>⭐</span>
        <span className={styles.sdP5}>🎈</span>
      </div>

      {/* Daily activity — Buddy announces it by voice on boot; this card
          just echoes it briefly, then fades once he's done speaking. */}
      <div className={`${styles.activityFloat} ${showActivity && chatMode === 'chat' ? styles.activityVisible : ''}`}>
        <DailyActivity activity={dailyActivity} onDismiss={onDismissActivity} />
      </div>

      {/* Layout: stacks vertically on phones (mode tiles at bottom), becomes
          a main-content + left-sidebar pair on tablet/desktop (>=768px) so
          the mode tiles don't look stranded at the bottom of a wide screen. */}
      <div className={styles.layout}>
        <div className={styles.mainColumn}>
          {/* Top bar */}
          <div className={styles.topBar}>
            <div className={styles.topBarLeft}>
              {chatMode !== 'chat' && (
                <button
                  className={styles.modeLabel}
                  onClick={onExitMode}
                  aria-label={`Leave ${chatMode} mode`}
                >
                  {chatMode} mode ✕
                </button>
              )}
              <Clock
                className={styles.clockBadge}
                partOfDay={partOfDay}
                onSpeak={(time) => speech.speak(`It's ${time}!`)}
              />
            </div>
            <div className={styles.topBarRight}>
              {parentMessage && (
                <button
                  className={styles.envelopeBtn}
                  onClick={onShowMessage}
                  aria-label="Message from your parent, tap to hear it"
                  title="Message from your parent!"
                >
                  <IconMail size={22} />
                </button>
              )}
              {cameraOn && <span className={styles.cameraIndicator} title="Camera on" aria-label="Camera on"><IconCamera size={18} /></span>}
            </div>
          </div>

          {/* Avatar */}
          <div className={`${styles.avatarArea} ${showActivity && chatMode === 'chat' ? styles.avatarAreaShifted : ''}`}>
            {/* Rolling hills — gives Buddy a ground to stand on, right behind
                his feet. Three translucent layers auto-tint to whichever
                mode gradient is behind them, creating depth. */}
            <svg className={styles.hills} viewBox="0 0 375 72" preserveAspectRatio="none" aria-hidden="true">
              <path d="M0 50 Q60 12 140 33 T375 20 V72 H0 Z" fill="rgba(255,255,255,0.45)" />
              <path d="M0 58 Q100 26 210 41 T375 34 V72 H0 Z" fill="rgba(255,255,255,0.65)" />
              <path d="M0 64 Q80 42 160 52 T375 46 V72 H0 Z" fill="rgba(255,255,255,0.32)" />
            </svg>
            <p className={styles.buddyNameTag}>{buddyName}</p>
            <BuddyAvatar status={uiStatus} avatarColor={settings.avatarColor} type={avatarType} costume={settings.costume} size={222} audioRef={speech.audioRef} partOfDay={partOfDay} />
          </div>

          {/* Speech bubble */}
          <div className={styles.bubbleArea}>
            <SpeechBubble
              buddyText={buddyText}
              userText={userText}
              status={uiStatus}
              wordIndex={wordIndex}
            />
          </div>

          {/* Voice button + dock — replaces the old hamburger menu with big
              tactile destinations a child can actually find and press. */}
          <div className={styles.voiceArea}>
            {!speech.supported.stt && (
              <p className={styles.noMic}>
                Voice not supported in this browser. Try Chrome!
              </p>
            )}
            <nav className={styles.dock} aria-label="Navigation">
            <div className={styles.dockSide}>
                {SING_MODE_ENABLED && (
                  <button className={styles.dockBtn} onClick={onStartSing}>
                    <span className={`${styles.dockIcon} ${styles.dockPink}`}><IconMusic size={26} /></span>
                    <span className={styles.dockLabel}>Songs</span>
                  </button>
                )}
                <button className={styles.dockBtn} onClick={onStartStory}>
                  <span className={`${styles.dockIcon} ${styles.dockBerry}`}><IconSparkle size={26} /></span>
                  <span className={styles.dockLabel}>Story</span>
                </button>
                <button className={styles.dockBtn} onClick={() => navigate('/courses')}>
                  <span className={`${styles.dockIcon} ${styles.dockSky}`}><IconBook size={26} /></span>
                  <span className={styles.dockLabel}>Learn</span>
                </button>
              </div>
              <VoiceButton status={uiStatus} onPress={onVoicePress} buddyName={buddyName} />
              <div className={styles.dockSide}>
                <button className={styles.dockBtn} onClick={onShowPicker}>
                  <span className={`${styles.dockIcon} ${styles.dockTangerine}`}><IconPalette size={26} /></span>
                  <span className={styles.dockLabel}>My Buddy</span>
                </button>
                <button className={`${styles.dockBtn} ${styles.dockParent}`} onClick={onShowPin}>
                  <span className={`${styles.dockIcon} ${styles.dockGrape}`}><IconGear size={26} /></span>
                  <span className={styles.dockLabel}>Parents</span>
                </button>
              </div>
            </nav>
          </div>
        </div>
      </div>

      {/* Custom bedtime story request (Pro) — tap fallback for the spoken ask */}
      {storyPhase === 'ask' && (
        <div className={styles.msgOverlay} role="dialog" aria-modal="true" aria-label="Story idea from your parent">
          <div className={styles.msgBubble} ref={storyTrapRef}>
            <div className={styles.msgIcon}><IconBook size={30} /></div>
            <p className={styles.msgTitle}>Someone left you a story idea! Want to hear it?</p>
            <button className={styles.msgPlayBtn} onClick={onPlayStory}><IconPlay size={16} /> Yes, tell me!</button>
            <button className={styles.msgDismissBtn} onClick={onDeclineStory}>Not now</button>
          </div>
        </div>
      )}
    </main>
    </div>
    </>
  )
}
