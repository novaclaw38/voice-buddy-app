// Onset-detection pass over each sing-along recording: decodes to mono PCM
// via ffmpeg, computes a short-time energy flux signal, peak-picks local
// maxima as candidate syllable/word onsets, then maps those onsets onto the
// song's word list (falling back to proportional interpolation between
// onsets when there are fewer onsets than words). Output: per-song word
// start times, used to replace the character-proportional karaoke heuristic
// in SingAlong.jsx with real audio-derived anchors.
import { spawnSync } from 'node:child_process'
import { writeFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')

const SR = 8000
const FRAME = 256        // 32ms
const HOP = 128          // 16ms, 50% overlap
const MIN_ONSET_GAP_S = 0.18

function decodePCM(path) {
  const res = spawnSync('ffmpeg', ['-v', 'error', '-i', path, '-ac', '1', '-ar', String(SR), '-f', 'f32le', 'pipe:1'], { maxBuffer: 1024 * 1024 * 200 })
  if (res.status !== 0) throw new Error(`ffmpeg failed for ${path}: ${res.stderr}`)
  const buf = res.stdout
  const n = Math.floor(buf.length / 4)
  const samples = new Float32Array(n)
  for (let i = 0; i < n; i++) samples[i] = buf.readFloatLE(i * 4)
  return samples
}

function rmsEnvelope(samples) {
  const frames = []
  for (let i = 0; i + FRAME <= samples.length; i += HOP) {
    let sum = 0
    for (let j = 0; j < FRAME; j++) { const v = samples[i + j]; sum += v * v }
    frames.push(Math.sqrt(sum / FRAME))
  }
  return frames // one value per HOP, time = idx * HOP / SR
}

function pickOnsets(env, startS, endS) {
  const flux = env.map((v, i) => (i === 0 ? 0 : Math.max(0, v - env[i - 1])))
  const mean = flux.reduce((a, b) => a + b, 0) / (flux.length || 1)
  const variance = flux.reduce((a, b) => a + (b - mean) ** 2, 0) / (flux.length || 1)
  const std = Math.sqrt(variance)
  const threshold = mean + 0.6 * std
  const minGapFrames = Math.round((MIN_ONSET_GAP_S * SR) / HOP)

  const candidates = []
  for (let i = 1; i < flux.length - 1; i++) {
    const t = (i * HOP) / SR
    if (t < startS || t > endS) continue
    if (flux[i] > threshold && flux[i] >= flux[i - 1] && flux[i] >= flux[i + 1]) {
      candidates.push({ t, strength: flux[i] })
    }
  }
  // Enforce a minimum gap between onsets, keeping the stronger one when two collide.
  candidates.sort((a, b) => a.t - b.t)
  const kept = []
  for (const c of candidates) {
    const last = kept[kept.length - 1]
    if (last && (c.t - last.t) * SR / HOP < minGapFrames) {
      if (c.strength > last.strength) kept[kept.length - 1] = c
    } else {
      kept.push(c)
    }
  }
  return kept
}

// Map N detected onsets onto M words. If N >= M, pick the M strongest onsets
// in time order. If N < M, use available onsets as checkpoints and
// interpolate proportionally (by character length) between consecutive
// checkpoints — still segment-local instead of drifting across the whole song.
function assignWordTimes(onsets, words, startS, endS) {
  const M = words.length
  if (M === 0) return []
  if (onsets.length >= M) {
    const byTime = [...onsets].sort((a, b) => a.t - b.t)
    // Greedily pick M onsets spread across the timeline: pick strongest
    // overall first is noisy; instead downsample evenly by index — keeps
    // temporal spread but still audio-derived (not synthetic).
    const picked = []
    for (let i = 0; i < M; i++) {
      const idx = Math.min(byTime.length - 1, Math.round((i / M) * byTime.length))
      picked.push(byTime[idx].t)
    }
    return picked
  }
  // Fewer onsets than words: build checkpoints [startS, ...onsetTimes, endS]
  // and interpolate word positions within each segment proportional to
  // character length, restarting the proportional error at every checkpoint.
  const checkpoints = [startS, ...onsets.map(o => o.t).sort((a, b) => a - b), endS]
  const segCount = checkpoints.length - 1
  const wordsPerSeg = Math.ceil(M / segCount)
  const times = []
  let wi = 0
  for (let s = 0; s < segCount && wi < M; s++) {
    const segStart = checkpoints[s]
    const segEnd = checkpoints[s + 1]
    const segWords = words.slice(wi, wi + wordsPerSeg)
    const totalChars = segWords.reduce((a, w) => a + w.length, 0) || 1
    let cum = 0
    for (const w of segWords) {
      const frac = cum / totalChars
      times.push(segStart + frac * (segEnd - segStart))
      cum += w.length
    }
    wi += segWords.length
  }
  while (times.length < M) times.push(endS) // safety pad
  return times.slice(0, M)
}

const { NURSERY_RHYMES } = await import(join(root, 'src/utils/nurseryRhymes.js'))

const out = {}
for (const rhyme of NURSERY_RHYMES) {
  const words = rhyme.lines.flatMap(l => l.trim().split(/\s+/).filter(Boolean))
  const audioPath = join(root, 'public', rhyme.audio)
  process.stdout.write(`${rhyme.id} (${words.length} words, ${rhyme.duration}s)... `)
  const samples = decodePCM(audioPath)
  const env = rmsEnvelope(samples)
  const leadIn = rhyme.leadIn || 0
  const outro = rhyme.outro || rhyme.duration
  const onsets = pickOnsets(env, leadIn, outro)
  const wordTimes = assignWordTimes(onsets, words, leadIn, outro)
  out[rhyme.id] = wordTimes
  console.log(`${onsets.length} onsets detected for ${words.length} words`)
}

let file = '// Real per-word timing anchors for sing-along karaoke highlighting, derived\n'
file += '// from onset-detection analysis (short-time energy flux peak-picking) run\n'
file += '// against each recording in public/songs — regenerate with\n'
file += '// `node scripts/analyze-sing-along-onsets.mjs` if songs/lyrics change.\n'
file += '// Each array holds one timestamp (seconds into the recording) per word in\n'
file += '// the flattened lyric order (same flattening SingAlong.jsx uses to build its\n'
file += '// word map). SingAlong.jsx falls back to proportional estimation for any\n'
file += '// song id not present here.\n'
file += 'export const WORD_TIMES = {\n'
for (const [id, times] of Object.entries(out)) {
  file += `  ${JSON.stringify(id)}: [${times.map((t) => t.toFixed(2)).join(', ')}],\n`
}
file += '}\n'
writeFileSync(join(root, 'src/utils/nurseryRhymeTimings.js'), file)
console.log('\nDone. Written to src/utils/nurseryRhymeTimings.js')
