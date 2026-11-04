/**
 * Bakes every artist's portrait into `src/assets/cards/<id>.svg`.
 *
 * The portrait set is locked: this script is the only thing that writes those
 * files, and it always renders the same deterministic art. Run it after changing
 * a roster palette or silhouette:
 *
 *   bun scripts/bake-portraits.mjs
 */
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { mkdirSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { ARTISTS } from '../src/game/roster.ts'
import { PortraitArt } from '../src/components/PortraitArt.tsx'

const here = dirname(fileURLToPath(import.meta.url))
const outDir = join(here, '..', 'src', 'assets', 'cards')
mkdirSync(outDir, { recursive: true })

// keep the in-page CSS effects that live on the SVG classes
const STYLE =
  '<style>.portrait__halo{filter:drop-shadow(0 0 6px rgba(255,255,255,.25))}</style>'

let written = 0

for (const artist of ARTISTS) {
  let svg = renderToStaticMarkup(createElement(PortraitArt, { artist }))
  svg = svg.replace(/^<svg /, '<svg width="300" height="390" ')
  svg = svg.replace(/<svg[^>]*>/, (open) => `${open}${STYLE}`)
  svg = `<?xml version="1.0" encoding="UTF-8"?>\n${svg}\n`
  writeFileSync(join(outDir, `${artist.id}.svg`), svg)
  written += 1
}

console.log(`baked ${written} locked portraits into src/assets/cards`)
