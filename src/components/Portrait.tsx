import { useState } from 'react'
import type { Artist } from '../game/types'
import { portraitUrl } from '../game/portraits'
import { PortraitArt } from './PortraitArt'

/**
 * Card art, locked.
 *
 * The official portraits are baked into `src/assets/cards/<artist-id>.webp` and
 * ship with the build, so every player sees the same 50 faces. Nothing at
 * runtime can swap them, and browser storage is not consulted at all. The
 * procedural renderer is only the fallback if a file is ever missing.
 */
export function Portrait({ artist, crop = 'card' }: { artist: Artist; crop?: 'card' | 'avatar' }) {
  const [failedSrc, setFailedSrc] = useState<string | null>(null)
  const src = portraitUrl(artist.id)

  if (src && failedSrc !== src) {
    const image = (
      <img
        className={`portrait portrait--photo portrait--photo-${crop}`}
        src={src}
        alt=""
        draggable={false}
        decoding="async"
        onError={() => setFailedSrc(src)}
      />
    )

    if (crop === 'avatar') return image

    return (
      <span className="portrait-full">
        <span
          className="portrait-full__fill"
          style={{ backgroundImage: `url("${src}")` }}
          aria-hidden="true"
        />
        {image}
      </span>
    )
  }

  return <PortraitArt artist={artist} crop={crop} />
}
