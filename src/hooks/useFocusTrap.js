import { useEffect } from 'react'

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
    return () => {
      document.removeEventListener('keydown', handleKeydown)
      if (typeof previouslyFocused?.focus === 'function') {
        previouslyFocused.focus()
      }
    }
  }, [active, containerRef, onClose])
}
