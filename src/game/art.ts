/** Tiny IndexedDB store for portraits the player imports in the browser. */

const DB_NAME = 'ciki-portraits'
const STORE = 'art'
const VERSION = 1

function open(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, VERSION)
    request.onupgradeneeded = () => {
      const db = request.result
      if (!db.objectStoreNames.contains(STORE)) db.createObjectStore(STORE)
    }
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error)
  })
}

export type PortraitValue = Blob | string

export async function loadPortraits(): Promise<Record<string, PortraitValue>> {
  if (typeof indexedDB === 'undefined') return {}
  try {
    const db = await open()
    return await new Promise((resolve, reject) => {
      const cursor = db.transaction(STORE, 'readonly').objectStore(STORE).openCursor()
      const found: Record<string, PortraitValue> = {}
      cursor.onsuccess = () => {
        const entry = cursor.result
        if (!entry) {
          resolve(found)
          return
        }
        found[String(entry.key)] = entry.value as PortraitValue
        entry.continue()
      }
      cursor.onerror = () => reject(cursor.error)
    })
  } catch {
    return {}
  }
}

export async function savePortrait(id: string, value: PortraitValue): Promise<void> {
  if (typeof indexedDB === 'undefined') return
  try {
    const db = await open()
    await new Promise((resolve, reject) => {
      const request = db.transaction(STORE, 'readwrite').objectStore(STORE).put(value, id)
      request.onsuccess = () => resolve(undefined)
      request.onerror = () => reject(request.error)
    })
  } catch {
    /* private mode or a full quota: the card keeps its studio art */
  }
}

export async function deletePortrait(id: string): Promise<void> {
  if (typeof indexedDB === 'undefined') return
  try {
    const db = await open()
    await new Promise((resolve, reject) => {
      const request = db.transaction(STORE, 'readwrite').objectStore(STORE).delete(id)
      request.onsuccess = () => resolve(undefined)
      request.onerror = () => reject(request.error)
    })
  } catch {
    /* ignore */
  }
}
