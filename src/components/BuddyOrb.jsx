import { useRef, useEffect, useMemo, useState, Suspense } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import { OrbitControls, Sphere, Torus } from '@react-three/drei'
import * as THREE from 'three'
import styles from './BuddyOrb.module.css'

// Rank tiers map to Orb visual modules.
// Recruit: standard teal core
// Specialist+: secondary halo ring appears
// Corporal+: core intensity increases
// Sergeant+: color shifts to amber on active
// Lieutenant+: tertiary scan ring
// Commander: full module set (halos + core pulse + scan ring + HUD)
const RANK_TIERS = {
  Recruit:      { tier: 1, label: 'RECRUIT CLASS',  color: '#00f5ff' },
  Specialist:   { tier: 2, label: 'SPECIALIST',     color: '#00f5ff' },
  Corporal:     { tier: 3, label: 'CORPORAL',       color: '#00f5ff' },
  Sergeant:     { tier: 3, label: 'SERGEANT',       color: '#ff8a00' },
  Lieutenant:   { tier: 4, label: 'LIEUTENANT',     color: '#ff8a00' },
  Commander:    { tier: 5, label: 'COMMANDER',      color: '#ff8a00' },
}

const RANK_NAMES = ['Recruit', 'Specialist', 'Corporal', 'Sergeant', 'Lieutenant', 'Commander']

/**
 * Orb shader: a pulsing core with an energy ring, scanline sweep, and
 * floating HUD data rings. Cursor proximity drives a subtle distortion
 * and intensifies the pulse. State prop drives color (teal idle,
 * orange alert/processing).
 *
 * Props:
 *  status:   'idle' | 'listening' | 'thinking' | 'speaking' | 'processing' | 'completed'
 *  rank:     1–6 (numeric, maps to RANK_NAMES) or a rank name string
 *  size:     canvas size in px (default 220)
 *  interactive: whether cursor tracking + orbit controls are active (default true)
 *  onBootComplete: optional callback after the boot sequence finishes
 */
export default function BuddyOrb({
  status = 'idle',
  rank = 1,
  size = 220,
  interactive = true,
  onBootComplete,
}) {
  // Resolve rank to a tier / name
  const rankName = typeof rank === 'string'
    ? rank
    : RANK_NAMES[Math.min(Math.max(Math.floor(rank), 1), 6) - 1]
  const rankTier = RANK_TIERS[rankName] || RANK_TIERS.Recruit

  // Status → color. Alert orange for active mission states.
  const statusColor = {
    idle: rankTier.color,
    listening: '#00f5ff',
    thinking: '#00f5ff',
    speaking: '#00f5ff',
    processing: '#ff8a00',
    completed: '#27ae60',
  }[status] || rankTier.color

  // Hex → normalized RGB for the shader uniform
  const statusColorUniform = useMemo(() => {
    const c = new THREE.Color(statusColor)
    return c
  }, [statusColor])

  return (
    <div
      className={styles.orbContainer}
      style={{ width: size, height: size }}
      data-rank-tier={rankTier.tier}
      data-status={status}
    >
      {/* Boot sequence overlay — visible on first mount only */}
      <BootSequence onComplete={onBootComplete} />

      <Canvas
        camera={{ position: [0, 0, 3.2], fov: 30 }}
        className={styles.canvas}
        gl={{ antialias: true, alpha: true, preserveDrawingBuffer: true }}
        onPointerMissed={() => {}}
      >
        <ambientLight intensity={0.4} />
        <pointLight intensity={1.5} position={[0, 0, 5]} color={statusColor} />

        <Suspense fallback={null}>
          <OrbitControls
            enableZoom={false}
            enablePan={false}
            autoRotate={false}
            enabled={interactive}
            rotateSpeed={0.3}
          />
          <OrbScene
            statusColor={statusColorUniform}
            rankTier={rankTier.tier}
            status={status}
            interactive={interactive}
          />
        </Suspense>
      </Canvas>

      {/* Scanline overlay (CSS, not 3D) for the HUD aesthetic */}
      <ScanlineOverlay />
    </div>
  )
}

/**
 * The 3D orb scene: core sphere, energy ring, rank-gated modules.
 */
function OrbScene({ statusColor, rankTier, status, interactive: _interactive }) {
  const coreRef = useRef()
  const ringRef = useRef()
  const scanRingRef = useRef()
  const hudRings = useRef([])
  const mouse = useRef(new THREE.Vector2())

  // Cursor tracking → distortion
  useEffect(() => {
    const handlePointerMove = (e) => {
      const rect = e.currentTarget.getBoundingClientRect()
      mouse.current.x = ((e.clientX - rect.left) / rect.width) * 2 - 1
      mouse.current.y = -((e.clientY - rect.top) / rect.height) * 2 + 1
    }
    const canvas = document.querySelector('.orbContainer canvas')
    if (canvas) {
      canvas.addEventListener('pointermove', handlePointerMove)
      return () => canvas.removeEventListener('pointermove', handlePointerMove)
    }
  }, [])

  useFrame((t) => {
    if (coreRef.current) {
      // Pulse: faster when speaking/thinking, slow when idle
      const pulseSpeed = status === 'speaking' || status === 'listening' ? 4 : status === 'processing' ? 6 : 1.5
      const pulseAmount = status === 'processing' ? 0.3 : status === 'speaking' ? 0.15 : 0.08
      const pulse = 1 + Math.sin(t * pulseSpeed) * pulseAmount

      // Cursor proximity intensifies the glow
      const dist = Math.sqrt(mouse.current.x ** 2 + mouse.current.y ** 2)
      const cursorBoost = 1 + (1 - Math.min(dist, 1)) * 0.3

      coreRef.current.scale.setScalar(pulse * cursorBoost)
      coreRef.current.material.emissive = statusColor.clone().multiplyScalar(0.3 + pulse * 0.2)
    }

    if (ringRef.current) {
      ringRef.current.rotation.y = t * 0.3
      ringRef.current.rotation.x = Math.sin(t * 0.2) * 0.1
    }

    if (scanRingRef.current) {
      scanRingRef.current.rotation.z = t * 0.5
    }

    // HUD data rings orbit slowly
    hudRings.current.forEach((ring, i) => {
      if (ring) {
        ring.rotation.y = t * (0.2 + i * 0.1)
        ring.rotation.x = t * (0.1 + i * 0.05)
      }
    })
  })

  const ringRadius = 1.1
  const scanRadius = 1.4

  return (
    <>
      {/* Core sphere — the heartbeat */}
      <Sphere ref={coreRef} args={[0.45, 48, 48]}>
        <meshBasicMaterial
          color={statusColor}
          toneMapped={false}
          transparent
          opacity={0.9}
        />
      </Sphere>

      {/* Primary energy ring (always present) */}
      <Torus ref={ringRef} args={[ringRadius, 0.03, 16, 100]} rotation={[0, 0, 0.4]}>
        <meshBasicMaterial
          color={statusColor}
          toneMapped={false}
          transparent
          opacity={0.5}
          side={THREE.DoubleSide}
        />
      </Torus>

      {/* Rank-tier 2+: secondary halo ring (perpendicular axis) */}
      {rankTier >= 2 && (
        <Torus args={[ringRadius * 0.85, 0.015, 12, 80]} rotation={[Math.PI / 2, 0, 0]}>
          <meshBasicMaterial
            color={statusColor}
            toneMapped={false}
            transparent
            opacity={0.25}
            side={THREE.DoubleSide}
          />
        </Torus>
      )}

      {/* Rank-tier 4+: tertiary scan ring */}
      {rankTier >= 4 && (
        <Torus ref={scanRingRef} args={[scanRadius, 0.02, 12, 100]} rotation={[0.3, 0, 0]}>
          <meshBasicMaterial
            color={statusColor === '#ff8a00' ? '#ff8a00' : '#00f5ff'}
            toneMapped={false}
            transparent
            opacity={0.2}
            side={THREE.DoubleSide}
          />
        </Torus>
      )}

      {/* Rank-tier 3+: floating HUD data rings (orbit at different speeds) */}
      {rankTier >= 3 && (
        <>
          {[0, 1, 2].map((i) => (
            <Torus
              key={i}
              ref={(el) => { hudRings.current[i] = el }}
              args={[ringRadius * (0.7 + i * 0.15), 0.01, 8, 60]}
              rotation={[0.5 + i * 0.7, i * 0.7, 0]}
            >
              <meshBasicMaterial
                color={statusColor}
                toneMapped={false}
                transparent
                opacity={0.1 + i * 0.05}
                side={THREE.DoubleSide}
                depthWrite={false}
              />
            </Torus>
          ))}
        </>
      )}
    </>
  )
}

/**
 * CSS scanline overlay — a subtle moving band across the orb canvas
 * for that HUD / monitor aesthetic.
 */
function ScanlineOverlay() {
  return (
    <div className={styles.scanline} aria-hidden="true" />
  )
}

/**
 * Boot sequence: terminal-style text scroll that reveals on mount,
 * then fades. Calls onBootComplete after the sequence.
 */
function BootSequence({ onComplete }) {
  const [booted, setBooted] = useState(false)

  useEffect(() => {
    const t = setTimeout(() => {
      setBooted(true)
      onComplete?.()
    }, 2800) // ~14 lines at 200ms each
    return () => clearTimeout(t)
  }, [onComplete])

  if (booted) return null

  const bootLines = [
    'SCANNING BIO-SIGS...',
    'NEURAL LINK ESTABLISHED',
    'IDENTITY VERIFIED',
    'CLEARANCE: LEVEL 1 RECRUIT',
    'ACCESSING ACADEMY DATABASE',
    'LOADING WAR ROOM MODULES',
    'SYNCING MISSION LOGS',
    'INITIALIZING TACTICAL CORE',
    'ORB CORE: AMBER → TEAL',
    'HUD RINGS: ONLINE',
    'VOICE PROTOCOL: COMMS FILTER ACTIVE',
    'PARENT LINK: SECURE CHANNEL ESTABLISHED',
    'SYSTEM STATUS: ALL SYSTEMS NOMINAL',
    'WELCOME TO THE ACADEMY, CADET.',
  ]

  return (
    <div className={styles.bootSequence}>
      <div className={styles.bootText}>
        {bootLines.map((line, i) => (
          <div
            key={i}
            className={styles.bootLine}
            style={{ animationDelay: `${i * 0.18}s` }}
          >
            {line}
          </div>
        ))}
      </div>
    </div>
  )
}

// Re-export rank data for consumers that need it
export { RANK_NAMES, RANK_TIERS }
