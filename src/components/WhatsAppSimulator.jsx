import { useState } from 'react'
import styles from './WhatsAppSimulator.module.css'

export default function WhatsAppSimulator() {
  const [phoneNumber, setPhoneNumber] = useState('')
  const [recruitName, setRecruitName] = useState('Leo')

  const generateWhatsAppPayload = () => {
    const text = encodeURIComponent(
      `🎖️ *BUDDY ACADEMY DEBRIEF // SPECIALIST ${recruitName.toUpperCase()}*\n\n` +
      `*Status:* Mission Complete (Sector Alpha Recon)\n` +
      `*Mastery:* Visual Analysis: 90% | Pattern Recognition: High\n` +
      `*Parent Action:* Ask ${recruitName}: "How does a chameleon disappear in plain sight?"\n\n` +
      `View full log in Commander Dashboard: https://buddyacademy.app/dashboard`
    )
    window.open(`https://wa.me/${phoneNumber.replace(/[^0-9]/g, '')}?text=${text}`, '_blank')
  }

  return (
    <div className={styles.wrap}>
      <div className={styles.header}>[ DIRECT COMMS SIMULATOR ]</div>
      <p className={styles.desc}>
        Test how Sunday Storybook After-Action Reports arrive directly on your phone.
      </p>
      <div className={styles.inputs}>
        <div className={styles.field}>
          <label className={styles.label}>Recruit Name</label>
          <input
            type="text"
            value={recruitName}
            onChange={(e) => setRecruitName(e.target.value)}
            className={styles.input}
          />
        </div>
        <div className={styles.field}>
          <label className={styles.label}>WhatsApp Number (e.g. 27821234567)</label>
          <input
            type="text"
            value={phoneNumber}
            onChange={(e) => setPhoneNumber(e.target.value)}
            placeholder="27..."
            className={styles.input}
          />
        </div>
      </div>
      <button onClick={generateWhatsAppPayload} className={styles.sendBtn}>
        SEND TEST SUNDAY DEBRIEF VIA WHATSAPP
      </button>
    </div>
  )
}
