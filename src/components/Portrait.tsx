import { useEffect, useState } from 'react'
import type { Artist, CardImageQuality, RenderScale } from '../game/types'
import { portraitUrl } from '../game/portraits'
import { PortraitArt } from './PortraitArt'
import { CareerPresetArt } from './CareerPresetArt'
import { useGraphics } from '../graphics/GraphicsContext'

const MAX_SCALED_CACHE = 60
const scaledPortraits = new Map<string, string>()

/**
 * Low/Medium card image quality is a real downscale of the displayed texture,
 * not a CSS filter or a hidden image. HD always uses the original baked art.
 * Originals are still loaded once, so the source artwork is never replaced.
 */
function useScaledPortrait(src: string | undefined, quality: CardImageQuality, renderScale: RenderScale) {
  const original = quality === 'hd' && renderScale === 100
  const [resolved, setResolved] = useState(() => {
    if (!src || original) return src
    return scaledPortraits.get(`${quality}:${renderScale}:${src}`) ?? src
  })

  useEffect(() => {
    if (!src || original) {
      setResolved(src)
      return
    }
    const key = `${quality}:${renderScale}:${src}`
    const cached = scaledPortraits.get(key)
    if (cached) {
      setResolved(cached)
      return
    }
    let alive = true
    const image = new Image()
    image.decoding = 'async'
    image.src = src
    image
      .decode()
      .then(() => {
        if (!alive) return
        const baseWidth = quality === 'low' ? 360 : quality === 'medium' ? 520 : 640
        const width = Math.max(280, Math.round((baseWidth * renderScale) / 100))
        const height = Math.max(1, Math.round((width * image.naturalHeight) / Math.max(1, image.naturalWidth)))
        const canvas = document.createElement('canvas')
        canvas.width = width
        canvas.height = height
        const context = canvas.getContext('2d')
        if (!context) {
          setResolved(src)
          return
        }
        context.imageSmoothingQuality = quality === 'low' ? 'low' : 'medium'
        context.drawImage(image, 0, 0, width, height)
        canvas.toBlob(
          (blob) => {
            if (!alive || !blob) {
              setResolved(src)
              return
            }
            const url = URL.createObjectURL(blob)
            if (scaledPortraits.size >= MAX_SCALED_CACHE) {
              const oldest = scaledPortraits.entries().next().value as [string, string] | undefined
              if (oldest) {
                URL.revokeObjectURL(oldest[1])
                scaledPortraits.delete(oldest[0])
              }
            }
            scaledPortraits.set(key, url)
            setResolved(url)
          },
          'image/webp',
          quality === 'low' ? 0.68 : 0.8,
        )
      })
      .catch(() => {
        if (alive) setResolved(src)
      })
    return () => {
      alive = false
    }
  }, [src, quality, renderScale, original])

  return resolved
}

/**
 * Card art, locked.
 *
 * The official portraits are baked into `src/assets/cards/<artist-id>.webp` and
 * ship with the build, so every player sees the same 50 faces. Nothing at
 * runtime can swap them, and browser storage is not consulted at all. The
 * procedural renderer is only the fallback if a file is ever missing.
 */
export function Portrait({ artist, crop = 'card' }: { artist: Artist; crop?: 'card' | 'avatar' }) {
  const graphics = useGraphics()
  const [failedSrc, setFailedSrc] = useState<string | null>(null)
  if (artist.personal) {
    return (
      <span className={`portrait-career-wrap portrait-career-wrap--${crop}`}>
        <CareerPresetArt
          presetId={artist.personal.presetId}
          mode={crop === 'avatar' ? 'thumb' : 'card'}
        />
      </span>
    )
  }
  const src = portraitUrl(artist.id)
  const displaySrc = useScaledPortrait(src, graphics.cardImageQuality, graphics.renderScale)

  if (src && displaySrc && failedSrc !== src) {
    const image = (
      <img
        className={`portrait portrait--photo portrait--photo-${crop}`}
        src={displaySrc}
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
          style={{ backgroundImage: `url("${displaySrc}")` }}
          aria-hidden="true"
        />
        {image}
      </span>
    )
  }

  return <PortraitArt artist={artist} crop={crop} />
}
