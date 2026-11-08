import calendarData from './festival-calendar.json'
import { ARTISTS, getArtist } from './roster'
import type { BattleObjectiveSpec, Venue } from './circuits'
import { DEFAULT_CIRCUIT_MODIFIERS, type CircuitRun } from './circuits'
import type { FestivalBattleRule, FestivalModifierId } from './battle'
import { containsPersonalArtist, validDeck } from './settings'
import { progressFor } from './moves'
import type { Artist, Crew, Difficulty, Genre, Settings } from './types'

export type FestivalType = 'single_player' | 'private_online'
export type FestivalStatus = 'live' | 'coming' | 'ended'
export type FestivalRequirementKind = 'genre' | 'crew' | 'era'
export type FestivalRoute = 'solo' | 'online'

export interface FestivalRequirement {
  kind: FestivalRequirementKind
  value: string
  count: number
  label: string
}

export interface FestivalStopStrategy {
  kind: 'genre' | 'crew' | 'balanced'
  value: string
  label: string
}

export interface FestivalStop {
  stop_id: string
  stop_name: string
  venue_room: string
  opponent: string
  strategy: FestivalStopStrategy
  difficulty: Difficulty
  dialogue: string
  objectives: string[]
  headliner: boolean
  reward_credits: number
  reward_buzz: number
}

export interface FestivalModifier {
  id: FestivalModifierId
  title: string
  rule: string
  detail: string
}

export interface FestivalVenueArt {
  id: string
  name: string
  room: string
  city: string
  tagline: string
  art: 'frequency' | 'velvet' | 'crate' | 'subwoofer' | 'chrome' | 'diamond'
  stage_slots: number
  accent: string
}

export interface FestivalPoster {
  motif: FestivalVenueArt['art']
  eyebrow: string
  stamp: string
  palette: string[]
}

export interface FestivalRewardTier {
  tier: 'gold' | 'platinum' | 'diamond'
  threshold: number
  name: string
  items: string[]
  credits: number
  buzz: number
  alt_artist_id?: string
}

export interface FestivalOnlinePoints {
  win: number
  loss: number
  feature: number
  bounty: number
  streak_bonus: number
  streak_threshold: number
  same_opponent_limit_per_day: number
}

export interface FestivalSeason {
  season_id: string
  name: string
  tagline: string
  starts_at: string
  ends_at: string
  rewards: FestivalRewardTier[]
  online: FestivalOnlinePoints
}

export interface FestivalEvent {
  event_id: string
  event_name: string
  event_type: FestivalType
  weekend: number
  start_time: string
  end_time: string
  tagline: string
  venue: FestivalVenueArt
  event_poster: FestivalPoster
  music_theme: string
  battle_theme: string
  eligible_tags: string[]
  setlist_requirements: FestivalRequirement[]
  special_modifiers: FestivalModifier
  progression_multiplier: number
  card_mastery_multiplier: number
  reward_multiplier: number
  circuit_rewards: {
    stop: number
    repeat: number
    headliner: number
    objective: number
  }
  objectives: BattleObjectiveSpec[]
  honors: string[]
  stops: FestivalStop[]
}

interface FestivalCalendarShape {
  season: FestivalSeason
  events: FestivalEvent[]
}

export const FESTIVAL_CALENDAR = calendarData as FestivalCalendarShape
export const FESTIVAL_SEASON = FESTIVAL_CALENDAR.season
export const FESTIVAL_EVENTS = FESTIVAL_CALENDAR.events
export const FESTIVAL_REWARDS = FESTIVAL_SEASON.rewards
export const FESTIVAL_ONLINE = FESTIVAL_SEASON.online
export const FESTIVAL_VERSION = 1

export const FESTIVAL_STORAGE_KEY = 'ciki.festival.v1'

export function festivalById(id: string | null | undefined): FestivalEvent | null {
  if (!id) return null
  return FESTIVAL_EVENTS.find((event) => event.event_id === id) ?? null
}

export function festivalStatus(event: FestivalEvent, now = Date.now()): FestivalStatus {
  const start = Date.parse(event.start_time)
  const end = Date.parse(event.end_time)
  if (!Number.isFinite(start) || !Number.isFinite(end)) return 'ended'
  if (now < start) return 'coming'
  if (now >= end) return 'ended'
  return 'live'
}

export function festivalStatusLabel(status: FestivalStatus): string {
  if (status === 'live') return 'LIVE NOW'
  if (status === 'coming') return 'COMING SOON'
  return 'EVENT ENDED'
}

export function festivalCountdown(event: FestivalEvent, now = Date.now()): string {
  const status = festivalStatus(event, now)
  if (status === 'live') return countdownTo(event.end_time, now, 'CLOSES IN')
  if (status === 'coming') return countdownTo(event.start_time, now, 'OPENS IN')
  return 'THE STAGE IS DARK'
}

function countdownTo(target: string, now: number, prefix: string): string {
  const diff = Math.max(0, Date.parse(target) - now)
  const totalSeconds = Math.floor(diff / 1000)
  const days = Math.floor(totalSeconds / 86400)
  const hours = Math.floor((totalSeconds % 86400) / 3600)
  const minutes = Math.floor((totalSeconds % 3600) / 60)
  const seconds = totalSeconds % 60
  const clock = [hours, minutes, seconds].map((value) => String(value).padStart(2, '0')).join(':')
  return `${prefix} ${days > 0 ? `${days}D ` : ''}${clock}`
}

export function festivalWindow(event: FestivalEvent): string {
  const start = new Date(event.start_time)
  const end = new Date(event.end_time)
  const format = (date: Date) =>
    new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      timeZone: 'UTC',
      hour12: true,
    }).format(date)
  return `${format(start)} — ${format(end)} UTC`
}

export function festivalWeekendLabel(weekend: number): string {
  return `WEEKEND 0${weekend}`
}

export function festivalRoute(event: FestivalEvent): FestivalRoute {
  return event.event_type === 'single_player' ? 'solo' : 'online'
}

export function festivalRouteLabel(event: FestivalEvent): string {
  return event.event_type === 'single_player' ? 'SOLO TOUR' : 'ONLINE FESTIVAL'
}

export function festivalPairings(): FestivalEvent[][] {
  const weekends = new Map<number, FestivalEvent[]>()
  for (const event of FESTIVAL_EVENTS) {
    weekends.set(event.weekend, [...(weekends.get(event.weekend) ?? []), event])
  }
  return [...weekends.entries()]
    .sort(([a], [b]) => a - b)
    .map(([, events]) =>
      events.sort((a, b) => {
        if (a.event_type === b.event_type) return a.start_time.localeCompare(b.start_time)
        return a.event_type === 'single_player' ? -1 : 1
      }),
    )
}

export function liveFestivals(now = Date.now()): FestivalEvent[] {
  return FESTIVAL_EVENTS.filter((event) => festivalStatus(event, now) === 'live')
}

export function nextFestival(now = Date.now()): FestivalEvent | null {
  return (
    [...FESTIVAL_EVENTS]
      .filter((event) => festivalStatus(event, now) !== 'ended')
      .sort((a, b) => Date.parse(a.start_time) - Date.parse(b.start_time))[0] ?? null
  )
}

export function festivalTagLabel(tag: string): string {
  if (tag.startsWith('genre:')) return tag.slice(6)
  if (tag.startsWith('crew:')) return tag.slice(5)
  return tag
}

export function eligibleArtistForRequirement(artist: Artist, requirement: FestivalRequirement): boolean {
  if (requirement.kind === 'genre') return artist.genre === requirement.value
  if (requirement.kind === 'crew') return artist.crew === requirement.value
  return artist.debut === requirement.value
}

export function requirementProgress(
  deck: string[],
  requirement: FestivalRequirement,
): { current: number; required: number; eligible: number } {
  const matching = deck.map((id) => getArtist(id)).filter((artist) => eligibleArtistForRequirement(artist, requirement))
  const eligible = ARTISTS.filter((artist) => eligibleArtistForRequirement(artist, requirement)).length
  return {
    current: Math.min(matching.length, requirement.count),
    required: requirement.count,
    eligible,
  }
}

export interface SetlistSynergy {
  requirements: Array<FestivalRequirement & { current: number; eligible: number; met: boolean }>
  activated: boolean
  metCount: number
  requiredCount: number
}

export function setlistSynergy(deck: string[], event: FestivalEvent): SetlistSynergy {
  const requirements = event.setlist_requirements.map((requirement) => {
    const progress = requirementProgress(deck, requirement)
    return {
      ...requirement,
      current: progress.current,
      eligible: progress.eligible,
      met: progress.current >= requirement.count,
    }
  })
  return {
    requirements,
    activated: requirements.every((requirement) => requirement.met),
    metCount: requirements.filter((requirement) => requirement.met).length,
    requiredCount: requirements.length,
  }
}

export function festivalDeckLegal(deck: string[], event: FestivalEvent): boolean {
  // The separate Festival & Tour Circuit is deliberately not an approved
  // personal-card mode. Only campaign and normal local CPU battles allow it.
  return validDeck(deck) && !containsPersonalArtist(deck) && setlistSynergy(deck, event).activated
}

/** A legal 26-card rival deck built only from real roster cards, with no more than 2 copies of a card. */
export function rivalDeckFor(_event: FestivalEvent, stop: FestivalStop): string[] {
  const strategy = stop.strategy
  const focused =
    strategy.kind === 'genre'
      ? ARTISTS.filter((artist) => artist.genre === (strategy.value as Genre))
      : strategy.kind === 'crew'
        ? ARTISTS.filter((artist) => artist.crew === (strategy.value as Crew))
        : []
  const seed = focused.length > 0 ? focused : ARTISTS.filter((_, index) => index % 2 === 0)
  const deck: string[] = []
  const counts = new Map<string, number>()

  const add = (artist: Artist) => {
    if (deck.length >= 26) return
    const count = counts.get(artist.id) ?? 0
    if (count >= 2) return
    deck.push(artist.id)
    counts.set(artist.id, count + 1)
  }

  // Seed the identity of the deck first, then fill from the rest of the roster.
  for (const artist of seed) add(artist)
  for (const artist of ARTISTS) add(artist)
  for (const artist of seed) add(artist)
  for (const artist of ARTISTS) add(artist)

  return deck.slice(0, 26)
}

export function rivalLineupFor(deck: string[]): string[] {
  return [...new Set(deck)].slice(0, 5)
}

export function venueFor(event: FestivalEvent): Venue {
  return {
    id: event.venue.id,
    name: event.venue.name,
    city: event.venue.city,
    tagline: event.venue.tagline,
    stageSlots: Math.max(3, Math.min(5, event.venue.stage_slots)),
    accent: event.venue.accent,
    circuits: ['headliner'],
  }
}

export interface FestivalRun {
  id: string
  event: FestivalEvent
  stop: FestivalStop
  venue: Venue
  difficulty: Difficulty
  objectives: BattleObjectiveSpec[]
  rivalDeck: string[]
  rivalLineup: string[]
  /** Solo festival CPU cards copy the highest level in the player's starting five. */
  rivalLevel: number
  synergy: SetlistSynergy
  official: boolean
  rule: FestivalBattleRule
  circuit: CircuitRun
}

/** The strongest card the player is bringing to the stage. */
export function festivalCpuLevel(settings: Settings): number {
  const starters = settings.lineup.length > 0 ? settings.lineup : settings.deck.slice(0, 5)
  return Math.max(1, ...starters.map((artistId) => progressFor(settings.artistProgress, artistId).level))
}

export function makeFestivalRun(
  event: FestivalEvent,
  stop: FestivalStop,
  settings: Settings,
  now = Date.now(),
  forcePreview = false,
): FestivalRun {
  const objectives = stop.objectives
    .map((id) => event.objectives.find((objective) => objective.id === id))
    .filter((objective): objective is BattleObjectiveSpec => Boolean(objective))
  const synergy = setlistSynergy(settings.deck, event)
  const status = festivalStatus(event, now)
  const official = !forcePreview && status === 'live'
  const rule = makeFestivalBattleRule(event, {
    synergyActive: synergy.activated,
    stopName: stop.stop_name,
    mode: 'solo',
  })
  const venue = venueFor(event)
  const rivalDeck = rivalDeckFor(event, stop)
  const circuit: CircuitRun = {
    id: `festival-${event.event_id}-${stop.stop_id}`,
    circuit: 'headliner',
    circuitName: event.event_name,
    venue,
    difficulty: stop.difficulty,
    stageSlots: venue.stageSlots,
    objectives,
    modifiers: { ...DEFAULT_CIRCUIT_MODIFIERS },
    purseCredits: stop.reward_credits,
    purseBuzz: stop.reward_buzz,
  }
  return {
    id: `festival-${event.event_id}-${stop.stop_id}-${Date.now()}`,
    event,
    stop,
    venue,
    difficulty: stop.difficulty,
    objectives,
    rivalDeck,
    rivalLineup: rivalLineupFor(rivalDeck),
    rivalLevel: festivalCpuLevel(settings),
    synergy,
    official,
    rule,
    circuit,
  }
}

export function makeOnlineFestivalRule(
  event: FestivalEvent,
  synergyActive = false,
): FestivalBattleRule {
  return makeFestivalBattleRule(event, {
    synergyActive,
    stopName: 'ONLINE FESTIVAL FINAL',
    mode: 'online',
  })
}

function makeFestivalBattleRule(
  event: FestivalEvent,
  options: { synergyActive: boolean; stopName: string; mode: 'solo' | 'online' },
): FestivalBattleRule {
  return {
    eventId: event.event_id,
    eventName: event.event_name,
    eventType: event.event_type,
    modifier: event.special_modifiers.id,
    title: event.special_modifiers.title,
    rule: event.special_modifiers.rule,
    detail: event.special_modifiers.detail,
    synergyActive: options.synergyActive,
    stopName: options.stopName,
    mode: options.mode,
    bassCrew: event.special_modifiers.id === 'subwoofer-bass' ? 'STATIC KINGS' : undefined,
  }
}

export function nextStopFor(event: FestivalEvent, progress: FestivalProgress): FestivalStop | null {
  return (
    event.stops.find((_, index) => {
      if (index === 0) return true
      const previous = event.stops[index - 1]
      return Boolean(previous && progress.stops[stopKey(event, previous)]?.clears)
    }) ?? null
  )
}

export function stopKey(event: FestivalEvent, stop: FestivalStop): string {
  return `${event.event_id}:${stop.stop_id}`
}

export interface StopProgress {
  clears: number
  attempts: number
  bestObjectives: number
  lastPlayedAt?: string
}

export function initialFestivalProgress(): FestivalProgress {
  return {
    version: FESTIVAL_VERSION,
    seasonId: FESTIVAL_SEASON.season_id,
    points: 0,
    stops: {},
    online: {
      wins: 0,
      losses: 0,
      streak: 0,
      bestStreak: 0,
      streakSetter: false,
      features: 0,
      matches: 0,
      opponentDays: {},
      bestStreakXp: 0,
    },
    claimedRewards: [],
  }
}

export interface FestivalOnlineProgress {
  wins: number
  losses: number
  streak: number
  bestStreak: number
  streakSetter: boolean
  features: number
  matches: number
  opponentDays: Record<string, string>
  bestStreakXp: number
}

export interface FestivalProgress {
  version: number
  seasonId: string
  points: number
  stops: Record<string, StopProgress>
  online: FestivalOnlineProgress
  claimedRewards: string[]
  lastResult?: FestivalRewardSummary
}

export function loadFestivalProgress(): FestivalProgress {
  const fallback = initialFestivalProgress()
  try {
    const raw = localStorage.getItem(FESTIVAL_STORAGE_KEY)
    if (!raw) return fallback
    const parsed = JSON.parse(raw) as Partial<FestivalProgress>
    if (parsed.seasonId !== FESTIVAL_SEASON.season_id) return fallback
    const points = typeof parsed.points === 'number' && Number.isFinite(parsed.points) ? Math.max(0, Math.round(parsed.points)) : 0
    const stops: Record<string, StopProgress> = {}
    if (parsed.stops && typeof parsed.stops === 'object') {
      for (const [key, value] of Object.entries(parsed.stops)) {
        if (!value || typeof value !== 'object') continue
        const entry = value as Partial<StopProgress>
        stops[key] = {
          clears: typeof entry.clears === 'number' ? Math.max(0, Math.round(entry.clears)) : 0,
          attempts: typeof entry.attempts === 'number' ? Math.max(0, Math.round(entry.attempts)) : 0,
          bestObjectives: typeof entry.bestObjectives === 'number' ? Math.max(0, Math.round(entry.bestObjectives)) : 0,
          lastPlayedAt: typeof entry.lastPlayedAt === 'string' ? entry.lastPlayedAt : undefined,
        }
      }
    }
    const online = parsed.online ?? fallback.online
    return {
      version: FESTIVAL_VERSION,
      seasonId: FESTIVAL_SEASON.season_id,
      points,
      stops,
      online: {
        wins: Math.max(0, Math.round(online.wins ?? 0)),
        losses: Math.max(0, Math.round(online.losses ?? 0)),
        streak: Math.max(0, Math.round(online.streak ?? 0)),
        bestStreak: Math.max(0, Math.round(online.bestStreak ?? 0)),
        streakSetter: Boolean(online.streakSetter),
        features: Math.max(0, Math.round(online.features ?? 0)),
        matches: Math.max(0, Math.round(online.matches ?? 0)),
        opponentDays:
          online.opponentDays && typeof online.opponentDays === 'object'
            ? Object.fromEntries(
                Object.entries(online.opponentDays).filter(
                  (entry): entry is [string, string] => typeof entry[0] === 'string' && typeof entry[1] === 'string',
                ),
              )
            : {},
        bestStreakXp: Math.max(0, Math.round(online.bestStreakXp ?? 0)),
      },
      claimedRewards: Array.isArray(parsed.claimedRewards)
        ? parsed.claimedRewards.filter((id): id is string => typeof id === 'string')
        : [],
    }
  } catch {
    return fallback
  }
}

export function saveFestivalProgress(progress: FestivalProgress): void {
  try {
    localStorage.setItem(FESTIVAL_STORAGE_KEY, JSON.stringify(progress))
  } catch {
    // Storage may be disabled; the tour still runs, but progress will not persist.
  }
}

export interface FestivalRewardSummary {
  eventId: string
  eventName: string
  stopName?: string
  outcome: 'first-clear' | 'repeat-clear' | 'loss' | 'preview' | 'online-win' | 'online-loss' | 'online-draw' | 'blocked'
  baseXp: number
  multiplier: number
  finalXp: number
  cardMasteryBonus: number
  circuitPoints: number
  objectivePoints: number
  featurePoints: number
  streakBonus: number
  bountyPoints: number
  totalPoints: number
  totalAfter: number
  firstClear: boolean
  official: boolean
  credits: number
  buzz: number
  rewardsUnlocked: FestivalRewardTier[]
  nextTier: FestivalRewardTier | null
  message?: string
}

export function baseXpFor(plays: Record<string, number>, won: boolean): number {
  const rounds = Object.values(plays).reduce((sum, count) => sum + (Number.isFinite(count) ? count : 0), 0)
  return rounds * 30 + (won ? 20 : 0)
}

export interface SoloSettlementInput {
  event: FestivalEvent
  stop: FestivalStop
  progress: FestivalProgress
  won: boolean
  plays: Record<string, number>
  objectives: Array<BattleObjectiveSpec & { done: boolean }>
  synergyActive: boolean
  official: boolean
  now?: number
}

export function settleSoloFestival(input: SoloSettlementInput): {
  progress: FestivalProgress
  summary: FestivalRewardSummary
} {
  const { event, stop, progress, won, plays, objectives, synergyActive, official } = input
  const now = input.now ?? Date.now()
  const live = official && festivalStatus(event, now) === 'live'
  const key = stopKey(event, stop)
  const previous = progress.stops[key]
  const firstClear = live && won && !previous?.clears
  const completedObjectives = objectives.filter((objective) => objective.done).length
  const objectivePoints = live && won && firstClear ? completedObjectives * event.circuit_rewards.objective : 0
  const pointAward = live && won
    ? firstClear
      ? stop.headliner
        ? event.circuit_rewards.headliner
        : event.circuit_rewards.stop
      : event.circuit_rewards.repeat
    : 0
  const nextProgress: FestivalProgress = {
    ...progress,
    stops: {
      ...progress.stops,
      [key]: {
        clears: (previous?.clears ?? 0) + (won && live ? 1 : 0),
        attempts: (previous?.attempts ?? 0) + 1,
        bestObjectives: Math.max(previous?.bestObjectives ?? 0, completedObjectives),
        lastPlayedAt: new Date(now).toISOString(),
      },
    },
    points: progress.points + pointAward + objectivePoints,
  }
  const baseXp = baseXpFor(plays, won)
  const multiplier = synergyActive ? event.progression_multiplier : 1
  const credits = live && won
    ? Math.round(stop.reward_credits * (firstClear ? event.reward_multiplier : 0.35))
    : 0
  const buzz = live && won
    ? Math.round(stop.reward_buzz * (firstClear ? event.reward_multiplier : 0.35))
    : 0
  const summary: FestivalRewardSummary = {
    eventId: event.event_id,
    eventName: event.event_name,
    stopName: stop.stop_name,
    outcome: !live ? 'preview' : won ? (firstClear ? 'first-clear' : 'repeat-clear') : 'loss',
    baseXp,
    multiplier,
    finalXp: Math.round(baseXp * multiplier),
    cardMasteryBonus: 0,
    circuitPoints: pointAward,
    objectivePoints,
    featurePoints: 0,
    streakBonus: 0,
    bountyPoints: 0,
    totalPoints: pointAward + objectivePoints,
    totalAfter: nextProgress.points,
    firstClear,
    official: live,
    credits,
    buzz,
    rewardsUnlocked: rewardsUnlocked(progress.points, nextProgress.points),
    nextTier: nextRewardTier(nextProgress.points),
    message: !official
      ? 'PREVIEW SET · CIRCUIT POINTS ARE ONLY AWARDED DURING THE LIVE WINDOW'
      : undefined,
  }
  nextProgress.lastResult = summary
  return { progress: nextProgress, summary }
}

export interface OnlineSettlementInput {
  event: FestivalEvent
  progress: FestivalProgress
  won: boolean
  draw: boolean
  completed: boolean
  opponentId: string | null
  opponentStreak: number
  features: number
  plays: Record<string, number>
  synergyActive: boolean
  now?: number
}

export function settleOnlineFestival(input: OnlineSettlementInput): {
  progress: FestivalProgress
  summary: FestivalRewardSummary
} {
  const now = input.now ?? Date.now()
  const live = festivalStatus(input.event, now) === 'live'
  const baseXp = baseXpFor(input.plays, input.won)
  const multiplier = input.synergyActive ? input.event.progression_multiplier : 1
  const opponentId = input.opponentId?.trim() || 'unknown'
  const day = new Date(now).toISOString().slice(0, 10)
  const farmKey = `${input.event.event_id}:${day}:${opponentId}`
  const alreadyPlayed = Boolean(input.progress.online.opponentDays[farmKey])
  const base = {
    eventId: input.event.event_id,
    eventName: input.event.event_name,
    stopName: 'ONLINE FESTIVAL FINAL',
    baseXp,
    multiplier,
    finalXp: Math.round(baseXp * multiplier),
    cardMasteryBonus: 0,
    firstClear: false,
    official: live,
    credits: 0,
    buzz: 0,
    rewardsUnlocked: [] as FestivalRewardTier[],
    nextTier: nextRewardTier(input.progress.points),
  }

  if (!live || !input.completed) {
    const summary: FestivalRewardSummary = {
      ...base,
      outcome: 'blocked',
      circuitPoints: 0,
      objectivePoints: 0,
      featurePoints: 0,
      streakBonus: 0,
      bountyPoints: 0,
      totalPoints: 0,
      totalAfter: input.progress.points,
      message: !live ? 'FESTIVAL IS NOT LIVE · NO OFFICIAL POINTS' : 'MATCH WAS NOT COMPLETED · NO OFFICIAL POINTS',
    }
    return { progress: input.progress, summary }
  }

  if (input.draw) {
    const summary: FestivalRewardSummary = {
      ...base,
      outcome: 'online-draw',
      circuitPoints: 0,
      objectivePoints: 0,
      featurePoints: 0,
      streakBonus: 0,
      bountyPoints: 0,
      totalPoints: 0,
      totalAfter: input.progress.points,
      message: 'DRAW · STREAK HELD · NO CIRCUIT POINTS',
    }
    return { progress: input.progress, summary }
  }

  if (alreadyPlayed) {
    const summary: FestivalRewardSummary = {
      ...base,
      outcome: 'blocked',
      circuitPoints: 0,
      objectivePoints: 0,
      featurePoints: 0,
      streakBonus: 0,
      bountyPoints: 0,
      totalPoints: 0,
      totalAfter: input.progress.points,
      message: 'REMATCH LIMIT · THIS OPPONENT ALREADY COUNTED TODAY',
    }
    return { progress: input.progress, summary }
  }

  const online = input.progress.online
  const won = input.won
  const winBase = won ? FESTIVAL_ONLINE.win : FESTIVAL_ONLINE.loss
  const featurePoints = won && input.features > 0 ? FESTIVAL_ONLINE.feature : 0
  const streakBonus = won
    ? Math.min(FESTIVAL_ONLINE.streak_threshold, online.streak) * FESTIVAL_ONLINE.streak_bonus
    : 0
  const bountyPoints =
    won && input.opponentStreak >= FESTIVAL_ONLINE.streak_threshold ? FESTIVAL_ONLINE.bounty : 0
  const totalPoints = winBase + featurePoints + streakBonus + bountyPoints
  const nextStreak = won ? online.streak + 1 : 0
  const nextProgress: FestivalProgress = {
    ...input.progress,
    points: input.progress.points + totalPoints,
    online: {
      ...online,
      wins: online.wins + (won ? 1 : 0),
      losses: online.losses + (won ? 0 : 1),
      streak: nextStreak,
      bestStreak: Math.max(online.bestStreak, nextStreak),
      streakSetter: nextStreak >= FESTIVAL_ONLINE.streak_threshold,
      features: online.features + (input.features > 0 ? 1 : 0),
      matches: online.matches + 1,
      opponentDays: { ...online.opponentDays, [farmKey]: new Date(now).toISOString() },
      bestStreakXp: Math.max(online.bestStreakXp, nextStreak >= FESTIVAL_ONLINE.streak_threshold ? nextStreak : 0),
    },
  }
  const summary: FestivalRewardSummary = {
    ...base,
    outcome: won ? 'online-win' : 'online-loss',
    circuitPoints: winBase,
    objectivePoints: 0,
    featurePoints,
    streakBonus,
    bountyPoints,
    totalPoints,
    totalAfter: nextProgress.points,
    firstClear: won,
    rewardsUnlocked: rewardsUnlocked(input.progress.points, nextProgress.points),
    nextTier: nextRewardTier(nextProgress.points),
    message: bountyPoints > 0 ? 'STREAK SETTER BOUNTY CLAIMED' : undefined,
  }
  nextProgress.lastResult = summary
  return { progress: nextProgress, summary }
}

function rewardsUnlocked(before: number, after: number): FestivalRewardTier[] {
  return FESTIVAL_REWARDS.filter((reward) => before < reward.threshold && after >= reward.threshold)
}

export function nextRewardTier(points: number): FestivalRewardTier | null {
  return FESTIVAL_REWARDS.find((reward) => points < reward.threshold) ?? null
}

export function festivalRank(points: number): string {
  if (points >= 1600) return 'DIAMOND'
  if (points >= 800) return 'PLATINUM'
  if (points >= 300) return 'GOLD'
  return 'STREET TEAM'
}

export function festivalRankProgress(points: number): { percent: number; floor: number; ceiling: number } {
  if (points >= 1600) return { percent: 100, floor: 1600, ceiling: 1600 }
  if (points >= 800) return { percent: Math.round(((points - 800) / 800) * 100), floor: 800, ceiling: 1600 }
  if (points >= 300) return { percent: Math.round(((points - 300) / 500) * 100), floor: 300, ceiling: 800 }
  return { percent: Math.round((points / 300) * 100), floor: 0, ceiling: 300 }
}

export function claimFestivalReward(
  progress: FestivalProgress,
  tier: FestivalRewardTier['tier'],
): { progress: FestivalProgress; reward: FestivalRewardTier } | null {
  const reward = FESTIVAL_REWARDS.find((item) => item.tier === tier)
  if (!reward) return null
  if (progress.points < reward.threshold) return null
  if (progress.claimedRewards.includes(reward.tier)) return null
  return {
    progress: {
      ...progress,
      claimedRewards: [...progress.claimedRewards, reward.tier],
    },
    reward,
  }
}

export function festivalClaimed(progress: FestivalProgress, tier: FestivalRewardTier['tier']): boolean {
  return progress.claimedRewards.includes(tier)
}

export function onlineSettlerActive(progress: FestivalProgress): boolean {
  return progress.online.streak >= FESTIVAL_ONLINE.streak_threshold
}

export function festivalDeckTagSummary(event: FestivalEvent): string {
  return event.setlist_requirements.map((requirement) => `${requirement.count} ${requirement.label}`).join(' · ')
}

export function festivalStopClears(progress: FestivalProgress, event: FestivalEvent): number {
  return event.stops.filter((stop) => progress.stops[stopKey(event, stop)]?.clears).length
}
