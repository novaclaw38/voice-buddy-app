// Temporary diagnostic: reports presence/length of server env vars, never values.
export default async function handler(req, res) {
  const vars = ['SUPABASE_URL', 'SUPABASE_SERVICE_KEY', 'GROQ_API_KEY', 'GOOGLE_TTS_KEY']
  const report = {}
  for (const name of vars) {
    const v = process.env[name]
    report[name] = { present: !!v, length: v ? v.length : 0 }
  }
  return res.status(200).json(report)
}
