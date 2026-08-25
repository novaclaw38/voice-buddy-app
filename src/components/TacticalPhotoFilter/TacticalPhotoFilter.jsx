import React, { useState, useRef, useCallback } from 'react';
import styles from './TacticalPhotoFilter.module.css';
import { sounds } from '../audio/web-audio-synthesizer';

export const TacticalPhotoFilter = () => {
  const [photoUrl, setPhotoUrl] = useState(null);
  const [isCapturing, setIsCapturing] = useState(false);
  const [cameraError, setCameraError] = useState(null);
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null);

  const handleUpload = useCallback((e) => {
    if (e.target.files && e.target.files[0]) {
      sounds.playRelayClick();
      setPhotoUrl(URL.createObjectURL(e.target.files[0]));
      setCameraError(null);
    }
  }, []);

  const startCamera = useCallback(async () => {
    sounds.playPneumaticHiss();
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' },
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
      setIsCapturing(true);
      setCameraError(null);
    } catch (err) {
      setCameraError(err.message || 'Camera access denied');
      setIsCapturing(false);
    }
  }, []);

  const capturePhoto = useCallback(() => {
    if (!videoRef.current || !canvasRef.current) return;
    
    sounds.playAlertBeep();
    const video = videoRef.current;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    ctx.drawImage(video, 0, 0);
    
    const capturedUrl = canvas.toDataURL('image/png');
    setPhotoUrl(capturedUrl);
    stopCamera();
  }, []);

  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    setIsCapturing(false);
  }, []);

  const clearPhoto = useCallback(() => {
    sounds.playCommsStatic('end');
    setPhotoUrl(null);
    setCameraError(null);
  }, []);

  if (isCapturing) {
    return (
      <div className={styles.card}>
        <div className={styles.header}>[ FIELD RECON CAMERA FEED ]</div>
        <div className={styles.viewport}>
          <video
            ref={videoRef}
            autoPlay
            playsInline
            className={styles.cameraFeed}
          />
          <div className={styles.scanlineOverlay} />
          <div className={styles.tagTopLeft}>TARGET_LOCK: ACTIVE</div>
          <div className={styles.tagBottomRight}>
            LAT: -26.12 // LON: 27.90
          </div>
          <div className={styles.overlayGrid} />
        </div>
        <div className={styles.buttonRow}>
          <button onClick={capturePhoto} className={styles.captureBtn}>
            CAPTURE IMAGE
          </button>
          <button onClick={stopCamera} className={styles.cancelBtn}>
            CANCEL
          </button>
        </div>
        <canvas ref={canvasRef} className={styles.hiddenCanvas} />
      </div>
    );
  }

  return (
    <div className={styles.card}>
      <svg className={styles.hiddenSvg}>
        <filter id="tactical-cyan-filter">
          <feColorMatrix
            type="matrix"
            values="0.0 0.0 0.0 0.0 0.0
                    0.8 1.0 0.0 0.0 0.0
                    0.9 1.0 1.0 0.0 0.0
                    0.0 0.0 0.0 1.0 0.0"
          />
        </filter>
      </svg>

      <div className={styles.header}>[ FIELD RECON PHOTO FILTER ]</div>

      <div className={styles.viewport}>
        {photoUrl ? (
          <div className={styles.imageWrapper}>
            <img
              src={photoUrl}
              alt="Recon"
              className={styles.filteredImage}
            />
            <div className={styles.scanlineOverlay} />
            <div className={styles.tagTopLeft}>TARGET_LOCK: CONFIRMED</div>
            <div className={styles.tagBottomRight}>
              LAT: -26.12 // LON: 27.90
            </div>
          </div>
        ) : (
          <div className={styles.placeholder}>
            UPLOAD FIELD RECON PHOTO OR USE CAMERA TO APPLY TARGET LOCK HUD
          </div>
        )}
      </div>

      {cameraError && (
        <div className={styles.errorMsg}>{cameraError}</div>
      )}

      <div className={styles.buttonRow}>
        <label className={styles.uploadBtn}>
          UPLOAD FIELD IMAGE
          <input
            type="file"
            accept="image/*"
            onChange={handleUpload}
            className={styles.fileInput}
          />
        </label>
        <button onClick={startCamera} className={styles.cameraBtn}>
          CAMERA MODE
        </button>
        {photoUrl && (
          <button onClick={clearPhoto} className={styles.clearBtn}>
            CLEAR
          </button>
        )}
      </div>
    </div>
  );
};

export default TacticalPhotoFilter;
