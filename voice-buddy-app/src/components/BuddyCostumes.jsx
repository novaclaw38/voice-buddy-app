// Costume SVG groups drawn to sit on the blob body (viewBox 0 0 100 100).
// Ears/spikes/antenna use var(--body) so they match the tinted body, with
// soft inner tints. `s` is the CSS-modules object from BuddyAvatar for the
// listening-accent animation classes.

function Bear({ isListening, s }) {
  return (
    <g>
      <circle cx="22" cy="26" r="15" fill="var(--body)" />
      <circle cx="78" cy="26" r="15" fill="var(--body)" />
      <circle cx="22" cy="26" r="8.5" fill="rgba(255,190,190,0.5)" />
      <circle cx="78" cy="26" r="8.5" fill="rgba(255,190,190,0.5)" />
      {isListening && (
        <>
          <circle className={s.earPulse} cx="22" cy="26" r="4" fill="rgba(255,255,255,0.4)" />
          <circle className={s.earPulse} cx="78" cy="26" r="4" fill="rgba(255,255,255,0.4)" />
        </>
      )}
    </g>
  )
}

function Cat({ isListening, s }) {
  return (
    <g>
      <polygon points="14,40 26,8 40,38" fill="var(--body)" className={isListening ? s.earTwitch : ''} />
      <polygon points="60,38 74,8 86,40" fill="var(--body)" className={isListening ? s.earTwitchR : ''} />
      <polygon points="18,38 26,15 36,37" fill="rgba(255,190,190,0.5)" />
      <polygon points="64,37 74,15 82,38" fill="rgba(255,190,190,0.5)" />
      {/* whiskers */}
      <g stroke="rgba(255,255,255,0.5)" strokeWidth="1.4" strokeLinecap="round">
        <line x1="16" y1="60" x2="38" y2="63" />
        <line x1="16" y1="66" x2="38" y2="66" />
        <line x1="62" y1="63" x2="84" y2="60" />
        <line x1="62" y1="66" x2="84" y2="66" />
      </g>
    </g>
  )
}

function Dog({ isListening, s }) {
  return (
    <g>
      <ellipse cx="12" cy="52" rx="11" ry="22" fill="var(--body)" transform="rotate(-14 12 52)"
        className={isListening ? s.dogEarL : ''} style={{ transformBox: 'fill-box', transformOrigin: 'top center' }} />
      <ellipse cx="88" cy="52" rx="11" ry="22" fill="var(--body)" transform="rotate(14 88 52)"
        className={isListening ? s.dogEarR : ''} style={{ transformBox: 'fill-box', transformOrigin: 'top center' }} />
    </g>
  )
}

function Bunny({ isListening, s }) {
  return (
    <g>
      <g className={isListening ? s.bunnyEarL : ''} style={{ transformBox: 'fill-box', transformOrigin: '32px 38px' }}>
        <ellipse cx="32" cy="16" rx="9" ry="24" fill="var(--body)" />
        <ellipse cx="32" cy="16" rx="5" ry="18" fill="rgba(255,190,190,0.5)" />
      </g>
      <g className={isListening ? s.bunnyEarR : ''} style={{ transformBox: 'fill-box', transformOrigin: '68px 38px' }}>
        <ellipse cx="68" cy="16" rx="9" ry="24" fill="var(--body)" />
        <ellipse cx="68" cy="16" rx="5" ry="18" fill="rgba(255,190,190,0.5)" />
      </g>
    </g>
  )
}

function Alien({ isListening, s }) {
  return (
    <g>
      <line x1="50" y1="20" x2="50" y2="7" stroke="var(--body)" strokeWidth="3" strokeLinecap="round" />
      <circle cx="50" cy="5" r="5" fill="#86efac" className={isListening ? s.antenna : ''} />
    </g>
  )
}

function Dino({ isListening, s }) {
  return (
    <g fill="var(--body)">
      <polygon points="34,26 39,8 44,26" />
      <polygon points="45,22 50,3 55,22" className={isListening ? s.spike : ''} />
      <polygon points="56,26 61,8 66,26" />
    </g>
  )
}

const COSTUMES = { bear: Bear, cat: Cat, dog: Dog, bunny: Bunny, alien: Alien, dino: Dino }

export function Costume({ type, isListening, s }) {
  const C = COSTUMES[type] || COSTUMES.bear
  return <C isListening={isListening} s={s} />
}
