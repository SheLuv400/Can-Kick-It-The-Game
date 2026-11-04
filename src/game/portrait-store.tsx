import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react'
import { deletePortrait, loadPortraits, savePortrait } from './art'

interface PortraitArt {
  /** artist id -> image URL for the imported portrait */
  urls: Record<string, string>
  set: (id: string, blob: Blob) => Promise<void>
  setUrl: (id: string, url: string) => Promise<void>
  clear: (id: string) => Promise<void>
}

const ArtContext = createContext<PortraitArt>({
  urls: {},
  set: async () => {},
  setUrl: async () => {},
  clear: async () => {},
})

export function ArtProvider({ children }: { children: ReactNode }) {
  const [urls, setUrls] = useState<Record<string, string>>({})
  const urlsRef = useRef(urls)
  urlsRef.current = urls

  useEffect(() => {
    let cancelled = false
    void loadPortraits().then((stored) => {
      if (cancelled) return
      const next: Record<string, string> = {}
      for (const [id, value] of Object.entries(stored)) {
        next[id] = typeof value === 'string' ? value : URL.createObjectURL(value)
      }
      setUrls(next)
    })
    const current = urlsRef
    return () => {
      cancelled = true
      for (const url of Object.values(current.current)) {
        if (url.startsWith('blob:')) URL.revokeObjectURL(url)
      }
    }
  }, [])

  const set = useCallback(async (id: string, blob: Blob) => {
    await savePortrait(id, blob)
    const url = URL.createObjectURL(blob)
    setUrls((previous) => {
      if (previous[id]) URL.revokeObjectURL(previous[id])
      return { ...previous, [id]: url }
    })
  }, [])

  const setUrl = useCallback(async (id: string, url: string) => {
    await savePortrait(id, url)
    setUrls((previous) => {
      if (previous[id]?.startsWith('blob:')) URL.revokeObjectURL(previous[id])
      return { ...previous, [id]: url }
    })
  }, [])

  const clear = useCallback(async (id: string) => {
    await deletePortrait(id)
    setUrls((previous) => {
      const next = { ...previous }
      if (next[id]?.startsWith('blob:')) URL.revokeObjectURL(next[id])
      delete next[id]
      return next
    })
  }, [])

  const value = useMemo(() => ({ urls, set, setUrl, clear }), [urls, set, setUrl, clear])
  return <ArtContext.Provider value={value}>{children}</ArtContext.Provider>
}

export function useArt(): PortraitArt {
  return useContext(ArtContext)
}
