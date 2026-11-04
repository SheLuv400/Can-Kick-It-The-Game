import { useEffect } from 'react'
import type { Track } from '../game/tracks'

/**
 * The artist's record, played through Suno's official embed. No audio file ships
 * with the game: the player stays on Suno's domain, so the release always matches
 * the artist's own upload.
 */
export function TrackPlayer({ track, onClose }: { track: Track; onClose: () => void }) {
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  return (
    <div className="track-modal" role="dialog" aria-modal="true" aria-label={`${track.title} player`}>
      <button className="track-modal__scrim" onClick={onClose} aria-label="Close the player" />
      <div className="track-modal__panel">
        <div className="track-modal__head">
          <p className="kicker">
            <span className="kicker__rule" />
            NOW SPINNING · {track.year}
          </p>
          <button className="icon-btn track-modal__close" onClick={onClose} aria-label="Close">
            ✕
          </button>
        </div>

        <h2>{track.title}</h2>
        <p className="track-modal__credit">
          {track.credit} · {track.mood}
        </p>

        <iframe
          className="track-modal__frame"
          src={`${track.embedUrl}?autoplay=true`}
          title={`${track.title} on Suno`}
          allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
          loading="lazy"
        />

        <div className="track-modal__foot">
          <span>SUNO OFFICIAL PLAYER</span>
          <a className="btn btn--ghost btn--sm" href={track.shareUrl} target="_blank" rel="noreferrer">
            OPEN ON SUNO ↗
          </a>
        </div>
      </div>
    </div>
  )
}
