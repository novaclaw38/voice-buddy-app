import React, { useState, useCallback } from 'react';
import styles from './WhatsAppSimulator.module.css';
import { sounds } from '../audio/web-audio-synthesizer';

export const WhatsAppSimulator = ({ cadetName = 'Leo', onDebriefSent }) => {
  const [phoneNumber, setPhoneNumber] = useState('');
  const [name, setName] = useState(cadetName);

  const sanitizePhone = useCallback((raw) => {
    // Keep digits only
    const digits = raw.replace(/[^0-9]/g, '');
    // Remove leading + or 00
    let normalized = digits.replace(/^00/, '').replace(/^0+/, '');
    // If starts with country code, ensure it's E.164-ish (keep as is)
    if (!normalized.startsWith('1') && normalized.length === 10) {
      // Likely South African without country code
      normalized = '27' + normalized.substring(1);
    } else if (normalized.length > 13) {
      normalized = normalized.slice(0, 15);
    }
    return normalized;
  }, []);

  const generateWhatsAppPayload = useCallback(() => {
    sounds.playRelayClick();
    
    const phone = sanitizePhone(phoneNumber);
    if (!phone || phone.length < 8) {
      alert('Please enter a valid phone number');
      return;
    }

    const escapedName = name.replace(/[*_`]/g, '');
    const text = encodeURIComponent(
      `*BUDDY ACADEMY DEBRIEF // SPECIALIST ${escapedName.toUpperCase()}*\n\n` +
      `*Status:* Mission Complete (Sector Alpha Recon)\n` +
      `*Mastery:* Visual Analysis: 90% | Pattern Recognition: HIGH\n` +
      `*Parent Action:* Ask ${escapedName}: "How does a chameleon disappear in plain sight?"\n\n` +
      `View full log in Commander Dashboard: https://buddyacademy.app/parent/command`
    );

    const url = `https://wa.me/${phone}?text=${text}`;
    
    window.open(url, '_blank');
    
    if (onDebriefSent) {
      onDebriefSent({ phoneNumber: phone, cadetName: name });
    }
  }, [phoneNumber, name, sanitizePhone, onDebriefSent]);

  return (
    <div className={styles.simulator}>
      <div className={styles.header}>
        <span>[ DIRECT COMMS SIMULATOR ]</span>
      </div>
      <p className={styles.description}>
        Test how Sunday Storybook After-Action Reports arrive directly on your phone.
      </p>

      <div className={styles.formGroup}>
        <label className={styles.label}>Recruit Name</label>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className={styles.input}
          placeholder="Enter cadet name"
        />
      </div>

      <div className={styles.formGroup}>
        <label className={styles.label}>
          WhatsApp Number (e.g. 27821234567)
        </label>
        <input
          type="tel"
          value={phoneNumber}
          onChange={(e) => setPhoneNumber(e.target.value)}
          placeholder="27…"
          className={styles.input}
        />
      </div>

      <button
        onClick={generateWhatsAppPayload}
        className={styles.sendButton}
        disabled={!phoneNumber.trim()}
      >
        SEND TEST SUNDAY DEBRIEF VIA WHATSAPP
      </button>
    </div>
  );
};

export default WhatsAppSimulator;
