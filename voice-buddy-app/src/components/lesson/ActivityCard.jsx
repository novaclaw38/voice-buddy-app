import { useState, useEffect, useRef } from 'react'
import VoiceButton from '../VoiceButton.jsx'
import styles from './ActivityCard.module.css'

export default function ActivityCard({ step, settings, speech, onComplete }) {
  const [transcript, setTranscript] = useState('')
  const [listening, setListening] = useState(false)
  const timerRef = useRef(null)
  const buddyName = settings.buddyName || 'Buddy'

  // Fix 5: clear onComplete timeout on unmount
  useEffect(() => {
    return () => {
      if (timerRef.current !== null) {
        clearTimeout(timerRef.current)
      }
    }
  }, [])

  const handlePress = () => {
    if (listening) {
      speech.stopListening()
      setListening(false)
      return
    }
    setListening(true)
    speech.startListening((text) => {
      setTranscript(text)
      setListening(false)
      // Fix 4: delay onComplete so transcript bubble is briefly visible
      timerRef.current = setTimeout(onComplete, 700)
    })
  }

  const status = listening ? 'listening' : 'idle'

  return (
    <div className={styles.card}>
      {!transcript && (
        <p className={styles.hint}>Tap the mic and speak your answer!</p>
      )}
      <VoiceButton status={status} onPress={handlePress} buddyName={buddyName} />
      {transcript && (
        <p className={styles.transcript}>"{transcript}"</p>
      )}
    </div>
  )
}
