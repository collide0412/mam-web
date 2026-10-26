import { createServer } from 'node:http'
import { readFile } from 'node:fs/promises'
import { resolve, extname, sep } from 'node:path'

const root = resolve('dist')
const prefix = '/mam-web/'
const port = Number(process.argv[2] ?? 4174)
if (!Number.isInteger(port) || port < 1024 || port > 65535) throw new Error('Preview port must be 1024–65535')
const types = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.webmanifest': 'application/manifest+json', '.svg': 'image/svg+xml', '.png': 'image/png' }
const server = createServer(async (request, response) => {
  try {
    const pathname = decodeURIComponent(new URL(request.url ?? '/', 'http://127.0.0.1').pathname)
    if (pathname === '/mam-web') { response.writeHead(302, { Location: prefix }); response.end(); return }
    if (!pathname.startsWith(prefix)) { response.writeHead(404); response.end(); return }
    const file = resolve(root, pathname.slice(prefix.length) || 'index.html')
    if (!file.startsWith(root + sep)) { response.writeHead(403); response.end(); return }
    const content = await readFile(file)
    response.writeHead(200, { 'Content-Type': types[extname(file)] ?? 'application/octet-stream', 'Cache-Control': 'no-cache' })
    response.end(content)
  } catch {
    response.writeHead(404)
    response.end('Not found')
  }
})
server.listen(port, '127.0.0.1', () => console.log(`Pages preview: http://127.0.0.1:${port}/mam-web/`))
