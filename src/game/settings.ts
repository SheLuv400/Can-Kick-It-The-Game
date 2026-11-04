import type { ArtistProgress, Difficulty, Settings, TeamProgress, ThemeId } from './types'
import { ARTISTS, CORE_ARTIST_COUNT } from './roster'

const STORAGE_KEY = 'ciki.settings.v1'

export const DEFAULT_DECK: string[] = ARTISTS.slice(0, CORE_ARTIST_COUNT).map((artist) => artist.id)

export const DEFAULT_SETTINGS: Settings = {
  theme: 'b',
  difficulty: 'HEADLINER',
  deck: DEFAULT_DECK,
  wins: 0,
  losses: 0,
  selectedDirection: 'b',
  reducedMotion: false,
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
  const known = new Set(ARTISTS.map((artist) => artist.id))
  const counts = new Map<string, number>()
  for (const id of deck) {
    if (typeof id !== 'string' || !known.has(id)) return false
    const count = (counts.get(id) ?? 0) + 1
    if (count > 2) return false
    counts.set(id, count)
  }
  return true
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
        const xp = typeof entry.xp === 'number' && Number.isFinite(entry.xp) ? Math.max(0, Math.round(entry.xp)) : 0
        const level =
          typeof entry.level === 'number' && Number.isFinite(entry.level)
            ? Math.min(5, Math.max(1, Math.round(entry.level)))
            : 1
        const loadout = Array.isArray(entry.loadout)
          ? entry.loadout.filter((id): id is string => typeof id === 'string').slice(0, 3)
          : undefined
        artistProgress[artistId] = { xp, level, loadout }
      }
    }
    return {
      ...DEFAULT_SETTINGS,
      ...parsed,
      theme,
      selectedDirection,
      difficulty,
      deck: validDeck(parsed.deck) ? parsed.deck : DEFAULT_DECK,
      wins: typeof parsed.wins === 'number' ? parsed.wins : 0,
      losses: typeof parsed.losses === 'number' ? parsed.losses : 0,
      reducedMotion: Boolean(parsed.reducedMotion),
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
