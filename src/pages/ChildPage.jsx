import { useState, useCallback, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import useFocusTrap from '../hooks/useFocusTrap.js'
import ParentPin from '../components/ParentPin.jsx'
import AvatarPicker from '../components/AvatarPicker.jsx'
import UpgradePrompt from '../components/UpgradePrompt.jsx'
import NormalScreen from '../components/childScreens/NormalScreen.jsx'
import VoiceOnlyScreen from '../components/childScreens/VoiceOnlyScreen.jsx'
import GoalReachedScreen from '../components/childScreens/GoalReachedScreen.jsx'
import { useSpeech } from '../hooks/useSpeech.js'
import { usePendingAsk } from '../hooks/usePendingAsk.js'
import { useChat } from '../hooks/useChat.js'
import { useTimeOfDay } from '../hooks/useTimeOfDay.js'
import { useSubscription } from '../hooks/useSubscription.jsx'
import { useLiveKitAvatarVoice } from '../hooks/useLiveKitAvatarVoice.js'
import { getSettings, saveSettings, migratePinIfNeeded, getActiveChildId } from '../utils/storage.js'
import { ensureActiveChildMigrated, updateChild } from '../services/childrenService.js'
import { getTodayMinutesUsed, addMinutesUsed, resetTodayUsage, evaluateScreenTime } from '../utils/screenTime.js'
import { greetingWord } from '../utils/timeOfDay.js'
import { supabase } from '../lib/supabase.js'
import { fetchMessageById, markPlayed, fetchLatestUnplayed } from '../services/messageService.js'
import { fetchLatestUndelivered, markStoryDelivered } from '../services/storyRequestService.js'
import { startAsChild } from '../services/cameraSignal.js'
import SingAlong from '../components/SingAlong.jsx'
import { getDailyActivity, isDailyActivityDismissed, dismissDailyActivity } from '../utils/dailyActivities.js'
import { getModeVoice } from '../utils/modeVoice.js'
import { pickRandomDistinct } from '../utils/prompts.js'
import styles from './ChildPage.module.css'
import { IconMail, IconPlay } from '../components/icons.jsx'

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

// ChildPage is the shell: it owns everything that must survive a screen
// switch — camera check-in signaling, the parent-message and story-request
// realtime listeners, settings/onboarding, screen-time ticking, boot
// greeting, idle nudge — and renders exactly one of five screens
// (NormalScreen, VoiceOnlyScreen, GoalReachedScreen x2 variants, or
// SingAlong) based on current state. None of those cross-cutting effects
// live inside a screen component, because a screen can unmount (e.g. the
// child hits the wind-down screen) while the shell — and the camera/
// message connections it owns — needs to keep running.
//
// See the 2026-08-17 architecture review (Candidate B) for the full
// before/after: this used to be one 988-line component with five early
// returns, all sharing hooks declared unconditionally above them.
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
  const [showActivity, setShowActivity] = useState(() => !hasGreetedFully && !isDailyActivityDismissed())
  const dailyActivity = getDailyActivity()
  const [parentMessage, setParentMessage] = useState(null)
  // 'playing' = child said yes and the recording is playing/played; the
  // 'ask' half of the phase lives in msgAsk (usePendingAsk) below, combined
  // into one msgPhase value for ParentMessageOverlay further down.
  const [playingMessage, setPlayingMessage] = useState(false)
  const msgAsk = usePendingAsk({ speech, setBuddyText, setUiStatus })
  const parentAudioRef = useRef(null)

  // ── Screen-time limit (Pro) ──────────────────────────────────────────
  // Ticks while the tab is visible, in real wall-clock minutes — a paused/
  // backgrounded tab doesn't burn down the limit. Resets automatically at
  // local midnight since the storage key is date-scoped.
  const dailyLimit = isPro ? (settings.dailyLimitMinutes || 0) : 0
  const [minutesUsed, setMinutesUsed] = useState(() => getTodayMinutesUsed(getActiveChildId()))
  const [showWindDown, setShowWindDown] = useState(false)
  const [showFreeLimit, setShowFreeLimit] = useState(false)
  const warnedRef = useRef(false)

  useEffect(() => {
    if (!dailyLimit) return
    const TICK_MINUTES = 0.5
    const id = setInterval(() => {
      if (document.hidden) return
      const total = addMinutesUsed(getActiveChildId(), TICK_MINUTES)
      setMinutesUsed(total)
      const { shouldWarn, shouldWindDown } = evaluateScreenTime(total, dailyLimit)
      if (shouldWarn && !warnedRef.current) {
        warnedRef.current = true
        speech.speak("Just a heads up — five more minutes, then it's time for a little break!")
      }
      if (shouldWindDown) setShowWindDown(true)
    }, TICK_MINUTES * 60 * 1000)
    return () => clearInterval(id)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dailyLimit])

  const handleWindDownUnlock = () => {
    resetTodayUsage(getActiveChildId())
    setMinutesUsed(0)
    warnedRef.current = false
    setShowWindDown(false)
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
  // child shouldn't see a camera-error message). Lives in the shell, not
  // NormalScreen, so a parent can still check the camera while the child
  // is on the wind-down/voice-only/sing screen.
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
          if (msg) setParentMessage(msg)
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
      if (msg) setParentMessage(msg)
    }).catch(() => {})
  }, [])

  // Buddy announces the message and asks whether to hear it, then listens
  // for a yes/no — the recording never auto-plays without asking first
  // (usePendingAsk owns the speak/listen/branch mechanics). Guarded against
  // the wind-down/free-limit screens (added alongside the Candidate B
  // split): neither renders any overlay for this, so without the guard
  // Buddy would speak and listen for a message no screen could show — audio
  // with no visual, on a "time for a break" screen.
  //
  // promptedMessageIdRef (not msgAsk.phase) drives the "already asked"
  // check: gating on phase directly would re-trigger the instant a decline
  // resets phase to null while parentMessage is still set — the same loop
  // Candidate D's review caught and fixed on the story-request flow below.
  // The ref means each message is auto-offered exactly once; the envelope
  // button (onShowMessage) re-asks about the same message deliberately, by
  // calling msgAsk.ask directly instead of going through this effect.
  const MSG_ASK_PROMPT = "You have a message from your parent! Do you want to hear it?"
  const promptedMessageIdRef = useRef(null)
  useEffect(() => {
    if (!parentMessage || playingMessage || msgAsk.phase === 'ask' || showWindDown || showFreeLimit) return
    if (promptedMessageIdRef.current === parentMessage.id) return
    promptedMessageIdRef.current = parentMessage.id
    msgAsk.ask(MSG_ASK_PROMPT, playParentMessageNow)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [parentMessage, playingMessage, msgAsk.phase, showWindDown, showFreeLimit])

  const playParentMessageNow = () => {
    if (!parentMessage) return
    speech.stopSpeaking()
    speech.stopListening()
    const audio = new Audio(parentMessage.audioUrl)
    parentAudioRef.current = audio
    audio.onended = () => { parentAudioRef.current = null }
    audio.onerror = () => { parentAudioRef.current = null }
    audio.play().catch(() => {})
    setPlayingMessage(true)
  }

  const dismissParentMessage = () => {
    parentAudioRef.current?.pause()
    parentAudioRef.current = null
    if (parentMessage) markPlayed(parentMessage.id).catch(() => {})
    setParentMessage(null)
    setPlayingMessage(false)
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
  const storyAsk = usePendingAsk({ speech, setBuddyText, setUiStatus })

  useEffect(() => {
    fetchLatestUndelivered().then((row) => { if (row) setStoryRequest(row) }).catch(() => {})
  }, [])

  // Wait until nothing else (parent message ask or playback, onboarding,
  // PIN, wind-down/free-limit — same reasoning as the parent-message guard
  // above) is competing for Buddy's voice before offering the story.
  //
  // Unlike the message flow's promptedMessageIdRef, gating directly on
  // storyAsk.phase here is safe: storyAsk's onNo (below) clears
  // storyRequest itself on decline, so this effect's own `!storyRequest`
  // check stops it from re-firing — no separate ref needed. (A pre-refactor
  // version of this effect declined without clearing storyRequest, which
  // did loop; that was a real bug this review surfaced and fixed.)
  useEffect(() => {
    if (!storyRequest || storyAsk.phase === 'ask' || msgAsk.phase === 'ask' || playingMessage || showPicker || showPin || showWindDown || showFreeLimit) return
    storyAsk.ask('Guess what? Someone left you a story idea! Want to hear it?', playStoryRequestNow, () => setStoryRequest(null))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [storyRequest, msgAsk.phase, playingMessage, showPicker, showPin, showWindDown, showFreeLimit, storyAsk.phase])

  const playStoryRequestNow = async () => {
    if (!storyRequest) return
    speech.stopSpeaking()
    speech.stopListening()
    setUiStatus('thinking')
    const reply = await chat.sendMessage(`Tell me a story about: ${storyRequest.prompt_text}`, 'chat')
    setBuddyText(reply)
    setUiStatus('speaking')
    speech.speak(reply, () => { setUiStatus('idle'); scheduleBubbleClear() })
    markStoryDelivered(storyRequest.id).catch(() => {})
    setStoryRequest(null)
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
    if (uiStatus !== 'idle' || showPin || showPicker || msgAsk.phase === 'ask' || playingMessage || chat.mode !== 'chat') return
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
  }, [uiStatus, showPin, showPicker, msgAsk.phase, playingMessage, chat.mode, childName, speech, scheduleBubbleClear])

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

  const voiceOnly = settings.voiceOnly || false

  // ── Screen selection ──────────────────────────────────────────────
  // Precedence matches the original early-return order: a limit screen
  // always wins over voice-only/sing/normal.
  let screen
  if (showWindDown) {
    screen = (
      <GoalReachedScreen
        variant="windDown"
        childName={childName}
        buddyName={buddyName}
        avatarColor={settings.avatarColor}
        avatarType={avatarType}
        costume={settings.costume}
        parentPinHash={settings.parentPinHash}
        onCreatePin={handlePinCreate}
        onUnlock={handleWindDownUnlock}
      />
    )
  } else if (showFreeLimit) {
    screen = (
      <GoalReachedScreen
        variant="freeLimit"
        childName={childName}
        buddyName={buddyName}
        avatarColor={settings.avatarColor}
        avatarType={avatarType}
        costume={settings.costume}
        parentPinHash={settings.parentPinHash}
        onCreatePin={handlePinCreate}
        onUnlock={() => {
          setShowFreeLimit(false)
          navigate('/parent', { state: { openUpgrade: 'freeLimit' } })
        }}
      />
    )
  } else if (voiceOnly) {
    screen = (
      <VoiceOnlyScreen
        uiStatus={uiStatus}
        buddyText={buddyText}
        userText={userText}
        buddyName={buddyName}
        onVoicePress={handleVoicePress}
        onStartSing={handleStartSing}
        onCustomize={() => setShowPicker(true)}
        onShowPin={() => setShowPin(true)}
      />
    )
  } else if (chat.mode === 'sing') {
    screen = (
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
    )
  } else {
    screen = (
      <NormalScreen
        settings={settings}
        buddyName={buddyName}
        chatMode={chat.mode}
        partOfDay={partOfDay}
        speech={speech}
        uiStatus={uiStatus}
        buddyText={buddyText}
        userText={userText}
        cameraOn={cameraOn}
        parentMessage={parentMessage}
        onShowMessage={() => msgAsk.ask(MSG_ASK_PROMPT, playParentMessageNow)}
        showActivity={showActivity}
        dailyActivity={dailyActivity}
        onDismissActivity={handleDismissActivity}
        storyPhase={storyAsk.phase}
        onPlayStory={storyAsk.accept}
        onDeclineStory={storyAsk.decline}
        onExitMode={handleExitMode}
        onStartSing={handleStartSing}
        onStartStory={handleStartStory}
        onVoicePress={handleVoicePress}
        onShowPicker={() => setShowPicker(true)}
        onShowPin={() => setShowPin(true)}
      />
    )
  }

  // Parent-message ask/playing overlay is rendered once here (not per
  // screen) — NormalScreen has its own inline envelope button in its top
  // bar (showEnvelope=false below), VoiceOnlyScreen and sing mode get the
  // shared floating envelope, and the wind-down/free-limit screens simply
  // never see msgOverlayPhase !== null thanks to the guard above.
  const msgOverlayPhase = msgAsk.phase === 'ask' ? 'ask' : (playingMessage ? 'playing' : null)
  const envelopeConfig = chat.mode === 'sing'
    ? { envelopeClass: styles.envelopeFloat }
    : voiceOnly
      ? { envelopeClass: styles.envelopeBtn, onEnvelopeClick: () => msgAsk.ask(MSG_ASK_PROMPT, playParentMessageNow) }
      : { showEnvelope: false }

  return (
    <>
      {screen}

      <ParentMessageOverlay
        msgPhase={msgOverlayPhase}
        {...envelopeConfig}
        onYes={msgAsk.accept}
        onNo={msgAsk.decline}
        onReplay={replayParentMessage}
        onDismiss={dismissParentMessage}
      />

      {upgradeTrigger && (
        <UpgradePrompt
          session={session}
          trigger={upgradeTrigger}
          onClose={() => setUpgradeTrigger(null)}
        />
      )}

      {/* Parent-PIN gate — shared by NormalScreen and VoiceOnlyScreen,
          which both navigate to /parent on success. GoalReachedScreen
          manages its own separate PIN gate locally (different unlock
          behavior), so it's excluded here via the showWindDown/
          showFreeLimit check. */}
      {showPin && !showWindDown && !showFreeLimit && (
        <>
          <ParentPin
            correctPinHash={settings.parentPinHash}
            onCreate={handlePinCreate}
            onSuccess={handlePinSuccess}
          />
          <button
            className={styles.pinDismiss}
            onClick={() => setShowPin(false)}
            aria-label="Cancel"
          />
        </>
      )}

      {/* Avatar + name picker — shared by NormalScreen and VoiceOnlyScreen. */}
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
