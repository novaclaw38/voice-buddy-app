// Hand-drawn-style SVG glyphs for the mode tiles — one consistent white
// line-art family (2.5 stroke, soft fills) that sits on each tile's gradient.
// Replaces the platform-dependent emoji so every device renders the same art.

const S = { stroke: 'white', strokeWidth: 2.5, strokeLinecap: 'round', strokeLinejoin: 'round', fill: 'none' }
const SOFT = 'rgba(255,255,255,0.25)'

const ICONS = {
  story: (
    <>
      <path {...S} fill={SOFT} d="M20 10 C15 7 9 7 6 8 V30 C9 29 15 29 20 32 C25 29 31 29 34 30 V8 C31 7 25 7 20 10 Z" />
      <line {...S} x1="20" y1="10" x2="20" y2="32" />
    </>
  ),
  sing: (
    <>
      <path {...S} d="M18.5 29 V12 L31.5 9 V26" />
      <circle cx="14" cy="29" r="4.5" fill="white" />
      <circle cx="27" cy="26" r="4.5" fill="white" />
    </>
  ),
  game: (
    <>
      <rect {...S} fill={SOFT} x="6" y="14" width="28" height="15" rx="7.5" />
      <line {...S} x1="13" y1="18.5" x2="13" y2="24.5" />
      <line {...S} x1="10" y1="21.5" x2="16" y2="21.5" />
      <circle cx="26" cy="19" r="2" fill="white" />
      <circle cx="30" cy="24" r="2" fill="white" />
    </>
  ),
  activity: (
    <>
      <path {...S} fill={SOFT} d="M27 7 L33 13 L20 26 L14 20 Z" />
      <path d="M14 20 C10.5 22 10 27 7 33 C13 31 17 30 20 26 Z" fill="white" />
    </>
  ),
  quiz: (
    <>
      <path {...S} fill={SOFT} d="M20 6 a9.5 9.5 0 0 1 5.2 17.4 c-1 .8-1.7 2-1.7 3.6 h-7 c0-1.6-.7-2.8-1.7-3.6 A9.5 9.5 0 0 1 20 6 Z" />
      <line {...S} x1="16.5" y1="31" x2="23.5" y2="31" />
      <line {...S} x1="17.5" y1="34.5" x2="22.5" y2="34.5" />
    </>
  ),
  jokes: (
    <>
      <circle {...S} fill={SOFT} cx="20" cy="20" r="13.5" />
      <path d="M13 22.5 a7 7 0 0 0 14 0 Z" fill="white" />
      <circle cx="14.5" cy="16" r="1.9" fill="white" />
      <circle cx="25.5" cy="16" r="1.9" fill="white" />
    </>
  ),
  move: (
    <path {...S} fill={SOFT} d="M23 5 L10 22.5 h7.5 L16 35 L30 17 h-8 Z" />
  ),
  learn: (
    <>
      <path {...S} fill={SOFT} d="M16.5 7 v9.5 L9.5 29 a3.6 3.6 0 0 0 3.1 5.4 h14.8 a3.6 3.6 0 0 0 3.1-5.4 L23.5 16.5 V7" />
      <line {...S} x1="14" y1="7" x2="26" y2="7" />
      <circle cx="18" cy="27" r="1.6" fill="white" />
      <circle cx="23" cy="30" r="2" fill="white" />
    </>
  ),
  feelings: (
    <path {...S} fill="rgba(255,255,255,0.85)" d="M20 32.5 C8.5 24.5 6 15.5 12 11.5 c4-2.6 7 0 8 3 c1-3 4-5.6 8-3 c6 4 3.5 13-8 21 Z" />
  ),
  routine: (
    <>
      <rect {...S} fill={SOFT} x="9" y="6.5" width="22" height="27" rx="4.5" />
      <path {...S} d="M14 15 l2.2 2.2 L20.5 13" />
      <line {...S} x1="23.5" y1="15.5" x2="27" y2="15.5" />
      <path {...S} d="M14 24 l2.2 2.2 L20.5 22" />
      <line {...S} x1="23.5" y1="24.5" x2="27" y2="24.5" />
    </>
  ),
}

export default function ModeIcon({ id, size = 34 }) {
  return (
    <svg viewBox="0 0 40 40" width={size} height={size} aria-hidden="true">
      {ICONS[id] || ICONS.story}
    </svg>
  )
}
