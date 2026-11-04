import { useEffect, useMemo, useRef, useState } from 'react'
import { ARTISTS, CORE_ARTIST_COUNT } from '../game/roster'
import { hasRasterPortrait } from '../game/portraits'
import type { Genre } from '../game/types'
import { Portrait } from './Portrait'
import '../styles/portrait-uploader.css'

interface Draft {
  file: File
  preview: string
}

const GENRE_ORDER: Genre[] = ['HIP-HOP', 'R&B', 'POP']
const EXPANSION_ARTISTS = ARTISTS.filter((artist) => artist.number > CORE_ARTIST_COUNT)

function normalize(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/\.[a-z0-9]+$/i, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result))
    reader.onerror = () => reject(reader.error)
    reader.readAsDataURL(file)
  })
}

function imageFile(file: File): boolean {
  return file.type.startsWith('image/') || /\.(png|jpe?g|webp)$/i.test(file.name)
}

export function PortraitUploader({ onClose }: { onClose: () => void }) {
  const [drafts, setDrafts] = useState<Record<string, Draft>>({})
  const [status, setStatus] = useState('')
  const [busy, setBusy] = useState(false)
  const [armed, setArmed] = useState(false)
  const previews = useRef<Record<string, string>>({})
  const bulkInput = useRef<HTMLInputElement | null>(null)
  const count = Object.keys(drafts).length

  const groups = useMemo(
    () =>
      GENRE_ORDER.map((genre) => ({
        genre,
        artists: EXPANSION_ARTISTS.filter((artist) => artist.genre === genre),
      })).filter((group) => group.artists.length > 0),
    [],
  )

  useEffect(() => {
    const urls = previews.current
    return () => {
      Object.values(urls).forEach((url) => URL.revokeObjectURL(url))
    }
  }, [])

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !busy) onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [busy, onClose])

  function put(artistId: string, file: File) {
    if (!imageFile(file)) {
      setStatus(`${file.name} is not an image file. Use PNG, JPG or WebP.`)
      return false
    }
    const previous = previews.current[artistId]
    if (previous) URL.revokeObjectURL(previous)
    const preview = URL.createObjectURL(file)
    previews.current[artistId] = preview
    setDrafts((current) => ({ ...current, [artistId]: { file, preview } }))
    return true
  }

  function assign(files: File[]) {
    const matched: string[] = []
    const unmatched: string[] = []
    for (const file of files) {
      const fileKey = normalize(file.name)
      const artist = EXPANSION_ARTISTS.find(
        (item) => normalize(item.id) === fileKey || normalize(item.name) === fileKey,
      )
      if (!artist || !put(artist.id, file)) {
        unmatched.push(file.name)
        continue
      }
      matched.push(artist.name)
    }
    const unmatchedText = unmatched.length ? ` ${unmatched.length} unmatched.` : ''
    if (matched.length) {
      setStatus(`${matched.length} portrait${matched.length === 1 ? '' : 's'} matched.${unmatchedText}`)
    } else {
      setStatus(
        unmatched.length
          ? `No filenames matched. Use the per-artist selector below.${unmatchedText}`
          : 'Drop PNG files or choose them below.',
      )
    }
  }

  async function save() {
    const entries = Object.entries(drafts)
    if (!entries.length || busy) return
    setBusy(true)
    setStatus(`Writing ${entries.length} portrait${entries.length === 1 ? '' : 's'}…`)
    try {
      const faces: Record<string, string> = {}
      for (const [id, draft] of entries) {
        faces[id] = await fileToDataUrl(draft.file)
      }
      const response = await fetch('/api/bake-faces', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ faces }),
      })
      const payload = (await response.json()) as { written?: number; error?: string }
      if (!response.ok) throw new Error(payload.error ?? 'The dev server rejected the upload.')
      const written = payload.written ?? entries.length
      if (!written) throw new Error('The dev server accepted no portraits.')
      setStatus(`${written} portrait${written === 1 ? '' : 's'} locked into src/assets/cards. Reloading…`)
      window.setTimeout(() => window.location.reload(), 1200)
    } catch (error) {
      setStatus(error instanceof Error ? error.message.toUpperCase() : 'UPLOAD FAILED')
      setBusy(false)
    }
  }

  return (
    <div className="portrait-uploader" role="dialog" aria-modal="true" aria-label="Expansion portrait uploader">
      <button className="portrait-uploader__scrim" onClick={onClose} aria-label="Close portrait uploader" />
      <div className="portrait-uploader__panel">
        <header className="portrait-uploader__head">
          <div>
            <p className="portrait-uploader__eyebrow">DEV TOOL · SOURCE PORTRAIT BAKE</p>
            <h2>EXPANSION PORTRAIT LAB</h2>
            <p className="portrait-uploader__intro">
              Drop the remaining portrait files here. Filenames that match an artist id are assigned
              automatically; use a row selector for anything else.
            </p>
          </div>
          <button className="portrait-uploader__close" onClick={onClose} aria-label="Close" disabled={busy}>
            ✕
          </button>
        </header>

        <div className="portrait-uploader__body">
          <div
            className={`portrait-uploader__drop ${armed ? 'is-armed' : ''}`}
            onDragOver={(event) => {
              event.preventDefault()
              setArmed(true)
            }}
            onDragLeave={() => setArmed(false)}
            onDrop={(event) => {
              event.preventDefault()
              setArmed(false)
              assign(Array.from(event.dataTransfer.files))
            }}
          >
            <b>{armed ? 'DROP TO MATCH' : 'DROP ALL PNG FILES HERE'}</b>
            <span>
              Use <code>&lt;artist-id&gt;.png</code> for auto-matching, e.g.{' '}
              <code>miyah-rouge.png</code> or <code>anika-voltage.png</code>.
            </span>
            <button
              className="portrait-uploader__browse"
              onClick={() => bulkInput.current?.click()}
              disabled={busy}
            >
              CHOOSE MULTIPLE FILES
            </button>
            <input
              ref={bulkInput}
              className="portrait-uploader__input"
              type="file"
              accept="image/png,image/jpeg,image/webp"
              multiple
              onChange={(event) => {
                const files = Array.from(event.target.files ?? [])
                event.target.value = ''
                assign(files)
              }}
            />
          </div>

          {groups.map((group) => (
            <section className="portrait-uploader__group" key={group.genre}>
              <header className="portrait-uploader__group-head">
                <span>{group.genre} EXPANSION</span>
                <b>{group.artists.length} PORTRAITS</b>
              </header>
              <div className="portrait-uploader__grid">
                {group.artists.map((artist) => {
                  const draft = drafts[artist.id]
                  const locked = hasRasterPortrait(artist.id)
                  return (
                    <article
                      className={`portrait-uploader__item ${draft ? 'is-selected' : ''}`}
                      key={artist.id}
                      data-artist-id={artist.id}
                    >
                      <span className="portrait-uploader__thumb">
                        {draft ? (
                          <img src={draft.preview} alt="" />
                        ) : (
                          <Portrait artist={artist} crop="avatar" />
                        )}
                      </span>
                      <div className="portrait-uploader__copy">
                        <b>{artist.name}</b>
                        <span>{artist.id}.png</span>
                        <em className={locked ? 'is-locked' : ''}>
                          {locked ? 'RASTER LOCKED' : 'SVG FALLBACK'}
                        </em>
                      </div>
                      <label className="portrait-uploader__pick">
                        {draft ? 'REPLACE' : 'SELECT'}
                        <input
                          type="file"
                          accept="image/png,image/jpeg,image/webp"
                          onChange={(event) => {
                            const file = event.target.files?.[0]
                            event.target.value = ''
                            if (file) put(artist.id, file)
                          }}
                        />
                      </label>
                    </article>
                  )
                })}
              </div>
            </section>
          ))}
        </div>

        <footer className="portrait-uploader__foot">
          <p className="portrait-uploader__status" role="status">
            {status || 'Nothing is uploaded until you press LOCK IN. The game reloads with the new base portraits.'}
          </p>
          <div className="portrait-uploader__actions">
            <button className="portrait-uploader__cancel" onClick={onClose} disabled={busy}>
              CLOSE
            </button>
            <button
              className="portrait-uploader__submit"
              onClick={() => void save()}
              disabled={!count || busy}
            >
              {busy ? 'WRITING…' : `LOCK IN ${count || 0} PORTRAIT${count === 1 ? '' : 'S'}`}
            </button>
          </div>
        </footer>
      </div>
    </div>
  )
}
