import { useEffect, useState } from 'react'
import { classifyPerformance, initialAutoQuality } from '../game/graphics'
import type { GraphicsPreset, VisualQuality } from '../game/types'

export interface AutoQualityReading {
  quality: VisualQuality
  fps: number | null
  measured: boolean
}

/**
 * Samples real frame pacing for 1.4 s. Auto only runs while selected, and the
 * timer/rAF pair is torn down on unmount or on leaving Auto.
 */
export function useAutoQuality(preset: GraphicsPreset): AutoQualityReading {
  const [reading, setReading] = useState<AutoQualityReading>({
    quality: initialAutoQuality(),
    fps: null,
    measured: false,
  })

  useEffect(() => {
    if (preset !== 'auto') {
      setReading((current) => ({ ...current, fps: null, measured: false }))
      return
    }
    let alive = true
    let frames = 0
    let start = 0
    let frame = 0
    const sample = (now: number) => {
      if (!alive) return
      if (!start) start = now
      frames += 1
      if (now - start < 1400) {
        frame = window.requestAnimationFrame(sample)
        return
      }
      const fps = (frames * 1000) / (now - start)
      setReading({ quality: classifyPerformance(fps), fps: Math.round(fps), measured: true })
    }
    const timer = window.setTimeout(() => {
      frame = window.requestAnimationFrame(sample)
    }, 650)
    return () => {
      alive = false
      window.clearTimeout(timer)
      window.cancelAnimationFrame(frame)
    }
  }, [preset])

  return reading
}
