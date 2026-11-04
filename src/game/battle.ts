import type { ArtistProgress, Crew, Difficulty, Element, Genre, Move, StatusKind } from './types'
import { ARTISTS, getArtist } from './roster'
import { DEFAULT_DECK } from './settings'
import {
  CRATE_HAND_LIMIT,
  crateCard,
  createCrateDeck,
  drawWeightedCrate,
  type CrateDefinition,
} from './crate'
import {
  battleStatsFor,
  defaultLoadout,
  loadoutFor,
  moveById,
  progressFor,
} from './moves'

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
  moves: string[]
}

export interface BackstageCard {
  uid: string
  artistId: string
  encore: boolean
  level: number
  maxHp: number
  moves: string[]
}

export interface CrateHandCard {
  uid: string
  cardId: string
  drawnRound: number
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
  crateDraws: number
  koes: number
  skipNextAction: number
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
}

export interface LastCrateDraw {
  side: 'player' | 'rival'
  card: CrateHandCard
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
  difficulty: Difficulty
  rivalActions: number
  tick: number
  idSeq: number
  lastHit: { side: 'player' | 'rival'; value: number; nonce: number } | null
  lastCrateDraw: LastCrateDraw | null
  lastDefeat: LastDefeat | null
  lastMove: LastMove | null
  playerProgress: Record<string, ArtistProgress>
}

export interface BattleConfig {
  deck: string[]
  difficulty: Difficulty
  progress?: Record<string, ArtistProgress>
}

export const HYPE_CAP = 12
export const STAGE_SLOTS = 5
export const DECK_SLOTS = 26
export const HAND_SIZE = 5
export const CURFEW_ROUND = 12

const DIFFICULTY_META: Record<
  Difficulty,
  { crowd: number; regen: number; actions: number; interrupt: number; label: string; level: number }
> = {
  OPENING: { crowd: 64, regen: 2, actions: 2, interrupt: 0.34, label: 'OPENING ACT', level: 1 },
  HEADLINER: { crowd: 72, regen: 2, actions: 3, interrupt: 0.5, label: 'HEADLINER', level: 2 },
  LEGEND: { crowd: 78, regen: 2, actions: 3, interrupt: 0.66, label: 'LEGEND', level: 3 },
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
): StageCard {
  const artist = getArtist(artistId)
  const stats = battleStatsFor(artist, level)
  return {
    uid,
    artistId,
    encore: false,
    level,
    hp: stats.hp,
    maxHp: stats.hp,
    shield: 0,
    statuses: [],
    actedThisTurn: false,
    enteredRound: round,
    untouchableUntil: 0,
    nextAttackBonus: 0,
    defenseBonus: 0,
    guardRound: 0,
    entranceUsed: false,
    moves,
  }
}

function playerLevel(progress: Record<string, ArtistProgress> | undefined, artistId: string) {
  return progressFor(progress, artistId).level
}

function playerLoadout(progress: Record<string, ArtistProgress> | undefined, artistId: string) {
  return loadoutFor(progress, artistId)
}

function makeSide(name: string, deck: string[], crowd: number): SideState {
  return {
    name,
    crowd,
    maxCrowd: crowd,
    hype: 4,
    shield: 0,
    hand: [],
    deck: shuffle(deck),
    discard: [],
    stage: [],
    backstage: [],
    featureUsed: false,
    encoreCharges: 1,
    counters: 2,
    played: 0,
    dealt: 0,
    features: 0,
    encores: 0,
    crate: createCrateDeck(),
    specialHand: [],
    specialDiscard: [],
    revives: 0,
    crateDraws: 0,
    koes: 0,
    skipNextAction: 0,
  }
}

export function createBattle(config: BattleConfig): BattleState {
  const meta = DIFFICULTY_META[config.difficulty]
  const playerDeck = config.deck.length === DECK_SLOTS ? config.deck : DEFAULT_DECK
  const rivalDeck = shuffle(ARTISTS.map((a) => a.id)).slice(0, DECK_SLOTS)
  const player = makeSide('YOU', playerDeck, 72)
  const rival = makeSide('THE HEADLINER', rivalDeck, meta.crowd)
  player.hand = player.deck.splice(0, HAND_SIZE)
  rival.hand = rival.deck.splice(0, HAND_SIZE)
  seedOpeningActs(player, 'player', config.progress)
  seedOpeningActs(rival, 'rival', undefined, meta.level)
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
    playerProgress: config.progress ?? {},
  }
  pushLog(state, 'THE OPENING ACTS ARE LIVE. FILL THE STAGE.', 'gold')
  return state
}

function seedOpeningActs(
  side: SideState,
  prefix: string,
  progress?: Record<string, ArtistProgress>,
  difficultyLevel = 1,
) {
  for (let index = 0; index < 2; index += 1) {
    const artistId = side.deck.shift()
    if (!artistId) return
    const level = prefix === 'player' ? playerLevel(progress, artistId) : difficultyLevel
    const moves =
      prefix === 'player' ? playerLoadout(progress, artistId) : defaultLoadout(artistId)
    side.stage.push(makeStageCard(`${prefix}-opener-${index}`, artistId, level, moves))
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

function clone(state: BattleState): BattleState {
  const cloneSide = (side: SideState): SideState => ({
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
  })
  return {
    ...state,
    player: cloneSide(state.player),
    rival: cloneSide(state.rival),
    log: [...state.log],
    cinematics: [...state.cinematics],
    counterPrompt: state.counterPrompt ? { ...state.counterPrompt } : null,
  }
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

export function featureDamage(stage: StageCard[], crew: Crew, era: 1 | 2 | 3): number {
  const members = stage.filter((card) => getArtist(card.artistId).crew === crew)
  const encoreMembers = members.filter((card) => card.encore).length
  return 5 + members.length * 2 + encoreMembers + eraBonus(era)
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

function hasRewind(side: SideState, round: number): CrateHandCard | undefined {
  return side.specialHand.find((card) => card.cardId === 'rewind' && card.drawnRound < round)
}

function canUseSpecial(card: CrateHandCard, round: number): boolean {
  return card.drawnRound < round
}

function applyCrowdDamage(state: BattleState, side: 'player' | 'rival', amount: number): number {
  if (amount <= 0) return 0
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
  const artist = getArtist(card.artistId)
  actor.stage = actor.stage.filter((entry) => entry.uid !== card.uid)
  actor.backstage = [
    ...actor.backstage,
    {
      uid: card.uid,
      artistId: card.artistId,
      encore: card.encore,
      level: card.level,
      maxHp: card.maxHp,
      moves: [...card.moves],
    },
  ]
  actor.koes += 1
  applyCrowdDamage(state, side, 2)
  state.lastDefeat = { side, artistId: card.artistId, nonce: state.idSeq++ }
  pushLog(state, `${artist.name} IS DEFEATED. ${reason.toUpperCase()} · BACKSTAGE.`, side === 'player' ? 'bad' : 'good')
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
}

interface AttackResult {
  held: boolean
  dealt: number
  defeated: boolean
}

function resolveAttack(state: BattleState, attackerSide: 'player' | 'rival', rawInput: number, opts: AttackOptions): AttackResult {
  const defenderSide = other(attackerSide)
  const defender = sideOf(state, defenderSide)
  const aggressor = sideOf(state, attackerSide)
  let raw = Math.max(0, rawInput)
  let interrupted = false

  if (opts.canCounter && attackerSide === 'rival' && !state.counterPrompt) {
    const rewind = hasRewind(state.player, state.round)
    const promptNeeded = raw >= 5 || Boolean(rewind)
    if (promptNeeded && (state.player.counters > 0 || rewind)) {
      state.counterPrompt = {
        id: state.idSeq++,
        damage: raw,
        artistId: opts.artistId,
        source: opts.source,
        targetUid: opts.targetUid ?? defender.stage[0]?.uid ?? null,
        attackerUid: opts.attackerUid ?? null,
        canRewind: Boolean(rewind) && Boolean(opts.attackerUid),
      }
      pushLog(state, `INCOMING: ${opts.source.toUpperCase()} — ${raw} DAMAGE. DEFENSIVE WINDOW.`, 'bad')
      return { held: true, dealt: 0, defeated: false }
    }
  }

  const target =
    defender.stage.find((card) => card.uid === opts.targetUid) ??
    (defender.stage.length > 0 ? defender.stage[0] : null)

  if (!target) {
    const lost = applyCrowdDamage(state, defenderSide, raw + (opts.crowdSplash ?? 0))
    aggressor.dealt += lost
    state.lastHit = { side: defenderSide, value: lost, nonce: state.idSeq++ }
    pushLog(
      state,
      `${attackerSide === 'player' ? 'YOUR SET' : 'THE HEADLINER'} · ${opts.source.toUpperCase()} — ${raw + (opts.crowdSplash ?? 0)} TO THE CROWD`,
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

  if (damage > 0 && artist.battle.passive.kind === 'guard' && target.guardRound !== state.round) {
    damage = Math.max(0, damage - 1)
    target.guardRound = state.round
    pushLog(state, `${artist.battle.passive.name} SOAKS 1 DAMAGE.`, 'neutral')
  }

  const absorbed = Math.min(target.shield, damage)
  target.shield -= absorbed
  const hpDamage = Math.max(0, damage - absorbed)
  target.hp = Math.max(0, target.hp - hpDamage)
  aggressor.dealt += hpDamage
  const pressure = opts.noPressure
    ? 0
    : Math.max(1, Math.floor(damage / 3)) + (opts.crowdSplash ?? 0)
  const attackerCard = opts.attackerUid ? aggressor.stage.find((card) => card.uid === opts.attackerUid) : undefined
  const passivePressure = attackerCard && getArtist(attackerCard.artistId).battle.passive.kind === 'pressure' ? 1 : 0
  const crowdLost = applyCrowdDamage(state, defenderSide, pressure + passivePressure)
  state.lastHit = { side: defenderSide, value: crowdLost, nonce: state.idSeq++ }

  let defeated = false
  if (target.hp <= 0) {
    defeated = true
    defeatArtist(state, defenderSide, target, 'The room moves on')
  }

  pushLog(
    state,
    `${attackerSide === 'player' ? 'YOUR SET' : 'THE HEADLINER'} · ${opts.source.toUpperCase()} — ${damage} TO ${artist.name}${
      absorbed > 0 ? ` (${absorbed} SHIELDED)` : ''
    }${interrupted ? ' · INTERRUPTED' : ''}${defeated ? ' · DEFEATED' : ''}`,
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
        actor.crowd = Math.min(actor.maxCrowd, actor.crowd + effect.value)
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
  const progress = side === 'player' ? state.playerProgress : undefined
  const actor = sideOf(state, side)
  const artist = getArtist(artistId)
  if (actor.hype < artist.cost) return
  if (!actor.hand.includes(artistId)) return
  if (actor.stage.length >= STAGE_SLOTS && !replaceUid) return

  actor.hype -= artist.cost
  const handIndex = actor.hand.indexOf(artistId)
  actor.hand = actor.hand.filter((_, idx) => idx !== handIndex)

  if (replaceUid) {
    const replaced = actor.stage.find((card) => card.uid === replaceUid)
    if (replaced) {
      actor.discard.push(replaced.artistId)
      actor.stage = actor.stage.filter((card) => card.uid !== replaceUid)
      pushLog(state, `${side === 'player' ? 'YOU CUT' : 'HEADLINER CUTS'} ${getArtist(replaced.artistId).name}`, 'neutral')
    }
  }

  const level =
    side === 'player'
      ? playerLevel(progress, artistId)
      : DIFFICULTY_META[state.difficulty].level
  const moves =
    side === 'player'
      ? playerLoadout(progress, artistId)
      : defaultLoadout(artistId)
  const stageCard = makeStageCard(`${side}-${state.idSeq++}`, artistId, level, moves, state.round)
  const stageBefore = actor.stage
  const hit = computePlayDamage(stageBefore, artistId, false, state.era)
  actor.stage = [...actor.stage, stageCard]
  actor.played += 1

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
  if (!card.moves.includes(moveId)) return undefined
  return moveById(moveId)
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
  for (const effect of move.effects) {
    if (effect.damage !== undefined) continue
    if (effect.heal !== undefined) {
      const healTarget = move.target === 'ally' || move.target === 'self' ? target ?? card : card
      healTarget.hp = Math.min(healTarget.maxHp, healTarget.hp + effect.heal)
      pushLog(state, `${getArtist(healTarget.artistId).name} RESTORES ${effect.heal} HP.`, side === 'player' ? 'good' : 'bad')
    }
    if (effect.shield !== undefined) {
      const shieldTarget = move.target === 'ally' || move.target === 'self' ? target ?? card : card
      shieldTarget.shield += effect.shield
      pushLog(state, `${getArtist(shieldTarget.artistId).name} GAINS ${effect.shield} SHIELD.`, 'neutral')
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
  if (!move || actor.hype < move.cost) return

  actor.hype -= move.cost
  card.actedThisTurn = true
  const target = moveTarget(state, side, card, move, targetUid)
  const artist = getArtist(card.artistId)
  const stats = battleStatsFor(artist, card.level)
  let raw = move.power + Math.floor(stats.attack / 2) + eraBonus(state.era) + card.nextAttackBonus
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

  if (move.power > 0) {
    resolveAttack(state, side, raw, {
      targetUid: move.target === 'enemy' ? target?.uid : undefined,
      artistId: card.artistId,
      source: move.name,
      attackerUid: card.uid,
      defensePierce: move.pierce ?? 0,
      canCounter: side === 'rival',
    })
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
        })
      }
    }
  }

  applyMoveEffects(state, side, card, move, target)
  state.lastMove = {
    side,
    artistId: card.artistId,
    moveId: move.id,
    name: move.name,
    element: move.element,
    nonce: state.idSeq++,
  }
  pushLog(state, `${side === 'player' ? 'YOU' : 'HEADLINER'} USE ${move.name} — ${move.cost} HYPE.`, side === 'player' ? 'good' : 'bad')
  checkWinner(state)
}

function beginPlayerTurn(state: BattleState) {
  state.phase = 'player'
  tickStatuses(state, 'player')
  if (checkWinner(state)) return
  state.player.hype = Math.min(HYPE_CAP, state.player.hype + DIFFICULTY_META[state.difficulty].regen)
  state.player.shield = 0
  state.player.featureUsed = false
  state.player.stage = state.player.stage.map((card) => ({ ...card, actedThisTurn: false }))
  state.counterPrompt = null
  drawTo(state.player, HAND_SIZE)
  state.rivalActions = 0
  pushLog(state, `ROUND ${state.round} · YOUR TURN`, 'neutral')
}

function beginRivalTurn(state: BattleState) {
  state.phase = 'rival'
  tickStatuses(state, 'rival')
  if (checkWinner(state)) return
  state.rivalActions = 0
  state.rival.hype = Math.min(HYPE_CAP, state.rival.hype + DIFFICULTY_META[state.difficulty].regen)
  state.rival.shield = 0
  state.rival.featureUsed = false
  state.rival.stage = state.rival.stage.map((card) => ({ ...card, actedThisTurn: false }))
  drawTo(state.rival, HAND_SIZE)
  pushLog(state, `THE HEADLINER TAKES THE STAGE.`, 'bad')
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

function endRivalTurn(state: BattleState) {
  const nextRound = state.round + 1
  state.round = nextRound
  state.rivalActions = 0
  resolveEra(state)
  if (checkWinner(state)) return
  beginPlayerTurn(state)
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
  const ready = state.rival.stage.filter((card) => !card.actedThisTurn)
  for (const card of ready) {
    const affordable = card.moves
      .map((id) => moveById(id))
      .filter((move): move is Move => move !== undefined && move.cost <= state.rival.hype)
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
  if (state.rival.stage.length >= STAGE_SLOTS) {
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
}

function rivalFeature(state: BattleState, crew: Crew) {
  if (state.rival.featureUsed) return
  const members = state.rival.stage.filter((card) => getArtist(card.artistId).crew === crew)
  if (members.length < 2) return
  const damage = featureDamage(state.rival.stage, crew, state.era)
  state.rival.featureUsed = true
  state.rival.features += 1
  state.rivalActions += 1
  state.rival.hype = Math.min(HYPE_CAP, state.rival.hype + 1)
  pushCinematic(state, {
    kind: 'rival-feature',
    title: 'FEATURE VERSE',
    subtitle: crew,
    detail: 'The Headliner brings out the crew.',
    value: damage,
    artistIds: members.map((card) => card.artistId),
    crew,
  })
  pushLog(state, `HEADLINER FEATURE VERSE — ${crew} — ${damage} DAMAGE`, 'bad')
  resolveAttack(state, 'rival', damage, {
    targetUid: pickTargetForAI(state),
    artistId: members[0].artistId,
    source: `${crew} FEATURE`,
    attackerUid: members[0].uid,
    canCounter: true,
  })
  state.tick += 1
  checkWinner(state)
}

function rivalEncore(state: BattleState, uid: string) {
  if (state.rival.encoreCharges < 1) return
  const card = state.rival.stage.find((entry) => entry.uid === uid)
  if (!card || card.encore) return
  state.rival.encoreCharges -= 1
  state.rival.encores += 1
  state.rivalActions += 1
  const artist = getArtist(card.artistId)
  state.rival.stage = state.rival.stage.map((entry) =>
    entry.uid === uid ? { ...entry, encore: true } : entry,
  )
  const hit = computePlayDamage(
    state.rival.stage.filter((entry) => entry.uid !== uid),
    card.artistId,
    true,
    state.era,
  )
  if (artist.battle.passive.kind === 'encore') {
    card.hp = Math.min(card.maxHp, card.hp + 2)
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
  resolveAttack(state, 'rival', hit.total, {
    targetUid: pickTargetForAI(state),
    artistId: card.artistId,
    source: artist.encore.name,
    attackerUid: card.uid,
    canCounter: true,
  })
  applyEffects(state, 'rival', card.artistId, true)
  state.tick += 1
  checkWinner(state)
}

export type BattleAction =
  | { type: 'PLAY_CARD'; artistId: string; replaceUid?: string; targetUid?: string }
  | { type: 'USE_MOVE'; uid: string; moveId: string; targetUid?: string }
  | { type: 'DRAW_CRATE' }
  | { type: 'USE_SPECIAL'; uid: string; targetUid?: string; artistId?: string }
  | { type: 'BENCH'; uid: string }
  | { type: 'ENCORE'; uid: string; targetUid?: string }
  | { type: 'FEATURE'; crew: Crew; targetUid?: string }
  | { type: 'END_TURN' }
  | { type: 'RIVAL_TICK' }
  | { type: 'COUNTER'; mode: 'clapback' | 'take' | 'rewind' }
  | { type: 'DISMISS_CINEMATIC' }

function resolveCounter(state: BattleState, mode: 'clapback' | 'take' | 'rewind') {
  const prompt = state.counterPrompt
  if (!prompt) return
  state.counterPrompt = null

  if (mode === 'rewind' && prompt.canRewind) {
    const rewind = hasRewind(state.player, state.round)
    const attacker = prompt.attackerUid
      ? state.rival.stage.find((card) => card.uid === prompt.attackerUid)
      : undefined
    if (rewind && attacker) {
      state.player.specialHand = state.player.specialHand.filter((card) => card.uid !== rewind.uid)
      state.player.specialDiscard.push(rewind.cardId)
      pushLog(state, 'TURNTABLE REWIND — THE HIT SPINS BACK.', 'gold')
      resolveAttack(state, 'player', prompt.damage, {
        targetUid: attacker.uid,
        artistId: attacker.artistId,
        source: 'TURNTABLE REWIND',
        reflected: true,
        ignoreDefense: false,
        canCounter: false,
      })
      checkWinner(state)
      return
    }
  }

  const damage = mode === 'clapback' ? Math.ceil(prompt.damage / 2) : prompt.damage
  if (mode === 'clapback' && state.player.counters > 0) {
    state.player.counters -= 1
    state.player.hype = Math.min(HYPE_CAP, state.player.hype + 1)
    pushLog(state, `CLAPBACK! ${prompt.source} CUT TO ${damage} DAMAGE. +1 HYPE.`, 'gold')
  } else {
    pushLog(state, `YOU TAKE ${damage} FROM ${prompt.source}.`, 'bad')
  }
  resolveAttack(state, 'rival', damage, {
    targetUid: prompt.targetUid,
    artistId: prompt.artistId,
    source: prompt.source,
    canCounter: false,
  })
  checkWinner(state)
}

function drawCrate(state: BattleState) {
  if (state.phase !== 'player' || state.player.specialHand.length >= CRATE_HAND_LIMIT) return
  const drawn = drawWeightedCrate(state.player.crate)
  if (!drawn.cardId) return
  state.player.crate = drawn.crate
  const card: CrateHandCard = {
    uid: `crate-${state.idSeq++}`,
    cardId: drawn.cardId,
    drawnRound: state.round,
  }
  state.player.specialHand.push(card)
  state.player.crateDraws += 1
  state.lastCrateDraw = { side: 'player', card }
  const def = crateCard(card.cardId)
  pushLog(state, `CRATE — ${def.name} (${def.rarity}) DRAWN. THE TURN IS SPENT.`, 'gold')
  beginRivalTurn(state)
}

function useSpecialCard(
  state: BattleState,
  uid: string,
  targetUid?: string,
  artistId?: string,
) {
  if (state.phase !== 'player') return
  const handCard = state.player.specialHand.find((card) => card.uid === uid)
  if (!handCard || !canUseSpecial(handCard, state.round)) return
  const def = crateCard(handCard.cardId)
  const actor = state.player
  const opponent = state.rival

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
    if (actor.revives >= 1 || actor.stage.length >= STAGE_SLOTS || actor.hype < 4) return
    const backstage = actor.backstage.find((card) => card.uid === targetUid)
    if (!backstage) return
    actor.hype -= 4
    actor.backstage = actor.backstage.filter((card) => card.uid !== backstage.uid)
    actor.stage.push({
      ...makeStageCard(backstage.uid, backstage.artistId, backstage.level, backstage.moves, state.round),
      hp: backstage.maxHp,
      maxHp: backstage.maxHp,
      actedThisTurn: true,
      entranceUsed: true,
    })
    actor.revives += 1
    actor.specialHand = actor.specialHand.filter((card) => card.uid !== uid)
    actor.specialDiscard.push(handCard.cardId)
    pushLog(state, `CALL BACK ON STAGE — ${getArtist(backstage.artistId).name} RETURNS AT FULL HP.`, 'gold')
    return
  }

  if (def.category === 'skip') {
    opponent.skipNextAction = Math.min(1, opponent.skipNextAction + 1)
    actor.specialHand = actor.specialHand.filter((card) => card.uid !== uid)
    actor.specialDiscard.push(handCard.cardId)
    pushLog(state, 'SKIP THE SET — THE HEADLINER LOSES THEIR NEXT STANDARD ACTION.', 'gold')
    return
  }

  if (def.category === 'power' && handCard.cardId === 'hype-3') {
    actor.hype = Math.min(HYPE_CAP, actor.hype + 3)
    actor.specialHand = actor.specialHand.filter((card) => card.uid !== uid)
    actor.specialDiscard.push(handCard.cardId)
    pushLog(state, 'HOUSE LIGHTS — HYPE +3.', 'gold')
    return
  }

  const target = actor.stage.find((card) => card.uid === targetUid) ?? actor.stage[0]
  if (def.category === 'power') {
    if (!target) return
    target.nextAttackBonus += def.power ?? 0
    actor.specialHand = actor.specialHand.filter((card) => card.uid !== uid)
    actor.specialDiscard.push(handCard.cardId)
    pushLog(state, `${def.name} — ${getArtist(target.artistId).name} NEXT ATTACK +${def.power ?? 0}.`, 'gold')
    return
  }
  if (def.category === 'shield') {
    if (!target) return
    target.shield += def.shield ?? 0
    actor.specialHand = actor.specialHand.filter((card) => card.uid !== uid)
    actor.specialDiscard.push(handCard.cardId)
    pushLog(state, `${def.name} — ${getArtist(target.artistId).name} +${def.shield ?? 0} SHIELD.`, 'good')
    return
  }
  if (def.category === 'untouchable') {
    if (!target) return
    target.untouchableUntil = state.round + 1
    addStatus(target, 'light', 1, 1)
    actor.specialHand = actor.specialHand.filter((card) => card.uid !== uid)
    actor.specialDiscard.push(handCard.cardId)
    pushLog(state, `UNTOUCHABLE HEADLINER — ${getArtist(target.artistId).name} IS PROTECTED.`, 'gold')
    return
  }
  if (def.category === 'elemental') {
    applyCrateElement(state, def, targetUid)
    actor.specialHand = actor.specialHand.filter((card) => card.uid !== uid)
    actor.specialDiscard.push(handCard.cardId)
    checkWinner(state)
  }
}

function applyCrateElement(state: BattleState, def: CrateDefinition, targetUid?: string) {
  const opponent = state.rival
  const target =
    opponent.stage.find((card) => card.uid === targetUid) ?? opponent.stage[0] ?? null
  if (!target) {
    const lost = applyCrowdDamage(state, 'rival', def.power ?? 0)
    state.lastHit = { side: 'rival', value: lost, nonce: state.idSeq++ }
    pushLog(state, `${def.name} — ${def.power ?? 0} TO THE CROWD.`, 'good')
    return
  }
  resolveAttack(state, 'player', def.power ?? 0, {
    targetUid: target.uid,
    artistId: target.artistId,
    source: def.name,
    canCounter: false,
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
      resolveAttack(state, 'player', def.power ?? 0, {
        targetUid: second.uid,
        artistId: second.artistId,
        source: `${def.name} · SECOND WAVE`,
        canCounter: false,
      })
    }
    applyCrowdDamage(state, 'rival', 1)
  }
  if (element === 'EARTH') {
    const ally = state.player.stage[0]
    if (ally) ally.shield += 3
  }
  if (element === 'WATER') {
    const ally = state.player.stage[0]
    if (ally) ally.hp = Math.min(ally.maxHp, ally.hp + 3)
  }
  if (element === 'LIGHT') {
    const ally = state.player.stage[0]
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
    resolveCounter(next, action.mode)
    next.tick += 1
    return next
  }

  if (state.phase === 'over') return state

  const next = clone(state)
  next.tick += 1

  switch (action.type) {
    case 'RIVAL_TICK': {
      if (state.phase !== 'rival' || state.counterPrompt || state.cinematics.length > 0) return state
      rivalTick(next)
      return next
    }
    case 'PLAY_CARD': {
      if (state.phase !== 'player') return state
      const artist = getArtist(action.artistId)
      if (!state.player.hand.includes(action.artistId)) return state
      if (state.player.hype < artist.cost) return state
      if (state.player.stage.length >= STAGE_SLOTS && !action.replaceUid) return state
      if (action.replaceUid && !state.player.stage.some((card) => card.uid === action.replaceUid)) {
        return state
      }
      playCardFor(next, 'player', action.artistId, action.replaceUid, action.targetUid)
      return next
    }
    case 'USE_MOVE': {
      if (state.phase !== 'player') return state
      useMoveFor(next, 'player', action.uid, action.moveId, action.targetUid)
      return next
    }
    case 'DRAW_CRATE': {
      if (state.phase !== 'player' || state.counterPrompt || state.cinematics.length > 0) return state
      drawCrate(next)
      return next
    }
    case 'USE_SPECIAL': {
      if (state.phase !== 'player') return state
      useSpecialCard(next, action.uid, action.targetUid, action.artistId)
      return next
    }
    case 'BENCH': {
      if (state.phase !== 'player') return state
      const card = state.player.stage.find((entry) => entry.uid === action.uid)
      if (!card) return state
      next.player.stage = next.player.stage.filter((entry) => entry.uid !== action.uid)
      next.player.discard.push(card.artistId)
      pushLog(next, `YOU CUT ${getArtist(card.artistId).name} FROM THE SET.`, 'neutral')
      return next
    }
    case 'ENCORE': {
      if (state.phase !== 'player') return state
      if (state.player.encoreCharges < 1) return state
      const card = state.player.stage.find((entry) => entry.uid === action.uid)
      if (!card || card.encore) return state
      const artist = getArtist(card.artistId)
      next.player.encoreCharges -= 1
      next.player.encores += 1
      next.player.stage = next.player.stage.map((entry) =>
        entry.uid === action.uid ? { ...entry, encore: true } : entry,
      )
      if (artist.battle.passive.kind === 'encore') {
        card.hp = Math.min(card.maxHp, card.hp + 2)
      }
      const stageWithout = next.player.stage.filter((entry) => entry.uid !== action.uid)
      const hit = computePlayDamage(stageWithout, card.artistId, true, state.era)
      pushCinematic(next, {
        kind: 'encore',
        title: 'ENCORE',
        subtitle: artist.encore.name,
        detail: artist.encore.line,
        value: hit.total,
        artistIds: [artist.id],
      })
      pushLog(next, `ENCORE TRANSFORMATION — ${artist.encore.name}`, 'gold')
      resolveAttack(next, 'player', hit.total, {
        targetUid: action.targetUid,
        artistId: card.artistId,
        source: artist.encore.name,
        attackerUid: card.uid,
        canCounter: false,
      })
      applyEffects(next, 'player', card.artistId, true)
      checkWinner(next)
      return next
    }
    case 'FEATURE': {
      if (state.phase !== 'player') return state
      if (state.player.featureUsed) return state
      const members = next.player.stage.filter(
        (card) => getArtist(card.artistId).crew === action.crew,
      )
      if (members.length < 2) return state
      const damage = featureDamage(next.player.stage, action.crew, state.era)
      next.player.featureUsed = true
      next.player.features += 1
      next.player.hype = Math.min(HYPE_CAP, next.player.hype + 1)
      pushCinematic(next, {
        kind: 'feature',
        title: 'FEATURE VERSE',
        subtitle: action.crew,
        detail: members.map((card) => getArtist(card.artistId).name).join(' × '),
        value: damage,
        artistIds: members.map((card) => card.artistId),
        crew: action.crew,
      })
      pushLog(next, `FEATURE VERSE — ${action.crew} — ${damage} DAMAGE. +1 HYPE.`, 'gold')
      resolveAttack(next, 'player', damage, {
        targetUid: action.targetUid,
        artistId: members[0].artistId,
        source: `${action.crew} FEATURE`,
        attackerUid: members[0].uid,
        canCounter: false,
      })
      checkWinner(next)
      return next
    }
    case 'END_TURN': {
      if (state.phase !== 'player') return state
      pushLog(next, 'YOU DROP THE MIC. THE HEADLINER ANSWERS.', 'neutral')
      beginRivalTurn(next)
      return next
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
