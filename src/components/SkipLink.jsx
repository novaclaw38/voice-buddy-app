import styles from './SkipLink.module.css'

/**
 * Visually hidden but focusable skip-link.
 * Renders at the top of the page; jumps to the `#main` element.
 */
export default function SkipLink({ label = 'Skip to main content' }) {
  return (
    <a href="#main" className={styles.skipLink}>
      {label}
    </a>
  )
}
