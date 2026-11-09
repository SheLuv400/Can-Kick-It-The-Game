import assert from 'node:assert/strict'
import { battleResultCopy, type BattleResultCopyInput } from '../src/game/result-copy'

const base: BattleResultCopyInput = {
  phase: 'over',
  round: 9,
  winner: 'player',
  playerCrowd: 47,
  rivalCrowd: 0,
  online: true,
  rivalLabel: 'TEST_PLAYER_B1',
  forfeit: false,
}

const crowdWin = battleResultCopy(base)
assert.equal(crowdWin.title, 'SOLD OUT')
assert.equal(crowdWin.verdict, 'YOU OWN THE ROOM')
assert.match(crowdWin.kicker, /FINAL CROWD/)
assert.equal(crowdWin.sub, 'The room is yours. Your opponent walks.')

const crowdLoss = battleResultCopy({ ...base, winner: 'rival', playerCrowd: 0, rivalCrowd: 47 })
assert.equal(crowdLoss.title, 'CROWD WALKED')
assert.equal(crowdLoss.verdict, 'TEST_PLAYER_B1 TAKES IT')
assert.equal(crowdLoss.sub, 'TEST_PLAYER_B1 keeps the room. Run it back.')

// The curfew: both crowds survive round 12, so it is not a Crowd-out.
const curfewWin = battleResultCopy({ ...base, round: 13, playerCrowd: 60, rivalCrowd: 44 })
assert.equal(curfewWin.title, 'CURFEW')
assert.notEqual(curfewWin.title, 'SOLD OUT')
assert.equal(curfewWin.verdict, 'CURFEW DECIDES')
assert.match(curfewWin.kicker, /CURFEW/)
assert.match(curfewWin.sub, /curfew bell/)

const curfewLoss = battleResultCopy({
  ...base,
  round: 13,
  winner: 'rival',
  playerCrowd: 44,
  rivalCrowd: 60,
})
assert.equal(curfewLoss.title, 'CURFEW')
assert.notEqual(curfewLoss.title, 'CROWD WALKED')
assert.equal(curfewLoss.verdict, 'CURFEW DECIDES')

const curfewDraw = battleResultCopy({
  ...base,
  round: 13,
  winner: 'draw',
  playerCrowd: 52,
  rivalCrowd: 52,
})
assert.equal(curfewDraw.title, 'CURFEW DEAD HEAT')
assert.equal(curfewDraw.verdict, 'THE ROOM IS SPLIT')
assert.equal(curfewDraw.tone, 'draw')

// A forfeit is not a played-out finish, even when both crowds are healthy.
const forfeitWin = battleResultCopy({
  ...base,
  round: 4,
  playerCrowd: 120,
  rivalCrowd: 144,
  forfeit: true,
})
assert.equal(forfeitWin.title, 'FORFEIT')
assert.equal(forfeitWin.verdict, 'THE SHOW ENDED EARLY')
assert.match(forfeitWin.kicker, /EARLY CLOSE/)
assert.ok(!/SOLD OUT|CROWD WALKED|CURFEW/.test(forfeitWin.title))

const forfeitLoss = battleResultCopy({
  ...base,
  round: 4,
  winner: 'rival',
  playerCrowd: 144,
  rivalCrowd: 120,
  forfeit: true,
})
assert.equal(forfeitLoss.title, 'FORFEIT')
assert.equal(forfeitLoss.tone, 'loss')

// A late Crowd-out must never be read as the curfew, even past round 12.
const lateCrowdOut = battleResultCopy({ ...base, round: 13, playerCrowd: 70, rivalCrowd: 0 })
assert.equal(lateCrowdOut.title, 'SOLD OUT')

console.log('result-copy-check: Crowd-out, curfew and forfeit endings verified')
