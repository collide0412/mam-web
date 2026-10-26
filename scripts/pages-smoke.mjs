import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { strict as assert } from 'node:assert'

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

assert(!/(?:src|href)="\/(?!\/)/.test(html), 'Built HTML must use relative asset URLs')
const manifest = JSON.parse(readFileSync(join(root, 'dist', 'manifest.webmanifest'), 'utf8'))
assert.equal(manifest.scope, './')
assert.equal(manifest.start_url, './')
assert.equal(manifest.display, 'standalone')
for (const size of [192, 512]) {
  const icon = manifest.icons.find((entry) => entry.sizes === `${size}x${size}`)
  assert(icon && !icon.src.startsWith('/'), 'Relative install icon required')
  const png = readFileSync(join(root, 'dist', icon.src))
  assert.equal(png.subarray(1, 4).toString(), 'PNG')
  assert.equal(png.readUInt32BE(16), size)
  assert.equal(png.readUInt32BE(20), size)
}
console.log('GitHub Pages smoke passed: relative assets, scoped manifest, valid 192/512 PNG icons, SW registration.')
