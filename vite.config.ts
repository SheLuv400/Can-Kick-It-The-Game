import { defineConfig, type Plugin } from 'vite'
import react from '@vitejs/plugin-react'
import { mkdirSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'

const EXT: Record<string, string> = {
  'image/png': 'png',
  'image/jpeg': 'jpg',
  'image/webp': 'webp',
}

/**
 * Dev-only bridge for portraits pasted into the browser.
 *
 * The game posts the faces it holds to `/api/bake-faces`; they are written into
 * `src/assets/cards/<artist-id>.png` and become the shipped card art. This route
 * only exists on the dev server — a production build has no server to write to.
 */
function faceBakePlugin(): Plugin {
  return {
    name: 'ciki-face-bake',
    apply: 'serve',
    configureServer(server) {
      server.middlewares.use('/api/bake-faces', (req, res, next) => {
        if (req.method !== 'POST') {
          next()
          return
        }

        const chunks: Buffer[] = []
        let size = 0

        req.on('data', (chunk: Buffer) => {
          size += chunk.length
          if (size > 120 * 1024 * 1024) {
            req.destroy()
            return
          }
          chunks.push(chunk)
        })

        req.on('end', () => {
          try {
            const pack = JSON.parse(Buffer.concat(chunks).toString('utf8')) as {
              faces?: Record<string, string>
            }
            const dir = join(server.config.root, 'src', 'assets', 'cards')
            mkdirSync(dir, { recursive: true })

            let written = 0
            for (const [id, dataUrl] of Object.entries(pack.faces ?? {})) {
              if (!/^[a-z0-9][a-z0-9-]{0,39}$/.test(id)) continue
              const match = /^data:(image\/(?:png|jpeg|webp));base64,([A-Za-z0-9+/=]+)$/.exec(dataUrl)
              if (!match) continue

              const buffer = Buffer.from(match[2], 'base64')
              if (buffer.byteLength < 1500) continue

              writeFileSync(join(dir, `${id}.${EXT[match[1]]}`), buffer)
              written += 1
            }

            server.config.logger.info(`[faces] saved ${written} card portraits into src/assets/cards`)
            res.setHeader('content-type', 'application/json')
            res.end(JSON.stringify({ written }))
          } catch (error) {
            res.statusCode = 400
            res.setHeader('content-type', 'application/json')
            res.end(JSON.stringify({ error: String(error) }))
          }
        })
      })
    },
  }
}

export default defineConfig({
  plugins: [react(), faceBakePlugin()],
  server: {
    host: '0.0.0.0',
    port: 3000,
    strictPort: true,
  },
})
