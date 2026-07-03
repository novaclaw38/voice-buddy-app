import { supabase } from '../lib/supabase.js'

export async function fetchHistory(limit = 50) {
  const { data, error } = await supabase
    .from('history')
    .select('*')
    .order('ts', { ascending: false })
    .limit(limit)
  if (error) throw error
  return data
}

export async function addHistory(entry) {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return
  await supabase.from('history').insert({
    user_id: user.id,
    mode: entry.mode,
    user_text: entry.userText,
    buddy_text: entry.buddyText,
    ts: entry.ts,
  })
}

export async function deleteHistory() {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return
  await supabase.from('history').delete().eq('user_id', user.id)
}
