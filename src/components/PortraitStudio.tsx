import { useEffect, useRef, useState } from 'react'
import type { Artist } from '../game/types'
import { droppedImage, toPortraitImage } from '../game/portrait-image'
import { useArt } from '../game/portrait-store'
import '../styles/portrait-studio.css'

/** Paste, drop or pick the artist's official photo and it lands on every card. */
export function PortraitStudio({ artist, onClose }: { artist: Artist; onClose: () => void }) {
  const art = useArt()
  const existing = art.urls[artist.id]
  const inputRef = useRef<HTMLInputElement | null>(null)
  const [busy, setBusy] = useState(false)
  const [armed, setArmed] = useState(false)
  const [status, setStatus] = useState('')

  async function take(source: Blob | string | null) {
    if (!source) {
      setStatus('NO IMAGE FOUND — COPY OR DRAG A PICTURE FIRST')
      return
    }
    if (typeof source !== 'string' && !source.type.startsWith('image/')) {
      setStatus('THAT WAS NOT AN IMAGE FILE — TRY PNG, JPG OR WEBP')
      return
    }
    setBusy(true)
    setStatus('CUTTING THE BACKGROUND…')
    try {
      const prepared = await toPortraitImage(source)
      if (typeof prepared === 'string') await art.setUrl(artist.id, prepared)
      else await art.set(artist.id, prepared)
      setStatus('SAVED · THIS ARTIST NOW USES YOUR PORTRAIT ON EVERY CARD')
    } catch {
      setStatus('THAT IMAGE DID NOT LOAD — TRY A PNG OR JPG')
    } finally {
      setBusy(false)
    }
  }

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose()
    }
    const onPaste = (event: ClipboardEvent) => {
      const items = event.clipboardData
      if (!items) return
      const file =
        Array.from(items.files).find((item) => item.type.startsWith('image/')) ??
        Array.from(items.items)
          .find((item) => item.kind === 'file' && item.type.startsWith('image/'))
          ?.getAsFile()
      if (!file) return
      event.preventDefault()
      void take(file)
    }
    window.addEventListener('keydown', onKey)
    window.addEventListener('paste', onPaste)
    return () => {
      window.removeEventListener('keydown', onKey)
      window.removeEventListener('paste', onPaste)
    }
  }, [])

  const remove = async () => {
    await art.clear(artist.id)
    setStatus('PORTRAIT REMOVED · BACK TO THE STUDIO ART')
  }

  return (
    <div
      className="portrait-studio"
      role="dialog"
      aria-modal="true"
      aria-label={`Official portrait for ${artist.name}`}
    >
      <button className="portrait-studio__scrim" onClick={onClose} aria-label="Close portrait studio" />
      <div className="portrait-studio__panel">
        <header className="portrait-studio__head">
          <div>
            <p className="portrait-studio__kicker">
              OFFICIAL PORTRAIT · SLOT {artist.slot} · №{String(artist.number).padStart(2, '0')}
            </p>
            <h2>{artist.name}</h2>
          </div>
          <button className="portrait-studio__close" onClick={onClose} aria-label="Close">
            ✕
          </button>
        </header>

        {existing && (
          <img className="portrait-studio__preview" src={existing} alt={`${artist.name} current portrait`} />
        )}

        <div
          className={`portrait-studio__drop ${armed ? 'is-armed' : ''}`}
          onDragOver={(event) => {
            event.preventDefault()
            setArmed(true)
          }}
          onDragLeave={() => setArmed(false)}
          onDrop={(event) => {
            event.preventDefault()
            setArmed(false)
            void take(droppedImage(event.dataTransfer))
          }}
        >
          <b>{busy ? 'WORKING…' : 'PASTE THE PHOTO HERE'}</b>
          <span>
            Copy the image and press Ctrl / ⌘ + V, or drag the picture straight from the chat onto this
            box.
          </span>
          <button
            className="portrait-studio__browse"
            onClick={() => inputRef.current?.click()}
            disabled={busy}
          >
            CHOOSE FILE
          </button>
          <input
            ref={inputRef}
            className="portrait-studio__input"
            type="file"
            accept="image/png,image/jpeg,image/webp"
            onChange={(event) => {
              const file = event.target.files?.[0]
              event.target.value = ''
              void take(file ?? null)
            }}
          />
        </div>

        <p className="portrait-studio__status" role="status">
          {status || 'Flat white backgrounds are cut out automatically. The crop focuses on the head and shoulders.'}
        </p>

        <footer className="portrait-studio__foot">
          {existing && (
            <button className="portrait-studio__remove" onClick={() => void remove()}>
              REMOVE PORTRAIT
            </button>
          )}
          <button className="portrait-studio__done" onClick={onClose}>
            DONE
          </button>
        </footer>
      </div>
    </div>
  )
}
