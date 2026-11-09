import { advanceTripleTurn, cloneSideState, createBattle, type BattleState } from '../src/game/battle'
import { ARTISTS } from '../src/game/roster'
import { standardHouseRules } from '../src/game/house-rules'

const deck = ARTISTS.slice(0, 26).map((artist) => artist.id)
let checks = 0

function check(condition: unknown, message: string) {
  checks += 1
  if (!condition) throw new Error(message)
}

function makeState(): BattleState {
  return createBattle({
    deck,
    difficulty: 'HEADLINER',
    online: true,
    onlineMode: 'casual',
    houseRules: standardHouseRules('triple-threat'),
  })
}

const state = makeState()
const hostSide = cloneSideState(state.player)
const guestSide = cloneSideState(state.rival)
const third = makeState().player

state.party = {
  format: 'triple-threat',
  seats: [
    { seat: 'host', name: 'HOST', team: 'player' },
    { seat: 'guest', name: 'GUEST 1', team: 'rival' },
    { seat: 'guest-2', name: 'GUEST 2', team: 'rival' },
  ],
  order: ['host', 'guest', 'guest-2'],
  activeSeat: 'host',
  targetSeat: 'guest',
  controllers: { player: 'host', rival: 'guest' },
  sides: {
    host: hostSide,
    guest: guestSide,
    'guest-2': cloneSideState(third),
  },
  turnIndex: 0,
  turnEnded: false,
  targetLocked: false,
  eliminated: [],
  winnerSeat: null,
}
state.player = cloneSideState(hostSide)
state.rival = cloneSideState(guestSide)
state.phase = 'player'

// A target at zero is eliminated; the next living mic takes over and targets host.
state.player.crowd = 1
state.rival.crowd = 0
advanceTripleTurn(state, 'host')
check(state.party.eliminated?.includes('guest'), 'zero-crowd target was not eliminated')
check(state.party.activeSeat === 'guest-2', 'rotation skipped the next living seat')
check(state.party.targetSeat === 'host', 'the next target was not the remaining rival')
check(state.phase === 'player', 'turn did not continue after an elimination')

// The last two crowds trade until one is gone; the survivor takes the crown.
state.player.crowd = 0
advanceTripleTurn(state, 'guest-2')
check(state.party.eliminated?.includes('guest-2'), 'zero-crowd active seat was not eliminated')
check(state.party.winnerSeat === 'host', 'last living crowd did not win')
check(state.winnerSeat === 'host' && state.winner === 'player', 'winner was not projected for the host')
check(state.phase === 'over', 'match did not end with one crowd left')

console.log(`triple-engine-check: ${checks} checks passed`)
