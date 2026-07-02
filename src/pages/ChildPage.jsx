import { useState, useCallback, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import BuddyAvatar from '../components/BuddyAvatar.jsx'
import SpeechBubble from '../components/SpeechBubble.jsx'
import VoiceButton from '../components/VoiceButton.jsx'
import ModeSelector from '../components/ModeSelector.jsx'
import ParentPin from '../components/ParentPin.jsx'
import AvatarPicker from '../components/AvatarPicker.jsx'
import UpgradePrompt from '../components/UpgradePrompt.jsx'
import { useSpeech } from '../hooks/useSpeech.js'
import { useChat } from '../hooks/useChat.js'
import { useSubscription } from '../hooks/useSubscription.jsx'
import { getSettings, saveSettings } from '../utils/storage.js'
import { supabase } from '../lib/supabase.js'
import { fetchMessageById, markPlayed } from '../services/messageService.js'
import SingAlong from '../components/SingAlong.jsx'
import DailyActivity from '../components/DailyActivity.jsx'
import { getDailyActivity, isDailyActivityDismissed, dismissDailyActivity } from '../utils/dailyActivities.js'
import styles from './ChildPage.module.css'

export default function ChildPage({ session }) {
  const navigate = useNavigate()
  const [settings, setSettings] = useState(() => getSettings())
  const [buddyText, setBuddyText] = useState('')
  const [userText, setUserText] = useState('')
  const [showPin, setShowPin] = useState(false)
  const [showPicker, setShowPicker] = useState(false)
  const [uiStatus, setUiStatus] = useState('idle') // idle | listening | thinking | speaking

  const speech = useSpeech(settings)
  const chat = useChat(settings)
  const { isPro, tier, daysLeft } = useSubscription()
  const [wordIndex, setWordIndex] = useState(-1)
  const [showUpgrade, setShowUpgrade] = useState(false)
  const rafRef = useRef(null)
  const [showActivity, setShowActivity] = useState(() => !isDailyActivityDismissed())
  const dailyActivity = getDailyActivity()
  const [parentMessage, setParentMessage] = useState(null)
  const parentAudioRef = useRef(null)
  // Timer ref for clearing bubble text after speech ends
  const bubbleClearRef = useRef(null)

  const childName       = settings.childName       || 'there'
  const buddyName       = settings.buddyName       || 'Buddy'
  const avatarType      = settings.avatarType      || 'bear'
  const wakeWordEnabled = settings.wakeWordEnabled || false
  const wakePhrase      = `hey ${buddyName}`.toLowerCase()

  const handlePickerSave = ({ type, name, color }) => {
    const next = { ...settings, avatarType: type, buddyName: name, avatarColor: color }
    saveSettings(next)
    setSettings(next)
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

  // Realtime: listen for parent voice messages
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
          if (msg) setParentMessage(msg)
        })
        .subscribe()
    })
    return () => { channel?.unsubscribe() }
  }, [])

  // Auto-play parent message when it arrives — overlay stays until "Got it!"
  useEffect(() => {
    if (!parentMessage) return
    speech.stopSpeaking()
    speech.stopListening()
    const audio = new Audio(parentMessage.audioUrl)
    parentAudioRef.current = audio
    audio.onended = () => { parentAudioRef.current = null }
    audio.onerror = () => { parentAudioRef.current = null }
    audio.play().catch(() => {})
  }, [parentMessage]) // eslint-disable-line react-hooks/exhaustive-deps

  const dismissParentMessage = () => {
    parentAudioRef.current?.pause()
    parentAudioRef.current = null
    if (parentMessage) markPlayed(parentMessage.id).catch(() => {})
    setParentMessage(null)
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

  // Boot greeting
  useEffect(() => {
    const activityPart = showActivity
      ? ` Oh, and here is today's activity — ${dailyActivity.description}`
      : ''
    const greet = `Hi ${childName}! I'm ${buddyName}! Pick something to do, or just tap the mic and talk to me!${activityPart}`
    setBuddyText(greet)
    setUiStatus('speaking')
    speech.speak(greet, () => {
      setUiStatus('idle')
      scheduleBubbleClear()
    })
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // Sing mode plays real recordings inside <SingAlong>; no separate
  // background track here (the old Pixabay loop hot-link-404'd anyway).

  // Story/sing-mode word-by-word reading tracker (karaoke dot)
  const isTrackedMode = chat.mode === 'story' || chat.mode === 'sing'
  useEffect(() => {
    if (!isTrackedMode || uiStatus !== 'speaking' || !buddyText) {
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
  }, [isTrackedMode, uiStatus, buddyText]) // eslint-disable-line react-hooks/exhaustive-deps

  const handleVoicePressRef = useRef(null)

  // Wake word loop — active when idle and wake word is enabled
  useEffect(() => {
    if (!wakeWordEnabled || uiStatus !== 'idle') {
      speech.stopWakeWord()
      return
    }
    speech.startWakeWord(wakePhrase, () => {
      handleVoicePressRef.current?.()
    })
    return () => speech.stopWakeWord()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [wakeWordEnabled, uiStatus, wakePhrase])

  const handleModeSelect = useCallback((modeId) => {
    cancelBubbleClear()
    const intro = chat.switchMode(modeId)
    setBuddyText(intro)
    setUserText('')
    setUiStatus('speaking')
    speech.speak(intro, () => {
      setUiStatus('idle')
      scheduleBubbleClear()
    })
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
      })
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
    speech.stopWakeWord()
    setUiStatus('listening')
    speech.startListening(handleUserSpeech)
  }, [uiStatus, speech, handleUserSpeech, cancelBubbleClear])

  handleVoicePressRef.current = handleVoicePress

  const handlePinSuccess = () => {
    setShowPin(false)
    navigate('/parent')
  }

  const voiceOnly = settings.voiceOnly || false

  const modeColors = {
    chat:     ['#ff9ecf', '#a78bfa'],
    story:    ['#b794f6', '#7cc4fb'],
    game:     ['#ff8fc7', '#d56bf0'],
    activity: ['#ffb15c', '#ffd76b'],
    routine:  ['#6ee7b7', '#7cc4fb'],
    quiz:     ['#7cc4fb', '#a78bfa'],
    jokes:    ['#ffd76b', '#ffa94d'],
    sing:     ['#ff8fc7', '#b794f6'],
    feelings: ['#8ec5ff', '#b794f6'],
    move:     ['#6ee7b7', '#ffd76b'],
    learn:    ['#a78bfa', '#7cc4fb'],
  }
  const [from, to] = modeColors[chat.mode] || modeColors.chat

  if (voiceOnly) {
    return (
      <div className={styles.voicePage}>
        <button
          className={styles.voiceSettingsBtn}
          onClick={() => setShowPin(true)}
          aria-label="Parent settings"
        >⚙️</button>

        <div className={`${styles.voiceOrb} ${styles[`orb_${uiStatus}`]}`} />
        <p className={styles.voiceBuddyText}>{buddyText}</p>
        {userText ? <p className={styles.voiceUserText}>You: {userText}</p> : null}

        <VoiceButton status={uiStatus} onPress={handleVoicePress} buddyName={buddyName} />
        {wakeWordEnabled && uiStatus === 'idle' && (
          <p className={styles.wakeHint}>Say &ldquo;Hey {buddyName}&rdquo;</p>
        )}

        {showPin && (
          <>
            <ParentPin correctPin={settings.parentPin} onSuccess={handlePinSuccess} />
            <button className={styles.pinDismiss} onClick={() => setShowPin(false)} aria-label="Cancel" />
          </>
        )}

        {parentMessage && (
          <>
            <button className={styles.envelopeBtn} aria-label="Parent message waiting">📩</button>
            <div className={styles.msgOverlay}>
              <div className={styles.msgBubble}>
                <div className={styles.msgIcon}>📩</div>
                <p className={styles.msgTitle}>Message from your parent!</p>
                <button className={styles.msgPlayBtn} onClick={replayParentMessage}>▶ Play again</button>
                <button className={styles.msgDismissBtn} onClick={dismissParentMessage}>Got it!</button>
              </div>
            </div>
          </>
        )}
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
        {parentMessage && (
          <>
            <button
              className={styles.envelopeFloat}
              onClick={() => {}}
              aria-label="Parent message waiting"
            >
              📩
            </button>
            <div className={styles.msgOverlay}>
              <div className={styles.msgBubble}>
                <div className={styles.msgIcon}>📩</div>
                <p className={styles.msgTitle}>Message from your parent!</p>
                <button className={styles.msgPlayBtn} onClick={replayParentMessage}>▶ Play again</button>
                <button className={styles.msgDismissBtn} onClick={dismissParentMessage}>Got it!</button>
              </div>
            </div>
          </>
        )}
      </>
    )
  }

  return (
    <div
      className={styles.page}
      style={{ background: `linear-gradient(160deg, ${from} 0%, ${to} 100%)` }}
    >
      {/* Floating background decorations */}
      <div className={styles.deco} aria-hidden="true">
        <span className={styles.d1}>✦</span>
        <span className={styles.d2}>★</span>
        <span className={styles.d3}>✧</span>
        <span className={styles.d4}>☆</span>
        <span className={styles.d5}>✦</span>
        <span className={styles.d6}>★</span>
        <span className={styles.d7}>✧</span>
        <span className={styles.d8}>✦</span>
        <span className={styles.d9}>☆</span>
        <span className={styles.d10}>★</span>
      </div>

      {/* Top bar */}
      <div className={styles.topBar}>
        <span className={styles.modeLabel}>
          {chat.mode !== 'chat' ? `${chat.mode} mode` : `Hi, ${childName}!`}
        </span>
        {parentMessage && (
          <button
            className={styles.envelopeBtn}
            aria-label="Parent message waiting"
            title="Message from your parent!"
          >
            📩
          </button>
        )}
        {cameraOn && <span className={styles.cameraIndicator} title="Camera on">📹</span>}
        <button
          className={styles.customizeBtn}
          onClick={() => setShowPicker(true)}
          aria-label="Customise buddy"
        >
          🎨
        </button>
        <button
          className={styles.settingsBtn}
          onClick={() => setShowPin(true)}
          aria-label="Parent settings"
        >
          ⚙️
        </button>
      </div>

      {/* Avatar */}
      <div className={styles.avatarArea}>
        <BuddyAvatar status={uiStatus} avatarColor={settings.avatarColor} type={avatarType} audioRef={speech.audioRef} />
        <p className={styles.buddyNameTag}>{buddyName}</p>
      </div>

      {/* Speech bubble */}
      <div className={styles.bubbleArea}>
        <SpeechBubble
          buddyText={buddyText}
          userText={userText}
          status={uiStatus}
          storyMode={isTrackedMode}
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
        {wakeWordEnabled && uiStatus === 'idle' && (
          <p className={styles.wakeHint}>Say &ldquo;Hey {buddyName}&rdquo;</p>
        )}
      </div>

      {/* Mode selector — bottom strip, shown when idle or listening */}
      {(uiStatus === 'idle' || uiStatus === 'listening') && (
        <div className={styles.modesArea}>
          {showActivity && chat.mode === 'chat' && (
            <DailyActivity activity={dailyActivity} onDismiss={handleDismissActivity} />
          )}
          <ModeSelector
            currentMode={chat.mode}
            onSelect={handleModeSelect}
            onUpgrade={() => setShowUpgrade(true)}
          />
          <div className={styles.coursesRow}>
            <button className={styles.coursesBtn} onClick={() => navigate('/courses')}>
              📚 Courses {!isPro && <span className={styles.coursesPro}>Pro</span>}
            </button>
            {tier === 'trial' && daysLeft !== null && (
              <span className={styles.trialBadge}>Trial: {daysLeft}d left</span>
            )}
          </div>
        </div>
      )}

      {/* PIN gate */}
      {showPin && (
        <ParentPin
          correctPin={settings.parentPin}
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
          onClose={() => setShowPicker(false)}
        />
      )}

      {/* Upgrade prompt */}
      {showUpgrade && (
        <UpgradePrompt session={session} onClose={() => setShowUpgrade(false)} />
      )}

      {/* Parent voice message overlay */}
      {parentMessage && (
        <div className={styles.msgOverlay}>
          <div className={styles.msgBubble}>
            <div className={styles.msgIcon}>📩</div>
            <p className={styles.msgTitle}>Message from your parent!</p>
            <button
              className={styles.msgPlayBtn}
              onClick={replayParentMessage}
            >
              ▶ Play again
            </button>
            <button
              className={styles.msgDismissBtn}
              onClick={dismissParentMessage}
            >
              Got it!
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
