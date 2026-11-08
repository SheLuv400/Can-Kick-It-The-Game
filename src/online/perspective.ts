import type { BattleState, CinematicKind, LogTone } from '../game/battle'

type Side = 'player' | 'rival'

function flip(side: Side): Side {
  return side === 'player' ? 'rival' : 'player'
}

function flipTone(tone: LogTone): LogTone {
  if (tone === 'good') return 'bad'
  if (tone === 'bad') return 'good'
  return tone
}

function flipCinematic(kind: CinematicKind): CinematicKind {
  if (kind === 'feature') return 'rival-feature'
  if (kind === 'rival-feature') return 'feature'
  if (kind === 'encore') return 'rival-encore'
  if (kind === 'rival-encore') return 'encore'
  if (kind === 'victory') return 'defeat'
  if (kind === 'defeat') return 'victory'
  return kind
}

/**
 * The guest controls the `rival` side, but the battle UI is written from the
 * player's point of view. Swapping the two sides (and every side-tagged event)
 * lets both peers share the same screen without branching the layout.
 */
export function swapBattleState(state: BattleState): BattleState {
  return {
    ...state,
    player: state.rival,
    rival: state.player,
    playerProgress: state.rivalProgress,
    rivalProgress: state.playerProgress,
    phase: state.phase === 'over' ? 'over' : flip(state.phase),
    winner: state.winner === 'draw' || state.winner === null ? state.winner : flip(state.winner),
    lastHit: state.lastHit ? { ...state.lastHit, side: flip(state.lastHit.side) } : null,
    lastCrateDraw: state.lastCrateDraw
      ? { ...state.lastCrateDraw, side: flip(state.lastCrateDraw.side) }
      : null,
    lastDefeat: state.lastDefeat
      ? { ...state.lastDefeat, side: flip(state.lastDefeat.side) }
      : null,
    lastMove: state.lastMove ? { ...state.lastMove, side: flip(state.lastMove.side) } : null,
    announcerCues: state.announcerCues.map((cue) =>
      cue.side ? { ...cue, side: flip(cue.side) } : cue,
    ),
    cinematics: state.cinematics.map((cinematic) => ({
      ...cinematic,
      kind: flipCinematic(cinematic.kind),
    })),
    log: state.log.map((entry) => ({ ...entry, tone: flipTone(entry.tone) })),
  }
}
