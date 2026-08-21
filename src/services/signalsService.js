import { supabase } from '../lib/supabase.js'

function todayISO() {
  return new Date().toISOString().slice(0, 10)
}

export async function fetchTodaySignal(childId) {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null
  const { data, error } = await supabase
    .from('daily_signals')
    .select('*')
    .eq('user_id', user.id)
    .eq('child_id', childId)
    .eq('signal_date', todayISO())
    .eq('dismissed', false)
    .maybeSingle()
  if (error) throw error
  return data
}

export async function upsertSignal({ childId, blurb }) {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return
  const { error } = await supabase
    .from('daily_signals')
    .upsert(
      { user_id: user.id, child_id: childId, signal_date: todayISO(), blurb, dismissed: false },
      { onConflict: 'user_id,child_id,signal_date' }
    )
  if (error) throw error
}

export async function dismissSignal(id) {
  const { error } = await supabase.from('daily_signals').update({ dismissed: true }).eq('id', id)
  if (error) throw error
}
