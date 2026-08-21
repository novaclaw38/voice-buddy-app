
// Cheap client-side pre-filter, checked before any Groq call — most turns
// have nothing to flag, so this keeps classification calls rare rather than
// running an LLM check on every single message. False positives here are
// fine (the LLM confirmation step below is the real gate); false negatives
// just mean a later message catches it.
const CONCERN_WORDS = new Set([
  'sad', 'scared', 'afraid', 'cry', 'crying', 'lonely', 'alone', 'hurt',
  'bully', 'bullied', 'hate', 'nightmare', 'worried', 'angry', 'mad',
  'hit', 'hitting', 'yell', 'yelled', 'yelling', 'nobody', 'die', 'dying',
  'scary', 'terrified', 'ashamed', 'hopeless', 'unsafe',
])

export function hasConcernSignal(text) {
  const words = (text || '').toLowerCase().match(/[a-z']+/g) || []
  return words.some((w) => CONCERN_WORDS.has(w))
}

// System prompt for the confirmation call — asks for strict JSON so the
// caller can parse defensively (a parse failure is treated as "no
// concern", never as an error surfaced to the child).
export function buildClassifyPrompt(childName) {
  const name = childName || 'a child'
  return `You are a safety classifier reviewing one message from ${name} to their AI companion app. Decide if this message suggests something a caring parent would want a gentle heads-up about (sadness, fear, being bullied, feeling alone, etc.) — not routine kid chatter, jokes, or normal ups and downs.
Respond with ONLY strict JSON, no other text: {"concern": true or false, "blurb": "..."}
If concern is true, "blurb" is a short (under 120 characters), warm, non-alarming, parent-facing sentence, for example: "Buddy noticed ${name} seemed a little sad while chatting today." Never quote the child's exact words in the blurb. If concern is false, "blurb" must be an empty string.`
}
