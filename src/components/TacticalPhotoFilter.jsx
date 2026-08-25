import { useState } from 'react'
import styles from './TacticalPhotoFilter.module.css'

export default function TacticalPhotoFilter() {
  const [photoUrl, setPhotoUrl] = useState(null)

  const handleUpload = (e) => {
    if (e.target.files && e.target.files[0]) {
      setPhotoUrl(URL.createObjectURL(e.target.files[0]))
    }
  }

  return (
    <div className={styles.wrap}>
      <svg className={styles.svgFilter} aria-hidden="true">
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

      <div className={styles.preview}>
        {photoUrl ? (
          <div className={styles.previewInner}>
            <img
              src={photoUrl}
              alt="Recon scan"
              className={styles.previewImg}
              style={{ filter: 'url(#tactical-cyan-filter) contrast(150%) brightness(90%)' }}
            />
            <div className={styles.scanlineOverlay} />
            <div className={styles.hudTop}>TARGET_LOCK: CONFIRMED</div>
            <div className={styles.hudBottom}>LAT: -26.12 // LON: 27.90</div>
          </div>
        ) : (
          <div className={styles.placeholder}>UPLOAD FIELD RECON PHOTO TO APPLY TARGET LOCK HUD</div>
        )}
      </div>

      <label className={styles.uploadBtn}>
        UPLOAD FIELD IMAGE
        <input type="file" accept="image/*" onChange={handleUpload} className={styles.fileInput} />
      </label>
    </div>
  )
}
