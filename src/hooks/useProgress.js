import { useState, useEffect, useCallback, useRef } from 'react'
import { supabase } from '../lib/supabase.js'
import { getActiveChildId } from '../utils/storage.js'
import { bumpChildXp } from '../services/rankService.js'

// Mastery tiers shown on the reward screen and parent dashboard — see
// docs/superpowers/specs/2026-07-30-learn-section-redesign-design.md §4.
export function masteryTier(score) {
  if (score == null) return null
  if (score >= 90) return 'gold'
  if (score >= 70) return 'silver'
  return 'bronze'
}

export function useProgress() {
  const [completions, setCompletions] = useState(new Set())
  const [records, setRecords] = useState(new Map()) // "course:lesson" -> { masteryScore, completedAt }
  const completionsRef = useRef(new Set())
  useEffect(() => { completionsRef.current = completions }, [completions])

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) return
      const childId = getActiveChildId()
      let query = supabase
        .from('lesson_completions')
        .select('course_id, lesson_id, mastery_score, completed_at')
        .eq('user_id', user.id)
      // Rows from before multi-child shipped have child_id = null — treat
      // those as belonging to whichever child this device resolved as
      // "active" first, so existing progress isn't orphaned.
      query = childId ? query.or(`child_id.eq.${childId},child_id.is.null`) : query
      query.then(({ data, error }) => {
        if (error) { console.error('Failed to fetch completions:', error); return }
        if (data) {
          setCompletions(new Set(data.map(r => `${r.course_id}:${r.lesson_id}`)))
          setRecords(new Map(data.map(r => [
            `${r.course_id}:${r.lesson_id}`,
            { masteryScore: r.mastery_score, completedAt: r.completed_at },
          ])))
        }
      })
    })
  }, [])

  // masteryScore is 0-100, or omitted for legacy call sites — treated as
  // full marks so old courses (no scored steps yet) still show as mastered.
  // ageBand is passed by LessonPage from the fetched lesson's own ageBand
  // field — only 'old'-band completions award tactical rank XP (see
  // docs/superpowers/specs/2026-08-23-promotion-center-design.md). It's
  // checked against the *pre-upsert* completions set below so re-completing
  // an already-done mission never double-awards XP.
  const markComplete = useCallback(async (courseId, lessonId, masteryScore = 100, ageBand = null) => {
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) return
    const childId = getActiveChildId()
    const completedAt = new Date().toISOString()
    const key = `${courseId}:${lessonId}`
    const isFirstCompletion = !completionsRef.current.has(key)
    const { error: upsertError } = await supabase.from('lesson_completions').upsert(
      { user_id: user.id, course_id: courseId, lesson_id: lessonId, child_id: childId, mastery_score: masteryScore, completed_at: completedAt },
      { onConflict: 'user_id,course_id,lesson_id,child_id' }
    )
    if (upsertError) { console.error('Failed to save completion:', upsertError); return }
    setCompletions(prev => new Set([...prev, key]))
    setRecords(prev => new Map(prev).set(key, { masteryScore, completedAt }))
    if (isFirstCompletion && ageBand === 'old') {
      bumpChildXp(childId, masteryScore).catch(() => {})
    }
  }, [])

  return { completions, records, markComplete }
}
