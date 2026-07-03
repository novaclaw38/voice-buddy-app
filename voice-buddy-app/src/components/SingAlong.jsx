import { useState, useEffect, useRef, useCallback } from 'react'
import { NURSERY_RHYMES } from '../utils/nurseryRhymes.js'
import styles from './SingAlong.module.css'

// Sing-along plays a REAL sung recording per song. Recordings have no
// per-word timestamps, so the karaoke highlight is driven by elapsed
// playback time, distributed across words by character length (longer
// words get proportionally more time) for a natural-feeling bounce.
export default function SingAlong({ onExit }) {
  const [screen, setScreen] = useState('pick') // 'pick' | 'sing' | 'credits'
  const [song, setSong] = useState(null)
  const [globalWord, setGlobalWord] = useState(-1) // index across the whole song
  const [isPlaying, setIsPlaying] = useState(false)
  const [ended, setEnded] = useState(false)
  const audioRef = useRef(null)
  const rafRef = useRef(null)

  // Flatten lyrics into a word map so we can locate the active line+word
  // from a single global word index.
  const buildWordMap = useCallback((rhyme) => {
    const map = [] // { line, word, len }
    rhyme.lines.forEach((line, li) => {
      line.trim().split(/\s+/).filter(Boolean).forEach((w, wi) => {
        map.push({ line: li, word: wi, len: w.length })
      })
    })
    return map
  }, [])

  const stopRaf = () => {
    if (rafRef.current) { cancelAnimationFrame(rafRef.current); rafRef.current = null }
  }

  const startTracking = useCallback((rhyme) => {
    stopRaf()
    const map = buildWordMap(rhyme)
    const totalChars = map.reduce((s, w) => s + w.len, 0) || 1
    const tick = () => {
      const audio = audioRef.current
      if (audio && audio.duration > 0) {
        const progress = Math.min(audio.currentTime / audio.duration, 1)
        const charPos = progress * totalChars
        let cum = 0
        let idx = map.length - 1
        for (let i = 0; i < map.length; i++) {
          cum += map[i].len
          if (charPos <= cum) { idx = i; break }
        }
        setGlobalWord(idx)
      }
      rafRef.current = requestAnimationFrame(tick)
    }
    rafRef.current = requestAnimationFrame(tick)
  }, [buildWordMap])

  const playSong = useCallback((rhyme) => {
    stopRaf()
    if (audioRef.current) { audioRef.current.pause() }
    const audio = new Audio(rhyme.audio)
    audio.preload = 'auto'
    audioRef.current = audio
    setGlobalWord(-1)
    setEnded(false)
    audio.addEventListener('ended', () => {
      stopRaf()
      setIsPlaying(false)
      setEnded(true)
      setGlobalWord(-1)
    })
    audio.addEventListener('play', () => { setIsPlaying(true); startTracking(rhyme) })
    audio.addEventListener('pause', () => { setIsPlaying(false); stopRaf() })
    audio.play().catch(() => { setIsPlaying(false) })
  }, [startTracking])

  // Cleanup on unmount
  useEffect(() => () => {
    stopRaf()
    if (audioRef.current) { audioRef.current.pause(); audioRef.current = null }
  }, [])

  const handlePickSong = (rhyme) => {
    setSong(rhyme)
    setScreen('sing')
    setTimeout(() => playSong(rhyme), 250)
  }

  const handlePlayPause = () => {
    const audio = audioRef.current
    if (!audio || audio.ended || ended) { if (song) playSong(song); return }
    if (audio.paused) { audio.play().catch(() => {}) }
    else { audio.pause() }
  }

  const handleRestart = () => { if (song) playSong(song) }

  const handleBackToPick = () => {
    stopRaf()
    if (audioRef.current) { audioRef.current.pause(); audioRef.current = null }
    setScreen('pick')
    setSong(null)
    setGlobalWord(-1)
    setIsPlaying(false)
    setEnded(false)
  }

  /* ── Song Picker ──────────────────────────────── */
  if (screen === 'pick') {
    return (
      <div className={styles.overlay}>
        <div className={styles.topBar}>
          <button className={styles.backBtn} onClick={onExit}>← Back</button>
          <span className={styles.topTitle}>🎵 Sing Along!</span>
          <div style={{ width: 70 }} />
        </div>

        <p className={styles.pickTitle}>Pick a song!</p>

        <div className={styles.songList}>
          {NURSERY_RHYMES.map((r, i) => (
            <button
              key={r.id}
              className={styles.songBtn}
              style={{ animationDelay: `${i * 0.04}s` }}
              onClick={() => handlePickSong(r)}
            >
              <span className={styles.songEmoji}>{r.emoji}</span>
              <span className={styles.songName}>{r.title}</span>
              <span className={styles.songPlayIcon} aria-hidden="true">▶</span>
            </button>
          ))}
        </div>

        <button className={styles.creditsLink} onClick={() => setScreen('credits')}>
          Song credits
        </button>
      </div>
    )
  }

  /* ── Credits (licence attribution) ────────────── */
  if (screen === 'credits') {
    return (
      <div className={styles.overlay}>
        <div className={styles.topBar}>
          <button className={styles.backBtn} onClick={() => setScreen('pick')}>← Back</button>
          <span className={styles.topTitle}>Song credits</span>
          <div style={{ width: 70 }} />
        </div>
        <div className={styles.creditsList}>
          <p className={styles.creditsIntro}>
            Recordings from Wikimedia Commons, used under their licences:
          </p>
          {NURSERY_RHYMES.map((r) => (
            <a
              key={r.id}
              className={styles.creditRow}
              href={r.credit.source}
              target="_blank"
              rel="noreferrer"
            >
              <span className={styles.creditSong}>{r.emoji} {r.title}</span>
              <span className={styles.creditMeta}>{r.credit.author} · {r.credit.license}</span>
            </a>
          ))}
        </div>
      </div>
    )
  }

  /* ── Sing Screen ──────────────────────────────── */
  // Resolve global word index → which line, and which word within it.
  const map = buildWordMap(song)
  const active = globalWord >= 0 && globalWord < map.length ? map[globalWord] : null
  const activeLine = active ? active.line : -1
  const activeWord = active ? active.word : -1

  return (
    <div className={styles.overlay}>
      <div className={styles.topBar}>
        <button className={styles.backBtn} onClick={handleBackToPick}>🎵 Songs</button>
        <span className={styles.topTitle}>{song.emoji} {song.title}</span>
        <div style={{ width: 70 }} />
      </div>

      <div className={styles.lyricsBlock}>
        {song.lines.map((line, i) => {
          const words = line.trim().split(/\s+/).filter(Boolean)
          const cls = [
            styles.lyricLine,
            i === activeLine ? styles.activeLine : '',
            i < activeLine ? styles.doneLine : '',
          ].join(' ')
          return (
            <p key={i} className={cls}>
              {i === activeLine
                ? words.map((word, wi) => (
                    <span key={wi} className={`${styles.word} ${wi === activeWord ? styles.activeWord : ''}`}>
                      {wi === activeWord && <span className={styles.dot} aria-hidden="true">●</span>}
                      {word}
                    </span>
                  ))
                : line}
            </p>
          )
        })}
      </div>

      <p className={styles.statusLine}>
        {ended ? '🎉 Great singing!' : isPlaying ? '🎵 Sing along!' : '⏸ Paused — tap play'}
      </p>

      <div className={styles.controls}>
        <button
          className={styles.replayBtn}
          onClick={handleRestart}
          aria-label="Start the song again"
        >
          🔁 Again
        </button>
        <button
          className={styles.nextBtn}
          onClick={handlePlayPause}
          aria-label={isPlaying ? 'Pause' : 'Play'}
        >
          {ended ? '🔁 Sing again' : isPlaying ? '⏸ Pause' : '▶ Play'}
        </button>
      </div>
    </div>
  )
}
