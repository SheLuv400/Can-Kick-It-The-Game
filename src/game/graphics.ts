import type {
  BackgroundMotion,
  BloomQuality,
  CardImageQuality,
  CardMaterialQuality,
  FrameLimit,
  GraphicsPreset,
  LightingQuality,
  ParticleQuality,
  RenderScale,
  Settings,
  ShadowQuality,
  UiScale,
  VisualQuality,
} from './types'

/** The effects tier each preset starts from. Advanced controls can override any of it. */
export const PRESET_VALUES: Record<
  Exclude<GraphicsPreset, 'auto'>,
  {
    cardMaterial: CardMaterialQuality
    holoFoil: boolean
    concertLighting: LightingQuality
    shadows: ShadowQuality
    bloom: BloomQuality
    particles: ParticleQuality
    backgroundMotion: BackgroundMotion
  }
> = {
  low: {
    cardMaterial: 'off',
    holoFoil: false,
    concertLighting: 'low',
    shadows: 'off',
    bloom: 'off',
    particles: 'low',
    backgroundMotion: 'reduced',
  },
  medium: {
    cardMaterial: 'basic',
    holoFoil: true,
    concertLighting: 'medium',
    shadows: 'low',
    bloom: 'off',
    particles: 'medium',
    backgroundMotion: 'reduced',
  },
  high: {
    cardMaterial: 'enhanced',
    holoFoil: true,
    concertLighting: 'high',
    shadows: 'high',
    bloom: 'low',
    particles: 'high',
    backgroundMotion: 'full',
  },
  ultra: {
    cardMaterial: 'full',
    holoFoil: true,
    concertLighting: 'high',
    shadows: 'high',
    bloom: 'high',
    particles: 'high',
    backgroundMotion: 'full',
  },
}

/** The one place that turns saved settings into the values the renderer reads. */
export interface GraphicsRuntime {
  quality: VisualQuality
  preset: GraphicsPreset
  frameLimit: FrameLimit
  fpsCap: 30 | 60 | null
  renderScale: RenderScale
  uiScale: UiScale
  showFps: boolean
  cardImageQuality: CardImageQuality
  cardMaterial: CardMaterialQuality
  holoFoil: boolean
  concertLighting: LightingQuality
  shadows: ShadowQuality
  bloom: BloomQuality
  particles: ParticleQuality
  backgroundMotion: BackgroundMotion
  audioVisualizers: boolean
  cardTilt: boolean
  reducedMotion: boolean
  flashEffects: boolean
  vhsEffects: boolean
  autoFps: number | null
  autoMeasured: boolean
}

export function initialAutoQuality(): Exclude<VisualQuality, 'ultra'> {
  if (typeof window === 'undefined') return 'high'
  const coarse = window.matchMedia?.('(pointer: coarse)').matches ?? false
  return coarse || window.innerWidth < 760 ? 'medium' : 'high'
}

/**
 * Auto is decided from a real frame sample plus a small hardware ceiling, never
 * from a device name. A slow desktop will fall to Medium before a fast phone.
 */
export function classifyPerformance(fps: number): VisualQuality {
  if (typeof window === 'undefined') return 'high'
  const nav = navigator as Navigator & { deviceMemory?: number }
  const cores = nav.hardwareConcurrency ?? 4
  const memory = nav.deviceMemory ?? 4
  const coarse = window.matchMedia?.('(pointer: coarse)').matches ?? false
  const dpr = window.devicePixelRatio || 1
  const canUltra = cores >= 8 && memory >= 8 && !coarse && dpr <= 2
  if (fps >= 55) return canUltra ? 'ultra' : 'high'
  if (fps >= 45) return 'high'
  if (fps >= 28) return 'medium'
  return 'low'
}

export function resolveGraphics(
  settings: Settings,
  autoQuality: VisualQuality,
  autoFps: number | null = null,
  autoMeasured = false,
): GraphicsRuntime {
  const quality = settings.graphicsPreset === 'auto' ? autoQuality : settings.graphicsPreset
  // 125% would leave too little layout width on a narrow phone; cap it there
  // rather than letting fixed controls slide off screen.
  const narrow = typeof window !== 'undefined' && window.innerWidth < 520
  const uiScale = Math.min(settings.uiScale, narrow ? 110 : 125) as UiScale
  return {
    quality,
    preset: settings.graphicsPreset,
    frameLimit: settings.frameLimit,
    fpsCap: settings.frameLimit === 30 ? 30 : settings.frameLimit === 60 ? 60 : null,
    renderScale: settings.renderScale,
    uiScale,
    showFps: settings.showFps,
    cardImageQuality: settings.cardImageQuality,
    cardMaterial: settings.cardMaterial,
    holoFoil: settings.holoFoil,
    concertLighting: settings.concertLighting,
    shadows: settings.shadows,
    bloom: settings.bloom,
    particles: settings.particles,
    backgroundMotion: settings.backgroundMotion,
    audioVisualizers: settings.audioVisualizers,
    cardTilt: settings.cardTilt,
    reducedMotion: settings.reducedMotion,
    flashEffects: settings.flashEffects,
    vhsEffects: settings.vhsEffects,
    autoFps,
    autoMeasured,
  }
}

/** Used to tell the player their advanced choices no longer match the base preset. */
export function advancedMatchesPreset(settings: Settings, preset: VisualQuality): boolean {
  const values = PRESET_VALUES[preset]
  return (
    settings.cardMaterial === values.cardMaterial &&
    settings.holoFoil === values.holoFoil &&
    settings.concertLighting === values.concertLighting &&
    settings.shadows === values.shadows &&
    settings.bloom === values.bloom &&
    settings.particles === values.particles &&
    settings.backgroundMotion === values.backgroundMotion
  )
}
