import { useState, useRef, useEffect } from 'react'
import styles from './BuddyMenu.module.css'
import { IconMenu, IconBook, IconPalette, IconGear, IconPlay } from './icons.jsx'
import useFocusTrap from '../hooks/useFocusTrap.js'

// Single overflow menu replacing the old scattered top-bar buttons (customise,
// settings) and mode tiles — one predictable place for the handful of things
// that live outside the main chat loop.
export default function BuddyMenu({ onLearn, onCustomize, onSettings, onExit, variant = 'light' }) {
  const [open, setOpen] = useState(false)
  const wrapRef = useRef(null)
  const menuRef = useRef(null)
  useFocusTrap(menuRef, open, () => setOpen(false))

  useEffect(() => {
    if (!open) return
    const onClickOutside = (e) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) setOpen(false)
    }
    document.addEventListener('mousedown', onClickOutside)
    return () => document.removeEventListener('mousedown', onClickOutside)
  }, [open])

  const pick = (fn) => () => {
    setOpen(false)
    fn?.()
  }

  return (
    <div className={styles.wrap} ref={wrapRef}>
      <button
        className={`${styles.trigger} ${variant === 'dark' ? styles.dark : ''}`}
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label="Menu"
      >
        <IconMenu size={22} />
      </button>
      {open && (
        <div className={styles.menu} role="menu" ref={menuRef}>
          <button className={styles.item} role="menuitem" onClick={pick(onLearn)}>
            <span className={styles.itemIcon} style={{ color: 'var(--c-sky)' }}><IconBook /></span> Learn
          </button>
          <button className={styles.item} role="menuitem" onClick={pick(onCustomize)}>
            <span className={styles.itemIcon} style={{ color: 'var(--c-tangerine)' }}><IconPalette /></span> Customise Buddy
          </button>
          <button className={styles.item} role="menuitem" onClick={pick(onSettings)}>
            <span className={styles.itemIcon} style={{ color: 'var(--c-grape)' }}><IconGear /></span> Parent Settings
          </button>
          {onExit && (
            <button className={styles.item} role="menuitem" onClick={pick(onExit)}>
              <span className={styles.itemIcon} style={{ color: 'var(--c-sky)' }}><IconPlay /></span> Exit Voice-Only
            </button>
          )}
        </div>
      )}
    </div>
  )
}
