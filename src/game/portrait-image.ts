/**
 * Turns a pasted photo into card art in the browser: cuts a flat white
 * background from the edges, trims the empty margin and caps the width.
 * Falls back to the untouched file when the picture has no white backdrop.
 */

const MAX_WIDTH = 900
const WHITE_FLOOR = 236
const KEEP_WHOLE_ABOVE = 0.94

/** A dropped file, a dragged image URL, or nothing. */
export function droppedImage(data: DataTransfer): Blob | string | null {
  const file = Array.from(data.files).find((item) => item.type.startsWith('image/'))
  if (file) return file

  const uri = data
    .getData('text/uri-list')
    .split('\n')
    .map((line) => line.trim())
    .find((line) => line.length > 0 && !line.startsWith('#'))
  if (uri) return uri

  const html = data.getData('text/html')
  const match = html.match(/<img[^>]+src=["']([^"']+)["']/i)
  return match ? match[1] : null
}

/** Cut a dropped image when the browser allows reading it, otherwise keep the URL. */
export async function toPortraitImage(source: Blob | string): Promise<Blob | string> {
  if (typeof source !== 'string') return preparePortrait(source)
  try {
    const response = await fetch(source, { mode: 'cors' })
    if (!response.ok) throw new Error('unreachable image')
    return await preparePortrait(await response.blob())
  } catch {
    return source
  }
}

/** Downscale a finished portrait so the shipped card art stays small. */
export async function capPortrait(file: Blob, maxWidth = 720): Promise<Blob> {
  if (typeof document === 'undefined') return file

  const bitmap = await createImageBitmap(file).catch(() => null)
  if (!bitmap) return file

  if (bitmap.width <= maxWidth) {
    bitmap.close()
    return file
  }

  const canvas = document.createElement('canvas')
  canvas.width = maxWidth
  canvas.height = Math.max(1, Math.round((bitmap.height * maxWidth) / bitmap.width))
  const ctx = canvas.getContext('2d')
  if (!ctx) {
    bitmap.close()
    return file
  }

  ctx.imageSmoothingQuality = 'high'
  ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height)
  bitmap.close()

  return new Promise<Blob>((resolve) => {
    canvas.toBlob((blob) => resolve(blob ?? file), 'image/png')
  })
}

export async function preparePortrait(file: Blob): Promise<Blob> {
  if (typeof document === 'undefined') return file

  const bitmap = await createImageBitmap(file).catch(() => null)
  if (!bitmap) return file

  const scale = Math.min(1, MAX_WIDTH / Math.max(1, bitmap.width))
  const width = Math.max(1, Math.round(bitmap.width * scale))
  const height = Math.max(1, Math.round(bitmap.height * scale))

  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const ctx = canvas.getContext('2d', { willReadFrequently: true })
  if (!ctx) {
    bitmap.close()
    return file
  }
  ctx.drawImage(bitmap, 0, 0, width, height)
  bitmap.close()

  const image = ctx.getImageData(0, 0, width, height)
  const pixels = image.data
  const total = width * height

  const isWhite = (index: number) => {
    const offset = index * 4
    return (
      pixels[offset] >= WHITE_FLOOR &&
      pixels[offset + 1] >= WHITE_FLOOR &&
      pixels[offset + 2] >= WHITE_FLOOR
    )
  }

  // Flood fill the background from the border so white clothing stays intact.
  const background = new Uint8Array(total)
  const stack: number[] = []
  for (let x = 0; x < width; x += 1) {
    stack.push(x, (height - 1) * width + x)
  }
  for (let y = 0; y < height; y += 1) {
    stack.push(y * width, y * width + width - 1)
  }

  let removed = 0
  while (stack.length) {
    const index = stack.pop() as number
    if (background[index] === 1 || !isWhite(index)) continue
    background[index] = 1
    removed += 1
    const x = index % width
    if (x > 0) stack.push(index - 1)
    if (x < width - 1) stack.push(index + 1)
    if (index >= width) stack.push(index - width)
    if (index + width < total) stack.push(index + width)
  }

  if (removed > total * KEEP_WHOLE_ABOVE) return file

  let minX = width
  let minY = height
  let maxX = -1
  let maxY = -1
  for (let index = 0; index < total; index += 1) {
    if (background[index] === 1) {
      pixels[index * 4 + 3] = 0
      continue
    }
    const x = index % width
    const y = (index - x) / width
    if (x < minX) minX = x
    if (x > maxX) maxX = x
    if (y < minY) minY = y
    if (y > maxY) maxY = y
  }

  if (removed > 0) ctx.putImageData(image, 0, 0)

  const crop =
    maxX >= minX
      ? { x: minX, y: minY, w: maxX - minX + 1, h: maxY - minY + 1 }
      : { x: 0, y: 0, w: width, h: height }

  const out = document.createElement('canvas')
  out.width = crop.w
  out.height = crop.h
  const outCtx = out.getContext('2d')
  if (!outCtx) return file
  outCtx.drawImage(canvas, crop.x, crop.y, crop.w, crop.h, 0, 0, crop.w, crop.h)

  return new Promise<Blob>((resolve) => {
    out.toBlob((blob) => resolve(blob ?? file), 'image/png')
  })
}
