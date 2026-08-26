import { useRef, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import useFocusTrap from '../../hooks/useFocusTrap.js'
import SpeechBubble from '../SpeechBubble.jsx'
import VoiceButton from '../VoiceButton.jsx'
import SkipLink from '../SkipLink.jsx'
import TacticalOrb from '../TacticalOrb.jsx'
import ToolVaultRadial from '../ToolVaultRadial.jsx'
import { IconMail, IconCamera, IconPlay, IconBook, IconPalette, IconGear, IconSparkle } from '../icons.jsx'
import { sfx } from '../sound-fx.js'
import styles from './NormalScreen.module.css'

/**
 * NormalScreen — Tactical Command Center.
 * Replaces the candy/squishy world with a dark tactical HUD.
 * Features: TacticalOrb, ToolVaultRadial, sound FX, grid background.
 */
export default function NormalScreen({
  settings,
  buddyName,
  chatMode,
  speech,
  uiStatus,
  buddyText,
  userText,
  cameraOn,
  parentMessage,
  onShowMessage,
  storyPhase,
  onPlayStory,
  onDeclineStory,
  onExitMode,
  onStartStory,
  onVoicePress,
  onShowPicker,
  onShowPin,
  minutesUsed,
  dailyLimit,
  shouldWarn,
}) {
  const navigate = useNavigate()
  const storyTrapRef = useRef(null)

  useFocusTrap(storyTrapRef, storyPhase === 'ask', onDeclineStory)

  const wordIndex = speech.wordIndex

  // Play sound FX on voice status changes
  useEffect(() => {
    if (uiStatus === 'listening') sfx.nav()
    if (uiStatus === 'speaking') sfx.click()
  }, [uiStatus])

  return (
    <>
      <SkipLink />
      <div className={styles.page}>
        <div className={styles.gridBg} />

        <main id="main">
          <h1 className={styles.visuallyHidden}>Command Center — {buddyName}</h1>

          {/* Top HUD bar */}
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
              {dailyLimit > 0 && (
                <span className={`${styles.screenTimeBadge} ${shouldWarn ? styles.screenTimeWarn : ''}`}>
                  {minutesUsed}/{dailyLimit} min
                </span>
              )}
            </div>
            <div className={styles.topBarRight}>
              {parentMessage && (
                <button className={styles.hudBtn} onClick={onShowMessage} aria-label="Message from your parent">
                  <IconMail size={20} />
                </button>
              )}
              {cameraOn && <span className={styles.cameraIndicator} aria-label="Camera on"><IconCamera size={18} /></span>}
            </div>
          </div>

          {/* Central Tactical Orb */}
          <div className={styles.avatarArea}>
            <p className={styles.buddyNameTag}>{buddyName}</p>
            <TacticalOrb
              status={uiStatus}
              rank={settings.rank}
              totalXp={settings.totalXp}
            />
          </div>

          {/* Speech bubble */}
          <div className={styles.bubbleArea}>
            <SpeechBubble buddyText={buddyText} userText={userText} status={uiStatus} wordIndex={wordIndex} />
          </div>

          {/* Voice button + dock */}
          <div className={styles.voiceArea}>
            {!speech.supported.stt && (
              <p className={styles.noMic}>Voice not supported in this browser. Try Chrome!</p>
            )}
            <nav className={styles.dock} aria-label="Navigation">
              <div className={styles.dockSide}>
                <button className={styles.dockBtn} onClick={() => { sfx.click(); onStartStory(); }}>
                  <span className={styles.dockIcon}><IconSparkle size={24} /></span>
                  <span className={styles.dockLabel}>Story</span>
                </button>
                <button className={styles.dockBtn} onClick={() => { sfx.nav(); navigate('/courses'); }}>
                  <span className={styles.dockIcon}><IconBook size={24} /></span>
                  <span className={styles.dockLabel}>Learn</span>
                </button>
              </div>
              <VoiceButton status={uiStatus} onPress={() => { sfx.click(); onVoicePress(); }} onRelease={() => {}} buddyName={buddyName} />
              <div className={styles.dockSide}>
                <button className={styles.dockBtn} onClick={() => { sfx.nav(); onShowPicker(); }}>
                  <span className={styles.dockIcon}><IconPalette size={24} /></span>
                  <span className={styles.dockLabel}>My Buddy</span>
                </button>
                <button className={styles.dockBtn} onClick={() => { sfx.click(); onShowPin(); }}>
                  <span className={styles.dockIcon}><IconGear size={24} /></span>
                  <span className={styles.dockLabel}>Parents</span>
                </button>
              </div>
            </nav>
          </div>
        </main>

        {/* Story overlay */}
        {storyPhase === 'ask' && (
          <div className={styles.msgOverlay} role="dialog" aria-modal="true" aria-label="Story idea from your parent">
            <div className={styles.msgBubble} ref={storyTrapRef}>
              <div className={styles.msgIcon}><IconBook size={30} /></div>
              <p className={styles.msgTitle}>Someone left you a story idea! Want to hear it?</p>
              <button className={styles.msgPlayBtn} onClick={() => { sfx.success(); onPlayStory(); }}><IconPlay size={16} /> Yes, tell me!</button>
              <button className={styles.msgDismissBtn} onClick={() => { sfx.click(); onDeclineStory(); }}>Not now</button>
            </div>
          </div>
        )}

        {/* Tool Vault Radial */}
        <ToolVaultRadial />
      </div>
    </>
  )
}
