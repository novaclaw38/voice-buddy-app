// Single-shot Groq call for the weekly-digest narrative — deliberately not
// the multi-model fallback loop in chat.js (that's built for a user waiting
// on a reply; a background job can just skip this child's narrative and
// retry next week if Groq has a bad moment, no need for retry complexity).

export async function generateWeeklyNarrative(childName, lessonsSummary, chatHighlights) {
  const key = process.env.GROQ_API_KEY
  if (!key) return null

  const lessonsText = lessonsSummary.length
    ? lessonsSummary.map((l) => `- ${l.title} (mastery ${l.masteryScore ?? 'n/a'})`).join('\n')
    : '- No missions completed this week'
  const chatText = chatHighlights.length
    ? chatHighlights.slice(0, 10).join('\n')
    : '(no notable chat moments this week)'

  const prompt = `You are Buddy, a tactical-specialist AI companion for a child. Write a short (3-4 sentence), upbeat, hero-framing recap paragraph of ${childName}'s week for their parent, in Buddy's "Recruit"/mission-briefing voice. Base it on:\n\nMissions completed:\n${lessonsText}\n\nChat highlights:\n${chatText}\n\nWrite only the recap paragraph, no preamble.`

  const ctrl = new AbortController()
  const timer = setTimeout(() => ctrl.abort(), 20000)
  try {
    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${key}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'llama-3.3-70b-versatile',
        messages: [{ role: 'user', content: prompt }],
        max_tokens: 220,
        temperature: 0.8,
      }),
      signal: ctrl.signal,
    })
    if (!response.ok) {
      console.error('weekly-digest: groq narrative failed', response.status)
      return null
    }
    const data = await response.json()
    return data?.choices?.[0]?.message?.content?.trim() || null
  } catch (err) {
    console.error('weekly-digest: groq narrative request failed', err)
    return null
  } finally {
    clearTimeout(timer)
  }
}
