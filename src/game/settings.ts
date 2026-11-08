import type { AnnouncerSettings, ArtistProgress, Difficulty, Settings, TeamProgress, ThemeId } from './types'
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

export const DEFAULT_SETTINGS: Settings = {
  theme: 'b',
  difficulty: 'HEADLINER',
  deck: DEFAULT_DECK,
  lineup: DEFAULT_DECK.slice(0, LINEUP_SIZE),
  wins: 0,
  losses: 0,
  selectedDirection: 'b',
  reducedMotion: false,
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
    return {
      ...DEFAULT_SETTINGS,
      ...parsed,
      theme,
      selectedDirection,
      difficulty,
      deck,
      lineup: sanitizeLineup(parsed.lineup, deck),
      wins: typeof parsed.wins === 'number' ? parsed.wins : 0,
      losses: typeof parsed.losses === 'number' ? parsed.losses : 0,
      reducedMotion: Boolean(parsed.reducedMotion),
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
