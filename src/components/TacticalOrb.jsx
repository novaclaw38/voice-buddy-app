import { useState, useRef, useMemo, useEffect } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import { OrbitControls } from '@react-three/drei'
import * as THREE from 'three'
import { getAcademyRank, stateForStatus } from '../utils/academyRank.js'
import styles from './TacticalOrb.module.css'

// ── Shader source ───────────────────────────────────────────────────────────

/**
 * Core shader: a soft radial-glow sphere. uCoreIntensity drives glow
 * brightness (0 → idle, 1 → speaking/alert). uColor is the wing/rank color.
 */
const coreFragment = /* glsl */ `
  uniform float uCoreIntensity;
  uniform vec3 uColor;
  uniform float uTime;
  varying vec3 vNormal;
  varying vec3 vViewDir;
  void main() {
    float intensity = pow(0.8 - dot(vNormal, vViewDir), 2.0);
    float pulse = sin(uTime * 4.0) * 0.05 + 0.95;
    vec3 color = uColor * intensity * (uCoreIntensity * 0.8 + 0.2) * pulse;
    float alpha = intensity * (uCoreIntensity * 0.8 + 0.2);
    gl_FragColor = vec4(color, alpha);
  }
`

// ── Scanline Ring ────────────────────────────────────────────────────────────

function ScanlineRing({ radius = 1, color = [0, 245, 255], active = 1, speed = 1 }) {
  const ref = useRef()
  const geo = useMemo(() => new THREE.RingGeometry(radius - 0.02, radius, 64), [radius])

  useFrame(({ clock }) => {
    if (ref.current) {
      ref.current.rotation.x = Math.PI / 2
      ref.current.material.uniforms.uTime.value = clock.elapsedTime * speed
    }
  })

  const material = useMemo(() => {
    const c = new THREE.Color(color[0] / 255, color[1] / 255, color[2] / 255)
    return new THREE.MeshBasicMaterial({
      color: c,
      transparent: true,
      opacity: active * 0.4,
      blending: THREE.AdditiveBlending,
      side: THREE.DoubleSide,
    })
  }, [color, active])

  useEffect(() => {
    material.opacity = active * 0.4
    material.color.set(color[0] / 255, color[1] / 255, color[2] / 255)
  }, [color, active, material])

  return <mesh ref={ref} geometry={geo} material={material} />
}

// ── Equalizer bars ───────────────────────────────────────────────────────────

function EqualizerBars({ isActive, color = [0, 245, 255] }) {
  const groupRef = useRef()
  const count = 5
  const barHeight = 0.3

  // Pre-create geometries + shared material; reuse across frames
  const barGeo = useMemo(() => new THREE.PlaneGeometry(0.03, barHeight), [])
  const sharedColor = useMemo(
    () => new THREE.Color(color[0] / 255, color[1] / 255, color[2] / 255),
    [color]
  )
  const baseMaterial = useMemo(
    () =>
      new THREE.MeshBasicMaterial({
        color: sharedColor,
        transparent: true,
        opacity: 0.4,
        blending: THREE.AdditiveBlending,
        side: THREE.DoubleSide,
      }),
    [sharedColor]
  )

  useFrame(({ clock }) => {
    if (!groupRef.current) return
    const t = clock.elapsedTime
    groupRef.current.children.forEach((bar, i) => {
      const amp = isActive
        ? 0.4 + 0.6 * Math.abs(Math.sin(t * (3 + i * 0.5)))
        : 0.15 + 0.05 * Math.sin(t * 0.5 + i)
      bar.scale.y = amp
      bar.material.opacity = 0.3 + amp * 0.5
    })
  })

  return (
    <group ref={groupRef} position={[0, 0, 0.01]}>
      {Array.from({ length: count }).map((_, i) => {
        const x = (i / (count - 1) - 0.5) * 0.7
        const mat = baseMaterial.clone()
        return (
          <mesh
            key={i}
            position={[x, 0, 0]}
            geometry={barGeo}
            material={mat}
          />
        )
      })}
    </group>
  )
}

// ── Core sphere ──────────────────────────────────────────────────────────────

function OrbCore({ rankInfo, status }) {
  const ref = useRef()
  const geo = useMemo(() => new THREE.SphereGeometry(0.5, 64, 64), [])

  const color = useMemo(() => {
    if (status === 'speaking') return new THREE.Color(0, 245, 255)
    if (status === 'processing') return new THREE.Color(255, 138, 0)
    if (status === 'listening') return new THREE.Color(0, 245, 255)
    return new THREE.Color(rankInfo.color)
  }, [rankInfo.color, status])

  const material = useMemo(
    () =>
      new THREE.ShaderMaterial({
        vertexShader: /* glsl */ `
          varying vec3 vNormal;
          varying vec3 vViewDir;
          void main() {
            vNormal = normalize(normalMatrix * normal);
            vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
            vViewDir = normalize(-mvPosition.xyz);
            gl_Position = projectionMatrix * mvPosition;
          }
        `,
        fragmentShader: coreFragment,
        uniforms: {
          uTime: { value: 0 },
          uColor: { value: color },
          uCoreIntensity: { value: 0.4 },
        },
        transparent: true,
        side: THREE.DoubleSide,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      }),
    []
  )

  useFrame(({ clock }) => {
    if (ref.current) {
      material.uniforms.uTime.value = clock.elapsedTime
      const target =
        status === 'speaking' ? 1.0 : status === 'listening' ? 0.85 : status === 'processing' ? 0.6 : 0.4
      material.uniforms.uCoreIntensity.value += (target - material.uniforms.uCoreIntensity.value) * 0.12
    }
  })

  // Update color uniform when status or rank color changes
  useEffect(() => {
    material.uniforms.uColor.value = color
  }, [color, material])

  return <mesh ref={ref} geometry={geo} material={material} />
}

// ── Scene ────────────────────────────────────────────────────────────────────

function OrbScene({ totalXp = 0, wingId = null, status = 'idle', interactive = false }) {
  const rankInfo = useMemo(() => getAcademyRank(totalXp, wingId), [totalXp, wingId])
  const orbStatus = stateForStatus(status)

  const modules = rankInfo.modules.map((m) => m.uniform)
  const hasSecondaryHalo = modules.includes('uHalo')
  const hasEqualizer = modules.includes('uEqStrength')
  const hasDataHud = modules.includes('uDataHud')

  return (
    <>
      <ambientLight intensity={0.5} />
      <directionalLight position={[5, 5, 10]} intensity={0.8} />
      <pointLight position={[0, 0, 5]} intensity={0.6} color={rankInfo.color} distance={5} />

      <OrbCore rankInfo={rankInfo} status={orbStatus} />

      {/* Inner scanline ring — always on */}
      <ScanlineRing
        radius={0.65}
        color={[0, 245, 255]}
        active={orbStatus === 'processing' ? 1 : 0.6}
        speed={orbStatus === 'speaking' ? 2 : 1}
      />

      {/* Secondary halo (Specialist+) */}
      {hasSecondaryHalo && (
        <ScanlineRing
          radius={0.9}
          color={[255, 138, 0]}
          active={orbStatus === 'speaking' ? 1 : 0.35}
          speed={-1.2}
        />
      )}

      {/* Outer data ring (Commander+) */}
      {hasDataHud && (
        <ScanlineRing
          radius={1.15}
          color={[212, 175, 55]}
          active={0.5}
          speed={0.4}
        />
      )}

      {/* Equalizer bars (Specialist+) */}
      {hasEqualizer && <EqualizerBars isActive={orbStatus === 'speaking'} />}

      {interactive && <OrbitControls enableZoom={false} enablePan={false} />}
    </>
  )
}

// ── Public Component ───────────────────────────────────────────────────────

/**
 * TacticalOrb — Shader-based holographic command core.
 *
 * Props:
 *   status        — 'idle'|'listening'|'processing'|'speaking'|'thinking'|'happy'|'confused'
 *   totalXp       — cadet's total XP (drives rank-tier visual modules)
 *   wingId        — active Academy wing id (colorizes the core)
 *   rank          — numeric level (alternative to totalXp; takes precedence)
 *   interactive   — OrbitControls enabled (default: false)
 *   onError       — callback if WebGL init fails
 */
export default function TacticalOrb({
  status = 'idle',
  totalXp = 0,
  wingId = null,
  rank: rankProp = 1,
  interactive = false,
  onError = null,
  ...rest
}) {
  const effectiveLevel = rankProp ?? (totalXp > 0 ? Math.floor(totalXp / 100) + 1 : 1)
  const isBrowser = typeof window !== 'undefined'
  const [webglOk, setWebglOk] = useState(true)

  useEffect(() => {
    if (!isBrowser) return
    const canvas = document.createElement('canvas')
    const gl = canvas.getContext('webgl2') || canvas.getContext('webgl') || canvas.getContext('experimental-webgl')
    if (!gl) {
      setWebglOk(false)
      onError?.('webgl_unavailable')
    }
  }, [isBrowser, onError])

  if (!isBrowser) return null
  if (!webglOk) return <CSSOrbFallback status={status} rank={effectiveLevel} />

  return (
    <div className={styles.orb3dWrap} {...rest}>
      <Canvas
        camera={{ position: [0, 0, 3.5], fov: 40 }}
        gl={{ antialias: true, alpha: true, premultipliedAlpha: false }}
        style={{ width: '100%', height: '100%' }}
       onError={(e) => {
          console.error('TacticalOrb Canvas error:', e)
          setWebglOk(false)
          onError?.('canvas_error')
        }}
      >
        <OrbScene
          totalXp={totalXp}
          wingId={wingId}
          status={status}
          interactive={interactive}
        />
      </Canvas>
      {!interactive && <div className={styles.orbGlow} />}
    </div>
  )
}

// ── CSS fallback (browsers without WebGL / SSR) ─────────────────────────────

function CSSOrbFallback({ status = 'idle', rank = 1 }) {
  const ringClass = status === 'processing' ? styles.ringAlert : ''

  return (
    <div className={styles.container}>
      <div className={styles.orbWrapper}>
        <div className={`${styles.ringOuter1} ${ringClass}`} />
        <div className={`${styles.ringOuter2} ${ringClass ? styles.ringAlertReverse : ''}`} />
        <div className={`${styles.core} ${styles[status] || styles.idle}`}>
          {status === 'speaking' ? (
            <div className={styles.equalizer}>
              <span className={styles.bar1} />
              <span className={styles.bar2} />
              <span className={styles.bar3} />
            </div>
          ) : (
            <div className={`${styles.dot} ${status === 'processing' ? styles.dotAlert : ''}`} />
          )}
        </div>
        <div className={styles.telemetryTag}>{status.toUpperCase()}</div>
      </div>
      <div className={styles.hintText}>RANK {rank} • {status.toUpperCase()}</div>
    </div>
  )
}
