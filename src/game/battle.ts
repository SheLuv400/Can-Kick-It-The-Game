import type { ArtistProgress, Crew, Difficulty, Element, Genre, Move, OnlineMode, StatusKind } from './types'
import type { AnnouncerEventName, AnnouncerSide } from './announcer'
import { ARTISTS, getArtist } from './roster'
import { DEFAULT_DECK } from './settings'
import { isPersonalArtistId } from './personal-id'
import {
  CRATE_HAND_LIMIT,
  canStackCrate,
  crateCard,
  createCrateDeck,
  drawWeightedCrate,
  type CrateDefinition,
} from './crate'
import { equippedBadgeTiers, type BadgeId } from './badges'
import {
  battleStatsFor,
  MAX_CARD_LEVEL,
  defaultLoadout,
  loadoutFor,
  moveById,
  progressFor,
  SPECIAL_CHARGE_MAX,
  isAttackMove,
  moveEndsTurn,
  moveHypeCost,
} from './moves'
import {
  DEFAULT_CIRCUIT_MODIFIERS,
  MIDNIGHT_GARDEN,
  type BattleObjectiveSpec,
  type CircuitId,
  type CircuitModifiers,
  type ObjectiveKind,
  type Venue,
} from './circuits'
import {
  houseRulesValidationError,
  type HouseModifierId,
  type HouseRulesConfig,
} from './house-rules'

export interface StatusState {
  kind: StatusKind
  turns: number
  value: number
}

export interface StageCard {
  uid: string
  artistId: string
  encore: boolean
  level: number
  hp: number
  maxHp: number
  shield: number
  statuses: StatusState[]
  actedThisTurn: boolean
  enteredRound: number
  untouchableUntil: number
  nextAttackBonus: number
  defenseBonus: number
  guardRound: number
  entranceUsed: boolean
  /** COMEBACK ARTIST damage waiting for the first hit after a Backstage recall. */
  comebackBonus: number
  comebackUsed: boolean
  moves: string[]
  /** Built by taking actions; spent on the artist's signature special. */
  specialCharge: number
  specialUsed: boolean
}

export interface CardPerformance {
  artistId: string
  uses: number
  damage: number
  healing: number
  prevented: number
  kos: number
  assists: number
  elementalUses: number
  attacks: number
  encores: number
  features: number
}

export interface BackstageCard {
  uid: string
  artistId: string
  encore: boolean
  level: number
  /** HP at the moment the artist was cut or defeated. */
  hp: number
  maxHp: number
  moves: string[]
}

export interface CrateHandCard {
  uid: string
  cardId: string
  drawnRound: number
  /** Duplicate copies merge into one card with a stack multiplier. */
  stacks?: number
}

export type FestivalModifierId =
  | 'blacktop-first-hiphop'
  | 'velvet-healing'
  | 'crate-city-revival'
  | 'subwoofer-bass'
  | 'chrome-feature'
  | 'diamond-genre-chain'

export interface FestivalBattleRule {
  eventId: string
  eventName: string
  eventType: 'single_player' | 'private_online'
  modifier: FestivalModifierId
  title: string
  rule: string
  detail: string
  synergyActive: boolean
  stopName: string
  mode: 'solo' | 'online'
  bassCrew?: Crew
}

export interface SideState {
  name: string
  crowd: number
  maxCrowd: number
  hype: number
  shield: number
  hand: string[]
  deck: string[]
  discard: string[]
  stage: StageCard[]
  backstage: BackstageCard[]
  featureUsed: boolean
  encoreCharges: number
  counters: number
  played: number
  dealt: number
  features: number
  encores: number
  crate: string[]
  specialHand: CrateHandCard[]
  specialDiscard: string[]
  revives: number
  /** Personal career artist rest heals used this battle. */
  personalRests: number
  crateDraws: number
  koes: number
  skipNextAction: number
  /** Consecutive damaging moves in the current turn. */
  combo: number
  bestCombo: number
  movesUsed: number
  /** Damaging actions used this turn. Attack cards are capped at three. */
  attacksThisTurn: number
  /** Total attacks used across the whole match, for the player stat sheet. */
  attacksUsed: number
  /** Per-card contributions used to pick the match MVP. */
  cardStats: Record<string, CardPerformance>
  /** Festival-only per-side tracking. */
  festivalFirstHipHopUsed: boolean
  festivalRevivalHypeUsed: boolean
  festivalLastAttackGenre: Genre | null
}

export type LogTone = 'neutral' | 'good' | 'bad' | 'gold'

export interface LogEntry {
  id: number
  round: number
  text: string
  tone: LogTone
}

export type CinematicKind =
  | 'era'
  | 'encore'
  | 'feature'
  | 'rival-feature'
  | 'rival-encore'
  | 'victory'
  | 'defeat'
  | 'curfew'

export interface Cinematic {
  id: number
  kind: CinematicKind
  title: string
  subtitle: string
  detail?: string
  value?: number
  artistIds?: string[]
  crew?: Crew
}

export interface CounterPrompt {
  id: number
  damage: number
  artistId: string
  source: string
  targetUid: string | null
  attackerUid: string | null
  canRewind: boolean
  defender: 'player' | 'rival'
}

export interface LastCrateDraw {
  side: 'player' | 'rival'
  card: CrateHandCard
  stacked?: boolean
}

export interface LastDefeat {
  side: 'player' | 'rival'
  artistId: string
  nonce: number
}

export interface LastMove {
  side: 'player' | 'rival'
  artistId: string
  moveId: string
  name: string
  element: Element | null
  nonce: number
}

export interface BattleObjective extends BattleObjectiveSpec {
  progress: number
  done: boolean
}

export interface LastObjective {
  id: string
  title: string
  nonce: number
}

export interface AnnouncerCueSignal {
  id: number
  event: AnnouncerEventName
  side?: AnnouncerSide
}

export interface HouseRuleEvent {
  id: number
  modifierId: HouseModifierId
  title: string
  detail: string
  side?: 'player' | 'rival'
  nonce: number
}

export type BattleTeam = 'player' | 'rival'

export interface BattlePartySeat {
  seat: string
  name: string
  team: BattleTeam
}

/** Metadata for the host-authoritative multi-player rooms. */
export interface BattleParty {
  format: '2v2' | 'triple-threat' | 'fatal-4'
  seats: BattlePartySeat[]
  order: string[]
  activeSeat: string | null
  /** Free-for-all: the rival the active player is currently facing. */
  targetSeat?: string | null
  controllers: Record<BattleTeam, string>
  /**
   * Every seat's own deck, hand, Hype, stage, Crate, Backstage and Encore state.
   * In 2v2 only the two seats currently on stage live in `player`/`rival`.
   * In Triple Threat/Fatal 4 the active player is `player`, their chosen
   * target is `rival`, and every other seat waits here untouched. Host-only.
   */
  sides?: Record<string, SideState>
  /** Index into `order` for the seat taking the current turn. */
  turnIndex?: number
  /** Set by the engine when a free-for-all turn should rotate. */
  turnEnded?: boolean
  /** Target changes are locked after the first action of a turn. */
  targetLocked?: boolean
  /** Free-for-all seats that have been booed off stage. */
  eliminated?: string[]
  /** Free-for-all seats that left the room instead of being crowded out. */
  departed?: string[]
  /** Free-for-all winner, projected per client. */
  winnerSeat?: string | null
}

export interface HouseRuleRuntime {
  /** Monotonic turn counter, incremented by beginTurnFor. */
  turn: number
  goldenHooksTurn: number
  sharpPenTurn: number
  crateFrenzyUsed: { player: boolean; rival: boolean }
  backstageBounceUsed: { player: boolean; rival: boolean }
  encoreSpotlightUsed: { player: boolean; rival: boolean }
  lastVerseNotified: boolean
}

export interface BattleState {
  phase: 'player' | 'rival' | 'over'
  round: number
  era: 1 | 2 | 3
  player: SideState
  rival: SideState
  log: LogEntry[]
  cinematics: Cinematic[]
  counterPrompt: CounterPrompt | null
  winner: 'player' | 'rival' | 'draw' | null
  /** Free-for-all winner in canonical seat order. */
  winnerSeat?: string | null
  difficulty: Difficulty
  rivalActions: number
  tick: number
  idSeq: number
  lastHit: { side: 'player' | 'rival'; value: number; nonce: number } | null
  lastCrateDraw: LastCrateDraw | null
  lastDefeat: LastDefeat | null
  lastMove: LastMove | null
  announcerCues: AnnouncerCueSignal[]
  playerProgress: Record<string, ArtistProgress>
  rivalProgress: Record<string, ArtistProgress>
  venue: Venue
  circuit: CircuitId | null
  stageSlots: number
  modifiers: CircuitModifiers
  objectives: BattleObjective[]
  lastObjective: LastObjective | null
  /** True when both sides are driven by human players over the network. */
  online?: boolean
  onlineMode?: OnlineMode
  /** The official festival rules, shared by both sides. */
  festival?: FestivalBattleRule
  /** The locked DJ's House Rules configuration for this room. */
  houseRules?: HouseRulesConfig
  /** Four-player tag-team room metadata; absent for standard 1v1. */
  party?: BattleParty
  houseRuleRuntime?: HouseRuleRuntime
  lastHouseRuleEvent?: HouseRuleEvent | null
  /** Local-only advice spins. Always zero in online matches. */
  advisorCharges: number
  /** Cards the CPU uses when no rival progress map is supplied. */
  rivalLevel: number
}

export interface BattleConfig {
  deck: string[]
  difficulty: Difficulty
  /** Five cards guaranteed in the opening hand, in lineup order. */
  lineup?: string[]
  progress?: Record<string, ArtistProgress>
  /** Online duels supply the opponent's real deck, name and progression. */
  rivalDeck?: string[]
  rivalLineup?: string[]
  rivalProgress?: Record<string, ArtistProgress>
  /** Festival events match the CPU's card levels to the player's starting five. */
  rivalLevel?: number
  playerName?: string
  rivalName?: string
  playerCrowd?: number
  rivalCrowd?: number
  venue?: Venue
  circuit?: CircuitId | null
  stageSlots?: number
  modifiers?: Partial<CircuitModifiers>
  objectives?: BattleObjectiveSpec[]
  festival?: FestivalBattleRule
  online?: boolean
  onlineMode?: OnlineMode
  houseRules?: HouseRulesConfig
}

export const HYPE_CAP = 24
export const STAGE_SLOTS = 5
export const DECK_SLOTS = 26
export const HAND_SIZE = 5
export const CURFEW_ROUND = 12
/** Two attackers per side share one Crowd; team pressure keeps 2v2 decisive. */
export const TEAM_CROWD_PRESSURE = 1.5
export const MAX_ATTACKS_PER_TURN = 3
export const CRATE_HYPE_COST = 2
export const ADVISOR_MAX_CHARGES = 2

/** A cut returns tempo based on the artist's summon cost. */
export function cutHypeRefund(cost: number): number {
  return Math.max(1, 1 + Math.floor((Math.max(1, cost) - 1) / 3))
}

/** Backstage recalls are deliberately expensive: 10–15 Hype by strength and level. */
export function backstageRecallCost(card: BackstageCard): number {
  const artist = getArtist(card.artistId)
  const strength = Math.max(0, artist.cost - 1) + Math.max(0, artist.bars - 5) / 3
  return Math.max(8, Math.min(15, Math.round(10 + strength + Math.max(0, card.level - 1) / 2)))
}

/** Stronger signings pay a little Hype back when they hit the stage. */
export function starPowerHype(artist: { cost: number; bars: number }, level: number): number {
  if (artist.cost < 4 && artist.bars < 8) return 0
  return artist.cost >= 4 && level >= 5 ? 2 : 1
}

// Tuned against the real damage scale: basic moves land around 3–5, heavy moves 6+.
const HEAVY_ATTACK_DAMAGE = 6
const BLOCK_ABSORB_DAMAGE = 5
const LOW_HP_RATIO = 0.3
const SIGNIFICANT_HEAL = 3
const ELEMENT_ANNOUNCER_EVENTS: Partial<Record<Element, AnnouncerEventName>> = {
  FIRE: 'fire',
  POISON: 'poison',
  ICE: 'ice',
  ELECTRICITY: 'electric',
}

const DIFFICULTY_META: Record<
  Difficulty,
  { crowd: number; regen: number; actions: number; interrupt: number; label: string; level: number }
> = {
  OPENING: { crowd: 64, regen: 3, actions: 2, interrupt: 0.34, label: 'OPENING ACT', level: 1 },
  HEADLINER: { crowd: 72, regen: 3, actions: 3, interrupt: 0.5, label: 'HEADLINER', level: 2 },
  LEGEND: { crowd: 78, regen: 3, actions: 3, interrupt: 0.66, label: 'LEGEND', level: 3 },
}

export function eraName(era: 1 | 2 | 3): string {
  return era === 1 ? 'OPENING ACT' : era === 2 ? 'MAIN STAGE' : 'HEADLINE'
}

export function eraBonus(era: 1 | 2 | 3): number {
  return era - 1
}

function shuffle<T>(items: T[]): T[] {
  const out = [...items]
  for (let i = out.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[out[i], out[j]] = [out[j], out[i]]
  }
  return out
}

function other(side: 'player' | 'rival'): 'player' | 'rival' {
  return side === 'player' ? 'rival' : 'player'
}

function makeStageCard(
  uid: string,
  artistId: string,
  level: number,
  moves: string[],
  round = 1,
  badges: Partial<Record<BadgeId, number>> = {},
): StageCard {
  const artist = getArtist(artistId)
  const stats = battleStatsFor(artist, level)
  const hpBonus = badges.headliner ?? 0
  return {
    uid,
    artistId,
    encore: false,
    level,
    hp: stats.hp + hpBonus,
    maxHp: stats.hp + hpBonus,
    shield: 0,
    statuses: [],
    actedThisTurn: false,
    enteredRound: round,
    untouchableUntil: 0,
    nextAttackBonus: 0,
    defenseBonus: badges.guardian ?? 0,
    guardRound: 0,
    entranceUsed: false,
    comebackBonus: 0,
    comebackUsed: false,
    moves,
    specialCharge: Math.min(SPECIAL_CHARGE_MAX, badges.encore ?? 0),
    specialUsed: false,
  }
}

function badgeTiersFor(
  state: BattleState,
  side: 'player' | 'rival',
  artistId: string,
): Partial<Record<BadgeId, number>> {
  if (isCasualOnline(state)) return {}
  return equippedBadgeTiers(
    side === 'player' ? state.playerProgress : state.rivalProgress,
    artistId,
  )
}

function gainSpecialCharge(card: StageCard, amount = 1) {
  if (card.specialUsed) return
  card.specialCharge = Math.min(SPECIAL_CHARGE_MAX, card.specialCharge + amount)
}

function playerLevel(progress: Record<string, ArtistProgress> | undefined, artistId: string) {
  return progressFor(progress, artistId).level
}

function playerLoadout(progress: Record<string, ArtistProgress> | undefined, artistId: string) {
  return loadoutFor(progress, artistId)
}

function isCasualOnline(state: BattleState): boolean {
  return state.online === true && state.onlineMode === 'casual'
}

function hasHouseModifier(state: BattleState | undefined, id: HouseModifierId): boolean {
  return Boolean(state?.houseRules?.modifiers.includes(id))
}

function pushHouseRuleEvent(
  state: BattleState,
  modifierId: HouseModifierId,
  title: string,
  detail: string,
  side?: 'player' | 'rival',
) {
  state.lastHouseRuleEvent = {
    id: state.idSeq++,
    modifierId,
    title,
    detail,
    side,
    nonce: state.idSeq++,
  }
}

/** LAST VERSE STANDING applies to the final two full Curfew rounds. */
function houseRuleCrowdAmount(state: BattleState, amount: number): number {
  if (amount <= 0 || !hasHouseModifier(state, 'last-verse-standing')) return amount
  if (state.round < CURFEW_ROUND - 1) return amount
  const runtime = state.houseRuleRuntime
  if (runtime && !runtime.lastVerseNotified) {
    runtime.lastVerseNotified = true
    pushHouseRuleEvent(
      state,
      'last-verse-standing',
      'LAST VERSE STANDING',
      'Final rounds · direct Crowd damage +10%.',
    )
  }
  return Math.max(1, Math.round(amount * 1.1))
}

function houseRuleHealCard(
  state: BattleState,
  side: 'player' | 'rival',
  target: StageCard,
  base: number,
): { restored: number; amount: number } {
  const runtime = state.houseRuleRuntime
  const golden = hasHouseModifier(state, 'golden-hooks') && runtime && runtime.goldenHooksTurn !== runtime.turn
  const amount = golden ? Math.max(1, Math.ceil(base * 1.15)) : base
  const before = target.hp
  target.hp = Math.min(target.maxHp, target.hp + amount)
  const restored = target.hp - before
  if (golden && runtime && restored > 0) {
    runtime.goldenHooksTurn = runtime.turn
    pushHouseRuleEvent(
      state,
      'golden-hooks',
      'GOLDEN HOOKS BONUS!',
      `+${Math.max(0, amount - base)} bonus healing.`,
      side,
    )
  }
  return { restored, amount }
}

function applyStartOfTurnHouseRules(state: BattleState, side: 'player' | 'rival') {
  const runtime = state.houseRuleRuntime
  if (!state.houseRules || !runtime) return
  const actor = sideOf(state, side)
  if (hasHouseModifier(state, 'hype-surge')) {
    const before = actor.hype
    actor.hype = Math.min(HYPE_CAP, actor.hype + 1)
    if (actor.hype > before) {
      pushHouseRuleEvent(
        state,
        'hype-surge',
        'HYPE SURGE ACTIVATED!',
        `+${actor.hype - before} Hype at the start of the turn.`,
        side,
      )
    }
  }
  if (hasHouseModifier(state, 'crate-frenzy') && !runtime.crateFrenzyUsed[side]) {
    runtime.crateFrenzyUsed[side] = true
    drawCrate(state, side, { free: true })
  }
}

function makeSide(
  name: string,
  deck: string[],
  crowd: number,
  lineup?: string[],
  counters = 2,
): SideState {
  const remaining = [...deck]
  const opening: string[] = []
  for (const artistId of lineup ?? []) {
    if (opening.length >= HAND_SIZE) break
    const index = remaining.indexOf(artistId)
    if (index === -1) continue
    opening.push(artistId)
    remaining.splice(index, 1)
  }
  const shuffled = shuffle(remaining)
  opening.push(...shuffled.splice(0, Math.max(0, HAND_SIZE - opening.length)))
  return {
    name,
    crowd,
    maxCrowd: crowd,
    hype: 8,
    shield: 0,
    hand: opening,
    deck: shuffled,
    discard: [],
    stage: [],
    backstage: [],
    featureUsed: false,
    encoreCharges: 1,
    counters,
    played: 0,
    dealt: 0,
    features: 0,
    encores: 0,
    crate: createCrateDeck(),
    specialHand: [],
    specialDiscard: [],
    revives: 0,
    personalRests: 0,
    crateDraws: 0,
    koes: 0,
    skipNextAction: 0,
    combo: 0,
    bestCombo: 0,
    movesUsed: 0,
    attacksThisTurn: 0,
    attacksUsed: 0,
    cardStats: {},
    festivalFirstHipHopUsed: false,
    festivalRevivalHypeUsed: false,
    festivalLastAttackGenre: null,
  }
}

export function createBattle(config: BattleConfig): BattleState {
  const meta = DIFFICULTY_META[config.difficulty]
  const rivalLevel = Math.max(
    1,
    Math.min(MAX_CARD_LEVEL, Math.round(config.rivalLevel ?? meta.level)),
  )
  const venue = config.venue ?? MIDNIGHT_GARDEN
  const modifiers: CircuitModifiers = { ...DEFAULT_CIRCUIT_MODIFIERS, ...config.modifiers }
  const stageSlots = Math.max(3, Math.min(5, config.stageSlots ?? venue.stageSlots))
  const houseRules =
    config.houseRules && !houseRulesValidationError(config.houseRules)
      ? config.houseRules
      : undefined
  const crowdMultiplier = houseRules?.modifiers.includes('big-stage') ? 1.25 : 1
  if (config.online && (config.deck.some(isPersonalArtistId) || (config.rivalDeck ?? []).some(isPersonalArtistId))) {
    throw new Error('Personal Artist Cards are local-only and cannot enter an online battle.')
  }
  const playerDeck = config.deck.length === DECK_SLOTS ? config.deck : DEFAULT_DECK
  const rivalDeck =
    config.rivalDeck && config.rivalDeck.length === DECK_SLOTS
      ? config.rivalDeck
      : shuffle(ARTISTS.map((a) => a.id)).slice(0, DECK_SLOTS)
  const counters = modifiers.noCounters ? 0 : 2
  const onlineMode = config.online ? (config.onlineMode ?? 'ranked') : undefined
  const player = makeSide(
    config.playerName ?? 'YOU',
    playerDeck,
    Math.round((config.playerCrowd ?? 72) * crowdMultiplier),
    config.lineup,
    counters,
  )
  const rival = makeSide(
    config.rivalName ?? 'THE HEADLINER',
    rivalDeck,
    Math.round((config.rivalCrowd ?? meta.crowd) * crowdMultiplier),
    config.rivalLineup,
    counters,
  )
  seedOpeningActs(player, 'player', config.progress, 1, onlineMode === 'casual')
  seedOpeningActs(rival, 'rival', config.rivalProgress, rivalLevel, onlineMode === 'casual')
  const state: BattleState = {
    phase: 'player',
    round: 1,
    era: 1,
    player,
    rival,
    log: [],
    cinematics: [],
    counterPrompt: null,
    winner: null,
    difficulty: config.difficulty,
    rivalActions: 0,
    tick: 0,
    idSeq: 1,
    lastHit: null,
    lastCrateDraw: null,
    lastDefeat: null,
    lastMove: null,
    announcerCues: [],
    playerProgress: config.progress ?? {},
    rivalProgress: config.rivalProgress ?? {},
    venue,
    circuit: config.circuit ?? null,
    stageSlots,
    modifiers,
    objectives: (config.objectives ?? []).map((objective) => ({
      ...objective,
      progress: 0,
      done: false,
    })),
    lastObjective: null,
    online: Boolean(config.online),
    onlineMode,
    festival: config.festival,
    houseRules,
    houseRuleRuntime: houseRules
      ? {
          turn: 1,
          goldenHooksTurn: 0,
          sharpPenTurn: 0,
          crateFrenzyUsed: { player: false, rival: false },
          backstageBounceUsed: { player: false, rival: false },
          encoreSpotlightUsed: { player: false, rival: false },
          lastVerseNotified: false,
        }
      : undefined,
    lastHouseRuleEvent: null,
    advisorCharges: config.online ? 0 : ADVISOR_MAX_CHARGES,
    rivalLevel,
  }
  pushLog(state, `THE OPENING ACTS ARE LIVE AT ${venue.name}. FILL THE STAGE.`, 'gold')
  if (houseRules) applyStartOfTurnHouseRules(state, 'player')
  return state
}

function seedOpeningActs(
  side: SideState,
  prefix: string,
  progress?: Record<string, ArtistProgress>,
  difficultyLevel = 1,
  casual = false,
) {
  for (let index = 0; index < 2; index += 1) {
    const artistId = side.deck.shift()
    if (!artistId) return
    const level = casual ? 1 : progress ? playerLevel(progress, artistId) : difficultyLevel
    const moves = casual
      ? defaultLoadout(artistId)
      : progress
        ? playerLoadout(progress, artistId)
        : defaultLoadout(artistId)
    const badges = casual ? {} : equippedBadgeTiers(progress, artistId)
    const opener = makeStageCard(`${prefix}-opener-${index}`, artistId, level, moves, 1, badges)
    side.stage.push(opener)
    if (badges.momentum) {
      side.hype = Math.min(HYPE_CAP, side.hype + badges.momentum)
    }
  }
}

function pushLog(state: BattleState, text: string, tone: LogTone = 'neutral') {
  const entry: LogEntry = {
    id: state.idSeq++,
    round: state.round,
    text,
    tone,
  }
  state.log = [entry, ...state.log].slice(0, 64)
}

function pushCinematic(state: BattleState, cinematic: Omit<Cinematic, 'id'>) {
  state.cinematics = [...state.cinematics, { ...cinematic, id: state.idSeq++ }]
}

function pushAnnouncer(state: BattleState, event: AnnouncerEventName, side?: AnnouncerSide) {
  state.announcerCues = [
    ...state.announcerCues.slice(-15),
    { id: state.idSeq++, event, side },
  ]
}

function isRareCrate(rarity: string) {
  return rarity === 'RARE' || rarity === 'EPIC' || rarity === 'LEGENDARY'
}

function drawCards(side: SideState, count: number) {
  for (let i = 0; i < count; i += 1) {
    if (side.deck.length === 0) {
      if (side.discard.length === 0) return
      side.deck = shuffle(side.discard)
      side.discard = []
    }
    const card = side.deck.shift()
    if (card) side.hand.push(card)
  }
}

function drawTo(side: SideState, target: number) {
  const missing = Math.max(0, target - side.hand.length)
  if (missing > 0) drawCards(side, missing)
}

export function cloneSideState(side: SideState): SideState {
  return {
    ...side,
    hand: [...side.hand],
    deck: [...side.deck],
    discard: [...side.discard],
    stage: side.stage.map((card) => ({
      ...card,
      statuses: card.statuses.map((status) => ({ ...status })),
      moves: [...card.moves],
    })),
    backstage: side.backstage.map((card) => ({ ...card, moves: [...card.moves] })),
    crate: [...side.crate],
    specialHand: side.specialHand.map((card) => ({ ...card })),
    specialDiscard: [...side.specialDiscard],
    cardStats: Object.fromEntries(
      Object.entries(side.cardStats).map(([artistId, performance]) => [
        artistId,
        { ...performance },
      ]),
    ),
  }
}

function clone(state: BattleState): BattleState {
  return {
    ...state,
    player: cloneSideState(state.player),
    rival: cloneSideState(state.rival),
    log: [...state.log],
    cinematics: [...state.cinematics],
    announcerCues: [...state.announcerCues],
    counterPrompt: state.counterPrompt ? { ...state.counterPrompt } : null,
    objectives: state.objectives.map((objective) => ({ ...objective })),
    lastObjective: state.lastObjective ? { ...state.lastObjective } : null,
    houseRuleRuntime: state.houseRuleRuntime
      ? {
          ...state.houseRuleRuntime,
          crateFrenzyUsed: { ...state.houseRuleRuntime.crateFrenzyUsed },
          backstageBounceUsed: { ...state.houseRuleRuntime.backstageBounceUsed },
          encoreSpotlightUsed: { ...state.houseRuleRuntime.encoreSpotlightUsed },
        }
      : undefined,
    lastHouseRuleEvent: state.lastHouseRuleEvent ? { ...state.lastHouseRuleEvent } : null,
    party: state.party
      ? {
          ...state.party,
          seats: state.party.seats.map((seat) => ({ ...seat })),
          order: [...state.party.order],
          controllers: { ...state.party.controllers },
          sides: state.party.sides
            ? Object.fromEntries(
                Object.entries(state.party.sides).map(([seat, side]) => [
                  seat,
                  cloneSideState(side),
                ]),
              )
            : undefined,
        }
      : undefined,
  }
}

export function cloneBattleState(state: BattleState): BattleState {
  return clone(state)
}

function syncObjectives(state: BattleState): BattleState {
  if (state.objectives.length === 0) return state
  const crewTotals = new Map<string, number>()
  state.player.stage.forEach((card) => {
    const crew = getArtist(card.artistId).crew
    crewTotals.set(crew, (crewTotals.get(crew) ?? 0) + 1)
  })
  const maxCrew = Math.max(0, ...crewTotals.values())
  const values: Record<ObjectiveKind, number> = {
    'play-cards': state.player.played,
    'crew-max': maxCrew,
    moves: state.player.movesUsed,
    feature: state.player.features,
    crate: state.player.crateDraws,
    combo: state.player.bestCombo,
    encore: state.player.encores,
    ko: state.rival.koes,
    'era-3': state.era === 3 ? 1 : 0,
    'no-loss':
      state.phase === 'over' && state.winner === 'player' && state.player.koes === 0 ? 1 : 0,
  }

  const newlyDone: BattleObjective[] = []
  state.objectives = state.objectives.map((objective) => {
    const progress = Math.min(objective.target, values[objective.kind] ?? objective.progress)
    const done = objective.done || progress >= objective.target
    if (done && !objective.done) newlyDone.push(objective)
    return { ...objective, progress, done }
  })
  if (newlyDone.length > 0) {
    state.lastObjective = {
      id: newlyDone[0].id,
      title: newlyDone[0].title,
      nonce: state.idSeq++,
    }
  }
  return state
}

export function crewCount(stage: StageCard[], crew: Crew): number {
  return stage.filter((card) => getArtist(card.artistId).crew === crew).length
}

export function genreCount(stage: StageCard[], genre: Genre): number {
  return stage.filter((card) => getArtist(card.artistId).genre === genre).length
}

export function availableCrews(stage: StageCard[]): Crew[] {
  const found = new Set<Crew>()
  stage.forEach((card) => {
    const artist = getArtist(card.artistId)
    if (crewCount(stage, artist.crew) >= 2) found.add(artist.crew)
  })
  return [...found]
}

export function computePlayDamage(
  stage: StageCard[],
  artistId: string,
  encore: boolean,
  era: 1 | 2 | 3,
): { total: number; base: number; synergy: number; anthem: number; splash: number } {
  const artist = getArtist(artistId)
  const effects = encore ? artist.encore.effects : artist.effects
  const base = (encore ? artist.encore.bars : artist.bars) + eraBonus(era)
  const crewMates = stage.filter((card) => getArtist(card.artistId).crew === artist.crew).length
  const genreMates = stage.filter((card) => getArtist(card.artistId).genre === artist.genre).length
  const synergy = Math.min(2, crewMates)
  const anthem = effects.reduce((sum, effect) => {
    if (effect.kind === 'anthemCrew') return sum + effect.value * crewMates
    if (effect.kind === 'anthemGenre') return sum + effect.value * genreMates
    return sum
  }, 0)
  const splash = effects
    .filter((effect) => effect.kind === 'splash')
    .reduce((sum, effect) => sum + effect.value, 0)
  return { total: base + synergy + anthem + splash, base, synergy, anthem, splash }
}

export function effectiveBars(artistId: string, encore: boolean, era: 1 | 2 | 3): number {
  const artist = getArtist(artistId)
  return (encore ? artist.encore.bars : artist.bars) + eraBonus(era)
}

export function featureBars(stage: StageCard[], crew: Crew, era: 1 | 2 | 3): number {
  return stage
    .filter((card) => getArtist(card.artistId).crew === crew)
    .reduce((sum, card) => sum + effectiveBars(card.artistId, card.encore, era), 0)
}

export function featureDamage(stage: StageCard[], crew: Crew, era: 1 | 2 | 3): number {
  const members = stage.filter((card) => getArtist(card.artistId).crew === crew)
  if (members.length < 2) return 0
  const bars = featureBars(stage, crew, era)
  const encoreMembers = members.filter((card) => card.encore).length
  return Math.max(1, Math.round(bars * 0.6) + 4 + members.length + encoreMembers + eraBonus(era))
}

export function stagePressure(stage: StageCard[], era: 1 | 2 | 3): number {
  return stage.reduce((sum, card) => sum + effectiveBars(card.artistId, card.encore, era), 0)
}

function sideOf(state: BattleState, side: 'player' | 'rival'): SideState {
  return side === 'player' ? state.player : state.rival
}

function stageOf(state: BattleState, side: 'player' | 'rival'): StageCard[] {
  return sideOf(state, side).stage
}

function performanceFor(side: SideState, artistId: string): CardPerformance {
  const existing = side.cardStats[artistId]
  if (existing) return existing
  const created: CardPerformance = {
    artistId,
    uses: 0,
    damage: 0,
    healing: 0,
    prevented: 0,
    kos: 0,
    assists: 0,
    elementalUses: 0,
    attacks: 0,
    encores: 0,
    features: 0,
  }
  side.cardStats[artistId] = created
  return created
}

export interface MatchMvpSummary {
  mvp: CardPerformance | null
  score: number
  mostUsed: CardPerformance | null
  topDamage: CardPerformance | null
  topHealing: CardPerformance | null
  topDefense: CardPerformance | null
}

function performanceImpact(performance: CardPerformance): number {
  return (
    performance.damage +
    performance.healing +
    performance.prevented +
    performance.uses * 2 +
    performance.kos * 6
  )
}

function comparePerformance(a: CardPerformance, b: CardPerformance): number {
  return (
    b.damage - a.damage ||
    b.healing - a.healing ||
    b.prevented - a.prevented ||
    b.kos - a.kos ||
    b.uses - a.uses ||
    a.artistId.localeCompare(b.artistId)
  )
}

export function matchMvpSummary(
  cardStats: Record<string, CardPerformance>,
): MatchMvpSummary {
  const all = Object.values(cardStats)
  const bestBy = (read: (performance: CardPerformance) => number) => {
    const ranked = all
      .map((performance) => ({ performance, value: read(performance) }))
      .filter((entry) => entry.value > 0)
      .sort(
        (a, b) =>
          b.value - a.value || comparePerformance(a.performance, b.performance),
      )
    return ranked[0]?.performance ?? null
  }
  const ranked = all
    .map((performance) => ({ performance, score: performanceImpact(performance) }))
    .filter((entry) => entry.score > 0)
    .sort(
      (a, b) =>
        b.score - a.score || comparePerformance(a.performance, b.performance),
    )
  return {
    mvp: ranked[0]?.performance ?? null,
    score: ranked[0]?.score ?? 0,
    mostUsed: bestBy((performance) => performance.uses),
    topDamage: bestBy((performance) => performance.damage),
    topHealing: bestBy((performance) => performance.healing),
    topDefense: bestBy((performance) => performance.prevented),
  }
}

function hasRewind(side: SideState, round: number): CrateHandCard | undefined {
  return side.specialHand.find((card) => card.cardId === 'rewind' && card.drawnRound < round)
}

function canUseSpecial(card: CrateHandCard, round: number): boolean {
  return card.drawnRound < round
}

function applyCrowdDamage(state: BattleState, side: 'player' | 'rival', amount: number): number {
  if (amount <= 0) return 0
  if (state.houseRules?.format === '2v2') {
    amount = Math.max(1, Math.round(amount * TEAM_CROWD_PRESSURE))
  }
  amount = houseRuleCrowdAmount(state, amount)
  const defender = sideOf(state, side)
  const absorbed = Math.min(defender.shield, amount)
  defender.shield -= absorbed
  const lost = Math.max(0, amount - absorbed)
  defender.crowd = Math.max(0, defender.crowd - lost)
  return lost
}

function addStatus(card: StageCard, kind: StatusKind, value: number, turns: number) {
  const existing = card.statuses.find((status) => status.kind === kind)
  if (existing) {
    existing.value = Math.max(existing.value, value)
    existing.turns = Math.max(existing.turns, turns)
  } else {
    card.statuses.push({ kind, value, turns })
  }
}

function defeatArtist(
  state: BattleState,
  side: 'player' | 'rival',
  card: StageCard,
  reason: string,
) {
  const actor = sideOf(state, side)
  if (!actor.stage.some((entry) => entry.uid === card.uid)) return
  const artist = getArtist(card.artistId)
  actor.stage = actor.stage.filter((entry) => entry.uid !== card.uid)
  actor.backstage = [
    ...actor.backstage,
    {
      uid: card.uid,
      artistId: card.artistId,
      encore: card.encore,
      level: card.level,
      hp: card.hp,
      maxHp: card.maxHp,
      moves: [...card.moves],
    },
  ]
  actor.koes += 1
  applyCrowdDamage(state, side, 2)
  const victor = sideOf(state, other(side))
  victor.hype = Math.min(HYPE_CAP, victor.hype + 2)
  state.lastDefeat = { side, artistId: card.artistId, nonce: state.idSeq++ }
  pushAnnouncer(state, 'defeat', side)
  pushLog(state, `${artist.name} IS DEFEATED. ${reason.toUpperCase()} · BACKSTAGE · KNOCKOUT HYPE +2.`, side === 'player' ? 'bad' : 'good')
}

interface AttackOptions {
  targetUid?: string | null
  artistId: string
  source: string
  attackerUid?: string | null
  crowdSplash?: number
  canCounter?: boolean
  ignoreDefense?: boolean
  defensePierce?: number
  reflected?: boolean
  noPressure?: boolean
  /** Damage swing applied before mitigation. Defaults to ±2. */
  spread?: number
  critChance?: number
  /** False for secondary strikes and for events that already have a dedicated cue. */
  announce?: boolean
  element?: Element | null
}

interface AttackResult {
  held: boolean
  dealt: number
  defeated: boolean
}

function houseRuleDirectDamage(
  state: BattleState,
  side: 'player' | 'rival',
  amount: number,
  opts: AttackOptions,
): number {
  if (amount <= 0 || !opts.attackerUid || opts.announce === false) return amount
  const runtime = state.houseRuleRuntime
  if (!hasHouseModifier(state, 'sharp-pen-showcase') || !runtime) return amount
  if (runtime.sharpPenTurn === runtime.turn) return amount
  runtime.sharpPenTurn = runtime.turn
  const boosted = Math.max(1, Math.round(amount * 1.1))
  pushHouseRuleEvent(
    state,
    'sharp-pen-showcase',
    'SHARP PEN SHOWCASE!',
    `First direct Artist hit this turn: +${Math.max(1, boosted - amount)} damage.`,
    side,
  )
  return boosted
}

function festivalAttackHypeSurcharge(state: BattleState, artistId: string): number {
  if (state.festival?.modifier !== 'subwoofer-bass') return 0
  return getArtist(artistId).crew === 'STATIC KINGS' ? 1 : 0
}

function festivalHealAmount(state: BattleState, base: number): number {
  if (state.festival?.modifier !== 'velvet-healing') return base
  return Math.ceil(base * 1.1)
}

function festivalAttackBonus(state: BattleState, attackerSide: 'player' | 'rival', artistId: string): number {
  const rule = state.festival
  if (!rule) return 0
  const artist = getArtist(artistId)
  if (rule.modifier === 'blacktop-first-hiphop') {
    return artist.genre === 'HIP-HOP' && !sideOf(state, attackerSide).festivalFirstHipHopUsed ? 0.1 : 0
  }
  if (rule.modifier === 'subwoofer-bass') {
    return artist.crew === (rule.bassCrew ?? 'STATIC KINGS') ? 0.15 : 0
  }
  if (rule.modifier === 'diamond-genre-chain') {
    const lastGenre = sideOf(state, attackerSide).festivalLastAttackGenre
    return lastGenre && lastGenre !== artist.genre ? 0.1 : 0
  }
  return 0
}

function resolveAttack(state: BattleState, attackerSide: 'player' | 'rival', rawInput: number, opts: AttackOptions): AttackResult {
  const defenderSide = other(attackerSide)
  const defender = sideOf(state, defenderSide)
  const aggressor = sideOf(state, attackerSide)
  let raw = Math.max(0, rawInput)
  let interrupted = false
  let critical = false
  if (raw > 0) {
    const spread = opts.spread ?? 2
    raw = Math.max(1, raw + Math.floor(Math.random() * (spread * 2 + 1)) - spread)
    if (Math.random() < (opts.critChance ?? 0.08)) {
      raw = Math.round(raw * 1.25) + 1
      critical = true
    }
  }

  if (opts.canCounter && !state.counterPrompt && (state.online || attackerSide === 'rival')) {
    const rewind = hasRewind(defender, state.round)
    const promptNeeded = raw >= 5 || Boolean(rewind)
    if (promptNeeded && (defender.counters > 0 || rewind)) {
      state.counterPrompt = {
        id: state.idSeq++,
        damage: raw,
        artistId: opts.artistId,
        source: opts.source,
        targetUid: opts.targetUid ?? defender.stage[0]?.uid ?? null,
        attackerUid: opts.attackerUid ?? null,
        canRewind: Boolean(rewind) && Boolean(opts.attackerUid),
        defender: defenderSide,
      }
      pushLog(state, `INCOMING: ${opts.source.toUpperCase()} — ${raw} DAMAGE. DEFENSIVE WINDOW.`, 'bad')
      return { held: true, dealt: 0, defeated: false }
    }
  }

  const festivalBonus = festivalAttackBonus(state, attackerSide, opts.artistId)
  if (festivalBonus > 0) raw = Math.max(1, Math.round(raw * (1 + festivalBonus)))

  const target =
    defender.stage.find((card) => card.uid === opts.targetUid) ??
    (defender.stage.length > 0 ? defender.stage[0] : null)

  if (!target) {
    let crowdHit = raw + (opts.crowdSplash ?? 0) + state.modifiers.crowdDamage
    crowdHit = houseRuleDirectDamage(state, attackerSide, crowdHit, opts)
    if (state.festival) {
      const artist = getArtist(opts.artistId)
      if (state.festival.modifier === 'blacktop-first-hiphop' && artist.genre === 'HIP-HOP') {
        aggressor.festivalFirstHipHopUsed = true
      }
      aggressor.festivalLastAttackGenre = artist.genre
    }
    const lost = applyCrowdDamage(state, defenderSide, crowdHit)
    aggressor.dealt += lost
    state.lastHit = { side: defenderSide, value: lost, nonce: state.idSeq++ }
    if (opts.announce !== false) {
      pushAnnouncer(
        state,
        crowdHit >= 9 ? 'heavy_attack' : 'normal_attack',
        attackerSide,
      )
    }
    pushLog(
      state,
      `${attackerSide === 'player' ? 'YOUR SET' : 'THE HEADLINER'} · ${opts.source.toUpperCase()} — ${crowdHit} TO THE CROWD`,
      attackerSide === 'player' ? 'good' : 'bad',
    )
    return { held: false, dealt: lost, defeated: false }
  }

  if (attackerSide === 'player' && !state.counterPrompt && state.rival.counters > 0) {
    if (raw >= 8 && Math.random() < DIFFICULTY_META[state.difficulty].interrupt) {
      raw = Math.ceil(raw / 2)
      state.rival.counters -= 1
      interrupted = true
    }
  }

  if (target.untouchableUntil > state.round) {
    pushLog(state, `${getArtist(target.artistId).name} IS UNTOUCHABLE. THE HIT ROLLS OFF.`, 'neutral')
    return { held: false, dealt: 0, defeated: false }
  }

  if (state.festival) {
    const attacker = getArtist(opts.artistId)
    if (state.festival.modifier === 'blacktop-first-hiphop' && attacker.genre === 'HIP-HOP') {
      aggressor.festivalFirstHipHopUsed = true
    }
    aggressor.festivalLastAttackGenre = attacker.genre
  }

  const artist = getArtist(target.artistId)
  const stats = battleStatsFor(artist, target.level)
  const defense = opts.ignoreDefense
    ? 0
    : Math.max(
        0,
        Math.round((stats.defense + target.defenseBonus) * (1 - (opts.defensePierce ?? 0))),
      )
  let damage = raw <= 0 ? 0 : Math.max(1, Math.round(raw - defense))
  const fortify = target.statuses.find((status) => status.kind === 'fortify')
  if (fortify) damage = Math.max(0, damage - fortify.value)
  damage = houseRuleDirectDamage(state, attackerSide, damage, opts)

  if (damage > 0 && artist.battle.passive.kind === 'guard' && target.guardRound !== state.round) {
    damage = Math.max(0, damage - 1)
    target.guardRound = state.round
    pushLog(state, `${artist.battle.passive.name} SOAKS 1 DAMAGE.`, 'neutral')
  }

  const attackerBadges = badgeTiersFor(state, attackerSide, opts.artistId)
  const attackerCard = opts.attackerUid
    ? aggressor.stage.find((card) => card.uid === opts.attackerUid)
    : undefined
  const comebackBonus = attackerCard && !attackerCard.comebackUsed ? attackerCard.comebackBonus : 0
  const badgeDamage =
    (attackerBadges.executioner && target.hp <= target.maxHp * 0.35
      ? attackerBadges.executioner
      : 0) +
    (attackerBadges.elementalist && opts.element ? attackerBadges.elementalist : 0)
  if (damage > 0 && badgeDamage > 0) damage += badgeDamage
  if (damage > 0 && attackerCard && comebackBonus > 0) {
    damage += comebackBonus
    attackerCard.comebackUsed = true
    pushLog(
      state,
      `COMEBACK ARTIST — ${getArtist(attackerCard.artistId).name} TURNS THE RECALL INTO +${comebackBonus} DAMAGE.`,
      'gold',
    )
  }

  const absorbed = Math.min(target.shield, damage)
  target.shield -= absorbed
  const hpDamage = Math.max(0, damage - absorbed)
  const previousHp = target.hp
  target.hp = Math.max(0, target.hp - hpDamage)
  aggressor.dealt += hpDamage
  const attackerPerformance = attackerCard
    ? performanceFor(aggressor, attackerCard.artistId)
    : null
  if (attackerPerformance) attackerPerformance.damage += hpDamage
  performanceFor(defender, target.artistId).prevented +=
    Math.max(0, raw - damage) + absorbed
  const pressure = opts.noPressure
    ? 0
    : Math.max(1, Math.floor(damage / 3)) +
      (opts.crowdSplash ?? 0) +
      state.modifiers.crowdDamage +
      (attackerBadges.closer ?? 0)
  const passivePressure = attackerCard && getArtist(attackerCard.artistId).battle.passive.kind === 'pressure' ? 1 : 0
  const crowdLost = applyCrowdDamage(state, defenderSide, pressure + passivePressure)
  state.lastHit = { side: defenderSide, value: crowdLost, nonce: state.idSeq++ }

  let defeated = false
  if (target.hp <= 0) {
    defeated = true
    if (attackerPerformance) attackerPerformance.kos += 1
    defeatArtist(state, defenderSide, target, 'The room moves on')
  }

  if (!defeated) {
    if (absorbed > 0) {
      pushAnnouncer(
        state,
        hpDamage === 0 && absorbed >= BLOCK_ABSORB_DAMAGE ? 'block' : 'defense',
        defenderSide,
      )
    }
    if (opts.announce !== false) {
      const elementEvent = opts.element ? ELEMENT_ANNOUNCER_EVENTS[opts.element] : undefined
      if (elementEvent) {
        pushAnnouncer(state, elementEvent, attackerSide)
      } else if (hpDamage > 0) {
        pushAnnouncer(
          state,
          damage >= HEAVY_ATTACK_DAMAGE || critical ? 'heavy_attack' : 'normal_attack',
          attackerSide,
        )
      }
    }
    const lowThreshold = Math.ceil(target.maxHp * LOW_HP_RATIO)
    if (previousHp > lowThreshold && target.hp > 0 && target.hp <= lowThreshold) {
      pushAnnouncer(state, 'low_hp', defenderSide)
    }
  }

  pushLog(
    state,
    `${attackerSide === 'player' ? 'YOUR SET' : 'THE HEADLINER'} · ${opts.source.toUpperCase()} — ${damage} TO ${artist.name}${
      absorbed > 0 ? ` (${absorbed} SHIELDED)` : ''
    }${critical ? ' · CRITICAL' : ''}${interrupted ? ' · INTERRUPTED' : ''}${defeated ? ' · DEFEATED' : ''}`,
    attackerSide === 'player' ? 'good' : 'bad',
  )
  return { held: false, dealt: hpDamage, defeated }
}

function applyEffects(
  state: BattleState,
  side: 'player' | 'rival',
  artistId: string,
  encore: boolean,
) {
  const actor = sideOf(state, side)
  const opponent = sideOf(state, other(side))
  const artist = getArtist(artistId)
  const effects = encore ? artist.encore.effects : artist.effects
  effects.forEach((effect) => {
    switch (effect.kind) {
      case 'heal': {
        const before = actor.crowd
        const amount = festivalHealAmount(state, effect.value)
        actor.crowd = Math.min(actor.maxCrowd, actor.crowd + amount)
        if (actor.crowd > before) {
          pushLog(state, `${side === 'player' ? 'CROWD RESCUED' : 'HEADLINER CROWD +'} ${actor.crowd - before}`, side === 'player' ? 'good' : 'bad')
        }
        break
      }
      case 'shield':
        actor.shield += effect.value
        pushLog(state, `${side === 'player' ? 'SHIELD' : 'HEADLINER SHIELD'} +${effect.value}`, 'neutral')
        break
      case 'hype':
        actor.hype = Math.min(HYPE_CAP, actor.hype + effect.value)
        pushLog(state, `${side === 'player' ? 'HYPE' : 'HEADLINER HYPE'} +${effect.value}`, 'gold')
        break
      case 'draw':
        drawCards(actor, effect.value)
        pushLog(state, `${side === 'player' ? 'YOU DRAW' : 'HEADLINER DRAWS'} ${effect.value}`, 'neutral')
        break
      case 'drain':
        opponent.hype = Math.max(0, opponent.hype - effect.value)
        pushLog(state, `${side === 'player' ? 'RIVAL' : 'YOUR'} HYPE DRAINED ${effect.value}`, side === 'player' ? 'good' : 'bad')
        break
      case 'splash':
      case 'anthemCrew':
      case 'anthemGenre':
      case 'none':
        break
    }
  })
}

function checkWinner(state: BattleState): boolean {
  // Free-for-all rooms have three or four sides and are settled by rotation.
  if (state.party?.format === 'triple-threat' || state.party?.format === 'fatal-4') return false
  if (state.rival.crowd <= 0) {
    state.winner = 'player'
    state.phase = 'over'
    state.counterPrompt = null
    pushLog(state, 'THE HEADLINER IS BOOED OFF STAGE. YOU OWN THE ROOM.', 'gold')
    return true
  }
  if (state.player.crowd <= 0) {
    state.winner = 'rival'
    state.phase = 'over'
    state.counterPrompt = null
    pushLog(state, 'YOUR CROWD IS GONE. THE HEADLINER TAKES THE ROOM.', 'bad')
    return true
  }
  if (state.round > CURFEW_ROUND) {
    state.phase = 'over'
    if (state.player.crowd === state.rival.crowd) {
      state.winner = 'draw'
    } else {
      state.winner = state.player.crowd > state.rival.crowd ? 'player' : 'rival'
    }
    pushLog(state, 'CURFEW. THE HOUSE LIGHTS COME UP.', 'gold')
    return true
  }
  return false
}

function grantEncore(state: BattleState, side: 'player' | 'rival') {
  const actor = sideOf(state, side)
  if (actor.played > 0 && actor.played % 3 === 0) {
    actor.encoreCharges = Math.min(2, actor.encoreCharges + 1)
    pushLog(state, `${side === 'player' ? 'ENCORE READY' : 'HEADLINER ENCORE READY'}`, 'gold')
  }
}

function pickTargetForAI(state: BattleState): string | undefined {
  const stage = state.player.stage
  if (stage.length === 0) return undefined
  return [...stage].sort((a, b) => {
    const aHeal = a.moves.some((id) => moveById(id)?.type === 'healing') ? 1 : 0
    const bHeal = b.moves.some((id) => moveById(id)?.type === 'healing') ? 1 : 0
    if (aHeal !== bHeal) return bHeal - aHeal
    return a.hp - b.hp
  })[0]?.uid
}

function playCardFor(
  state: BattleState,
  side: 'player' | 'rival',
  artistId: string,
  replaceUid?: string,
  targetUid?: string,
) {
  const progress = side === 'player' ? state.playerProgress : state.rivalProgress
  const actor = sideOf(state, side)
  const artist = getArtist(artistId)
  if (actor.hype < artist.cost) return
  if (!actor.hand.includes(artistId)) return
  if (actor.stage.length >= state.stageSlots && !replaceUid) return

  actor.hype -= artist.cost
  const handIndex = actor.hand.indexOf(artistId)
  actor.hand = actor.hand.filter((_, idx) => idx !== handIndex)

  if (replaceUid) {
    const replaced = actor.stage.find((card) => card.uid === replaceUid)
    if (replaced) {
      const refund = cutHypeRefund(getArtist(replaced.artistId).cost)
      if (getArtist(replaced.artistId).personal) {
        actor.backstage = [
          ...actor.backstage,
          {
            uid: replaced.uid,
            artistId: replaced.artistId,
            encore: replaced.encore,
            level: replaced.level,
            hp: replaced.hp,
            maxHp: replaced.maxHp,
            moves: [...replaced.moves],
          },
        ]
        pushLog(state, `${side === 'player' ? 'YOU CUT' : 'HEADLINER CUTS'} ${getArtist(replaced.artistId).name} · BACKSTAGE · +${refund} HYPE`, 'neutral')
      } else {
        actor.discard.push(replaced.artistId)
        pushLog(state, `${side === 'player' ? 'YOU CUT' : 'HEADLINER CUTS'} ${getArtist(replaced.artistId).name} · +${refund} HYPE`, 'neutral')
      }
      actor.stage = actor.stage.filter((card) => card.uid !== replaceUid)
      actor.hype = Math.min(HYPE_CAP, actor.hype + refund)
    }
  }

  const level = isCasualOnline(state)
    ? 1
    : side === 'player' || state.online
      ? playerLevel(progress, artistId)
      : state.rivalLevel
  const moves = isCasualOnline(state)
    ? defaultLoadout(artistId)
    : side === 'player' || state.online
      ? playerLoadout(progress, artistId)
      : defaultLoadout(artistId)
  const badges = isCasualOnline(state) ? {} : equippedBadgeTiers(progress, artistId)
  const stageCard = makeStageCard(`${side}-${state.idSeq++}`, artistId, level, moves, state.round, badges)
  const stageBefore = actor.stage
  const hit = computePlayDamage(stageBefore, artistId, false, state.era)
  actor.stage = [...actor.stage, stageCard]
  actor.played += 1
  performanceFor(actor, artistId).uses += 1
  if (badges.momentum) {
    actor.hype = Math.min(HYPE_CAP, actor.hype + badges.momentum)
    pushLog(state, `${artist.name} — MIC PRESENCE +${badges.momentum} HYPE.`, 'gold')
  }
  if (badges.headliner) {
    pushLog(state, `${artist.name} — HEADLINER +${badges.headliner} MAX HP.`, 'gold')
  }
  const starHype = starPowerHype(artist, level)
  if (starHype > 0) {
    actor.hype = Math.min(HYPE_CAP, actor.hype + starHype)
    pushLog(state, `${artist.name} — STAR POWER +${starHype} HYPE.`, 'gold')
  }

  if (artist.battle.passive.kind === 'hype') {
    actor.hype = Math.min(HYPE_CAP, actor.hype + 1)
    pushLog(state, `${artist.battle.passive.name} — +1 HYPE.`, 'gold')
  }

  const opener = artist.battle.passive.kind === 'opener' && !stageCard.entranceUsed ? 2 : 0
  const raw = Math.max(0, hit.total - hit.splash + opener)
  const resolvedTarget = targetUid ?? (side === 'rival' ? pickTargetForAI(state) : stageOf(state, other(side))[0]?.uid)
  applyEffects(state, side, artistId, false)
  resolveAttack(state, side, raw, {
    targetUid: resolvedTarget,
    artistId,
    source: artist.name,
    attackerUid: stageCard.uid,
    crowdSplash: hit.splash,
    canCounter: side === 'rival',
  })
  stageCard.entranceUsed = true
  grantEncore(state, side)
  checkWinner(state)
}

function currentMove(card: StageCard, moveId: string): Move | undefined {
  const move = moveById(moveId)
  if (!move) return undefined
  if (!card.moves.includes(moveId) && !move.special) return undefined
  return move
}

function moveTarget(
  state: BattleState,
  side: 'player' | 'rival',
  source: StageCard,
  move: Move,
  targetUid?: string,
): StageCard | null {
  const actor = sideOf(state, side)
  const defender = sideOf(state, other(side))
  if (move.target === 'self' || move.target === 'none') return source
  if (move.target === 'ally') {
    return actor.stage.find((card) => card.uid === targetUid) ?? source
  }
  return defender.stage.find((card) => card.uid === targetUid) ?? defender.stage[0] ?? null
}

function applyMoveEffects(
  state: BattleState,
  side: 'player' | 'rival',
  card: StageCard,
  move: Move,
  target: StageCard | null,
) {
  const artist = getArtist(card.artistId)
  const actor = sideOf(state, side)
  const defender = sideOf(state, other(side))
  const tiers = isCasualOnline(state)
    ? {}
    : equippedBadgeTiers(
        side === 'player' ? state.playerProgress : state.rivalProgress,
        card.artistId,
      )
  let healing = 0
  for (const effect of move.effects) {
    if (effect.damage !== undefined) continue
    if (effect.heal !== undefined) {
      const healTarget = move.target === 'ally' || move.target === 'self' ? target ?? card : card
      const baseHeal = festivalHealAmount(state, effect.heal + (tiers.medic ?? 0))
      const { restored } = houseRuleHealCard(state, side, healTarget, baseHeal)
      healing += restored
      if (restored > 0) performanceFor(actor, card.artistId).healing += restored
      const shownHeal = hasHouseModifier(state, 'golden-hooks') ? restored : baseHeal
      pushLog(state, `${getArtist(healTarget.artistId).name} RESTORES ${shownHeal} HP.`, side === 'player' ? 'good' : 'bad')
    }
    if (effect.shield !== undefined) {
      const shieldTarget = move.target === 'ally' || move.target === 'self' ? target ?? card : card
      const shieldAmount = effect.shield + (move.target === 'ally' ? (tiers.assist ?? 0) : 0)
      shieldTarget.shield += shieldAmount
      pushLog(state, `${getArtist(shieldTarget.artistId).name} GAINS ${shieldAmount} SHIELD.`, 'neutral')
    }
    if (effect.hype !== undefined) {
      actor.hype = Math.min(HYPE_CAP, actor.hype + effect.hype)
      pushLog(state, `HYPE +${effect.hype}.`, 'gold')
    }
    if (effect.drainHype !== undefined) {
      defender.hype = Math.max(0, defender.hype - effect.drainHype)
      pushLog(state, `${defender.name} HYPE −${effect.drainHype}.`, side === 'player' ? 'good' : 'bad')
    }
    if (effect.cleanse) {
      const cleanseTarget = move.target === 'ally' || move.target === 'self' ? target ?? card : card
      cleanseTarget.statuses = []
      pushLog(state, `${getArtist(cleanseTarget.artistId).name} IS CLEANSED.`, 'good')
    }
    if (effect.buffAttack !== undefined) {
      card.nextAttackBonus += effect.buffAttack
      pushLog(state, `${artist.name} NEXT MOVE +${effect.buffAttack}.`, 'gold')
    }
    if (effect.buffDefense !== undefined) {
      card.defenseBonus += effect.buffDefense
    }
    if (effect.crowd !== undefined) {
      applyCrowdDamage(state, other(side), effect.crowd)
      pushLog(state, `${effect.crowd} CROWD PRESSURE.`, side === 'player' ? 'good' : 'bad')
    }
    if (effect.crowdHeal !== undefined) {
      const before = actor.crowd
      actor.crowd = Math.min(actor.maxCrowd, actor.crowd + effect.crowdHeal)
      if (actor.crowd > before) {
        pushLog(state, `CROWD RESTORED +${actor.crowd - before}.`, side === 'player' ? 'good' : 'bad')
      }
    }
    if (effect.status) {
      const statusTarget = effect.status === 'fortify' || effect.status === 'light' ? card : target
      if (statusTarget) {
        addStatus(statusTarget, effect.status, effect.statusValue ?? 1, effect.statusTurns ?? 2)
        pushLog(state, `${getArtist(statusTarget.artistId).name} — ${effect.status.toUpperCase()}.`, 'neutral')
      }
    }
  }
  if (healing >= SIGNIFICANT_HEAL) pushAnnouncer(state, 'healing', side)
}

function useMoveFor(
  state: BattleState,
  side: 'player' | 'rival',
  uid: string,
  moveId: string,
  targetUid?: string,
) {
  const actor = sideOf(state, side)
  const card = actor.stage.find((entry) => entry.uid === uid)
  if (!card || card.actedThisTurn) return
  const move = currentMove(card, moveId)
  if (!move) return
  const cost = moveHypeCost(move)
  const festivalSurcharge = isAttackMove(move) ? festivalAttackHypeSurcharge(state, card.artistId) : 0
  if (actor.hype < cost + festivalSurcharge) return
  if (isAttackMove(move) && actor.attacksThisTurn >= MAX_ATTACKS_PER_TURN) return
  if (move.special) {
    if (
      card.level < (move.unlockLevel ?? 5) ||
      card.specialUsed ||
      card.specialCharge < SPECIAL_CHARGE_MAX
    ) {
      return
    }
  }

  actor.hype -= cost + festivalSurcharge
  if (isAttackMove(move)) {
    actor.attacksThisTurn += 1
    actor.attacksUsed += 1
  }
  card.actedThisTurn = true
  actor.movesUsed += 1
  const performance = performanceFor(actor, card.artistId)
  performance.uses += 1
  if (isAttackMove(move)) performance.attacks += 1
  if (move.type === 'elemental') performance.elementalUses += 1
  if (move.target === 'ally') performance.assists += 1
  const target = moveTarget(state, side, card, move, targetUid)
  const artist = getArtist(card.artistId)
  const stats = battleStatsFor(artist, card.level)
  let raw =
    move.power +
    Math.floor(stats.attack / 2) +
    eraBonus(state.era) +
    card.nextAttackBonus +
    (move.special ? 2 : 0)
  const chill = card.statuses.find((status) => status.kind === 'chill')
  if (chill) {
    raw = Math.max(0, raw - chill.value)
    chill.turns -= 1
    if (chill.turns <= 0) card.statuses = card.statuses.filter((status) => status !== chill)
  }
  const weaken = card.statuses.find((status) => status.kind === 'weaken')
  if (weaken) {
    raw = Math.max(0, raw - weaken.value)
  }
  card.nextAttackBonus = 0
  const closesTurn = isAttackMove(move) && (moveEndsTurn(move) || raw >= 8)

  let landed = false
  if (move.power > 0) {
    const primary = resolveAttack(state, side, raw, {
      targetUid: move.target === 'enemy' ? target?.uid : undefined,
      artistId: card.artistId,
      source: move.name,
      attackerUid: card.uid,
      defensePierce: move.pierce ?? 0,
      canCounter: side === 'rival' && !move.special,
      spread: move.special ? 3 : 2,
      critChance: move.special ? 0.16 : 0.08,
      announce: true,
      element: move.element,
    })
    landed = !primary.held && primary.dealt > 0
    const extraHits = move.effects.find((effect) => effect.hits !== undefined)?.hits ?? 0
    for (let hit = 0; hit < extraHits; hit += 1) {
      const otherTarget = sideOf(state, other(side)).stage.find((entry) => entry.uid !== target?.uid)

      if (otherTarget) {
        resolveAttack(state, side, raw, {
          targetUid: otherTarget.uid,
          artistId: card.artistId,
          source: `${move.name} · SECOND WAVE`,
          attackerUid: card.uid,
          canCounter: false,
          announce: false,
        })
      }
    }
    const strikes = move.effects.find((effect) => effect.strikes !== undefined)?.strikes ?? 0
    for (let strike = 1; strike < strikes; strike += 1) {
      if (!target || target.hp <= 0) break
      resolveAttack(state, side, Math.max(1, Math.round(raw * 0.55)), {
        targetUid: target.uid,
        artistId: card.artistId,
        source: `${move.name} · HIT ${strike + 1}`,
        attackerUid: card.uid,
        canCounter: false,
        defensePierce: move.pierce ?? 0,
        spread: 1,
        critChance: 0.04,
        announce: false,
      })
    }
  }

  if (landed) {
    actor.combo += 1
    actor.bestCombo = Math.max(actor.bestCombo, actor.combo)
  }
  applyMoveEffects(state, side, card, move, target)
  if (move.special) {
    card.specialUsed = true
    card.specialCharge = 0
  } else {
    gainSpecialCharge(card)
  }
  state.lastMove = {
    side,
    artistId: card.artistId,
    moveId: move.id,
    name: move.name,
    element: move.element,
    nonce: state.idSeq++,
  }
  pushLog(
    state,
    `${side === 'player' ? 'YOU' : 'HEADLINER'} ${move.special ? 'UNLEASH' : 'USE'} ${move.name} — ${cost > 0 ? `${cost} HYPE` : 'FREE ATTACK'}${closesTurn ? ' · TURN ENDS' : ''}.`,
    side === 'player' ? 'good' : 'bad',
  )
  checkWinner(state)
  if (closesTurn && state.phase === side && !state.winner && !state.counterPrompt) {
    pushLog(state, 'THE BIG HIT CLOSES THE TURN.', 'gold')
    endTurnFor(state, side)
  }
}

function beginTurnFor(state: BattleState, side: 'player' | 'rival') {
  state.phase = side
  if (state.houseRuleRuntime) state.houseRuleRuntime.turn += 1
  tickStatuses(state, side)
  if (checkWinner(state)) return
  const actor = sideOf(state, side)
  actor.hype = Math.min(
    HYPE_CAP,
    actor.hype + DIFFICULTY_META[state.difficulty].regen + state.modifiers.hypeRegen,
  )
  actor.shield = 0
  actor.featureUsed = false
  actor.combo = 0
  actor.attacksThisTurn = 0
  actor.festivalFirstHipHopUsed = false
  actor.stage = actor.stage.map((card) => ({ ...card, actedThisTurn: false }))
  if (side === 'player') state.counterPrompt = null
  drawTo(actor, HAND_SIZE)
  state.rivalActions = 0
  applyStartOfTurnHouseRules(state, side)
  pushLog(
    state,
    side === 'player'
      ? state.online
        ? `ROUND ${state.round} · ${actor.name.toUpperCase()} TURN`
        : `ROUND ${state.round} · YOUR TURN`
      : state.online
        ? `${actor.name.toUpperCase()} TAKES THE STAGE.`
        : 'THE HEADLINER TAKES THE STAGE.',
    side === 'player' ? 'neutral' : 'bad',
  )
}

function tickStatuses(state: BattleState, side: 'player' | 'rival') {
  const actor = sideOf(state, side)
  for (const card of [...actor.stage]) {
    for (const status of [...card.statuses]) {
      if (status.kind === 'burn' || status.kind === 'poison') {
        card.hp = Math.max(0, card.hp - status.value)
        pushLog(
          state,
          `${getArtist(card.artistId).name} — ${status.kind.toUpperCase()} ${status.value} DAMAGE.`,
          side === 'player' ? 'bad' : 'good',
        )
        if (card.hp <= 0) {
          defeatArtist(state, side, card, `${status.kind} damage`)
        } else {
          const lowThreshold = Math.ceil(card.maxHp * LOW_HP_RATIO)
          if (card.hp + status.value > lowThreshold && card.hp <= lowThreshold) {
            pushAnnouncer(state, 'low_hp', side)
          }
        }
      }
      status.turns -= 1
      if (status.turns <= 0) {
        card.statuses = card.statuses.filter((entry) => entry !== status)
      }
    }
  }
}

function resolveEra(state: BattleState) {
  if (state.round === 3 && state.era === 1) {
    state.era = 2
    pushCinematic(state, {
      kind: 'era',
      title: 'ERA II',
      subtitle: 'MAIN STAGE',
      detail: 'The room doubles. Every card gains +1 BARS.',
      value: 2,
    })
    pushLog(state, 'ERA EVOLUTION — MAIN STAGE. +1 BARS TO EVERY CARD.', 'gold')
  } else if (state.round === 6 && state.era === 2) {
    state.era = 3
    pushCinematic(state, {
      kind: 'era',
      title: 'ERA III',
      subtitle: 'HEADLINE',
      detail: 'Sold out. Every card gains +2 BARS. Encores hit different.',
      value: 3,
    })
    pushLog(state, 'ERA EVOLUTION — HEADLINE. +2 BARS TO EVERY CARD.', 'gold')
  }
}

/**
 * Tag the next seat in the 2v2 order onto the stage.
 *
 * A turn always alternates teams, so only every second turn changes the seat
 * for a given team. The teammate leaving the stage is snapshotted with every
 * one of their own cards, Hype, stage, Crate, Backstage and Encore charge; the
 * tagged-in seat returns exactly as they left it. Only the Crowd meter is
 * shared, so it is carried across the swap.
 */
function advancePartyTurn(state: BattleState, endedSide: 'player' | 'rival') {
  const party = state.party
  if (!party?.sides || party.order.length === 0) return
  const nextSide: 'player' | 'rival' = endedSide === 'player' ? 'rival' : 'player'
  const nextIndex = ((party.turnIndex ?? 0) + 1) % party.order.length
  party.turnIndex = nextIndex
  const nextSeat = party.order[nextIndex]
  if (!nextSeat) return
  const nextTeam = party.seats.find((seat) => seat.seat === nextSeat)?.team
  if (nextTeam !== nextSide) return
  const currentSeat = party.controllers[nextSide]
  if (!currentSeat || currentSeat === nextSeat) return
  const outgoing = nextSide === 'player' ? state.player : state.rival
  party.sides[currentSeat] = cloneSideState(outgoing)
  const saved = party.sides[nextSeat]
  if (!saved) return
  const incoming = cloneSideState(saved)
  incoming.crowd = outgoing.crowd
  incoming.maxCrowd = outgoing.maxCrowd
  incoming.name = party.seats.find((seat) => seat.seat === nextSeat)?.name ?? incoming.name
  if (nextSide === 'player') state.player = incoming
  else state.rival = incoming
  party.controllers[nextSide] = nextSeat
}

function endTurnFor(state: BattleState, side: 'player' | 'rival') {
  if (state.party?.format === 'triple-threat' || state.party?.format === 'fatal-4') {
    state.party.turnEnded = true
    return
  }
  advancePartyTurn(state, side)
  if (side === 'player') {
    beginTurnFor(state, 'rival')
    return
  }
  state.round += 1
  state.rivalActions = 0
  resolveEra(state)
  if (checkWinner(state)) return
  beginTurnFor(state, 'player')
}

function endRivalTurn(state: BattleState) {
  endTurnFor(state, 'rival')
}

/**
 * Rotate a three-mic free-for-all after a turn, a knockout or a target switch.
 *
 * The active seat lives in `state.player`, the chosen target in `state.rival`;
 * the waiting seats are parked in `party.sides`. The next living seat takes
 * the mic, and the next living rival becomes its target. A full cycle advances
 * the round, resolves Era changes and enforces the Curfew.
 */
export function advanceTripleTurn(state: BattleState, endedSeat: string): void {
  const party = state.party
  if (
    !party ||
    !party.sides ||
    (party.format !== 'triple-threat' && party.format !== 'fatal-4')
  ) {
    return
  }
  const activeSeat = party.activeSeat ?? endedSeat
  const targetSeat = party.targetSeat
  if (activeSeat) party.sides[activeSeat] = cloneSideState(state.player)
  if (targetSeat) party.sides[targetSeat] = cloneSideState(state.rival)
  party.turnEnded = false
  party.targetLocked = false
  state.counterPrompt = null

  const eliminated = new Set(party.eliminated ?? [])
  for (const seat of party.order) {
    const side = party.sides[seat]
    if (!side || side.crowd <= 0) eliminated.add(seat)
  }
  party.eliminated = [...eliminated]
  const alive = party.order.filter(
    (seat) => !eliminated.has(seat) && (party.sides?.[seat]?.crowd ?? 0) > 0,
  )

  if (alive.length <= 1) {
    const winnerSeat = alive[0] ?? null
    party.winnerSeat = winnerSeat
    party.activeSeat = null
    party.targetSeat = null
    state.winnerSeat = winnerSeat
    state.winner = winnerSeat ? (winnerSeat === 'host' ? 'player' : 'rival') : 'draw'
    state.phase = 'over'
    pushLog(
      state,
      winnerSeat
        ? `${party.seats.find((seat) => seat.seat === winnerSeat)?.name ?? 'THE LAST MIC'} TAKES THE CROWN.`
        : 'THE CROWD IS GONE. THE ROOM GOES DARK.',
      'gold',
    )
    return
  }

  const currentIndex = Math.max(0, party.order.indexOf(activeSeat))
  let nextIndex = currentIndex
  for (let step = 1; step <= party.order.length; step += 1) {
    const candidate = (currentIndex + step) % party.order.length
    if (!eliminated.has(party.order[candidate])) {
      nextIndex = candidate
      break
    }
  }
  const nextSeat = party.order[nextIndex]
  if (!nextSeat) return

  if (nextIndex <= currentIndex) {
    state.round += 1
    resolveEra(state)
    if (state.round > CURFEW_ROUND) {
      const ranked = alive
        .map((seat) => ({ seat, crowd: party.sides?.[seat]?.crowd ?? 0 }))
        .sort((a, b) => b.crowd - a.crowd)
      const top = ranked[0]
      const tied = ranked.length > 1 && ranked[1]?.crowd === top?.crowd
      const winnerSeat = tied ? null : top?.seat ?? null
      party.winnerSeat = winnerSeat
      party.activeSeat = null
      party.targetSeat = null
      state.winnerSeat = winnerSeat
      state.winner = winnerSeat ? (winnerSeat === 'host' ? 'player' : 'rival') : 'draw'
      state.phase = 'over'
      pushLog(
        state,
        party.format === 'fatal-4'
          ? 'CURFEW. THE HOUSE LIGHTS COME UP ON FOUR CORNERS.'
          : 'CURFEW. THE HOUSE LIGHTS COME UP ON THREE MICS.',
        'gold',
      )
      return
    }
  }

  let nextTarget: string | null = null
  for (let step = 1; step < party.order.length; step += 1) {
    const candidate = party.order[(nextIndex + step) % party.order.length]
    if (candidate !== nextSeat && !eliminated.has(candidate)) {
      nextTarget = candidate
      break
    }
  }
  if (!nextTarget) nextTarget = alive.find((seat) => seat !== nextSeat) ?? null
  if (!nextTarget) return

  const activeSide = party.sides[nextSeat]
  const targetSide = party.sides[nextTarget]
  if (!activeSide || !targetSide) return
  party.turnIndex = nextIndex
  party.activeSeat = nextSeat
  party.targetSeat = nextTarget
  state.player = cloneSideState(activeSide)
  state.rival = cloneSideState(targetSide)
  state.player.name = party.seats.find((seat) => seat.seat === nextSeat)?.name ?? state.player.name
  state.rival.name = party.seats.find((seat) => seat.seat === nextTarget)?.name ?? state.rival.name
  state.phase = 'player'
  state.rivalActions = 0
  state.winner = null
  state.winnerSeat = null
  beginTurnFor(state, 'player')
  party.sides[nextSeat] = cloneSideState(state.player)
  party.sides[nextTarget] = cloneSideState(state.rival)
  pushLog(
    state,
    `${party.format === 'fatal-4' ? 'FATAL 4' : 'TRIPLE THREAT'} · ${state.player.name.toUpperCase()} ON THE MIC · TARGET ${state.rival.name.toUpperCase()}`,
    'gold',
  )
}

/**
 * Remove a disconnected seat from a free-for-all without treating the whole
 * room as one team. The leaver's corner is marked eliminated; the remaining
 * corners keep playing, and the normal last-crowd-standing rules decide the
 * winner if only one corner is left.
 */
export function dropFreeForAllSeat(state: BattleState, seat: string): boolean {
  const party = state.party
  if (
    !party ||
    !party.sides ||
    (party.format !== 'triple-threat' && party.format !== 'fatal-4') ||
    !party.order.includes(seat)
  ) {
    return false
  }
  const eliminated = new Set(party.eliminated ?? [])
  if (eliminated.has(seat)) return false
  eliminated.add(seat)
  party.eliminated = [...eliminated]
  party.departed = [...new Set([...(party.departed ?? []), seat])]
  const leavingSide = party.sides[seat]
  if (leavingSide) leavingSide.crowd = 0

  const activeSeat = party.activeSeat
  if (activeSeat === seat) {
    state.player.crowd = 0
    party.sides[seat] = cloneSideState(state.player)
    advanceTripleTurn(state, seat)
    return true
  }

  if (party.targetSeat === seat) {
    const nextTarget =
      party.order.find(
        (candidate) =>
          candidate !== activeSeat &&
          !eliminated.has(candidate) &&
          (party.sides?.[candidate]?.crowd ?? 0) > 0,
      ) ?? null
    party.targetSeat = nextTarget
    party.targetLocked = false
    if (nextTarget && party.sides?.[nextTarget]) {
      state.rival = cloneSideState(party.sides[nextTarget])
      state.rival.name =
        party.seats.find((entry) => entry.seat === nextTarget)?.name ?? state.rival.name
    }
  }

  const alive = party.order.filter(
    (candidate) => !eliminated.has(candidate) && (party.sides?.[candidate]?.crowd ?? 0) > 0,
  )
  if (alive.length <= 1) advanceTripleTurn(state, activeSeat ?? seat)
  return true
}

function bestAffordable(side: SideState, era: 1 | 2 | 3): string | null {
  const options = side.hand
    .map((id) => ({ id, artist: getArtist(id) }))
    .filter((entry) => entry.artist.cost <= side.hype)
  if (options.length === 0) return null
  options.sort((a, b) => {
    const aValue = a.artist.bars + a.artist.effects.reduce((s, e) => s + (e.kind === 'heal' || e.kind === 'shield' ? e.value * 0.6 : 0), 0)
    const bValue = b.artist.bars + b.artist.effects.reduce((s, e) => s + (e.kind === 'heal' || e.kind === 'shield' ? e.value * 0.6 : 0), 0)
    return bValue - aValue
  })
  const pick = options[Math.floor(Math.random() * Math.min(2, options.length))]
  void era
  return pick.id
}

function rivalMoveOpportunity(state: BattleState): boolean {
  if (Math.random() > 0.28) return false
  if (state.rival.attacksThisTurn >= MAX_ATTACKS_PER_TURN) return false
  const ready = state.rival.stage.filter((card) => !card.actedThisTurn)
  for (const card of ready) {
    const affordable = card.moves
      .map((id) => moveById(id))
      .filter((move): move is Move => move !== undefined && moveHypeCost(move) <= state.rival.hype && (!isAttackMove(move) || state.rival.attacksThisTurn < MAX_ATTACKS_PER_TURN))
    if (affordable.length === 0) continue
    const move = affordable[Math.floor(Math.random() * affordable.length)]
    if (!move) continue
    const targetUid = pickTargetForAI(state)
    useMoveFor(state, 'rival', card.uid, move.id, targetUid)
    state.rivalActions += 1
    state.tick += 1
    return true
  }
  return false
}

function rivalTick(state: BattleState) {
  if (state.phase !== 'rival' || state.counterPrompt) return
  const meta = DIFFICULTY_META[state.difficulty]
  if (state.rival.skipNextAction > 0) {
    state.rival.skipNextAction -= 1
    state.rivalActions += 1
    pushLog(state, 'THE HEADLINER’S SET IS SKIPPED. THE TURN CLOCK STILL RUNS.', 'good')
    state.tick += 1
    return
  }
  if (state.rivalActions >= meta.actions) {
    endRivalTurn(state)
    return
  }

  if (rivalMoveOpportunity(state)) return

  const crews = availableCrews(state.rival.stage)
  const wantsFeature =
    !state.rival.featureUsed &&
    crews.length > 0 &&
    Math.random() < (state.difficulty === 'LEGEND' ? 0.8 : state.difficulty === 'HEADLINER' ? 0.6 : 0.35)
  if (wantsFeature) {
    const crew = crews.sort(
      (a, b) => crewCount(state.rival.stage, b) - crewCount(state.rival.stage, a),
    )[0]
    rivalFeature(state, crew)
    return
  }

  const encoreTarget = state.rival.stage.find((card) => !card.encore)
  if (state.rival.encoreCharges > 0 && encoreTarget && Math.random() < 0.45) {
    rivalEncore(state, encoreTarget.uid)
    return
  }

  const artistId = bestAffordable(state.rival, state.era)
  if (!artistId) {
    endRivalTurn(state)
    return
  }

  let replaceUid: string | undefined
  if (state.rival.stage.length >= state.stageSlots) {
    const weakest = [...state.rival.stage].sort(
      (a, b) => effectiveBars(a.artistId, a.encore, state.era) - effectiveBars(b.artistId, b.encore, state.era),
    )[0]
    if (weakest && effectiveBars(artistId, false, state.era) + 1 < effectiveBars(weakest.artistId, weakest.encore, state.era)) {
      endRivalTurn(state)
      return
    }
    replaceUid = weakest?.uid
  }

  state.rivalActions += 1
  playCardFor(state, 'rival', artistId, replaceUid, pickTargetForAI(state))
  state.tick += 1
  syncObjectives(state)
}

function rivalFeature(state: BattleState, crew: Crew) {
  if (state.rival.featureUsed || state.rival.attacksThisTurn >= MAX_ATTACKS_PER_TURN) return
  const members = state.rival.stage.filter((card) => getArtist(card.artistId).crew === crew)
  if (members.length < 2) return
  members.forEach((member) => {
    performanceFor(state.rival, member.artistId).uses += 1
  })
  const damage = featureDamage(state.rival.stage, crew, state.era)
  state.rival.featureUsed = true
  state.rival.features += 1
  state.rival.attacksThisTurn = MAX_ATTACKS_PER_TURN
  state.rival.stage = state.rival.stage.map((member) => ({ ...member, actedThisTurn: true }))
  state.rivalActions += 1
  state.rival.hype = Math.min(HYPE_CAP, state.rival.hype + 1 + state.modifiers.featureHype)
  pushCinematic(state, {
    kind: 'rival-feature',
    title: 'FEATURE VERSE',
    subtitle: crew,
    detail: 'The Headliner brings out the crew.',
    value: damage,
    artistIds: members.map((card) => card.artistId),
    crew,
  })
  pushLog(state, `HEADLINER FEATURE VERSE — ${crew} — ${damage} DAMAGE · THEIR ATTACK IS CLOSED`, 'bad')
  pushAnnouncer(state, 'feature', 'rival')
  resolveAttack(state, 'rival', damage, {
    targetUid: pickTargetForAI(state),
    artistId: members[0].artistId,
    source: `${crew} FEATURE`,
    attackerUid: members[0].uid,
    canCounter: true,
    announce: false,
  })
  state.tick += 1
  checkWinner(state)
}

function rivalEncore(state: BattleState, uid: string) {
  if (state.rival.encoreCharges < 1 || state.rival.attacksThisTurn >= MAX_ATTACKS_PER_TURN) return
  const card = state.rival.stage.find((entry) => entry.uid === uid)
  if (!card || card.encore) return
  performanceFor(state.rival, card.artistId).uses += 1
  state.rival.encoreCharges -= 1
  state.rival.encores += 1
  state.rival.attacksThisTurn += 1
  state.rivalActions += 1
  const artist = getArtist(card.artistId)
  state.rival.stage = state.rival.stage.map((entry) =>
    entry.uid === uid ? { ...entry, encore: true, actedThisTurn: true } : entry,
  )
  const hit = computePlayDamage(
    state.rival.stage.filter((entry) => entry.uid !== uid),
    card.artistId,
    true,
    state.era,
  )
  if (artist.battle.passive.kind === 'encore') {
    houseRuleHealCard(state, 'rival', card, 2)
  }
  pushCinematic(state, {
    kind: 'rival-encore',
    title: 'ENCORE',
    subtitle: artist.encore.name,
    detail: artist.encore.line,
    value: hit.total,
    artistIds: [artist.id],
  })
  pushLog(state, `HEADLINER ENCORE — ${artist.encore.name} — ${hit.total} DAMAGE`, 'bad')
  pushAnnouncer(state, 'encore', 'rival')
  resolveAttack(state, 'rival', hit.total, {
    targetUid: pickTargetForAI(state),
    artistId: card.artistId,
    source: artist.encore.name,
    attackerUid: card.uid,
    canCounter: true,
    announce: false,
  })
  if (state.modifiers.encoreCrowd > 0) {
    state.rival.crowd = Math.min(
      state.rival.maxCrowd,
      state.rival.crowd + state.modifiers.encoreCrowd,
    )
  }
  applyEffects(state, 'rival', card.artistId, true)
  state.tick += 1
  checkWinner(state)
  if (hit.total >= 8 && state.phase === 'rival' && !state.winner) {
    pushLog(state, 'THE HEADLINER ENCORE CLOSES THE TURN.', 'bad')
    endRivalTurn(state)
  }
  syncObjectives(state)
}

type SideScopedAction = { side?: 'player' | 'rival' }

export type BattleAction = SideScopedAction &
  (
  | { type: 'PLAY_CARD'; artistId: string; replaceUid?: string; targetUid?: string }
  | { type: 'USE_MOVE'; uid: string; moveId: string; targetUid?: string }
  | { type: 'DRAW_CRATE' }
  | { type: 'USE_SPECIAL'; uid: string; targetUid?: string; artistId?: string }
  | { type: 'REVIVE'; targetUid?: string }
  | { type: 'BENCH'; uid: string }
  | { type: 'ENCORE'; uid: string; targetUid?: string }
  | { type: 'FEATURE'; crew: Crew; targetUid?: string }
  | { type: 'END_TURN' }
  | { type: 'SPEND_ADVISOR' }
  | { type: 'RIVAL_TICK' }
  | { type: 'COUNTER'; mode: 'clapback' | 'take' | 'rewind' }
  | { type: 'DISMISS_CINEMATIC' }
  )

function resolveCounter(
  state: BattleState,
  defenderSide: 'player' | 'rival',
  mode: 'clapback' | 'take' | 'rewind',
) {
  const prompt = state.counterPrompt
  if (!prompt) return
  state.counterPrompt = null
  const defender = sideOf(state, defenderSide)
  const attackerSide = other(defenderSide)
  const attacker = sideOf(state, attackerSide)
  const defenderLabel = defenderSide === 'player' ? 'YOU' : defender.name.toUpperCase()

  if (mode === 'rewind' && prompt.canRewind) {
    const rewind = hasRewind(defender, state.round)
    const source = prompt.attackerUid
      ? attacker.stage.find((card) => card.uid === prompt.attackerUid)
      : undefined
    if (rewind && source) {
      defender.specialHand = defender.specialHand.filter((card) => card.uid !== rewind.uid)
      defender.specialDiscard.push(rewind.cardId)
      pushLog(
        state,
        defenderSide === 'player'
          ? 'TURNTABLE REWIND — THE HIT SPINS BACK.'
          : `${defenderLabel} REWINDS THE HIT.`,
        defenderSide === 'player' ? 'gold' : 'bad',
      )
      pushAnnouncer(state, 'rewind', defenderSide)
      resolveAttack(state, defenderSide, prompt.damage, {
        targetUid: source.uid,
        artistId: source.artistId,
        source: 'TURNTABLE REWIND',
        reflected: true,
        ignoreDefense: false,
        canCounter: false,
        announce: false,
      })
      checkWinner(state)
      return
    }
  }

  const damage = mode === 'clapback' ? Math.ceil(prompt.damage / 2) : prompt.damage
  if (mode === 'clapback' && defender.counters > 0) {
    defender.counters -= 1
    defender.hype = Math.min(HYPE_CAP, defender.hype + 1)
    pushAnnouncer(state, 'counter', defenderSide)
    pushLog(state, `CLAPBACK! ${prompt.source} CUT TO ${damage} DAMAGE. +1 HYPE.`, 'gold')
  } else {
    pushLog(state, `${defenderLabel} TAKE ${damage} FROM ${prompt.source}.`, defenderSide === 'player' ? 'bad' : 'good')
  }
  resolveAttack(state, attackerSide, damage, {
    targetUid: prompt.targetUid,
    artistId: prompt.artistId,
    source: prompt.source,
    attackerUid: prompt.attackerUid,
    canCounter: false,
    announce: false,
  })
  checkWinner(state)
}

function drawCrate(
  state: BattleState,
  side: 'player' | 'rival',
  options: { free?: boolean } = {},
): boolean {
  const actor = sideOf(state, side)
  if (hasHouseModifier(state, 'crate-lockdown')) return false
  if (state.phase !== side || actor.specialHand.length >= CRATE_HAND_LIMIT) return false
  if (actor.crate.length === 0) return false
  if (!options.free && actor.hype < CRATE_HYPE_COST) return false
  const drawn = drawWeightedCrate(actor.crate)
  if (!drawn.cardId) return false
  if (!options.free) actor.hype -= CRATE_HYPE_COST
  actor.crate = drawn.crate
  const def = crateCard(drawn.cardId)
  const costLabel = options.free ? 'BONUS DRAW' : `${CRATE_HYPE_COST} HYPE`
  const existing = actor.specialHand.find((card) => card.cardId === drawn.cardId)
  if (existing && canStackCrate(def)) {
    existing.stacks = Math.min(3, (existing.stacks ?? 1) + 1)
    actor.crateDraws += 1
    state.lastCrateDraw = { side, card: existing, stacked: true }
    pushAnnouncer(state, isRareCrate(def.rarity) ? 'crate_rare' : 'crate', side)
    pushLog(state, `CRATE — ${def.name} STACKS ×${existing.stacks} · ${costLabel}.`, 'gold')
    return true
  }
  const card: CrateHandCard = {
    uid: `crate-${state.idSeq++}`,
    cardId: drawn.cardId,
    drawnRound: state.round,
    stacks: 1,
  }
  actor.specialHand.push(card)
  actor.crateDraws += 1
  state.lastCrateDraw = { side, card }
  pushAnnouncer(state, isRareCrate(def.rarity) ? 'crate_rare' : 'crate', side)
  pushLog(state, `CRATE — ${def.name} (${def.rarity}) DRAWN · ${costLabel}.`, 'gold')
  return true
}

function reviveFromBackstage(
  state: BattleState,
  side: 'player' | 'rival',
  targetUid?: string,
): boolean {
  const actor = sideOf(state, side)
  if (actor.stage.length >= state.stageSlots) return false
  const backstage = targetUid
    ? actor.backstage.find((card) => card.uid === targetUid)
    : actor.backstage[0]
  if (!backstage) return false
  const cost = backstageRecallCost(backstage)
  if (actor.hype < cost) return false
  actor.hype -= cost
  const festivalRevival = state.festival?.modifier === 'crate-city-revival' && !actor.festivalRevivalHypeUsed
  actor.backstage = actor.backstage.filter((card) => card.uid !== backstage.uid)
  const badges = badgeTiersFor(state, side, backstage.artistId)
  const personalArtist = Boolean(getArtist(backstage.artistId).personal)
  let restoredHp = backstage.maxHp
  let restLine = 'RETURNS AT FULL HP'
  if (personalArtist) {
    if (actor.personalRests < 3) {
      actor.personalRests += 1
      restoredHp = Math.max(backstage.hp, Math.ceil(backstage.maxHp * 0.5))
      restLine = `PERSONAL REST ${actor.personalRests}/3 · RETURNS AT ${restoredHp} HP`
    } else {
      restoredHp = backstage.hp
      restLine = `RESTS 3/3 USED · RETURNS AT ${restoredHp} HP`
    }
  }
  const recalled = makeStageCard(
    backstage.uid,
    backstage.artistId,
    backstage.level,
    backstage.moves,
    state.round,
    badges,
  )
  recalled.comebackBonus = badges.veteran ?? 0
  actor.stage.push({
    ...recalled,
    hp: restoredHp,
    maxHp: backstage.maxHp,
    actedThisTurn: true,
    entranceUsed: true,
  })
  actor.revives += 1
  if (
    hasHouseModifier(state, 'backstage-bounce') &&
    state.houseRuleRuntime &&
    !state.houseRuleRuntime.backstageBounceUsed[side]
  ) {
    state.houseRuleRuntime.backstageBounceUsed[side] = true
    const beforeBounce = actor.hype
    actor.hype = Math.min(HYPE_CAP, actor.hype + 2)
    pushHouseRuleEvent(
      state,
      'backstage-bounce',
      'BACKSTAGE BOUNCE!',
      `First revival of the match: +${actor.hype - beforeBounce} Hype.`,
      side,
    )
    pushLog(state, `BACKSTAGE BOUNCE — FIRST REVIVAL +${actor.hype - beforeBounce} HYPE.`, 'gold')
  }
  if (festivalRevival) {
    actor.festivalRevivalHypeUsed = true
    actor.hype = Math.min(HYPE_CAP, actor.hype + 1)
    pushLog(state, 'THE COMEBACK CALL — +1 BONUS HYPE.', 'gold')
  }
  pushAnnouncer(state, 'revival', side)
  pushLog(
    state,
    `CALL BACK ON STAGE — ${getArtist(backstage.artistId).name} · ${restLine} · ${cost} HYPE.`,
    'gold',
  )
  if (recalled.comebackBonus > 0) {
    pushLog(
      state,
      `COMEBACK ARTIST — NEXT HIT +${recalled.comebackBonus} DAMAGE.`,
      'gold',
    )
  }
  return true
}

function useSpecialCard(
  state: BattleState,
  side: 'player' | 'rival',
  uid: string,
  targetUid?: string,
  artistId?: string,
) {
  const actor = sideOf(state, side)
  const opponent = sideOf(state, other(side))
  if (state.phase !== side) return
  const handCard = actor.specialHand.find((card) => card.uid === uid)
  if (!handCard || !canUseSpecial(handCard, state.round)) return
  const def = crateCard(handCard.cardId)
  const stacks = Math.max(1, handCard.stacks ?? 1)
  const damagingCrate = (def.category === 'elemental' || def.category === 'debuff') && Boolean(def.power)
  if (damagingCrate && actor.attacksThisTurn >= MAX_ATTACKS_PER_TURN) return

  if (def.category === 'rewind') return

  if (def.category === 'spotlight') {
    const deckIndex = artistId ? actor.deck.indexOf(artistId) : -1
    const discardIndex = artistId ? actor.discard.indexOf(artistId) : -1
    if (!artistId || (deckIndex < 0 && discardIndex < 0)) return
    if (deckIndex >= 0) {
      actor.deck.splice(deckIndex, 1)
    } else {
      actor.discard.splice(discardIndex, 1)
    }
    actor.hand.push(artistId)
    actor.specialHand = actor.specialHand.filter((card) => card.uid !== uid)
    actor.specialDiscard.push(handCard.cardId)
    pushLog(state, `ARTIST SPOTLIGHT — ${getArtist(artistId).name} JOINS YOUR HAND.`, 'gold')
    return
  }

  if (def.category === 'callback') {
    if (!reviveFromBackstage(state, side, targetUid)) return
    actor.specialHand = actor.specialHand.filter((card) => card.uid !== uid)
    actor.specialDiscard.push(handCard.cardId)
    return
  }

  if (def.category === 'skip') {
    opponent.skipNextAction = Math.min(2, opponent.skipNextAction + stacks)
    actor.specialHand = actor.specialHand.filter((card) => card.uid !== uid)
    actor.specialDiscard.push(handCard.cardId)
    pushLog(state, `SKIP THE SET — THE HEADLINER LOSES ${stacks} ACTION${stacks > 1 ? 'S' : ''}.`, 'gold')
    return
  }

  if (def.category === 'power' && handCard.cardId === 'hype-3') {
    actor.hype = Math.min(HYPE_CAP, actor.hype + 3 * stacks)
    actor.specialHand = actor.specialHand.filter((card) => card.uid !== uid)
    actor.specialDiscard.push(handCard.cardId)
    pushLog(state, `HOUSE LIGHTS — HYPE +${3 * stacks}.`, 'gold')
    return
  }

  const target = actor.stage.find((card) => card.uid === targetUid) ?? actor.stage[0]
  if (def.category === 'power') {
    if (!target) return
    target.nextAttackBonus += (def.power ?? 0) * stacks
    actor.specialHand = actor.specialHand.filter((card) => card.uid !== uid)
    actor.specialDiscard.push(handCard.cardId)
    pushLog(state, `${def.name} — ${getArtist(target.artistId).name} NEXT ATTACK +${(def.power ?? 0) * stacks}.`, 'gold')
    return
  }
  if (def.category === 'shield') {
    if (!target) return
    target.shield += (def.shield ?? 0) * stacks
    actor.specialHand = actor.specialHand.filter((card) => card.uid !== uid)
    actor.specialDiscard.push(handCard.cardId)
    pushLog(state, `${def.name} — ${getArtist(target.artistId).name} +${(def.shield ?? 0) * stacks} SHIELD.`, 'good')
    return
  }
  if (def.category === 'untouchable') {
    if (!target) return
    target.untouchableUntil = state.round + stacks
    addStatus(target, 'light', 1, stacks)
    actor.specialHand = actor.specialHand.filter((card) => card.uid !== uid)
    actor.specialDiscard.push(handCard.cardId)
    pushLog(state, `UNTOUCHABLE HEADLINER — ${getArtist(target.artistId).name} IS PROTECTED FOR ${stacks} TURN${stacks > 1 ? 'S' : ''}.`, 'gold')
    return
  }
  if (def.category === 'heal') {
    if (!target) return
    const amount = festivalHealAmount(state, (def.heal ?? 0) * stacks)
    const { restored } = houseRuleHealCard(state, side, target, amount)
    actor.specialHand = actor.specialHand.filter((card) => card.uid !== uid)
    actor.specialDiscard.push(handCard.cardId)
    if (restored >= SIGNIFICANT_HEAL) pushAnnouncer(state, 'healing', 'player')
    const shownHeal = hasHouseModifier(state, 'golden-hooks') ? restored : amount
    pushLog(state, `${def.name} — ${getArtist(target.artistId).name} RESTORES ${shownHeal} HP.`, 'good')
    return
  }
  if (def.category === 'ability') {
    if (def.target === 'ally' && !target) return
    if (target) {
      target.nextAttackBonus += (def.power ?? 0) * stacks
      target.shield += (def.shield ?? 0) * stacks
      if (def.heal) {
        const baseHeal = festivalHealAmount(state, def.heal * stacks)
        const { restored } = houseRuleHealCard(state, side, target, baseHeal)
        if (restored >= SIGNIFICANT_HEAL) pushAnnouncer(state, 'healing', 'player')
      }
    }
    if (def.hype) actor.hype = Math.min(HYPE_CAP, actor.hype + def.hype * stacks)
    if (def.crowd) applyCrowdDamage(state, other(side), def.crowd * stacks)
    if (def.crowdHeal) actor.crowd = Math.min(actor.maxCrowd, actor.crowd + def.crowdHeal * stacks)
    if (def.encore) actor.encoreCharges = Math.min(3, actor.encoreCharges + def.encore * stacks)
    actor.specialHand = actor.specialHand.filter((card) => card.uid !== uid)
    actor.specialDiscard.push(handCard.cardId)
    pushLog(state, `${def.name} — ${def.description}`, 'gold')
    checkWinner(state)
    return
  }
  if (def.category === 'debuff') {
    const enemy = opponent.stage.find((card) => card.uid === targetUid) ?? opponent.stage[0]
    if (def.power && enemy) {
      resolveAttack(state, side, def.power * stacks, {
        targetUid: enemy.uid,
        artistId: enemy.artistId,
        source: def.name,
        canCounter: false,
        spread: 1,
        announce: false,
      })
    }
    if (def.drain) opponent.hype = Math.max(0, opponent.hype - def.drain * stacks)
    if (def.weaken && enemy) addStatus(enemy, 'weaken', def.weaken * stacks, 2)
    actor.specialHand = actor.specialHand.filter((card) => card.uid !== uid)
    actor.specialDiscard.push(handCard.cardId)
    pushLog(state, `${def.name} — ${def.description}`, 'gold')
    if (def.power) completeCrateAttack(state, side, def)
    checkWinner(state)
    return
  }
  if (def.category === 'elemental') {
    applyCrateElement(state, side, def, targetUid, stacks)
    actor.specialHand = actor.specialHand.filter((card) => card.uid !== uid)
    actor.specialDiscard.push(handCard.cardId)
    completeCrateAttack(state, side, def)
    checkWinner(state)
  }
}

function crateAttackHype(def: CrateDefinition): number {
  if (!((def.category === 'elemental' || def.category === 'debuff') && def.power)) return 0
  return def.rarity === 'RARE' || def.rarity === 'EPIC' || def.rarity === 'LEGENDARY' ? 2 : 1
}

function completeCrateAttack(state: BattleState, side: 'player' | 'rival', def: CrateDefinition) {
  const actor = sideOf(state, side)
  actor.attacksThisTurn += 1
  actor.attacksUsed += 1
  const hype = crateAttackHype(def)
  if (hype > 0) {
    actor.hype = Math.min(HYPE_CAP, actor.hype + hype)
    pushLog(state, `${def.name} — ATTACK HYPE +${hype}.`, 'gold')
  }
}

function applyCrateElement(
  state: BattleState,
  side: 'player' | 'rival',
  def: CrateDefinition,
  targetUid?: string,
  stacks = 1,
) {
  const actor = sideOf(state, side)
  const opponent = sideOf(state, other(side))
  const power = (def.power ?? 0) * stacks
  const target =
    opponent.stage.find((card) => card.uid === targetUid) ?? opponent.stage[0] ?? null
  if (!target) {
    const lost = applyCrowdDamage(state, other(side), power)
    state.lastHit = { side: other(side), value: lost, nonce: state.idSeq++ }
    pushLog(state, `${def.name} — ${power} TO THE CROWD.`, side === 'player' ? 'good' : 'bad')
    return
  }
  resolveAttack(state, side, power, {
    targetUid: target.uid,
    artistId: target.artistId,
    source: def.name,
    canCounter: false,
    spread: 1,
    announce: true,
    element: def.element,
  })
  const element = def.element
  if (!target || target.hp <= 0) return
  if (element === 'FIRE') addStatus(target, 'burn', 2, def.turns ?? 2)
  if (element === 'POISON') addStatus(target, 'poison', 2, def.turns ?? 3)
  if (element === 'ICE') addStatus(target, 'chill', 2, 2)
  if (element === 'ELECTRICITY') {
    opponent.hype = Math.max(0, opponent.hype - 2)
    addStatus(target, 'weaken', 1, 2)
  }
  if (element === 'WIND') {
    const second = opponent.stage.find((card) => card.uid !== target.uid)
    if (second) {
      resolveAttack(state, side, power, {
        targetUid: second.uid,
        artistId: second.artistId,
        source: `${def.name} · SECOND WAVE`,
        canCounter: false,
        spread: 1,
      })
    }
    applyCrowdDamage(state, 'rival', 1)
  }
  if (element === 'EARTH') {
    const ally = actor.stage[0]
    if (ally) ally.shield += 3
  }
  if (element === 'WATER') {
    const ally = actor.stage[0]
    if (ally) {
      const { restored } = houseRuleHealCard(state, side, ally, festivalHealAmount(state, 3))
      if (restored >= SIGNIFICANT_HEAL) pushAnnouncer(state, 'healing', side)
    }
  }
  if (element === 'LIGHT') {
    const ally = actor.stage[0]
    if (ally) ally.shield += 2
  }
  pushLog(state, `${def.name} — ${def.description}`, 'gold')
}

export function battleReducer(state: BattleState, action: BattleAction): BattleState {
  if (action.type === 'DISMISS_CINEMATIC') {
    return { ...state, cinematics: state.cinematics.slice(1), tick: state.tick + 1 }
  }

  if (action.type === 'COUNTER') {
    if (!state.counterPrompt) return state
    const next = clone(state)
    resolveCounter(next, action.side ?? 'player', action.mode)
    next.tick += 1
    return syncObjectives(next)
  }

  if (state.phase === 'over') return state

  const next = clone(state)
  next.tick += 1
  const side = action.side ?? 'player'
  const actor = sideOf(next, side)

  switch (action.type) {
    case 'RIVAL_TICK': {
      if (state.online) return state
      if (state.phase !== 'rival' || state.counterPrompt || state.cinematics.length > 0) return state
      rivalTick(next)
      return syncObjectives(next)
    }
    case 'PLAY_CARD': {
      if (state.phase !== side) return state
      const artist = getArtist(action.artistId)
      if (!actor.hand.includes(action.artistId)) return state
      if (actor.hype < artist.cost) return state
      if (actor.stage.length >= state.stageSlots && !action.replaceUid) return state
      if (action.replaceUid && !actor.stage.some((card) => card.uid === action.replaceUid)) {
        return state
      }
      playCardFor(next, side, action.artistId, action.replaceUid, action.targetUid)
      return syncObjectives(next)
    }
    case 'USE_MOVE': {
      if (state.phase !== side) return state
      useMoveFor(next, side, action.uid, action.moveId, action.targetUid)
      return syncObjectives(next)
    }
    case 'DRAW_CRATE': {
      if (state.phase !== side || state.counterPrompt || state.cinematics.length > 0) return state
      if (!drawCrate(next, side) && hasHouseModifier(next, 'crate-lockdown')) return state
      return syncObjectives(next)
    }
    case 'USE_SPECIAL': {
      if (state.phase !== side) return state
      useSpecialCard(next, side, action.uid, action.targetUid, action.artistId)
      return syncObjectives(next)
    }
    case 'REVIVE': {
      if (state.phase !== side) return state
      if (!reviveFromBackstage(next, side, action.targetUid)) return state
      return syncObjectives(next)
    }
    case 'BENCH': {
      if (state.phase !== side) return state
      const card = actor.stage.find((entry) => entry.uid === action.uid)
      if (!card) return state
      const refund = cutHypeRefund(getArtist(card.artistId).cost)
      const cutArtist = getArtist(card.artistId)
      actor.stage = actor.stage.filter((entry) => entry.uid !== action.uid)
      if (cutArtist.personal) {
        actor.backstage = [
          ...actor.backstage,
          {
            uid: card.uid,
            artistId: card.artistId,
            encore: card.encore,
            level: card.level,
            hp: card.hp,
            maxHp: card.maxHp,
            moves: [...card.moves],
          },
        ]
      } else {
        actor.discard.push(card.artistId)
      }
      actor.hype = Math.min(HYPE_CAP, actor.hype + refund)
      pushLog(
        next,
        `${side === 'player' ? 'YOU' : actor.name.toUpperCase()} CUT ${cutArtist.name} FROM THE SET${cutArtist.personal ? ' · BACKSTAGE' : ''} · +${refund} HYPE.`,
        'neutral',
      )
      return syncObjectives(next)
    }
    case 'ENCORE': {
      if (state.phase !== side) return state
      if (actor.encoreCharges < 1 || actor.attacksThisTurn >= MAX_ATTACKS_PER_TURN) return state
      const card = actor.stage.find((entry) => entry.uid === action.uid)
      if (!card || card.encore) return state
      const cardArtist = getArtist(card.artistId)
      // Career artists can always transform. Their encore is part of the
      // personal card's battle kit, not a chapter-locked reward.
      const surcharge = festivalAttackHypeSurcharge(next, card.artistId)
      if (actor.hype < surcharge) return state
      const artist = cardArtist
      performanceFor(actor, card.artistId).uses += 1
      performanceFor(actor, card.artistId).encores += 1
      actor.encoreCharges -= 1
      actor.hype = Math.max(0, actor.hype - surcharge)
      actor.encores += 1
      actor.attacksThisTurn += 1
      actor.attacksUsed += 1
      actor.stage = actor.stage.map((entry) =>
        entry.uid === action.uid ? { ...entry, encore: true, actedThisTurn: true } : entry,
      )
      const encoreCard = actor.stage.find((entry) => entry.uid === action.uid)
      if (encoreCard) gainSpecialCharge(encoreCard)
      if (artist.battle.passive.kind === 'encore') {
        houseRuleHealCard(next, side, card, 2)
      }
      const stageWithout = actor.stage.filter((entry) => entry.uid !== action.uid)
      const hit = computePlayDamage(stageWithout, card.artistId, true, state.era)
      let encoreDamage = hit.total
      const houseRuntime = next.houseRuleRuntime
      if (
        hasHouseModifier(next, 'encore-spotlight') &&
        houseRuntime &&
        !houseRuntime.encoreSpotlightUsed[side]
      ) {
        houseRuntime.encoreSpotlightUsed[side] = true
        encoreDamage = Math.max(1, Math.round(encoreDamage * 1.1))
        pushHouseRuleEvent(
          next,
          'encore-spotlight',
          'ENCORE SPOTLIGHT!',
          `First Encore of the match: +${Math.max(1, encoreDamage - hit.total)} damage.`,
          side,
        )
      }
      pushCinematic(next, {
        kind: side === 'player' ? 'encore' : 'rival-encore',
        title: 'ENCORE',
        subtitle: artist.encore.name,
        detail: artist.encore.line,
        value: encoreDamage,
        artistIds: [artist.id],
      })
      pushLog(next, `ENCORE TRANSFORMATION — ${artist.encore.name}`, 'gold')
      pushAnnouncer(next, 'encore', side)
      resolveAttack(next, side, encoreDamage, {
        targetUid: action.targetUid,
        artistId: card.artistId,
        source: artist.encore.name,
        attackerUid: card.uid,
        canCounter: false,
        announce: false,
      })
      if (next.modifiers.encoreCrowd > 0) {
        actor.crowd = Math.min(actor.maxCrowd, actor.crowd + next.modifiers.encoreCrowd)
      }
      applyEffects(next, side, card.artistId, true)
      checkWinner(next)
      if (encoreDamage >= 8 && next.phase === side && !next.winner) {
        pushLog(next, 'THE ENCORE CLOSES YOUR TURN.', 'gold')
        endTurnFor(next, side)
      }
      return syncObjectives(next)
    }
    case 'FEATURE': {
      if (state.phase !== side) return state
      if (actor.featureUsed || actor.attacksThisTurn >= MAX_ATTACKS_PER_TURN) return state
      const members = actor.stage.filter(
        (card) => getArtist(card.artistId).crew === action.crew,
      )
      if (members.length < 2) return state
      const baseDamage = featureDamage(actor.stage, action.crew, state.era)
      const damage = next.festival?.modifier === 'chrome-feature' ? Math.round(baseDamage * 1.1) : baseDamage
      actor.featureUsed = true
      actor.features += 1
      actor.attacksThisTurn = MAX_ATTACKS_PER_TURN
      actor.attacksUsed += 1
      actor.stage = actor.stage.map((member) => ({ ...member, actedThisTurn: true }))
      actor.hype = Math.min(HYPE_CAP, actor.hype + 1 + next.modifiers.featureHype)
      members.forEach((member) => {
        performanceFor(actor, member.artistId).uses += 1
        performanceFor(actor, member.artistId).features += 1
        gainSpecialCharge(member)
      })
      pushCinematic(next, {
        kind: side === 'player' ? 'feature' : 'rival-feature',
        title: 'FEATURE VERSE',
        subtitle: action.crew,
        detail: `${members
          .map((card) => `${getArtist(card.artistId).name} ${effectiveBars(card.artistId, card.encore, state.era)}B`)
          .join(' + ')} → ${damage} DAMAGE`,
        value: damage,
        artistIds: members.map((card) => card.artistId),
        crew: action.crew,
      })
      pushLog(
        next,
        `FEATURE VERSE — ${action.crew} — ${damage} DAMAGE. +${1 + next.modifiers.featureHype} HYPE · IT IS YOUR ONLY ATTACK THIS TURN.`,
        'gold',
      )
      pushAnnouncer(next, 'feature', side)
      resolveAttack(next, side, damage, {
        targetUid: action.targetUid,
        artistId: members[0].artistId,
        source: `${action.crew} FEATURE`,
        attackerUid: members[0].uid,
        canCounter: false,
        announce: false,
      })
      checkWinner(next)
      return syncObjectives(next)
    }
    case 'SPEND_ADVISOR': {
      // Advice is a local single-player assist. The reducer is the final
      // authority, so a stale render or double-click can never overdraw it.
      if (next.online || side !== 'player') return state
      if (next.phase !== 'player' || next.counterPrompt || next.cinematics.length > 0) return state
      if (next.advisorCharges <= 0) return state
      next.advisorCharges -= 1
      return next
    }
    case 'END_TURN': {
      if (state.phase !== side) return state
      // A defensive window belongs to the turn it interrupted: never let the
      // attacker skip past it, or the defender's prompt strands the match.
      if (state.counterPrompt) return state
      pushLog(
        next,
        side === 'player'
          ? state.online
            ? `${actor.name.toUpperCase()} DROPS THE MIC.`
            : 'YOU DROP THE MIC. THE HEADLINER ANSWERS.'
          : `${actor.name.toUpperCase()} DROPS THE MIC. THE ROOM ANSWERS.`,
        'neutral',
      )
      endTurnFor(next, side)
      return syncObjectives(next)
    }
    default:
      return state
  }
}

export function difficultyLabel(difficulty: Difficulty): string {
  return DIFFICULTY_META[difficulty].label
}

export function rivalCrowdFor(difficulty: Difficulty): number {
  return DIFFICULTY_META[difficulty].crowd
}

export function crateDefinition(card: CrateHandCard): CrateDefinition {
  return crateCard(card.cardId)
}

export function elementLabel(element: Element): string {
  return element
}
