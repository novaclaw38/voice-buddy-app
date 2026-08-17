import { useState, useEffect, useRef } from 'react'
import { supabase } from '../../lib/supabase.js'
import { startAsParent } from '../../services/cameraSignal.js'
import { IconCamera, IconPhoto, IconLock } from '../icons.jsx'
import shared from './shared.module.css'
import styles from './CameraTab.module.css'

// Maps cameraSignal's reason codes to the copy this page owns — the
// module reports facts, not user-facing strings (same split as
// courseService/CoursesPage).
const CAMERA_ERROR_COPY = {
  'connection-lost': 'Connection lost. Make sure the app is open on the kids device.',
}

// Unlike the child side (ChildPage keeps its camera signaling alive for
// its whole session, since the child never leaves the page), the check-in
// connection here now stops when this tab unmounts — a parent switching
// to History/Settings mid-check-in was never a deliberate "keep watching
// in the background" feature (nothing in the UI even hinted the camera
// was still on), and leaving it running invisibly is a small privacy
// smell worth closing (Candidate C, decided during the 2026-08-17
// architecture review's grilling round).
export default function CameraTab({ isPro, onUpgrade }) {
  const camVideoRef = useRef(null)
  const camHandleRef = useRef(null)
  const [camStatus, setCamStatus] = useState('idle') // idle | requesting | streaming | error
  const [camError, setCamError] = useState(null)
  const [camConfirming, setCamConfirming] = useState(false)

  useEffect(() => () => { camHandleRef.current?.stop() }, [])

  const stopCamera = () => {
    camHandleRef.current?.stop()
    camHandleRef.current = null
    if (camVideoRef.current) camVideoRef.current.srcObject = null
    setCamStatus('idle')
    setCamError(null)
  }

  const startCamera = async () => {
    if (!isPro) { onUpgrade('camera'); return }
    if (camStatus !== 'idle' && camStatus !== 'error') return
    setCamConfirming(false)
    setCamError(null)

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { setCamStatus('idle'); return }

    camHandleRef.current = startAsParent(user.id, {
      onStatusChange: setCamStatus,
      onRemoteStream: (stream) => {
        if (camVideoRef.current) {
          camVideoRef.current.srcObject = stream
          camVideoRef.current.play().catch(() => {})
        }
      },
      onError: (reason) => setCamError(CAMERA_ERROR_COPY[reason] || 'Something went wrong with the camera connection.'),
    })
  }

  return (
    <div className={shared.section}>
      <h2 className={shared.sectionTitle}>
        Peace of Mind Camera {!isPro && <IconLock size={11} />}
      </h2>
      {!isPro ? (
        <button className={shared.input} style={{ textAlign: 'left', color: 'var(--ink-dim)' }} onClick={() => onUpgrade('camera')}>
          Upgrade to Pro for peace-of-mind camera check-ins
        </button>
      ) : (
        <>
          <p className={shared.hint} style={{ marginBottom: 16 }}>
            Opens the camera on the kids device so you can check in remotely.
            The app must be open on their screen.
          </p>

          <div className={styles.cameraBox}>
            <video
              ref={camVideoRef}
              className={styles.cameraVideo}
              autoPlay
              playsInline
              style={{ display: camStatus === 'streaming' ? 'block' : 'none' }}
            />
            {camStatus !== 'streaming' && (
              <div className={styles.cameraPlaceholder}>
                {camStatus === 'idle'       && <span className={styles.camIdleIcon}><IconPhoto size={34} /></span>}
                {camStatus === 'requesting' && <p className={styles.camMsg}>Connecting to device...</p>}
                {camStatus === 'error'      && <p className={styles.camErr}>{camError}</p>}
              </div>
            )}
          </div>

          {camConfirming ? (
            <div className={shared.field} style={{ marginTop: 16 }}>
              <p className={shared.hint} style={{ marginBottom: 10 }}>
                This turns on the camera on your child's device right now, without asking
                them first. Continue?
              </p>
              <div className={shared.btnRow}>
                <button className={shared.btnSave} onClick={startCamera}>Yes, start camera</button>
                <button className={shared.btnTest} onClick={() => setCamConfirming(false)}>Cancel</button>
              </div>
            </div>
          ) : (
            <div className={shared.btnRow} style={{ marginTop: 16 }}>
              {(camStatus === 'idle' || camStatus === 'error') ? (
                <button className={shared.btnSave} onClick={() => setCamConfirming(true)}>
                  <IconCamera size={16} /> Start Camera
                </button>
              ) : (
                <button className={shared.btnDanger} onClick={stopCamera}>
                  Stop Camera
                </button>
              )}
            </div>
          )}

          <p className={shared.hint} style={{ marginTop: 12 }}>
            A camera icon will appear on the kids screen while the camera is active.
          </p>
        </>
      )}
    </div>
  )
}
