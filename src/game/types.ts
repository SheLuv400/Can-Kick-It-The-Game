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

export type MoveType = 'attack' | 'healing' | 'shield' | 'elemental' | 'buff' | 'debuff' | 'support'

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

export interface ArtistProgress {
  xp: number
  level: number
  loadout?: string[]
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

export interface Artist {
  id: string
  slot: string
  number: number
  name: string
  genre: Genre
  crew: Crew
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
  wins: number
  losses: number
  selectedDirection: ThemeId | null
  reducedMotion: boolean
  team: TeamProgress
  artistProgress: Record<string, ArtistProgress>
}

export type ThemeId = 'a' | 'b' | 'c'
