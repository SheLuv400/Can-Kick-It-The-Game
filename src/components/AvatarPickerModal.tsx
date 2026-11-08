import { useMemo, useState } from 'react'
import { ARTISTS } from '../game/roster'
import { Portrait } from './Portrait'

interface AvatarPickerModalProps {
  selectedId: string | null
  onSelect: (artistId: string) => void
  onClear: () => void
  onClose: () => void
}

export function AvatarPickerModal({
  selectedId,
  onSelect,
  onClear,
  onClose,
}: AvatarPickerModalProps) {
  const [query, setQuery] = useState('')
  const filtered = useMemo(() => {
    const clean = query.trim().toLowerCase()
    if (!clean) return ARTISTS
    return ARTISTS.filter((artist) =>
      `${artist.name} ${artist.crew} ${artist.genre} ${artist.city}`.toLowerCase().includes(clean),
    )
  }, [query])

  return (
    <div
      className="modal avatar-picker-modal"
      role="dialog"
      aria-modal="true"
      aria-label="Choose profile artist"
    >
      <button className="modal__scrim" onClick={onClose} aria-label="Close artist picker" />
      <div className="modal__panel avatar-picker-panel">
        <header className="avatar-picker-head">
          <div>
            <span className="kicker">CIKI ID · PROFILE ART</span>
            <h2>CHOOSE YOUR FACE</h2>
            <p>
              This artist fronts your player card, online identity and label profile. Pick one of
              the 50 artists in the game.
            </p>
          </div>
          <button className="icon-btn" onClick={onClose} aria-label="Close artist picker">
            ✕
          </button>
        </header>

        <div className="avatar-picker-tools">
          <label className="avatar-picker-search">
            <span>SEARCH THE ROSTER</span>
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="NAME, CREW, GENRE OR CITY"
              spellCheck={false}
              autoFocus
            />
          </label>
          <span className="avatar-picker-count" aria-live="polite">
            {filtered.length} / {ARTISTS.length} ARTISTS
          </span>
        </div>

        {filtered.length ? (
          <div className="avatar-picker-grid">
            {filtered.map((artist) => {
              const selected = artist.id === selectedId
              return (
                <button
                  key={artist.id}
                  type="button"
                  className={`avatar-picker-card ${selected ? 'is-selected' : ''}`}
                  onClick={() => onSelect(artist.id)}
                  aria-pressed={selected}
                  aria-label={`Use ${artist.name} as profile artist`}
                >
                  <span className="avatar-picker-card__art">
                    <Portrait artist={artist} crop="avatar" />
                    <i aria-hidden="true">{selected ? '✓' : artist.number}</i>
                  </span>
                  <b>{artist.name}</b>
                  <em>
                    {artist.crew} · {artist.genre}
                  </em>
                </button>
              )
            })}
          </div>
        ) : (
          <div className="avatar-picker-empty">
            <b>NO ARTIST MATCHES “{query.trim().toUpperCase()}”.</b>
            <span>Try a name, crew, genre or city from the roster.</span>
          </div>
        )}

        <footer className="avatar-picker-foot">
          <p>Your choice is saved to this device and broadcast to online friends.</p>
          <div>
            <button
              className="btn btn--ghost btn--sm"
              onClick={onClear}
              disabled={!selectedId}
            >
              USE INITIALS
            </button>
            <button className="btn btn--ghost btn--sm" onClick={onClose}>
              CANCEL
            </button>
          </div>
        </footer>
      </div>
    </div>
  )
}
