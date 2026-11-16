import { readFile, writeFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import { build } from 'vite'

const entry = fileURLToPath(new URL('../../../supabase/functions/chart-assistant/chat.ts', import.meta.url))
const output = new URL('../../server/generated/assistant-evidence.mjs', import.meta.url)

const result = await build({
  configFile: false,
  envDir: false,
  logLevel: 'error',
  root: fileURLToPath(new URL('../', import.meta.url)),
  build: {
    target: 'node20',
    minify: false,
    write: false,
    lib: { entry, formats: ['es'], fileName: () => 'assistant-evidence.mjs' },
  },
})
const [chunk] = result[0].output
if (chunk.type !== 'chunk' || result[0].output.length !== 1) throw new Error('Expected one assistant module')

if (process.argv.includes('--check')) {
  const current = await readFile(output, 'utf8')
  if (current.replaceAll('\r\n', '\n') !== chunk.code) throw new Error('Run npm run build:assistant to update the server module')
} else {
  await writeFile(output, chunk.code)
}
