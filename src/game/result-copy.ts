import { CURFEW_ROUND, type BattleState } from './battle'

export interface BattleResultCopyInput {
  phase: BattleState['phase']
  round: number
  winner: BattleState['winner']
  playerCrowd: number
  rivalCrowd: number
  online: boolean
  rivalLabel: string
  forfeit: boolean
}

export interface BattleResultCopy {
  kicker: string
  verdict: string
  tone: 'win' | 'loss' | 'draw'
  title: string
  sub: string
}

/**
 * The result screen has three different endings: a Crowd-out, the round-12
 * curfew, and a forfeit. Only the Crowd-out earns "SOLD OUT" / "CROWD WALKED";
 * a surviving crowd at the bell is a curfew decision, and an early exit is a
 * forfeit even though the winner is recorded the same way.
 */
export function battleResultCopy(input: BattleResultCopyInput): BattleResultCopy {
  const { phase, round, winner, playerCrowd, rivalCrowd, online, rivalLabel, forfeit } = input
  const curfew =
    phase === 'over' && round > CURFEW_ROUND && playerCrowd > 0 && rivalCrowd > 0
  const tone: BattleResultCopy['tone'] =
    winner === 'player' ? 'win' : winner === 'rival' ? 'loss' : 'draw'

  if (forfeit) {
    return {
      kicker: 'THE HOUSE LIGHTS · EARLY CLOSE',
      verdict: 'THE SHOW ENDED EARLY',
      tone,
      title: 'FORFEIT',
      sub: 'The show ended early. The result stands.',
    }
  }

  if (curfew) {
    return {
      kicker: 'THE HOUSE LIGHTS · CURFEW',
      verdict: winner === 'draw' ? 'THE ROOM IS SPLIT' : 'CURFEW DECIDES',
      tone,
      title: winner === 'draw' ? 'CURFEW DEAD HEAT' : 'CURFEW',
      sub:
        winner === 'draw'
          ? 'Neither room blinked. The house lights win.'
          : 'The curfew bell rang. The bigger surviving room takes the night.',
    }
  }

  return {
    kicker: 'THE HOUSE LIGHTS · FINAL CROWD',
    verdict:
      winner === 'player'
        ? 'YOU OWN THE ROOM'
        : winner === 'rival'
          ? online
            ? `${rivalLabel} TAKES IT`
            : 'THE HEADLINER TAKES IT'
          : 'THE ROOM IS SPLIT',
    tone,
    title:
      winner === 'player'
        ? 'SOLD OUT'
        : winner === 'rival'
          ? 'CROWD WALKED'
          : 'CURFEW DEAD HEAT',
    sub:
      winner === 'player'
        ? online
          ? 'The room is yours. Your opponent walks.'
          : 'The room is yours. The Headliner walks.'
        : winner === 'rival'
          ? online
            ? `${rivalLabel} keeps the room. Run it back.`
            : 'The Headliner keeps the room. Run it back.'
          : 'Neither room blinked. The house lights win.',
  }
}
