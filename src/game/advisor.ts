import {
  CRATE_HYPE_COST,
  CURFEW_ROUND,
  MAX_ATTACKS_PER_TURN,
  availableCrews,
  backstageRecallCost,
  computePlayDamage,
  effectiveBars,
  eraBonus,
  featureDamage,
  type BattleState,
  type StageCard,
} from './battle'
import {
  SPECIAL_CHARGE_MAX,
  battleStatsFor,
  isAttackMove,
  moveById,
  moveHypeCost,
  moveEndsTurn,
  progressFor,
  specialMoveForArtist,
} from './moves'
import { getArtist } from './roster'
import type { AnnouncerEventName } from './announcer'
import type { Crew, Move, StatusKind } from './types'

/**
 * ASK DJ KICKIT only ever reads the same battlefield information a human can
 * see. It deliberately never touches the rival's hand or deck, and any future
 * draw from the player's deck is treated as unknown.
 */
export const ADVISOR_WEIGHTS = {
  damage: 1.35,
  shield: 0.7,
  healing: 1.15,
  crowd: 1.15,
  hype: 0.55,
  kill: 12,
  possibleKill: 5,
  tempo: 1.4,
  closeTurn: 2.4,
  body: 0.18,
  risk: 1,
  crowdWin: 28,
}

export type AdvisorKind = 'recommend' | 'evaluate' | 'plan'
export type AdvisorVerdict = 'STRONG MOVE' | 'RISKY MOVE' | 'WEAK MOVE'
export type AdvisorActionKind =
  | 'move'
  | 'special'
  | 'encore'
  | 'feature'
  | 'play'
  | 'draw'
  | 'revive'
  | 'end'

export interface AdvisorAction {
  id: string
  kind: AdvisorActionKind
  label: string
  detail: string
  cardUid?: string
  artistId?: string
  moveId?: string
  targetUid?: string
  allyTargetUid?: string
  replaceUid?: string
  crew?: Crew
  targetSide: 'enemy' | 'ally' | 'self' | 'none'
  cost: number
  attack: boolean
  closesTurn: boolean
}

export interface AdvisorEstimate {
  minDamage: number
  maxDamage: number
  expectedDamage: number
  shieldDamage: number
  hpDamage: number
  secondaryDamage: number
  kill: 'none' | 'possible' | 'likely'
  heal: number
  shield: number
  crowd: number
  crowdHeal?: number
  hype: number
  dot: number
  buffAttack: number
  buffDefense: number
  notes: string[]
}

export interface AdvisorScoredAction {
  action: AdvisorAction
  estimate: AdvisorEstimate
  score: number
  verdict: AdvisorVerdict
  reasons: string[]
}

export interface AdvisorResponse {
  kind: AdvisorKind
  verdict: AdvisorVerdict | null
  intro: string
  recommendation: string
  reason: string
  plan: string[]
  action: AdvisorAction | null
  uncertainty: string | null
  voiceEvent: AnnouncerEventName | null
  stateKey: string
}

interface DamageProjection {
  min: number
  max: number
  expected: number
  minHp: number
  maxHp: number
  expectedHp: number
  shield: number
  blocked: boolean
}

function artistName(artistId: string): string {
  return getArtist(artistId).name
}

function statusValue(card: StageCard, kind: StatusKind): number {
  return card.statuses.find((status) => status.kind === kind)?.value ?? 0
}

function moveSurcharge(state: BattleState, artistId: string, move: Move): number {
  if (!isAttackMove(move) || state.festival?.modifier !== 'subwoofer-bass') return 0
  return getArtist(artistId).crew === (state.festival.bassCrew ?? 'STATIC KINGS') ? 1 : 0
}

function legalMove(state: BattleState, card: StageCard, move: Move): boolean {
  if (state.phase !== 'player' || state.online || state.counterPrompt) return false
  if (card.actedThisTurn) return false
  const cost = moveHypeCost(move) + moveSurcharge(state, card.artistId, move)
  if (state.player.hype < cost) return false
  if (isAttackMove(move) && state.player.attacksThisTurn >= MAX_ATTACKS_PER_TURN) return false
  if (move.special) {
    if (!card.moves.includes(move.id) && !specialMoveForArtist(card.artistId)) return false
    if (card.level < (move.unlockLevel ?? 5)) return false
    if (card.specialUsed || card.specialCharge < SPECIAL_CHARGE_MAX) return false
  }
  if (!move.special && !card.moves.includes(move.id)) return false
  return true
}

function bestEnemyTarget(state: BattleState, targetUid?: string): StageCard | null {
  if (state.rival.stage.length === 0) return null
  return (
    state.rival.stage.find((card) => card.uid === targetUid) ??
    [...state.rival.stage].sort((a, b) => {
      const aEffective = a.hp + a.shield
      const bEffective = b.hp + b.shield
      if (aEffective !== bEffective) return aEffective - bEffective
      return a.hp - b.hp
    })[0] ??
    null
  )
}

function bestAllyTarget(state: BattleState, allyUid?: string): StageCard | null {
  if (state.player.stage.length === 0) return null
  return (
    state.player.stage.find((card) => card.uid === allyUid) ??
    [...state.player.stage].sort((a, b) => {
      const aMissing = a.maxHp - a.hp
      const bMissing = b.maxHp - b.hp
      if (aMissing !== bMissing) return bMissing - aMissing
      return a.hp - b.hp
    })[0] ??
    state.player.stage[0] ??
    null
  )
}

function actionId(parts: Array<string | number | undefined>): string {
  return parts.filter((part) => part !== undefined && part !== '').join(':')
}

function targetLabel(state: BattleState, action: AdvisorAction): string {
  if (action.targetSide === 'none' || action.targetSide === 'self') return ''
  if (action.targetSide === 'ally') {
    const card = state.player.stage.find((entry) => entry.uid === action.allyTargetUid)
    return card ? artistName(card.artistId) : ''
  }
  const card = bestEnemyTarget(state, action.targetUid)
  return card ? artistName(card.artistId) : 'THE CROWD'
}

export function describeAdvisorAction(state: BattleState, action: AdvisorAction): string {
  const target = targetLabel(state, action)
  switch (action.kind) {
    case 'move':
    case 'special':
      return `${action.label}${target ? ` → ${target}` : ''}`
    case 'play':
      return `${action.label}${target ? ` → ${target}` : ''}`
    case 'encore':
      return `${action.label}${target ? ` → ${target}` : ''}`
    case 'feature':
      return `${action.label}${target ? ` → ${target}` : ''}`
    case 'revive':
      return action.label
    case 'draw':
      return 'DRAW FROM THE CRATE'
    case 'end':
      return 'DROP THE MIC AND END THE TURN'
  }
}

export function listAdvisorActions(state: BattleState): AdvisorAction[] {
  if (state.online || state.phase !== 'player' || state.counterPrompt) return []
  const actions: AdvisorAction[] = []
  const player = state.player

  for (const card of player.stage) {
    const artist = getArtist(card.artistId)
    for (const id of card.moves) {
      const move = moveById(id)
      if (!move || !legalMove(state, card, move)) continue
      const enemy = bestEnemyTarget(state)
      const ally = bestAllyTarget(state)
      actions.push({
        id: actionId(['move', card.uid, move.id]),
        kind: move.special ? 'special' : 'move',
        label: `${artist.name} — ${move.name}`,
        detail: `${moveHypeCost(move) > 0 ? `${moveHypeCost(move)} HYPE` : 'FREE'} · ${move.type.toUpperCase()}`,
        cardUid: card.uid,
        artistId: card.artistId,
        moveId: move.id,
        targetUid: move.target === 'enemy' && enemy ? enemy.uid : undefined,
        allyTargetUid: move.target === 'ally' && ally ? ally.uid : undefined,
        targetSide: move.target === 'ally' ? 'ally' : move.target === 'enemy' ? 'enemy' : 'self',
        cost: moveHypeCost(move) + moveSurcharge(state, card.artistId, move),
        attack: isAttackMove(move),
        closesTurn: isAttackMove(move) && (moveEndsTurn(move) || projectedRaw(state, card, move) >= 8),
      })
    }

    const special = specialMoveForArtist(card.artistId)
    if (special && special.id !== card.moves.find((id) => id === special.id) && legalMove(state, card, special)) {
      const enemy = bestEnemyTarget(state)
      actions.push({
        id: actionId(['special', card.uid, special.id]),
        kind: 'special',
        label: `${artist.name} — ★ ${special.name}`,
        detail: `${SPECIAL_CHARGE_MAX}/${SPECIAL_CHARGE_MAX} SPOTLIGHT · SIGNATURE`,
        cardUid: card.uid,
        artistId: card.artistId,
        moveId: special.id,
        targetUid: enemy?.uid,
        targetSide: 'enemy',
        cost: moveHypeCost(special),
        attack: true,
        closesTurn: projectedRaw(state, card, special) >= 8,
      })
    }
  }

  const seenArtists = new Set<string>()
  for (const artistId of player.hand) {
    if (seenArtists.has(artistId)) continue
    seenArtists.add(artistId)
    const artist = getArtist(artistId)
    if (player.hype < artist.cost) continue
    let replaceUid: string | undefined
    if (player.stage.length >= state.stageSlots) {
      const weakest = [...player.stage].sort(
        (a, b) =>
          effectiveBars(a.artistId, a.encore, state.era) -
          effectiveBars(b.artistId, b.encore, state.era),
      )[0]
      if (!weakest) continue
      replaceUid = weakest.uid
    }
    actions.push({
      id: actionId(['play', artistId]),
      kind: 'play',
      label: replaceUid ? `SWAP IN ${artist.name}` : `PLAY ${artist.name}`,
      detail: `${artist.cost} HYPE · ${artist.bars} BARS · STAGE MOVE, NO ENTRY DAMAGE`,
      artistId,
      replaceUid,
      targetSide: 'none',
      cost: artist.cost,
      attack: false,
      closesTurn: false,
    })
  }

  for (const card of player.stage) {
    if (card.encore || player.encoreCharges < 1) continue
    if (player.attacksThisTurn >= MAX_ATTACKS_PER_TURN) continue
    const surcharge =
      state.festival?.modifier === 'subwoofer-bass' &&
      getArtist(card.artistId).crew === (state.festival.bassCrew ?? 'STATIC KINGS')
        ? 1
        : 0
    if (player.hype < surcharge) continue
    const artist = getArtist(card.artistId)
    const enemy = bestEnemyTarget(state)
    actions.push({
      id: actionId(['encore', card.uid]),
      kind: 'encore',
      label: `ENCORE — ${artist.encore.name}`,
      detail: `CALL THE ENCORE · ${artist.name} TRANSFORMS`,
      cardUid: card.uid,
      artistId: card.artistId,
      targetUid: enemy?.uid,
      targetSide: 'enemy',
      cost: 0,
      attack: true,
      closesTurn: computePlayDamage(
        player.stage.filter((entry) => entry.uid !== card.uid),
        card.artistId,
        true,
        state.era,
      ).total >= 8,
    })
  }

  if (!player.featureUsed && player.attacksThisTurn < MAX_ATTACKS_PER_TURN) {
    for (const crew of availableCrews(player.stage)) {
      const enemy = bestEnemyTarget(state)
      actions.push({
        id: actionId(['feature', crew]),
        kind: 'feature',
        label: `${crew} — FEATURE VERSE`,
        detail: `${featureDamage(player.stage, crew, state.era)} BASE DAMAGE · USES YOUR ATTACKS`,
        crew,
        targetUid: enemy?.uid,
        targetSide: 'enemy',
        cost: 0,
        attack: true,
        closesTurn: false,
      })
    }
  }

  if (player.stage.length < state.stageSlots && player.backstage.length > 0) {
    const options = [...player.backstage].sort(
      (a, b) => effectiveBars(b.artistId, b.encore, state.era) - effectiveBars(a.artistId, a.encore, state.era),
    )
    for (const card of options) {
      const cost = backstageRecallCost(card)
      if (player.hype < cost) continue
      actions.push({
        id: actionId(['revive', card.uid]),
        kind: 'revive',
        label: `CALL BACK ${artistName(card.artistId)}`,
        detail: `${cost} HYPE · RETURNS FROM BACKSTAGE`,
        cardUid: card.uid,
        artistId: card.artistId,
        targetSide: 'none',
        cost,
        attack: false,
        closesTurn: false,
      })
    }
  }

  if (
    !state.houseRules?.modifiers.includes('crate-lockdown') &&
    player.specialHand.length < 6 &&
    player.crate.length > 0 &&
    player.hype >= CRATE_HYPE_COST
  ) {
    actions.push({
      id: 'draw-crate',
      kind: 'draw',
      label: 'DRAW FROM THE CRATE',
      detail: `${CRATE_HYPE_COST} HYPE · UNKNOWN SPECIAL`,
      targetSide: 'none',
      cost: CRATE_HYPE_COST,
      attack: false,
      closesTurn: false,
    })
  }

  actions.push({
    id: 'end-turn',
    kind: 'end',
    label: 'DROP THE MIC',
    detail: 'END YOUR TURN',
    targetSide: 'none',
    cost: 0,
    attack: false,
    closesTurn: true,
  })
  return actions
}

function projectedRaw(state: BattleState, card: StageCard, move: Move): number {
  const artist = getArtist(card.artistId)
  const stats = battleStatsFor(artist, card.level)
  let raw =
    move.power +
    Math.floor(stats.attack / 2) +
    eraBonus(state.era) +
    card.nextAttackBonus +
    (move.special ? 2 : 0)
  raw = Math.max(0, raw - statusValue(card, 'chill') - statusValue(card, 'weaken'))
  return raw
}

function projectHit(
  state: BattleState,
  raw: number,
  target: StageCard,
  card: StageCard | null,
  pierce = 0,
  ignoreDefense = false,
): DamageProjection {
  if (raw <= 0) {
    return { min: 0, max: 0, expected: 0, minHp: 0, maxHp: 0, expectedHp: 0, shield: 0, blocked: false }
  }
  if (target.untouchableUntil > state.round) {
    return { min: 0, max: 0, expected: 0, minHp: 0, maxHp: 0, expectedHp: 0, shield: 0, blocked: true }
  }
  const targetArtist = getArtist(target.artistId)
  const stats = battleStatsFor(targetArtist, target.level)
  const defense = ignoreDefense
    ? 0
    : Math.max(0, Math.round((stats.defense + target.defenseBonus) * (1 - pierce)))
  const fortify = target.statuses.find((status) => status.kind === 'fortify')?.value ?? 0
  const comeback = card && !card.comebackUsed ? card.comebackBonus : 0
  const guard =
    targetArtist.battle.passive.kind === 'guard' && target.guardRound !== state.round ? 1 : 0
  const variance = 2
  const finish = (rolled: number) => {
    if (rolled <= 0) return 0
    let damage = Math.max(1, Math.round(rolled - defense)) + comeback
    damage = Math.max(0, damage - fortify - guard)
    return damage
  }
  const expected = finish(raw)
  const min = finish(Math.max(0, raw - variance))
  const max = finish(Math.round((raw + variance) * 1.25) + 1)
  const shield = Math.min(target.shield, expected)
  return {
    min,
    max,
    expected,
    minHp: Math.max(0, min - target.shield),
    maxHp: Math.max(0, max - target.shield),
    expectedHp: Math.max(0, expected - shield),
    shield,
    blocked: false,
  }
}

function statusFromEffects(effects: Move['effects'], target: StageCard | null): number {
  if (!target) return 0
  return effects.reduce((sum, effect) => {
    if (!effect.status || (effect.status !== 'burn' && effect.status !== 'poison')) return sum
    return sum + (effect.statusValue ?? 0) * (effect.statusTurns ?? 0)
  }, 0)
}

function addStatuses(
  effects: Move['effects'],
  target: StageCard | null,
  source: StageCard | null,
): Pick<AdvisorEstimate, 'buffDefense' | 'buffAttack' | 'notes'> {
  let buffDefense = 0
  let buffAttack = 0
  const notes: string[] = []
  for (const effect of effects) {
    if (effect.status === 'fortify' || effect.status === 'light') {
      buffDefense += effect.statusValue ?? 0
      notes.push(`${effect.status.toUpperCase()} ${effect.statusValue ?? 0}`)
    }
    if (effect.status === 'weaken' || effect.status === 'chill') {
      notes.push(`TARGET ${effect.status.toUpperCase()} ${effect.statusValue ?? 0}`)
    }
    if (effect.buffAttack) buffAttack += effect.buffAttack
    if (effect.buffDefense) buffDefense += effect.buffDefense
    if (effect.cleanse && (source?.statuses.length ?? 0) > 0) notes.push('CLEANSES STATUSES')
  }
  void target
  return { buffDefense, buffAttack, notes }
}

function estimateMove(
  state: BattleState,
  action: AdvisorAction,
  card: StageCard,
  move: Move,
): AdvisorEstimate {
  const target = bestEnemyTarget(state, action.targetUid)
  const enemy = target ?? null
  const support = bestAllyTarget(state, action.allyTargetUid) ?? card
  const raw = move.power > 0 ? projectedRaw(state, card, move) : 0
  const projection = enemy
    ? projectHit(state, raw, enemy, card, move.pierce ?? 0)
    : {
        min: 0,
        max: 0,
        expected: 0,
        minHp: 0,
        maxHp: 0,
        expectedHp: 0,
        shield: 0,
        blocked: false,
      }
  const extraHits = move.effects.find((effect) => effect.hits !== undefined)?.hits ?? 0
  let secondaryDamage = 0
  if (extraHits > 0 && enemy) {
    const other = state.rival.stage.find((entry) => entry.uid !== enemy.uid)
    if (other) {
      const otherHit = projectHit(state, raw, other, card, move.pierce ?? 0)
      secondaryDamage = otherHit.expectedHp * extraHits
    }
  }
  const strikes = move.effects.find((effect) => effect.strikes !== undefined)?.strikes ?? 1
  let strikeHp = 0
  let strikeShield = 0
  if (strikes > 1 && enemy) {
    let shieldLeft = Math.max(0, enemy.shield - projection.shield)
    for (let hit = 1; hit < strikes; hit += 1) {
      const strikeRaw = Math.max(1, Math.round(raw * 0.55))
      const strike = projectHit(state, strikeRaw, enemy, card, move.pierce ?? 0)
      const absorbed = Math.min(shieldLeft, strike.expected)
      shieldLeft -= absorbed
      strikeShield += absorbed
      strikeHp += Math.max(0, strike.expected - absorbed)
    }
  }
  let heal = 0
  let shield = 0
  let hype = 0
  let crowd = 0
  let crowdHeal = 0
  for (const effect of move.effects) {
    if (effect.heal) {
      const targetCard = move.target === 'ally' || move.target === 'self' ? support : card
      heal += Math.min(effect.heal, Math.max(0, targetCard.maxHp - targetCard.hp))
    }
    if (effect.shield) shield += effect.shield
    if (effect.hype) hype += effect.hype
    if (effect.crowd) crowd += effect.crowd
    if (effect.crowdHeal) crowdHeal += effect.crowdHeal
  }
  const statusExtra = statusFromEffects(move.effects, move.target === 'enemy' ? enemy : support)
  const pressure = enemy
    ? projection.expected > 0
      ? Math.max(1, Math.floor(projection.expected / 3)) + state.modifiers.crowdDamage
      : 0
    : raw + state.modifiers.crowdDamage
  const statusInfo = addStatuses(move.effects, move.target === 'enemy' ? enemy : support, card)
  const hpDamage = projection.expectedHp + strikeHp
  const minDamage = projection.minHp + strikeHp
  const maxDamage = projection.maxHp + strikeHp
  const kill = !enemy
    ? 'none'
    : minDamage >= enemy.hp
      ? 'likely'
      : maxDamage >= enemy.hp
        ? 'possible'
        : 'none'
  const notes = [...statusInfo.notes]
  if (projection.blocked) notes.push('TARGET IS UNTOUCHABLE')
  if (enemy && enemy.shield > 0) notes.push(`${enemy.shield} SHIELD TO STRIP`)
  if (kill === 'likely') notes.push('LIKELY KNOCKOUT')
  else if (kill === 'possible') notes.push('CAN FINISH WITH A HIGH ROLL')
  if (strikes > 1) notes.push(`${strikes} STRIKES`)
  if (extraHits > 0) notes.push(`+${extraHits} SECOND WAVE`)
  return {
    minDamage,
    maxDamage,
    expectedDamage: hpDamage,
    shieldDamage: projection.shield + strikeShield,
    hpDamage,
    secondaryDamage,
    kill,
    heal,
    shield,
    crowd: pressure + crowd,
    crowdHeal,
    hype,
    dot: statusExtra,
    buffAttack: statusInfo.buffAttack,
    buffDefense: statusInfo.buffDefense,
    notes,
  }
}

function estimatePlay(state: BattleState, action: AdvisorAction): AdvisorEstimate {
  if (!action.artistId) return emptyEstimate()
  const artist = getArtist(action.artistId)
  const level = progressFor(state.playerProgress, action.artistId).level
  const stats = battleStatsFor(artist, level)
  const support = state.player.stage.find((card) => card.uid === action.replaceUid) ?? null
  let shield = 0
  let hype = 0
  let crowdHeal = 0
  for (const effect of artist.effects) {
    if (effect.kind === 'heal') crowdHeal += Math.min(effect.value, Math.max(0, state.player.maxCrowd - state.player.crowd))
    if (effect.kind === 'shield') shield += effect.value
    if (effect.kind === 'hype') hype += effect.value
    if (effect.kind === 'drain') hype += effect.value
  }
  const lostBars = support ? effectiveBars(support.artistId, support.encore, state.era) : 0
  const notes: string[] = [`${stats.hp} HP BODY`, 'NO ENTRY DAMAGE']
  if (support) notes.push(`REPLACES ${artistName(support.artistId)} (${lostBars} BARS)`)
  return {
    minDamage: 0,
    maxDamage: 0,
    expectedDamage: 0,
    shieldDamage: 0,
    hpDamage: 0,
    secondaryDamage: 0,
    kill: 'none',
    heal: 0,
    shield,
    crowd: 0,
    crowdHeal,
    hype,
    dot: 0,
    buffAttack: 0,
    buffDefense: 0,
    notes,
  }
}

function estimateEncore(state: BattleState, action: AdvisorAction): AdvisorEstimate {
  const card = state.player.stage.find((entry) => entry.uid === action.cardUid)
  if (!card || !action.artistId) return emptyEstimate()
  const artist = getArtist(action.artistId)
  const stageWithout = state.player.stage.filter((entry) => entry.uid !== card.uid)
  let raw = computePlayDamage(stageWithout, action.artistId, true, state.era).total
  if (
    state.houseRules?.modifiers.includes('encore-spotlight') &&
    state.houseRuleRuntime &&
    !state.houseRuleRuntime.encoreSpotlightUsed.player
  ) {
    raw = Math.max(1, Math.round(raw * 1.1))
  }
  const target = bestEnemyTarget(state, action.targetUid)
  const projection = target
    ? projectHit(state, raw, target, card)
    : {
        min: 0,
        max: 0,
        expected: 0,
        minHp: 0,
        maxHp: 0,
        expectedHp: 0,
        shield: 0,
        blocked: false,
      }
  let shield = 0
  let hype = 0
  let crowdHeal = 0
  for (const effect of artist.encore.effects) {
    if (effect.kind === 'heal') {
      crowdHeal += Math.min(effect.value, Math.max(0, state.player.maxCrowd - state.player.crowd))
    }
    if (effect.kind === 'shield') shield += effect.value
    if (effect.kind === 'hype') hype += effect.value
    if (effect.kind === 'drain') hype += effect.value
  }
  const pressure = target
    ? projection.expected > 0
      ? Math.max(1, Math.floor(projection.expected / 3)) + state.modifiers.crowdDamage
      : 0
    : raw + state.modifiers.crowdDamage
  const kill = target
    ? projection.minHp >= target.hp
      ? 'likely'
      : projection.maxHp >= target.hp
        ? 'possible'
        : 'none'
    : 'none'
  return {
    minDamage: projection.minHp,
    maxDamage: projection.maxHp,
    expectedDamage: projection.expectedHp,
    shieldDamage: projection.shield,
    hpDamage: projection.expectedHp,
    secondaryDamage: 0,
    kill,
    heal: 0,
    shield,
    crowd: pressure + (state.modifiers.encoreCrowd ?? 0),
    crowdHeal,
    hype,
    dot: 0,
    buffAttack: 1,
    buffDefense: 0,
    notes: ['TRANSFORMS YOUR ARTIST', kill === 'likely' ? 'LIKELY KNOCKOUT' : ''],
  }
}

function estimateFeature(state: BattleState, action: AdvisorAction): AdvisorEstimate {
  if (!action.crew) return emptyEstimate()
  let raw = featureDamage(state.player.stage, action.crew, state.era)
  if (state.festival?.modifier === 'chrome-feature') raw = Math.round(raw * 1.1)
  const target = bestEnemyTarget(state, action.targetUid)
  const projection = target
    ? projectHit(state, raw, target, null)
    : {
        min: 0,
        max: 0,
        expected: 0,
        minHp: 0,
        maxHp: 0,
        expectedHp: 0,
        shield: 0,
        blocked: false,
      }
  const kill = target
    ? projection.minHp >= target.hp
      ? 'likely'
      : projection.maxHp >= target.hp
        ? 'possible'
        : 'none'
    : 'none'
  const pressure = target
    ? projection.expected > 0
      ? Math.max(1, Math.floor(projection.expected / 3)) + state.modifiers.crowdDamage
      : 0
    : raw + state.modifiers.crowdDamage
  return {
    minDamage: projection.minHp,
    maxDamage: projection.maxHp,
    expectedDamage: projection.expectedHp,
    shieldDamage: projection.shield,
    hpDamage: projection.expectedHp,
    secondaryDamage: 0,
    kill,
    heal: 0,
    shield: 0,
    crowd: pressure,
    hype: 1 + state.modifiers.featureHype,
    dot: 0,
    buffAttack: 0,
    buffDefense: 0,
    notes: ['USES ALL REMAINING ATTACKS'],
  }
}

function estimateRevive(state: BattleState, action: AdvisorAction): AdvisorEstimate {
  const card = state.player.backstage.find((entry) => entry.uid === action.cardUid)
  if (!card) return emptyEstimate()
  const artist = getArtist(card.artistId)
  const hp = artist.personal
    ? Math.max(card.hp, Math.ceil(card.maxHp * 0.5))
    : card.maxHp
  return {
    ...emptyEstimate(),
    heal: 0,
    notes: [`RETURNS AT ${hp} HP`, 'ACTS NEXT TURN'],
  }
}

function emptyEstimate(): AdvisorEstimate {
  return {
    minDamage: 0,
    maxDamage: 0,
    expectedDamage: 0,
    shieldDamage: 0,
    hpDamage: 0,
    secondaryDamage: 0,
    kill: 'none',
    heal: 0,
    shield: 0,
    crowd: 0,
    hype: 0,
    dot: 0,
    buffAttack: 0,
    buffDefense: 0,
    notes: [],
  }
}

function estimateAction(state: BattleState, action: AdvisorAction): AdvisorEstimate {
  if (action.kind === 'move' || action.kind === 'special') {
    const card = state.player.stage.find((entry) => entry.uid === action.cardUid)
    const move = action.moveId ? moveById(action.moveId) : undefined
    if (!card || !move) return emptyEstimate()
    return estimateMove(state, action, card, move)
  }
  if (action.kind === 'play') return estimatePlay(state, action)
  if (action.kind === 'encore') return estimateEncore(state, action)
  if (action.kind === 'feature') return estimateFeature(state, action)
  if (action.kind === 'revive') return estimateRevive(state, action)
  return emptyEstimate()
}

function scoreForAction(state: BattleState, action: AdvisorAction, estimate: AdvisorEstimate): number {
  if (action.kind === 'end') {
    return state.player.attacksThisTurn >= MAX_ATTACKS_PER_TURN ? 4 : 0.5
  }
  let score =
    estimate.hpDamage * ADVISOR_WEIGHTS.damage +
    estimate.shieldDamage * ADVISOR_WEIGHTS.shield +
    estimate.secondaryDamage * 0.7 +
    estimate.dot * 0.9 +
    estimate.heal * ADVISOR_WEIGHTS.healing +
    estimate.shield * ADVISOR_WEIGHTS.shield +
    estimate.crowd * ADVISOR_WEIGHTS.crowd +
    (estimate.crowdHeal ?? 0) * ADVISOR_WEIGHTS.healing +
    estimate.hype * ADVISOR_WEIGHTS.hype +
    estimate.buffAttack * 1.2 +
    estimate.buffDefense * 0.8 -
    action.cost * 0.55
  if (estimate.kill === 'likely') score += ADVISOR_WEIGHTS.kill
  else if (estimate.kill === 'possible') score += ADVISOR_WEIGHTS.possibleKill
  if (estimate.crowd >= state.rival.crowd) score += ADVISOR_WEIGHTS.crowdWin
  if (action.kind === 'play') score += state.player.stage.length < 3 ? 4 : 1.2
  if (action.kind === 'revive') score += 4
  if (action.kind === 'encore') score += 2.2
  if (action.kind === 'feature') score += 2.4
  if (action.kind === 'draw') score += 1
  if (
    action.kind !== 'feature' &&
    !action.closesTurn &&
    state.player.attacksThisTurn < MAX_ATTACKS_PER_TURN - 1
  ) {
    score += ADVISOR_WEIGHTS.tempo
  }
  if (action.closesTurn && state.player.attacksThisTurn < MAX_ATTACKS_PER_TURN - 1) {
    score -= ADVISOR_WEIGHTS.closeTurn * (MAX_ATTACKS_PER_TURN - state.player.attacksThisTurn - 1)
  }
  const objectiveKind =
    action.kind === 'play'
      ? 'play-cards'
      : action.kind === 'move' || action.kind === 'special'
        ? 'moves'
        : action.kind === 'feature'
          ? 'feature'
          : action.kind === 'encore'
            ? 'encore'
            : action.kind === 'draw'
              ? 'crate'
              : null
  if (
    objectiveKind &&
    state.objectives.some((objective) => !objective.done && objective.kind === objectiveKind)
  ) {
    score += 1.2
  }
  if (estimate.kill === 'likely' && state.objectives.some((objective) => !objective.done && objective.kind === 'ko')) {
    score += 1.2
  }
  const source = action.cardUid
    ? state.player.stage.find((card) => card.uid === action.cardUid)
    : null
  if (
    source &&
    source.hp <= source.maxHp * 0.35 &&
    estimate.heal <= 0 &&
    estimate.shield <= 0 &&
    estimate.kill !== 'likely'
  ) {
    score -= 2.2
  }
  if (estimate.notes.includes('TARGET IS UNTOUCHABLE')) score -= 12
  if (action.kind === 'play' && action.replaceUid) {
    const replaced = state.player.stage.find((card) => card.uid === action.replaceUid)
    if (replaced && action.artistId) {
      const lost = effectiveBars(replaced.artistId, replaced.encore, state.era)
      const gained = effectiveBars(action.artistId, false, state.era)
      if (gained <= lost) score -= (lost - gained) * 1.1
    }
  }
  const sourceArtist = action.artistId ? getArtist(action.artistId) : null
  if (sourceArtist?.battle.passive.kind === 'pressure' && action.attack) score += 1
  if (state.player.crowd <= state.player.maxCrowd * 0.3 && estimate.heal <= 0 && estimate.shield <= 0) {
    score -= 1.5
  }
  return score
}

function verdictFor(score: number, best: number): AdvisorVerdict {
  if (score >= best - 1.5 && score > 2) return 'STRONG MOVE'
  if (score >= best - 7) return 'RISKY MOVE'
  return 'WEAK MOVE'
}

function actionReasons(state: BattleState, action: AdvisorAction, estimate: AdvisorEstimate): string[] {
  const reasons: string[] = []
  const target = bestEnemyTarget(state, action.targetUid)
  if (estimate.expectedDamage > 0) {
    const targetName = target ? artistName(target.artistId) : 'the crowd'
    reasons.push(
      `About ${estimate.expectedDamage} HP damage into ${targetName}${
        estimate.shieldDamage > 0 ? `, stripping ${estimate.shieldDamage} Shield` : ''
      }.`,
    )
  }
  if (estimate.kill === 'likely') reasons.push('That should be a knockout.')
  else if (estimate.kill === 'possible') reasons.push('It can finish the job on a high roll.')
  if (estimate.heal > 0) reasons.push(`Restores ${estimate.heal} HP.`)
  if ((estimate.crowdHeal ?? 0) > 0) reasons.push(`Restores ${estimate.crowdHeal} Crowd.`)
  if (estimate.shield > 0) reasons.push(`Adds ${estimate.shield} Shield.`)
  if (estimate.crowd > 0) reasons.push(`About ${estimate.crowd} Crowd pressure.`)
  if (action.closesTurn && state.player.attacksThisTurn < MAX_ATTACKS_PER_TURN - 1) {
    reasons.push(
      `It closes the turn with ${Math.max(
        0,
        MAX_ATTACKS_PER_TURN - state.player.attacksThisTurn - 1,
      )} attacks still in the clip.`,
    )
  } else if (action.attack && !action.closesTurn && action.kind !== 'feature') {
    reasons.push('It keeps your turn open for a follow-up.')
  }
  if (action.cost > 0) reasons.push(`Costs ${action.cost} Hype.`)
  reasons.push(...estimate.notes.filter(Boolean).slice(0, 3))
  return reasons
}

export function scoreAdvisorAction(state: BattleState, action: AdvisorAction): AdvisorScoredAction {
  const estimate = estimateAction(state, action)
  const score = scoreForAction(state, action, estimate)
  return {
    action,
    estimate,
    score,
    verdict: 'RISKY MOVE',
    reasons: actionReasons(state, action, estimate),
  }
}

export function rankAdvisorActions(state: BattleState): AdvisorScoredAction[] {
  const scored = listAdvisorActions(state).map((action) => scoreAdvisorAction(state, action))
  const best = Math.max(...scored.map((entry) => entry.score), 0)
  return scored
    .map((entry) => ({ ...entry, verdict: verdictFor(entry.score, best) }))
    .sort((a, b) => b.score - a.score)
}

export function retargetAdvisorAction(
  action: AdvisorAction,
  targetUid: string | undefined,
): AdvisorAction {
  if (action.targetSide === 'ally') return { ...action, allyTargetUid: targetUid }
  return { ...action, targetUid }
}

export function visibleAdvisorStateKey(state: BattleState): string {
  const cardKey = (card: StageCard) =>
    [
      card.uid,
      card.hp,
      card.maxHp,
      card.shield,
      card.encore ? 'E' : 'N',
      card.actedThisTurn ? 'A' : 'R',
      card.nextAttackBonus,
      card.defenseBonus,
      card.statuses.map((status) => `${status.kind}${status.value}${status.turns}`).join(','),
    ].join('/')
  return [
    state.round,
    state.phase,
    state.era,
    state.player.crowd,
    state.player.hype,
    state.player.attacksThisTurn,
    state.player.encoreCharges,
    state.player.stage.map(cardKey).join(';'),
    state.rival.crowd,
    state.rival.stage.map(cardKey).join(';'),
    state.player.hand.join(','),
  ].join('|')
}

function bestRecommendation(state: BattleState, best: AdvisorScoredAction): string {
  const action = best.action
  const target = bestEnemyTarget(state, action.targetUid)
  const targetName = target ? artistName(target.artistId) : 'the crowd'
  switch (action.kind) {
    case 'move':
    case 'special': {
      const card = state.player.stage.find((entry) => entry.uid === action.cardUid)
      const move = action.moveId ? moveById(action.moveId) : undefined
      if (!card || !move) return action.label
      return `${artistName(card.artistId)} · ${move.name}${target ? ` into ${targetName}` : ''}.`
    }
    case 'play':
      return `${action.label}${target ? ` into ${targetName}` : ''}.`
    case 'encore':
      return `${action.label} into ${targetName}.`
    case 'feature':
      return `${action.label} into ${targetName}.`
    case 'revive':
      return action.label
    case 'draw':
      return 'Dig in the Crate for a special card.'
    case 'end':
      return 'Drop the mic and take the reset.'
  }
}

function situationIntro(state: BattleState): string {
  const missing = state.player.maxCrowd - state.player.crowd
  const lead = state.player.crowd - state.rival.crowd
  const roundsLeft = Math.max(0, CURFEW_ROUND - state.round)
  if (state.player.crowd <= state.player.maxCrowd * 0.3) {
    return 'Hold up—your room is thinning out! We gotta stop the bleed before we chase the knockout.'
  }
  if (state.rival.crowd <= state.rival.maxCrowd * 0.3) {
    return 'The headliner is wobbling! One clean push and that crowd might turn all the way over.'
  }
  if (roundsLeft <= 2) {
    return `Curfew is ${roundsLeft === 0 ? 'right here' : `${roundsLeft} round${roundsLeft === 1 ? '' : 's'} away`}! Every bar has to count now.`
  }
  if (missing > 20) {
    return "You're giving the room away early. We need pressure that also protects the set."
  }
  if (lead < -10) {
    return "They got the room right now, but this thing ain't over. We need a momentum swing, not a panic move."
  }
  return 'Aight, let me read the room. The stage is talking—here is the cleanest play I see.'
}

function uncertaintyFor(best: AdvisorScoredAction): string | null {
  const action = best.action
  if (action.kind === 'play' || action.kind === 'draw' || action.kind === 'revive') {
    if (action.kind === 'play') {
      return 'The summon is real damage, but the engine still rolls its spread. I am not promising a knockout.'
    }
    if (action.kind === 'revive') {
      return 'The returning artist does not attack this turn. The cost is real; the comeback starts next turn.'
    }
    return 'I cannot see the next card in the Crate. Treat that option as a gamble, not a guarantee.'
  }
  if (best.estimate.kill === 'possible') {
    return 'That finish depends on the damage roll and critical window. It is a real chance, not a sure thing.'
  }
  if (best.estimate.expectedDamage > 0) {
    return 'Damage is an estimate; the engine adds a small roll before defense and shields.'
  }
  return null
}

function voiceForAction(action: AdvisorAction | null, state: BattleState): AnnouncerEventName | null {
  if (state.round >= CURFEW_ROUND) return 'final_round'
  if (!action) return null
  if (action.kind === 'encore') return 'encore'
  if (action.kind === 'feature') return 'feature'
  if (action.kind === 'move' || action.kind === 'special') {
    const move = action.moveId ? moveById(action.moveId) : undefined
    if (move?.type === 'healing') return 'healing'
    if (move?.type === 'shield') return 'defense'
  }
  return null
}

export function recommendAdvisorMove(state: BattleState): AdvisorResponse | null {
  const ranked = rankAdvisorActions(state)
  if (ranked.length === 0) return null
  const best = ranked[0]
  const reasons = best.reasons.slice(0, 3)
  return {
    kind: 'recommend',
    verdict: best.verdict,
    intro: situationIntro(state),
    recommendation: bestRecommendation(state, best),
    reason: reasons.join(' '),
    plan: [],
    action: best.action,
    uncertainty: uncertaintyFor(best),
    voiceEvent: voiceForAction(best.action, state),
    stateKey: visibleAdvisorStateKey(state),
  }
}

export function evaluateAdvisorMove(state: BattleState, action: AdvisorAction): AdvisorResponse {
  const scored = scoreAdvisorAction(state, action)
  const all = rankAdvisorActions(state)
  const best = all[0] ?? scored
  const score = scored.score
  const bestScore = Math.max(best.score, score)
  const verdict = verdictFor(score, bestScore)
  const better = best.action.id !== action.id && best.score > score + 1.5 ? best : null
  const intro =
    verdict === 'STRONG MOVE'
      ? "Yeah, that's the move. You're reading the room right."
      : verdict === 'RISKY MOVE'
        ? "Ooh, that's a risky play! It can work, but the trade-off is real."
        : "Nah, I wouldn't spend the mic on that one. The room is telling you something else."
  const reason = scored.reasons.slice(0, 3).join(' ')
  const recommendation = better
    ? `Cleaner route: ${bestRecommendation(state, better)}`
    : verdict === 'STRONG MOVE'
      ? `Run it: ${describeAdvisorAction(state, action)}.`
      : `If you still want it: ${describeAdvisorAction(state, action)}. Or ${bestRecommendation(state, best).toLowerCase()}`
  return {
    kind: 'evaluate',
    verdict,
    intro,
    recommendation,
    reason,
    plan: [],
    action,
    uncertainty: scored.estimate.kill === 'possible'
      ? 'That knockout is a roll, not a promise.'
      : scored.estimate.expectedDamage > 0
        ? 'The engine still rolls damage spread and criticals.'
        : null,
    voiceEvent: null,
    stateKey: visibleAdvisorStateKey(state),
  }
}

export function buildAdvisorGamePlan(state: BattleState): AdvisorResponse {
  const ranked = rankAdvisorActions(state)
  const best = ranked[0] ?? null
  const roundsLeft = Math.max(0, CURFEW_ROUND - state.round)
  const ownCrowdRatio = state.player.crowd / Math.max(1, state.player.maxCrowd)
  const rivalCrowdRatio = state.rival.crowd / Math.max(1, state.rival.maxCrowd)
  const lowestEnemy = bestEnemyTarget(state)
  const plan: string[] = []
  if (ownCrowdRatio <= 0.3) {
    plan.push('STOP THE BLEED: heal, shield and keep a body between them and your Crowd.')
  } else if (rivalCrowdRatio <= 0.35) {
    plan.push('GO FOR THE ROOM: stack Crowd pressure and close before they stabilize.')
  } else {
    plan.push('WIN THE MOMENTUM: land clean hits, protect your lead, and do not donate free turns.')
  }
  if (state.player.encoreCharges > 0) {
    plan.push(`KEEP THE ENCORE: you have ${state.player.encoreCharges} charge${state.player.encoreCharges === 1 ? '' : 's'} in the cut. Do not waste it on a target that survives.`)
  } else {
    plan.push('BUILD THE NEXT WINDOW: bank Hype and set up your Feature or a clean finisher.')
  }
  const objective = state.objectives.find((entry) => !entry.done)
  if (roundsLeft <= 3) {
    plan.push(`CURFEW CLOCK: ${roundsLeft} rounds left. Crowd lead beats style points right now.`)
  } else if (lowestEnemy && lowestEnemy.hp <= lowestEnemy.maxHp * 0.35) {
    plan.push(`FINISH THE WEAK LINK: ${artistName(lowestEnemy.artistId)} is under 35% HP. Removing them changes the whole stage.`)
  } else if (objective) {
    plan.push(`TONIGHT'S LIST: ${objective.title} — ${Math.min(objective.progress, objective.target)}/${objective.target}. Do not ignore the bonus.`)
  } else {
    plan.push('HOLD YOUR HYPE: spend only when it buys damage, a knockout or a real defensive turn.')
  }
  const recommendation = best ? bestRecommendation(state, best) : 'Drop the mic and reset the room.'
  const reason = best ? best.reasons.slice(0, 2).join(' ') : 'No clean action is available; take the reset.'
  return {
    kind: 'plan',
    verdict: null,
    intro: situationIntro(state),
    recommendation,
    reason,
    plan: plan.slice(0, 3),
    action: best?.action ?? null,
    uncertainty: best ? uncertaintyFor(best) : null,
    voiceEvent: voiceForAction(best?.action ?? null, state),
    stateKey: visibleAdvisorStateKey(state),
  }
}
