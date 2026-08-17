import { useState, useEffect, useRef } from 'react'
import { sendVoiceMessage, fetchMessages, fetchMessageById, markPlayed } from '../../services/messageService.js'
import { sendStoryRequest, fetchSentStoryRequests } from '../../services/storyRequestService.js'
import { IconMic, IconCheck, IconX, IconPlay, IconPause, IconLock } from '../icons.jsx'
import shared from './shared.module.css'
import styles from './MessagesTab.module.css'

export default function MessagesTab({ isPro, onUpgrade }) {
  const [recStatus, setRecStatus] = useState('idle') // idle | recording | sending | sent | error
  const [sentMessages, setSentMessages] = useState([])
  const [msgsLoading, setMsgsLoading] = useState(false)
  const [storyText, setStoryText] = useState('')
  const [storyStatus, setStoryStatus] = useState('idle') // idle | sending | sent | error
  const [sentStories, setSentStories] = useState([])
  const [playingMsgId, setPlayingMsgId] = useState(null)
  const mediaRecorderRef = useRef(null)
  const chunksRef = useRef([])
  const playAudioRef = useRef(null)

  useEffect(() => {
    setMsgsLoading(true)
    fetchMessages().then(setSentMessages).catch(console.error).finally(() => setMsgsLoading(false))
    fetchSentStoryRequests().then(setSentStories).catch(console.error)
    return () => { playAudioRef.current?.pause(); setPlayingMsgId(null) }
  }, [])

  const startRecording = async () => {
    if (!isPro) { onUpgrade('messages'); return }
    if (recStatus === 'recording' || recStatus === 'sending') return
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      chunksRef.current = []
      const mr = new MediaRecorder(stream)
      mr.ondataavailable = (e) => { if (e.data.size > 0) chunksRef.current.push(e.data) }
      mr.onstop = async () => {
        stream.getTracks().forEach((t) => t.stop())
        const blob = new Blob(chunksRef.current, { type: mr.mimeType || 'audio/webm' })
        if (blob.size < 500) { setRecStatus('idle'); return }
        setRecStatus('sending')
        try {
          await sendVoiceMessage(blob)
          setRecStatus('sent')
          fetchMessages().then(setSentMessages).catch(console.error)
          setTimeout(() => setRecStatus('idle'), 2000)
        } catch {
          setRecStatus('error')
          setTimeout(() => setRecStatus('idle'), 2000)
        }
      }
      mediaRecorderRef.current = mr
      mr.start()
      setRecStatus('recording')
    } catch {
      setRecStatus('error')
      setTimeout(() => setRecStatus('idle'), 2000)
    }
  }

  const stopRecording = () => {
    if (mediaRecorderRef.current?.state === 'recording') {
      mediaRecorderRef.current.stop()
      mediaRecorderRef.current = null
    }
  }

  // Sent Messages only showed a played/unplayed badge with no way to hear
  // what was actually sent — these are voice recordings (no transcript
  // exists), so playback is the only way to review one.
  const handlePlayMessage = async (msg) => {
    if (playingMsgId === msg.id) {
      playAudioRef.current?.pause()
      setPlayingMsgId(null)
      return
    }
    playAudioRef.current?.pause()
    try {
      const { audioUrl } = await fetchMessageById(msg.id)
      const audio = new Audio(audioUrl)
      playAudioRef.current = audio
      setPlayingMsgId(msg.id)
      audio.addEventListener('ended', () => setPlayingMsgId(null))
      await audio.play()
      if (!msg.played) {
        markPlayed(msg.id)
        setSentMessages((prev) => prev.map((m) => (m.id === msg.id ? { ...m, played: true } : m)))
      }
    } catch {
      setPlayingMsgId(null)
    }
  }

  const handleSendStory = async () => {
    const text = storyText.trim()
    if (!text) return
    setStoryStatus('sending')
    try {
      await sendStoryRequest(text)
      setStoryText('')
      setStoryStatus('sent')
      fetchSentStoryRequests().then(setSentStories).catch(console.error)
      setTimeout(() => setStoryStatus('idle'), 2000)
    } catch (err) {
      console.error('Failed to send story request:', err)
      setStoryStatus('error')
    }
  }

  return (
    <div className={shared.section}>
      <h2 className={shared.sectionTitle}>
        Send Voice Message to Buddy {!isPro && <IconLock size={11} />}
      </h2>
      {isPro ? (
        <>
          <p className={shared.hint} style={{ marginBottom: 20 }}>
            Hold the button and speak. Release when done — Buddy will hear it right away!
          </p>

          <div className={styles.recordArea}>
            <button
              className={`${styles.recordBtn} ${recStatus === 'recording' ? styles.recording : ''}`}
              onPointerDown={startRecording}
              onPointerUp={stopRecording}
              onPointerLeave={stopRecording}
              onKeyDown={(e) => {
                // Enter/Space produce a `click`, not pointer events, and
                // repeat while held — only react to the first keydown so a
                // keyboard user can hold-to-record the same as a mouse/touch
                // user, and release on keyup instead of on click.
                if ((e.key === 'Enter' || e.key === ' ') && !e.repeat) {
                  e.preventDefault()
                  startRecording()
                }
              }}
              onKeyUp={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault()
                  stopRecording()
                }
              }}
              disabled={recStatus === 'sending'}
              aria-label={recStatus === 'recording' ? 'Recording, release to send' : 'Hold to record a voice message'}
            >
              {recStatus === 'sent' ? <IconCheck size={22} /> : recStatus === 'error' ? <IconX size={22} /> : <IconMic size={22} />}
            </button>
            <p className={styles.recLabel}>
              {recStatus === 'recording' ? 'Recording... release to send'
                : recStatus === 'sending' ? 'Sending to Buddy...'
                : recStatus === 'sent'    ? 'Message sent!'
                : recStatus === 'error'   ? 'Something went wrong, try again'
                : 'Hold to record'}
            </p>
          </div>
        </>
      ) : (
        <button className={shared.input} style={{ textAlign: 'left', color: 'var(--ink-dim)' }} onClick={() => onUpgrade('messages')}>
          Upgrade to Pro to send Buddy a voice message
        </button>
      )}

      <h2 className={shared.sectionTitle} style={{ marginTop: 24 }}>Sent Messages</h2>
      {msgsLoading ? (
        <p className={shared.empty}>Loading...</p>
      ) : sentMessages.length === 0 ? (
        <p className={shared.empty}>No messages sent yet.</p>
      ) : (
        <div className={shared.historyList}>
          {sentMessages.map((msg) => (
            <div key={msg.id} className={shared.historyEntry}>
              <div className={shared.entryMeta}>
                <span className={`${shared.modeBadge} ${msg.played ? shared.chat : shared.story}`}>
                  {msg.played ? 'played' : 'unplayed'}
                </span>
                <span className={shared.entryDate}>
                  {new Date(msg.created_at).toLocaleDateString()}{' '}
                  {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
              <button className={shared.btnSmall} onClick={() => handlePlayMessage(msg)}>
                {playingMsgId === msg.id ? <><IconPause size={14} /> Pause</> : <><IconPlay size={14} /> Play what you sent</>}
              </button>
            </div>
          ))}
        </div>
      )}

      <h2 className={shared.sectionTitle} style={{ marginTop: 24 }}>
        Bedtime Story Idea {!isPro && <IconLock size={11} />}
      </h2>
      {isPro ? (
        <>
          <p className={shared.hint} style={{ marginBottom: 12 }}>
            Leave a theme and Buddy will offer to tell it as a story next time — ask-first, just like your voice messages.
          </p>
          <textarea
            className={shared.input}
            style={{ minHeight: 72, resize: 'vertical' }}
            value={storyText}
            onChange={(e) => setStoryText(e.target.value)}
            placeholder="e.g. a brave little dragon who's scared of the dark"
            maxLength={200}
          />
          <button
            className={shared.btnSave}
            style={{ marginTop: 10 }}
            onClick={handleSendStory}
            disabled={!storyText.trim() || storyStatus === 'sending'}
          >
            {storyStatus === 'sending' ? 'Sending...' : storyStatus === 'sent' ? <><IconCheck size={14} /> Sent!</> : 'Send story idea'}
          </button>

          {sentStories.length > 0 && (
            <div className={shared.historyList} style={{ marginTop: 16 }}>
              {sentStories.map((s) => (
                <div key={s.id} className={shared.historyEntry}>
                  <div className={shared.entryMeta}>
                    <span className={`${shared.modeBadge} ${s.delivered ? shared.chat : shared.story}`}>
                      {s.delivered ? 'told' : 'waiting'}
                    </span>
                    <span className={shared.entryDate}>{new Date(s.created_at).toLocaleDateString()}</span>
                  </div>
                  <p className={shared.hint}>{s.prompt_text}</p>
                </div>
              ))}
            </div>
          )}
        </>
      ) : (
        <button className={shared.input} style={{ textAlign: 'left', color: 'var(--ink-dim)' }} onClick={() => onUpgrade('story')}>
          Upgrade to Pro to leave Buddy a story idea
        </button>
      )}
    </div>
  )
}
