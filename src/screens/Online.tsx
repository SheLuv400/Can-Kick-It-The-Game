import { useEffect, useRef, useState, type CSSProperties, type FormEvent } from 'react'
import type { BattleState } from '../game/battle'
import type { OnlineMode, Settings } from '../game/types'
import { useAccount } from '../account/AccountProvider'
import { useSocial, type FriendPresence } from '../account/SocialProvider'
import { normalizeFriendCode } from '../account/account'
import { inverseResult, recordOnlineMatch } from '../online/leaderboard'
import { FATAL_SEATS, normalizeRoomCode, roomSeatName, roomTeam, seatSide, sideLabel, TRIPLE_SEATS, type PlayerProfile, type RoomChatControl, type RoomSeat } from '../online/protocol'
import { usePeerRoom } from '../online/usePeerRoom'
import {
  fetchOnlineBan,
  formatPenaltyClock,
  mergeOnlinePenalty,
  readQuitPenalty,
  recordOnlineQuit,
  type OnlineBanStatus,
  type OnlinePenalty,
} from '../online/conduct'
import { getArtist } from '../game/roster'
import { portraitUrl } from '../game/portraits'
import { careerTitleForId } from '../game/career'
import { Battle, type BattlePerformance } from './Battle'
import { PlayerCardModal } from '../components/PlayerCardModal'
import { HouseRulesPanel } from '../components/HouseRules'
import { Portrait } from '../components/Portrait'
import { RoomChat } from '../components/RoomChat'
import { OnlineSafety } from '../components/OnlineSafety'
import {
  festivalById,
  festivalCountdown,
  festivalDeckLegal,
  festivalDeckTagSummary,
  festivalStatus,
  festivalStatusLabel,
  festivalWindow,
  type FestivalProgress,
  type FestivalRewardSummary,
} from '../game/festivals'
import { containsPersonalArtist, validDeck } from '../game/settings'

interface JoinRequest {
  code: string
  mode: OnlineMode
  nonce: number
}

interface OnlineProps {
  settings: Settings
  onBack: () => void
  onDeck: () => void
  onUpdate: (patch: Partial<Settings>) => void
  onAccount: () => void
  onBadgeResult: (
    winner: 'player' | 'rival' | 'draw',
    plays: Record<string, number>,
    performance: BattlePerformance,
  ) => void
  joinRequest?: JoinRequest | null
  onJoinConsumed?: () => void
  festivalId?: string | null
  festivalIntent?: 'host' | 'join' | null
  festivalProgress?: FestivalProgress | null
  festivalReward?: FestivalRewardSummary | null
  onFestivalResult?: (result: {
    eventId: string
    won: boolean
    draw: boolean
    completed: boolean
    opponentId: string | null
    opponentStreak: number
    features: number
    plays: Record<string, number>
  }) => void
}

type LobbyMode = 'choose' | 'join'

/** Card art used as the private-room backdrop. Missing files are skipped. */
const ROOM_ARTISTS = [
  'taj-omen',
  'amara-afterglow',
  'tangarine-lux',
  'krown-vandal',
  'cipher-jones',
  'nikki-noize',
  'macko-deville',
  'bishop-brake',
]

const MODE_COPY: Record<OnlineMode, { title: string; tag: string; blurb: string }> = {
  casual: {
    title: 'CASUAL',
    tag: 'LEVEL 1 · DEFAULT LOADOUTS',
    blurb: 'Everyone plays the base cards. No upgraded moves, no loadouts, no ranked stakes.',
  },
  ranked: {
    title: 'RANKED',
    tag: 'FULL COLLECTION · LEADERBOARD',
    blurb: 'Bring your levels and custom loadouts. The result counts on the ranked board.',
  },
}

function RoomCode({ code }: { code: string }) {
  return (
    <div className="online-code" aria-label={`Room code ${code.split('').join(' ')}`}>
      {code.split('').map((letter, index) => (
        <span key={`${letter}-${index}`}>{letter}</span>
      ))}
    </div>
  )
}

function ModeBadge({ mode }: { mode: OnlineMode }) {
  return (
    <span className={`mode-badge mode-badge--${mode}`}>
      <i /> {mode === 'ranked' ? 'RANKED' : 'CASUAL'}
    </span>
  )
}

export function Online({
  settings,
  onBack,
  onDeck,
  onUpdate,
  onAccount,
  onBadgeResult,
  joinRequest,
  onJoinConsumed,
  festivalId = null,
  festivalIntent = null,
  festivalProgress = null,
  festivalReward = null,
  onFestivalResult,
}: OnlineProps) {
  const { account, addFriend, removeFriend, recordMatch } = useAccount()
  const social = useSocial()
  const { setPlaying, rememberFriendProfile } = social
  const selfAvatar = account?.avatarArtistId ? getArtist(account.avatarArtistId) : null
  const festival = festivalById(festivalId)
  const session = usePeerRoom(festival)
  const [mode, setMode] = useState<OnlineMode>(festival ? 'ranked' : joinRequest?.mode ?? 'casual')
  const [lobby, setLobby] = useState<LobbyMode>(festivalIntent === 'join' ? 'join' : 'choose')
  const [joinCode, setJoinCode] = useState('')
  const [copied, setCopied] = useState(false)
  const [friendInput, setFriendInput] = useState('')
  const [friendError, setFriendError] = useState('')
  const [invitedCode, setInvitedCode] = useState('')
  const [viewedFriend, setViewedFriend] = useState<FriendPresence | null>(null)
  const [kickArmed, setKickArmed] = useState<RoomSeat | null>(null)
  const recordedState = useRef<BattleState | null>(null)
  const handledInvite = useRef<number | null>(null)
  const banRef = useRef<OnlineBanStatus | null>(null)
  const [penalty, setPenalty] = useState<OnlinePenalty>(() =>
    mergeOnlinePenalty(null, readQuitPenalty()),
  )
  const [now, setNow] = useState(() => Date.now())

  useEffect(() => {
    if (!festival && !penalty.active) return
    setNow(Date.now())
    const timer = window.setInterval(() => setNow(Date.now()), 1000)
    return () => window.clearInterval(timer)
  }, [festival, penalty.active])

  useEffect(() => {
    if (!account) return
    let alive = true
    const check = async () => {
      const ban = await fetchOnlineBan(account.friendCode)
      if (!alive) return
      banRef.current = ban
      setPenalty(mergeOnlinePenalty(ban, readQuitPenalty()))
    }
    void check()
    const timer = window.setInterval(() => void check(), 30_000)
    return () => {
      alive = false
      window.clearInterval(timer)
    }
  }, [account?.friendCode])

  const personalDeckBlocked = containsPersonalArtist(settings.deck)
  const festivalDeckOk = festival ? festivalDeckLegal(settings.deck, festival) : true
  const onlineDeckOk = !personalDeckBlocked && festivalDeckOk
  const festivalLive = festival ? festivalStatus(festival, now) === 'live' : true
  const makeProfile = (selectedMode: OnlineMode): PlayerProfile => ({
    name: sideLabel(account?.username ?? 'PLAYER'),
    deck: settings.deck,
    lineup: settings.lineup,
    progress: settings.artistProgress,
    mode: festival ? 'ranked' : selectedMode,
    playerId: account?.friendCode,
    festivalId: festival?.event_id ?? null,
    festivalStreak: festivalProgress?.online.streak ?? 0,
  })

  const recordLocalResult = (result: 'win' | 'loss' | 'draw') => {
    if (result === 'win') onUpdate({ wins: settings.wins + 1 })
    else if (result === 'loss') onUpdate({ losses: settings.losses + 1 })
  }

  useEffect(() => {
    const finished = session.state
    if (!finished || finished.phase !== 'over' || recordedState.current === finished) return
    recordedState.current = finished
    const recordedSeat = session.localSeat ?? (session.role === 'host' ? 'host' : 'guest')
    const localSide = finished.party?.format === '2v2'
      ? finished.party.seats.find((seat) => seat.seat === recordedSeat)?.team ?? 'player'
      : seatSide(recordedSeat, false)
    const selfName = localSide === 'player' ? finished.player.name : finished.rival.name
    const opponentName = localSide === 'player' ? finished.rival.name : finished.player.name
    const result =
      finished.winner === 'draw' || !finished.winner
        ? 'draw'
        : finished.winner === localSide
          ? 'win'
          : 'loss'
    const officialRules = session.houseRules.preset === 'standard' && session.houseRules.format !== '2v2'
    if (officialRules && session.mode === 'ranked') {
      recordOnlineMatch(
        { name: selfName, result },
        { name: opponentName, result: inverseResult(result) },
      )
    }
    if (officialRules) recordLocalResult(result)
  }, [session.state, session.role, session.mode, session.houseRules.preset, onUpdate, settings.wins, settings.losses])

  useEffect(() => {
    if (session.phase === 'idle' || session.phase === 'error') {
      setLobby('choose')
      setJoinCode('')
      setCopied(false)
      recordedState.current = null
    }
  }, [session.phase])

  useEffect(() => {
    setKickArmed(null)
  }, [session.phase, session.seats])

  // Closing the tab during a live online match is still a self-quit. There is
  // no reliable unload UI, so write the ledger entry only and let the next
  // Online visit show the cooldown.
  useEffect(() => {
    if (session.phase !== 'battle' || !session.state || session.state.phase === 'over') return
    const onPageHide = (event: PageTransitionEvent) => {
      // Do not count a page entering the back/forward cache as a quit.
      if (!event.persisted) recordOnlineQuit()
    }
    window.addEventListener('pagehide', onPageHide)
    return () => window.removeEventListener('pagehide', onPageHide)
  }, [session.phase, session.state?.phase])

  useEffect(() => {
    setPlaying(session.phase === 'battle' ? session.code : null)
  }, [session.phase, session.code, setPlaying])

  useEffect(() => {
    if (!session.opponentId || !session.opponentName) return
    rememberFriendProfile(session.opponentId, session.opponentName)
  }, [session.opponentId, session.opponentName, social.friends.length, rememberFriendProfile])

  useEffect(() => {
    if (!account) {
      if (session.phase !== 'idle') session.leave()
      return
    }
    if (!joinRequest) return
    if (handledInvite.current === joinRequest.nonce) return
    if (session.phase !== 'idle') return
    handledInvite.current = joinRequest.nonce
    setMode(joinRequest.mode)
    session.joinRoom(joinRequest.code, makeProfile(joinRequest.mode))
    onJoinConsumed?.()
    // The invite nonce is the one-shot trigger; profile data is current at accept time.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [joinRequest?.nonce, account?.id, session.phase])

  const recordSelfForfeit = () => {
    const active = session.state
    if (session.phase !== 'battle' || !active || active.phase === 'over') return
    // Every self-initiated exit from a live online match counts toward the
    // local quit cooldown. CPU/local matches never pass through this screen.
    const quit = recordOnlineQuit()
    setPenalty(mergeOnlinePenalty(banRef.current, quit))
    if (session.houseRules.format === '2v2') return
    // 1v1 only past this guard: the guest drives the rival side.
    const localSide = seatSide(
      session.localSeat ?? (session.role === 'host' ? 'host' : 'guest'),
      false,
    )
    const selfName = localSide === 'player' ? active.player.name : active.rival.name
    const opponentName = localSide === 'player' ? active.rival.name : active.player.name
    if (session.houseRules.preset !== 'standard') return
    if (session.mode === 'ranked') {
      recordOnlineMatch(
        { name: selfName, result: 'loss' },
        { name: opponentName, result: 'win' },
      )
    }
    recordLocalResult('loss')
    recordMatch({ result: 'loss', mode: session.mode })
  }

  const leaveRoom = () => {
    session.leave()
    social.setPlaying(null)
    setLobby('choose')
  }

  const backToMenu = () => {
    recordSelfForfeit()
    session.leave()
    social.setPlaying(null)
    onBack()
  }

  const openMixtape = () => {
    recordSelfForfeit()
    session.leave()
    social.setPlaying(null)
    onDeck()
  }

  const copyCode = async () => {
    try {
      await navigator.clipboard.writeText(session.code)
      setCopied(true)
      window.setTimeout(() => setCopied(false), 1800)
    } catch {
      setCopied(false)
    }
  }

  const copyFriendCode = async () => {
    if (!account) return
    try {
      await navigator.clipboard.writeText(account.friendCode)
      setFriendError('FRIEND CODE COPIED.')
    } catch {
      setFriendError('COPY IS BLOCKED IN THIS WINDOW.')
    }
  }

  const submitFriend = (event: FormEvent) => {
    event.preventDefault()
    setFriendError('')
    try {
      addFriend(friendInput)
      setFriendInput('')
    } catch (reason) {
      setFriendError(reason instanceof Error ? reason.message : 'COULD NOT ADD THAT FRIEND.')
    }
  }

  const invite = (code: string) => {
    const sent = social.inviteFriend(code, session.code, session.mode, festival?.event_id ?? null)
    setInvitedCode(sent ? code : '')
    if (sent) window.setTimeout(() => setInvitedCode(''), 2200)
  }

  const localSeat: RoomSeat = session.localSeat ?? (session.role === 'host' ? 'host' : 'guest')
  const teamMode = session.houseRules.format === '2v2'
  const tripleMode = session.houseRules.format === 'triple-threat'
  const fatalMode = session.houseRules.format === 'fatal-4'
  const freeForAllMode = tripleMode || fatalMode
  const localSide = freeForAllMode
    ? 'player'
    : session.state?.party?.format === '2v2'
      ? session.state.party.seats.find((seat) => seat.seat === localSeat)?.team ?? 'player'
      : teamMode
        ? session.seatTeams[localSeat]
        : seatSide(localSeat, false)
  const forfeitWon = Boolean(session.state && session.forfeit && session.state.winner === localSide)
  const forfeitNotice = session.forfeit
    ? `${session.forfeit.loserName} LEFT THE MATCH · ${forfeitWon ? 'FORFEIT WIN' : 'FORFEIT LOSS'}`
    : undefined
  const penaltyRemaining = penalty.active ? Math.max(0, penalty.until - now) : 0
  const onlineLocked = penaltyRemaining > 0
  // In 2v2 the opponent is the other team, not the first guest who joined.
  // In a free-for-all every other mic is a rival.
  const opposingName = session.state?.party
    ? session.state.party.format === 'triple-threat' || session.state.party.format === 'fatal-4'
      ? session.state.party.seats
          .filter((seat) => seat.seat !== localSeat)
          .map((seat) => seat.name)
          .join(' · ')
      : session.state.party.seats
          .filter((seat) => seat.team === (localSide === 'player' ? 'rival' : 'player'))
          .map((seat) => seat.name)
          .join(' + ')
    : session.opponentName
  const chatControl: RoomChatControl = {
    messages: session.chatMessages,
    seats: session.seats,
    localSeat,
    seatTeams: session.seatTeams,
    teamMode,
    textEnabled: session.textChatEnabled,
    voiceEnabled: session.voiceChatEnabled,
    voiceStatus: session.voiceStatus,
    voiceError: session.voiceError,
    voiceActive: session.voiceActive,
    onToggleText: session.toggleTextChat,
    onToggleVoice: session.toggleVoiceChat,
    onSend: session.sendChat,
  }

  if (onlineLocked && session.phase !== 'battle') {
    return (
      <main className="online">
        <div className="online__bg" aria-hidden="true">
          <span className="online__beam online__beam--l" />
          <span className="online__beam online__beam--r" />
          <span className="online__grid" />
          <span className="online__vignette" />
        </div>
        <div className="online__shell">
          <header className="online__top">
            <button className="link-btn" onClick={backToMenu}>← MAIN MENU</button>
            <span className="online__tag"><i /> ONLINE CONDUCT</span>
            <span />
          </header>
          <section className="online-cooldown" role="alert">
            <span className="online__kicker">
              {penalty.source === 'report' ? 'REPORT BAN ACTIVE' : 'QUIT COOLDOWN ACTIVE'}
            </span>
            <h1>ONLINE <em>LOCKED.</em></h1>
            <p>
              {penalty.source === 'report'
                ? 'This account reached the online conduct threshold. The safety desk has placed a temporary report ban on online play.'
                : `You left ${penalty.quitCount} online matches inside two hours. Three exits trigger a 15-minute online cooldown.`}
            </p>
            <div className="online-cooldown__clock" aria-live="polite">
              <span>BACK IN</span>
              <b>{formatPenaltyClock(penaltyRemaining)}</b>
            </div>
            <span className="online-cooldown__fine">
              CPU battles, the label and your mixtape stay available. This lock only stops online rooms.
            </span>
            <button className="btn btn--primary" onClick={backToMenu}>BACK TO THE SHOW</button>
          </section>
        </div>
      </main>
    )
  }

  if (session.phase === 'battle' && session.state) {
    return (
      <>
      <Battle
        key={session.matchId}
        settings={settings}
        online={{
          side: localSide,
          state: session.state,
          dispatch: session.dispatch,
          roomCode: session.code,
          opponentName: opposingName,
          status: session.status,
          canAct: freeForAllMode
            ? session.state.party?.activeSeat === localSeat
            : !session.state.party || session.activeSeat === localSeat,
          activeName:
            session.state.party?.seats.find((seat) => seat.seat === session.activeSeat)?.name ??
            'YOUR TEAMMATE',
          chat: chatControl,
          triple: freeForAllMode && session.state.party
            ? {
                format: session.state.party.format === 'fatal-4' ? 'fatal-4' : 'triple-threat',
                seats: session.state.party.seats,
                sides: session.state.party.sides ?? {},
                activeSeat: session.state.party.activeSeat,
                targetSeat: session.state.party.targetSeat ?? null,
                localSeat,
                eliminated: session.state.party.eliminated ?? [],
                departed: session.state.party.departed ?? [],
                targetLocked: Boolean(session.state.party.targetLocked),
                onTarget: (seat) => session.selectTripleTarget(seat as RoomSeat),
              }
            : undefined,
        }}
        onExit={backToMenu}
        onRematch={session.requestRematch}
        onDeck={openMixtape}
        onResult={(winner, plays, _objectives, performance) => {
          const officialRules = session.houseRules.preset === 'standard' && session.houseRules.format !== '2v2'
          if (officialRules) onBadgeResult(winner, plays, performance)
          if (officialRules) recordMatch({
            result: winner === 'player' ? 'win' : winner === 'rival' ? 'loss' : 'draw',
            mode: session.mode,
            plays,
            attacks: performance.attacks,
            actions: performance.actions,
            damage: performance.damage,
            kos: performance.kos,
            features: performance.features,
            encores: performance.encores,
            crateDraws: performance.crateDraws,
            responseMs: performance.responseMs,
            responseSamples: performance.responseSamples,
          })
          if (festival) {
            onFestivalResult?.({
              eventId: festival.event_id,
              won: winner === 'player',
              draw: winner === 'draw',
              completed: !session.forfeit,
              opponentId: session.opponentId,
              opponentStreak: session.opponentStreak,
              features: performance.features,
              plays,
            })
          }
        }}
        onUpdate={onUpdate}
        forfeitNotice={forfeitNotice}
        festivalReward={festivalReward}
      />
      <OnlineSafety
        visible
        seats={session.seats}
        localSeat={localSeat}
        roomCode={session.code}
        reporterId={account?.friendCode ?? ''}
      />
      </>
    )
  }

  const inRoom =
    session.phase === 'hosting' || session.phase === 'joining' || session.phase === 'lobby'
  const isHost = session.role === 'host'
  const seatOrder: RoomSeat[] = teamMode
    ? ['host', 'guest', 'guest-2', 'guest-3']
    : fatalMode
      ? FATAL_SEATS
      : tripleMode
        ? TRIPLE_SEATS
        : ['host', 'guest']
  const guestOrder: RoomSeat[] = ['guest', 'guest-2', 'guest-3']
  const teamAPartner = teamMode
    ? guestOrder.find((seat) => session.seats[seat] && session.seatTeams[seat] === 'player')
    : undefined
  const teamBSeats = teamMode
    ? guestOrder.filter((seat) => session.seats[seat] && session.seatTeams[seat] === 'rival')
    : []
  const teamLineup: Array<{ seat: RoomSeat; slot: string }> =
    teamMode && teamAPartner && teamBSeats.length === 2
      ? [
          { seat: 'host', slot: 'A1' },
          { seat: teamBSeats[0], slot: 'B1' },
          { seat: teamAPartner, slot: 'A2' },
          { seat: teamBSeats[1], slot: 'B2' },
        ]
      : []
  const seatName = (seat: RoomSeat) => session.seats[seat]?.name ?? roomSeatName(seat)
  const officialRules = session.houseRules.preset === 'standard'
  const roomCanStart = session.canStart && festivalDeckOk && (!festival || festivalLive)
  if (!account) {
    return (
      <main className="online">
        <div className="online__bg" aria-hidden="true">
          <span className="online__beam online__beam--l" />
          <span className="online__beam online__beam--r" />
          <span className="online__grid" />
          <span className="online__vignette" />
        </div>
        <div className="online__shell">
          <header className="online__top">
            <button className="link-btn" onClick={onBack}>← MAIN MENU</button>
            <span className="online__tag"><i /> ACCOUNT REQUIRED</span>
            <span />
          </header>
          <section className="online-gate">
            <span className="online-gate__art" aria-hidden="true">
              <i />
              <i />
              <i />
            </span>
            <span className="online__kicker">ONLINE VS · SIGN-IN DESK</span>
            <h1>GET A NAME<br /><em>ON THE LIST.</em></h1>
            <p>
              Casual and ranked rooms, friend codes, live presence and match invites all run
              through your CIKI profile. Create one in seconds — your login stays saved on this device.
            </p>
            <div className="online-gate__actions">
              <button className="btn btn--primary btn--xl" onClick={onAccount}>
                SIGN IN / CREATE ACCOUNT
              </button>
              <button className="link-btn" onClick={onBack}>BACK TO THE SHOW</button>
            </div>
            <div className="online-gate__modes">
              <div><b>CASUAL</b><span>BASE CARDS ONLY · NO RANKED STAKES</span></div>
              <div><b>RANKED</b><span>FULL LOADOUTS · LEADERBOARD RESULTS</span></div>
            </div>
          </section>
        </div>
      </main>
    )
  }

  return (
    <main className="online">
      <div className="online__bg" aria-hidden="true">
        <span className="online__beam online__beam--l" />
        <span className="online__beam online__beam--r" />
        <span className="online__grid" />
        <span className="online__vignette" />
      </div>

      <div className="online__shell">
        <header className="online__top">          <button className="link-btn" onClick={backToMenu}>
            {festival ? '← THE FESTIVAL & TOUR CIRCUIT' : '← MAIN MENU'}
          </button>
          <span className={`online__tag ${social.networkReady ? 'is-live' : ''}`}>
            <i /> {social.networkReady ? 'SOCIAL LINE LIVE' : 'TUNING THE SOCIAL LINE'}
          </span>
          <button className="link-btn online-account-link" onClick={onAccount}>
            <span>{account.username.slice(0, 2).toUpperCase()}</span>
            {account.username}
          </button>
        </header>

        <section className={`online__hero ${festival ? 'online__hero--festival' : ''}`}>
          <span className="online__kicker">
            {festival ? `${festival.event_name} · ${festivalStatusLabel(festivalStatus(festival, now))}` : 'THE MIDNIGHT GARDEN · AFTER HOURS'}
          </span>
          <h1>{festival ? <>FESTIVAL <em>ROOM</em></> : <>ONLINE <em>VS</em></>}</h1>
          <p>
            {festival
              ? `${festival.tagline} ${festival.special_modifiers.rule} Both decks must pass the official setlist before the host can start.`
              : 'Run a private room or call a friend straight from your list. Casual keeps everyone on base cards; Ranked brings the full collection and counts on the board.'}
          </p>
          <div className="online__chips">
            {festival ? (
              <>
                <span>INVITE ONLY</span>
                <span>{festivalCountdown(festival, now)}</span>
                <span>{festivalDeckTagSummary(festival)}</span>
                <span>HOST-AUTHORITATIVE P2P</span>
              </>
            ) : (
              <>
                <span>ACCOUNT SAVED</span>
                <span>FRIEND INVITES</span>
                <span>LIVE PRESENCE</span>
                <span>P2P</span>
              </>
            )}
          </div>
        </section>

        {festival && (
          <section className="online-festival-brief">
            <div className="online-festival-brief__poster">
              <span>CIKI LIVE · WEEKEND {String(festival.weekend).padStart(2, '0')}</span>
              <b>{festival.event_name}</b>
              <em>{festival.venue.name} · {festival.venue.city}</em>
              <i>{festival.event_poster.stamp}</i>
            </div>
            <div className="online-festival-brief__rules">
              <span className="online-panel__kicker">OFFICIAL RULE · {festival.special_modifiers.title}</span>
              <h2>{festival.special_modifiers.rule}</h2>
              <p>{festival.special_modifiers.detail}</p>
              <span>{festivalWindow(festival)}</span>
            </div>
            <div className={`online-festival-brief__deck ${festivalDeckOk ? 'is-ready' : ''}`}>
              <span>YOUR 26-CARD SETLIST</span>
              <b>{festivalDeckOk ? 'ELIGIBLE' : 'NOT ELIGIBLE'}</b>
              <em>{validDeck(settings.deck) ? `${settings.deck.length}/26 CARDS LEGAL` : 'DECK MUST BE EXACTLY 26'}</em>
              <i>{festivalDeckTagSummary(festival)}</i>
            </div>
          </section>
        )}

        {session.phase === 'error' && (
          <section className="online-panel online-panel--error" role="alert">
            <span className="online-panel__kicker">THE LINE DROPPED</span>
            <h2>{session.error || 'THE ROOM COULD NOT OPEN.'}</h2>
            <p>Check the code with your friend, or open a fresh room.</p>
            <div className="online-panel__actions">
              <button className="btn btn--primary" onClick={session.leave}>TRY AGAIN</button>
              <button className="btn btn--ghost" onClick={backToMenu}>MAIN MENU</button>
            </div>
          </section>
        )}

        {session.phase !== 'error' && inRoom && (
          <section className="online-panel online-panel--room">
            <div className="online-room__art" aria-hidden="true">
              {ROOM_ARTISTS.map((id, index) => {
                const src = portraitUrl(id)
                return src ? (
                  <img
                    key={id}
                    src={src}
                    alt=""
                    draggable={false}
                    style={{ '--i': index } as CSSProperties}
                  />
                ) : null
              })}
            </div>
            <div className="online-panel__head">
              <div>                  <span className="online-panel__kicker">
                  {isHost ? (festival ? 'YOUR FESTIVAL ROOM' : 'YOUR PRIVATE ROOM') : 'CONNECTING TO A ROOM'}
                </span>
                <h2>{isHost ? 'SEND THE CODE' : session.opponentName ? `HOSTED BY ${session.opponentName}` : 'DIALING…'}</h2>
              </div>
              <div className="online-panel__status-stack">
                <ModeBadge mode={session.mode} />
                <span className={`online-status ${session.opponentName ? 'is-live' : ''}`}>
                  <i /> {session.status || 'WORKING…'}
                </span>
              </div>
            </div>

            <div className="online-room">
              <div className="online-room__code">
                <span className="online-room__label">ROOM CODE</span>
                <RoomCode code={session.code} />
                {isHost && (
                  <button className="btn btn--ghost btn--sm" onClick={() => void copyCode()}>
                    {copied ? 'COPIED' : 'COPY CODE'}
                  </button>
                )}
                <p>
                  {isHost
                    ? 'Share the code, or invite a friend from your list below.'
                    : 'Keep this window open. The host starts the show when both players are ready.'}
                </p>
              </div>

              {festival && (
                <div className="online-festival-room-rule">
                  <span>LOCKED FESTIVAL CONFIGURATION</span>
                  <b>{festival.event_name} · {festival.special_modifiers.title}</b>
                  <p>{festival.special_modifiers.rule} Both players' decks are checked before launch.</p>
                </div>
              )}

              <div className={`online-room__players ${teamMode ? 'is-teams' : ''} ${fatalMode ? 'is-fatal' : ''}`}>
                {seatOrder.map((seat) => {
                  const profile = session.seats[seat]
                  const isYou = seat === localSeat
                  const seatReady = session.rulesReady.includes(seat)
                  const seatAccepted = session.rulesAccepted.includes(seat)
                  const canChoosePartner = isHost && session.phase === 'lobby' && teamMode && Boolean(profile) && seat !== 'host'
                  const canKickSeat = isHost && session.phase === 'lobby' && Boolean(profile) && seat !== 'host'
                  const isPartner = roomTeam(seat, session.seatTeams) === 'player'
                  const teamTag = teamMode
                    ? isPartner
                      ? 'TEAM A'
                      : 'TEAM B'
                    : freeForAllMode
                      ? isYou
                        ? 'YOUR MIC'
                        : roomSeatName(seat)
                      : isYou
                        ? 'YOU'
                        : 'OPPONENT'
                  return (
                    <div
                      key={seat}
                      className={`online-player ${isYou ? 'is-you' : ''} ${profile ? 'is-ready' : ''} ${kickArmed === seat ? 'is-kick-armed' : ''}`}
                    >
                      <span className="online-player__avatar">
                        {isYou && selfAvatar ? (
                          <Portrait artist={selfAvatar} crop="avatar" />
                        ) : (
                          (profile?.name ?? roomSeatName(seat)).slice(0, 2).toUpperCase()
                        )}
                      </span>
                      <div>
                        <b>{profile?.name ?? `${roomSeatName(seat)} SLOT`}</b>
                        <i>
                          {teamTag} · {profile ? (seat === localSeat ? 'YOU' : 'IN THE ROOM') : 'OPEN SLOT'}
                        </i>
                      </div>
                      <span className="online-player__state">
                        {!profile
                          ? 'OPEN SLOT'
                          : seatReady
                            ? 'READY'
                            : seatAccepted
                              ? 'ACCEPTED'
                              : 'NOT READY'}
                      </span>
                      {(canChoosePartner || canKickSeat) && (
                        <span className="online-player__manage">
                          {canChoosePartner && (
                            <button
                              type="button"
                              className={`online-team-btn ${isPartner ? 'is-active' : ''}`}
                              onClick={() => session.setTeamPartner(seat)}
                              aria-pressed={isPartner}
                              aria-label={isPartner ? `${profile?.name ?? roomSeatName(seat)} is your Team A partner` : `Make ${profile?.name ?? roomSeatName(seat)} your Team A partner`}
                            >
                              {isPartner ? 'A PARTNER' : 'SET A'}
                            </button>
                          )}
                          {canKickSeat && (
                            <button
                              type="button"
                              className={`online-kick-btn ${kickArmed === seat ? 'is-armed' : ''}`}
                              onClick={() => {
                                if (kickArmed === seat) {
                                  session.kickSeat(seat)
                                  setKickArmed(null)
                                } else {
                                  setKickArmed(seat)
                                }
                              }}
                              aria-label={kickArmed === seat ? `Confirm kicking ${profile?.name ?? roomSeatName(seat)}` : `Kick ${profile?.name ?? roomSeatName(seat)} from the room`}
                            >
                              {kickArmed === seat ? 'CONFIRM' : 'KICK'}
                            </button>
                          )}
                        </span>
                      )}
                    </div>
                  )
                })}
              </div>

              {teamMode && teamLineup.length === 4 && (
                <div className="online-lineup" aria-label="2v2 turn order">
                  <div className="online-lineup__head">
                    <span>2V2 TURN ORDER</span>
                    <b>HOST PICKS THE TEAM A PARTNER · LINEUP UPDATES LIVE</b>
                  </div>
                  <div className="online-lineup__slots">
                    {teamLineup.map(({ seat, slot }) => (
                      <span
                        key={`${slot}-${seat}`}
                        className={`online-lineup__slot ${slot.startsWith('A') ? 'is-a' : 'is-b'}`}
                      >
                        <em>{slot}</em>
                        <b>{seatName(seat)}</b>
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <RoomChat control={chatControl} />
            <OnlineSafety
              visible={inRoom}
              seats={session.seats}
              localSeat={localSeat}
              roomCode={session.code}
              reporterId={account.friendCode}
            />

            <HouseRulesPanel
              rules={session.houseRules}
              isHost={isHost}
              seat={localSeat}
              accepted={session.rulesAccepted}
              ready={session.rulesReady}
              seatTeams={session.seatTeams}
              seatNames={{
                host: session.seats.host?.name,
                guest: session.seats.guest?.name,
                'guest-2': session.seats['guest-2']?.name,
                'guest-3': session.seats['guest-3']?.name,
              }}
              canStart={roomCanStart}
              festivalLocked={Boolean(festival)}
              onPreset={session.setRulePreset}
              onFormat={session.setBattleFormat}
              onChaos={session.setShuffleChaos}
              onToggle={session.toggleHouseModifier}
              onRandomize={session.randomizeHouseRules}
              onReady={session.markRulesReady}
              onStart={session.startMatch}
            />

            <div className="online-panel__actions">
              {isHost ? (
                <span className="online-panel__fine">
                  {officialRules ? 'OFFICIAL RULES · STANDARD PRIVATE-ROOM REWARDS.' : 'CASUAL HOUSE RULES · RANKED PROGRESSION AND ACHIEVEMENT REWARDS ARE DISABLED.'}
                </span>
              ) : (
                <span className="online-waiting">
                  <i /> {session.rulesReady.includes(localSeat) ? 'WAITING FOR THE HOST TO START' : 'ACCEPT THE RULES, THEN READY UP'}
                </span>
              )}
              <button className="link-btn" onClick={leaveRoom}>LEAVE ROOM</button>
            </div>

            {isHost && (
              <div className="online-room__invites">
                <span>INVITE FROM YOUR FRIEND LIST</span>
                <div>
                  {social.friends.length === 0 && <em>ADD A FRIEND BELOW TO SEND DIRECT INVITES.</em>}
                  {social.friends.map((friend) => (
                    <button
                      key={friend.code}
                      className="online-friend-chip"
                      onClick={() => invite(friend.code)}
                      disabled={friend.status !== 'online'}
                    >
                      <i className={`is-${friend.status}`} />
                      {invitedCode === friend.code ? 'INVITED' : friend.name}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <p className="online-panel__fine">
              If a player closes the tab, the room ends. Ranked forfeits count as a loss; casual games
              stay off the ranked board. Three self-initiated online exits inside two hours trigger a
              15-minute online cooldown. CPU battles never count toward it.
            </p>
          </section>
        )}

        {session.phase !== 'error' && !inRoom && (
          <>
            <section className="online-panel online-panel--lobby">
              <div className="online-panel__head">
                <div>
                  <span className="online-panel__kicker">STEP 01 · SET THE RULES</span>
                  <h2>PICK YOUR ROOM</h2>
                </div>
                <span className="online__deck">
                  SIGNED IN AS {account.username.toUpperCase()}
                </span>
              </div>

              {!festival && <div className="online-modes" role="group" aria-label="Online match mode">
                {(Object.keys(MODE_COPY) as OnlineMode[]).map((option) => {
                  const copy = MODE_COPY[option]
                  return (
                    <button
                      key={option}
                      className={`online-mode ${mode === option ? 'is-active' : ''}`}
                      onClick={() => setMode(option)}
                      aria-pressed={mode === option}
                    >
                      <span className="online-mode__top">
                        <b>{copy.title}</b>
                        <i>{copy.tag}</i>
                      </span>
                      <p>{copy.blurb}</p>
                      <span className="online-mode__check">{mode === option ? 'SELECTED' : 'SELECT'}</span>
                    </button>
                  )
                })}
              </div>}

              {personalDeckBlocked && (
                <div className="online-festival-deck-warning" role="alert">
                  <b>MY ARTIST IS LOCAL ONLY</b>
                  <span>Your personal Artist Card cannot enter any online room. Remove it from the 26-card mixtape, then rebuild the online deck.</span>
                  <button className="btn btn--ghost btn--sm" onClick={openMixtape}>EDIT MIXTAPE</button>
                </div>
              )}

              {festival && !festivalDeckOk && (
                <div className="online-festival-deck-warning" role="alert">
                  <b>SETLIST CHECK FAILED</b>
                  <span>Your 26-card mixtape does not meet {festival.setlist_requirements.map((item) => `${item.count} ${item.label}`).join(' · ')}. Build a legal festival deck before opening a room.</span>
                  <button className="btn btn--ghost btn--sm" onClick={openMixtape}>BUILD THE 26</button>
                </div>
              )}

              {lobby === 'choose' ? (
                <div className="online-choices">
                  <button
                    className="online-choice"
                    onClick={() => session.createRoom(makeProfile(mode))}
                    disabled={!onlineDeckOk || (festival ? !festivalLive : false)}
                  >
                    <span className="online-choice__icon" aria-hidden="true">◉</span>
                    <b>{festival ? 'HOST FESTIVAL ROOM' : 'CREATE ROOM'}</b>
                    <p>
                      {festival
                        ? `Open the private ${festival.event_name} room, share the code and wait for a legal deck.`
                        : `Open a private ${mode} room and share the code or send an invite.`}
                    </p>
                    <em>HOST · YOU REFEREE</em>
                  </button>
                  <button className="online-choice" onClick={() => setLobby('join')} disabled={!onlineDeckOk || (festival ? !festivalLive : false)}>
                    <span className="online-choice__icon" aria-hidden="true">↯</span>
                    <b>{festival ? 'JOIN FESTIVAL ROOM' : 'JOIN ROOM'}</b>
                    <p>
                      {festival
                        ? 'Enter the host code, confirm the same event rules and wait in the festival lobby.'
                        : `Enter a friend's code and bring your ${mode} setup to their stage.`}
                    </p>
                    <em>GUEST · YOU CHALLENGE</em>
                  </button>
                </div>
              ) : (
                <form
                  className="online-join"
                  onSubmit={(event) => {
                    event.preventDefault()
                    session.joinRoom(joinCode, makeProfile(mode))
                  }}
                >
                  <label className="online-field online-field--code">
                    <span>ROOM CODE</span>
                    <input
                      value={joinCode}
                      onChange={(event) => setJoinCode(normalizeRoomCode(event.target.value))}
                      placeholder="ABCDE"
                      maxLength={5}
                      autoCapitalize="characters"
                      autoComplete="off"
                      spellCheck={false}
                      autoFocus
                    />
                  </label>
                  <div className="online-join__actions">
                    <button className="btn btn--primary" type="submit" disabled={joinCode.length !== 5 || !onlineDeckOk}>
                      {festival ? 'JOIN FESTIVAL ROOM' : 'JOIN THE ROOM'}
                    </button>
                    <button className="link-btn" type="button" onClick={() => setLobby('choose')}>
                      BACK
                    </button>
                  </div>
                </form>
              )}

              <p className="online-panel__fine">
                Private rooms use a direct peer-to-peer link. A strict office or school network may
                block the connection — a phone hotspot usually works.
              </p>
            </section>

            <section className="online-panel online-panel--friends">
              <div className="online-panel__head">
                <div>
                  <span className="online-panel__kicker">STEP 02 · THE GUEST LIST</span>
                  <h2>FRIENDS &amp; PRESENCE</h2>
                </div>
                <span className={`social-status social-status--${social.status}`}>
                  <i /> YOU ARE {social.status.toUpperCase()}
                </span>
              </div>

              <div className="friend-code-row">
                <div>
                  <span>YOUR FRIEND CODE</span>
                  <b>{account.friendCode}</b>
                </div>
                <button className="btn btn--ghost btn--sm" onClick={() => void copyFriendCode()}>
                  COPY
                </button>
                <form className="friend-add" onSubmit={submitFriend}>
                  <input
                    value={friendInput}
                    onChange={(event) => {
                      setFriendInput(normalizeFriendCode(event.target.value))
                      setFriendError('')
                    }}
                    placeholder="ADD FRIEND CODE"
                    maxLength={6}
                    autoComplete="off"
                    spellCheck={false}
                    aria-label="Friend code to add"
                  />
                  <button className="btn btn--primary btn--sm" type="submit" disabled={friendInput.length !== 6}>
                    ADD
                  </button>
                </form>
              </div>
              {friendError && <p className="friend-error">{friendError}</p>}

              <div className="friend-list">
                {social.friends.length === 0 ? (
                  <div className="friend-empty">
                    <b>YOUR LIST IS EMPTY.</b>
                    <span>Send your code to a friend, add theirs, and you will see each other online.</span>
                  </div>
                ) : (
                  social.friends.map((friend) => {
                    const avatarArtist = friend.avatarArtistId
                      ? getArtist(friend.avatarArtistId)
                      : null
                    const friendTitle = careerTitleForId(friend.titleId)
                    return (
                    <div className="friend-row" key={friend.code}>
                      <span className={`friend-row__avatar is-${friend.status}`}>
                        {avatarArtist ? (
                          <Portrait artist={avatarArtist} crop="avatar" />
                        ) : (
                          friend.name.slice(0, 2).toUpperCase()
                        )}
                      </span>
                      <div className="friend-row__copy">
                        <b>{friend.name}</b>
                        {friendTitle && (
                          <em className="friend-row__title" style={{ color: friendTitle.color }}>{friendTitle.label}</em>
                        )}
                        <span>
                          <i className={`is-${friend.status}`} />
                          {friend.status === 'playing'
                            ? `PLAYING${friend.roomCode ? ` · ROOM ${friend.roomCode}` : ''}`
                            : friend.status === 'online'
                              ? 'ONLINE · READY TO RUN IT'
                              : 'OFFLINE'}
                        </span>
                      </div>
                      <div className="friend-row__actions">
                        {inRoom && isHost && (
                          <button
                            className="btn btn--primary btn--sm"
                            onClick={() => invite(friend.code)}
                            disabled={friend.status !== 'online'}
                          >
                            {invitedCode === friend.code ? 'INVITED' : 'INVITE'}
                          </button>
                        )}
                        <button
                          className="btn btn--ghost btn--sm friend-row__card"
                          onClick={() => setViewedFriend(friend)}
                          aria-label={`View ${friend.name} player card`}
                        >
                          CARD
                        </button>
                        <button
                          className="friend-row__remove"
                          onClick={() => removeFriend(friend.code)}
                          aria-label={`Remove ${friend.name}`}
                          title="Remove friend"
                        >
                          ✕
                        </button>
                      </div>
                    </div>
                    )
                  })
                )}
              </div>
              <p className="online-panel__fine">
                Presence updates while both players have the game open. Invites arrive in-game with
                accept or decline — no code needed. Friend lists and credentials stay on this device.
              </p>
            </section>
          </>
        )}
      </div>

      {viewedFriend && (
        <PlayerCardModal
          name={viewedFriend.name}
          code={viewedFriend.code}
          stats={viewedFriend.stats}
          avatarArtistId={viewedFriend.avatarArtistId}
          titleId={viewedFriend.titleId}
          onClose={() => setViewedFriend(null)}
        />
      )}
    </main>
  )
}
