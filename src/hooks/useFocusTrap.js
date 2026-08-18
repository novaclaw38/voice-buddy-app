import { useEffect } from 'react'

// Tracks how many stacked top-level dialogs currently want <main> inert, so
// closing an inner dialog (e.g. UpgradePrompt opened from inside
// AvatarPicker) doesn't un-inert main while an outer one is still open.
let mainInertCount = 0

/**
 * Traps focus within `containerRef` while `active` is true.
 * - Cycles Tab / Shift+Tab between first and last focusable elements.
 * - Closes on Escape via `onClose`.
 * - Restores focus to the element that had it before the trap opened.
 */
export default function useFocusTrap(containerRef, active, onClose) {
  useEffect(() => {
    if (!active || !containerRef.current) return

    const container = containerRef.current
    const previouslyFocused = document.activeElement

    const focusableSelectors = [
      'button',
      'input',
      'select',
      'textarea',
      '[tabindex]:not([tabindex="-1"])',
      'a[href]',
    ]
    const focusable = Array.from(
      container.querySelectorAll(focusableSelectors.join(', '))
    ).filter((el) => !el.hasAttribute('disabled'))

    if (focusable.length > 0) {
      focusable[0].focus()
    }

    const handleKeydown = (e) => {
      if (e.key === 'Escape') {
        e.preventDefault()
        onClose?.()
        return
      }
      if (e.key !== 'Tab') return

      const first = focusable[0]
      const last = focusable[focusable.length - 1]

      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault()
        last?.focus()
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault()
        first?.focus()
      }
    }

    document.addEventListener('keydown', handleKeydown)

    // Hide the rest of the page from assistive tech while this dialog is
    // open — Tab/Escape trapping alone doesn't stop a screen reader's
    // browse-mode cursor from wandering into background content. Only
    // applies when the trapped container sits outside <main> (a top-level
    // overlay like a modal) — a trap nested inside <main> (e.g. an inline
    // ask-overlay within a screen) would otherwise inert itself.
    const main = !container.closest('main') ? document.getElementById('main') : null
    if (main) {
      mainInertCount += 1
      main.setAttribute('inert', '')
    }

    return () => {
      document.removeEventListener('keydown', handleKeydown)
      if (main) {
        mainInertCount -= 1
        if (mainInertCount <= 0) {
          mainInertCount = 0
          main.removeAttribute('inert')
        }
      }
      if (typeof previouslyFocused?.focus === 'function') {
        previouslyFocused.focus()
      }
    }
  }, [active, containerRef, onClose])
}
