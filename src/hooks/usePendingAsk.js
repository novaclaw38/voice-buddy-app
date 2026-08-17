import { useState, useCallback, useEffect } from 'react'

// Shared "ask → speak → listen → yes/no → branch" phase machine used by
// every Buddy flow that has to check in before doing something out of the
// blue (parent voice messages, bedtime story requests) — Buddy always asks
// first, never just launches into it. Callers own everything about *when*
// to ask (gating/priority across multiple pending asks stays in the
// caller — see the 2026-08-17 architecture review, Candidate D) and
// everything about what happens after a "yes"; this hook only owns the
// ask/listen/branch mechanics and the "no" cleanup shape, which were
// previously duplicated verbatim between the parent-message and
// story-request flows in ChildPage.jsx.
export function usePendingAsk({ speech, setBuddyText, setUiStatus }) {
  const [pending, setPending] = useState(null) // null | { prompt, onYes, onNo }

  // Used both when the child says "no" and when a caller renders its own
  // "Not now" tap button — decline() is the one place either path needs to
  // go through, so an onNo cleanup (e.g. dropping a now-declined request so
  // it isn't immediately re-offered) only has to be written once per call site.
  const decline = useCallback(() => {
    speech.stopListening()
    pending?.onNo?.()
    setPending(null)
    setBuddyText('')
  }, [speech, setBuddyText, pending])

  const ask = useCallback((prompt, onYes, onNo) => {
    setPending({ prompt, onYes, onNo })
  }, [])

  // The counterpart to decline() — used both by the internal "yes" transcript
  // match below and by a caller's own tap "Yes" button, so accepting always
  // clears pending first. Skipping that clear on the tap path (e.g. a button
  // calling its onYes handler directly) would leave phase stuck on 'ask'
  // forever once tapped, since nothing else ever resets pending to null.
  const accept = useCallback(() => {
    const onYes = pending?.onYes
    setPending(null)
    onYes?.()
  }, [pending])

  useEffect(() => {
    if (!pending) return
    const { prompt } = pending
    speech.stopListening()
    setBuddyText(prompt)
    setUiStatus('speaking')
    speech.speak(prompt, () => {
      if (!speech.supported.stt) { setUiStatus('idle'); return } // wait for tap-buttons instead
      setUiStatus('listening')
      speech.startListening((transcript) => {
        setUiStatus('idle')
        if (/\b(yes|yeah|yep|sure|please|ok|okay)\b/i.test(transcript)) {
          accept()
        } else {
          decline()
        }
      })
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pending])

  return { phase: pending ? 'ask' : null, ask, accept, decline }
}
