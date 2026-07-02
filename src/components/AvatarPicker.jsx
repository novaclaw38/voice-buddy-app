import { useState } from 'react'
import BuddyAvatar from './BuddyAvatar.jsx'
import styles from './AvatarPicker.module.css'

const AVATARS = [
  { type: 'bear',  label: 'Bear',  color: '#7c3aed' },
  { type: 'cat',   label: 'Cat',   color: '#db2777' },
  { type: 'dog',   label: 'Dog',   color: '#ea580c' },
  { type: 'bunny', label: 'Bunny', color: '#0891b2' },
  { type: 'alien', label: 'Alien', color: '#16a34a' },
  { type: 'dino',  label: 'Dino',  color: '#b45309' },
]

export default function AvatarPicker({ currentType, currentName, currentColor, onSave, onClose }) {
  const [selType,  setSelType]  = useState(currentType  || 'bear')
  const [buddyName, setBuddyName] = useState(currentName || 'Buddy')

  const selAvatar = AVATARS.find((a) => a.type === selType) || AVATARS[0]

  const handleSave = () => {
    onSave({ type: selType, name: buddyName.trim() || 'Buddy', color: selAvatar.color })
  }

  return (
    <div className={styles.overlay}>
      <div className={styles.panel}>
        <h2 className={styles.title}>Choose Your Buddy!</h2>

        {/* Live preview */}
        <div className={styles.preview}>
          <BuddyAvatar type={selType} status="idle" avatarColor={selAvatar.color} size={110} />
          <div className={styles.nameWrap}>
            <input
              className={styles.nameInput}
              value={buddyName}
              onChange={(e) => setBuddyName(e.target.value)}
              maxLength={16}
              placeholder="Buddy"
              aria-label="Buddy name"
            />
            <span className={styles.nameHint}>tap to rename ✏️</span>
          </div>
        </div>

        {/* Avatar grid */}
        <div className={styles.grid}>
          {AVATARS.map((a) => (
            <button
              key={a.type}
              className={`${styles.avatarBtn} ${selType === a.type ? styles.selected : ''}`}
              style={{ '--sel-color': a.color }}
              onClick={() => setSelType(a.type)}
            >
              <BuddyAvatar type={a.type} status="idle" avatarColor={a.color} size={56} live={false} />
              <span className={styles.avatarLabel}>{a.label}</span>
            </button>
          ))}
        </div>

        <button className={styles.saveBtn} onClick={handleSave}>
          Let's go! ✨
        </button>
        <button className={styles.cancelBtn} onClick={onClose}>
          Maybe later
        </button>
      </div>
    </div>
  )
}
