export type Genre = 'HIP-HOP' | 'R&B' | 'POP'

export type Element =
  | 'FIRE'
  | 'POISON'
  | 'ICE'
  | 'ELECTRICITY'
  | 'WIND'
  | 'EARTH'
  | 'WATER'
  | 'LIGHT'

export type MoveType = 'attack' | 'healing' | 'shield' | 'elemental' | 'buff' | 'debuff' | 'support' | 'special'

export type MoveTarget = 'enemy' | 'ally' | 'self' | 'none'

export type StatusKind = 'burn' | 'poison' | 'chill' | 'weaken' | 'fortify' | 'light'

export interface MoveEffect {
  damage?: number
  heal?: number
  shield?: number
  hype?: number
  drainHype?: number
  crowd?: number
  crowdHeal?: number
  cleanse?: boolean
  status?: StatusKind
  statusValue?: number
  statusTurns?: number
  buffAttack?: number
  buffDefense?: number
  hits?: number
  /** Total strikes for a multi-hit move. The first strike uses full power; each extra strike lands at reduced power. */
  strikes?: number
}

export interface Move {
  id: string
  artistId: string
  name: string
  type: MoveType
  element: Element | null
  cost: number
  power: number
  target: MoveTarget
  description: string
  effects: MoveEffect[]
  pierce?: number
  /** Level at which this move enters the artist's pool. */
  unlockLevel?: number
  /** Signature specials are never equipped in the three normal move slots. */
  special?: boolean
  /** A big attack that closes the turn after it resolves. */
  endsTurn?: boolean
}

export interface BattlePassive {
  name: string
  description: string
  kind: 'opener' | 'guard' | 'hype' | 'pressure' | 'encore'
}

export interface ArtistBattle {
  hp: number
  attack: number
  defense: number
  element: Element
  passive: BattlePassive
}

export type BadgeTier = 'plastic' | 'bronze' | 'gold' | 'platinum' | 'diamond'

export interface BadgeProgress {
  tier: BadgeTier | 'locked'
  /** XP earned inside the current tier. Resets when a tier is cleared. */
  xp: number
  /** Lifetime XP, used for the billboard reputation score. */
  totalXp: number
}

export interface ArtistProgress {
  xp: number
  level: number
  loadout?: string[]
  badges?: Record<string, BadgeProgress>
  /** Up to five unlocked badge ids. */
  badgeLoadout?: string[]
}

export type Crew =
  | 'CONCRETE POETS'
  | 'VELVET COURT'
  | 'NEON CHOIR'
  | 'STATIC KINGS'
  | 'MIDNIGHT CARTEL'

export type EffectKind =
  | 'heal'
  | 'shield'
  | 'hype'
  | 'draw'
  | 'drain'
  | 'splash'
  | 'anthemCrew'
  | 'anthemGenre'
  | 'none'

export interface Effect {
  kind: EffectKind
  value: number
}

export interface EncoreForm {
  name: string
  bars: number
  effects: Effect[]
  line: string
}

export interface PortraitSpec {
  pose: 0 | 1 | 2 | 3
  hair: 0 | 1 | 2 | 3
  accessory: 'mic' | 'shades' | 'chain' | 'halo' | 'phones'
  pattern: 'halo' | 'halftone' | 'grid' | 'waves' | 'chrome'
}

export interface ArtistAppearance {
  presentation: string
  face: string
  skin: string
  hair: string
  hairColor: string
  facialHair: string
  facialHairColor: string
  top: string
  bottoms: string
  hat: string
  glasses: string
  jewelry: string
  shoes: string
}

export interface PersonalArtistMeta {
  presetId: string
  /** Legacy-only appearance data for pre-preset saves. */
  appearance: ArtistAppearance
  /** Career development rank (50–99); the battle engine maps it to its own tier. */
  /** Current Prestige run level (1–55, then Master 56–1000), not OVR. */
  cardLevel: number
  ovr: number
  prestige?: number
  legacyTitle?: string
  legacyColor?: string
  attributes: Record<string, number>
  encoreUnlocked: boolean
  badges: string[]
}

export interface Artist {
  id: string
  slot: string
  number: number
  name: string
  genre: Genre
  crew: Crew
  /** Present only on the locally owned My Artist Career card. */
  personal?: PersonalArtistMeta
  city: string
  heritage?: string
  debutAlbum?: string
  eraLabel: string
  debut: string
  cost: number
  bars: number
  effects: Effect[]
  encore: EncoreForm
  quote: string
  palette: {
    deep: string
    base: string
    accent: string
  }
  art: PortraitSpec
  battle: ArtistBattle
}

export type Difficulty = 'OPENING' | 'HEADLINER' | 'LEGEND'

export type VisualQuality = 'ultra' | 'high' | 'medium' | 'low'
export type GraphicsPreset = 'auto' | VisualQuality
export type FrameLimit = 'auto' | 30 | 60
export type RenderScale = 70 | 85 | 100
export type UiScale = 90 | 100 | 110 | 125
export type CardImageQuality = 'low' | 'medium' | 'hd'
export type CardMaterialQuality = 'off' | 'basic' | 'enhanced' | 'full'
export type LightingQuality = 'low' | 'medium' | 'high'
export type ShadowQuality = 'off' | 'low' | 'high'
export type BloomQuality = 'off' | 'low' | 'high'
export type ParticleQuality = 'low' | 'medium' | 'high'
export type BackgroundMotion = 'off' | 'reduced' | 'full'

export type OnlineMode = 'casual' | 'ranked'

export type AnnouncerFrequency = 'LOW' | 'NORMAL' | 'HIGH'

export interface AnnouncerSettings {
  enabled: boolean
  volume: number
  crowdVolume: number
  subtitles: boolean
  frequency: AnnouncerFrequency
}

export type CrestId = 'crown' | 'bolt' | 'star'

export interface TeamProgress {
  labelName: string
  crest: CrestId
  credits: number
  buzz: number
  claimedMissions: string[]
  circuitWins: number
}

export interface Settings {
  theme: ThemeId
  difficulty: Difficulty
  deck: string[]
  /** Five artist IDs guaranteed in the opening hand, in lineup order. */
  lineup: string[]
  wins: number
  losses: number
  selectedDirection: ThemeId | null
  reducedMotion: boolean
  flashEffects: boolean
  vhsEffects: boolean
  graphicsPreset: GraphicsPreset
  frameLimit: FrameLimit
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
  musicVolume: number
  sfxVolume: number
  announcer: AnnouncerSettings
  team: TeamProgress
  artistProgress: Record<string, ArtistProgress>
}

export type ThemeId = 'a' | 'b' | 'c'
