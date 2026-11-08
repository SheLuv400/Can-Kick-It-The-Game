import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { audioEngine } from '../game/audio'

interface TrackPlayerProps {
  title: string
  artist: string
  mood?: string
  embedUrl: string
  onClose: () => void
}

const SOURCE_WIDTH = 520
const SOURCE_HEIGHT = 240

/**
 * In-game record player. The source player is cropped at the top-right and
 * bottom-right so its wordmark and outbound link never appear; the guards make
 * only the play/pause control and seek bar clickable. Game music pauses while
 * the record is spinning and resumes on close.
 */
export function TrackPlayer({ title, artist, mood, embedUrl, onClose }: TrackPlayerProps) {
  const stageRef = useRef<HTMLDivElement>(null)
  const [scale, setScale] = useState(1)

  useLayoutEffect(() => {
    const stage = stageRef.current
    if (!stage) return
    const measure = () => setScale(Math.min(1, stage.clientWidth / SOURCE_WIDTH))
    measure()
    const observer = new ResizeObserver(measure)
    observer.observe(stage)
    return () => observer.disconnect()
  }, [])

  useEffect(() => {
    audioEngine.setRecordOpen(true)
    return () => audioEngine.setRecordOpen(false)
  }, [])

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  return (
    <div className="track-player" role="dialog" aria-modal="true" aria-label={`${title} player`}>
      <button className="track-player__scrim" onClick={onClose} aria-label="Close the player" />
      <div className="track-player__panel">
        <div className="track-player__head">
          <p className="kicker">
            <span className="kicker__rule" />
            NOW SPINNING
          </p>
          <button className="icon-btn track-player__close" onClick={onClose} aria-label="Close">
            ✕
          </button>
        </div>

        <h2>{title}</h2>
        <p className="track-player__credit">
          {artist}
          {mood ? ` · ${mood}` : ''}
        </p>

        <div
          className="track-player__stage"
          ref={stageRef}
          style={{ height: `${Math.round(SOURCE_HEIGHT * scale)}px` }}
        >
          <div className="track-player__source" style={{ transform: `scale(${scale})` }}>
            <iframe
              className="track-player__frame"
              src={embedUrl}
              title={`${title} player`}
              allow="autoplay; encrypted-media; picture-in-picture"
              sandbox="allow-scripts allow-same-origin"
              tabIndex={-1}
              loading="lazy"
            />
            <span className="track-player__guard track-player__guard--top" aria-hidden="true" />
            <span className="track-player__guard track-player__guard--left" aria-hidden="true" />
            <span className="track-player__guard track-player__guard--right" aria-hidden="true" />
            <span className="track-player__guard track-player__guard--bottom" aria-hidden="true" />
          </div>
        </div>

        <div className="track-player__foot">
          <span className="track-player__hint">PRESS PLAY ON THE RECORD</span>
          <button className="btn btn--ghost btn--sm" onClick={onClose}>
            CLOSE
          </button>
        </div>
      </div>
    </div>
  )
}
