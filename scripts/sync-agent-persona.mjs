// Copies Buddy's persona text and voice-name map from the main app into
// agent/src/generated/ so the LiveKit voice agent (a separately deployed
// Docker service — see agent/Dockerfile) stays in sync instead of drifting
// via hand-maintained copies (which is exactly how agent.ts's persona and
// googleTts.ts's voice map went stale before this script existed).
//
// Docker's build context for agent/ is scoped to that directory, so these
// files must be generated and committed ahead of time, not imported live
// across the repo boundary at build time.
//
// Only pulls in the AGENT-SYNC:START..END block of each source file — the
// agent doesn't need the whole file's surface (e.g. prompts.js's story-mode
// text and MODE_INTROS greeting pools are deliberately not synced; see the
// architecture review's candidate 13 grilling notes) — and adds the
// minimal explicit parameter types agent/'s strict tsconfig requires that a
// plain .js source doesn't carry.
//
// Re-run with `npm run sync:agent-persona` after editing:
//   - src/utils/ageBand.js
//   - src/utils/prompts.js (the AGENT-SYNC block)
//   - src/utils/voiceOptions.js (the AGENT-SYNC block)
//
// CI (.github/workflows/agent.yml) re-runs this and fails the build if the
// committed output differs, so a forgotten sync can't ship silently.
import { readFile, writeFile, mkdir } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const outDir = join(root, 'agent', 'src', 'generated')

const HEADER = (sourcePath) => `// GENERATED FILE — do not edit by hand.
// Source of truth: ${sourcePath} (AGENT-SYNC block)
// Regenerate with \`npm run sync:agent-persona\` after editing the source.

`

function extractSyncBlock(content, sourcePath) {
  const match = content.match(/\/\/ AGENT-SYNC:START.*\n([\s\S]*?)\/\/ AGENT-SYNC:END/)
  if (!match) {
    throw new Error(`No AGENT-SYNC:START/END block found in ${sourcePath}`)
  }
  return match[1].trimEnd()
}

async function writeAgeBand() {
  const sourcePath = 'src/utils/ageBand.js'
  const content = await readFile(join(root, sourcePath), 'utf8')
  // Single pure function, no default value to infer a type from — add the
  // one parameter annotation agent/'s strict tsconfig requires.
  const typed = content.replace('(age) =>', '(age: number) =>')
  await writeFile(join(outDir, 'ageBand.ts'), HEADER(sourcePath) + typed.trim() + '\n')
}

async function writePrompts() {
  const sourcePath = 'src/utils/prompts.js'
  const content = await readFile(join(root, sourcePath), 'utf8')
  let block = extractSyncBlock(content, sourcePath)

  // Add the two parameter types tsc can't infer (childAge already infers
  // `number` from its default value in base/tacticalBase; isTactical's
  // childAge has no default, so it needs an explicit annotation).
  block = block
    .replace('(childName, buddyName, childAge = 7) =>', '(childName: string, buddyName: string, childAge = 7) =>')
    .replace('(childName, buddyName, childAge = 9) =>', '(childName: string, buddyName: string, childAge = 9) =>')
    .replace('(childAge) => BAND_BY_AGE', '(childAge: number) => BAND_BY_AGE')

  const out = `import { BAND_BY_AGE } from './ageBand.ts'\n\n${block}\n`
  await writeFile(join(outDir, 'prompts.ts'), HEADER(sourcePath) + out)
}

async function writeVoiceOptions() {
  const sourcePath = 'src/utils/voiceOptions.js'
  const content = await readFile(join(root, sourcePath), 'utf8')
  const block = extractSyncBlock(content, sourcePath)
  await writeFile(join(outDir, 'voiceOptions.ts'), HEADER(sourcePath) + block + '\n')
}

async function main() {
  await mkdir(outDir, { recursive: true })
  await writeAgeBand()
  await writePrompts()
  await writeVoiceOptions()
  console.log('Synced 3 file(s) into agent/src/generated/')
}

await main()
