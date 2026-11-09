import { useEffect, useRef, useState, type CSSProperties } from 'react'
import { audioEngine } from '../game/audio'
import type {
  BackgroundMotion,
  FrameLimit,
  LightingQuality,
  ParticleQuality,
  RenderScale,
  VisualQuality,
} from '../game/types'

interface VisualDirectorProps {
  screen: string
  quality: VisualQuality
  frameLimit: FrameLimit
  renderScale: RenderScale
  backgroundMotion: BackgroundMotion
  concertLighting: LightingQuality
  particles: ParticleQuality
  audioVisualizers: boolean
  motion: boolean
  flash: boolean
  vhs: boolean
}

const EQ_COUNT = 13

/**
 * The shared presentation layer. It deliberately stops at CSS compositing and
 * one small audio analyser read: the screens keep their DOM, layout, artwork and
 * game logic, while every route receives the same light rig, colour grade and
 * motion language.
 */
export function VisualDirector({
  screen,
  quality,
  frameLimit,
  renderScale,
  backgroundMotion,
  concertLighting,
  particles,
  audioVisualizers,
  motion,
  flash,
  vhs,
}: VisualDirectorProps) {
  const [visible, setVisible] = useState(() => (typeof document === 'undefined' ? true : !document.hidden))
  const [cut, setCut] = useState(0)
  const previousScreen = useRef(screen)
  const dustCount = particles === 'low' ? 6 : particles === 'medium' ? 12 : 18
  const beamCount = concertLighting === 'low' ? 2 : concertLighting === 'medium' ? 3 : 5
  const auroras = concertLighting === 'low' ? 1 : concertLighting === 'medium' ? 2 : 3

  useEffect(() => {
    if (previousScreen.current === screen) return
    previousScreen.current = screen
    setCut((value) => value + 1)
  }, [screen])

  useEffect(() => {
    const sync = () => setVisible(!document.hidden)
    document.addEventListener('visibilitychange', sync)
    return () => document.removeEventListener('visibilitychange', sync)
  }, [])

  useEffect(() => {
    const root = document.documentElement
    if (!motion || !audioVisualizers) {
      root.style.setProperty('--fx-level', '0')
      root.style.setProperty('--fx-bass', '0')
      root.style.setProperty('--fx-mid', '0')
      root.style.setProperty('--fx-high', '0')
      return
    }

    let frame = 0
    let lastRead = 0
    let smoothed = { level: 0, bass: 0, mid: 0, high: 0 }
    const qualityInterval = quality === 'ultra' ? 16 : quality === 'high' ? 18 : quality === 'medium' ? 36 : 72
    const capInterval = frameLimit === 30 ? 34 : frameLimit === 60 ? 16 : 0
    const interval = Math.max(qualityInterval, capInterval)

    const tick = (time: number) => {
      if (!document.hidden && time - lastRead >= interval) {
        lastRead = time
        const next = audioEngine.readVisualBands()
        const ease = quality === 'low' ? 0.08 : 0.22
        smoothed = {
          level: smoothed.level + (next.level - smoothed.level) * ease,
          bass: smoothed.bass + (next.bass - smoothed.bass) * ease,
          mid: smoothed.mid + (next.mid - smoothed.mid) * ease,
          high: smoothed.high + (next.high - smoothed.high) * ease,
        }
        root.style.setProperty('--fx-level', smoothed.level.toFixed(3))
        root.style.setProperty('--fx-bass', smoothed.bass.toFixed(3))
        root.style.setProperty('--fx-mid', smoothed.mid.toFixed(3))
        root.style.setProperty('--fx-high', smoothed.high.toFixed(3))
      }
      frame = window.requestAnimationFrame(tick)
    }
    frame = window.requestAnimationFrame(tick)
    return () => {
      window.cancelAnimationFrame(frame)
      root.style.setProperty('--fx-level', '0')
      root.style.setProperty('--fx-bass', '0')
      root.style.setProperty('--fx-mid', '0')
      root.style.setProperty('--fx-high', '0')
    }
  }, [audioVisualizers, motion, quality, frameLimit])

  useEffect(() => {
    if (!motion || quality === 'low') return
    let frame = 0
    let nextX = 0
    let nextY = 0
    let lastCommit = 0
    const minGap = frameLimit === 30 ? 34 : frameLimit === 60 ? 16 : 0
    const commit = (time: number) => {
      if (minGap && time - lastCommit < minGap) {
        frame = window.requestAnimationFrame(commit)
        return
      }
      lastCommit = time
      frame = 0
      const root = document.documentElement
      root.style.setProperty('--fx-px', nextX.toFixed(3))
      root.style.setProperty('--fx-py', nextY.toFixed(3))
    }
    const onMove = (event: PointerEvent) => {
      nextX = (event.clientX / window.innerWidth - 0.5) * 2
      nextY = (event.clientY / window.innerHeight - 0.5) * 2
      if (!frame) frame = window.requestAnimationFrame(commit)
    }
    window.addEventListener('pointermove', onMove, { passive: true })
    return () => {
      window.removeEventListener('pointermove', onMove)
      if (frame) window.cancelAnimationFrame(frame)
      const root = document.documentElement
      root.style.setProperty('--fx-px', '0')
      root.style.setProperty('--fx-py', '0')
    }
  }, [motion, quality, frameLimit])

  const style = {
    '--gfx-render-scale': (renderScale / 100).toString(),
  } as CSSProperties

  return (
    <div
      className={`visual-director ${visible ? 'is-visible' : 'is-paused'}`}
      data-quality={quality}
      data-frame-limit={frameLimit}
      style={style}
      aria-hidden="true"
    >
      {backgroundMotion !== 'off' && (
        <div className="vfx-world">
          {Array.from({ length: auroras }).map((_, index) => (
            <span key={index} className={`vfx-aurora vfx-aurora--${['a', 'b', 'c'][index]}`} />
          ))}
          <span className="vfx-floor" />
          <div className="vfx-beam-rig">
            {Array.from({ length: beamCount }).map((_, index) => (
              <i key={index} />
            ))}
          </div>
          <div className="vfx-dust">
            {Array.from({ length: dustCount }).map((_, index) => (
              <i key={index} />
            ))}
          </div>
        </div>
      )}

      <div className="vfx-grade">
        <span className="vfx-lens" />
        <span className="vfx-haze" />
        <span className="vfx-scanlines" />
        <span className="vfx-vignette" />
        {audioVisualizers && (
          <span className="vfx-eq" aria-hidden="true">
            {Array.from({ length: EQ_COUNT }).map((_, index) => (
              <i key={index} />
            ))}
          </span>
        )}
        {vhs && <span className="vfx-vhs" />}
        {motion && flash && cut > 0 && <span key={cut} className="vfx-cut" />}
      </div>
    </div>
  )
}
