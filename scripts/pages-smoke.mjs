import { readFileSync } from 'node:fs'
import { join } from 'node:path'

const root = process.cwd()
const distPath = join(root, 'dist', 'index.html')
const html = readFileSync(distPath, 'utf8')

const checks = [
  'Măm',
  'manifest.webmanifest',
  'registerSW',
  '<div id="root">',
]

const missing = checks.filter((check) => !html.includes(check))

if (missing.length > 0) {
  console.error(`GitHub Pages smoke check failed: missing markers ${missing.join(', ')}`)
  process.exit(1)
}

console.log('GitHub Pages smoke check passed.')
