const KEYS = {
  SETTINGS: 'buddy_settings',
  PIN_LOCK: 'buddy_pin_lock',
}

const DEFAULTS = {
  onboarded: false,
  childName: '',
  buddyName: 'Buddy',
  avatarType: 'bear',
  parentPinHash: null, // SHA-256 hex; see migratePinIfNeeded/hashPin
  voiceName: '',
  speechRate: 0.9,
  speechPitch: 1.1,
  voiceOnly: false,
  autoListen: false,
  avatarColor: '#7c3aed',
  morningRoutine: [
    'Wake up and stretch!',
    'Brush your teeth',
    'Wash your face',
    'Get dressed',
    'Eat breakfast',
    'Pack your bag',
  ],
  bedtimeRoutine: [
    'Put on your pajamas',
    'Brush your teeth',
    'Use the bathroom',
    'Get into bed',
    'Take 3 deep breaths',
    'Goodnight!',
  ],
}

export function getSettings() {
  try {
    const raw = localStorage.getItem(KEYS.SETTINGS)
    return raw ? { ...DEFAULTS, ...JSON.parse(raw) } : { ...DEFAULTS }
  } catch {
    return { ...DEFAULTS }
  }
}

export function saveSettings(settings) {
  localStorage.setItem(KEYS.SETTINGS, JSON.stringify(settings))
}

export async function hashPin(pin) {
  const enc = new TextEncoder().encode(pin)
  const buf = await crypto.subtle.digest('SHA-256', enc)
  return Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, '0')).join('')
}

// One-time migration from the old plaintext `parentPin` field to a hash.
// Idempotent — safe to call on every load. Returns the (possibly migrated)
// settings object.
export async function migratePinIfNeeded(settings) {
  if (settings.parentPinHash) return settings
  const plain = settings.parentPin || '1234'
  const parentPinHash = await hashPin(plain)
  const next = { ...settings, parentPinHash }
  delete next.parentPin
  saveSettings(next)
  return next
}

// Lockout state persists across refresh so the 30s cooldown can't be dodged
// by reloading the page.
export function getPinLock() {
  try {
    const raw = localStorage.getItem(KEYS.PIN_LOCK)
    return raw ? JSON.parse(raw) : { attempts: 0, lockedUntil: 0 }
  } catch {
    return { attempts: 0, lockedUntil: 0 }
  }
}

export function savePinLock(state) {
  localStorage.setItem(KEYS.PIN_LOCK, JSON.stringify(state))
}
