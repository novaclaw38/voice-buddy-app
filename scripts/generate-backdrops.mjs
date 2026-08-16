// Generates the alternating ChildPage background scenes via NVIDIA NIM
// (Stable Diffusion 3 Medium) and writes them to public/backdrops/ as webp.
// One-off script — re-run manually if the scene list changes. Requires
// NVIDIA_API_KEY in .env (get one at https://build.nvidia.com).
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
  'flat vector illustration, soft dreamy gradient sky, pastel candy color palette ' +
  '(purple #7c3aed, pink #ff6ba9, orange #ff9a3c, mint green #3ddc97, sky blue #4dadf7, ' +
  'sunny yellow #ffd23f), whimsical children\'s storybook art, soft glowing light, ' +
  'fluffy clouds, magical and cozy, wide open sky area with no focal subject in the ' +
  'center-bottom third, no text, no watermark, no people, no characters'

const NEGATIVE_PROMPT =
  'text, watermark, logo, signature, scary, dark, realistic photo, photorealistic, ' +
  'humans, people, characters, creatures, blurry, low quality, grainy'

const SCENES = [
  { id: 'candy-castle',    prompt: `A pastel candy-colored castle floating on clouds at golden sunset, ${STYLE_SUFFIX}` },
  { id: 'rainbow-meadow',  prompt: `A giant friendly treehouse in a rainbow-colored meadow under a pastel sky, ${STYLE_SUFFIX}` },
  { id: 'starry-space',    prompt: `A cozy starry night sky with soft glowing planets and a gentle shooting star trail, ${STYLE_SUFFIX}` },
  { id: 'coral-kingdom',   prompt: `A dreamy underwater coral kingdom seen from above the waterline with soft bubbles rising, ${STYLE_SUFFIX}` },
  { id: 'enchanted-forest', prompt: `An enchanted forest clearing with giant glowing mushrooms and drifting fireflies at dusk, ${STYLE_SUFFIX}` },
]

const API_URL = 'https://ai.api.nvidia.com/v1/genai/black-forest-labs/flux.1-dev'

async function generateOne(apiKey, scene) {
  const res = await fetch(API_URL, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      Accept: 'application/json',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      prompt: `${scene.prompt} --no ${NEGATIVE_PROMPT}`,
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
    throw new Error(`NIM request failed for "${scene.id}": ${res.status} ${body.slice(0, 300)}`)
  }

  const data = await res.json()
  const artifact = data.artifacts?.[0]
  if (!artifact || artifact.finishReason !== 'SUCCESS') {
    throw new Error(`NIM generation for "${scene.id}" returned ${artifact?.finishReason || 'no artifact'}`)
  }
  return Buffer.from(artifact.base64, 'base64')
}

const apiKey = await loadEnvKey()
const outDir = join(root, 'public', 'backdrops')
await mkdir(outDir, { recursive: true })

const manifest = []
for (const scene of SCENES) {
  process.stdout.write(`Generating ${scene.id}... `)
  const jpegBuffer = await generateOne(apiKey, scene)
  const outPath = join(outDir, `${scene.id}.webp`)
  await sharp(jpegBuffer).webp({ quality: 82 }).toFile(outPath)
  manifest.push(scene.id)
  console.log('done')
}

console.log(`\n${manifest.length} backdrops written to public/backdrops/`)
console.log(manifest.map((id) => `  - ${id}.webp`).join('\n'))
