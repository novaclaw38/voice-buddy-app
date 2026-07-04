export function getPartOfDay(date = new Date()) {
  const h = date.getHours()
  if (h < 5) return 'night'
  if (h < 12) return 'morning'
  if (h < 17) return 'afternoon'
  if (h < 21) return 'evening'
  return 'night'
}

// Day world (sun, blue sky) vs night world (moon, stars) — a touch wider
// than "morning" so dusk/dawn don't flip the whole background instantly.
export function isDaytime(date = new Date()) {
  const h = date.getHours()
  return h >= 6 && h < 19
}

const GREETING_WORD = {
  morning:   'Good morning',
  afternoon: 'Good afternoon',
  evening:   'Good evening',
  night:     'Hello',
}

export function greetingWord(date = new Date()) {
  return GREETING_WORD[getPartOfDay(date)]
}

// Injected into the chat system prompt so the model doesn't guess a
// time-of-day greeting that's wrong — it has no other way to know when
// "now" is for this child.
export function timeContextLine(date = new Date()) {
  const time = date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })
  return `\n\nTHE CURRENT TIME right now is ${time}, which is the ${getPartOfDay(date)}. If you greet them or mention the time of day, match this — never say "good morning" unless it actually is morning.`
}
