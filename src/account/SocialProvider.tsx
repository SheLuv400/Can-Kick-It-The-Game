import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react'
import { Peer, type DataConnection } from 'peerjs'
import type { OnlineMode } from '../game/types'
import {
  emptyPlayerStats,
  normalizeFriendCode,
  normalizePlayerStats,
  type FriendRecord,
  type PlayerStats,
} from './account'
import { useAccount } from './AccountProvider'

export type FriendStatus = 'offline' | 'online' | 'playing'

export interface FriendPresence {
  code: string
  name: string
  status: FriendStatus
  roomCode?: string
  avatarArtistId: string | null
  titleId: string | null
  stats: PlayerStats
}

export interface GameInvite {
  id: string
  fromCode: string
  fromName: string
  roomCode: string
  mode: OnlineMode
  festivalId?: string | null
  receivedAt: number
}

interface SocialContextValue {
  friends: FriendPresence[]
  invites: GameInvite[]
  status: FriendStatus
  notice: string
  networkReady: boolean
  inviteFriend: (code: string, roomCode: string, mode: OnlineMode, festivalId?: string | null) => boolean
  acceptInvite: (id: string) => { roomCode: string; mode: OnlineMode; festivalId?: string | null } | null
  declineInvite: (id: string) => void
  rememberFriendProfile: (code: string, name: string) => void
  setPlaying: (roomCode: string | null) => void
}

const SocialContext = createContext<SocialContextValue | null>(null)

const SOCIAL_PREFIX = 'ciki-friend-v1-'
const PEER_OPTIONS = {
  debug: 0 as const,
  config: {
    iceServers: [
      { urls: 'stun:stun.l.google.com:19302' },
      { urls: 'stun:stun1.l.google.com:19302' },
    ],
  },
}

type SocialMessage =
  | {
      type: 'presence'
      profile: {
        code: string
        name: string
        status: FriendStatus
        roomCode?: string
        avatarArtistId: string | null
        titleId: string | null
        stats: PlayerStats
      }
    }
  | {
      type: 'invite'
      id: string
      fromName: string
      roomCode: string
      mode: OnlineMode
      festivalId?: string | null
    }
  | { type: 'invite-response'; id: string; accepted: boolean }

function validRoom(value: unknown): value is string {
  return typeof value === 'string' && /^[A-Z0-9]{5}$/.test(value)
}

function validMode(value: unknown): value is OnlineMode {
  return value === 'casual' || value === 'ranked'
}

function validAvatar(value: unknown): string | null {
  return typeof value === 'string' && /^[a-z0-9-]{1,48}$/.test(value) ? value : null
}

function validTitle(value: unknown): string | null {
  return typeof value === 'string' && /^[a-z0-9-]{1,64}$/.test(value) ? value : null
}

export function SocialProvider({ children }: { children: ReactNode }) {
  const { account, rememberFriendName } = useAccount()
  const [friends, setFriends] = useState<FriendPresence[]>([])
  const [invites, setInvites] = useState<GameInvite[]>([])
  const [status, setStatus] = useState<FriendStatus>('offline')
  const [notice, setNotice] = useState('')
  const [networkReady, setNetworkReady] = useState(false)

  const accountRef = useRef(account)
  const friendsRef = useRef<FriendRecord[]>(account?.friends ?? [])
  const peerRef = useRef<Peer | null>(null)
  // Keep every live link. Both friends dial each other as soon as they come
  // online, so a single-slot map makes the two sides close each other's
  // reciprocal connection and leaves both showing offline. A friend is online
  // while at least one link is open; the last close is what flips them offline.
  const connectionsRef = useRef(new Map<string, Set<DataConnection>>())
  const statusRef = useRef<FriendStatus>('offline')
  const roomRef = useRef<string | null>(null)
  const rememberRef = useRef(rememberFriendName)

  accountRef.current = account
  friendsRef.current = account?.friends ?? []
  rememberRef.current = rememberFriendName

  const friendKey = (account?.friends ?? []).map((friend) => friend.code).join('|')

  const updateFriend = useCallback((code: string, patch: Partial<FriendPresence>) => {
    setFriends((current) =>
      current.map((friend) => (friend.code === code ? { ...friend, ...patch } : friend)),
    )
  }, [])

  const rememberFriendProfile = useCallback((code: string, name: string) => {
    const clean = name.trim().slice(0, 18)
    if (!clean) return
    if (!friendsRef.current.some((friend) => friend.code === code)) return
    updateFriend(code, { name: clean })
    rememberRef.current(code, clean)
  }, [updateFriend])

  const sendPresence = useCallback((connection: DataConnection) => {
    const self = accountRef.current
    if (!self || !connection.open) return
    connection.send({
      type: 'presence',
      profile: {
        code: self.friendCode,
        name: self.username,
        status: statusRef.current,
        roomCode: roomRef.current ?? undefined,
        avatarArtistId: self.avatarArtistId,
        titleId: self.activeTitleId,
        stats: self.stats,
      },
    } satisfies SocialMessage)
  }, [])

  const isFriend = useCallback(
    (code: string) => friendsRef.current.some((friend) => friend.code === code),
    [],
  )

  const handleData = useCallback(
    (code: string, raw: unknown) => {
      const message = raw as SocialMessage
      if (!message || typeof message !== 'object' || message.type === undefined) return
      if (message.type === 'presence') {
        const profile = message.profile
        if (!profile || profile.code !== code) return
        updateFriend(code, {
          name: profile.name || `FRIEND ${code}`,
          status: profile.status === 'playing' ? 'playing' : 'online',
          roomCode: validRoom(profile.roomCode) ? profile.roomCode : undefined,
          avatarArtistId: validAvatar(profile.avatarArtistId),
          titleId: validTitle(profile.titleId),
          stats: normalizePlayerStats(profile.stats),
        })
        const known = friendsRef.current.find((friend) => friend.code === code)
        if (known && profile.name && known.name !== profile.name) {
          rememberRef.current(code, profile.name)
        }
        return
      }
      if (message.type === 'invite') {
        if (!isFriend(code) || !validRoom(message.roomCode) || !validMode(message.mode)) return
        setInvites((current) => {
          if (current.some((invite) => invite.id === message.id)) return current
          return [
            ...current,
            {
              id: message.id,
              fromCode: code,
              fromName: message.fromName || `FRIEND ${code}`,
              roomCode: message.roomCode,
              mode: message.mode,
              festivalId: typeof message.festivalId === 'string' ? message.festivalId : null,
              receivedAt: Date.now(),
            },
          ].slice(-4)
        })
        return
      }
      if (message.type === 'invite-response') {
        if (message.accepted) setNotice('INVITE ACCEPTED · GET READY')
        else setNotice('INVITE DECLINED')
      }
    },
    [isFriend, updateFriend],
  )

  const bindConnection = useCallback(
    (connection: DataConnection, code: string) => {
      const connections = connectionsRef.current.get(code) ?? new Set<DataConnection>()
      if (connections.has(connection)) return
      connections.add(connection)
      connectionsRef.current.set(code, connections)

      const removeConnection = () => {
        const current = connectionsRef.current.get(code)
        if (!current) return
        current.delete(connection)
        if (current.size > 0) return
        connectionsRef.current.delete(code)
        updateFriend(code, { status: 'offline' })
      }

      connection.on('open', () => {
        sendPresence(connection)
        updateFriend(code, { status: 'online' })
      })
      connection.on('data', (raw) => handleData(code, raw))
      connection.on('close', removeConnection)
      connection.on('error', removeConnection)
    },
    [handleData, sendPresence, updateFriend],
  )

  const connectTo = useCallback(
    (code: string) => {
      const peer = peerRef.current
      if (!peer || !peer.open || !isFriend(code)) return
      const existing = connectionsRef.current.get(code)
      if (existing && existing.size > 0) return
      try {
        const connection = peer.connect(`${SOCIAL_PREFIX}${code}`, { reliable: true })
        bindConnection(connection, code)
      } catch {
        const current = connectionsRef.current.get(code)
        if (!current || current.size === 0) updateFriend(code, { status: 'offline' })
      }
    },
    [bindConnection, isFriend, updateFriend],
  )

  const connectAll = useCallback(() => {
    friendsRef.current.forEach((friend) => connectTo(friend.code))
  }, [connectTo])

  const broadcastPresence = useCallback(() => {
    connectionsRef.current.forEach((connections) => {
      connections.forEach((connection) => sendPresence(connection))
    })
  }, [sendPresence])

  useEffect(() => {
    if (!account) {
      setFriends([])
      setInvites([])
      setStatus('offline')
      setNetworkReady(false)
      statusRef.current = 'offline'
      roomRef.current = null
      return
    }
    setFriends(
      account.friends.map((friend) => ({
        code: friend.code,
        name: friend.name,
        status: 'offline',
        avatarArtistId: null,
        titleId: null,
        stats: emptyPlayerStats(),
      })),
    )
    setInvites([])
    setStatus('online')
    statusRef.current = 'online'
    roomRef.current = null

    const peer = new Peer(`${SOCIAL_PREFIX}${account.friendCode}`, PEER_OPTIONS)
    peerRef.current = peer
    let disposed = false

    peer.on('open', () => {
      if (disposed) return
      setNetworkReady(true)
      broadcastPresence()
      connectAll()
    })

    peer.on('connection', (connection) => {
      const code = connection.peer.startsWith(SOCIAL_PREFIX)
        ? connection.peer.slice(SOCIAL_PREFIX.length)
        : ''
      if (!code || !isFriend(code)) {
        connection.close()
        return
      }
      bindConnection(connection, code)
    })

    peer.on('disconnected', () => {
      if (!disposed) {
        try {
          peer.reconnect()
        } catch {
          // The room peer will still work if social presence is unavailable.
        }
      }
    })

    peer.on('error', () => {
      if (!disposed) setNetworkReady(false)
    })

    const heartbeat = window.setInterval(() => {
      if (peer.open) {
        broadcastPresence()
        connectAll()
      }
    }, 20_000)

    return () => {
      disposed = true
      window.clearInterval(heartbeat)
      connectionsRef.current.forEach((connections) => {
        connections.forEach((connection) => {
          try {
            connection.close()
          } catch {
            // Already closed.
          }
        })
      })
      connectionsRef.current.clear()
      try {
        peer.destroy()
      } catch {
        // Already destroyed.
      }
      if (peerRef.current === peer) peerRef.current = null
      setNetworkReady(false)
    }
  }, [account?.id, account?.friendCode, bindConnection, broadcastPresence, connectAll, isFriend, sendPresence, updateFriend])

  useEffect(() => {
    if (!account) return
    setFriends((current) =>
      account.friends.map((friend) => {
        const existing = current.find((entry) => entry.code === friend.code)
        return {
          code: friend.code,
          name: friend.name,
          status: existing?.status ?? 'offline',
          roomCode: existing?.roomCode,
          avatarArtistId: existing?.avatarArtistId ?? null,
          titleId: existing?.titleId ?? null,
          stats: existing?.stats ?? emptyPlayerStats(),
        }
      }),
    )
    connectAll()
  }, [friendKey, account?.id, connectAll])

  useEffect(() => {
    if (!account || !networkReady) return
    broadcastPresence()
  }, [account?.stats.updatedAt, account?.avatarArtistId, account?.activeTitleId, networkReady, broadcastPresence])

  const inviteFriend = useCallback(
    (code: string, roomCode: string, mode: OnlineMode, festivalId?: string | null) => {
      const self = accountRef.current
      const connection = [...(connectionsRef.current.get(code) ?? [])].find((entry) => entry.open)
      if (!self || !connection || !validRoom(roomCode) || !validMode(mode)) return false
      const id = `invite-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`
      connection.send({
        type: 'invite',
        id,
        fromName: self.username,
        roomCode,
        mode,
        festivalId: festivalId ?? null,
      } satisfies SocialMessage)
      setNotice(`INVITE SENT TO ${friendsRef.current.find((friend) => friend.code === code)?.name ?? code}`)
      return true
    },
    [],
  )

  const acceptInvite = useCallback((id: string) => {
    const invite = invites.find((entry) => entry.id === id)
    if (!invite) return null
    const connection = [...(connectionsRef.current.get(invite.fromCode) ?? [])].find((entry) => entry.open)
    if (connection) {
      connection.send({ type: 'invite-response', id, accepted: true } satisfies SocialMessage)
    }
    setInvites((current) => current.filter((entry) => entry.id !== id))
    return { roomCode: invite.roomCode, mode: invite.mode, festivalId: invite.festivalId ?? null }
  }, [invites])

  const declineInvite = useCallback((id: string) => {
    const invite = invites.find((entry) => entry.id === id)
    if (invite) {
      const connection = [...(connectionsRef.current.get(invite.fromCode) ?? [])].find((entry) => entry.open)
      if (connection) {
        connection.send({ type: 'invite-response', id, accepted: false } satisfies SocialMessage)
      }
    }
    setInvites((current) => current.filter((entry) => entry.id !== id))
  }, [invites])

  const setPlaying = useCallback(
    (roomCode: string | null) => {
      const next: FriendStatus = roomCode ? 'playing' : 'online'
      statusRef.current = next
      roomRef.current = roomCode
      setStatus(next)
      connectionsRef.current.forEach((connections) => {
        connections.forEach((connection) => sendPresence(connection))
      })
    },
    [sendPresence],
  )

  const value = useMemo<SocialContextValue>(
    () => ({
      friends,
      invites,
      status,
      notice,
      networkReady,
      inviteFriend,
      acceptInvite,
      declineInvite,
      rememberFriendProfile,
      setPlaying,
    }),
    [
      friends,
      invites,
      status,
      notice,
      networkReady,
      inviteFriend,
      acceptInvite,
      declineInvite,
      rememberFriendProfile,
      setPlaying,
    ],
  )

  return <SocialContext.Provider value={value}>{children}</SocialContext.Provider>
}

export function useSocial(): SocialContextValue {
  const context = useContext(SocialContext)
  if (!context) throw new Error('useSocial must be used inside SocialProvider')
  return context
}

export function friendCodeForDisplay(value: string): string {
  return normalizeFriendCode(value)
}
