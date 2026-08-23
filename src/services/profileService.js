import { supabase } from '../lib/supabase.js'

export async function fetchWhatsAppPrefs() {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null
  const { data, error } = await supabase
    .from('profiles')
    .select('whatsapp_number, whatsapp_opt_in')
    .eq('id', user.id)
    .maybeSingle()
  if (error) throw error
  return { number: data?.whatsapp_number || '', optIn: !!data?.whatsapp_opt_in }
}

export async function updateWhatsAppPrefs({ number, optIn }) {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return
  const { error } = await supabase
    .from('profiles')
    .update({ whatsapp_number: number || null, whatsapp_opt_in: optIn })
    .eq('id', user.id)
  if (error) throw error
}
