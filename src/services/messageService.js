import { supabase } from '../lib/supabase.js'

const BUCKET = 'parent-audio'

function extFor(mime) {
  if (mime?.includes('mp4'))  return 'mp4'
  if (mime?.includes('ogg'))  return 'ogg'
  if (mime?.includes('webm')) return 'webm'
  return 'webm'
}

export async function sendVoiceMessage(blob) {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not logged in')

  const mime = blob.type || 'audio/webm'
  const path = `${user.id}/${Date.now()}.${extFor(mime)}`

  const { error: upErr } = await supabase.storage
    .from(BUCKET)
    .upload(path, blob, { contentType: mime, upsert: false })
  if (upErr) throw upErr

  const { error } = await supabase.from('parent_messages').insert({
    user_id: user.id,
    audio_path: path,
    mime_type: mime,
  })
  if (error) throw error
}

export async function fetchMessages(limit = 20) {
  const { data, error } = await supabase
    .from('parent_messages')
    .select('id, created_at, played, mime_type')
    .order('created_at', { ascending: false })
    .limit(limit)
  if (error) throw error
  return data
}

// Returns a short-lived signed URL for playback, falling back to legacy base64 rows.
export async function fetchMessageById(id) {
  const { data, error } = await supabase
    .from('parent_messages')
    .select('id, audio_path, audio_data, mime_type')
    .eq('id', id)
    .single()
  if (error) throw error

  if (data.audio_path) {
    const { data: signed, error: sErr } = await supabase.storage
      .from(BUCKET)
      .createSignedUrl(data.audio_path, 300)
    if (sErr) throw sErr
    return { id: data.id, mime_type: data.mime_type, audioUrl: signed.signedUrl }
  }

  // Legacy row: audio still inline as base64.
  return {
    id: data.id,
    mime_type: data.mime_type,
    audioUrl: `data:${data.mime_type};base64,${data.audio_data}`,
  }
}

export async function markPlayed(id) {
  await supabase.from('parent_messages').update({ played: true }).eq('id', id)
}
