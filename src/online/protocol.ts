import type { BattleAction, BattleState } from '../game/battle'
import type { HouseRulesConfig } from '../game/house-rules'
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
export type RoomSeat = 'host' | 'guest' | 'guest-2' | 'guest-3'

export const ROOM_SEATS: RoomSeat[] = ['host', 'guest', 'guest-2', 'guest-3']
export const TEAM_A_SEATS: RoomSeat[] = ['host', 'guest']
export const TEAM_B_SEATS: RoomSeat[] = ['guest-2', 'guest-3']

export function roomTeam(seat: RoomSeat): 'player' | 'rival' {
  return TEAM_A_SEATS.includes(seat) ? 'player' : 'rival'
}

/**
 * The battle side a seat drives. In 2v2 host+guest share Team A; in 1v1 the
 * single guest is always the rival, even though it is seat "guest".
 */
export function seatSide(seat: RoomSeat, teamMode: boolean): 'player' | 'rival' {
  if (teamMode) return roomTeam(seat)
  return seat === 'host' ? 'player' : 'rival'
}

export function roomSeatName(seat: RoomSeat): string {
  if (seat === 'host') return 'HOST'
  if (seat === 'guest') return 'GUEST 1'
  if (seat === 'guest-2') return 'GUEST 2'
  return 'GUEST 3'
}

/** A single chat line. The host stamps the seat, name and time. */
export interface ChatMessage {
  id: string
  seat: RoomSeat
  name: string
  text: string
  at: number
}

export type VoiceChatStatus = 'off' | 'requesting' | 'on' | 'error'

/**
 * UI-facing chat/voice surface. The transport lives in usePeerRoom so the
 * conversation survives the lobby -> battle hand-off.
 */
export interface RoomChatControl {
  messages: ChatMessage[]
  seats: Partial<Record<RoomSeat, PlayerProfile>>
  localSeat: RoomSeat
  textEnabled: boolean
  voiceEnabled: boolean
  voiceStatus: VoiceChatStatus
  voiceError: string
  voiceActive: RoomSeat[]
  onToggleText: () => void
  onToggleVoice: () => void
  onSend: (text: string) => void
}

export interface RoomRulesState {
  config: HouseRulesConfig
  revision: number
  accepted: RoomSeat[]
  ready: RoomSeat[]
}

export type ClientMessage =
  | { type: 'hello'; profile: PlayerProfile }
  | { type: 'action'; action: BattleAction }
  | { type: 'rules-ready'; revision: number; seat: RoomSeat; ready: boolean }
  | { type: 'chat'; text: string }
  | { type: 'voice'; active: boolean }
  | { type: 'rematch' }
  | { type: 'leave' }

/** Why a match ended without a Crowd-out. */
export interface RoomForfeit {
  winner: 'host' | 'guest'
  loser: 'host' | 'guest'
  loserName: string
}

/** Host -> guest. The host owns the only authoritative battle state. */
export type HostMessage =
  | {
      type: 'welcome'
      profile: PlayerProfile
      code: string
      rules: RoomRulesState
      seat: RoomSeat
      seats: Partial<Record<RoomSeat, PlayerProfile>>
      chat?: ChatMessage[]
      voicePeers?: Partial<Record<RoomSeat, string>>
      voiceActive?: RoomSeat[]
    }
  | { type: 'rules'; rules: RoomRulesState }
  | { type: 'room'; seats: Partial<Record<RoomSeat, PlayerProfile>> }
  | { type: 'chat'; message: ChatMessage }
  | { type: 'voice-roster'; peers: Partial<Record<RoomSeat, string>>; active: RoomSeat[] }
  | { type: 'start'; state: BattleState }
  | { type: 'state'; state: BattleState; forfeit?: RoomForfeit }
  | { type: 'left'; reason?: string }

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
