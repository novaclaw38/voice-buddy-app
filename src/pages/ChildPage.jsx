import { useState, useCallback, useEffect, useRef } from 'react'
import useFocusTrap from '../hooks/useFocusTrap.js'
import { useNavigate } from 'react-router-dom'
import BuddyAvatar from '../components/BuddyAvatar.jsx'
import SpeechBubble from '../components/SpeechBubble.jsx'
import VoiceButton from '../components/VoiceButton.jsx'
import BuddyMenu from '../components/BuddyMenu.jsx'
import ParentPin from '../components/ParentPin.jsx'
import AvatarPicker from '../components/AvatarPicker.jsx'
import UpgradePrompt from '../components/UpgradePrompt.jsx'
import WorldBackdrop from '../components/WorldBackdrop.jsx'
import Clock from '../components/Clock.jsx'
import { useSpeech } from '../hooks/useSpeech.js'
import { useChat } from '../hooks/useChat.js'
import { useTimeOfDay } from '../hooks/useTimeOfDay.js'
import { useSubscription } from '../hooks/useSubscription.jsx'
import { useLiveKitAvatarVoice } from '../hooks/useLiveKitAvatarVoice.js'
import { getSettings, saveSettings, migratePinIfNeeded, getActiveChildId } from '../utils/storage.js'
import { ensureActiveChildMigrated, updateChild } from '../services/childrenService.js'
import { getTodayMinutesUsed, addMinutesUsed, resetTodayUsage } from '../utils/screenTime.js'
import { greetingWord } from '../utils/timeOfDay.js'
import { supabase } from '../lib/supabase.js'
import { fetchMessageById, markPlayed, fetchLatestUnplayed } from '../services/messageService.js'
import { fetchLatestUndelivered, markStoryDelivered } from '../services/storyRequestService.js'
import { startAsChild } from '../services/cameraSignal.js'
import SingAlong from '../components/SingAlong.jsx'
import DailyActivity from '../components/DailyActivity.jsx'
import { getDailyActivity, isDailyActivityDismissed, dismissDailyActivity } from '../utils/dailyActivities.js'
import SkipLink from '../components/SkipLink.jsx'
import { getModeVoice } from '../utils/modeVoice.js'
import { pickRandomDistinct } from '../utils/prompts.js'
import styles from './ChildPage.module.css'
import { IconMail, IconCamera, IconPlay, IconMusic, IconBook, IconPalette, IconGear, IconSparkle } from '../components/icons.jsx'

const WELCOME_BACK = [
  (childName, buddyName) => `Hey ${childName}, I'm back! What do you want to do now?`,
  (childName, buddyName) => `${buddyName}'s here again, ${childName}! Ready to keep having fun?`,
  (childName, buddyName) => `Ooh, ${childName}! Good to see you again — what's next?`,
  (childName, buddyName) => `${childName}! You're back! I missed you — what should we do?`,
  (childName, buddyName) => `Welcome back, ${childName}! I've got all sorts of fun ideas — want to hear one?`,
  (childName, buddyName) => `Hey hey, ${childName}! ${buddyName}'s ready for round two — what sounds fun?`,
  (childName, buddyName) => `${childName}, perfect timing — I was just thinking about you! What's up?`,
  (childName, buddyName) => `Back again, ${childName}? Awesome! Let's find something fun to do.`,
]

// Buddy shouldn't just sit there waiting to be tapped — after a stretch of
// silence he proactively invites the child to do something.
const IDLE_NUDGE_MS = 45000
const IDLE_NUDGES = [
  (childName) => `Psst, ${childName}! I'm still here — want to chat, sing, or hear a joke?`,
  (childName) => `Hey ${childName}, I know a fun game — want to play 20 Questions with me?`,
  (childName) => `${childName}? I'm getting a little bored just sitting here — let's do something fun!`,
  (childName) => `Did you know I love surprises, ${childName}? Tap the mic and tell me something cool!`,
  (childName) => `${childName}, I just thought of a silly joke — want to hear it?`,
  (childName) => `Still there, ${childName}? Let's do something — a song, a story, or just talk!`,
  (childName) => `${childName}, I bet I can guess your favorite animal — want to try me?`,
  (childName) => `Whenever you're ready, ${childName}, I've got games, songs, and stories waiting!`,
]

// This page can remount many times per browser session (parent settings,
// courses, lessons all navigate away and back) — only the very first mount
// gets the full greeting + daily activity; every mount after that gets a
// short varied welcome-back instead of repeating the same speech. The two
// index trackers are module-level (not component refs) for the same
// reason — they need to survive across those remounts to avoid an
// immediate repeat right after navigating away and back.
let hasGreetedFully = false
const welcomeBackIndex = { current: -1 }
const idleNudgeIndex = { current: -1 }

export default function ChildPage({ session }) {
  const navigate = useNavigate()
  const [settings, setSettings] = useState(() => getSettings())

  // One-time migrations: pick/create the active child profile first (so
  // settings resolve from the right namespaced slot), then hash any
  // pre-existing plaintext parentPin. Both are idempotent and cheap once
  // already done.
  useEffect(() => {
    ensureActiveChildMigrated()
      .catch((err) => { console.error('Child profile migration failed, using local settings:', err) })
      .then(() => migratePinIfNeeded(getSettings()))
      .then(setSettings)
  }, [])
  const [buddyText, setBuddyText] = useState('')
  const [userText, setUserText] = useState('')
  const [showPin, setShowPin] = useState(false)
  const [upgradeTrigger, setUpgradeTrigger] = useState(null)
  // First-run: force the avatar picker open before anything else so a brand-new
  // signup sees who their Buddy is, instead of only discovering the 🎨 button.
  const [showPicker, setShowPicker] = useState(() => !getSettings().onboarded)
  const [uiStatus, setUiStatus] = useState('idle') // idle | listening | thinking | speaking

  const speech = useSpeech(settings)
  const chat = useChat(settings)
  const { partOfDay } = useTimeOfDay()
  const { isPro } = useSubscription()
  const liveKitVoice = useLiveKitAvatarVoice()
  const [wordIndex, setWordIndex] = useState(-1)
  const rafRef = useRef(null)
  const [showActivity, setShowActivity] = useState(() => !hasGreetedFully && !isDailyActivityDismissed())
  const dailyActivity = getDailyActivity()
  const [parentMessage, setParentMessage] = useState(null)
  // null = nothing pending; 'ask' = Buddy is asking whether to hear it;
  // 'playing' = child said yes and the recording is playing/played.
  const [msgPhase, setMsgPhase] = useState(null)
  const parentAudioRef = useRef(null)

  // ── Screen-time limit (Pro) ──────────────────────────────────────────
  // Ticks while the tab is visible, in real wall-clock minutes — a paused/
  // backgrounded tab doesn't burn down the limit. Resets automatically at
  // local midnight since the storage key is date-scoped.
  const dailyLimit = isPro ? (settings.dailyLimitMinutes || 0) : 0
  const [minutesUsed, setMinutesUsed] = useState(() => getTodayMinutesUsed(getActiveChildId()))
  const [showWindDown, setShowWindDown] = useState(false)
  const [showWindDownPin, setShowWindDownPin] = useState(false)
  const [showFreeLimit, setShowFreeLimit] = useState(false)
  const [showFreeLimitPin, setShowFreeLimitPin] = useState(false)
  const warnedRef = useRef(false)

  useEffect(() => {
    if (!dailyLimit) return
    const TICK_MINUTES = 0.5
    const id = setInterval(() => {
      if (document.hidden) return
      const total = addMinutesUsed(getActiveChildId(), TICK_MINUTES)
      setMinutesUsed(total)
      const left = dailyLimit - total
      if (left <= 5 && !warnedRef.current) {
        warnedRef.current = true
        speech.speak("Just a heads up — five more minutes, then it's time for a little break!")
      }
      if (left <= 0) setShowWindDown(true)
    }, TICK_MINUTES * 60 * 1000)
    return () => clearInterval(id)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dailyLimit])

  const handleWindDownUnlock = () => {
    resetTodayUsage(getActiveChildId())
    setMinutesUsed(0)
    warnedRef.current = false
    setShowWindDown(false)
    setShowWindDownPin(false)
  }
  // Timer ref for clearing bubble text after speech ends
  const bubbleClearRef = useRef(null)

  const childName       = settings.childName       || 'there'
  const buddyName       = settings.buddyName       || 'Buddy'
  const avatarType      = settings.avatarType      || 'bear'

  const handlePickerSave = ({ type, name, color, costume, age }) => {
    const next = { ...settings, avatarType: type, buddyName: name, avatarColor: color, costume, childAge: age, onboarded: true }
    saveSettings(next)
    setSettings(next)
    setShowPicker(false)
    // Keep the cloud child row (used by the Parent dashboard's child
    // switcher) in sync with the local identity fields.
    const childId = getActiveChildId()
    if (childId) {
      updateChild(childId, { buddyName: name, avatarType: type, avatarColor: color }).catch(() => {})
    }
  }

  // First-run PIN creation — persist the hash so the gate is real from here
  // on. Previously every account silently defaulted to 1234.
  const handlePinCreate = (hash) => {
    const next = { ...settings, parentPinHash: hash }
    saveSettings(next)
    setSettings(next)
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

  // Camera streaming — listen for parent check-in requests. Protocol lives
  // in services/cameraSignal.js; this page only maps status to the
  // indicator dot ('error' collapses to off, same as 'idle' — a young
  // child shouldn't see a camera-error message).
  const [cameraOn, setCameraOn] = useState(false)

  useEffect(() => {
    let mounted = true
    let handle = null
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session?.user || !mounted) return
      handle = startAsChild(session.user.id, {
        onStatusChange: (status) => { if (mounted) setCameraOn(status === 'streaming') },
      })
    })

    return () => {
      mounted = false
      handle?.stop()
    }
  }, [])

  // Realtime: listen for parent voice messages sent while this page is open.
  useEffect(() => {
    let mounted = true
    let channel
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session?.user || !mounted) return
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
    return () => { mounted = false; channel?.unsubscribe() }
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

  // ── Custom bedtime story request (Pro) ───────────────────────────────
  // A parent can leave a story theme from the dashboard; Buddy offers it
  // next session, ask-first like parent voice messages — it never just
  // launches into a story unprompted.
  const [storyRequest, setStoryRequest] = useState(null)
  const [storyPhase, setStoryPhase] = useState(null) // null | 'ask'
  const storyTrapRef = useRef(null)

  useEffect(() => {
    fetchLatestUndelivered().then((row) => { if (row) setStoryRequest(row) }).catch(() => {})
  }, [])

  // Wait until nothing else (parent message, onboarding, PIN) is competing
  // for Buddy's voice before offering the story.
  useEffect(() => {
    if (!storyRequest || storyPhase === 'ask' || msgPhase || showPicker || showPin) return
    setStoryPhase('ask')
  }, [storyRequest, msgPhase, showPicker, showPin, storyPhase])

  useEffect(() => {
    if (storyPhase !== 'ask' || !storyRequest) return
    speech.stopListening()
    const prompt = 'Guess what? Someone left you a story idea! Want to hear it?'
    setBuddyText(prompt)
    setUiStatus('speaking')
    speech.speak(prompt, () => {
      if (!speech.supported.stt) { setUiStatus('idle'); return } // wait for tap-buttons instead
      setUiStatus('listening')
      speech.startListening((transcript) => {
        setUiStatus('idle')
        if (/\b(yes|yeah|yep|sure|please|ok|okay)\b/i.test(transcript)) {
          playStoryRequestNow()
        } else {
          declineStoryRequest()
        }
      })
    })
  }, [storyPhase]) // eslint-disable-line react-hooks/exhaustive-deps

  const playStoryRequestNow = async () => {
    if (!storyRequest) return
    speech.stopSpeaking()
    speech.stopListening()
    setStoryPhase(null)
    setUiStatus('thinking')
    const reply = await chat.sendMessage(`Tell me a story about: ${storyRequest.prompt_text}`, 'chat')
    setBuddyText(reply)
    setUiStatus('speaking')
    speech.speak(reply, () => { setUiStatus('idle'); scheduleBubbleClear() })
    markStoryDelivered(storyRequest.id).catch(() => {})
    setStoryRequest(null)
  }

  const declineStoryRequest = () => {
    speech.stopListening()
    setStoryPhase(null)
    setBuddyText('')
  }

  useFocusTrap(storyTrapRef, storyPhase === 'ask', declineStoryRequest)

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
      : pickRandomDistinct(WELCOME_BACK, welcomeBackIndex)(childName, buddyName)
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
      const nudge = pickRandomDistinct(IDLE_NUDGES, idleNudgeIndex)(childName)
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

  const handleStartStory = useCallback(() => {
    if (!isPro) { setUpgradeTrigger('storyMode'); return }
    cancelBubbleClear()
    const intro = chat.switchMode('story')
    setBuddyText(intro)
    setUserText('')
    setUiStatus('speaking')
    speech.speak(intro, () => {
      setUiStatus('idle')
      scheduleBubbleClear()
    }, getModeVoice('story'))
  }, [isPro, chat, speech, scheduleBubbleClear, cancelBubbleClear])

  // Any non-chat mode that renders in the normal UI needs a way out — without
  // this a child is stuck in story mode until they reload the page.
  const handleExitMode = useCallback(() => {
    cancelBubbleClear()
    const intro = chat.switchMode('chat')
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

    if (liveKitVoice.enabled) {
      const roomName = `buddy-voice-${encodeURIComponent(settings.childId || 'child')}`
      liveKitVoice
        .speak({ text: transcript, roomName, participantName: settings.buddyName, childName, buddyName, childAge: settings.childAge })
        .then((result) => {
          if (!result?.ok) return
          setBuddyText(result?.text || '')
          setUiStatus('speaking')
          setUserText('')
          scheduleBubbleClear()
        })
        .catch(() => {
          setUiStatus('idle')
        })
      return
    }

    chat.sendMessage(transcript, chat.mode).then((reply) => {
      if (chat.limitReachedRef.current) {
        setUserText('')
        setBuddyText('')
        setUiStatus('idle')
        setShowFreeLimit(true)
        return
      }
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
  }, [chat, speech, settings.autoListen, scheduleBubbleClear, cancelBubbleClear, liveKitVoice])

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

  // Screen-time limit reached — a calm goodnight screen, not a hard wall.
  // A grown-up can unlock the rest of today with the same parent PIN used
  // everywhere else in the app.
  if (showWindDown) {
    return (
      <div className={styles.windDownPage}>
        <BuddyAvatar status="idle" avatarColor={settings.avatarColor} type={avatarType} costume={settings.costume} size={150} live={false} />
        <h1 className={styles.windDownTitle}>Great playing today, {childName}!</h1>
        <p className={styles.windDownSub}>Time for a little break. {buddyName} will be right here when you're back!</p>
        <button className={styles.windDownUnlock} onClick={() => setShowWindDownPin(true)}>
          Ask a grown-up for more time
        </button>
        {showWindDownPin && (
          <>
            <ParentPin correctPinHash={settings.parentPinHash} onCreate={handlePinCreate} onSuccess={handleWindDownUnlock} />
            <button className={styles.pinDismiss} onClick={() => setShowWindDownPin(false)} aria-label="Cancel" />
          </>
        )}
      </div>
    )
  }

  // Free-tier daily chat limit reached — same calm, non-blocking pattern as
  // the screen-time wind-down above, but the only real "unlock" here is
  // upgrading, so a grown-up's PIN routes to the Parent Dashboard with the
  // upgrade prompt already open instead of just granting more time.
  if (showFreeLimit) {
    return (
      <>
        <SkipLink />
        <main className={styles.windDownPage} id="main">
        <BuddyAvatar status="idle" avatarColor={settings.avatarColor} type={avatarType} costume={settings.costume} size={150} live={false} />
        <h1 className={styles.windDownTitle}>Great chatting today, {childName}!</h1>
        <p className={styles.windDownSub}>{buddyName} needs a little rest from today's free chats. Ask a grown-up to unlock unlimited chatting!</p>
        <button className={styles.windDownUnlock} onClick={() => setShowFreeLimitPin(true)}>
          Ask a grown-up
        </button>
        {showFreeLimitPin && (
          <>
            <ParentPin
              correctPinHash={settings.parentPinHash}
              onCreate={handlePinCreate}
              onSuccess={() => {
                setShowFreeLimit(false)
                setShowFreeLimitPin(false)
                navigate('/parent', { state: { openUpgrade: 'freeLimit' } })
              }}
            />
            <button className={styles.pinDismiss} onClick={() => setShowFreeLimitPin(false)} aria-label="Cancel" />
          </>
        )}
      </main>
      </>
    )
  }

  const voiceOnly = settings.voiceOnly || false

  if (voiceOnly) {
    return (
      <>
        <SkipLink />
        <main className={styles.voicePage} id="main">
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
            <ParentPin correctPinHash={settings.parentPinHash} onCreate={handlePinCreate} onSuccess={handlePinSuccess} />
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
      </main>
      </>
    )
  }

  // Sing mode renders its own full-screen overlay
  if (chat.mode === 'sing') {
    return (
      <>
        <SingAlong
          avatarColor={settings.avatarColor}
          avatarType={avatarType}
          costume={settings.costume}
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

  const isDarkRealm = partOfDay === 'evening' || partOfDay === 'night'

  return (
    <>
      <SkipLink />
      <div className={`${styles.page} ${isDarkRealm ? styles.darkRealm : ''} ${styles[`realmTint${partOfDay.charAt(0).toUpperCase() + partOfDay.slice(1)}`]}`}>
      <main id="main">
      <h1 className={styles.visuallyHidden}>Chat with {buddyName}</h1>
      <WorldBackdrop mode={chat.mode} />
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
              {chat.mode !== 'chat' && (
                <button
                  className={styles.modeLabel}
                  onClick={handleExitMode}
                  aria-label={`Leave ${chat.mode} mode`}
                >
                  {chat.mode} mode ✕
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
                  onClick={() => setMsgPhase('ask')}
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
          <div className={`${styles.avatarArea} ${showActivity && chat.mode === 'chat' ? styles.avatarAreaShifted : ''}`}>
            {/* Rolling hills — gives Buddy a ground to stand on, right behind
                his feet. Three translucent layers auto-tint to whichever
                mode gradient is behind them, creating depth. Opacity raised
                from the original 0.14-0.38 so this still reads as ground
                against a busy illustrated photo backdrop, not just a flat
                CSS gradient sky. */}
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
                <button className={styles.dockBtn} onClick={handleStartSing}>
                  <span className={`${styles.dockIcon} ${styles.dockPink}`}><IconMusic size={26} /></span>
                  <span className={styles.dockLabel}>Songs</span>
                </button>
                <button className={styles.dockBtn} onClick={handleStartStory}>
                  <span className={`${styles.dockIcon} ${styles.dockBerry}`}><IconSparkle size={26} /></span>
                  <span className={styles.dockLabel}>Story</span>
                </button>
                <button className={styles.dockBtn} onClick={() => navigate('/courses')}>
                  <span className={`${styles.dockIcon} ${styles.dockSky}`}><IconBook size={26} /></span>
                  <span className={styles.dockLabel}>Learn</span>
                </button>
              </div>
              <VoiceButton status={uiStatus} onPress={handleVoicePress} buddyName={buddyName} />
              <div className={styles.dockSide}>
                <button className={styles.dockBtn} onClick={() => setShowPicker(true)}>
                  <span className={`${styles.dockIcon} ${styles.dockTangerine}`}><IconPalette size={26} /></span>
                  <span className={styles.dockLabel}>My Buddy</span>
                </button>
                <button className={`${styles.dockBtn} ${styles.dockParent}`} onClick={() => setShowPin(true)}>
                  <span className={`${styles.dockIcon} ${styles.dockGrape}`}><IconGear size={26} /></span>
                  <span className={styles.dockLabel}>Parents</span>
                </button>
              </div>
            </nav>
          </div>
        </div>
      </div>

      {upgradeTrigger && (
        <UpgradePrompt
          session={session}
          trigger={upgradeTrigger}
          onClose={() => setUpgradeTrigger(null)}
        />
      )}

      {/* PIN gate */}
      {showPin && (
        <ParentPin
          correctPinHash={settings.parentPinHash}
          onCreate={handlePinCreate}
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
          currentCostume={settings.costume}
          currentAge={settings.childAge}
          session={session}
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

      {/* Custom bedtime story request (Pro) — tap fallback for the spoken ask */}
      {storyPhase === 'ask' && (
        <div className={styles.msgOverlay} role="dialog" aria-modal="true" aria-label="Story idea from your parent">
          <div className={styles.msgBubble} ref={storyTrapRef}>
            <div className={styles.msgIcon}><IconBook size={30} /></div>
            <p className={styles.msgTitle}>Someone left you a story idea! Want to hear it?</p>
            <button className={styles.msgPlayBtn} onClick={playStoryRequestNow}><IconPlay size={16} /> Yes, tell me!</button>
            <button className={styles.msgDismissBtn} onClick={declineStoryRequest}>Not now</button>
          </div>
        </div>
      )}
    </main>
    </div>
    </>
  )
}

/* Parent voice message: envelope indicator + ask-first / playing bubble.
   Shared across the default, voice-only, and sing-mode screens so the
   ask-then-play flow stays identical everywhere a message can appear. */
function ParentMessageOverlay({ msgPhase, showEnvelope = true, envelopeClass, onEnvelopeClick, onYes, onNo, onReplay, onDismiss }) {
  const trapRef = useRef(null)
  useFocusTrap(trapRef, !!msgPhase, msgPhase === 'ask' ? onNo : onDismiss)
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
          <IconMail size={22} />
        </button>
      )}
      <div className={styles.msgOverlay} role="dialog" aria-modal="true" aria-label="Message from your parent">
        <div className={styles.msgBubble} ref={trapRef}>
          <div className={styles.msgIcon}><IconMail size={30} /></div>
          {msgPhase === 'ask' ? (
            <>
              <p className={styles.msgTitle}>Message from your parent! Want to hear it?</p>
              <button className={styles.msgPlayBtn} onClick={onYes}><IconPlay size={16} /> Yes, play it!</button>
              <button className={styles.msgDismissBtn} onClick={onNo}>Not now</button>
            </>
          ) : (
            <>
              <p className={styles.msgTitle}>Message from your parent!</p>
              <button className={styles.msgPlayBtn} onClick={onReplay}><IconPlay size={16} /> Play again</button>
              <button className={styles.msgDismissBtn} onClick={onDismiss}>Got it!</button>
            </>
          )}
        </div>
      </div>
    </>
  )
}
