import assert from 'node:assert/strict'
import { ARTISTS, CORE_ARTIST_COUNT, getArtist } from '../src/game/roster'
import { DEFAULT_DECK } from '../src/game/settings'
import {
  battleReducer,
  createBattle,
  type BackstageCard,
  type BattleState,
} from '../src/game/battle'
import { CRATE_CARDS, createCrateDeck, drawWeightedCrate, crateCard } from '../src/game/crate'
import {
  defaultLoadout,
  ELEMENT_META,
  isMoveUnlocked,
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
assert.equal(CRATE_CARDS.length, 18)
assert.ok(Object.keys(ELEMENT_META).length === 8)
assert.equal(new Set(ARTISTS.map((artist) => artist.battle.element)).size, 8)

for (const artist of ARTISTS) {
  const moves = movesForArtist(artist.id)
  assert.equal(moves.length, 5, `${artist.id} has five moves`)
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
assert.equal(crate.length, CRATE_CARDS.length)
const draw = drawWeightedCrate(crate)
assert.ok(draw.cardId)
assert.equal(draw.crate.length, crate.length - 1)
assert.ok(crateCard(draw.cardId!).rarity)

let state: BattleState = createBattle({ deck, difficulty: 'HEADLINER' })
assert.equal(state.player.stage.length, 2)
assert.equal(state.rival.stage.length, 2)
assert.equal(state.player.hype, 4)
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
state.player.hype = 12
state = battleReducer(state, {
  type: 'USE_MOVE',
  uid: staged.uid,
  moveId: staged.moves[1],
  targetUid: state.rival.stage[0]?.uid,
})
assert.equal(state.player.stage.find((card) => card.uid === staged.uid)?.actedThisTurn, true)

const handBefore = state.player.specialHand.length
state = battleReducer(state, { type: 'DRAW_CRATE' })
assert.equal(state.player.specialHand.length, handBefore + 1)
assert.equal(state.phase, 'rival')
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
  maxHp: fallen.maxHp,
  moves: fallen.moves,
}
reviveTest.player.backstage = [backstage]
reviveTest.player.specialHand = [
  { uid: 'callback-test', cardId: 'callback', drawnRound: 0 },
]
reviveTest.player.hype = 8
reviveTest = battleReducer(reviveTest, {
  type: 'USE_SPECIAL',
  uid: 'callback-test',
  targetUid: 'fallen-test',
})
assert.equal(reviveTest.player.stage.length, 2)
assert.equal(reviveTest.player.stage[1].hp, reviveTest.player.stage[1].maxHp)
assert.equal(reviveTest.player.revives, 1)
assert.equal(reviveTest.player.specialHand.length, 0)

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
supportTest.player.hype = 12
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
guardTest.player.hype = 12
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
assert.equal(refundTest.player.hype, 9, 'Island Fever refunds 2 Hype after its 3 Hype cost')

let pierceTest = createBattle({ deck, difficulty: 'OPENING' })
const marisol = pierceTest.player.stage[0]
marisol.artistId = 'marisol-vane'
marisol.moves = defaultLoadout('marisol-vane')
pierceTest.player.hype = 12
pierceTest.rival.counters = 0
const pierceTarget = pierceTest.rival.stage[0]
pierceTarget.artistId = 'sione-tua'
pierceTarget.hp = 30
pierceTarget.maxHp = 30
pierceTest = battleReducer(pierceTest, {
  type: 'USE_MOVE',
  uid: marisol.uid,
  moveId: 'marisol-vane-move-3',
  targetUid: pierceTarget.uid,
})
assert.equal(
  pierceTest.rival.stage.find((card) => card.uid === pierceTarget.uid)?.hp,
  20,
  'Burning Roses pierces half of Sione Tua’s 3 DEF',
)

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
  revived: reviveTest.player.revives,
  rewound: true,
})
