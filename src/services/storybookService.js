import { supabase } from '../lib/supabase.js'

// Public, token-gated read — get_recap_by_token is a security definer RPC
// grantable to `anon`, since the storybook link is opened from WhatsApp on
// a device that's very likely not signed in. Never throws: an invalid or
// expired token is a normal "not found" case for the page, not an error.
export async function fetchRecapByToken(token) {
  const { data, error } = await supabase.rpc('get_recap_by_token', { p_token: token })
  if (error) { console.error('Failed to fetch storybook recap:', error.message); return null }
  return data?.[0] || null
}
