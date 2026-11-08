import { useCallback, useEffect, useRef, useState } from 'react'
import { Peer, type DataConnection } from 'peerjs'
import {
  battleReducer,
  createBattle,
  type BattleAction,
  type BattleState,
} from '../game/battle'
import { containsPersonalArtist, DEFAULT_DECK, sanitizeLineup, validDeck } from '../game/settings'
import type { OnlineMode } from '../game/types'
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
  type ClientMessage,
  type HostMessage,
  type PlayerProfile,
  type RoomMessage,
} from './protocol'

export type OnlineRole = 'host' | 'guest'
export type OnlinePhase = 'idle' | 'hosting' | 'joining' | 'lobby' | 'battle' | 'error'

export interface OnlineForfeit {
  winner: OnlineRole
  loser: OnlineRole
  loserName: string
}

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
  createRoom: (profile: PlayerProfile) => void
  joinRoom: (code: string, profile: PlayerProfile) => void
  startMatch: () => void
  requestRematch: () => void
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
  const [forfeit, setForfeit] = useState<OnlineForfeit | null>(null)

  const peerRef = useRef<Peer | null>(null)
  const connRef = useRef<DataConnection | null>(null)
  const stateRef = useRef<BattleState | null>(null)
  const profileRef = useRef<PlayerProfile | null>(null)
  const opponentRef = useRef<PlayerProfile | null>(null)
  const roleRef = useRef<OnlineRole | null>(null)
  const codeRef = useRef('')
  const phaseRef = useRef<OnlinePhase>('idle')
  const startRef = useRef<() => void>(() => {})

  const enterPhase = useCallback((next: OnlinePhase) => {
    phaseRef.current = next
    setPhase(next)
  }, [])

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
      stateRef.current = ended
      setState(ended)
      setForfeit({ winner, loser, loserName })
      setOpponentName('')
      setOpponentId(null)
      setOpponentStreak(0)
      opponentRef.current = null
      setStatus(`${loserName} LEFT THE MATCH · FORFEIT`)
      return true
    },
    [],
  )

  const teardown = useCallback(() => {
    const connection = connRef.current
    connRef.current = null
    try {
      connection?.close()
    } catch {
      // Already closed.
    }
    const peer = peerRef.current
    peerRef.current = null
    try {
      peer?.destroy()
    } catch {
      // Already destroyed.
    }
    stateRef.current = null
    opponentRef.current = null
    setOpponentId(null)
    setOpponentStreak(0)
    profileRef.current = null
    roleRef.current = null
    codeRef.current = ''
  }, [])

  const handleHostMessage = useCallback((raw: unknown) => {
    const message = raw as RoomMessage
    if (!message || typeof message !== 'object') return

    if (message.type === 'hello') {
      const profile = sanitizeProfile(message.profile)
      if (!profile) return
      if ((profile.festivalId ?? null) !== (festival?.event_id ?? null)) {
        opponentRef.current = null
        setOpponentName('')
        setOpponentId(null)
        setOpponentStreak(0)
        setStatus('FESTIVAL MISMATCH · BOTH PLAYERS MUST USE THE SAME ACTIVE EVENT')
        return
      }
      if (profileRef.current && profile.mode !== profileRef.current.mode) {
        opponentRef.current = null
        setOpponentName('')
        setStatus(`MODE MISMATCH · ROOM IS ${profileRef.current.mode.toUpperCase()}`)
        return
      }
      if (festival && !festivalDeckLegal(profile.deck, festival)) {
        opponentRef.current = null
        setOpponentName('')
        setOpponentId(null)
        setOpponentStreak(0)
        setStatus('THEIR DECK DOES NOT MEET THE FESTIVAL SETLIST REQUIREMENTS')
        return
      }
      opponentRef.current = profile
      setOpponentName(profile.name)
      setOpponentId(profile.playerId ?? null)
      setOpponentStreak(profile.festivalStreak ?? 0)
      setMode(profile.mode)
      setStatus('OPPONENT IN THE ROOM · START WHEN READY')
      const self = profileRef.current
      if (self) {
        const welcome: HostMessage = { type: 'welcome', profile: self, code: codeRef.current }
        connRef.current?.send(welcome)
      }
      return
    }

    if (message.type === 'action') {
      const current = stateRef.current
      if (!current || current.phase === 'over') return
      const action = { ...message.action, side: 'rival' as const }
      const next = battleReducer(current, action)
      if (next === current) return
      stateRef.current = next
      setState(next)
      const snapshot: HostMessage = { type: 'state', state: next }
      connRef.current?.send(snapshot)
      return
    }

    if (message.type === 'rematch') {
      startRef.current()
      return
    }

    if (message.type === 'leave') {
      if (endForfeit('host', 'guest', opponentRef.current?.name ?? 'OPPONENT')) return
      setStatus('OPPONENT LEFT THE ROOM')
      setOpponentName('')
      setOpponentId(null)
      setOpponentStreak(0)
      opponentRef.current = null
    }
  }, [endForfeit, festival])

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
      if (profile) {
        opponentRef.current = profile
        setOpponentName(profile.name)
        setOpponentId(profile.playerId ?? null)
        setOpponentStreak(profile.festivalStreak ?? 0)
      }
      enterPhase('lobby')
      setStatus('CONNECTED · WAITING FOR THE HOST')
      return
    }

    if (message.type === 'start' || message.type === 'state') {
      stateRef.current = message.state
      setState(message.state)
      if (message.type === 'start') {
        setForfeit(null)
        enterPhase('battle')
        setStatus('LIVE · P2P')
        setMatchId((id) => id + 1)
      }
      return
    }

    if (message.type === 'left') {
      if (endForfeit('guest', 'host', opponentRef.current?.name ?? 'HOST')) return
      setStatus('HOST LEFT THE ROOM')
      setOpponentName('')
      setOpponentId(null)
      setOpponentStreak(0)
      opponentRef.current = null
    }
  }, [endForfeit, enterPhase, festival])

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

      setRole('host')
      setCode(nextCode)
      setMode(self.mode)
      enterPhase('hosting')
      setStatus('OPENING THE ROOM…')
      setError('')
      setForfeit(null)
      setOpponentName('')
      setState(null)

      nextPeer.on('open', () => {
        enterPhase('lobby')
        setStatus('ROOM OPEN · SHARE THE CODE')
      })

      nextPeer.on('connection', (connection) => {
        if (connRef.current && connRef.current.open) {
          connection.close()
          return
        }
        connRef.current = connection
        connection.on('open', () => setStatus('OPPONENT CONNECTED'))
        connection.on('data', handleHostMessage)
        connection.on('close', () => {
          if (stateRef.current?.phase === 'over') return
          if (endForfeit('host', 'guest', opponentRef.current?.name ?? 'OPPONENT')) return
          setStatus('OPPONENT DISCONNECTED')
          setOpponentName('')
          opponentRef.current = null
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
    [endForfeit, enterPhase, festival, handleHostMessage, teardown],
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

      setRole('guest')
      setCode(nextCode)
      setMode(self.mode)
      enterPhase('joining')
      setStatus('DIALING THE ROOM…')
      setError('')
      setForfeit(null)
      setOpponentName('')
      setState(null)

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
    [endForfeit, enterPhase, festival, handleGuestMessage, teardown],
  )

  const startMatchInternal = useCallback(() => {
    if (roleRef.current !== 'host') return
    const self = profileRef.current
    const opponent = opponentRef.current
    if (!self || !opponent) {
      setStatus('WAITING FOR AN OPPONENT TO JOIN')
      return
    }
    if (self.mode !== opponent.mode) {
      setStatus(`MODE MISMATCH · BOTH PLAYERS MUST CHOOSE ${self.mode.toUpperCase()}`)
      return
    }
    if (containsPersonalArtist(self.deck) || containsPersonalArtist(opponent.deck)) {
      setStatus('MY ARTIST CARDS ARE LOCAL ONLY · ROOM BLOCKED')
      return
    }
    if (festival) {
      if (!festivalDeckLegal(self.deck, festival) || !festivalDeckLegal(opponent.deck, festival)) {
        setStatus('FESTIVAL DECK CHECK FAILED · BOTH MIXTAPES MUST MEET THE SETLIST')
        return
      }
      if ((self.festivalId ?? null) !== festival.event_id || (opponent.festivalId ?? null) !== festival.event_id) {
        setStatus('FESTIVAL MISMATCH · BOTH PLAYERS MUST USE THE SAME EVENT')
        return
      }
    }
    const next = createBattle({
      deck: validDeck(self.deck) ? self.deck : DEFAULT_DECK,
      lineup: self.lineup,
      rivalDeck: validDeck(opponent.deck) ? opponent.deck : DEFAULT_DECK,
      rivalLineup: opponent.lineup,
      difficulty: 'HEADLINER',
      progress: self.progress,
      rivalProgress: opponent.progress,
      playerName: self.name,
      rivalName: opponent.name,
      playerCrowd: 72,
      rivalCrowd: 72,
      online: true,
      onlineMode: self.mode,
      festival: festival
        ? makeOnlineFestivalRule(festival, setlistSynergy(self.deck, festival).activated)
        : undefined,
      venue: festival ? venueFor(festival) : undefined,
    })
    stateRef.current = next
    setState(next)
    setForfeit(null)
    enterPhase('battle')
    setStatus('LIVE · P2P')
    setMatchId((id) => id + 1)
    const start: HostMessage = { type: 'start', state: next }
    connRef.current?.send(start)
  }, [enterPhase, festival])

  useEffect(() => {
    startRef.current = startMatchInternal
  }, [startMatchInternal])

  const startMatch = useCallback(() => startRef.current(), [])

  const dispatch = useCallback((action: BattleAction) => {
    if (roleRef.current === 'host') {
      const current = stateRef.current
      if (!current || current.phase === 'over') return
      const next = battleReducer(current, { ...action, side: 'player' })
      if (next === current) return
      stateRef.current = next
      setState(next)
      const snapshot: HostMessage = { type: 'state', state: next }
      connRef.current?.send(snapshot)
      return
    }

    if (roleRef.current === 'guest') {
      const intent: ClientMessage = {
        type: 'action',
        action: { ...action, side: 'rival' },
      }
      connRef.current?.send(intent)
    }
  }, [])

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
      if (connRef.current?.open) {
        if (leavingAsHost) {
          connRef.current.send({ type: 'left' } satisfies HostMessage)
        } else {
          connRef.current.send({ type: 'leave' } satisfies ClientMessage)
        }
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
  }, [enterPhase, teardown])

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
    createRoom,
    joinRoom,
    startMatch,
    requestRematch,
    dispatch,
    leave,
  }
}
