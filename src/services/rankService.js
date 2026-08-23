import { supabase } from '../lib/supabase.js'

// child_ranks has no row until the child's first old-band completion —
// treat a missing row as 0 XP rather than surfacing "no data" to the UI.
export async function fetchChildRank(childId) {
  if (!childId) return null
  const { data, error } = await supabase
    .from('child_ranks')
    .select('total_xp')
    .eq('child_id', childId)
    .maybeSingle()
  if (error) { console.error('Failed to fetch child rank:', error.message); return { totalXp: 0 } }
  return { totalXp: data?.total_xp || 0 }
}

// Never writes child_ranks directly — bump_child_xp is a security definer
// RPC that checks the child belongs to the caller before writing. Fails
// closed (returns null) rather than throwing, since XP is a nice-to-have
// display, not something that should ever break a lesson completing.
export async function bumpChildXp(childId, xpDelta) {
  if (!childId) return null
  const { data, error } = await supabase.rpc('bump_child_xp', { p_child_id: childId, p_xp_delta: xpDelta })
  if (error) { console.error('Failed to bump child XP:', error.message); return null }
  return data
}
