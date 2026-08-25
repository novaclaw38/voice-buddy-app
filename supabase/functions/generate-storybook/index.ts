// Edge Function: Generate Sunday Storybook
// Triggered weekly by cron job
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const GROQ_API_KEY = Deno.env.get('GROQ_API_KEY')!
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SUPABASE_SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_KEY')!

serve(async (req) => {
  try {
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY)

    // Get all active cadets
    const { data: cadets, error: cadetsError } = await supabase
      .from('cadets')
      .select('id, name, current_rank, total_points')
      .order('created_at', { ascending: true })

    if (cadetsError) throw cadetsError

    // Generate storybook for each cadet
    for (const cadet of cadets) {
      const prompt = `Write a short tactical storybook for a child named ${cadet.name} who is a ${getRankName(cadet.current_rank)} in the Buddy Tactical Academy. The story should be about a mission involving robotics, biology, or survival skills. Make it exciting and educational. Keep it under 500 words.`

      const groqResponse = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${GROQ_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'llama-3.3-70b-versatile',
          messages: [
            { role: 'system', content: 'You are a tactical academy instructor who writes exciting educational storybooks for children.' },
            { role: 'user', content: prompt },
          ],
          max_tokens: 1024,
          temperature: 0.8,
        }),
      })

      const groqData = await groqResponse.json()
      const storyContent = groqData.choices[0]?.message?.content || 'Story generation failed.'

      // Save storybook
      const { error: insertError } = await supabase
        .from('storybooks')
        .insert({
          cadet_id: cadet.id,
          title: `Mission ${new Date().toLocaleDateString()}`,
          content_json: {
            content: storyContent,
            rank: cadet.current_rank,
            points: cadet.total_points,
          },
          rank_at_time: cadet.current_rank,
        })

      if (insertError) console.error(`Failed to save storybook for ${cadet.name}:`, insertError)
    }

    return new Response(JSON.stringify({ success: true, count: cadets.length }), {
      headers: { 'Content-Type': 'application/json' },
    })
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    })
  }
})

function getRankName(rank: number): string {
  const ranks = ['Recruit', 'Specialist', 'Corporal', 'Sergeant', 'Lieutenant', 'Commander']
  return ranks[rank - 1] || 'Recruit'
}
