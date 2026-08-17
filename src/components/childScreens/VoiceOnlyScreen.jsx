import { useNavigate } from 'react-router-dom'
import BuddyMenu from '../BuddyMenu.jsx'
import VoiceButton from '../VoiceButton.jsx'
import SkipLink from '../SkipLink.jsx'
import styles from './VoiceOnlyScreen.module.css'

// Accessibility-oriented alternate skin of the normal screen — same voice
// interaction (uiStatus/buddyText/userText/handleVoicePress all come from
// the shell, identical to NormalScreen's), stripped down to a dark, mostly
// textless layout for a lower-vision or lower-distraction use case.
//
// The parent-PIN gate and avatar picker are rendered once at the shell
// level (shared with NormalScreen, which wants the identical modal with
// identical success behavior) rather than duplicated here — this screen
// only needs to trigger them.
export default function VoiceOnlyScreen({
  uiStatus,
  buddyText,
  userText,
  buddyName,
  onVoicePress,
  onStartSing,
  onCustomize,
  onShowPin,
}) {
  const navigate = useNavigate()

  return (
    <>
      <SkipLink />
      <main className={styles.voicePage} id="main">
        <div className={styles.voiceMenuWrap}>
          <BuddyMenu
            variant="dark"
            onSongs={onStartSing}
            onLearn={() => navigate('/courses')}
            onCustomize={onCustomize}
            onSettings={onShowPin}
          />
        </div>

        <div className={`${styles.voiceOrb} ${styles[`orb_${uiStatus}`]}`} />
        <p className={styles.voiceBuddyText}>{buddyText}</p>
        {userText ? <p className={styles.voiceUserText}>You: {userText}</p> : null}

        <VoiceButton status={uiStatus} onPress={onVoicePress} buddyName={buddyName} />
      </main>
    </>
  )
}
