// Tactical Storybook Generator - Enhanced Sunday Storybook Content
// Generates full tactical storybook content with sections, image prompts, and parent prompts
// Extends the basic narrative from _groqNarrative.js with full storybook structure

const TACTICAL_SYSTEM_PROMPT = `You are "The Tactical Storyteller," an AI that transforms children's educational achievements into immersive military-tactical adventure stories. Each story features the child as the protagonist "Specialist" in age-appropriate tactical scenarios that mirror their real learning.

Write in Buddy's "Recruit" mission-briefing voice — upbeat, heroic, slightly military but never violent. Emphasize:
- Problem-solving and intelligence gathering
- Teamwork and leadership
- Science/engineering discovery framed as "field craft"
- Growth and mastery through missions

Format your response as JSON with this exact structure:
{
  "title": "Mission Briefing Title",
  "content": "Full story narrative text (3-5 paragraphs, ~200-300 words total)",
  "missions": [
    {
      "title": "Mission name",
      "description": "Brief description of what was accomplished",
      "masteryScore": number (1-100)
    }
  ],
  "achievements": ["Badge 1", "Badge 2", "Badge 3"],
  "parentPrompt": "One question prompt for parents to ask their child",
  "imagePrompts": [
    "Detailed image prompt for AI illustration 1",
    "Detailed image prompt for AI illustration 2"
  ]
}

Image prompts should be detailed, kid-friendly, and consistent with the tactical theme (e.g., "A young specialist in a futuristic command center with holographic displays showing robot schematics, digital art style, vibrant teal and orange colors, children's book illustration").

Do NOT include any preamble or explanation outside the JSON structure.`

// Generate a full tactical storybook from child's weekly data
export async function generateTacticalStorybook(childName, childRank, lessonsSummary, chatHighlights, weeklyXp) {
  const key = process.env.GROQ_API_KEY
  if (!key) {
    console.error('GROQ_API_KEY not configured')
    return null
  }

  // Build the data summary for the prompt
  const lessonsText = lessonsSummary.length
    ? lessonsSummary.map((l) => `- ${l.title} (mastery ${l.masteryScore ?? 'n/a'})`).join('\n')
    : '- No missions completed this week'

  const chatText = chatHighlights.length
    ? chatHighlights.slice(0, 10).join('\n')
    : '(no notable chat moments this week)'

  // Determine tactical wing based on lessons
  const wing = inferTacticalWing(lessonsSummary)
  const rankName = getRankName(childRank)

  const prompt = `
Create a tactical storybook entry for Specialist ${childName}, currently at Rank ${rankName} (${childRank}/6) in the Buddy Tactical Academy. This week's training focused on the ${wing} wing.

Specialist ${childName} earned ${weeklyXp || 0} XP this week.

Missions completed this week:
${lessonsText}

Notable communications:
${chatText}

Generate the storybook content following the system prompt instructions. Frame their real lessons as tactical missions, and include a parent question prompt that encourages conversation about the learning.
`

  const ctrl = new AbortController()
  const timer = setTimeout(() => ctrl.abort(), 25000)

  try {
    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${key}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'llama-3.3-70b-versatile',
        messages: [
          { role: 'system', content: TACTICAL_SYSTEM_PROMPT },
          { role: 'user', content: prompt.trim() },
        ],
        max_tokens: 1500,
        temperature: 0.8,
      }),
      signal: ctrl.signal,
    })

    if (!response.ok) {
      console.error('tactical-storybook: Groq call failed', response.status)
      return null
    }

    const data = await response.json()
    const raw = data?.choices?.[0]?.message?.content?.trim()

    if (!raw) return null

    // Parse JSON response
    try {
      const parsed = JSON.parse(raw.replace(/^```json\n?/, '').replace(/\n?```$/, ''))
      return {
        ...parsed,
        childName,
        childRank,
        rankName,
        wing,
        weeklyXp,
      }
    } catch (parseErr) {
      console.error('tactical-storybook: JSON parse failed, using fallback:', parseErr.message)
      // Fallback to basic narrative
      return {
        title: `${childName}'s Tactical Mission Report`,
        content: raw,
        missions: lessonsSummary.slice(0, 4).map(l => ({
          title: l.title,
          description: 'Mission completed',
          masteryScore: l.masteryScore || 75,
        })),
        achievements: ['Mission Specialist Badge'],
        parentPrompt: `Ask ${childName}: What was the most challenging part of this week's missions?`,
        imagePrompts: [],
        childName,
        childRank,
        rankName,
        wing,
        weeklyXp,
      }
    }
  } catch (err) {
    console.error('tactical-storybook: request failed', err)
    return null
  } finally {
    clearTimeout(timer)
  }
}

// Map lesson titles to tactical Wing
function inferTacticalWing(lessons) {
  const titles = lessons.map((l) => (l.title || '').toLowerCase()).join(' ')
  if (titles.includes('robotic') || titles.includes('logic') || titles.includes('circuit') || titles.includes('neural'))
    return 'robotics'
  if (titles.includes('animal') || titles.includes('beast') || titles.includes('camouflage') || titles.includes('predator'))
    return 'beast-intel'
  if (titles.includes('cook') || titles.includes('fuel') || titles.includes('nutri') || titles.includes('ingredient'))
    return 'field-rations'
  if (titles.includes('nature') || titles.includes('weather') || titles.includes('environment') || titles.includes('recon'))
    return 'env-recon'
  if (titles.includes('garden') || titles.includes('plant') || titles.includes('botany') || titles.includes('leaf'))
    return 'botany-ops'
  return 'general'
}

// Rank name mapping
function getRankName(rank) {
  const ranks = {
    1: 'Recruit',
    2: 'Specialist',
    3: 'Corporal',
    4: 'Sergeant',
    5: 'Lieutenant',
    6: 'Commander',
  }
  return ranks[rank] || 'Recruit'
}

// Backward-compatible export — the existing weekly-digest cron calls this
export async function generateWeeklyNarrative(childName, lessonsSummary, chatHighlights) {
  const result = await generateTacticalStorybook(childName, 1, lessonsSummary, chatHighlights, 0)
  return result?.content || null
}
