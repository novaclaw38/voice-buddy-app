import { useState, useCallback, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import BuddyAvatar from '../components/BuddyAvatar.jsx'
import SpeechBubble from '../components/SpeechBubble.jsx'
import VoiceButton from '../components/VoiceButton.jsx'
import BuddyMenu from '../components/BuddyMenu.jsx'
import ParentPin from '../components/ParentPin.jsx'
import AvatarPicker from '../components/AvatarPicker.jsx'
import WorldBackdrop from '../components/WorldBackdrop.jsx'
import Clock from '../components/Clock.jsx'
import { useSpeech } from '../hooks/useSpeech.js'
import { useChat } from '../hooks/useChat.js'
import { getSettings, saveSettings, migratePinIfNeeded } from '../utils/storage.js'
import { greetingWord } from '../utils/timeOfDay.js'
import { supabase } from '../lib/supabase.js'
import { fetchMessageById, markPlayed, fetchLatestUnplayed } from '../services/messageService.js'
import SingAlong from '../components/SingAlong.jsx'
import DailyActivity from '../components/DailyActivity.jsx'
import { getDailyActivity, isDailyActivityDismissed, dismissDailyActivity } from '../utils/dailyActivities.js'
import { getModeVoice } from '../utils/modeVoice.js'
import { pickRandom } from '../utils/prompts.js'
import styles from './ChildPage.module.css'

const WELCOME_BACK = [
  (childName, buddyName) => `Hey ${childName}, I'm back! What do you want to do now?`,
  (childName, buddyName) => `${buddyName}'s here again, ${childName}! Ready to keep having fun?`,
  (childName, buddyName) => `Ooh, ${childName}! Good to see you again — what's next?`,
]

// Buddy shouldn't just sit there waiting to be tapped — after a stretch of
// silence he proactively invites the child to do something.
const IDLE_NUDGE_MS = 45000
const IDLE_NUDGES = [
  (childName) => `Psst, ${childName}! I'm still here — want to chat, sing, or hear a joke?`,
  (childName) => `Hey ${childName}, I know a fun game — want to play 20 Questions with me?`,
  (childName) => `${childName}? I'm getting a little bored just sitting here — let's do something fun!`,
  (childName) => `Did you know I love surprises, ${childName}? Tap the mic and tell me something cool!`,
]

// This page can remount many times per browser session (parent settings,
// courses, lessons all navigate away and back) — only the very first mount
// gets the full greeting + daily activity; every mount after that gets a
// short varied welcome-back instead of repeating the same speech.
let hasGreetedFully = false

export default function ChildPage({ session }) {
  const navigate = useNavigate()
  const [settings, setSettings] = useState(() => getSettings())

  // One-time migration of any pre-existing plaintext parentPin to a hash.
  useEffect(() => {
    migratePinIfNeeded(getSettings()).then(setSettings)
  }, [])
  const [buddyText, setBuddyText] = useState('')
  const [userText, setUserText] = useState('')
  const [showPin, setShowPin] = useState(false)
  // First-run: force the avatar picker open before anything else so a brand-new
  // signup sees who their Buddy is, instead of only discovering the 🎨 button.
  const [showPicker, setShowPicker] = useState(() => !getSettings().onboarded)
  const [uiStatus, setUiStatus] = useState('idle') // idle | listening | thinking | speaking

  const speech = useSpeech(settings)
  const chat = useChat(settings)
  const [wordIndex, setWordIndex] = useState(-1)
  const rafRef = useRef(null)
  const [showActivity, setShowActivity] = useState(() => !hasGreetedFully && !isDailyActivityDismissed())
  const dailyActivity = getDailyActivity()
  const [parentMessage, setParentMessage] = useState(null)
  // null = nothing pending; 'ask' = Buddy is asking whether to hear it;
  // 'playing' = child said yes and the recording is playing/played.
  const [msgPhase, setMsgPhase] = useState(null)
  const parentAudioRef = useRef(null)
  // Timer ref for clearing bubble text after speech ends
  const bubbleClearRef = useRef(null)

  const childName       = settings.childName       || 'there'
  const buddyName       = settings.buddyName       || 'Buddy'
  const avatarType      = settings.avatarType      || 'bear'

  const handlePickerSave = ({ type, name, color }) => {
    const next = { ...settings, avatarType: type, buddyName: name, avatarColor: color, onboarded: true }
    saveSettings(next)
    setSettings(next)
    setShowPicker(false)
  }

  // "Maybe later" on first run still marks onboarding done so the picker
  // only ever force-opens once, not on every visit.
  const handlePickerClose = () => {
    if (!settings.onboarded) {
      const next = { ...settings, onboarded: true }
      saveSettings(next)
      setSettings(next)
    }
    setShowPicker(false)
  }

  // Camera streaming — listen for parent requests
  const cameraStreamRef = useRef(null)
  const cameraPcRef    = useRef(null)
  const cameraChRef    = useRef(null)
  const [cameraOn, setCameraOn] = useState(false)

  useEffect(() => {
    let mounted = true
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session?.user || !mounted) return
      const userId = session.user.id
      const channel = supabase.channel('camera-' + userId, { config: { private: true } })
      cameraChRef.current = channel

      channel.on('broadcast', { event: 'signal' }, async ({ payload }) => {
        if (payload.type === 'request') {
          try {
            const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true })
            cameraStreamRef.current = stream
            if (mounted) setCameraOn(true)

            const pc = new RTCPeerConnection({
              iceServers: [
                { urls: 'stun:stun.l.google.com:19302' },
                { urls: 'stun:stun1.l.google.com:19302' },
              ],
            })
            cameraPcRef.current = pc
            stream.getTracks().forEach((t) => pc.addTrack(t, stream))

            pc.onicecandidate = (e) => {
              if (e.candidate) {
                channel.send({ type: 'broadcast', event: 'signal',
                  payload: { type: 'ice-child', candidate: e.candidate.toJSON() } })
              }
            }

            const offer = await pc.createOffer()
            await pc.setLocalDescription(offer)
            channel.send({ type: 'broadcast', event: 'signal',
              payload: { type: 'offer', sdp: { type: offer.type, sdp: offer.sdp } } })
          } catch (err) {
            console.warn('Camera start error:', err)
          }
        }

        if (payload.type === 'answer' && cameraPcRef.current?.signalingState === 'have-local-offer') {
          await cameraPcRef.current.setRemoteDescription(
            new RTCSessionDescription(payload.sdp)
          )
        }

        if (payload.type === 'ice-parent' && cameraPcRef.current) {
          try { await cameraPcRef.current.addIceCandidate(new RTCIceCandidate(payload.candidate)) }
          catch (_) {}
        }

        if (payload.type === 'stop') {
          cameraStreamRef.current?.getTracks().forEach((t) => t.stop())
          cameraPcRef.current?.close()
          cameraStreamRef.current = null
          cameraPcRef.current    = null
          if (mounted) setCameraOn(false)
        }
      }).subscribe()
    })

    return () => {
      mounted = false
      cameraStreamRef.current?.getTracks().forEach((t) => t.stop())
      cameraPcRef.current?.close()
      cameraChRef.current?.unsubscribe()
    }
  }, [])

  // Realtime: listen for parent voice messages sent while this page is open.
  useEffect(() => {
    let channel
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session?.user) return
      const userId = session.user.id
      channel = supabase
        .channel('child-messages-' + userId)
        .on('postgres_changes', {
          event: 'INSERT',
          schema: 'public',
          table: 'parent_messages',
          filter: `user_id=eq.${userId}`,
        }, async (payload) => {
          // Fetch full row (audio_data too large for realtime payload)
          const msg = await fetchMessageById(payload.new.id).catch(() => null)
          if (msg) { setParentMessage(msg); setMsgPhase('ask') }
        })
        .subscribe()
    })
    return () => { channel?.unsubscribe() }
  }, [])

  // Catch messages sent before this page was ever opened — realtime only
  // fires for inserts that happen while subscribed, so anything sent
  // earlier (or while the child's device was offline) needs an explicit
  // check on load.
  useEffect(() => {
    fetchLatestUnplayed().then((row) => {
      if (!row) return
      return fetchMessageById(row.id)
    }).then((msg) => {
      if (msg) { setParentMessage(msg); setMsgPhase('ask') }
    }).catch(() => {})
  }, [])

  // Buddy announces the message and asks whether to hear it, then listens
  // for a yes/no — the recording never auto-plays without asking first.
  useEffect(() => {
    if (msgPhase !== 'ask' || !parentMessage) return
    speech.stopListening()
    const prompt = "You have a message from your parent! Do you want to hear it?"
    setBuddyText(prompt)
    setUiStatus('speaking')
    speech.speak(prompt, () => {
      if (!speech.supported.stt) { setUiStatus('idle'); return } // wait for the tap-buttons instead
      setUiStatus('listening')
      speech.startListening((transcript) => {
        setUiStatus('idle')
        if (/\b(yes|yeah|yep|sure|please|ok|okay)\b/i.test(transcript)) {
          playParentMessageNow()
        } else {
          setMsgPhase(null)
          setBuddyText('')
        }
      })
    })
  }, [msgPhase]) // eslint-disable-line react-hooks/exhaustive-deps

  const playParentMessageNow = () => {
    if (!parentMessage) return
    speech.stopSpeaking()
    speech.stopListening()
    const audio = new Audio(parentMessage.audioUrl)
    parentAudioRef.current = audio
    audio.onended = () => { parentAudioRef.current = null }
    audio.onerror = () => { parentAudioRef.current = null }
    audio.play().catch(() => {})
    setMsgPhase('playing')
  }

  const declineParentMessage = () => {
    speech.stopListening()
    setMsgPhase(null)
    setBuddyText('')
  }

  const dismissParentMessage = () => {
    parentAudioRef.current?.pause()
    parentAudioRef.current = null
    if (parentMessage) markPlayed(parentMessage.id).catch(() => {})
    setParentMessage(null)
    setMsgPhase(null)
  }

  const replayParentMessage = () => {
    if (!parentMessage) return
    const audio = new Audio(parentMessage.audioUrl)
    parentAudioRef.current = audio
    audio.onended = () => { parentAudioRef.current = null }
    audio.play().catch(() => {})
  }

  // Helper: schedule bubble fade-out after speech ends
  const scheduleBubbleClear = useCallback((delay = 1500) => {
    if (bubbleClearRef.current) clearTimeout(bubbleClearRef.current)
    bubbleClearRef.current = setTimeout(() => {
      setBuddyText('')
      setUserText('')
    }, delay)
  }, [])

  const cancelBubbleClear = useCallback(() => {
    if (bubbleClearRef.current) {
      clearTimeout(bubbleClearRef.current)
      bubbleClearRef.current = null
    }
  }, [])

  const handleDismissActivity = () => {
    dismissDailyActivity()
    setShowActivity(false)
  }

  // Boot greeting — Buddy announces the daily activity by voice instead of
  // it sitting in a persistent card; the card itself hides the moment he's
  // done speaking it. Only the first mount this session gets the full
  // greeting; returning from parent settings/courses/lessons gets a short
  // varied welcome-back instead of repeating the same speech.
  useEffect(() => {
    const isFirstGreeting = !hasGreetedFully
    hasGreetedFully = true

    const activityPart = isFirstGreeting && showActivity
      ? ` Oh, and here is today's activity — ${dailyActivity.description}`
      : ''
    const greet = isFirstGreeting
      ? `${greetingWord()}, ${childName}! I'm ${buddyName}! Pick something to do, or just tap the mic and talk to me!${activityPart}`
      : pickRandom(WELCOME_BACK)(childName, buddyName)
    setBuddyText(greet)
    setUiStatus('speaking')
    speech.speak(greet, () => {
      setUiStatus('idle')
      if (isFirstGreeting) setShowActivity(false)
      scheduleBubbleClear()
    })
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // Idle nudge — Buddy doesn't just wait silently forever for a tap; after
  // a stretch of quiet he proactively invites the child to do something.
  useEffect(() => {
    if (uiStatus !== 'idle' || showPin || showPicker || msgPhase || chat.mode !== 'chat') return
    const id = setTimeout(() => {
      const nudge = pickRandom(IDLE_NUDGES)(childName)
      setBuddyText(nudge)
      setUiStatus('speaking')
      speech.speak(nudge, () => {
        setUiStatus('idle')
        scheduleBubbleClear()
      })
    }, IDLE_NUDGE_MS)
    return () => clearTimeout(id)
  }, [uiStatus, showPin, showPicker, msgPhase, chat.mode, childName, speech, scheduleBubbleClear])

  // Sing mode plays real recordings inside <SingAlong>; no separate
  // background track here (the old Pixabay loop hot-link-404'd anyway).

  // Word-by-word karaoke tracker (bouncing dot + colour highlight) — active
  // for every reply Buddy speaks, not just special modes.
  useEffect(() => {
    if (uiStatus !== 'speaking' || !buddyText) {
      setWordIndex(-1)
      if (rafRef.current) { cancelAnimationFrame(rafRef.current); rafRef.current = null }
      return
    }
    const words = buddyText.trim().split(/\s+/).filter(Boolean)
    if (!words.length) return
    // Char-proportion: words with more characters get proportionally more time
    const totalChars = words.reduce((s, w) => s + w.length, 0)
    const tick = () => {
      const audio = speech.audioRef.current
      if (audio && audio.duration > 0) {
        const charPos = Math.min(audio.currentTime / audio.duration, 1) * totalChars
        let cumChars = 0
        let idx = words.length - 1
        for (let i = 0; i < words.length; i++) {
          cumChars += words[i].length
          if (charPos <= cumChars) { idx = i; break }
        }
        setWordIndex(idx)
      } else if (speech.boundaryWordRef.current >= 0) {
        setWordIndex(Math.min(speech.boundaryWordRef.current, words.length - 1))
      }
      rafRef.current = requestAnimationFrame(tick)
    }
    rafRef.current = requestAnimationFrame(tick)
    return () => {
      if (rafRef.current) { cancelAnimationFrame(rafRef.current); rafRef.current = null }
      setWordIndex(-1)
    }
  }, [uiStatus, buddyText]) // eslint-disable-line react-hooks/exhaustive-deps


  const handleStartSing = useCallback(() => {
    cancelBubbleClear()
    const intro = chat.switchMode('sing')
    setBuddyText(intro)
    setUserText('')
    setUiStatus('speaking')
    speech.speak(intro, () => {
      setUiStatus('idle')
      scheduleBubbleClear()
    }, getModeVoice('sing'))
  }, [chat, speech, scheduleBubbleClear, cancelBubbleClear])

  const handleUserSpeech = useCallback((transcript) => {
    cancelBubbleClear()
    setUserText(transcript)
    setUiStatus('thinking')
    setBuddyText('')

    chat.sendMessage(transcript, chat.mode).then((reply) => {
      setBuddyText(reply)
      setUiStatus('speaking')
      speech.speak(reply, () => {
        setUiStatus('idle')
        scheduleBubbleClear()
        if (settings.autoListen) {
          setTimeout(() => handleVoicePress(), 500)
        }
      }, getModeVoice(chat.mode))
    })
  }, [chat, speech, settings.autoListen, scheduleBubbleClear, cancelBubbleClear])

  const handleVoicePress = useCallback(() => {
    if (uiStatus === 'listening') {
      speech.stopListening()
      setUiStatus('idle')
      return
    }
    if (uiStatus !== 'idle') return
    cancelBubbleClear()
    setUiStatus('listening')
    speech.startListening(handleUserSpeech)
  }, [uiStatus, speech, handleUserSpeech, cancelBubbleClear])

  const handlePinSuccess = () => {
    setShowPin(false)
    navigate('/parent')
  }

  const voiceOnly = settings.voiceOnly || false

  if (voiceOnly) {
    return (
      <div className={styles.voicePage}>
        <div className={styles.voiceMenuWrap}>
          <BuddyMenu
            variant="dark"
            onSongs={handleStartSing}
            onLearn={() => navigate('/courses')}
            onCustomize={() => setShowPicker(true)}
            onSettings={() => setShowPin(true)}
          />
        </div>

        <div className={`${styles.voiceOrb} ${styles[`orb_${uiStatus}`]}`} />
        <p className={styles.voiceBuddyText}>{buddyText}</p>
        {userText ? <p className={styles.voiceUserText}>You: {userText}</p> : null}

        <VoiceButton status={uiStatus} onPress={handleVoicePress} buddyName={buddyName} />

        {showPin && (
          <>
            <ParentPin correctPinHash={settings.parentPinHash} onSuccess={handlePinSuccess} />
            <button className={styles.pinDismiss} onClick={() => setShowPin(false)} aria-label="Cancel" />
          </>
        )}

        <ParentMessageOverlay
          msgPhase={msgPhase}
          envelopeClass={styles.envelopeBtn}
          onEnvelopeClick={() => setMsgPhase('ask')}
          onYes={playParentMessageNow}
          onNo={declineParentMessage}
          onReplay={replayParentMessage}
          onDismiss={dismissParentMessage}
        />
      </div>
    )
  }

  // Sing mode renders its own full-screen overlay
  if (chat.mode === 'sing') {
    return (
      <>
        <SingAlong
          onExit={() => {
            cancelBubbleClear()
            const intro = chat.switchMode('chat')
            setBuddyText(intro)
            setUserText('')
            setUiStatus('speaking')
            speech.speak(intro, () => {
              setUiStatus('idle')
              scheduleBubbleClear()
            })
          }}
        />
        <ParentMessageOverlay
          msgPhase={msgPhase}
          envelopeClass={styles.envelopeFloat}
          onEnvelopeClick={() => setMsgPhase('ask')}
          onYes={playParentMessageNow}
          onNo={declineParentMessage}
          onReplay={replayParentMessage}
          onDismiss={dismissParentMessage}
        />
      </>
    )
  }

  return (
    <div className={styles.page}>
      <WorldBackdrop />

      {/* Daily activity — Buddy announces it by voice on boot; this card
          just echoes it briefly, then fades once he's done speaking. */}
      <div className={`${styles.activityFloat} ${showActivity && chat.mode === 'chat' ? styles.activityVisible : ''}`}>
        <DailyActivity activity={dailyActivity} onDismiss={handleDismissActivity} />
      </div>

      {/* Layout: stacks vertically on phones (mode tiles at bottom), becomes
          a main-content + left-sidebar pair on tablet/desktop (>=768px) so
          the mode tiles don't look stranded at the bottom of a wide screen. */}
      <div className={styles.layout}>
        <div className={styles.mainColumn}>
          {/* Top bar */}
          <div className={styles.topBar}>
            <div className={styles.topBarLeft}>
              <span className={styles.modeLabel}>
                {chat.mode !== 'chat' ? `${chat.mode} mode` : `${greetingWord()}, ${childName}!`}
              </span>
              <Clock className={styles.clockBadge} />
            </div>
            <div className={styles.topBarRight}>
              {parentMessage && (
                <button
                  className={styles.envelopeBtn}
                  onClick={() => setMsgPhase('ask')}
                  aria-label="Message from your parent, tap to hear it"
                  title="Message from your parent!"
                >
                  📩
                </button>
              )}
              {cameraOn && <span className={styles.cameraIndicator} title="Camera on">📹</span>}
              <BuddyMenu
                onSongs={handleStartSing}
                onLearn={() => navigate('/courses')}
                onCustomize={() => setShowPicker(true)}
                onSettings={() => setShowPin(true)}
              />
            </div>
          </div>

          {/* Avatar */}
          <div className={styles.avatarArea}>
            {/* Rolling hills — gives Buddy a ground to stand on, right behind
                his feet. The translucent white fills auto-tint to whichever
                mode gradient is behind them. */}
            <svg className={styles.hills} viewBox="0 0 375 60" preserveAspectRatio="none" aria-hidden="true">
              <path d="M0 35 Q60 16 140 31 T375 26 V60 H0 Z" fill="rgba(255,255,255,0.28)" />
              <path d="M0 48 Q100 30 210 45 T375 41 V60 H0 Z" fill="rgba(255,255,255,0.45)" />
            </svg>
            <p className={styles.buddyNameTag}>{buddyName}</p>
            <BuddyAvatar status={uiStatus} avatarColor={settings.avatarColor} type={avatarType} audioRef={speech.audioRef} />
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

          {/* Voice button — main CTA, above the mode strip */}
          <div className={styles.voiceArea}>
            {!speech.supported.stt && (
              <p className={styles.noMic}>
                Voice not supported in this browser. Try Chrome!
              </p>
            )}
            <VoiceButton status={uiStatus} onPress={handleVoicePress} buddyName={buddyName} />
          </div>
        </div>
      </div>

      {/* PIN gate */}
      {showPin && (
        <ParentPin
          correctPinHash={settings.parentPinHash}
          onSuccess={handlePinSuccess}
        />
      )}

      {/* Tap anywhere on overlay to dismiss PIN */}
      {showPin && (
        <button
          className={styles.pinDismiss}
          onClick={() => setShowPin(false)}
          aria-label="Cancel"
        />
      )}

      {/* Avatar + name picker */}
      {showPicker && (
        <AvatarPicker
          currentType={avatarType}
          currentName={buddyName}
          currentColor={settings.avatarColor}
          onSave={handlePickerSave}
          onClose={handlePickerClose}
        />
      )}

      {/* Parent voice message: envelope already lives in the top bar above,
          so this only renders the ask/playing bubble. */}
      <ParentMessageOverlay
        msgPhase={msgPhase}
        showEnvelope={false}
        onYes={playParentMessageNow}
        onNo={declineParentMessage}
        onReplay={replayParentMessage}
        onDismiss={dismissParentMessage}
      />
    </div>
  )
}

/* Parent voice message: envelope indicator + ask-first / playing bubble.
   Shared across the default, voice-only, and sing-mode screens so the
   ask-then-play flow stays identical everywhere a message can appear. */
function ParentMessageOverlay({ msgPhase, showEnvelope = true, envelopeClass, onEnvelopeClick, onYes, onNo, onReplay, onDismiss }) {
  if (!msgPhase) return null
  return (
    <>
      {showEnvelope && (
        <button
          className={envelopeClass}
          onClick={onEnvelopeClick}
          aria-label="Message from your parent, tap to hear it"
          title="Message from your parent!"
        >
          📩
        </button>
      )}
      <div className={styles.msgOverlay}>
        <div className={styles.msgBubble}>
          <div className={styles.msgIcon}>📩</div>
          {msgPhase === 'ask' ? (
            <>
              <p className={styles.msgTitle}>Message from your parent! Want to hear it?</p>
              <button className={styles.msgPlayBtn} onClick={onYes}>▶ Yes, play it!</button>
              <button className={styles.msgDismissBtn} onClick={onNo}>Not now</button>
            </>
          ) : (
            <>
              <p className={styles.msgTitle}>Message from your parent!</p>
              <button className={styles.msgPlayBtn} onClick={onReplay}>▶ Play again</button>
              <button className={styles.msgDismissBtn} onClick={onDismiss}>Got it!</button>
            </>
          )}
        </div>
      </div>
    </>
  )
}
