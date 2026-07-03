import { useState, useCallback, useRef, useEffect } from 'react'
import { chatCompletion } from '../services/chatService.js'
import { addHistory, fetchHistory } from '../services/historyService.js'
import { PROMPTS, MODE_INTROS } from '../utils/prompts.js'
import { supabase } from '../lib/supabase.js'

const MAX_HISTORY = 16

export function useChat(settings) {
  const [messages, setMessages] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [mode, setMode] = useState('chat')
  const messagesRef = useRef([])
  const modeRef = useRef('chat')
  const sessionRef = useRef({ ts: Date.now() })

  const memoryRef = useRef('')

  useEffect(() => {
    const childName = settings?.childName || 'there'

    fetchHistory(5).then(entries => {
      if (!entries?.length) return
      const lines = entries
        .map(e => `- "${(e.user_text || '').slice(0, 100)}" (${e.mode} mode)`)
        .join('\n')
      memoryRef.current = `\n\nRECENT MEMORIES — things ${childName} said in past chats:\n${lines}\nIf these come up naturally in conversation, reference them warmly to make ${childName} feel remembered.`
    }).catch(() => {})

    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) return
      supabase
        .from('lesson_completions')
        .select('course_id, lesson_id')
        .eq('user_id', user.id)
        .order('completed_at', { ascending: false })
        .limit(5)
        .then(({ data }) => {
          if (!data?.length) return
          const names = data.map(r => `${r.lesson_id} (${r.course_id})`).join(', ')
          memoryRef.current +=
            `\n\nLESSONS ${childName} HAS COMPLETED: ${names}. Celebrate their learning if the topic comes up!`
        })
    }).catch(() => {})
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const buildSystemPrompt = useCallback((currentMode) => {
    const childName  = settings?.childName  || 'there'
    const buddyName  = settings?.buddyName  || 'Buddy'
    let base
    switch (currentMode) {
      case 'story':    base = PROMPTS.story(childName, buddyName);    break
      case 'game':     base = PROMPTS.game(childName, buddyName);     break
      case 'activity': base = PROMPTS.activity(childName, buddyName); break
      case 'routine':  base = PROMPTS.routine(childName, buddyName, settings?.morningRoutine || []); break
      case 'quiz':     base = PROMPTS.quiz(childName, buddyName);     break
      case 'jokes':    base = PROMPTS.jokes(childName, buddyName);    break
      case 'sing':     base = PROMPTS.sing(childName, buddyName);     break
      case 'feelings': base = PROMPTS.feelings(childName, buddyName); break
      case 'move':     base = PROMPTS.move(childName, buddyName);     break
      case 'learn':    base = PROMPTS.learn(childName, buddyName);    break
      default:         base = PROMPTS.chat(childName, buddyName)
    }
    return base + memoryRef.current
  }, [settings])

  const switchMode = useCallback((newMode) => {
    setMode(newMode)
    modeRef.current = newMode
    const newMsgs = []
    setMessages(newMsgs)
    messagesRef.current = newMsgs
    setError(null)
    sessionRef.current = { ts: Date.now() }

    const childName = settings?.childName || 'there'
    const buddyName = settings?.buddyName  || 'Buddy'
    return MODE_INTROS[newMode]?.(childName, buddyName) || "Let's play!"
  }, [settings?.childName, settings?.buddyName])

  const sendMessage = useCallback(async (userText, currentMode) => {
    setError(null)
    const currentM = currentMode || modeRef.current
    const userMsg = { role: 'user', content: userText }

    const updatedMsgs = [...messagesRef.current, userMsg]
    messagesRef.current = updatedMsgs
    setMessages(updatedMsgs)
    setLoading(true)

    try {
      const system = { role: 'system', content: buildSystemPrompt(currentM) }
      const recent = updatedMsgs.slice(-MAX_HISTORY)
      const contextMsgs = [system, ...recent]

      const reply = await chatCompletion(contextMsgs, { mode: currentM })

      const assistantMsg = { role: 'assistant', content: reply }
      const finalMsgs = [...messagesRef.current, assistantMsg]
      messagesRef.current = finalMsgs
      setMessages(finalMsgs)

      addHistory({
        ts: Date.now(),
        mode: currentM,
        userText,
        buddyText: reply,
      })

      return reply
    } catch (err) {
      let friendly
      if (err.message === 'NO_API_KEY') {
        friendly = "Oops! I need a magic key to talk. Ask a grown-up to add it in the settings!"
      } else if (err.message === 'RATE_LIMIT') {
        friendly = "Whoa, I need a little rest! Try again in a minute, okay?"
      } else {
        friendly = "Hmm, something went a little funny! Can you try again?"
      }
      setError(friendly)
      return friendly
    } finally {
      setLoading(false)
    }
  }, [buildSystemPrompt])

  const clearChat = useCallback(() => {
    setMessages([])
    messagesRef.current = []
    setError(null)
    sessionRef.current = { ts: Date.now() }
  }, [])

  return { messages, loading, error, mode, switchMode, sendMessage, clearChat }
}
