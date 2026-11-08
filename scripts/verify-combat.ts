import assert from 'node:assert/strict'
import { ARTISTS, CORE_ARTIST_COUNT, getArtist } from '../src/game/roster'
import { DEFAULT_DECK } from '../src/game/settings'
import {
  backstageRecallCost,
  battleReducer,
  createBattle,
  cutHypeRefund,
  HYPE_CAP,
  MAX_ATTACKS_PER_TURN,
  matchMvpSummary,
  type BackstageCard,
  type BattleState,
} from '../src/game/battle'
import { CRATE_CARDS, createCrateDeck, drawWeightedCrate, crateCard } from '../src/game/crate'
import { GAME_UPDATES, updateNoteCount } from '../src/game/updates'
import { GAME_VERSION } from '../src/game/version'
import {
  applyMatchStats,
  emptyPlayerStats,
  favoriteArtistId,
  normalizePlayerStats,
} from '../src/account/account'
import {
  defaultLoadout,
  ELEMENT_META,
  isAttackMove,
  isMoveUnlocked,
  moveHypeCost,
  movesForArtist,
  sanitizeLoadout,
} from '../src/game/moves'

const deck = DEFAULT_DECK
const expansionIds = [
  'rico-varela',
  'kenji-vale',
  'omar-kairo',
  'sefa-kamanzi',
  'luka-dragan',
  'thiago-flux',
  'sione-tua',
  'arjun-slate',
  'miyah-rouge',
  'zuri-mare',
  'selene-lux',
  'yuna-sol',
  'nia-kembe',
  'celine-amour',
  'marisol-vane',
  'soraya-nazeem',
  'marcus-neon',
  'daichi-tempo',
  'kofi-starling',
  'tiago-voss',
  'liora-prism',
  'solana-vega',
  'eloise-static',
  'anika-voltage',
]

assert.equal(ARTISTS.length, 50)
assert.equal(CORE_ARTIST_COUNT, 26)
assert.equal(DEFAULT_DECK.length, 26)
assert.equal(new Set(DEFAULT_DECK).size, 26)
assert.equal(new Set(ARTISTS.map((artist) => artist.number)).size, ARTISTS.length)
assert.equal(new Set(ARTISTS.map((artist) => artist.slot)).size, ARTISTS.length)
assert.equal(ARTISTS.slice(CORE_ARTIST_COUNT).length, expansionIds.length)
for (const id of expansionIds) {
  const artist = getArtist(id)
  assert.equal(artist.id, id)
  assert.ok(artist.number > CORE_ARTIST_COUNT, `${id} is an expansion card`)
  assert.ok(artist.heritage, `${id} keeps its heritage`)
}
assert.equal(getArtist('miyah-rouge').genre, 'R&B')
assert.equal(getArtist('soraya-nazeem').genre, 'R&B')
assert.equal(getArtist('marcus-neon').genre, 'POP')
assert.equal(getArtist('anika-voltage').genre, 'POP')
for (const id of [
  'miyah-rouge',
  'zuri-mare',
  'selene-lux',
  'yuna-sol',
  'nia-kembe',
  'celine-amour',
  'marisol-vane',
  'soraya-nazeem',
]) {
  assert.ok(getArtist(id).debutAlbum, `${id} keeps its debut album`)
}
assert.deepEqual(defaultLoadout('miyah-rouge'), [
  'miyah-rouge-move-0',
  'miyah-rouge-move-2',
  'miyah-rouge-move-3',
])
assert.equal(
  movesForArtist('marisol-vane').find((move) => move.name === 'BURNING ROSES')?.pierce,
  0.5,
)
assert.equal(CRATE_CARDS.length, 29)
assert.ok(Object.keys(ELEMENT_META).length === 8)
assert.equal(new Set(ARTISTS.map((artist) => artist.battle.element)).size, 8)

for (const artist of ARTISTS) {
  const moves = movesForArtist(artist.id)
  assert.equal(moves.filter((move) => !move.special).length, 15, `${artist.id} has fifteen normal moves`)
  assert.ok(moves.some((move) => move.special), `${artist.id} has a signature special`)
  assert.equal(new Set(moves.map((move) => move.name)).size, moves.length, `${artist.id} move names are unique`)
  const loadout = defaultLoadout(artist.id)
  assert.equal(loadout.length, 3, `${artist.id} defaults to three moves`)
  assert.equal(new Set(loadout).size, 3, `${artist.id} loadout is unique`)
  assert.equal(sanitizeLoadout(artist.id, moves.map((move) => move.id), 5).length, 3)
  const heavy = moves.find((move) => move.id.endsWith('-move-1'))
  assert.ok(heavy, `${artist.id} has a heavy move`)
  assert.equal(isMoveUnlocked(heavy, 1), false)
  assert.equal(isMoveUnlocked(heavy, 2), true)
  assert.ok(loadout.every((id) => isMoveUnlocked(moves.find((move) => move.id === id)!, 1)))
}

const crate = createCrateDeck()
assert.equal(crate.length, 35)
const draw = drawWeightedCrate(crate)
assert.ok(draw.cardId)
assert.equal(
  draw.crate.length,
  crate.length - crate.filter((id) => id === draw.cardId).length,
  'all copies of the drawn Crate card leave the stack',
)
assert.ok(crateCard(draw.cardId!).rarity)

let state: BattleState = createBattle({ deck, difficulty: 'HEADLINER' })
assert.equal(state.player.stage.length, 2)
assert.equal(state.rival.stage.length, 2)
assert.equal(state.player.hype, 8)
assert.equal(HYPE_CAP, 24)
assert.equal(state.player.crowd, 72)

const openingTarget = state.rival.stage[0]
const openingHp = openingTarget.hp
const openingCrowd = state.rival.crowd
const cardToPlay = state.player.hand[0]
state = battleReducer(state, {
  type: 'PLAY_CARD',
  artistId: cardToPlay,
  targetUid: openingTarget.uid,
})
assert.equal(state.player.stage.length, 3)
assert.ok(
  state.rival.stage.find((card) => card.uid === openingTarget.uid)?.hp < openingHp ||
    state.rival.crowd < openingCrowd,
  'a played card damages an artist or the crowd',
)

const staged = state.player.stage[0]
state.player.hype = 24
const stagedMove = movesForArtist(staged.artistId).find((move) => move.id === staged.moves[0])!
const hypeBeforeMove = state.player.hype
state = battleReducer(state, {
  type: 'USE_MOVE',
  uid: staged.uid,
  moveId: stagedMove.id,
  targetUid: state.rival.stage[0]?.uid,
})
assert.equal(state.player.stage.find((card) => card.uid === staged.uid)?.actedThisTurn, true)
assert.equal(
  state.player.hype,
  hypeBeforeMove - moveHypeCost(stagedMove),
  'attacks cost no Hype; non-attacks keep their listed cost',
)

state.phase = 'player'
state.counterPrompt = null
state.cinematics = []
const handBefore = state.player.specialHand.length
const hypeBeforeDraw = state.player.hype
state = battleReducer(state, { type: 'DRAW_CRATE' })
assert.equal(state.player.specialHand.length, handBefore + 1)
assert.equal(state.phase, 'player', 'drawing from the Crate no longer ends the turn')
assert.equal(state.player.hype, hypeBeforeDraw - 2, 'Crate draws cost 2 Hype')
assert.equal(state.player.crateDraws, 1)
assert.ok(state.lastCrateDraw)

let defeatTest = createBattle({ deck, difficulty: 'OPENING' })
defeatTest.player.hype = 12
const target =
  defeatTest.rival.stage.find(
    (card) => getArtist(card.artistId).battle.passive.kind !== 'guard',
  ) ?? defeatTest.rival.stage[0]
target.hp = 1
if (getArtist(target.artistId).battle.passive.kind === 'guard') {
  target.guardRound = defeatTest.round
}
const attacker = defeatTest.player.stage[0]
const attackMove = movesForArtist(attacker.artistId)
  .filter((move) => attacker.moves.includes(move.id))
  .filter((move) => move.power > 0 && move.target === 'enemy')
  .sort((a, b) => b.power - a.power)[0]
assert.ok(attackMove, `${attacker.artistId} has an enemy-targeted attack`)
defeatTest = battleReducer(defeatTest, {
  type: 'USE_MOVE',
  uid: attacker.uid,
  moveId: attackMove.id,
  targetUid: target.uid,
})
assert.equal(defeatTest.rival.backstage.length, 1, 'defeated artist moves to Backstage')
assert.equal(defeatTest.rival.stage.some((card) => card.uid === target.uid), false)
assert.ok(defeatTest.rival.koes > 0)

let reviveTest = createBattle({ deck, difficulty: 'OPENING' })
const fallen = reviveTest.player.stage.pop()!
const backstage: BackstageCard = {
  uid: 'fallen-test',
  artistId: fallen.artistId,
  encore: fallen.encore,
  level: fallen.level,
  hp: Math.ceil(fallen.maxHp * 0.25),
  maxHp: fallen.maxHp,
  moves: fallen.moves,
}
reviveTest.player.backstage = [backstage]
reviveTest.player.specialHand = [
  { uid: 'callback-test', cardId: 'callback', drawnRound: 0 },
]
const recallCost = backstageRecallCost(backstage)
assert.ok(recallCost >= 10 && recallCost <= 15, 'Backstage recall costs 10–15 Hype')
reviveTest.player.hype = recallCost
const cardless = battleReducer(reviveTest, {
  type: 'REVIVE',
  targetUid: 'fallen-test',
})
assert.equal(cardless.player.stage.length, 2, 'Backstage revive works when the recall is paid')
assert.equal(cardless.player.stage[1].hp, cardless.player.stage[1].maxHp)
assert.equal(cardless.player.stage[1].actedThisTurn, true, 'revived artist cannot attack immediately')
assert.equal(cardless.player.revives, 1)
assert.equal(cardless.player.hype, 0)
cardless.player.backstage = [{ ...backstage, uid: 'fallen-two' }]
cardless.player.hype = recallCost
const secondRevive = battleReducer(cardless, { type: 'REVIVE', targetUid: 'fallen-two' })
assert.equal(secondRevive.player.stage.length, 3, 'Backstage recalls are repeatable when Hype and slots allow')

let lowHypeRevive = createBattle({ deck, difficulty: 'OPENING' })
lowHypeRevive.player.stage.pop()
const lowHypeStage = lowHypeRevive.player.stage.length
lowHypeRevive.player.backstage = [{ ...backstage, uid: 'fallen-low' }]
lowHypeRevive.player.hype = backstageRecallCost({ ...backstage, uid: 'fallen-low' }) - 1
lowHypeRevive = battleReducer(lowHypeRevive, { type: 'REVIVE', targetUid: 'fallen-low' })
assert.equal(lowHypeRevive.player.stage.length, lowHypeStage, '3 Hype is not enough to revive')

let cardRevive = createBattle({ deck, difficulty: 'OPENING' })
cardRevive.player.stage.pop()
cardRevive.player.backstage = [{ ...backstage, uid: 'fallen-card' }]
cardRevive.player.specialHand = [{ uid: 'callback-test', cardId: 'callback', drawnRound: 0 }]
cardRevive.player.hype = backstageRecallCost({ ...backstage, uid: 'fallen-card' })
cardRevive = battleReducer(cardRevive, {
  type: 'USE_SPECIAL',
  uid: 'callback-test',
  targetUid: 'fallen-card',
})
assert.equal(cardRevive.player.stage.length, 2, 'CALL BACK crate card still revives at 4 Hype')
assert.equal(cardRevive.player.stage[1].hp, cardRevive.player.stage[1].maxHp)
assert.equal(cardRevive.player.revives, 1)
assert.equal(cardRevive.player.specialHand.length, 0)

let rewindTest = createBattle({ deck, difficulty: 'OPENING' })
const rewindAttacker =
  rewindTest.rival.stage.find(
    (card) => getArtist(card.artistId).battle.passive.kind !== 'guard',
  ) ?? rewindTest.rival.stage[0]
if (getArtist(rewindAttacker.artistId).battle.passive.kind === 'guard') {
  rewindAttacker.guardRound = rewindTest.round
}
const rewindTarget = rewindTest.player.stage[0]
rewindTest.player.counters = 0
rewindTest.player.specialHand = [{ uid: 'rewind-test', cardId: 'rewind', drawnRound: 0 }]
rewindTest.counterPrompt = {
  id: 999,
  damage: 8,
  artistId: rewindAttacker.artistId,
  source: 'TEST ATTACK',
  targetUid: rewindTarget.uid,
  attackerUid: rewindAttacker.uid,
  canRewind: true,
}
const rewindHp = rewindAttacker.hp
rewindTest = battleReducer(rewindTest, { type: 'COUNTER', mode: 'rewind' })
assert.equal(rewindTest.player.specialHand.length, 0)
assert.equal(rewindTest.rival.stage.some((card) => card.uid === rewindAttacker.uid && card.hp < rewindHp), true)

let supportTest = createBattle({ deck, difficulty: 'OPENING' })
const supportCard = supportTest.player.stage[0]
supportCard.artistId = 'zuri-mare'
supportCard.moves = defaultLoadout('zuri-mare')
supportTest.player.hype = 24
supportTest.player.crowd = 30
const crowdBefore = supportTest.player.crowd
supportTest = battleReducer(supportTest, {
  type: 'USE_MOVE',
  uid: supportCard.uid,
  moveId: 'zuri-mare-move-2',
})
assert.equal(
  supportTest.player.crowd,
  Math.min(supportTest.player.maxCrowd, crowdBefore + 8),
  'Sweet Like Sugarcane restores Crowd',
)

let guardTest = createBattle({ deck, difficulty: 'OPENING' })
const guardCard = guardTest.player.stage[0]
guardCard.artistId = 'selene-lux'
guardCard.moves = defaultLoadout('selene-lux')
guardTest.player.hype = 24
guardTest = battleReducer(guardTest, {
  type: 'USE_MOVE',
  uid: guardCard.uid,
  moveId: 'selene-lux-move-2',
  targetUid: guardTest.rival.stage[0]?.uid,
})
assert.ok(
  guardTest.player.stage.find((card) => card.uid === guardCard.uid)?.statuses.some(
    (status) => status.kind === 'fortify' && status.value === 2,
  ),
  'Electric Heart applies Guard',
)

let refundTest = createBattle({ deck, difficulty: 'OPENING' })
const refundCard = refundTest.player.stage[0]
refundCard.artistId = 'zuri-mare'
refundCard.moves = defaultLoadout('zuri-mare')
refundTest.player.hype = 10
refundTest = battleReducer(refundTest, {
  type: 'USE_MOVE',
  uid: refundCard.uid,
  moveId: 'zuri-mare-move-0',
  targetUid: refundTest.rival.stage[0]?.uid,
})
assert.equal(refundTest.player.hype, 12, 'Island Fever is a free attack that refunds 2 Hype')

let pierceTest = createBattle({ deck, difficulty: 'OPENING' })
const marisol = pierceTest.player.stage[0]
marisol.artistId = 'marisol-vane'
marisol.moves = defaultLoadout('marisol-vane')
pierceTest.player.hype = 24
pierceTest.rival.counters = 0
const pierceTarget = pierceTest.rival.stage[0]
pierceTarget.artistId = 'sione-tua'
pierceTarget.hp = 30
pierceTarget.maxHp = 30
const originalRandom = Math.random
Math.random = () => 0.5
try {
  pierceTest = battleReducer(pierceTest, {
    type: 'USE_MOVE',
    uid: marisol.uid,
    moveId: 'marisol-vane-move-3',
    targetUid: pierceTarget.uid,
  })
} finally {
  Math.random = originalRandom
}
assert.equal(
  pierceTest.rival.stage.find((card) => card.uid === pierceTarget.uid)?.hp,
  20,
  'Burning Roses pierces half of Sione Tua’s 3 DEF',
)
const piercePerformance = pierceTest.player.cardStats[marisol.artistId]
assert.equal(piercePerformance?.uses, 1, 'the attacking card records its action')
assert.equal(piercePerformance?.damage, 10, 'the attacking card records its HP damage')
assert.ok(
  (pierceTest.rival.cardStats[pierceTarget.artistId]?.prevented ?? 0) > 0,
  'the defending card records damage stopped by defense',
)
const pierceMvp = matchMvpSummary(pierceTest.player.cardStats)
assert.equal(pierceMvp.topDamage?.artistId, marisol.artistId)
assert.equal(pierceMvp.mvp?.artistId, marisol.artistId)

let mvpHealTest = createBattle({ deck, difficulty: 'OPENING' })
const healer = mvpHealTest.player.stage[0]
healer.artistId = 'celine-amour'
healer.moves = defaultLoadout('celine-amour')
const patient = mvpHealTest.player.stage[1]
patient.hp = 1
mvpHealTest.player.hype = 24
mvpHealTest = battleReducer(mvpHealTest, {
  type: 'USE_MOVE',
  uid: healer.uid,
  moveId: 'celine-amour-move-0',
  targetUid: patient.uid,
})
const healedPatient = mvpHealTest.player.stage.find((card) => card.uid === patient.uid)
const expectedHeal = Math.min(6, patient.maxHp - 1)
assert.equal(healedPatient?.hp, 1 + expectedHeal, 'PARIS AFTER MIDNIGHT heals an ally')
const healPerformance = mvpHealTest.player.cardStats['celine-amour']
assert.equal(healPerformance?.uses, 1)
assert.equal(healPerformance?.healing, expectedHeal, 'healing is credited to the acting card')
const healMvp = matchMvpSummary(mvpHealTest.player.cardStats)
assert.equal(healMvp.topHealing?.artistId, 'celine-amour')

assert.deepEqual(
  [1, 3, 4, 5, 8, 10, 12].map((cost) => cutHypeRefund(cost)),
  [1, 1, 2, 2, 3, 4, 4],
  'cut refunds scale with card cost',
)

let attackLimit = createBattle({ deck, difficulty: 'OPENING' })
attackLimit.player.attacksThisTurn = MAX_ATTACKS_PER_TURN
const blockedCard = attackLimit.player.stage[0]
const blockedMove = movesForArtist(blockedCard.artistId).find(
  (move) => isAttackMove(move) && blockedCard.moves.includes(move.id),
)
assert.ok(blockedMove)
attackLimit = battleReducer(attackLimit, {
  type: 'USE_MOVE',
  uid: blockedCard.uid,
  moveId: blockedMove.id,
  targetUid: attackLimit.rival.stage[0]?.uid,
})
assert.equal(attackLimit.player.attacksThisTurn, MAX_ATTACKS_PER_TURN)
assert.equal(
  attackLimit.player.stage.find((card) => card.uid === blockedCard.uid)?.actedThisTurn,
  false,
  'a fourth attack is rejected',
)

let casual = createBattle({
  deck,
  difficulty: 'HEADLINER',
  online: true,
  onlineMode: 'casual',
  progress: { [getArtist(deck[0]).id]: { xp: 900, level: 10, loadout: [] } },
})
assert.ok(
  casual.player.stage.every((card) => card.level === 1),
  'casual online forces level 1 cards',
)

let drawTest = createBattle({ deck, difficulty: 'OPENING', online: true, onlineMode: 'ranked' })
drawTest.player.crowd = 50
drawTest.rival.crowd = 50
drawTest.round = 13
drawTest = battleReducer(drawTest, { type: 'END_TURN' })
assert.equal(drawTest.winner, 'draw', 'equal crowds at curfew end in a draw')

let career = applyMatchStats(emptyPlayerStats(), {
  result: 'win',
  mode: 'ranked',
  plays: { 'rio-sparks': 3, 'macko-deville': 1 },
  attacks: 7,
  actions: 10,
  damage: 44,
  kos: 2,
  features: 1,
  encores: 1,
  crateDraws: 2,
  responseMs: 6_500,
  responseSamples: 3,
})
career = applyMatchStats(career, { result: 'loss', mode: 'casual', plays: { 'rio-sparks': 1 } })
assert.equal(career.matches, 2)
assert.equal(career.wins, 1)
assert.equal(career.losses, 1)
assert.equal(career.rankedWins, 1)
assert.equal(career.casualLosses, 1)
assert.equal(career.attacks, 7)
assert.equal(career.actions, 10)
assert.equal(career.responseSamples, 3)
assert.equal(favoriteArtistId(career), 'rio-sparks')
assert.equal(normalizePlayerStats({ wins: -4, artistPlays: { 'rio-sparks': 2 } }).wins, 0)

const currentUpdate = GAME_UPDATES.find((entry) => entry.version === GAME_VERSION)
assert.ok(currentUpdate, `${GAME_VERSION} has an update log`)
assert.ok(updateNoteCount(currentUpdate) > 0, 'the current update log has notes')
assert.ok(GAME_UPDATES.some((entry) => entry.version === '1.2.0'), '1.2.0 is archived')
assert.ok(GAME_UPDATES.some((entry) => entry.version === '1.1.0'), '1.1.0 is archived')

const sample = getArtist('macko-deville')
assert.equal(sample.name, 'MACKO DEVILLE')
assert.equal(sample.battle.element, 'FIRE')
assert.equal(sample.battle.passive.kind, 'encore')

console.log('COMBAT_SMOKE_OK', {
  artists: ARTISTS.length,
  crate: CRATE_CARDS.length,
  openingHand: cardToPlay,
  damageLog: state.log[0]?.text,
  backstage: defeatTest.rival.backstage.length,
  revived: cardless.player.revives,
  rewound: true,
})
