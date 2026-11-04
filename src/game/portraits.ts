/**
 * Locked portrait art.
 *
 * Every artist's official portrait lives in `src/assets/cards/` as a 640 × 960
 * WebP (`<artist-id>.webp`) — the original 26-card set plus all 24 expansion
 * cards — and is picked up here at build time. The files are the canonical set:
 * nothing at runtime rewrites or reshuffles them. Only raster files are
 * bundled; artists without one use the procedural renderer, which is the same
 * art as the generated SVGs kept in that folder for reference.
 */
const files = import.meta.glob<string>('../assets/cards/*.{png,jpg,jpeg,webp}', {
  eager: true,
  query: '?url',
  import: 'default',
})

const PORTRAITS: Record<string, string> = {}
const RANK: Record<string, number> = {}

for (const [path, url] of Object.entries(files)) {
  const file = path.split('/').pop() ?? ''
  const match = file.match(/\.(png|jpe?g|webp|svg)$/i)
  if (!match) continue
  const id = file.slice(0, -match[0].length).toLowerCase()
  if (!id) continue

  // raster art outranks the baked svg if both exist for an artist
  const rank = match[1].toLowerCase() === 'svg' ? 1 : 0
  if (id in PORTRAITS && (RANK[id] ?? 9) <= rank) continue

  PORTRAITS[id] = url
  RANK[id] = rank
}

export function portraitUrl(id: string): string | undefined {
  return PORTRAITS[id.toLowerCase()]
}

/** True when the artist has raster source art rather than only the SVG fallback. */
export function hasRasterPortrait(id: string): boolean {
  return RANK[id.toLowerCase()] === 0
}

/** Artist ids that already have baked art, e.g. for QA and the menu. */
export const PORTRAIT_IDS = Object.keys(PORTRAITS)
