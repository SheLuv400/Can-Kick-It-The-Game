import type { BattleAction, BattleState } from '../game/battle'
import type { ArtistProgress, OnlineMode } from '../game/types'

export interface PlayerProfile {
  /** Display name shown on the stage. */
  name: string
  /** The exact 26-card mixtape the player brings into the room. */
  deck: string[]
  /** Five artist IDs guaranteed in the player's opening hand. */
  lineup: string[]
  /** Artist levels and equipped move loadouts. */
  progress: Record<string, ArtistProgress>
  /** Casual strips custom loadouts and levels; ranked uses the full collection. */
  mode: OnlineMode
  /** Stable local account code, used only for rematch anti-farming. */
  playerId?: string
  /** Festival room identity. Both peers must resolve to the same active event. */
  festivalId?: string | null
  /** Last verified online festival streak, shown to the opponent for bounties. */
  festivalStreak?: number
}

/**
 * Guest -> host.
 * `action.side` is always the guest's side; the host forces it so a malicious
 * client cannot play the host's cards.
 */
export type ClientMessage =
  | { type: 'hello'; profile: PlayerProfile }
  | { type: 'action'; action: BattleAction }
  | { type: 'rematch' }
  | { type: 'leave' }

/** Host -> guest. The host owns the only authoritative battle state. */
export type HostMessage =
  | { type: 'welcome'; profile: PlayerProfile; code: string }
  | { type: 'start'; state: BattleState }
  | { type: 'state'; state: BattleState }
  | { type: 'left' }

export type RoomMessage = ClientMessage | HostMessage

export const ROOM_CODE_LENGTH = 5

export function normalizeRoomCode(value: string): string {
  return value
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, '')
    .slice(0, ROOM_CODE_LENGTH)
}

export function sideLabel(name: string): string {
  return name.trim().toUpperCase().slice(0, 18) || 'PLAYER'
}
