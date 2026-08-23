import { useState, useMemo, useRef, useEffect } from 'react'
import { motion, useReducedMotion } from 'motion/react'
import styles from './DragMatchCard.module.css'
import { findTargetAtPoint } from '../../utils/dragHitTest.js'

function splitEmoji(s) {
  const i = s.indexOf(' ')
  return { emoji: i > -1 ? s.slice(0, i) : '', text: i > -1 ? s.slice(i + 1) : s }
}

export default function DragMatchCard({ step, onComplete }) {
  const { targets, items, rule, prompt } = step
  const [placements, setPlacements] = useState(() =>
    Object.fromEntries(targets.map((t) => [t.id, []]))
  )
  const [selectedId, setSelectedId] = useState(null)
  const [shakeTargetId, setShakeTargetId] = useState(null)
  const targetRefs = useRef({})
  const timerRef = useRef(null)
  const shakeTimerRef = useRef(null)
  const prefersReducedMotion = useReducedMotion()

  useEffect(() => () => {
    clearTimeout(timerRef.current)
    clearTimeout(shakeTimerRef.current)
  }, [])

  const placedItemIds = useMemo(() => new Set(Object.values(placements).flat()), [placements])
  const remainingItems = items.filter((it) => !placedItemIds.has(it.id))

  const rejectPlacement = (targetId) => {
    setShakeTargetId(targetId)
    shakeTimerRef.current = setTimeout(() => setShakeTargetId(null), 400)
    setSelectedId(null)
  }

  const place = (itemId, targetId) => {
    if (placedItemIds.has(itemId)) return
    const item = items.find((it) => it.id === itemId)

    if (rule.kind === 'exact') {
      if (rule.correct[targetId] !== itemId) {
        rejectPlacement(targetId)
        return
      }
      const next = { ...placements, [targetId]: [itemId] }
      setPlacements(next)
      setSelectedId(null)
      if (targets.every((t) => next[t.id][0] === rule.correct[t.id])) {
        timerRef.current = setTimeout(() => onComplete(100), 500)
      }
      return
    }

    const currentSum = placements[targetId].reduce(
      (sum, id) => sum + items.find((it) => it.id === id).value, 0
    )
    if (currentSum + item.value > rule.max) {
      rejectPlacement(targetId)
      return
    }
    const next = { ...placements, [targetId]: [...placements[targetId], itemId] }
    setPlacements(next)
    setSelectedId(null)
    if (rule.required.every((id) => next[targetId].includes(id))) {
      timerRef.current = setTimeout(() => onComplete(100), 500)
    }
  }

  const handleChipTap = (itemId) => {
    setSelectedId((current) => (current === itemId ? null : itemId))
  }

  const handleTargetTap = (targetId) => {
    if (!selectedId) return
    place(selectedId, targetId)
  }

  const handleDragEnd = (itemId, point) => {
    const rects = Object.fromEntries(
      Object.entries(targetRefs.current)
        .filter(([, el]) => el)
        .map(([id, el]) => [id, el.getBoundingClientRect()])
    )
    const targetId = findTargetAtPoint(point, rects)
    if (targetId) place(itemId, targetId)
  }

  return (
    <div className={styles.card}>
      {prompt && <p className={styles.instruction}>{prompt}</p>}
      <div className={styles.targets}>
        {targets.map((target) => (
          <button
            key={target.id}
            ref={(el) => { targetRefs.current[target.id] = el }}
            type="button"
            className={`${styles.target} ${selectedId ? styles.targetActive : ''} ${shakeTargetId === target.id ? styles.shake : ''}`}
            onClick={() => handleTargetTap(target.id)}
          >
            <span className={styles.targetLabel}>{target.label}</span>
            <span className={styles.targetItems}>
              {placements[target.id].map((id) => splitEmoji(items.find((it) => it.id === id).label).emoji).join(' ')}
            </span>
          </button>
        ))}
      </div>
      <div className={styles.chips}>
        {remainingItems.map((item) => {
          const { emoji, text } = splitEmoji(item.label)
          return (
            <motion.div
              key={item.id}
              role="button"
              tabIndex={0}
              drag
              dragSnapToOrigin
              dragElastic={0.15}
              whileDrag={prefersReducedMotion ? undefined : { scale: 1.08, zIndex: 1 }}
              onDragEnd={(_, info) => handleDragEnd(item.id, { x: info.point.x, y: info.point.y })}
              onClick={() => handleChipTap(item.id)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); handleChipTap(item.id) }
              }}
              className={`${styles.chip} ${selectedId === item.id ? styles.chipSelected : ''}`}
            >
              {emoji && <span className={styles.chipEmoji}>{emoji}</span>}
              <span className={styles.chipText}>{text}</span>
            </motion.div>
          )
        })}
      </div>
    </div>
  )
}
