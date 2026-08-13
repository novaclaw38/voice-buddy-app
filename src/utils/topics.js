const STOPWORDS = new Set([
  'the', 'and', 'a', 'an', 'is', 'are', 'was', 'were', 'be', 'been', 'am',
  'to', 'of', 'in', 'on', 'at', 'for', 'with', 'about', 'it', 'its', 'this',
  'that', 'these', 'those', 'i', 'me', 'my', 'you', 'your', 'we', 'us',
  'he', 'she', 'they', 'them', 'his', 'her', 'their', 'do', 'does', 'did',
  'can', 'could', 'will', 'would', 'should', 'have', 'has', 'had', 'not',
  'no', 'yes', 'ok', 'okay', 'so', 'but', 'or', 'if', 'what', 'why', 'how',
  'when', 'where', 'who', 'which', 'want', 'like', 'just', 'really', 'very',
  'buddy', 'yeah', 'yep', 'hi', 'hello', 'hey', 'im', 'its', 'don', 'didn',
])

// Pulls the handful of words a child brings up most often across their
// recent chat history, so Buddy's system prompt can nod to real recurring
// interests instead of only quoting the last few messages verbatim.
export function extractTopics(userTexts, { min = 2, max = 5 } = {}) {
  const counts = new Map()
  for (const text of userTexts) {
    const words = (text || '').toLowerCase().match(/[a-z']+/g) || []
    const seenInThisText = new Set()
    for (const word of words) {
      if (word.length <= 2 || STOPWORDS.has(word) || seenInThisText.has(word)) continue
      seenInThisText.add(word)
      counts.set(word, (counts.get(word) || 0) + 1)
    }
  }
  return [...counts.entries()]
    .filter(([, count]) => count >= min)
    .sort((a, b) => b[1] - a[1])
    .slice(0, max)
    .map(([word]) => word)
}
