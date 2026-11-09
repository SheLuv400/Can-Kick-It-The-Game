import { useEffect, useState } from 'react'
import type { FrameLimit } from '../game/types'

/** Small, non-interactive performance readout. It never inserts into layout. */
export function GraphicsHud({ show, frameLimit }: { show: boolean; frameLimit: FrameLimit }) {
  const [fps, setFps] = useState(0)

  useEffect(() => {
    if (!show) return
    let frames = 0
    let last = performance.now()
    let frame = 0
    const tick = (now: number) => {
      frames += 1
      if (now - last >= 500) {
        setFps(Math.round((frames * 1000) / (now - last)))
        frames = 0
        last = now
      }
      frame = window.requestAnimationFrame(tick)
    }
    frame = window.requestAnimationFrame(tick)
    return () => window.cancelAnimationFrame(frame)
  }, [show])

  if (!show) return null

  return (
    <div className="gfx-hud" aria-label={`${fps} frames per second`}>
      <b>{fps || '—'}</b>
      <span>FPS</span>
      {frameLimit !== 'auto' && <em>FX CAP {frameLimit}</em>}
    </div>
  )
}
