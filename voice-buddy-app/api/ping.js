// Health check: confirms the chat backend is configured without spending a
// Groq call (this endpoint is public, so it must be free to hit).
export default async function handler(req, res) {
  if (!process.env.GROQ_API_KEY) {
    return res.status(500).json({ error: { message: 'GROQ_API_KEY not set in Vercel environment variables' } })
  }
  res.setHeader('Cache-Control', 's-maxage=60')
  res.status(200).json({ ok: true })
}
