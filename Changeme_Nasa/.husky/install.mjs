import { existsSync } from 'node:fs'
import { fileURLToPath } from 'node:url'

if (process.env.HUSKY !== '0' && !process.env.CI && !process.env.VERCEL &&
    process.env.NODE_ENV !== 'production') {
  const root = fileURLToPath(new URL('../../', import.meta.url))
  process.chdir(root)
  if (existsSync('.git')) {
    const { default: husky } = await import('husky')
    const error = husky('Changeme_Nasa/.husky')
    if (error) throw new Error(error)
  }
}
