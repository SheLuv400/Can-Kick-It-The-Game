import { useCallback, useEffect, useRef, useState } from 'react'
import { Peer, type DataConnection } from 'peerjs'
import {
  battleReducer,
  cloneBattleState,
  cloneSideState,
  createBattle,
  type BattleAction,
  type BattleState,
  type SideState,
} from '../game/battle'
import { containsPersonalArtist, DEFAULT_DECK, sanitizeLineup, validDeck } from '../game/settings'
import type { OnlineMode } from '../game/types'
import {
  battleFormatById,
  customHouseRules,
  DEFAULT_HOUSE_RULES,
  generateShuffleRules,
  houseRulesValidationError,
  parseAndValidateHouseRules,
  randomSeed,
  standardHouseRules,
  toggleHouseModifier as toggleModifier,
  type BattleFormatId,
  type HouseModifierId,
  type HouseRulePreset,
  type HouseRulesConfig,
  type ShuffleChaos,
} from '../game/house-rules'
import {
  festivalDeckLegal,
  makeOnlineFestivalRule,
  setlistSynergy,
  venueFor,
  type FestivalEvent,
} from '../game/festivals'
import {
  normalizeRoomCode,
  ROOM_CODE_LENGTH,
  sideLabel,
  roomSeatName,
  roomTeam,
  type ClientMessage,
  type HostMessage,
  type PlayerProfile,
  type RoomForfeit,
  type RoomMessage,
  type RoomRulesState,
  type RoomSeat,
} from './protocol'

export type OnlineRole = 'host' | 'guest'
export type OnlinePhase = 'idle' | 'hosting' | 'joining' | 'lobby' | 'battle' | 'error'

export type OnlineForfeit = RoomForfeit

const PEER_PREFIX = 'ciki-v1-'
const CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'

function makeRoomCode(): string {
  let code = ''
  for (let index = 0; index < ROOM_CODE_LENGTH; index += 1) {
    code += CODE_ALPHABET[Math.floor(Math.random() * CODE_ALPHABET.length)]
  }
  return code
}

function sanitizeProfile(value: unknown): PlayerProfile | null {
  if (!value || typeof value !== 'object') return null
  const raw = value as Partial<PlayerProfile>
  if (typeof raw.name !== 'string' || !raw.name.trim()) return null
  const deck = Array.isArray(raw.deck)
    ? raw.deck.filter((id): id is string => typeof id === 'string')
    : []
  // A manipulated profile must not be able to smuggle a local personal card
  // into an online match, even if it somehow passes the generic deck shape.
  if (containsPersonalArtist(deck)) return null
  const safeDeck = validDeck(deck) ? deck : DEFAULT_DECK
  return {
    name: sideLabel(raw.name),
    deck: safeDeck,
    lineup: sanitizeLineup(raw.lineup, safeDeck),
    progress: raw.progress && typeof raw.progress === 'object' ? raw.progress : {},
    mode: raw.mode === 'ranked' ? 'ranked' : 'casual',
    playerId: typeof raw.playerId === 'string' ? raw.playerId.slice(0, 24) : undefined,
    festivalId: typeof raw.festivalId === 'string' ? raw.festivalId.slice(0, 64) : null,
    festivalStreak:
      typeof raw.festivalStreak === 'number' && Number.isFinite(raw.festivalStreak)
        ? Math.max(0, Math.round(raw.festivalStreak))
        : 0,
  }
}

const PEER_OPTIONS = {
  debug: 0 as const,
  config: {
    iceServers: [
      { urls: 'stun:stun.l.google.com:19302' },
      { urls: 'stun:stun1.l.google.com:19302' },
    ],
  },
}

const TEAM_ORDER: RoomSeat[] = ['host', 'guest-2', 'guest', 'guest-3']
/** 2v2 teams share one Crowd meter at twice the normal 72 online maximum. */
const TEAM_CROWD = 144

export interface PeerRoom {
  phase: OnlinePhase
  role: OnlineRole | null
  code: string
  mode: OnlineMode
  opponentName: string
  opponentId: string | null
  opponentStreak: number
  status: string
  error: string
  state: BattleState | null
  matchId: number
  forfeit: OnlineForfeit | null
  seats: Partial<Record<RoomSeat, PlayerProfile>>
  localSeat: RoomSeat | null
  activeSeat: RoomSeat | null
  houseRules: HouseRulesConfig
  rulesRevision: number
  rulesAccepted: RoomSeat[]
  rulesReady: RoomSeat[]
  canStart: boolean
  createRoom: (profile: PlayerProfile) => void
  joinRoom: (code: string, profile: PlayerProfile) => void
  startMatch: () => void
  requestRematch: () => void
  setRulePreset: (preset: HouseRulePreset) => void
  setBattleFormat: (format: BattleFormatId) => void
  setShuffleChaos: (chaos: ShuffleChaos) => void
  toggleHouseModifier: (id: HouseModifierId) => void
  randomizeHouseRules: () => void
  markRulesReady: (ready: boolean) => void
  dispatch: (action: BattleAction) => void
  leave: () => void
}

/**
 * Thin PeerJS wrapper around the battle engine.
 *
 * The host owns the authoritative BattleState. The guest sends intents tagged
 * with its side and renders the snapshots the host broadcasts. Because the game
 * is turn-based, this removes conflicting simulations entirely; the only
 * network cost is one state snapshot per action.
 */
export function usePeerRoom(festival: FestivalEvent | null = null): PeerRoom {
  const [phase, setPhase] = useState<OnlinePhase>('idle')
  const [role, setRole] = useState<OnlineRole | null>(null)
  const [code, setCode] = useState('')
  const [mode, setMode] = useState<OnlineMode>('casual')
  const [opponentName, setOpponentName] = useState('')
  const [opponentId, setOpponentId] = useState<string | null>(null)
  const [opponentStreak, setOpponentStreak] = useState(0)
  const [status, setStatus] = useState('')
  const [error, setError] = useState('')
  const [state, setState] = useState<BattleState | null>(null)
  const [matchId, setMatchId] = useState(0)
  const [seats, setSeats] = useState<Partial<Record<RoomSeat, PlayerProfile>>>({})
  const [localSeat, setLocalSeat] = useState<RoomSeat | null>(null)
  const [activeSeat, setActiveSeat] = useState<RoomSeat | null>(null)
  const [forfeit, setForfeit] = useState<OnlineForfeit | null>(null)
  const [houseRules, setHouseRules] = useState<HouseRulesConfig>(DEFAULT_HOUSE_RULES)
  const [rulesRevision, setRulesRevision] = useState(1)
  const [rulesAccepted, setRulesAccepted] = useState<RoomSeat[]>([])
  const [rulesReady, setRulesReady] = useState<RoomSeat[]>([])

  const peerRef = useRef<Peer | null>(null)
  const connRef = useRef<DataConnection | null>(null)
  const connsRef = useRef<Partial<Record<RoomSeat, DataConnection>>>({})
  const stateRef = useRef<BattleState | null>(null)
  const profileRef = useRef<PlayerProfile | null>(null)
  const opponentRef = useRef<PlayerProfile | null>(null)
  const seatsRef = useRef<Partial<Record<RoomSeat, PlayerProfile>>>({})
  const seatRef = useRef<RoomSeat>('host')
  const activeSeatRef = useRef<RoomSeat | null>(null)
  const rejectedRef = useRef(false)
  const roleRef = useRef<OnlineRole | null>(null)
  const codeRef = useRef('')
  const phaseRef = useRef<OnlinePhase>('idle')
  const startRef = useRef<() => void>(() => {})
  const dispatchRef = useRef<(seat: RoomSeat, action: BattleAction) => void>(() => {})
  const houseRulesRef = useRef<HouseRulesConfig>(DEFAULT_HOUSE_RULES)
  const rulesRevisionRef = useRef(1)
  const rulesAcceptedRef = useRef<RoomSeat[]>([])
  const rulesReadyRef = useRef<RoomSeat[]>([])

  const enterPhase = useCallback((next: OnlinePhase) => {
    phaseRef.current = next
    setPhase(next)
  }, [])

  /**
   * A guest may only receive the side it controls. The opposing team's hand,
   * mixtape order and Crate hand never leave the host's authoritative state.
   */
  const projectState = useCallback((state: BattleState, seat: RoomSeat): BattleState => {
    if (!state.party) return state
    const copy = cloneBattleState(state)
    const hidden = roomTeam(seat) === 'player' ? copy.rival : copy.player
    hidden.hand = []
    hidden.deck = []
    hidden.specialHand = []
    // The waiting seats stay host-side only. Delete rather than set undefined
    // so the wire serializer cannot re-materialise the field.
    if (copy.party) delete copy.party.sides
    return copy
  }, [])

  const sendHostMessage = useCallback((message: HostMessage, only?: RoomSeat) => {
    const entries = Object.entries(connsRef.current) as Array<
      [RoomSeat, DataConnection | undefined]
    >
    for (const [seat, connection] of entries) {
      if (!connection?.open) continue
      if (only && seat !== only) continue
      try {
        connection.send(
          message.type === 'state' || message.type === 'start'
            ? { ...message, state: projectState(message.state, seat) }
            : message,
        )
      } catch {
        // The peer can close between the open check and send.
      }
    }
  }, [projectState])

  const commitSeats = useCallback((next: Partial<Record<RoomSeat, PlayerProfile>>) => {
    seatsRef.current = next
    setSeats(next)
    sendHostMessage({ type: 'room', seats: next })
  }, [sendHostMessage])

  const commitActiveSeat = useCallback((seat: RoomSeat | null) => {
    activeSeatRef.current = seat
    setActiveSeat(seat)
  }, [])

  const makeRulesState = useCallback((): RoomRulesState => ({
    config: houseRulesRef.current,
    revision: rulesRevisionRef.current,
    accepted: [...rulesAcceptedRef.current],
    ready: [...rulesReadyRef.current],
  }), [])

  const setRuleSeats = useCallback((accepted: RoomSeat[], ready: RoomSeat[]) => {
    const uniqueAccepted = [...new Set(accepted)]
    const uniqueReady = [...new Set(ready)]
    rulesAcceptedRef.current = uniqueAccepted
    rulesReadyRef.current = uniqueReady
    setRulesAccepted(uniqueAccepted)
    setRulesReady(uniqueReady)
  }, [])

  const resetRules = useCallback(() => {
    houseRulesRef.current = DEFAULT_HOUSE_RULES
    rulesRevisionRef.current = 1
    setHouseRules(DEFAULT_HOUSE_RULES)
    setRulesRevision(1)
    setRuleSeats([], [])
  }, [setRuleSeats])

  const sendRules = useCallback(() => {
    sendHostMessage({ type: 'rules', rules: makeRulesState() })
  }, [makeRulesState, sendHostMessage])

  const applyRulesState = useCallback((rules: RoomRulesState): boolean => {
    const config = parseAndValidateHouseRules(rules?.config)
    if (!config) {
      setStatus('THE HOST SENT AN INVALID HOUSE RULES SET.')
      return false
    }
    houseRulesRef.current = config
    rulesRevisionRef.current = Math.max(1, Math.round(Number(rules.revision) || 1))
    setHouseRules(config)
    setRulesRevision(rulesRevisionRef.current)
    setRuleSeats(rules.accepted ?? [], rules.ready ?? [])
    return true
  }, [setRuleSeats])

  const commitRules = useCallback((next: HouseRulesConfig): boolean => {
    const validation = houseRulesValidationError(next)
    if (validation) {
      setStatus(validation)
      return false
    }
    houseRulesRef.current = next
    rulesRevisionRef.current += 1
    setHouseRules(next)
    setRulesRevision(rulesRevisionRef.current)
    setRuleSeats([], [])
    sendRules()
    return true
  }, [sendRules, setRuleSeats])

  const endForfeit = useCallback(
    (winner: OnlineRole, loser: OnlineRole, rawLoserName: string) => {
      if (phaseRef.current !== 'battle') return false
      const current = stateRef.current
      if (!current || current.phase === 'over') return false
      const loserName = sideLabel(rawLoserName.trim() || (loser === 'guest' ? 'OPPONENT' : 'HOST'))
      const ended: BattleState = {
        ...current,
        phase: 'over',
        winner: winner === 'host' ? 'player' : 'rival',
        counterPrompt: null,
        cinematics: [],
      }
      const info: OnlineForfeit = { winner, loser, loserName }
      stateRef.current = ended
      setState(ended)
      setForfeit(info)
      if (roleRef.current === 'host') {
        sendHostMessage({ type: 'state', state: ended, forfeit: info })
      }
      setOpponentName('')
      setOpponentId(null)
      setOpponentStreak(0)
      opponentRef.current = null
      setStatus(`${loserName} LEFT THE MATCH · FORFEIT`)
      return true
    },
    [sendHostMessage],
  )

  const teardown = useCallback(() => {
    for (const connection of Object.values(connsRef.current)) {
      try {
        connection?.close()
      } catch {
        // Already closed.
      }
    }
    connsRef.current = {}
    connRef.current = null
    const peer = peerRef.current
    peerRef.current = null
    try {
      peer?.destroy()
    } catch {
      // Already destroyed.
    }
    stateRef.current = null
    opponentRef.current = null
    seatsRef.current = {}
    setSeats({})
    setLocalSeat(null)
    activeSeatRef.current = null
    setActiveSeat(null)
    setOpponentId(null)
    setOpponentStreak(0)
    profileRef.current = null
    roleRef.current = null
    codeRef.current = ''
  }, [])

  const handleHostMessage = useCallback((raw: unknown, fromSeat: RoomSeat) => {
    const message = raw as RoomMessage
    if (!message || typeof message !== 'object') return

    if (message.type === 'hello') {
      const profile = sanitizeProfile(message.profile)
      if (!profile) return
      if ((profile.festivalId ?? null) !== (festival?.event_id ?? null)) {
        setStatus('FESTIVAL MISMATCH · BOTH PLAYERS MUST USE THE SAME ACTIVE EVENT')
        return
      }
      if (profileRef.current && profile.mode !== profileRef.current.mode) {
        setStatus(`MODE MISMATCH · ROOM IS ${profileRef.current.mode.toUpperCase()}`)
        return
      }
      if (festival && !festivalDeckLegal(profile.deck, festival)) {
        setStatus('THEIR DECK DOES NOT MEET THE FESTIVAL SETLIST REQUIREMENTS')
        return
      }
      const nextSeats = { ...seatsRef.current, [fromSeat]: profile }
      commitSeats(nextSeats)
      if (!opponentRef.current) {
        opponentRef.current = profile
        setOpponentName(profile.name)
        setOpponentId(profile.playerId ?? null)
        setOpponentStreak(profile.festivalStreak ?? 0)
      }
      setMode(profile.mode)
      setStatus(`${profile.name} JOINED AS ${roomSeatName(fromSeat)}`)
      const self = profileRef.current
      if (self) {
        sendHostMessage({
          type: 'welcome',
          profile: self,
          code: codeRef.current,
          rules: makeRulesState(),
          seat: fromSeat,
          seats: nextSeats,
        }, fromSeat)
      }
      return
    }

    if (message.type === 'rules-ready') {
      if (Number(message.revision) !== rulesRevisionRef.current) {
        sendRules()
        return
      }
      if (message.seat !== fromSeat) return
      const accepted = message.ready
        ? [...rulesAcceptedRef.current, fromSeat]
        : rulesAcceptedRef.current.filter((seat) => seat !== fromSeat)
      const ready = message.ready
        ? [...rulesReadyRef.current, fromSeat]
        : rulesReadyRef.current.filter((seat) => seat !== fromSeat)
      setRuleSeats(accepted, ready)
      setStatus(message.ready ? `${roomSeatName(fromSeat)} ACCEPTED · READY` : `${roomSeatName(fromSeat)} NOT READY`)
      sendRules()
      return
    }

    if (message.type === 'action') {
      dispatchRef.current(fromSeat, message.action)
      return
    }

    if (message.type === 'rematch') {
      startRef.current()
      return
    }

    if (message.type === 'leave') {
      connsRef.current[fromSeat]?.close()
    }
  }, [commitSeats, festival, makeRulesState, sendHostMessage, sendRules, setRuleSeats])

  const handleGuestMessage = useCallback((raw: unknown) => {
    const message = raw as RoomMessage
    if (!message || typeof message !== 'object') return

    if (message.type === 'welcome') {
      const profile = sanitizeProfile(message.profile)
      if (festival && (profile?.festivalId ?? null) !== festival.event_id) {
        setError('THIS ROOM IS NOT RUNNING THE SELECTED FESTIVAL.')
        enterPhase('error')
        return
      }
      seatRef.current = message.seat
      setLocalSeat(message.seat)
      const nextSeats = { ...message.seats }
      seatsRef.current = nextSeats
      setSeats(nextSeats)
      if (profile) {
        opponentRef.current = profile
        setOpponentName(profile.name)
        setOpponentId(profile.playerId ?? null)
        setOpponentStreak(profile.festivalStreak ?? 0)
      }
      if (message.rules) applyRulesState(message.rules)
      else resetRules()
      enterPhase('lobby')
      setStatus(`CONNECTED AS ${roomSeatName(message.seat)} · WAITING FOR THE HOST`)
      return
    }

    if (message.type === 'room') {
      seatsRef.current = message.seats
      setSeats(message.seats)
      return
    }

    if (message.type === 'rules') {
      if (applyRulesState(message.rules)) {
        setStatus('HOUSE RULES UPDATED · ACCEPT AND READY UP')
      }
      return
    }

    if (message.type === 'start' || message.type === 'state') {
      if (message.state.houseRules) {
        const locked = parseAndValidateHouseRules(message.state.houseRules)
        if (locked) {
          houseRulesRef.current = locked
          setHouseRules(locked)
        }
      }
      stateRef.current = message.state
      setState(message.state)
      if (message.type === 'state' && message.forfeit) setForfeit(message.forfeit)
      if (import.meta.env.DEV) {
        // Read-only development seam for the four-client network test. Vite
        // strips this branch from production builds.
        Object.assign(window, {
          __cikiRoomState: message.state,
          __cikiRoomSeat: seatRef.current,
        })
      }
      commitActiveSeat((message.state.party?.activeSeat as RoomSeat | null | undefined) ?? null)
      if (message.type === 'start') {
        setForfeit(null)
        enterPhase('battle')
        setStatus('LIVE · P2P')
        setMatchId((id) => id + 1)
      }
      return
    }

    if (message.type === 'left') {
      if (message.reason) {
        // The host refused the connection (full room); say so instead of
        // leaving the guest on a silent dial screen.
        rejectedRef.current = true
        setError(message.reason)
        setStatus(message.reason)
        enterPhase('error')
        return
      }
      const current = stateRef.current
      if (current?.party && current.phase !== 'over') {
        const ended: BattleState = {
          ...current,
          phase: 'over',
          // The host always controls Team A. The host leaving hands the
          // match to Team B, regardless of which teammate is watching.
          winner: 'rival',
          counterPrompt: null,
          cinematics: [],
          party: { ...current.party, activeSeat: null },
        }
        stateRef.current = ended
        setState(ended)
        commitActiveSeat(null)
        setForfeit({
          winner: 'guest',
          loser: 'host',
          loserName: 'HOST',
        })
        setStatus('HOST LEFT THE MATCH · TEAM FORFEIT')
        return
      }
      if (endForfeit('guest', 'host', opponentRef.current?.name ?? 'HOST')) return
      setStatus('HOST LEFT THE ROOM')
      setOpponentName('')
      setOpponentId(null)
      setOpponentStreak(0)
      opponentRef.current = null
    }
  }, [applyRulesState, commitActiveSeat, endForfeit, enterPhase, festival, resetRules])

  const handleHostSeatGone = useCallback((seat: RoomSeat) => {
    const profile = seatsRef.current[seat]
    const current = stateRef.current
    if (phaseRef.current === 'battle' && current && current.phase !== 'over') {
      const loserTeam = current.party ? roomTeam(seat) : seat === 'host' ? 'player' : 'rival'
      const winnerTeam = loserTeam === 'player' ? 'rival' : 'player'
      const ended: BattleState = {
        ...current,
        phase: 'over',
        winner: winnerTeam,
        counterPrompt: null,
        cinematics: [],
        party: current.party ? { ...current.party, activeSeat: null } : undefined,
      }
      const info: OnlineForfeit = {
        winner: winnerTeam === 'player' ? 'host' : 'guest',
        loser: loserTeam === 'player' ? 'host' : 'guest',
        loserName: profile?.name ?? roomSeatName(seat),
      }
      stateRef.current = ended
      setState(ended)
      commitActiveSeat(null)
      setForfeit(info)
      setStatus(`${profile?.name ?? roomSeatName(seat)} LEFT · TEAM FORFEIT`)
      sendHostMessage({ type: 'state', state: ended, forfeit: info })
    } else {
      setStatus(`${profile?.name ?? roomSeatName(seat)} LEFT THE ROOM`)
    }
    const nextSeats = { ...seatsRef.current }
    delete nextSeats[seat]
    commitSeats(nextSeats)
    setRuleSeats(
      rulesAcceptedRef.current.filter((entry) => entry !== seat && entry in nextSeats),
      rulesReadyRef.current.filter((entry) => entry !== seat && entry in nextSeats),
    )
    if (!seatsRef.current.guest) {
      opponentRef.current = null
      setOpponentName('')
      setOpponentId(null)
      setOpponentStreak(0)
    }
  }, [commitActiveSeat, commitSeats, sendHostMessage, setRuleSeats])

  const createRoom = useCallback(
    (profile: PlayerProfile) => {
      if (containsPersonalArtist(profile.deck)) {
        setError('MY ARTIST CARDS ARE LOCAL ONLY. REMOVE THE PERSONAL CARD TO PLAY ONLINE.')
        enterPhase('error')
        return
      }
      if (festival && !festivalDeckLegal(profile.deck, festival)) {
        setError('THIS MIXTAPE DOES NOT MEET THE FESTIVAL SETLIST REQUIREMENTS.')
        enterPhase('error')
        return
      }
      const self = sanitizeProfile(profile)
      if (!self) return
      self.mode = festival ? 'ranked' : self.mode
      phaseRef.current = 'idle'
      teardown()
      const nextCode = makeRoomCode()
      const nextPeer = new Peer(PEER_PREFIX + nextCode, PEER_OPTIONS)

      profileRef.current = self
      roleRef.current = 'host'
      codeRef.current = nextCode
      peerRef.current = nextPeer

      resetRules()
      rejectedRef.current = false
      setRole('host')
      setCode(nextCode)
      setMode(self.mode)
      enterPhase('hosting')
      setStatus('OPENING THE ROOM…')
      setError('')
      setForfeit(null)
      setOpponentName('')
      setState(null)
      commitActiveSeat(null)
      seatRef.current = 'host'
      setLocalSeat('host')
      commitSeats({ host: self })

      nextPeer.on('open', () => {
        enterPhase('lobby')
        setStatus('ROOM OPEN · SHARE THE CODE')
      })

      nextPeer.on('connection', (connection) => {
        const capacity = houseRulesRef.current.format === '2v2' ? 3 : 1
        const guestSeat = (['guest', 'guest-2', 'guest-3'] as RoomSeat[]).find(
          (seat) => !connsRef.current[seat],
        )
        if (!guestSeat || Object.keys(connsRef.current).length >= capacity) {
          const reason = houseRulesRef.current.format === '2v2'
            ? 'ROOM FULL · FOUR SEATS TAKEN'
            : 'ROOM IS SET TO 1V1 · CHANGE TO 2V2 FOR MORE PLAYERS'
          setStatus(reason)
          const reject = () => {
            try {
              connection.send({ type: 'left', reason } satisfies HostMessage)
            } catch {
              // The connection may already be gone.
            }
            window.setTimeout(() => {
              try {
                connection.close()
              } catch {
                // Already closed.
              }
            }, 250)
          }
          if (connection.open) reject()
          else connection.on('open', reject)
          return
        }
        connsRef.current[guestSeat] = connection
        connRef.current = connection
        connection.on('open', () => setStatus(`${roomSeatName(guestSeat)} CONNECTED`))
        connection.on('data', (raw) => handleHostMessage(raw, guestSeat))
        connection.on('close', () => {
          if (connsRef.current[guestSeat] !== connection) return
          delete connsRef.current[guestSeat]
          if (connRef.current === connection) connRef.current = null
          if (phaseRef.current === 'idle') return
          if (stateRef.current?.party && stateRef.current.phase !== 'over') {
            handleHostSeatGone(guestSeat)
            return
          }
          if (stateRef.current?.phase !== 'over' && !stateRef.current?.party) {
            endForfeit('host', 'guest', opponentRef.current?.name ?? 'OPPONENT')
          }
          handleHostSeatGone(guestSeat)
        })
        connection.on('error', () => setStatus('CONNECTION ERROR'))
      })

      nextPeer.on('error', (err) => {
        const type = String(err.type)
        if (type === 'unavailable-id') {
          setError('THAT ROOM CODE WAS TAKEN. GO BACK AND CREATE AGAIN.')
        } else if (type === 'network' || type === 'server-error') {
          setError('CANNOT REACH THE ROOM SERVICE. CHECK YOUR CONNECTION.')
        } else {
          setError(`ROOM ERROR: ${type.replace(/-/g, ' ').toUpperCase()}`)
        }
        enterPhase('error')
      })
    },
    [commitActiveSeat, commitSeats, endForfeit, enterPhase, festival, handleHostMessage, handleHostSeatGone, resetRules, setRuleSeats, teardown],
  )

  const joinRoom = useCallback(
    (input: string, profile: PlayerProfile) => {
      if (containsPersonalArtist(profile.deck)) {
        setError('MY ARTIST CARDS ARE LOCAL ONLY. REMOVE THE PERSONAL CARD TO PLAY ONLINE.')
        enterPhase('error')
        return
      }
      if (festival && !festivalDeckLegal(profile.deck, festival)) {
        setError('THIS MIXTAPE DOES NOT MEET THE FESTIVAL SETLIST REQUIREMENTS.')
        enterPhase('error')
        return
      }
      const self = sanitizeProfile(profile)
      if (!self) return
      self.mode = festival ? 'ranked' : self.mode
      phaseRef.current = 'idle'
      teardown()
      const nextCode = normalizeRoomCode(input)
      if (nextCode.length !== ROOM_CODE_LENGTH) {
        setError('ENTER THE FULL 5-CHARACTER ROOM CODE.')
        enterPhase('error')
        return
      }

      const nextPeer = new Peer(PEER_OPTIONS)
      profileRef.current = self
      roleRef.current = 'guest'
      codeRef.current = nextCode
      peerRef.current = nextPeer

      resetRules()
      rejectedRef.current = false
      setRole('guest')
      setCode(nextCode)
      setMode(self.mode)
      enterPhase('joining')
      setStatus('DIALING THE ROOM…')
      setError('')
      setForfeit(null)
      setOpponentName('')
      setState(null)
      setSeats({})
      setLocalSeat(null)
      commitActiveSeat(null)

      nextPeer.on('open', () => {
        const connection = nextPeer.connect(PEER_PREFIX + nextCode, { reliable: true })
        connRef.current = connection
        connection.on('open', () => {
          const hello: ClientMessage = { type: 'hello', profile: self }
          connection.send(hello)
          setStatus('CONNECTED · SAY HI')
        })
        connection.on('data', handleGuestMessage)
        connection.on('close', () => {
          if (rejectedRef.current) return
          if (stateRef.current?.phase === 'over') return
          if (endForfeit('guest', 'host', opponentRef.current?.name ?? 'HOST')) return
          setStatus('HOST DISCONNECTED')
        })
        connection.on('error', () => setStatus('CONNECTION ERROR'))
      })

      nextPeer.on('error', (err) => {
        const type = String(err.type)
        if (type === 'peer-unavailable') {
          setError('NO ROOM WITH THAT CODE. CHECK IT WITH YOUR FRIEND.')
        } else if (type === 'network' || type === 'server-error') {
          setError('CANNOT REACH THE ROOM SERVICE. CHECK YOUR CONNECTION.')
        } else {
          setError(`ROOM ERROR: ${type.replace(/-/g, ' ').toUpperCase()}`)
        }
        enterPhase('error')
      })
    },
    [endForfeit, enterPhase, festival, handleGuestMessage, resetRules, teardown],
  )

  const startMatchInternal = useCallback(() => {
    if (roleRef.current !== 'host') return
    const self = profileRef.current
    const rules = houseRulesRef.current
    const format = battleFormatById(rules.format)
    const teamMode = format.id === '2v2'
    const requiredSeats: RoomSeat[] = teamMode ? TEAM_ORDER : ['host', 'guest']
    const roster = requiredSeats
      .map((seat) => seatsRef.current[seat])
      .filter((profile): profile is PlayerProfile => Boolean(profile))
    if (roster.length !== requiredSeats.length) {
      setStatus(teamMode ? '2V2 NEEDS ALL FOUR SEATS FILLED' : 'WAITING FOR AN OPPONENT TO JOIN')
      return
    }
    const [first, second, third, fourth] = roster
    if (!self) return
    if (teamMode && self.mode !== 'casual') {
      setStatus('2V2 TAG TEAM IS A CASUAL FORMAT IN THIS BUILD')
      return
    }
    if (roster.some((profile) => profile.mode !== self.mode)) {
      setStatus('MODE MISMATCH · EVERY SEAT MUST USE THE SAME MODE')
      return
    }
    if (roster.some((profile) => containsPersonalArtist(profile.deck))) {
      setStatus('MY ARTIST CARDS ARE LOCAL ONLY · ROOM BLOCKED')
      return
    }
    if (roster.some((profile) => !validDeck(profile.deck))) {
      setStatus('EVERY SEAT NEEDS A LEGAL 26-CARD MIXTAPE')
      return
    }
    if (festival) {
      if (roster.some((profile) => !festivalDeckLegal(profile.deck, festival))) {
        setStatus('FESTIVAL DECK CHECK FAILED · EVERY MIXTAPE MUST MEET THE SETLIST')
        return
      }
      if (roster.some((profile) => (profile.festivalId ?? null) !== festival.event_id)) {
        setStatus('FESTIVAL MISMATCH · EVERY PLAYER MUST USE THE SAME EVENT')
        return
      }
    }
    const rulesError = houseRulesValidationError(rules)
    if (rulesError) {
      setStatus(rulesError)
      return
    }
    if (!format.enabled) {
      setStatus(format.unavailableReason ?? 'THAT BATTLE FORMAT IS NOT AVAILABLE')
      return
    }
    if (rules.preset !== 'standard' && self.mode !== 'casual') {
      setStatus('CUSTOM HOUSE RULES ARE CASUAL PRIVATE ROOMS ONLY')
      return
    }
    if (
      requiredSeats.some((seat) => !rulesAcceptedRef.current.includes(seat)) ||
      requiredSeats.some((seat) => !rulesReadyRef.current.includes(seat))
    ) {
      setStatus(teamMode
        ? 'ALL FOUR PLAYERS MUST ACCEPT THE RULES AND READY UP'
        : 'BOTH PLAYERS MUST ACCEPT THE RULES AND READY UP')
      return
    }

    const next = createBattle({
      deck: first.deck,
      lineup: first.lineup,
      rivalDeck: second.deck,
      rivalLineup: second.lineup,
      difficulty: 'HEADLINER',
      progress: first.progress,
      rivalProgress: second.progress,
      playerName: first.name,
      rivalName: second.name,
      playerCrowd: teamMode ? TEAM_CROWD : 72,
      rivalCrowd: teamMode ? TEAM_CROWD : 72,
      online: true,
      onlineMode: self.mode,
      festival: festival
        ? makeOnlineFestivalRule(festival, setlistSynergy(first.deck, festival).activated)
        : undefined,
      venue: festival ? venueFor(festival) : undefined,
      houseRules: rules,
    })

    if (teamMode) {
      // Every seat brings its own complete stage kit. The two on stage live in
      // player/rival; the waiting seats sit in party.sides until they tag in.
      const sides: Record<string, SideState> = {
        host: cloneSideState(next.player),
        'guest-2': cloneSideState(next.rival),
      }
      const partners: Array<[RoomSeat, PlayerProfile]> = [
        ['guest', third],
        ['guest-3', fourth],
      ]
      for (const [seat, partnerProfile] of partners) {
        const partnerBattle = createBattle({
          deck: partnerProfile.deck,
          lineup: partnerProfile.lineup,
          progress: partnerProfile.progress,
          difficulty: 'HEADLINER',
          playerName: partnerProfile.name,
          playerCrowd: TEAM_CROWD,
          online: true,
          onlineMode: 'casual',
        })
        sides[seat] = cloneSideState(partnerBattle.player)
      }
      next.party = {
        format: '2v2',
        seats: TEAM_ORDER.map((seat) => ({
          seat,
          name: seatsRef.current[seat]?.name ?? roomSeatName(seat),
          team: roomTeam(seat),
        })),
        order: [...TEAM_ORDER],
        activeSeat: 'host',
        controllers: { player: 'host', rival: 'guest-2' },
        sides,
        turnIndex: 0,
      }
      commitActiveSeat('host')
    } else {
      commitActiveSeat(null)
    }
    stateRef.current = next
    setState(next)
    setForfeit(null)
    enterPhase('battle')
    setStatus(teamMode ? 'LIVE · 2V2 TAG TEAM' : 'LIVE · P2P')
    setMatchId((id) => id + 1)
    sendHostMessage({ type: 'start', state: next })
  }, [commitActiveSeat, enterPhase, festival, sendHostMessage])

  useEffect(() => {
    startRef.current = startMatchInternal
  }, [startMatchInternal])

  const startMatch = useCallback(() => startRef.current(), [])

  const setBattleFormat = useCallback((format: BattleFormatId) => {
    if (roleRef.current !== 'host' || festival) return
    const definition = battleFormatById(format)
    if (!definition.enabled) {
      setStatus(definition.unavailableReason ?? 'THAT BATTLE FORMAT IS NOT AVAILABLE')
      return
    }
    if (format === '2v2' && profileRef.current?.mode !== 'casual') {
      setStatus('2V2 TAG TEAM IS CASUAL ONLY · SWITCH THE ROOM TO CASUAL FIRST')
      return
    }
    if (format !== '2v2' && Object.keys(connsRef.current).length > 1) {
      setStatus('MOVE THE EXTRA GUESTS OUT BEFORE SWITCHING BACK TO 1V1')
      return
    }
    commitRules({ ...houseRulesRef.current, format })
  }, [commitRules, festival])

  const setRulePreset = useCallback((preset: HouseRulePreset) => {
    if (roleRef.current !== 'host' || festival) return
    if (preset !== 'standard' && profileRef.current?.mode !== 'casual') {
      setStatus('CUSTOM AND SHUFFLE HOUSE RULES ARE CASUAL ROOMS ONLY')
      return
    }
    const current = houseRulesRef.current
    if (preset === 'standard') {
      commitRules(standardHouseRules(current.format))
      return
    }
    if (preset === 'custom') {
      const modifiers = current.preset === 'custom' && current.modifiers.length > 0
        ? current.modifiers
        : ['hype-surge' as const]
      commitRules(customHouseRules(current.format, modifiers))
      return
    }
    commitRules(generateShuffleRules(current.chaos, current.format, randomSeed()))
  }, [commitRules, festival])

  const setShuffleChaos = useCallback((chaos: ShuffleChaos) => {
    if (roleRef.current !== 'host' || festival) return
    if (profileRef.current?.mode !== 'casual') {
      setStatus('SHUFFLE MADNESS IS A CASUAL ROOM FORMAT')
      return
    }
    const current = houseRulesRef.current
    commitRules(generateShuffleRules(chaos, current.format, randomSeed()))
  }, [commitRules, festival])

  const toggleHouseModifier = useCallback((id: HouseModifierId) => {
    if (roleRef.current !== 'host' || festival) return
    if (profileRef.current?.mode !== 'casual') {
      setStatus('CUSTOM MIXTAPES ARE A CASUAL ROOM FORMAT')
      return
    }
    const current = houseRulesRef.current
    const base = current.preset === 'custom'
      ? current
      : customHouseRules(current.format, current.modifiers)
    commitRules({
      ...base,
      preset: 'custom',
      modifiers: toggleModifier(base.modifiers, id, base.format),
    })
  }, [commitRules, festival])

  const randomizeHouseRules = useCallback(() => {
    if (roleRef.current !== 'host' || festival) return
    if (profileRef.current?.mode !== 'casual') {
      setStatus('SHUFFLE MADNESS IS A CASUAL ROOM FORMAT')
      return
    }
    const current = houseRulesRef.current
    commitRules(generateShuffleRules(current.chaos, current.format, randomSeed()))
  }, [commitRules, festival])

  const markRulesReady = useCallback((ready: boolean) => {
    const role = roleRef.current
    const seat = seatRef.current
    if (!role) return
    const accepted = ready
      ? [...rulesAcceptedRef.current, seat]
      : rulesAcceptedRef.current.filter((entry) => entry !== seat)
    const nextReady = ready
      ? [...rulesReadyRef.current, seat]
      : rulesReadyRef.current.filter((entry) => entry !== seat)
    setRuleSeats(accepted, nextReady)
    if (role === 'host') {
      sendRules()
      setStatus(ready ? 'RULES ACCEPTED · WAITING FOR THE ROOM' : 'READY STATUS CLEARED')
      return
    }    connRef.current?.send({
      type: 'rules-ready',
      revision: rulesRevisionRef.current,
      seat,
      ready,
    } satisfies ClientMessage)
    setStatus(ready ? 'RULES ACCEPTED · WAITING FOR THE HOST' : 'READY STATUS CLEARED')
  }, [sendRules, setRuleSeats])

  const canStart = Boolean(
    role === 'host' &&
    (houseRules.preset === 'standard' || mode === 'casual') &&
    battleFormatById(houseRules.format).enabled &&
    houseRulesValidationError(houseRules) === null &&
    (houseRules.format === '2v2'
      ? mode === 'casual' && TEAM_ORDER.every((seat) => Boolean(seats[seat]))
      : Boolean(seats.host && seats.guest)) &&
    (houseRules.format === '2v2' ? TEAM_ORDER : (['host', 'guest'] as RoomSeat[])).every(
      (seat) => rulesAccepted.includes(seat) && rulesReady.includes(seat),
    )
  )

  const hostDispatch = useCallback((seat: RoomSeat, action: BattleAction) => {
    const current = stateRef.current
    if (!current || current.phase === 'over') return
    if (current.party) {
      // A defensive window is the defending team's action, even though the
      // attacker still holds the turn. Without this, no seat can answer it
      // and the whole match stalls on the prompt.
      const counterDefense =
        action.type === 'COUNTER' &&
        Boolean(current.counterPrompt) &&
        current.counterPrompt?.defender === roomTeam(seat)
      // Skipping a shared cinematic is presentation, not a turn action.
      const cinematicSkip = action.type === 'DISMISS_CINEMATIC'
      if (!counterDefense && !cinematicSkip) {
        // Only the seat holding the turn may act; teammates cannot move cards.
        if (current.party.activeSeat !== seat) return
        if (current.phase !== roomTeam(seat)) return
      }
    }
    const prepared = current.party ? cloneBattleState(current) : current
    const side = current.party ? roomTeam(seat) : seat === 'host' ? 'player' : 'rival'
    const next = battleReducer(prepared, { ...action, side })
    if (next === prepared) return
    if (next.party) {
      if (next.phase === 'over') {
        next.party.activeSeat = null
        commitActiveSeat(null)
      } else {
        // The engine tags the next seat in as the turn begins.
        const active = (next.party.controllers[next.phase] ?? seat) as RoomSeat
        next.party.activeSeat = active
        commitActiveSeat(active)
      }
    }
    stateRef.current = next
    setState(next)
    sendHostMessage({ type: 'state', state: next })
  }, [commitActiveSeat, sendHostMessage])

  useEffect(() => {
    dispatchRef.current = hostDispatch
  }, [hostDispatch])

  const dispatch = useCallback((action: BattleAction) => {
    if (roleRef.current === 'host') {
      hostDispatch('host', action)
      return
    }
    if (roleRef.current === 'guest') {
      const intent: ClientMessage = {
        type: 'action',
        action: { ...action, side: 'rival' },
      }
      connRef.current?.send(intent)
    }
  }, [hostDispatch])

  const requestRematch = useCallback(() => {
    if (roleRef.current === 'host') {
      startRef.current()
      return
    }
    const request: ClientMessage = { type: 'rematch' }
    connRef.current?.send(request)
  }, [])

  const leave = useCallback(() => {
    const leavingAsHost = roleRef.current === 'host'
    phaseRef.current = 'idle'
    try {
      if (leavingAsHost) {
        sendHostMessage({ type: 'left' })
      } else if (connRef.current?.open) {
        connRef.current.send({ type: 'leave' } satisfies ClientMessage)
      }
    } catch {
      // The peer may already be gone.
    }
    teardown()
    enterPhase('idle')
    setRole(null)
    setCode('')
    setMode('casual')
    setOpponentName('')
    setOpponentId(null)
    setOpponentStreak(0)
    setStatus('')
    setError('')
    setState(null)
    setForfeit(null)
    commitActiveSeat(null)
    resetRules()
  }, [commitActiveSeat, enterPhase, resetRules, sendHostMessage, teardown])

  useEffect(() => () => teardown(), [teardown])

  return {
    phase,
    role,
    code,
    mode,
    opponentName,
    opponentId,
    opponentStreak,
    status,
    error,
    state,
    matchId,
    forfeit,
    seats,
    localSeat,
    activeSeat,
    houseRules,
    rulesRevision,
    rulesAccepted,
    rulesReady,
    canStart,
    createRoom,
    joinRoom,
    startMatch,
    requestRematch,
    setRulePreset,
    setBattleFormat,
    setShuffleChaos,
    toggleHouseModifier,
    randomizeHouseRules,
    markRulesReady,
    dispatch,
    leave,
  }
}
