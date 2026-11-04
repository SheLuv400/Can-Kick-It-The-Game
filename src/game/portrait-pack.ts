/**
 * Face packs.
 *
 * Imported portraits live in the browser's IndexedDB, which is tied to the
 * origin serving the game. A backup writes every face into one JSON file so the
 * set can be restored after a storage wipe, a browser change or a new preview
 * address.
 */
export interface FacePack {
  version: 1
  faces: Record<string, string>
}

export function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result))
    reader.onerror = () => reject(reader.error)
    reader.readAsDataURL(blob)
  })
}

async function urlToDataUrl(url: string): Promise<string | null> {
  try {
    const response = await fetch(url)
    if (!response.ok) return null
    return await blobToDataUrl(await response.blob())
  } catch {
    return null
  }
}

/** Download every imported face as one restorable file. */
export async function exportPortraits(urls: Record<string, string>): Promise<number> {
  const faces: Record<string, string> = {}
  for (const [id, url] of Object.entries(urls)) {
    const data = await urlToDataUrl(url)
    if (data) faces[id] = data
  }
  const pack: FacePack = { version: 1, faces }
  const file = new Blob([JSON.stringify(pack)], { type: 'application/json' })
  const href = URL.createObjectURL(file)
  const link = document.createElement('a')
  link.href = href
  link.download = 'can-i-kick-it-faces.json'
  link.click()
  window.setTimeout(() => URL.revokeObjectURL(href), 5000)
  return Object.keys(faces).length
}

/** Read a backup file back into blobs, keyed by artist id. */
export async function readPortraitPack(file: File): Promise<Record<string, Blob>> {
  const parsed = JSON.parse(await file.text()) as Partial<FacePack>
  const faces = parsed?.faces ?? {}
  const out: Record<string, Blob> = {}
  for (const [id, dataUrl] of Object.entries(faces)) {
    try {
      const response = await fetch(dataUrl)
      out[id] = await response.blob()
    } catch {
      /* skip an unreadable entry rather than losing the rest */
    }
  }
  return out
}
