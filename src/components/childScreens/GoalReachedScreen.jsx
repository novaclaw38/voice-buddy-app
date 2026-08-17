import { useState } from 'react'
import BuddyAvatar from '../BuddyAvatar.jsx'
import ParentPin from '../ParentPin.jsx'
import SkipLink from '../SkipLink.jsx'
import styles from './GoalReachedScreen.module.css'

// Calm, non-punitive "you've hit today's limit" screen — shared by the
// screen-time wind-down and the free-tier daily chat limit. The two were
// near-identical copies (same layout, different copy strings and a
// different PIN-success callback) before this component unified them.
export default function GoalReachedScreen({
  variant, // 'windDown' | 'freeLimit'
  childName,
  buddyName,
  avatarColor,
  avatarType,
  costume,
  parentPinHash,
  onCreatePin,
  onUnlock,
}) {
  const [showPin, setShowPin] = useState(false)

  const copy = variant === 'windDown'
    ? {
      title: `Great playing today, ${childName}!`,
      sub: `Time for a little break. ${buddyName} will be right here when you're back!`,
      unlockLabel: 'Ask a grown-up for more time',
    }
    : {
      title: `Great chatting today, ${childName}!`,
      sub: `${buddyName} needs a little rest from today's free chats. Ask a grown-up to unlock unlimited chatting!`,
      unlockLabel: 'Ask a grown-up',
    }

  return (
    <>
      <SkipLink />
      <main className={styles.windDownPage} id="main">
        <BuddyAvatar status="idle" avatarColor={avatarColor} type={avatarType} costume={costume} size={150} live={false} />
        <h1 className={styles.windDownTitle}>{copy.title}</h1>
        <p className={styles.windDownSub}>{copy.sub}</p>
        <button className={styles.windDownUnlock} onClick={() => setShowPin(true)}>
          {copy.unlockLabel}
        </button>
        {showPin && (
          <>
            <ParentPin correctPinHash={parentPinHash} onCreate={onCreatePin} onSuccess={() => { setShowPin(false); onUnlock() }} />
            <button className={styles.pinDismiss} onClick={() => setShowPin(false)} aria-label="Cancel" />
          </>
        )}
      </main>
    </>
  )
}
