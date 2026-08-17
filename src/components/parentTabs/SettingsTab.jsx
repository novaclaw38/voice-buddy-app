import { useState, useRef } from 'react'
import { hashPin, getActiveChildId } from '../../utils/storage.js'
import { testConnection } from '../../services/chatService.js'
import { updateChild } from '../../services/childrenService.js'
import { useSpeech } from '../../hooks/useSpeech.js'
import { VOICE_OPTIONS, DEFAULT_VOICE, isValidVoiceKey } from '../../utils/voiceOptions.js'
import AvatarPicker from '../AvatarPicker.jsx'
import BuddyAvatar from '../BuddyAvatar.jsx'
import { IconCheck, IconX, IconPlay, IconSpeaker, IconPalette, IconLock } from '../icons.jsx'
import shared from './shared.module.css'
import styles from './SettingsTab.module.css'

// Which settings keys mirror a field on the cloud `children` row — kept in
// sync so the Parent dashboard's child switcher shows current info.
const CHILD_ROW_FIELD = {
  childName: 'name', buddyName: 'buddyName', avatarType: 'avatarType', avatarColor: 'avatarColor',
}

export default function SettingsTab({ settings, onUpdateSetting, isPro, onUpgrade, session }) {
  const speech = useSpeech(settings)
  const [showAvatarPicker, setShowAvatarPicker] = useState(false)
  const [previewStatus, setPreviewStatus] = useState('idle') // idle | speaking
  const [pinInput, setPinInput] = useState('')
  const [pinStage, setPinStage] = useState('idle') // idle | confirm
  const [pinPending, setPinPending] = useState('')
  const [pinError, setPinError] = useState('')
  const [pinSaved, setPinSaved] = useState(false)
  const [testStatus, setTestStatus] = useState(null)
  const [testError, setTestError] = useState('')
  const [showSaved, setShowSaved] = useState(false)
  const savedFlashRef = useRef(null)

  const updateSetting = (key, value) => {
    onUpdateSetting(key, value)
    setShowSaved(true)
    clearTimeout(savedFlashRef.current)
    savedFlashRef.current = setTimeout(() => setShowSaved(false), 1500)

    const rowField = CHILD_ROW_FIELD[key]
    const childId = getActiveChildId()
    if (rowField && childId) {
      updateChild(childId, { [rowField]: value }).catch(() => {})
    }
  }

  // Lets a parent hear the currently-selected voice right here, instead of
  // switching to the child page just to test it.
  const handlePreviewVoice = () => {
    setPreviewStatus('speaking')
    speech.speak("Hi! I'm Buddy, your child's AI friend!", () => setPreviewStatus('idle'))
  }

  const handleAvatarSave = ({ type, name, color, costume }) => {
    updateSetting('avatarType', type)
    updateSetting('buddyName', name)
    updateSetting('avatarColor', color)
    updateSetting('costume', costume)
    setShowAvatarPicker(false)
  }

  // The PIN is never stored or displayed in plaintext. A typo here would
  // otherwise silently lock a parent out, so the new PIN must be entered
  // twice — the hash is only written once both entries match.
  const handlePinInput = async (raw) => {
    const digits = raw.replace(/\D/g, '').slice(0, 4)
    setPinInput(digits)
    setPinError('')
    if (digits.length !== 4) return

    if (pinStage === 'idle') {
      setPinPending(digits)
      setPinInput('')
      setPinStage('confirm')
      return
    }

    // pinStage === 'confirm'
    if (digits === pinPending) {
      updateSetting('parentPinHash', await hashPin(digits))
      setPinSaved(true)
      setTimeout(() => setPinSaved(false), 2000)
    } else {
      setPinError("Those PINs didn't match — try again.")
    }
    setPinInput('')
    setPinPending('')
    setPinStage('idle')
  }

  const handleTestConnection = async () => {
    setTestStatus('testing')
    setTestError('')
    try {
      await testConnection()
      setTestStatus('ok')
      setTimeout(() => setTestStatus(null), 3000)
    } catch (err) {
      setTestError(err.message || 'Unknown error')
      setTestStatus('fail')
      setTimeout(() => setTestStatus(null), 6000)
    }
  }

  return (
    <div className={shared.section}>
      <div className={shared.sectionHeaderRow}>
        <h2 className={shared.sectionTitle}>Child Settings</h2>
        <span className={`${styles.savedFlash} ${showSaved ? styles.savedFlashVisible : ''}`}><IconCheck size={13} /> Saved</span>
      </div>

      <div className={shared.field}>
        <label className={shared.label} htmlFor="childName">Child's Name</label>
        <input
          id="childName"
          className={shared.input}
          value={settings.childName}
          onChange={(e) => updateSetting('childName', e.target.value)}
          placeholder="e.g. Byron"
          autoComplete="off"
        />
      </div>

      <div className={shared.field}>
        <label className={shared.label} htmlFor="childAge">Child's Age</label>
        <select
          id="childAge"
          className={shared.input}
          value={settings.childAge ?? ''}
          onChange={(e) => updateSetting('childAge', Number(e.target.value))}
        >
          <option value="" disabled>Select an age</option>
          {[3, 4, 5, 6, 7, 8, 9, 10].map((age) => (
            <option key={age} value={age}>{age} years old</option>
          ))}
        </select>
        <p className={shared.hint}>
          Sets which lessons are suggested first and how Buddy talks.
        </p>
      </div>

      <div className={shared.field}>
        <label className={shared.label}>Buddy Avatar</label>
        <div className={shared.btnRow} style={{ alignItems: 'center' }}>
          <BuddyAvatar
            type={settings.avatarType || 'bear'}
            costume={settings.costume}
            avatarColor={settings.avatarColor}
            status="idle"
            size={56}
            live={false}
          />
          <button className={shared.btnTest} onClick={() => setShowAvatarPicker(true)}>
            <IconPalette size={15} /> Customize
          </button>
        </div>
      </div>

      <div className={shared.field}>
        <label className={shared.label} htmlFor="parentPin">Parent PIN</label>
        <input
          id="parentPin"
          className={shared.input}
          type="password"
          inputMode="numeric"
          maxLength={4}
          value={pinInput}
          onChange={(e) => handlePinInput(e.target.value)}
          placeholder={pinStage === 'confirm' ? 'Re-enter the same PIN to confirm' : 'Enter new 4-digit PIN'}
        />
        {pinError ? (
          <p className={shared.testError}>{pinError}</p>
        ) : pinSaved ? (
          <p className={shared.hint}><IconCheck size={13} /> New PIN saved</p>
        ) : (
          <p className={shared.hint}>
            {pinStage === 'confirm' ? 'Type it once more to confirm' : 'Leave blank to keep your current PIN'}
          </p>
        )}
      </div>

      <div className={shared.field}>
        <label className={shared.label} htmlFor="speechRate">Speech Rate</label>
        <input
          id="speechRate"
          type="range"
          className={shared.slider}
          min="0.6" max="1.2" step="0.05"
          value={settings.speechRate}
          onChange={(e) => updateSetting('speechRate', parseFloat(e.target.value))}
        />
        <p className={shared.hint}>{settings.speechRate.toFixed(2)}× (lower = slower)</p>
      </div>

      <div className={shared.field}>
        <label className={shared.label}>Auto-listen after Buddy speaks</label>
        <div className={shared.toggle}>
          <input
            type="checkbox"
            id="autoListen"
            checked={settings.autoListen}
            onChange={(e) => updateSetting('autoListen', e.target.checked)}
          />
          <label htmlFor="autoListen" className={shared.toggleLabel}>
            {settings.autoListen ? 'On (hands-free)' : 'Off (tap to talk)'}
          </label>
        </div>
      </div>

      <div className={shared.field}>
        <label className={shared.label}>Screen-time saver (voice only)</label>
        <div className={shared.toggle}>
          <input
            type="checkbox"
            id="voiceOnly"
            checked={settings.voiceOnly || false}
            onChange={(e) => updateSetting('voiceOnly', e.target.checked)}
          />
          <label htmlFor="voiceOnly" className={shared.toggleLabel}>
            {settings.voiceOnly ? 'Voice only (screen off)' : 'Full screen (default)'}
          </label>
        </div>
        <p className={shared.hint}>Turn on to hide all visuals — just a glowing orb. Great for bedtime or reducing screen time.</p>
      </div>

      <div className={shared.field}>
        <label className={shared.label}>Daily Time Limit {!isPro && <IconLock size={11} />}</label>
        {isPro ? (
          <>
            <select
              className={shared.input}
              value={settings.dailyLimitMinutes || ''}
              onChange={(e) => updateSetting('dailyLimitMinutes', e.target.value ? Number(e.target.value) : null)}
            >
              <option value="">Off</option>
              <option value="15">15 minutes</option>
              <option value="30">30 minutes</option>
              <option value="45">45 minutes</option>
              <option value="60">60 minutes</option>
            </select>
            <p className={shared.hint}>Buddy gives a friendly heads-up 5 minutes before, then pauses with a gentle goodnight screen. Your PIN unlocks more time instantly.</p>
          </>
        ) : (
          <button className={shared.input} style={{ textAlign: 'left', color: 'var(--ink-dim)' }} onClick={() => onUpgrade('timeLimit')}>
            Upgrade to Pro to set a daily limit
          </button>
        )}
      </div>

      <div className={shared.field}>
        <label className={shared.label} htmlFor="voiceName">Buddy's Voice</label>
        <div className={shared.btnRow}>
          <select
            id="voiceName"
            className={shared.input}
            style={{ flex: 1 }}
            value={isValidVoiceKey(settings.voiceName) ? settings.voiceName : DEFAULT_VOICE}
            onChange={(e) => updateSetting('voiceName', e.target.value)}
          >
            {VOICE_OPTIONS.map((v) => (
              <option key={v.key} value={v.key}>{v.label}</option>
            ))}
          </select>
          <button
            type="button"
            className={shared.btnTest}
            onClick={handlePreviewVoice}
            disabled={previewStatus === 'speaking'}
          >
            {previewStatus === 'speaking' ? <><IconSpeaker size={15} /> Playing…</> : <><IconPlay size={15} /> Preview</>}
          </button>
        </div>
        <p className={shared.hint}>
          This is the actual voice Buddy speaks with.
        </p>
      </div>

      <div className={shared.field}>
        <button className={styles.linkBtn} onClick={handleTestConnection} disabled={testStatus === 'testing'}>
          {testStatus === 'testing' ? 'Testing connection...' : testStatus === 'ok' ? <><IconCheck size={14} /> Connected!</> : testStatus === 'fail' ? <><IconX size={14} /> Connection failed</> : "Buddy not responding? Test connection"}
        </button>
        {testStatus === 'fail' && testError && (
          <p className={shared.testError}>{testError}</p>
        )}
      </div>

      {showAvatarPicker && (
        <AvatarPicker
          session={session}
          currentType={settings.avatarType}
          currentName={settings.buddyName}
          currentColor={settings.avatarColor}
          currentCostume={settings.costume}
          onSave={handleAvatarSave}
          onClose={() => setShowAvatarPicker(false)}
        />
      )}
    </div>
  )
}
