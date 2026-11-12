import type {
  Artist,
  ArtistAppearance,
  ArtistProgress,
  BadgeProgress,
  Crew,
  Difficulty,
  Element,
  Genre,
  Move,
  MoveEffect,
  Settings,
} from './types'
import {
  ARTISTS,
  registerArtistCard,
  unregisterArtistCard,
} from './roster'
import {
  ELEMENT_ORDER,
  elementMoveProfile,
  movesForArtist,
  registerArtistMoves,
  unregisterArtistMoves,
} from './moves'
import {
  CAREER_APPEARANCE_GROUPS,
  CAREER_MAX_AP,
  CAREER_AP_CHAPTER_CLEAR,
  CAREER_AP_FIRST_CLEAR,
  CAREER_AP_PER_LEVEL,
  CAREER_ATTRIBUTES,
  CAREER_LOCAL_AP_DAILY_CAP,
  CAREER_LOCAL_AP_PER_WIN,
  CAREER_BACKUP_KEY,
  CAREER_BADGE_SLOT_RANK,
  CAREER_CREW_BY_GENRE,
  CAREER_CREWS,
  CAREER_DEFAULT_TITLE,
  CAREER_HOMETOWNS,
  CAREER_MAX_LEVEL,
  CAREER_MAX_OVR,
  CAREER_MAX_PRESTIGE,
  CAREER_MASTER_START_LEVEL,
  CAREER_CLIMB_TITLES,
  CAREER_LEGEND_TITLES,
  CAREER_MASTER_ENTRY_TITLES,
  CAREER_MIN_LEVEL,
  CAREER_MIN_OVR,
  CAREER_PRESTIGE_MAX_LEVEL,
  CAREER_MOVE_SLOTS,
  CAREER_MOVE_TEMPLATE_ARTIST,
  CAREER_MOVE_UNLOCK_RANK,
  CAREER_OPTIONS,
  CAREER_PRESTIGE_XP_BONUS,
  CAREER_PRIME_TITLES,
  CAREER_MASTER_TITLES,
  CAREER_RANK_TITLES,
  CAREER_REPUTATION_TIERS,
  CAREER_SIGNATURE_UNLOCK_RANK,
  CAREER_STARTER_DECKS,
  CAREER_STARTING_AP,
  CAREER_STORAGE_KEY,
  CAREER_SLOTS_BACKUP_KEY,
  CAREER_SLOTS_KEY,
  CAREER_SLOT_COUNT,
  CAREER_TITLE,
  CAREER_TITLE_ALIASES,
  CAREER_TITLE_CATALOG,
  CAREER_VERSION,
  careerTitleForId,
  careerTitleUnlockLabel,
  DEFAULT_CAREER_HOMETOWN_ID,
  careerRankTitleForRank,
  buildRivalDeck,
  careerChapters,
  careerHometown,
  careerOption,
  careerOptionLabel,
  careerOptionsFor,
  careerReputationForOvr,
  type CareerAttributeId,
  type CareerChapter,
  type CareerHometown,
  type CareerMission,
  type CareerMissionObjective,
  type CareerOptionCategory,
  type CareerRankTitle,
  type CareerReputationTier,
  type CareerStarterDeck,
} from './career-data'
import {
  BADGE_BY_ID,
  BADGE_TIER_THRESHOLDS,
  awardBadgeXp,
  normalizeBadgeRecords,
  sanitizeBadgeLoadout,
  type BadgeId,
  type BadgeMatchCard,
} from './badges'
import { isPersonalArtistId, PERSONAL_ARTIST_PREFIX } from './personal-id'
import { inferCareerPresetId, isCareerPresetId, type CareerPresetId } from './career-presets'

export {
  CAREER_APPEARANCE_GROUPS,
  CAREER_MAX_AP,
  CAREER_AP_CHAPTER_CLEAR,
  CAREER_AP_FIRST_CLEAR,
  CAREER_AP_PER_LEVEL,
  CAREER_ATTRIBUTES,
  CAREER_LOCAL_AP_DAILY_CAP,
  CAREER_LOCAL_AP_PER_WIN,
  CAREER_BACKUP_KEY,
  CAREER_BADGE_SLOT_RANK,
  CAREER_CREW_BY_GENRE,
  CAREER_CREWS,
  CAREER_DEFAULT_TITLE,
  CAREER_HOMETOWNS,
  CAREER_MAX_LEVEL,
  CAREER_MAX_OVR,
  CAREER_MAX_PRESTIGE,
  CAREER_MASTER_START_LEVEL,
  CAREER_CLIMB_TITLES,
  CAREER_LEGEND_TITLES,
  CAREER_MASTER_ENTRY_TITLES,
  CAREER_MIN_LEVEL,
  CAREER_MIN_OVR,
  CAREER_MOVE_SLOTS,
  CAREER_OPTIONS,
  CAREER_PRESTIGE_MAX_LEVEL,
  CAREER_PRESTIGE_XP_BONUS,
  CAREER_PRIME_TITLES,
  CAREER_MASTER_TITLES,
  CAREER_RANK_TITLES,
  CAREER_REPUTATION_TIERS,
  CAREER_SIGNATURE_UNLOCK_RANK,
  CAREER_STARTER_DECKS,
  CAREER_STARTING_AP,
  CAREER_STORAGE_KEY,
  CAREER_SLOTS_BACKUP_KEY,
  CAREER_SLOTS_KEY,
  CAREER_SLOT_COUNT,
  CAREER_TITLE,
  CAREER_TITLE_CATALOG,
  CAREER_TITLE_ALIASES,
  CAREER_VERSION,
  careerTitleForId,
  careerTitleUnlockLabel,
  careerChapters,
  careerHometown,
  careerOption,
  careerOptionLabel,
  careerOptionsFor,
  careerRankTitleForRank,
  careerReputationForOvr,
}
export type {
  CareerAttributeId,
  CareerChapter,
  CareerHometown,
  CareerMission,
  CareerMissionObjective,
  CareerOptionCategory,
  CareerRankTitle,
  CareerReputationTier,
  CareerStarterDeck,
}

export interface CareerMissionRecord {
  clears: number
  repeats: number
  lastResult: 'win' | 'loss' | 'draw'
  lastAt: number
}

export interface CareerState {
  version: number
  artistId: string
  stageName: string
  hometownId: string
  region: string
  genre: Genre
  /** The personal artist's battle element, chosen independently of genre. */
  element: Element
  /** Elements unlocked permanently; the creation pick is the first one. */
  unlockedElements: Element[]
  /** Second equipped element, valid only after dual elements unlock. */
  secondaryElement: Element | null
  /** The crew this artist claims, independent of genre. */
  crew: Crew
  /** Career-only difficulty selection. */
  careerDifficulty: Difficulty
  /** The selected premade model. Legacy appearance data is retained only for old saves. */
  presetId: CareerPresetId
  appearance: ArtistAppearance
  starterDeckId: CareerStarterDeck['id']
  createdAt: number
  updatedAt: number
  /** Career XP earned inside the current Prestige run. */
  xp: number
  /** Current Prestige-run level. This is not OVR; OVR always begins at 50. */
  level: number
  prestige: number
  prestigeTokens: number
  /** Permanent move/badge keys bought with Prestige tokens. */
  legacyUnlocks: string[]
  activeTitleId: string
  activeColor: string
  apEarned: number
  apSpent: number
  /** AP spent buying elements; does not affect OVR. */
  elementSpent: number
  ovr: number
  attributes: Record<CareerAttributeId, number>
  unlockedMoves: string[]
  equippedMoves: string[]
  badges: Record<string, BadgeProgress>
  equippedBadges: BadgeId[]
  chapter: number
  missions: Record<string, CareerMissionRecord>
  unlockedCosmetics: string[]
  encoreUnlocked: boolean
  wins: number
  losses: number
  draws: number
  deck: string[]
  lineup: string[]
  lastRewards: string[]
  localXpDay: string
  localXpToday: number
  /** Day key and AP earned from local CPU wins, used to enforce the daily cap. */
  localApDay: string
  localApToday: number
}

export interface CareerObjectiveResult extends CareerMissionObjective {
  done: boolean
}

export interface CareerBattlePerformance {
  backstage?: string[]
  features?: number
  cards?: Record<string, BadgeMatchCard>
}

export interface CareerMissionReport {
  missionId: string
  missionTitle: string
  success: boolean
  winner: 'player' | 'rival' | 'draw'
  objectives: CareerObjectiveResult[]
  xpGained: number
  firstClear: boolean
  repeat: number
  rewards: string[]
  chapterAdvanced: boolean
  levelBefore: number
  levelAfter: number
  ovrBefore: number
  ovrAfter: number
  apBefore: number
  apAfter: number
  apGained: number
  xpBreakdown: {
    victory: number
    objectives: number
    completion: number
    repeat: number
    prestige: number
  }
}

export interface CareerBatch {
  career: CareerState
  report: CareerMissionReport
}

export interface CareerXpSummary {
  level: number
  levelCap: number
  master: boolean
  xpIntoLevel: number
  xpForNext: number
  xpToNext: number
  totalXp: number
  totalXpForNext: number
  lifetimeXp: number
  xpToLegend: number
  apEarned: number
  apSpent: number
  elementSpent: number
  apAvailable: number
  ovr: number
  reputation: CareerReputationTier
  prestige: number
  xpBonus: number
  title: CareerRankTitle
  color: string
}

/**
 * One Prestige run is 54 level-ups from 1 to 55. The curve grows
 * quadratically; version 7 scales the original values by 15% so a mission
 * cannot rush the early ranks as quickly.
 */
export const CAREER_XP_CURVE_SCALE = 1.15

export function careerXpStep(level: number): number {
  if (level >= CAREER_MAX_LEVEL) return 0
  const n = Math.max(0, level - CAREER_MIN_LEVEL)
  return Math.round((5400 + 100 * n + 12 * n * n) * CAREER_XP_CURVE_SCALE)
}

/** The pre-version-7 curve, used only to preserve progress while migrating. */
function legacyCareerXpStep(level: number): number {
  if (level >= CAREER_MAX_LEVEL) return 0
  const n = Math.max(0, level - CAREER_MIN_LEVEL)
  return 5400 + 100 * n + 12 * n * n
}

/**
 * Keep an existing save at the same rank and the same fraction of progress
 * when the curve gets longer, instead of dropping the player a level.
 */
function rescaleCareerXp(xp: number, prestige: number): number {
  const cap = careerLevelCap(prestige)
  let level = CAREER_MIN_LEVEL
  let remaining = Math.max(0, xp)
  while (level < cap) {
    const step = legacyCareerXpStep(level)
    if (remaining < step) break
    remaining -= step
    level += 1
  }
  if (level >= cap) return careerXpForLevel(cap)
  const legacyStep = legacyCareerXpStep(level)
  const nextStep = careerXpStep(level)
  return careerXpForLevel(level) + Math.min(nextStep - 1, Math.round((remaining / legacyStep) * nextStep))
}

export function careerLevelCap(prestige: number): number {
  return prestige >= CAREER_MAX_PRESTIGE ? CAREER_MAX_LEVEL : CAREER_PRESTIGE_MAX_LEVEL
}

export const CAREER_RUN_XP = Array.from(
  { length: CAREER_PRESTIGE_MAX_LEVEL - CAREER_MIN_LEVEL },
  (_, index) => careerXpStep(CAREER_MIN_LEVEL + index),
).reduce((sum, step) => sum + step, 0)
export const CAREER_XP_TO_LEGEND = CAREER_RUN_XP * (CAREER_MAX_PRESTIGE + 1)
export const CAREER_TOTAL_AP = CAREER_MAX_AP
export const CAREER_ELEMENT_UNLOCK_COST = 10
export const CAREER_DUAL_ELEMENT_OVR = 90

export function careerXpForLevel(level: number): number {
  const target = clamp(Math.round(level), CAREER_MIN_LEVEL, CAREER_MAX_LEVEL)
  let total = 0
  for (let current = CAREER_MIN_LEVEL; current < target; current += 1) {
    total += careerXpStep(current)
  }
  return total
}

/** @deprecated Use careerXpForLevel; retained for older callers. */
export const careerXpForRank = careerXpForLevel

export function careerIsMaster(level: number, prestige: number): boolean {
  return prestige >= CAREER_MAX_PRESTIGE && level >= CAREER_MASTER_START_LEVEL
}

const ATTR_CAP = 99
const ATTR_FLOOR = 1
const BASE_ATTRIBUTES: Record<CareerAttributeId, number> = {
  bars: 50,
  hooks: 50,
  stagePresence: 50,
  endurance: 50,
  defense: 50,
  chemistry: 50,
}

const GENRE_ATTRIBUTES: Record<Genre, Record<CareerAttributeId, number>> = {
  'HIP-HOP': { bars: 58, hooks: 50, stagePresence: 52, endurance: 48, defense: 46, chemistry: 46 },
  'R&B': { bars: 45, hooks: 58, stagePresence: 48, endurance: 50, defense: 50, chemistry: 54 },
  POP: { bars: 46, hooks: 50, stagePresence: 58, endurance: 48, defense: 48, chemistry: 50 },
}

const GENRE_ELEMENT: Record<Genre, Artist['battle']['element']> = {
  'HIP-HOP': 'FIRE',
  'R&B': 'WATER',
  POP: 'LIGHT',
}

const GENRE_PALETTE: Record<Genre, Artist['palette']> = {
  'HIP-HOP': { deep: '#170b08', base: '#a83722', accent: '#f0b64a' },
  'R&B': { deep: '#170b20', base: '#7136a8', accent: '#f2b9ff' },
  POP: { deep: '#07151b', base: '#0f9eaf', accent: '#ffd34d' },
}

const GENRE_PASSIVE: Record<Genre, Artist['battle']['passive']> = {
  'HIP-HOP': {
    name: 'PEN GAME',
    description: 'Direct cuts carry the room. The personal card pressures through bars.',
    kind: 'pressure',
  },
  'R&B': {
    name: 'VELVET GUARD',
    description: 'Hooks and harmonies protect the set. The personal card leans into sustain.',
    kind: 'guard',
  },
  POP: {
    name: 'CAMERA FLASH',
    description: 'Big moments build momentum. The personal card turns stage presence into Hype.',
    kind: 'hype',
  },
}

const LEGACY_CAREER_BADGE_MAP: Record<string, BadgeId> = {
  'bar-technician': 'executioner',
  'hook-specialist': 'medic',
  'mic-presence': 'closer',
  'backstage-survivor': 'guardian',
  'feature-chemistry': 'assist',
  'showstopper': 'headliner',
}

function normalizeCareerBadgeId(value: unknown): BadgeId | undefined {
  if (typeof value !== 'string') return undefined
  const migrated = LEGACY_CAREER_BADGE_MAP[value] ?? value
  return BADGE_BY_ID.has(migrated as BadgeId) ? (migrated as BadgeId) : undefined
}

function normalizeCareerBadges(raw: unknown): Record<string, BadgeProgress> {
  if (!Array.isArray(raw)) return normalizeBadgeRecords(raw)
  const badges: Record<string, BadgeProgress> = {}
  for (const value of raw) {
    const id = normalizeCareerBadgeId(value)
    if (!id || badges[id]) continue
    badges[id] = { tier: 'plastic', xp: 0, totalXp: BADGE_TIER_THRESHOLDS.locked }
  }
  return badges
}

function normalizeCareerBadgeLoadout(
  raw: unknown,
  badges: Record<string, BadgeProgress>,
): BadgeId[] {
  if (!Array.isArray(raw)) return []
  const ids = raw.flatMap((value) => {
    const id = normalizeCareerBadgeId(value)
    return id ? [id] : []
  })
  return sanitizeBadgeLoadout(ids, badges) as BadgeId[]
}

function unlockCareerBadge(
  state: CareerState,
  id: BadgeId,
): { state: CareerState; unlocked: boolean } {
  const badges = normalizeBadgeRecords(state.badges)
  if ((badges[id]?.tier ?? 'locked') !== 'locked') return { state, unlocked: false }
  badges[id] = { tier: 'plastic', xp: 0, totalXp: BADGE_TIER_THRESHOLDS.locked }
  const equippedBadges = state.equippedBadges.length < careerBadgeSlots(state.level)
    ? [...state.equippedBadges, id]
    : state.equippedBadges
  return { state: { ...state, badges, equippedBadges }, unlocked: true }
}

function awardCareerBadges(
  state: CareerState,
  won: boolean,
  performance: CareerBattlePerformance,
): CareerState {
  const card = performance.cards?.[state.artistId]
  if (!card) return state
  const progress: Record<string, ArtistProgress> = {
    [state.artistId]: {
      xp: 0,
      level: 1,
      badges: normalizeBadgeRecords(state.badges),
      badgeLoadout: state.equippedBadges,
    },
  }
  const result = awardBadgeXp(
    progress,
    { [state.artistId]: card.uses ?? 0 },
    won,
    { [state.artistId]: card },
  )
  const update = result.updates[state.artistId]
  if (!update) return state
  const equippedBadges = sanitizeBadgeLoadout(update.badgeLoadout, update.badges)
    .slice(0, careerBadgeSlots(state.level)) as BadgeId[]
  return { ...state, badges: update.badges, equippedBadges }
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value))
}

function numberOr(value: unknown, fallback: number): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback
}

function normalizeCareerDifficulty(value: unknown): Difficulty {
  return value === 'OPENING' || value === 'HEADLINER' || value === 'LEGEND' ? value : 'OPENING'
}

function normalizeCrew(value: unknown, genre: Genre): Crew {
  return CAREER_CREWS.includes(value as Crew) ? (value as Crew) : CAREER_CREW_BY_GENRE[genre]
}

function normalizeElement(value: unknown, genre: Genre): Element {
  return ELEMENT_ORDER.includes(value as Element) ? (value as Element) : GENRE_ELEMENT[genre]
}

function normalizeUnlockedElements(value: unknown, primary: Element): Element[] {
  const entries = Array.isArray(value)
    ? value.filter((entry): entry is Element => ELEMENT_ORDER.includes(entry as Element))
    : []
  if (!entries.includes(primary)) entries.unshift(primary)
  return [...new Set(entries)]
}

export function careerGenreElement(genre: Genre): Element {
  return GENRE_ELEMENT[genre]
}

function randomId(): string {
  return `${PERSONAL_ARTIST_PREFIX}${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`
}

function sanitizeStageName(value: string): string {
  return value.trim().replace(/\s+/g, ' ').slice(0, 20)
}

export function defaultAppearance(): ArtistAppearance {
  return {
    presentation: 'male',
    face: 'male-01',
    skin: 'caramel',
    hair: 'male-01',
    hairColor: 'black',
    facialHair: 'none',
    facialHairColor: 'black',
    top: 'male-02',
    bottoms: 'baggy-jeans',
    hat: 'none',
    glasses: 'none',
    jewelry: 'cuban-chain',
    shoes: 'white-high',
  }
}

const LEGACY_APPEARANCE: Partial<Record<keyof ArtistAppearance, Record<string, string>>> = {
  presentation: { masc: 'male', femme: 'female', androgynous: 'male' },
  face: {
    'soft-square': 'male-01',
    round: 'male-02',
    oval: 'male-03',
    angular: 'male-04',
    heart: 'female-05',
  },
  skin: { umber: 'chestnut', espresso: 'deep' },
  hair: {
    buzz: 'male-02',
    waves: 'male-01',
    locs: 'female-06',
    braids: 'female-06',
    bob: 'female-05',
    curls: 'female-04',
    ponytail: 'female-01',
    afro: 'female-04',
    'wolf-cut': 'female-02',
  },
  top: {
    'denim-jacket': 'male-06',
    hoodie: 'male-04',
    leather: 'female-01',
    satin: 'female-04',
    'track-jacket': 'male-01',
    varsity: 'male-03',
    tee: 'male-02',
  },
  hat: { durag: 'bandana' },
  jewelry: {
    chain: 'cuban-chain',
    layered: 'pendant-chain',
    hoops: 'hoops',
    studs: 'studs',
  },
  shoes: {
    timbs: 'wheat-boot',
    sneakers: 'white-high',
    boots: 'wheat-boot',
    platforms: 'black-chunky',
  },
}

const GENDER_DEFAULTS: Record<'male' | 'female', Pick<ArtistAppearance, 'face' | 'hair' | 'top'>> = {
  male: { face: 'male-01', hair: 'male-01', top: 'male-02' },
  female: { face: 'female-01', hair: 'female-02', top: 'female-02' },
}

function normalizeAppearance(raw: unknown): ArtistAppearance {
  const source = raw && typeof raw === 'object' ? (raw as Partial<ArtistAppearance>) : {}
  const fallback = defaultAppearance()
  const result = { ...fallback }
  for (const key of Object.keys(fallback) as (keyof ArtistAppearance)[]) {
    const rawValue = source[key]
    if (typeof rawValue !== 'string') continue
    const value = LEGACY_APPEARANCE[key]?.[rawValue] ?? rawValue
    if (CAREER_OPTIONS[key].some((option) => option.id === value)) {
      result[key] = value
    }
  }
  const gender: 'male' | 'female' = result.presentation === 'female' ? 'female' : 'male'
  result.presentation = gender
  for (const key of ['face', 'hair', 'top'] as const) {
    if (!result[key].startsWith(`${gender}-`)) result[key] = GENDER_DEFAULTS[gender][key]
  }
  return result
}

function freshCosmetics(): string[] {
  const unlocked: string[] = []
  for (const [category, options] of Object.entries(CAREER_OPTIONS) as [
    CareerOptionCategory,
    typeof CAREER_OPTIONS[CareerOptionCategory],
  ][]) {
    for (const option of options) {
      if (!option.unlockChapter) unlocked.push(`${category}:${option.id}`)
    }
  }
  return unlocked
}

export function isCareerOptionUnlocked(
  state: Pick<CareerState, 'unlockedCosmetics' | 'chapter'>,
  category: CareerOptionCategory,
  id: string,
): boolean {
  const option = careerOption(category, id)
  if (!option) return false
  return !option.unlockChapter || state.chapter >= option.unlockChapter || state.unlockedCosmetics.includes(`${category}:${id}`)
}

export function newCareerDraft(): CareerState {
  const now = Date.now()
  const attributes = { ...BASE_ATTRIBUTES }
  const hometown = careerHometown(DEFAULT_CAREER_HOMETOWN_ID)
  return {
    version: CAREER_VERSION,
    artistId: randomId(),
    stageName: '',
    hometownId: hometown.id,
    region: hometown.region,
    genre: 'HIP-HOP',
    element: GENRE_ELEMENT['HIP-HOP'],
    unlockedElements: [GENRE_ELEMENT['HIP-HOP']],
    secondaryElement: null,
    crew: CAREER_CREW_BY_GENRE['HIP-HOP'],
    careerDifficulty: 'OPENING',
    presetId: 'male_01',
    appearance: defaultAppearance(),
    starterDeckId: 'balanced',
    createdAt: now,
    updatedAt: now,
    xp: 0,
    level: CAREER_MIN_LEVEL,
    prestige: 0,
    prestigeTokens: 0,
    legacyUnlocks: [],
    activeTitleId: CAREER_DEFAULT_TITLE.id,
    activeColor: CAREER_DEFAULT_TITLE.color,
    apEarned: CAREER_STARTING_AP,
    apSpent: 0,
    elementSpent: 0,
    ovr: CAREER_MIN_OVR,
    attributes,
    unlockedMoves: [],
    equippedMoves: [],
    badges: {},
    equippedBadges: [],
    chapter: 1,
    missions: {},
    unlockedCosmetics: freshCosmetics(),
    encoreUnlocked: true,
    wins: 0,
    losses: 0,
    draws: 0,
    deck: [],
    lineup: [],
    lastRewards: [],
    localXpDay: '',
    localXpToday: 0,
    localApDay: '',
    localApToday: 0,
  }
}

export function careerLevelFromXp(xp: number, prestige = 0): number {
  const cap = careerLevelCap(prestige)
  let level = CAREER_MIN_LEVEL
  let remaining = Math.max(0, xp)
  while (level < cap) {
    const step = careerXpStep(level)
    if (remaining < step) break
    remaining -= step
    level += 1
  }
  return level
}

/** Personal card power follows OVR, not the XP rank, so AP choices matter. */
export function careerCardPower(state: Pick<CareerState, 'ovr'>): number {
  const ovr = clamp(Math.round(state.ovr), CAREER_MIN_OVR, CAREER_MAX_OVR)
  return 1 + (ovr - CAREER_MIN_OVR) * 0.018
}

export function careerTitleKey(title: CareerRankTitle): string {
  return `${title.source}-title:${title.id}`
}

export function careerColorKey(color: string): string {
  return `rank-color:${color.toLowerCase()}`
}

export function careerTitleIsUnlocked(
  state: Pick<CareerState, 'level' | 'prestige' | 'unlockedCosmetics'>,
  title: CareerRankTitle,
): boolean {
  if (title.source === 'default') return true
  if (state.unlockedCosmetics.includes(careerTitleKey(title))) return true
  if (title.source === 'climb') {
    const prestige = title.prestige ?? 1
    const level = title.prestigeLevel ?? CAREER_PRESTIGE_MAX_LEVEL
    if (state.prestige < prestige) return false
    return state.prestige > prestige || state.level >= level
  }
  if (title.source === 'master') {
    return state.prestige >= CAREER_MAX_PRESTIGE && state.level >= CAREER_MASTER_START_LEVEL
  }
  if (title.source === 'legend') {
    return state.prestige >= CAREER_MAX_PRESTIGE && state.level >= (title.rank ?? CAREER_MAX_LEVEL)
  }
  return false
}

export function careerUnlockedTitles(
  state: Pick<CareerState, 'level' | 'prestige' | 'unlockedCosmetics'>,
): CareerRankTitle[] {
  return CAREER_TITLE_CATALOG.filter((title) => careerTitleIsUnlocked(state, title))
}

export function careerActiveTitle(
  state: Pick<CareerState, 'level' | 'prestige' | 'unlockedCosmetics' | 'activeTitleId'>,
): CareerRankTitle {
  const available = careerUnlockedTitles(state)
  const selectedId = CAREER_TITLE_ALIASES[state.activeTitleId] ?? state.activeTitleId
  return available.find((title) => title.id === selectedId) ?? available[available.length - 1] ?? CAREER_DEFAULT_TITLE
}

export function careerActiveColor(
  state: Pick<CareerState, 'level' | 'prestige' | 'unlockedCosmetics' | 'activeColor' | 'activeTitleId'>,
): string {
  const colors = new Set(careerUnlockedTitles(state).map((title) => title.color.toLowerCase()))
  const selected = state.activeColor.toLowerCase()
  return colors.has(selected) ? selected : careerActiveTitle(state).color
}

export function careerXpSummary(
  state: Pick<CareerState, 'xp' | 'level' | 'apSpent' | 'apEarned'> &
    Partial<Pick<CareerState, 'prestige' | 'activeTitleId' | 'activeColor' | 'unlockedCosmetics' | 'elementSpent'>>,
): CareerXpSummary {
  const prestige = clamp(Math.round(state.prestige ?? 0), 0, CAREER_MAX_PRESTIGE)
  const levelCap = careerLevelCap(prestige)
  const maxXp = careerXpForLevel(levelCap)
  const totalXp = Math.min(maxXp, Math.max(0, state.xp))
  const level = careerLevelFromXp(totalXp, prestige)
  const levelFloor = careerXpForLevel(level)
  const xpIntoRaw = Math.max(0, totalXp - levelFloor)
  const atCap = level >= levelCap
  const xpForNext = atCap ? 0 : careerXpStep(level)
  const xpIntoLevel = atCap ? Math.max(1, xpIntoRaw) : Math.min(xpIntoRaw, xpForNext)
  const xpToNext = atCap ? 0 : Math.max(0, xpForNext - xpIntoLevel)
  const apEarned = clamp(Math.round(state.apEarned), 0, CAREER_MAX_AP)
  const apSpent = clamp(state.apSpent, 0, apEarned)
  const elementSpent = clamp(Math.round(state.elementSpent ?? 0), 0, Math.max(0, apEarned - apSpent))
  const apAvailable = apEarned - apSpent - elementSpent
  const ovr = Math.min(CAREER_MAX_OVR, CAREER_MIN_OVR + Math.floor(apSpent / CAREER_AP_PER_LEVEL))
  const styleState = {
    level,
    prestige,
    unlockedCosmetics: state.unlockedCosmetics ?? [],
    activeTitleId: state.activeTitleId ?? 'unsigned',
    activeColor: state.activeColor ?? CAREER_DEFAULT_TITLE.color,
  }
  const title = careerActiveTitle(styleState)
  const color = careerActiveColor(styleState)
  const lifetimeXp = prestige * CAREER_RUN_XP + totalXp
  return {
    level,
    levelCap,
    master: careerIsMaster(level, prestige),
    xpIntoLevel,
    xpForNext,
    xpToNext,
    totalXp,
    totalXpForNext: Math.min(maxXp, totalXp + xpToNext),
    lifetimeXp,
    xpToLegend: Math.max(0, CAREER_XP_TO_LEGEND - lifetimeXp),
    apEarned,
    apSpent,
    elementSpent,
    apAvailable,
    ovr,
    reputation: careerReputationForOvr(ovr),
    prestige,
    xpBonus: prestige > 0 ? CAREER_PRESTIGE_XP_BONUS : 0,
    title,
    color,
  }
}

export function careerOvr(
  state: Pick<CareerState, 'xp' | 'level' | 'apSpent' | 'apEarned'>,
): number {
  return careerXpSummary(state).ovr
}

/** Badge slots open during each level-55 run and relock when Prestige resets the level. */
export function careerBadgeSlots(rank: number): number {
  return CAREER_BADGE_SLOT_RANK.filter((threshold) => rank >= threshold).length
}

export function careerBadgeCount(state: Pick<CareerState, 'badges'>): number {
  return Object.values(normalizeBadgeRecords(state.badges))
    .filter((record) => record.tier !== 'locked').length
}

export function careerAttribute(state: CareerState, id: CareerAttributeId): number {
  return clamp(numberOr(state.attributes[id], GENRE_ATTRIBUTES[state.genre][id]), ATTR_FLOOR, ATTR_CAP)
}

function sanitizeAttributes(raw: unknown, genre: Genre): Record<CareerAttributeId, number> {
  const source = raw && typeof raw === 'object' ? (raw as Partial<Record<CareerAttributeId, number>>) : {}
  return Object.fromEntries(
    CAREER_ATTRIBUTES.map(({ id }) => [id, clamp(numberOr(source[id], GENRE_ATTRIBUTES[genre][id]), 1, ATTR_CAP)]),
  ) as Record<CareerAttributeId, number>
}

function allUnlockedMovesForRank(artistId: string, rank: number, legacyUnlocks: string[]): string[] {
  return CAREER_MOVE_UNLOCK_RANK.flatMap((unlock, index) =>
    unlock <= rank || legacyUnlocks.includes(`move:${index}`) ? [careerMoveId(artistId, index)] : [],
  )
}

export function careerMoveId(artistId: string, index: number): string {
  return `${artistId}-move-${index}`
}

function attributeMultiplier(value: number, perPoint: number, cap: number): number {
  return 1 + Math.min(cap, Math.max(0, value - CAREER_MIN_OVR) * perPoint)
}

function scaleCareerEffects(effects: MoveEffect[], state: CareerState, cardPower: number): MoveEffect[] {
  const bars = attributeMultiplier(state.attributes.bars, 0.008, 0.45)
  const hooks = attributeMultiplier(state.attributes.hooks, 0.007, 0.4)
  const stage = attributeMultiplier(state.attributes.stagePresence, 0.0075, 0.42)
  const defense = attributeMultiplier(state.attributes.defense, 0.007, 0.38)
  return effects.map((effect) => {
    const next = { ...effect }
    const scale = next.damage ? bars : next.heal ? hooks : next.shield ? defense : next.crowd || next.crowdHeal ? stage : 1
    for (const key of ['damage', 'heal', 'shield', 'crowd', 'crowdHeal'] as const) {
      const value = next[key]
      if (typeof value === 'number') next[key] = Math.max(1, Math.round(value * cardPower * scale))
    }
    return next
  })
}

function personalMove(
  state: CareerState,
  template: Move,
  index: number,
  special = false,
  elementOverride?: Element,
): Move {
  const id = special ? `${state.artistId}-move-special` : careerMoveId(state.artistId, index)
  const cardPower = careerCardPower(state)
  const profile = elementOverride ? elementMoveProfile(elementOverride) : null
  const effects = profile
    ? [{ damage: template.power }, ...profile.effects]
    : template.effects
  const move: Move = {
    ...template,
    id,
    artistId: state.artistId,
    name: special
      ? `${state.stageName || 'MY ARTIST'} · HEADLINE ENCORE`
      : profile?.name ?? template.name,
    element: elementOverride ?? template.element,
    target: profile?.target ?? template.target,
    description: special
      ? `The signature close. ${template.description}`
      : profile
        ? `${profile.description} • Career cut ${index + 1}.`
        : `${template.description} • Career cut ${index + 1}.`,
    power: Math.round(template.power * cardPower),
    effects: scaleCareerEffects(effects, state, cardPower),
    special,
    unlockLevel: special ? CAREER_SIGNATURE_UNLOCK_RANK : 1,
  }
  return move
}

/** The ten normal career cuts plus the level-55 signature, all from the real move pool. */
export function careerMoves(state: CareerState): Move[] {
  const templateArtist = CAREER_MOVE_TEMPLATE_ARTIST[state.genre]
  const source = movesForArtist(templateArtist)
  const normalTemplates = source.filter((move) => !move.special).slice(0, CAREER_MOVE_UNLOCK_RANK.length)
  const element = normalizeElement(state.element, state.genre)
  const secondary = careerDualElementUnlocked(state) && state.secondaryElement && state.secondaryElement !== element
    ? normalizeElement(state.secondaryElement, state.genre)
    : null
  const moves = normalTemplates.map((template, index) => {
    const override = template.element
      ? index === 2
        ? element
        : secondary ?? element
      : undefined
    return personalMove(state, template, index, false, override)
  })
  const specialTemplate = source.find((move) => move.special) ?? source[source.length - 1]
  const special = { ...personalMove(state, specialTemplate, 0, true), element }
  return [...moves, special]
}

export interface CareerMoveOption {
  move: Move
  index: number
  unlockRank: number
  unlocked: boolean
  special: boolean
  permanent: boolean
}

export function careerMoveCatalog(state: CareerState): CareerMoveOption[] {
  return careerMoves(state).map((move, index) => {
    const special = Boolean(move.special)
    const unlockRank = special ? CAREER_SIGNATURE_UNLOCK_RANK : CAREER_MOVE_UNLOCK_RANK[index] ?? CAREER_SIGNATURE_UNLOCK_RANK
    const permanent = state.legacyUnlocks.includes(special ? 'move:special' : `move:${index}`)
    return {
      move,
      index,
      unlockRank,
      unlocked: special ? state.level >= CAREER_SIGNATURE_UNLOCK_RANK || permanent : state.unlockedMoves.includes(move.id) || permanent,
      special,
      permanent,
    }
  })
}

export function careerSignatureMove(state: CareerState): Move {
  return careerMoves(state).find((move) => move.special) ?? careerMoves(state)[0]
}

export function sanitizeCareerLoadout(state: CareerState, loadout: string[]): string[] {
  const available = careerMoveCatalog(state).filter((entry) => !entry.special && entry.unlocked)
  const allowed = new Set(available.map((entry) => entry.move.id))
  const picked = [...new Set(loadout.filter((id) => allowed.has(id)))].slice(0, CAREER_MOVE_SLOTS)
  for (const entry of available) {
    if (picked.length >= CAREER_MOVE_SLOTS) break
    if (!picked.includes(entry.move.id)) picked.push(entry.move.id)
  }
  return picked
}

export function defaultCareerLoadout(state: CareerState): string[] {
  const available = careerMoveCatalog(state).filter((entry) => !entry.special && entry.unlocked)
  const priorities = [0, 2, 3, 1, 4, 5, 6, 7, 8, 9]
  const picked: string[] = []
  for (const index of priorities) {
    const entry = available.find((item) => item.index === index)
    if (entry && !picked.includes(entry.move.id)) picked.push(entry.move.id)
    if (picked.length >= CAREER_MOVE_SLOTS) break
  }
  return picked
}

export function syncCareer(state: CareerState): CareerState {
  const prestige = clamp(Math.round(numberOr(state.prestige, 0)), 0, CAREER_MAX_PRESTIGE)
  const maxXp = careerXpForLevel(careerLevelCap(prestige))
  const xp = clamp(Math.round(numberOr(state.xp, 0)), 0, maxXp)
  const level = careerLevelFromXp(xp, prestige)
  const prestigeTokens = clamp(Math.round(numberOr(state.prestigeTokens, 0)), 0, CAREER_MAX_PRESTIGE)
  const legacyUnlocks = Array.isArray(state.legacyUnlocks)
    ? [...new Set(state.legacyUnlocks.filter((key): key is string => typeof key === 'string'))]
    : []
  const apEarned = clamp(Math.round(numberOr(state.apEarned, 0)), 0, CAREER_MAX_AP)
  const apSpent = clamp(Math.round(state.apSpent), 0, apEarned)
  const elementSpent = clamp(Math.round(numberOr(state.elementSpent, 0)), 0, Math.max(0, apEarned - apSpent))
  const ovr = Math.min(CAREER_MAX_OVR, CAREER_MIN_OVR + Math.floor(apSpent / CAREER_AP_PER_LEVEL))
  const element = normalizeElement(state.element, state.genre)
  const unlockedElements = normalizeUnlockedElements(state.unlockedElements, element)
  const secondaryElement = ovr >= CAREER_DUAL_ELEMENT_OVR && state.secondaryElement &&
    unlockedElements.includes(state.secondaryElement) && state.secondaryElement !== element
    ? state.secondaryElement
    : null
  const unlocked = new Set([
    ...state.unlockedMoves,
    ...allUnlockedMovesForRank(state.artistId, level, legacyUnlocks),
  ])
  const unlockedCosmetics = new Set([...state.unlockedCosmetics, ...freshCosmetics()])
  for (const optionGroup of Object.entries(CAREER_OPTIONS) as [
    CareerOptionCategory,
    typeof CAREER_OPTIONS[CareerOptionCategory],
  ][]) {
    for (const option of optionGroup[1]) {
      if (option.unlockChapter && state.chapter >= option.unlockChapter) {
        unlockedCosmetics.add(`${optionGroup[0]}:${option.id}`)
      }
    }
  }
  for (const title of CAREER_TITLE_CATALOG) {
    if (title.source === 'default') continue
    if (careerTitleIsUnlocked({ level, prestige, unlockedCosmetics: [] }, title)) {
      unlockedCosmetics.add(careerTitleKey(title))
      unlockedCosmetics.add(careerColorKey(title.color))
    }
  }
  const badges = normalizeBadgeRecords(state.badges)
  for (const key of legacyUnlocks) {
    if (!key.startsWith('badge:')) continue
    const id = key.slice('badge:'.length) as BadgeId
    if (!BADGE_BY_ID.has(id)) continue
    if ((badges[id]?.tier ?? 'locked') === 'locked') {
      badges[id] = { tier: 'plastic', xp: 0, totalXp: BADGE_TIER_THRESHOLDS.locked }
    }
  }
  const equippedBadges = sanitizeBadgeLoadout(state.equippedBadges, badges)
    .slice(0, careerBadgeSlots(level)) as BadgeId[]
  const styleState = {
    level,
    prestige,
    unlockedCosmetics: [...unlockedCosmetics],
    activeTitleId: state.activeTitleId,
    activeColor: state.activeColor,
  }
  const activeTitle = careerActiveTitle(styleState)
  const activeColor = careerActiveColor(styleState)
  const withMoves = {
    ...state,
    xp,
    level,
    prestige,
    prestigeTokens,
    legacyUnlocks,
    activeTitleId: activeTitle.id,
    activeColor,
    apEarned,
    apSpent,
    elementSpent,
    ovr,
    unlockedMoves: [...unlocked],
    unlockedCosmetics: [...unlockedCosmetics],
    badges,
    equippedBadges,
    // Career artists always have access to the core Encore transformation.
    // The narrative unlock remains on the card for legacy saves, but never blocks battle.
    encoreUnlocked: true,
    element,
    unlockedElements,
    secondaryElement,
    crew: normalizeCrew(state.crew, state.genre),
    careerDifficulty: normalizeCareerDifficulty(state.careerDifficulty),
  }
  const equippedMoves = sanitizeCareerLoadout(withMoves, state.equippedMoves)
  const deck = state.deck.length ? state.deck : buildCareerDeck(withMoves, state.starterDeckId)
  const lineup = state.lineup.length ? state.lineup : buildCareerLineup(withMoves, deck)
  return {
    ...withMoves,
    equippedMoves,
    deck,
    lineup,
    updatedAt: Date.now(),
  }
}

function standardPriority(state: CareerState, style: CareerStarterDeck['id']): Artist[] {
  const genre = state.genre
  const crew = state.crew
  const all = [...ARTISTS]
  if (style === 'genre') {
    return [...all.filter((artist) => artist.genre === genre), ...all.filter((artist) => artist.genre !== genre)]
  }
  if (style === 'crew') {
    return [...all.filter((artist) => artist.crew === crew), ...all.filter((artist) => artist.crew !== crew)]
  }
  return all
}

export function buildStandardStarterDeck(state: CareerState, style: CareerStarterDeck['id']): string[] {
  const deck: string[] = []
  const counts = new Map<string, number>()
  const push = (id: string) => {
    if (deck.length >= 25) return
    const used = counts.get(id) ?? 0
    if (used >= 2) return
    counts.set(id, used + 1)
    deck.push(id)
  }
  for (const artist of standardPriority(state, style)) push(artist.id)
  for (const artist of ARTISTS) {
    while (deck.length < 25 && (counts.get(artist.id) ?? 0) < 2) push(artist.id)
  }
  return deck
}

function buildCareerDeck(state: CareerState, style: CareerStarterDeck['id']): string[] {
  return [state.artistId, ...buildStandardStarterDeck(state, style)].slice(0, 26)
}

function buildCareerLineup(state: CareerState, deck: string[]): string[] {
  const standard = Array.from(new Set(deck.filter((id) => id !== state.artistId))).slice(0, 4)
  return [state.artistId, ...standard]
}

export function applyStarterDeck(state: CareerState, style: CareerStarterDeck['id']): CareerState {
  const deck = buildCareerDeck(state, style)
  return syncCareer({
    ...state,
    starterDeckId: style,
    deck,
    lineup: buildCareerLineup(state, deck),
  })
}

export function finalizeCareerDraft(draft: CareerState): CareerState {
  const stageName = sanitizeStageName(draft.stageName) || 'UNNAMED ARTIST'
  const home = careerHometown(draft.hometownId)
  const element = normalizeElement(draft.element, draft.genre)
  const next: CareerState = {
    ...draft,
    stageName,
    hometownId: home.id,
    region: home.region,
    element,
    unlockedElements: [element],
    secondaryElement: null,
    crew: normalizeCrew(draft.crew, draft.genre),
    careerDifficulty: normalizeCareerDifficulty(draft.careerDifficulty),
    attributes: { ...GENRE_ATTRIBUTES[draft.genre] },
    xp: 0,
    level: CAREER_MIN_LEVEL,
    prestige: 0,
    prestigeTokens: 0,
    legacyUnlocks: [],
    activeTitleId: CAREER_DEFAULT_TITLE.id,
    activeColor: CAREER_DEFAULT_TITLE.color,
    apEarned: CAREER_STARTING_AP,
    apSpent: 0,
    elementSpent: 0,
    ovr: CAREER_MIN_OVR,
    createdAt: draft.createdAt || Date.now(),
    updatedAt: Date.now(),
  }
  const withDeck = applyStarterDeck(next, draft.starterDeckId)
  return syncCareer({
    ...withDeck,
    equippedMoves: defaultCareerLoadout(withDeck),
    equippedBadges: [],
  })
}

export function careerDeckLegal(deck: unknown, personalId?: string): deck is string[] {
  if (!Array.isArray(deck) || deck.length !== 26) return false
  const known = new Set(ARTISTS.map((artist) => artist.id))
  const counts = new Map<string, number>()
  let personal = 0
  for (const id of deck) {
    if (typeof id !== 'string') return false
    if (isPersonalArtistId(id)) {
      if (personalId && id !== personalId) return false
      personal += 1
      if (personal > 1) return false
      continue
    }
    if (!known.has(id)) return false
    const count = (counts.get(id) ?? 0) + 1
    if (count > 2) return false
    counts.set(id, count)
  }
  return personal === (personalId ? 1 : 0)
}

export function careerDeckWithPersonal(state: CareerState, deck: string[]): string[] {
  if (careerDeckLegal(deck, state.artistId)) return deck
  const next = applyStarterDeck(state, state.starterDeckId)
  return next.deck
}

export function careerXpAward(
  state: Pick<CareerState, 'prestige'>,
  base: number,
): { base: number; bonus: number; total: number } {
  const safe = Math.max(0, Math.round(base))
  const bonus = state.prestige > 0 ? Math.round(safe * CAREER_PRESTIGE_XP_BONUS) : 0
  return { base: safe, bonus, total: safe + bonus }
}

export function addCareerXp(state: CareerState, amount: number): CareerState {
  const award = careerXpAward(state, amount)
  return syncCareer({ ...state, xp: Math.max(0, state.xp + award.total) })
}

export function careerPrestigeReady(state: Pick<CareerState, 'level' | 'prestige'>): boolean {
  return state.level >= CAREER_PRESTIGE_MAX_LEVEL && state.prestige < CAREER_MAX_PRESTIGE
}

export function prestigeCareer(state: CareerState): CareerState {
  if (!careerPrestigeReady(state)) return state
  const prestige = clamp(state.prestige + 1, 0, CAREER_MAX_PRESTIGE)
  const legacyUnlocks = Array.isArray(state.legacyUnlocks) ? state.legacyUnlocks : []
  const badges: Record<string, BadgeProgress> = {}
  for (const key of legacyUnlocks) {
    if (!key.startsWith('badge:')) continue
    const id = key.slice('badge:'.length) as BadgeId
    if (!BADGE_BY_ID.has(id)) continue
    // A permanent badge keeps its unlock, but its tier progress is reset to
    // Plastic. The owner must earn the tier back after every Prestige.
    badges[id] = { tier: 'plastic', xp: 0, totalXp: 0 }
  }
  return syncCareer({
    ...state,
    prestige,
    prestigeTokens: clamp(state.prestigeTokens + 1, 0, CAREER_MAX_PRESTIGE),
    xp: 0,
    level: CAREER_MIN_LEVEL,
    unlockedMoves: [],
    equippedMoves: [],
    badges,
    equippedBadges: [],
    lastRewards: [
      `PRESTIGE ${prestige}`,
      'MOVE & BADGE UNLOCKS RESET',
      'PERMANENT UNLOCK TOKEN +1 · 1 MOVE + 1 BADGE',
      'OVR · AP · ATTRIBUTES RETAINED',
    ],
    updatedAt: Date.now(),
  })
}

export function spendCareerToken(
  state: CareerState,
  moveTarget: string,
  badgeTarget: string,
): CareerState {
  if (state.prestigeTokens <= 0) return state

  if (!moveTarget.startsWith('move:')) return state
  const moveOption = careerMoveCatalog(state).find((entry) =>
    (entry.special ? 'move:special' : `move:${entry.index}`) === moveTarget,
  )
  if (!moveOption || moveOption.permanent || moveOption.unlockRank <= CAREER_MIN_LEVEL) return state

  if (!badgeTarget.startsWith('badge:')) return state
  const badgeId = badgeTarget.slice('badge:'.length) as BadgeId
  if (!BADGE_BY_ID.has(badgeId)) return state

  const legacyUnlocks = Array.isArray(state.legacyUnlocks) ? state.legacyUnlocks : []
  if (legacyUnlocks.includes(moveTarget) || legacyUnlocks.includes(badgeTarget)) return state

  return syncCareer({
    ...state,
    prestigeTokens: state.prestigeTokens - 1,
    legacyUnlocks: [...legacyUnlocks, moveTarget, badgeTarget],
    updatedAt: Date.now(),
  })
}

export function setCareerLegacyStyle(
  state: CareerState,
  titleId: string,
  color: string,
): CareerState {
  const unlocked = careerUnlockedTitles(state)
  const title = unlocked.find((entry) => entry.id === titleId)
  if (!title) return state
  const colors = new Set(unlocked.map((entry) => entry.color.toLowerCase()))
  const nextColor = colors.has(color.toLowerCase()) ? color : title.color
  return syncCareer({
    ...state,
    activeTitleId: title.id,
    activeColor: nextColor,
    updatedAt: Date.now(),
  })
}

export function applyCareerUpgrades(
  state: CareerState,
  upgrades: Partial<Record<CareerAttributeId, number>>,
): CareerState {
  const summary = careerXpSummary(state)
  const entries = CAREER_ATTRIBUTES.flatMap(({ id }) => {
    const requested = Math.max(0, Math.floor(upgrades[id] ?? 0))
    const available = ATTR_CAP - careerAttribute(state, id)
    return requested > 0 ? [{ id, amount: Math.min(requested, available) }] : []
  })
  let budget = summary.apAvailable
  const attributes = { ...state.attributes }
  let spent = 0
  for (const entry of entries) {
    const amount = Math.min(entry.amount, budget)
    if (!amount) continue
    attributes[entry.id] += amount
    budget -= amount
    spent += amount
  }
  if (!spent) return state
  return syncCareer({ ...state, attributes, apSpent: state.apSpent + spent })
}

export function careerUpgradeCost(
  state: CareerState,
  upgrades: Partial<Record<CareerAttributeId, number>>,
): { ap: number; ovr: number; attributes: Record<CareerAttributeId, number> } {
  const projected = applyCareerUpgrades(state, upgrades)
  return {
    ap: projected.apSpent - state.apSpent,
    ovr: projected.ovr,
    attributes: projected.attributes,
  }
}

export function careerDualElementUnlocked(state: Pick<CareerState, 'ovr'>): boolean {
  return state.ovr >= CAREER_DUAL_ELEMENT_OVR
}

export function unlockCareerElement(state: CareerState, element: Element): CareerState {
  const normalized = normalizeElement(element, state.genre)
  const unlocked = normalizeUnlockedElements(state.unlockedElements, state.element)
  if (unlocked.includes(normalized)) return state
  if (careerXpSummary(state).apAvailable < CAREER_ELEMENT_UNLOCK_COST) return state
  return syncCareer({
    ...state,
    unlockedElements: [...unlocked, normalized],
    elementSpent: (state.elementSpent ?? 0) + CAREER_ELEMENT_UNLOCK_COST,
    updatedAt: Date.now(),
  })
}

export function equipCareerElement(
  state: CareerState,
  element: Element,
  slot: 'primary' | 'secondary' = 'primary',
): CareerState {
  const normalized = normalizeElement(element, state.genre)
  const unlocked = normalizeUnlockedElements(state.unlockedElements, state.element)
  if (!unlocked.includes(normalized)) return state
  if (slot === 'secondary') {
    if (!careerDualElementUnlocked(state) || normalizeElement(state.element, state.genre) === normalized) {
      return state
    }
    return syncCareer({
      ...state,
      secondaryElement: normalized,
      updatedAt: Date.now(),
    })
  }
  return syncCareer({
    ...state,
    element: normalized,
    secondaryElement: state.secondaryElement === normalized ? null : state.secondaryElement,
    updatedAt: Date.now(),
  })
}

export function clearCareerSecondaryElement(state: CareerState): CareerState {
  if (!state.secondaryElement) return state
  return syncCareer({ ...state, secondaryElement: null, updatedAt: Date.now() })
}

export function equipCareerMoves(state: CareerState, moveIds: string[]): CareerState {
  const equipped = sanitizeCareerLoadout(state, moveIds)
  return { ...state, equippedMoves: equipped, updatedAt: Date.now() }
}

export function equipCareerBadges(state: CareerState, badgeIds: BadgeId[]): CareerState {
  const records = normalizeBadgeRecords(state.badges)
  const equipped = sanitizeBadgeLoadout(badgeIds, records)
    .slice(0, careerBadgeSlots(state.level)) as BadgeId[]
  return { ...state, equippedBadges: equipped, updatedAt: Date.now() }
}

export function updateCareerAppearance(state: CareerState, appearance: ArtistAppearance): CareerState {
  return { ...state, appearance: normalizeAppearance(appearance), updatedAt: Date.now() }
}

export function updateCareerPreset(state: CareerState, presetId: CareerPresetId): CareerState {
  return { ...state, presetId, updatedAt: Date.now() }
}

export function updateCareerIdentity(
  state: CareerState,
  patch: {
    stageName?: string
    hometownId?: string
    genre?: Genre
    crew?: Crew
    careerDifficulty?: Difficulty
  },
): CareerState {
  const hometown = patch.hometownId ? careerHometown(patch.hometownId) : careerHometown(state.hometownId)
  const genre = patch.genre && patch.genre !== state.genre ? patch.genre : state.genre
  return syncCareer({
    ...state,
    stageName: patch.stageName !== undefined ? sanitizeStageName(patch.stageName) : state.stageName,
    hometownId: hometown.id,
    region: hometown.region,
    genre,
    crew: patch.crew ? normalizeCrew(patch.crew, genre) : state.crew,
    careerDifficulty: patch.careerDifficulty
      ? normalizeCareerDifficulty(patch.careerDifficulty)
      : state.careerDifficulty,
  })
}

export function careerPerson(artistId: string): string {
  return artistId
}export function careerArtist(state: CareerState): Artist {
  const genre = state.genre
  const attrs = state.attributes
  const bars = attrs.bars
  const hooks = attrs.hooks
  const stage = attrs.stagePresence
  const defense = attrs.defense
  const endurance = attrs.endurance
  const chemistry = attrs.chemistry
  const ovr = clamp(state.ovr, CAREER_MIN_OVR, CAREER_MAX_OVR)
  const growth = ovr - CAREER_MIN_OVR
  const chemistryBars = Math.max(0, chemistry - CAREER_MIN_OVR) * 0.12
  const palette = GENRE_PALETTE[genre]

  const badgeLabels = state.equippedBadges
    .map((badge) => BADGE_BY_ID.get(badge)?.name)
    .filter((name): name is string => Boolean(name))
  return {
    id: state.artistId,
    slot: 'MY',
    number: 0,
    name: state.stageName || 'UNNAMED ARTIST',
    genre,
    crew: state.crew,
    personal: {
      presetId: state.presetId,
      appearance: state.appearance,
      cardLevel: state.level,
      ovr,
      prestige: state.prestige,
      legacyTitle: careerActiveTitle(state).label,
      legacyColor: careerActiveColor(state),
      attributes: state.attributes,
      encoreUnlocked: true,
      badges: badgeLabels,
    },
    city: careerHometown(state.hometownId).city,
    heritage: careerHometown(state.hometownId).region,
    debutAlbum: 'MIXTAPE: FIRST TAKE',
    eraLabel: '20XX',
    debut: 'THE COME UP',
    cost: 3,
    bars: Math.max(20, Math.round(28 + (bars - 50) * 0.45 + chemistryBars + growth * 0.16)),
    effects: [
      { kind: 'shield', value: Math.max(1, Math.round(1 + (defense - 50) * 0.08 + growth * 0.02)) },
      { kind: 'hype', value: Math.max(1, Math.round(1 + (stage - 50) * 0.04 + growth * 0.01)) },
    ],
    encore: {
      name: `${state.stageName || 'MY ARTIST'} · ENCORE`,
      bars: Math.max(30, Math.round(38 + (bars - 50) * 0.45 + chemistryBars + growth * 0.28)),
      effects: [
        { kind: 'shield', value: Math.max(1, Math.round(2 + (defense - 50) * 0.1 + growth * 0.035)) },
        { kind: 'heal', value: Math.max(1, Math.round(1 + (hooks - 50) * 0.1 + growth * 0.03)) },
        { kind: 'hype', value: 1 },
      ],
      line: `${careerHometown(state.hometownId).city} MADE ME. THE ROOM MADE ME LOUDER.`,
    },
    quote: `${careerHometown(state.hometownId).city} → EVERY STAGE.`,
    palette,
    art: {
      pose: 0,
      hair: 1,
      accessory: state.appearance.glasses === 'none' ? 'mic' : 'shades',
      pattern: genre === 'HIP-HOP' ? 'halftone' : genre === 'R&B' ? 'halo' : 'chrome',
    },
    battle: {
      hp: Math.max(30, Math.round(40 + (endurance - 50) * 0.45 + growth * 0.3)),
      attack: Math.max(1, Math.round(2 + (bars - 50) * 0.1 + (chemistry - 50) * 0.02 + growth * 0.045)),
      defense: Math.max(0, Math.round(1 + (defense - 50) * 0.16 + growth * 0.02)),
      element: normalizeElement(state.element, genre),
      passive: GENRE_PASSIVE[genre],
    },
  }
}

export function registerCareerRuntime(state: CareerState): Artist {
  unregisterCareerRuntime(state.artistId)
  const artist = careerArtist(state)
  registerArtistCard(artist)
  registerArtistMoves(state.artistId, careerMoves(state))
  return artist
}

export function unregisterCareerRuntime(artistId: string) {
  unregisterArtistCard(artistId)
  unregisterArtistMoves(artistId)
}

export function careerBattleProgress(state: CareerState): ArtistProgress {
  return {
    xp: 0,
    // The personal card enters at battle tier 1 at 50 OVR and reaches the
    // normal mastery cap at 99 OVR. Card presentation still shows the rank.
    level: Math.min(10, Math.max(1, 1 + Math.floor((state.ovr - CAREER_MIN_OVR) / 5))),
    loadout: state.equippedMoves.slice(0, CAREER_MOVE_SLOTS),
    badges: state.badges,
    badgeLoadout: state.equippedBadges,
  }
}

export function careerBattleSettings(settings: Settings, state: CareerState): Settings {
  return {
    ...settings,
    deck: state.deck,
    lineup: state.lineup,
    artistProgress: {
      ...settings.artistProgress,
      [state.artistId]: careerBattleProgress(state),
    },
  }
}

export function careerChapter(genre: Genre, chapter: number): CareerChapter {
  const chapters = careerChapters(genre)
  return chapters[clamp(chapter, 1, chapters.length) - 1]
}

export function careerMission(genre: Genre, missionId: string): CareerMission | undefined {
  return careerChapters(genre)
    .flatMap((chapter) => chapter.missions)
    .find((mission) => mission.id === missionId)
}

export function careerMissionStatus(
  state: CareerState,
  mission: CareerMission,
): 'locked' | 'available' | 'complete' {
  const record = state.missions[mission.id]
  if (record?.clears) return 'complete'
  if (mission.chapter > state.chapter) return 'locked'
  if (mission.index === 1) return 'available'
  const previous = careerMission(state.genre, `ch${mission.chapter}-m${mission.index - 1}`)
  if (!previous || !state.missions[previous.id]?.clears) return 'locked'
  return 'available'
}

export function careerNextMission(state: CareerState): CareerMission | undefined {
  const chapters = careerChapters(state.genre)
  for (const chapter of chapters) {
    for (const mission of chapter.missions) {
      if (careerMissionStatus(state, mission) === 'available') return mission
    }
  }
  return undefined
}

export function careerChapterProgress(state: CareerState, chapter: CareerChapter): number {
  return chapter.missions.filter((mission) => state.missions[mission.id]?.clears).length
}

export function careerCompletedMissions(state: CareerState): number {
  return Object.values(state.missions).filter((record) => record.clears > 0).length
}

function objectiveDone(
  objective: CareerMissionObjective,
  performance: CareerBattlePerformance,
  personalStats: NonNullable<CareerBattlePerformance['cards']>[string],
  winner: 'player' | 'rival' | 'draw',
): boolean {
  // Support, feature and elemental objectives are deck-building routes. Any
  // card in the chosen 26 can satisfy them, so a Poison personal card is not
  // locked out of a healing objective. Personal-play and clean stay personal.
  const cards = Object.values(performance.cards ?? {})
  const total = (key: 'features' | 'prevented' | 'healing' | 'elementalUses') =>
    cards.length
      ? cards.reduce((sum, card) => sum + (card[key] ?? 0), 0)
      : (personalStats[key] ?? 0)
  switch (objective.kind) {
    case 'win':
      return winner === 'player'
    case 'personal-play':
      return (personalStats.uses ?? 0) >= objective.target
    case 'feature':
      return (total('features') || performance.features || 0) >= objective.target
    case 'clean':
      return !(performance.backstage ?? []).includes('personal')
    case 'defend':
      return total('prevented') + total('healing') >= objective.target
    case 'elemental':
      return total('elementalUses') >= objective.target
    case 'headliner':
      return winner === 'player'
    default:
      return false
  }
}

export function resolveCareerMission(
  state: CareerState,
  mission: CareerMission,
  winner: 'player' | 'rival' | 'draw',
  performance: CareerBattlePerformance = {},
): CareerBatch {
  const personalId = state.artistId
  const personalStats = performance.cards?.[personalId] ?? {
    uses: 0,
    features: 0,
    prevented: 0,
    healing: 0,
    elementalUses: 0,
  }
  // Battle telemetry keys the personal card by its real ID; clean uses the
  // same identity so the results layer can check Backstage without guessing.
  const cleanPerformance: CareerBattlePerformance = {
    ...performance,
    backstage: (performance.backstage ?? []).filter((id) => id !== 'personal'),
  }
  if ((performance.backstage ?? []).includes(personalId)) {
    cleanPerformance.backstage = [...(performance.backstage ?? []).filter((id) => id !== personalId), 'personal']
  }
  const objectives = mission.objectives.map((objective) => ({
    ...objective,
    done: objectiveDone(objective, cleanPerformance, personalStats, winner),
  }))
  const success = winner === 'player' && objectives.every((objective) => objective.done)
  const summaryBefore = careerXpSummary(state)
  const previous = state.missions[mission.id]
  const firstClear = success && !previous?.clears
  const repeat = previous?.repeats ?? 0
  const levelBefore = summaryBefore.level
  const rewards: string[] = []
  let next: CareerState = {
    ...state,
    wins: state.wins + (winner === 'player' ? 1 : 0),
    losses: state.losses + (winner === 'rival' ? 1 : 0),
    draws: state.draws + (winner === 'draw' ? 1 : 0),
    lastRewards: [],
  }
  const repeatEligible = success && !firstClear && repeat < 3
  const xpBreakdown = { victory: 0, objectives: 0, completion: 0, repeat: 0, prestige: 0 }
  let baseXp = 0
  if (firstClear) {
    xpBreakdown.victory = Math.round(mission.rewardXp * 0.6)
    xpBreakdown.objectives = mission.rewardXp - xpBreakdown.victory
    baseXp = mission.rewardXp
  } else if (repeatEligible) {
    xpBreakdown.repeat = Math.max(25, Math.round(mission.rewardXp * 0.25))
    baseXp = xpBreakdown.repeat
  } else if (!success && !previous) {
    xpBreakdown.completion = Math.max(25, Math.round(mission.rewardXp * 0.15))
    baseXp = xpBreakdown.completion
  }
  const xpAward = careerXpAward(state, baseXp)
  xpBreakdown.prestige = xpAward.bonus
  const xpGained = xpAward.total
  const records = {
    ...state.missions,
    [mission.id]: {
      clears: (previous?.clears ?? 0) + (success ? 1 : 0),
      repeats: repeat + (repeatEligible ? 1 : 0),
      lastResult: winner === 'player' ? 'win' : winner === 'rival' ? 'loss' : 'draw',
      lastAt: Date.now(),
    } satisfies CareerMissionRecord,
  }
  next = { ...next, missions: records }
  // Story badges can be re-earned after a Prestige reset by clearing their
  // mission again, even though the campaign clear itself is already recorded.
  if (success && mission.rewardBadge) {
    const unlocked = unlockCareerBadge(next, mission.rewardBadge)
    next = unlocked.state
    if (unlocked.unlocked) {
      rewards.push(`BADGE · ${BADGE_BY_ID.get(mission.rewardBadge)?.name ?? mission.rewardBadge}`)
    }
  }
  if (firstClear) {
    if (mission.rewardMoveIndex !== undefined) {
      const moveId = careerMoveId(state.artistId, mission.rewardMoveIndex)
      if (!next.unlockedMoves.includes(moveId)) {
        next = { ...next, unlockedMoves: [...next.unlockedMoves, moveId] }
        rewards.push(`MOVE · ${careerMoves(next)[mission.rewardMoveIndex]?.name ?? 'NEW CUT'}`)
      }
    }
    const unlockedCosmetics = CAREER_OPTIONS
      ? Object.entries(CAREER_OPTIONS).flatMap(([category, options]) =>
          options
            .filter((option) => option.unlockChapter === mission.chapter + 1)
            .map((option) => `${category}:${option.id} · ${option.label}`),
        )
      : []
    if (unlockedCosmetics.length) rewards.push(`STYLE DROP · ${unlockedCosmetics[0]}`)
    if (mission.isBoss) rewards.push(`CHAPTER ${mission.chapter} CLEARED`)
  }
  if (success && mission.isBoss) {
    next = { ...next, chapter: Math.max(next.chapter, Math.min(10, mission.chapter + 1)) }
  }
  let apAward = firstClear ? CAREER_AP_FIRST_CLEAR : 0
  if (firstClear && mission.isBoss) apAward += CAREER_AP_CHAPTER_CLEAR
  if (apAward > 0) {
    const before = next.apEarned
    next = { ...next, apEarned: clamp(next.apEarned + apAward, 0, CAREER_MAX_AP) }
    const gained = next.apEarned - before
    if (gained > 0) rewards.push(`${gained} AP · ${mission.isBoss ? 'CHAPTER CLEAR' : 'FIRST CLEAR'}`)
  }
  if (xpAward.bonus > 0) rewards.push(`PRESTIGE BONUS · +${xpAward.bonus} XP`)
  if (success && repeatEligible) rewards.push(`${xpGained} ARTIST XP · REPLAY REDUCED`)
  if (firstClear) rewards.push(`${xpGained} ARTIST XP · FIRST CLEAR`)
  if (!success && xpGained > 0) rewards.push(`${xpGained} ARTIST XP · COMPLETION`)
  next = awardCareerBadges(next, winner === 'player', performance)
  next = addCareerXp(next, baseXp)
  next = syncCareer({ ...next, lastRewards: rewards })
  const summaryAfter = careerXpSummary(next)
  return {
    career: next,
    report: {
      missionId: mission.id,
      missionTitle: mission.title,
      success,
      winner,
      objectives,
      xpGained,
      firstClear,
      repeat: repeat + (repeatEligible ? 1 : 0),
      rewards,
      chapterAdvanced: success && mission.isBoss && next.chapter > state.chapter,
      levelBefore,
      levelAfter: summaryAfter.level,
      ovrBefore: summaryBefore.ovr,
      ovrAfter: summaryAfter.ovr,
      apBefore: summaryBefore.apAvailable,
      apAfter: summaryAfter.apAvailable,
      apGained: Math.max(0, summaryAfter.apEarned - summaryBefore.apEarned),
      xpBreakdown,
    },
  }
}

export function awardLocalCareerXp(
  state: CareerState,
  won: boolean,
  performance: CareerBattlePerformance = {},
): { career: CareerState; gained: number; capped: boolean; report: CareerMissionReport } {
  const today = new Date().toISOString().slice(0, 10)
  const usedToday = state.localXpDay === today ? state.localXpToday : 0
  const dailyCap = 160
  const apUsedToday = state.localApDay === today ? state.localApToday : 0
  const apRoom = Math.max(0, CAREER_MAX_AP - state.apEarned)
  const apAward = won
    ? Math.min(
        CAREER_LOCAL_AP_PER_WIN,
        apRoom,
        Math.max(0, CAREER_LOCAL_AP_DAILY_CAP - apUsedToday),
      )
    : 0
  const requested = won ? 40 : 12
  const summaryBefore = careerXpSummary(state)
  const personalUses = performance.cards?.[state.artistId]?.uses ?? 0
  const requestedWithPlay = requested + Math.min(20, personalUses * 2)
  const baseApplied = Math.min(requestedWithPlay, Math.max(0, dailyCap - usedToday))
  const xpAward = careerXpAward(state, baseApplied)
  const applied = xpAward.total
  const synced = syncCareer({
    ...state,
    xp: state.xp + applied,
    apEarned: state.apEarned + apAward,
    localXpDay: today,
    localXpToday: usedToday + baseApplied,
    localApDay: today,
    localApToday: apUsedToday + apAward,
  })
  const withBadges = awardCareerBadges(synced, won, performance)
  const summaryAfter = careerXpSummary(withBadges)
  const rewards = applied > 0
    ? [`${applied} ARTIST XP · LOCAL SHOW`]
    : ['DAILY LOCAL XP CAP REACHED']
  if (apAward > 0) rewards.push(`${apAward} AP · LOCAL SHOW`)
  else if (won && apUsedToday >= CAREER_LOCAL_AP_DAILY_CAP) {
    rewards.push(`LOCAL AP CAP REACHED · ${CAREER_LOCAL_AP_DAILY_CAP}/${CAREER_LOCAL_AP_DAILY_CAP} TODAY`)
  }
  if (xpAward.bonus > 0) rewards.push(`PRESTIGE BONUS · +${xpAward.bonus} XP`)
  return {
    career: withBadges,
    gained: applied,
    capped: baseApplied < requestedWithPlay,
    report: {
      missionId: 'local-cpu',
      missionTitle: 'LOCAL CPU SHOWCASE',
      success: won,
      winner: won ? 'player' : 'rival',
      objectives: [],
      xpGained: applied,
      firstClear: false,
      repeat: 0,
      rewards,
      chapterAdvanced: false,
      levelBefore: summaryBefore.level,
      levelAfter: summaryAfter.level,
      ovrBefore: summaryBefore.ovr,
      ovrAfter: summaryAfter.ovr,
      apBefore: summaryBefore.apAvailable,
      apAfter: summaryAfter.apAvailable,
      apGained: Math.max(0, summaryAfter.apEarned - summaryBefore.apEarned),
      xpBreakdown: {
        victory: won ? Math.max(0, baseApplied - Math.min(20, personalUses * 2)) : 0,
        objectives: 0,
        completion: won ? 0 : baseApplied,
        repeat: 0,
        prestige: xpAward.bonus,
      },
    },
  }
}

export function careerWinRate(state: CareerState): number {
  const total = state.wins + state.losses + state.draws
  return total ? Math.round((state.wins / total) * 100) : 0
}

export function careerFullName(state: CareerState): string {
  return state.stageName || 'UNNAMED ARTIST'
}

export function careerSummaryLine(state: CareerState): string {
  const home = careerHometown(state.hometownId)
  return `${home.city} · ${state.region} · ${state.genre}`
}

export function careerCosmeticKey(category: CareerOptionCategory, id: string): string {
  return `${category}:${id}`
}

export function isPersonalCareerDeck(deck: unknown): boolean {
  return Array.isArray(deck) && deck.some((id) => isPersonalArtistId(id))
}

export function careerDifficultyForOvr(ovr: number): Difficulty {
  if (ovr >= 90) return 'LEGEND'
  if (ovr >= 65) return 'HEADLINER'
  return 'OPENING'
}

function normalizeMissionRecords(raw: unknown): Record<string, CareerMissionRecord> {
  if (!raw || typeof raw !== 'object') return {}
  const records: Record<string, CareerMissionRecord> = {}
  for (const [id, value] of Object.entries(raw as Record<string, Partial<CareerMissionRecord>>)) {
    if (!value || typeof value !== 'object') continue
    records[id] = {
      clears: Math.max(0, Math.round(numberOr(value.clears, 0))),
      repeats: clamp(Math.round(numberOr(value.repeats, 0)), 0, 3),
      lastResult: value.lastResult === 'loss' || value.lastResult === 'draw' ? value.lastResult : 'win',
      lastAt: numberOr(value.lastAt, Date.now()),
    }
  }
  return records
}

function normalizeCareer(raw: unknown): CareerState {
  const fallback = newCareerDraft()
  if (!raw || typeof raw !== 'object') return syncCareer(finalizeCareerDraft(fallback))
  const source = raw as Partial<CareerState>
  const genre: Genre =
    source.genre === 'HIP-HOP' || source.genre === 'R&B' || source.genre === 'POP'
      ? source.genre
      : fallback.genre
  const element = normalizeElement(source.element, genre)
  const unlockedElements = normalizeUnlockedElements(source.unlockedElements, element)
  const hometown = careerHometown(typeof source.hometownId === 'string' ? source.hometownId : fallback.hometownId)
  const starter = CAREER_STARTER_DECKS.some((deck) => deck.id === source.starterDeckId)
    ? (source.starterDeckId as CareerStarterDeck['id'])
    : 'balanced'
  const artistId = isPersonalArtistId(source.artistId) ? source.artistId : fallback.artistId
  const stageName = sanitizeStageName(typeof source.stageName === 'string' ? source.stageName : '')
  const sourceVersion = Math.round(numberOr(source.version, 1))
  const legacyLevel = clamp(Math.round(numberOr(source.level, 1)), 1, CAREER_MAX_LEVEL)
  const legacyOvr = clamp(Math.round(numberOr(source.ovr, CAREER_MIN_OVR)), CAREER_MIN_OVR, CAREER_MAX_OVR)
  let prestige = sourceVersion >= 6
    ? clamp(Math.round(numberOr(source.prestige, 0)), 0, CAREER_MAX_PRESTIGE)
    : 0
  let xp = Math.max(0, Math.round(numberOr(source.xp, 0)))
  if (sourceVersion >= 6 && sourceVersion < 7) xp = rescaleCareerXp(xp, prestige)
  let level = careerLevelFromXp(xp, prestige)
  if (sourceVersion < 6) {
    // Version 5 used the retired 1–400 card ladder. Version 4 and older used
    // the even older 50–99 development rank. Preserve progress as a level in
    // the new level-55 run instead of carrying a rank number that no longer exists.
    level = sourceVersion >= 5
      ? clamp(CAREER_MIN_LEVEL + Math.round(((legacyLevel - 1) / 399) * (CAREER_PRESTIGE_MAX_LEVEL - 1)), 1, 55)
      : clamp(CAREER_MIN_LEVEL + Math.round(((legacyLevel - CAREER_MIN_OVR) / 49) * (CAREER_PRESTIGE_MAX_LEVEL - 1)), 1, 55)
    xp = careerXpForLevel(level)
    prestige = sourceVersion >= 5
      ? clamp(Math.round(numberOr(source.prestige, 0)), 0, CAREER_MAX_PRESTIGE)
      : 0
  }
  const apEarned = clamp(
    Math.max(
      Math.round(numberOr(source.apEarned, 0)),
      (legacyOvr - CAREER_MIN_OVR) * CAREER_AP_PER_LEVEL,
    ),
    0,
    CAREER_MAX_AP,
  )
  const apSpent = clamp(Math.round(numberOr(source.apSpent, 0)), 0, apEarned)
  const elementSpent = clamp(Math.round(numberOr(source.elementSpent, 0)), 0, Math.max(0, apEarned - apSpent))
  const ovr = Math.min(CAREER_MAX_OVR, CAREER_MIN_OVR + Math.floor(apSpent / CAREER_AP_PER_LEVEL))
  const rawSecondary = ELEMENT_ORDER.includes(source.secondaryElement as Element)
    ? (source.secondaryElement as Element)
    : null
  const secondaryElement = ovr >= CAREER_DUAL_ELEMENT_OVR && rawSecondary &&
    unlockedElements.includes(rawSecondary) && rawSecondary !== element
    ? rawSecondary
    : null
  const deckSource = Array.isArray(source.deck)
    ? source.deck.filter((id): id is string => typeof id === 'string' && (isPersonalArtistId(id) || ARTISTS.some((artist) => artist.id === id)))
    : []
  const badgeRecords = normalizeCareerBadges((source as { badges?: unknown }).badges)
  const state: CareerState = {
    ...fallback,
    ...source,
    version: CAREER_VERSION,
    artistId,
    stageName,
    hometownId: hometown.id,
    region: hometown.region,
    genre,
    element,
    unlockedElements,
    secondaryElement,
    crew: normalizeCrew(source.crew, genre),
    careerDifficulty: normalizeCareerDifficulty(source.careerDifficulty),
    presetId: isCareerPresetId(source.presetId)
      ? source.presetId
      : inferCareerPresetId(source.appearance),
    appearance: normalizeAppearance(source.appearance),
    starterDeckId: starter,
    createdAt: numberOr(source.createdAt, Date.now()),
    updatedAt: numberOr(source.updatedAt, Date.now()),
    xp,
    level,
    prestige,
    prestigeTokens: sourceVersion >= 5 ? clamp(Math.round(numberOr(source.prestigeTokens, 0)), 0, CAREER_MAX_PRESTIGE) : 0,
    legacyUnlocks: sourceVersion >= 5 && Array.isArray(source.legacyUnlocks)
      ? source.legacyUnlocks.filter((key): key is string => typeof key === 'string')
      : [],
    activeTitleId: typeof source.activeTitleId === 'string' ? source.activeTitleId : CAREER_DEFAULT_TITLE.id,
    activeColor: typeof source.activeColor === 'string' ? source.activeColor : CAREER_DEFAULT_TITLE.color,
    apEarned,
    apSpent,
    elementSpent,
    ovr,
    attributes: sanitizeAttributes(source.attributes, genre),
    unlockedMoves: Array.isArray(source.unlockedMoves)
      ? source.unlockedMoves.filter((id): id is string => typeof id === 'string')
      : [],
    equippedMoves: Array.isArray(source.equippedMoves)
      ? source.equippedMoves.filter((id): id is string => typeof id === 'string')
      : [],
    badges: badgeRecords,
    equippedBadges: normalizeCareerBadgeLoadout(
      (source as { equippedBadges?: unknown }).equippedBadges,
      badgeRecords,
    ),
    chapter: clamp(Math.round(numberOr(source.chapter, 1)), 1, 10),
    missions: normalizeMissionRecords(source.missions),
    unlockedCosmetics: Array.isArray(source.unlockedCosmetics)
      ? source.unlockedCosmetics.filter((key): key is string => typeof key === 'string')
      : [],
    encoreUnlocked: true,
    wins: Math.max(0, Math.round(numberOr(source.wins, 0))),
    losses: Math.max(0, Math.round(numberOr(source.losses, 0))),
    draws: Math.max(0, Math.round(numberOr(source.draws, 0))),
    deck: deckSource,
    lineup: Array.isArray(source.lineup)
      ? source.lineup.filter((id): id is string => typeof id === 'string')
      : [],
    lastRewards: Array.isArray(source.lastRewards)
      ? source.lastRewards.filter((reward): reward is string => typeof reward === 'string')
      : [],
    localXpDay: typeof source.localXpDay === 'string' ? source.localXpDay : '',
    localXpToday: Math.max(0, numberOr(source.localXpToday, 0)),
    localApDay: typeof source.localApDay === 'string' ? source.localApDay : '',
    localApToday: clamp(Math.round(numberOr(source.localApToday, 0)), 0, CAREER_LOCAL_AP_DAILY_CAP),
  }
  const deck = careerDeckLegal(state.deck, state.artistId) ? state.deck : buildCareerDeck(state, starter)
  const lineup = deck.includes(state.artistId) && state.lineup.includes(state.artistId)
    ? state.lineup.filter((id) => deck.includes(id)).slice(0, 5)
    : buildCareerLineup(state, deck)
  const synced = syncCareer({ ...state, deck, lineup })
  return {
    ...synced,
    lineup: lineup.length === 5 ? lineup : synced.lineup,
  }
}

export interface CareerSlotSummary {
  id: string
  number: number
  empty: boolean
  stageName: string
  genre: Genre | null
  element: Element | null
  level: number
  prestige: number
  ovr: number
  chapter: number
  createdAt: number
  updatedAt: number
}

interface CareerSlotRecord {
  id: string
  career: CareerState | null
}

interface CareerSlotStore {
  version: number
  activeSlotId: string
  slots: CareerSlotRecord[]
}

function careerSlotId(index: number): string {
  return `slot-${index + 1}`
}

function defaultCareerSlotStore(): CareerSlotStore {
  return {
    version: 1,
    activeSlotId: careerSlotId(0),
    slots: Array.from({ length: CAREER_SLOT_COUNT }, (_, index) => ({
      id: careerSlotId(index),
      career: null,
    })),
  }
}

function activeCareerInSlotStore(store: CareerSlotStore): CareerState | null {
  const active = store.slots.find((slot) => slot.id === store.activeSlotId) ?? store.slots[0]
  return active?.career ?? null
}

function normalizeCareerSlotStore(raw: unknown): CareerSlotStore | null {
  if (!raw || typeof raw !== 'object') return null
  const source = raw as { activeSlotId?: unknown; slots?: unknown }
  if (!Array.isArray(source.slots)) return null
  const store = defaultCareerSlotStore()
  const known = new Map(store.slots.map((slot) => [slot.id, slot]))
  for (const entry of source.slots) {
    if (!entry || typeof entry !== 'object') continue
    const record = entry as { id?: unknown; career?: unknown }
    if (typeof record.id !== 'string') continue
    const target = known.get(record.id)
    if (!target) continue
    if (record.career && typeof record.career === 'object') {
      const career = normalizeCareer(record.career)
      target.career = career.stageName ? career : null
    }
  }
  store.activeSlotId = typeof source.activeSlotId === 'string' && known.has(source.activeSlotId)
    ? source.activeSlotId
    : store.activeSlotId
  return store
}

function writeCareerSlotStore(store: CareerSlotStore): boolean {
  try {
    const current = localStorage.getItem(CAREER_SLOTS_KEY)
    if (current) localStorage.setItem(CAREER_SLOTS_BACKUP_KEY, current)
    localStorage.setItem(CAREER_SLOTS_KEY, JSON.stringify(store))
    return true
  } catch {
    // The career remains in memory if storage is full or blocked.
    return false
  }
}

function readLegacyCareer(): CareerState | null {
  const read = (key: string): CareerState | null => {
    try {
      const raw = localStorage.getItem(key)
      if (!raw) return null
      const career = normalizeCareer(JSON.parse(raw))
      return career.stageName ? career : null
    } catch {
      return null
    }
  }
  return read(CAREER_STORAGE_KEY) ?? read(CAREER_BACKUP_KEY)
}

function migrateLegacyCareerToSlots(): CareerSlotStore | null {
  const legacy = readLegacyCareer()
  if (!legacy) return null
  const store = defaultCareerSlotStore()
  store.slots[0] = { id: store.slots[0].id, career: legacy }
  store.activeSlotId = store.slots[0].id
  if (!writeCareerSlotStore(store)) return store
  try {
    localStorage.removeItem(CAREER_STORAGE_KEY)
  } catch {
    // The slot copy is already saved; a leftover legacy key is harmless.
  }
  return store
}

function readCareerSlotStore(): CareerSlotStore {
  try {
    const raw = localStorage.getItem(CAREER_SLOTS_KEY)
    if (raw) {
      const store = normalizeCareerSlotStore(JSON.parse(raw))
      if (store) return store
    }
  } catch {
    // Fall through to the backup or the legacy single-save migration.
  }
  try {
    const backup = localStorage.getItem(CAREER_SLOTS_BACKUP_KEY)
    if (backup) {
      const store = normalizeCareerSlotStore(JSON.parse(backup))
      if (store) return store
    }
  } catch {
    // Fall through to legacy migration.
  }
  return migrateLegacyCareerToSlots() ?? defaultCareerSlotStore()
}

export function careerActiveSlot(): string {
  return readCareerSlotStore().activeSlotId
}

export function careerSlotSummaries(): CareerSlotSummary[] {
  const store = readCareerSlotStore()
  return store.slots.map((slot, index) => {
    if (!slot.career) {
      return {
        id: slot.id,
        number: index + 1,
        empty: true,
        stageName: '',
        genre: null,
        element: null,
        level: 0,
        prestige: 0,
        ovr: 0,
        chapter: 0,
        createdAt: 0,
        updatedAt: 0,
      }
    }
    const summary = careerXpSummary(slot.career)
    return {
      id: slot.id,
      number: index + 1,
      empty: false,
      stageName: slot.career.stageName,
      genre: slot.career.genre,
      element: slot.career.element,
      level: summary.level,
      prestige: summary.prestige,
      ovr: summary.ovr,
      chapter: slot.career.chapter,
      createdAt: slot.career.createdAt,
      updatedAt: slot.career.updatedAt,
    }
  })
}

export function selectCareerSlot(id: string): CareerState | null {
  const store = readCareerSlotStore()
  const target = store.slots.find((slot) => slot.id === id)
  if (!target) return activeCareerInSlotStore(store)
  if (store.activeSlotId !== target.id) {
    store.activeSlotId = target.id
    writeCareerSlotStore(store)
  }
  return target.career
}

export function deleteCareerSlot(id: string): { activeSlotId: string; career: CareerState | null } {
  const store = readCareerSlotStore()
  const target = store.slots.find((slot) => slot.id === id)
  if (target) {
    target.career = null
    writeCareerSlotStore(store)
  }
  return { activeSlotId: store.activeSlotId, career: activeCareerInSlotStore(store) }
}

export function loadCareer(): CareerState | null {
  return activeCareerInSlotStore(readCareerSlotStore())
}

export function saveCareer(state: CareerState): CareerState {
  const synced = syncCareer(state)
  const store = readCareerSlotStore()
  const active = store.slots.find((slot) => slot.id === store.activeSlotId) ?? store.slots[0]
  if (active) {
    active.career = synced
    store.activeSlotId = active.id
    writeCareerSlotStore(store)
  }
  return synced
}

export function deleteCareer() {
  deleteCareerSlot(careerActiveSlot())
}

export function careerRivalDeck(mission: CareerMission): string[] {
  return mission.rivalDeck.length ? mission.rivalDeck : buildRivalDeck(mission.rivalLineup, 'HIP-HOP')
}

export function careerMissionDeck(mission: CareerMission): string[] {
  return mission.rivalDeck.slice(0, 26)
}

export function careerMissionGenreLine(mission: CareerMission, genre: Genre): string {
  return mission.genreLine || genre
}

export { isPersonalArtistId }
