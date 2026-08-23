import { useState, useRef, useEffect } from 'react'
import { motion, useMotionValue, useReducedMotion } from 'motion/react'
import styles from './SliderCard.module.css'

const CONFIRM_DELAY_MS = 500
const STEP = 1
const HANDLE_WIDTH = 28

function clamp(value, lo, hi) {
  return Math.min(hi, Math.max(lo, value))
}

export default function SliderCard({ step, onComplete }) {
  const { min, max, target, startAt, prompt } = step
  const [value, setValue] = useState(startAt ?? min)
  const trackRef = useRef(null)
  const timerRef = useRef(null)
  const x = useMotionValue(0)
  const prefersReducedMotion = useReducedMotion()

  const inTarget = value >= target.min && value <= target.max

  useEffect(() => {
    if (!inTarget) return undefined
    timerRef.current = setTimeout(() => onComplete(100), CONFIRM_DELAY_MS)
    return () => clearTimeout(timerRef.current)
  }, [inTarget, onComplete])

  useEffect(() => {
    const track = trackRef.current
    if (!track) return
    const travel = track.clientWidth - HANDLE_WIDTH
    const ratio = (value - min) / (max - min)
    x.set(travel > 0 ? ratio * travel : 0)
  }, [value, min, max, x])

  const setClamped = (next) => setValue(clamp(next, min, max))

  const handleKeyDown = (e) => {
    if (e.key === 'ArrowRight' || e.key === 'ArrowUp') { e.preventDefault(); setClamped(value + STEP) }
    if (e.key === 'ArrowLeft' || e.key === 'ArrowDown') { e.preventDefault(); setClamped(value - STEP) }
    if (e.key === 'Home') { e.preventDefault(); setClamped(min) }
    if (e.key === 'End') { e.preventDefault(); setClamped(max) }
  }

  const handleDrag = () => {
    const track = trackRef.current
    if (!track) return
    const travel = track.clientWidth - HANDLE_WIDTH
    const ratio = travel > 0 ? clamp(x.get() / travel, 0, 1) : 0
    setValue(Math.round(min + ratio * (max - min)))
  }

  return (
    <div className={styles.card}>
      {prompt && <p className={styles.instruction}>{prompt}</p>}
      <div className={styles.sliderRow}>
        <button type="button" className={styles.stepBtn} onClick={() => setClamped(value - STEP)} aria-label="Decrease">−</button>
        <div className={styles.track} ref={trackRef}>
          <div
            className={styles.targetZone}
            style={{
              left: `${((target.min - min) / (max - min)) * 100}%`,
              width: `${((target.max - target.min) / (max - min)) * 100}%`,
            }}
          />
          <motion.div
            role="slider"
            tabIndex={0}
            aria-valuemin={min}
            aria-valuemax={max}
            aria-valuenow={value}
            aria-label={prompt || 'Slider'}
            className={styles.handle}
            style={{ x }}
            drag="x"
            dragConstraints={trackRef}
            dragElastic={0}
            dragMomentum={false}
            whileDrag={prefersReducedMotion ? undefined : { scale: 1.15 }}
            onDrag={handleDrag}
            onKeyDown={handleKeyDown}
          />
        </div>
        <button type="button" className={styles.stepBtn} onClick={() => setClamped(value + STEP)} aria-label="Increase">+</button>
      </div>
      <p className={styles.readout}>{value}</p>
    </div>
  )
}
