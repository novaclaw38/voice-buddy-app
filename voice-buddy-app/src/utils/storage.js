const KEYS = {
  SETTINGS: 'buddy_settings',
}

const DEFAULTS = {
  onboarded: false,
  childName: '',
  buddyName: 'Buddy',
  avatarType: 'bear',
  parentPin: '1234',
  voiceName: '',
  speechRate: 0.9,
  speechPitch: 1.1,
  voiceOnly: false,
  autoListen: false,
  wakeWordEnabled: false,
  robotVoice: false,
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
