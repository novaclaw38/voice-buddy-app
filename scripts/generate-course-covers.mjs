// Generates cover art for new courses via NVIDIA NIM (FLUX.1-dev) and writes
// them to public/courses/ as webp, matching the existing course cover style.
// One-off script. Requires NVIDIA_API_KEY in .env (get one at https://build.nvidia.com).
import sharp from 'sharp'
import { writeFile, mkdir, readFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')

async function loadEnvKey() {
  if (process.env.NVIDIA_API_KEY) return process.env.NVIDIA_API_KEY
  const envFile = await readFile(join(root, '.env'), 'utf8').catch(() => '')
  const match = envFile.match(/^NVIDIA_API_KEY=(.+)$/m)
  if (!match) throw new Error('NVIDIA_API_KEY not found in .env')
  return match[1].trim()
}

const STYLE_SUFFIX =
  'flat vector illustration, children\'s educational app icon art, single clear ' +
  'friendly subject centered in frame, soft pastel candy color palette ' +
  '(purple #7c3aed, pink #ff6ba9, orange #ff9a3c, mint green #3ddc97, sky blue #4dadf7, ' +
  'sunny yellow #ffd23f), rounded shapes, gentle gradient background, whimsical ' +
  'storybook style, no text, no watermark, no logo'

const NEGATIVE_PROMPT =
  'text, watermark, logo, signature, scary, dark, realistic photo, photorealistic, ' +
  'blurry, low quality, grainy, cluttered, busy background'

const COVERS = [
  { id: 'art',       prompt: `A cheerful paintbrush painting a rainbow arc of colors onto a canvas, paint palette and colorful splashes nearby, ${STYLE_SUFFIX}` },
  { id: 'body',       prompt: `A happy cartoon child character mid-stretch showing healthy body parts, toothbrush and apple nearby, ${STYLE_SUFFIX}` },
  { id: 'weather',    prompt: `A friendly fluffy cloud with a small rain shower and a bright sun peeking beside it, a rainbow arching over, ${STYLE_SUFFIX}` },
  { id: 'community',  prompt: `A friendly firefighter, doctor, and mail carrier character standing together waving, small town buildings behind them, ${STYLE_SUFFIX}` },
]

const API_URL = 'https://ai.api.nvidia.com/v1/genai/black-forest-labs/flux.1-dev'

async function generateOne(apiKey, cover) {
  const res = await fetch(API_URL, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      Accept: 'application/json',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      prompt: `${cover.prompt} --no ${NEGATIVE_PROMPT}`,
      mode: 'base',
      width: 1344,
      height: 768,
      cfg_scale: 3.5,
      steps: 50,
      seed: 0,
      samples: 1,
    }),
  })

  if (!res.ok) {
    const body = await res.text().catch(() => '')
    throw new Error(`NIM request failed for "${cover.id}": ${res.status} ${body.slice(0, 300)}`)
  }

  const data = await res.json()
  const artifact = data.artifacts?.[0]
  if (!artifact || artifact.finishReason !== 'SUCCESS') {
    throw new Error(`NIM generation for "${cover.id}" returned ${artifact?.finishReason || 'no artifact'}`)
  }
  return Buffer.from(artifact.base64, 'base64')
}

const apiKey = await loadEnvKey()
const outDir = join(root, 'public', 'courses')
await mkdir(outDir, { recursive: true })

const manifest = []
for (const cover of COVERS) {
  process.stdout.write(`Generating ${cover.id}... `)
  const pngBuffer = await generateOne(apiKey, cover)
  const outPath = join(outDir, `${cover.id}.webp`)
  // Match existing course cover dimensions (960x549, ~1.75:1) used in CoursesPage.jsx.
  await sharp(pngBuffer).resize(960, 549, { fit: 'cover' }).webp({ quality: 85 }).toFile(outPath)
  manifest.push(cover.id)
  console.log('done')
}

console.log(`\n${manifest.length} course covers written to public/courses/`)
console.log(manifest.map((id) => `  - ${id}.webp`).join('\n'))
