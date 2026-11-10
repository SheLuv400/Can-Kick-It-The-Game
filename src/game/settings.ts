import type {
  AnnouncerSettings,
  ArtistProgress,
  BackgroundMotion,
  BloomQuality,
  CardImageQuality,
  CardMaterialQuality,
  Difficulty,
  DisplayMode,
  FrameLimit,
  GraphicsPreset,
  LightingQuality,
  ParticleQuality,
  RenderScale,
  Settings,
  ShadowQuality,
  TeamProgress,
  ThemeId,
  TvSafeArea,
  TvUiScale,
  UiScale,
} from './types'
import { initialAutoQuality, PRESET_VALUES } from './graphics'
import { ARTISTS, CORE_ARTIST_COUNT, isKnownArtistId } from './roster'
import { isPersonalArtistId } from './personal-id'
import { normalizeBadgeRecords, sanitizeBadgeLoadout } from './badges'
import { MAX_CARD_LEVEL, XP_PER_LEVEL } from './moves'

const STORAGE_KEY = 'ciki.settings.v1'

export const DEFAULT_DECK: string[] = ARTISTS.slice(0, CORE_ARTIST_COUNT).map((artist) => artist.id)

export const LINEUP_SIZE = 5

function deckCounts(deck: string[]) {
  const counts = new Map<string, number>()
  for (const id of deck) counts.set(id, (counts.get(id) ?? 0) + 1)
  return counts
}

function consumeLineup(lineup: unknown, available: Map<string, number>): string[] {
  const picked: string[] = []
  if (!Array.isArray(lineup)) return picked
  for (const id of lineup) {
    if (picked.length >= LINEUP_SIZE) break
    if (typeof id !== 'string') continue
    const count = available.get(id) ?? 0
    if (count <= 0) continue
    picked.push(id)
    available.set(id, count - 1)
  }
  return picked
}

/**
 * Keeps a valid starter list against the current deck, then fills any gap from
 * the deck so new and migrated saves always open with five cards.
 */
export function sanitizeLineup(lineup: unknown, deck: string[]): string[] {
  const available = deckCounts(deck)
  const picked = consumeLineup(lineup, available)
  for (const id of deck) {
    if (picked.length >= LINEUP_SIZE) break
    const count = available.get(id) ?? 0
    if (count <= 0) continue
    picked.push(id)
    available.set(id, count - 1)
  }
  return picked
}

export function validLineup(lineup: unknown, deck: string[]): lineup is string[] {
  if (!Array.isArray(lineup) || lineup.length !== LINEUP_SIZE) return false
  return consumeLineup(lineup, deckCounts(deck)).length === LINEUP_SIZE
}

type GraphicsField =
  | 'graphicsPreset'
  | 'frameLimit'
  | 'renderScale'
  | 'uiScale'
  | 'displayMode'
  | 'tvUiScale'
  | 'tvSafeArea'
  | 'showFps'
  | 'cardImageQuality'
  | 'cardMaterial'
  | 'holoFoil'
  | 'concertLighting'
  | 'shadows'
  | 'bloom'
  | 'particles'
  | 'backgroundMotion'
  | 'audioVisualizers'
  | 'cardTilt'
  | 'reducedMotion'
  | 'flashEffects'
  | 'vhsEffects'

/** Graphics-only defaults for the Restore Defaults action. */
export const GRAPHICS_DEFAULTS: Pick<Settings, GraphicsField> = {
  graphicsPreset: 'auto',
  frameLimit: 'auto',
  renderScale: 100,
  uiScale: 100,
  displayMode: 'standard',
  tvUiScale: 110,
  tvSafeArea: 24,
  showFps: false,
  cardImageQuality: 'hd',
  ...PRESET_VALUES[initialAutoQuality()],
  audioVisualizers: true,
  cardTilt: true,
  reducedMotion: false,
  flashEffects: true,
  vhsEffects: false,
}

export const DEFAULT_SETTINGS: Settings = {
  theme: 'b',
  difficulty: 'HEADLINER',
  deck: DEFAULT_DECK,
  lineup: DEFAULT_DECK.slice(0, LINEUP_SIZE),
  wins: 0,
  losses: 0,
  selectedDirection: 'b',
  ...GRAPHICS_DEFAULTS,
  musicVolume: 0.32,
  sfxVolume: 0.55,
  announcer: {
    enabled: true,
    volume: 0.88,
    crowdVolume: 0.42,
    subtitles: true,
    frequency: 'NORMAL',
  },
  team: {
    labelName: 'CIKI RECORDS',
    crest: 'crown',
    credits: 750,
    buzz: 0,
    claimedMissions: [],
    circuitWins: 0,
  },
  artistProgress: {},
}

export function validDeck(deck: unknown): deck is string[] {
  if (!Array.isArray(deck) || deck.length !== 26) return false
  const counts = new Map<string, number>()
  let personal = 0
  for (const id of deck) {
    if (typeof id !== 'string') return false
    if (isPersonalArtistId(id)) {
      personal += 1
      if (personal > 1) return false
      continue
    }
    if (!isKnownArtistId(id)) return false
    const count = (counts.get(id) ?? 0) + 1
    if (count > 2) return false
    counts.set(id, count)
  }
  return true
}

/** Personal Artist Cards are local-only and must be rejected by online paths. */
export function containsPersonalArtist(deck: unknown): boolean {
  return Array.isArray(deck) && deck.some((id) => isPersonalArtistId(id))
}

function volume(value: unknown, fallback: number) {
  if (typeof value !== 'number' || !Number.isFinite(value)) return fallback
  return Math.min(1, Math.max(0, value))
}

function oneOf<T extends string | number>(value: unknown, allowed: readonly T[], fallback: T): T {
  return allowed.includes(value as T) ? (value as T) : fallback
}

export function loadSettings(): Settings {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return DEFAULT_SETTINGS
    const parsed = JSON.parse(raw) as Partial<Settings>
    const storedDirection: ThemeId | null =
      parsed.selectedDirection === 'a' || parsed.selectedDirection === 'b' || parsed.selectedDirection === 'c'
        ? parsed.selectedDirection
        : null
    // Hip-Hop Legends (Block Party '88) is the locked art direction. A direction explicitly chosen
    // in the Design Room still wins, so the comparison room keeps working.
    const selectedDirection: ThemeId = storedDirection ?? 'b'
    const theme: ThemeId = storedDirection ?? 'b'
    const difficulty: Difficulty =
      parsed.difficulty === 'OPENING' || parsed.difficulty === 'HEADLINER' || parsed.difficulty === 'LEGEND'
        ? parsed.difficulty
        : 'HEADLINER'
    const storedAnnouncer = (parsed.announcer ?? {}) as Partial<AnnouncerSettings>
    const announcerFrequency: AnnouncerSettings['frequency'] =
      storedAnnouncer.frequency === 'LOW' || storedAnnouncer.frequency === 'HIGH'
        ? storedAnnouncer.frequency
        : 'NORMAL'
    const announcer: AnnouncerSettings = {
      enabled:
        typeof storedAnnouncer.enabled === 'boolean'
          ? storedAnnouncer.enabled
          : DEFAULT_SETTINGS.announcer.enabled,
      volume: volume(storedAnnouncer.volume, DEFAULT_SETTINGS.announcer.volume),
      crowdVolume: volume(storedAnnouncer.crowdVolume, DEFAULT_SETTINGS.announcer.crowdVolume),
      subtitles:
        typeof storedAnnouncer.subtitles === 'boolean'
          ? storedAnnouncer.subtitles
          : DEFAULT_SETTINGS.announcer.subtitles,
      frequency: announcerFrequency,
    }
    const storedTeam = (parsed.team ?? {}) as Partial<TeamProgress>
    const crest: TeamProgress['crest'] =
      storedTeam.crest === 'crown' || storedTeam.crest === 'bolt' || storedTeam.crest === 'star'
        ? storedTeam.crest
        : DEFAULT_SETTINGS.team.crest
    const team: TeamProgress = {
      ...DEFAULT_SETTINGS.team,
      ...storedTeam,
      labelName:
        typeof storedTeam.labelName === 'string' && storedTeam.labelName.trim()
          ? storedTeam.labelName.trim().slice(0, 24)
          : DEFAULT_SETTINGS.team.labelName,
      crest,
      credits:
        typeof storedTeam.credits === 'number' && Number.isFinite(storedTeam.credits)
          ? Math.max(0, Math.round(storedTeam.credits))
          : DEFAULT_SETTINGS.team.credits,
      buzz:
        typeof storedTeam.buzz === 'number' && Number.isFinite(storedTeam.buzz)
          ? Math.max(0, Math.round(storedTeam.buzz))
          : DEFAULT_SETTINGS.team.buzz,
      claimedMissions: Array.isArray(storedTeam.claimedMissions)
        ? storedTeam.claimedMissions.filter((id): id is string => typeof id === 'string')
        : [],
      circuitWins:
        typeof storedTeam.circuitWins === 'number' && Number.isFinite(storedTeam.circuitWins)
          ? Math.max(0, Math.round(storedTeam.circuitWins))
          : 0,
    }
    const artistProgress: Record<string, ArtistProgress> = {}
    if (parsed.artistProgress && typeof parsed.artistProgress === 'object') {
      for (const [artistId, value] of Object.entries(parsed.artistProgress)) {
        if (!value || typeof value !== 'object') continue
        const entry = value as Partial<ArtistProgress>
        const xp =
          typeof entry.xp === 'number' && Number.isFinite(entry.xp)
            ? Math.min(MAX_CARD_LEVEL * XP_PER_LEVEL, Math.max(0, Math.round(entry.xp)))
            : 0
        const level =
          typeof entry.level === 'number' && Number.isFinite(entry.level)
            ? Math.min(MAX_CARD_LEVEL, Math.max(1, Math.round(entry.level)))
            : 1
        const loadout = Array.isArray(entry.loadout)
          ? entry.loadout.filter((id): id is string => typeof id === 'string').slice(0, 3)
          : undefined
        const badges = normalizeBadgeRecords(entry.badges)
        const badgeLoadout = sanitizeBadgeLoadout(entry.badgeLoadout, badges)
        artistProgress[artistId] = { xp, level, loadout, badges, badgeLoadout }
      }
    }
    const deck = validDeck(parsed.deck) ? parsed.deck : DEFAULT_DECK
    // Old saves stored only a three-step visualQuality. Map it onto a preset,
    // then fill any missing advanced options from that preset's baseline.
    const legacyVisual = (parsed as Partial<Settings> & { visualQuality?: unknown }).visualQuality
    const presetFallback: GraphicsPreset =
      legacyVisual === 'low' || legacyVisual === 'medium' || legacyVisual === 'high' ? legacyVisual : 'auto'
    const graphicsPreset = oneOf<GraphicsPreset>(
      parsed.graphicsPreset,
      ['auto', 'xbox', 'low', 'medium', 'high', 'ultra'],
      presetFallback,
    )
    const baseline = PRESET_VALUES[
      graphicsPreset === 'auto' || graphicsPreset === 'xbox'
        ? initialAutoQuality()
        : graphicsPreset
    ]
    const graphics: Pick<Settings, GraphicsField> = {
      graphicsPreset,
      frameLimit: oneOf<FrameLimit>(parsed.frameLimit, ['auto', 30, 60], 'auto'),
      renderScale: oneOf<RenderScale>(parsed.renderScale, [70, 85, 100], 100),
      uiScale: oneOf<UiScale>(parsed.uiScale, [90, 100, 110, 125], 100),
      displayMode: oneOf<DisplayMode>(parsed.displayMode, ['standard', 'console'], 'standard'),
      tvUiScale: oneOf<TvUiScale>(parsed.tvUiScale, [100, 110, 125, 150], 110),
      tvSafeArea: oneOf<TvSafeArea>(parsed.tvSafeArea, [0, 16, 24, 32, 48], 24),
      showFps: parsed.showFps === true,
      cardImageQuality: oneOf<CardImageQuality>(parsed.cardImageQuality, ['low', 'medium', 'hd'], 'hd'),
      cardMaterial: oneOf<CardMaterialQuality>(
        parsed.cardMaterial,
        ['off', 'basic', 'enhanced', 'full'],
        baseline.cardMaterial,
      ),
      holoFoil: typeof parsed.holoFoil === 'boolean' ? parsed.holoFoil : baseline.holoFoil,
      concertLighting: oneOf<LightingQuality>(
        parsed.concertLighting,
        ['low', 'medium', 'high'],
        baseline.concertLighting,
      ),
      shadows: oneOf<ShadowQuality>(parsed.shadows, ['off', 'low', 'high'], baseline.shadows),
      bloom: oneOf<BloomQuality>(parsed.bloom, ['off', 'low', 'high'], baseline.bloom),
      particles: oneOf<ParticleQuality>(parsed.particles, ['low', 'medium', 'high'], baseline.particles),
      backgroundMotion: oneOf<BackgroundMotion>(
        parsed.backgroundMotion,
        ['off', 'reduced', 'full'],
        baseline.backgroundMotion,
      ),
      audioVisualizers: parsed.audioVisualizers !== false,
      cardTilt: parsed.cardTilt !== false,
      reducedMotion: Boolean(parsed.reducedMotion),
      flashEffects: parsed.flashEffects !== false,
      vhsEffects: parsed.vhsEffects === true,
    }
    return {
      ...DEFAULT_SETTINGS,
      ...parsed,
      ...graphics,
      theme,
      selectedDirection,
      difficulty,
      deck,
      lineup: sanitizeLineup(parsed.lineup, deck),
      wins: typeof parsed.wins === 'number' ? parsed.wins : 0,
      losses: typeof parsed.losses === 'number' ? parsed.losses : 0,
      musicVolume: volume(parsed.musicVolume, DEFAULT_SETTINGS.musicVolume),
      sfxVolume: volume(parsed.sfxVolume, DEFAULT_SETTINGS.sfxVolume),
      announcer,
      team,
      artistProgress,
    }
  } catch {
    return DEFAULT_SETTINGS
  }
}

export function saveSettings(settings: Settings) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings))
  } catch {
    // Storage may be disabled; the show still goes on.
  }
}
