import { createContext, useContext, type ReactNode } from 'react'
import type { GraphicsRuntime } from '../game/graphics'

const FALLBACK: GraphicsRuntime = {
  quality: 'high',
  preset: 'high',
  frameLimit: 'auto',
  fpsCap: null,
  renderScale: 100,
  uiScale: 100,
  showFps: false,
  cardImageQuality: 'hd',
  cardMaterial: 'enhanced',
  holoFoil: true,
  concertLighting: 'high',
  shadows: 'high',
  bloom: 'low',
  particles: 'high',
  backgroundMotion: 'full',
  audioVisualizers: true,
  cardTilt: true,
  reducedMotion: false,
  flashEffects: true,
  vhsEffects: false,
  autoFps: null,
  autoMeasured: false,
}

const GraphicsContext = createContext<GraphicsRuntime>(FALLBACK)

export function GraphicsProvider({ value, children }: { value: GraphicsRuntime; children: ReactNode }) {
  return <GraphicsContext.Provider value={value}>{children}</GraphicsContext.Provider>
}

export function useGraphics() {
  return useContext(GraphicsContext)
}
