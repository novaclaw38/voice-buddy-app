export default async function handler(req, res) {
  const key = process.env.GROQ_API_KEY
  if (!key) {
    return res.status(500).json({ error: { message: 'GROQ_API_KEY not set in Vercel environment variables' } })
  }

  const ctrl = new AbortController()
  const timer = setTimeout(() => ctrl.abort(), 10000)
  try {
    const r = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${key}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'llama-3.1-8b-instant',
        messages: [{ role: 'user', content: 'ok' }],
        max_tokens: 5,
      }),
      signal: ctrl.signal,
    })
    clearTimeout(timer)
    if (!r.ok) {
      const data = await r.json().catch(() => ({}))
      return res.status(r.status).json(data)
    }
    return res.status(200).json({ ok: true })
  } catch (err) {
    clearTimeout(timer)
    return res.status(500).json({ error: { message: err.message } })
  }
}
