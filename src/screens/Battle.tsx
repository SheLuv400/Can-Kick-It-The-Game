import {
  useCallback,
  useEffect,
  useMemo,
  useReducer,
  useRef,
  useState,
  type CSSProperties,
} from 'react'
import {
  availableCrews,
  battleReducer,
  backstageRecallCost,
  createBattle,
  CRATE_HYPE_COST,
  CURFEW_ROUND,
  HYPE_CAP,
  MAX_ATTACKS_PER_TURN,
  difficultyLabel,
  matchMvpSummary,
  featureBars,
  featureDamage,
  rivalCrowdFor,
  type BattleAction,
  type BattlePartySeat,
  type BattleState,
  type CardPerformance,
  type CrateHandCard,
  type LastMove,
  type SideState,
} from '../game/battle'
import {
  CIRCUITS,
  objectiveSummary,
  type CircuitRun,
  type ObjectiveSummary,
  type Venue,
} from '../game/circuits'
import { swapBattleState } from '../online/perspective'
import { roomSeatName, type RoomChatControl, type RoomSeat } from '../online/protocol'
import { battleResultCopy } from '../game/result-copy'
import { CREW_META, abilityText, getArtist } from '../game/roster'
import { CATEGORY_LABEL, crateCard, RARITY_META } from '../game/crate'
import { ELEMENT_META, moveById } from '../game/moves'
import type { Crew, Difficulty, Move, Settings } from '../game/types'
import type { CareerMission } from '../game/career'
import type { FestivalRewardSummary, FestivalRun } from '../game/festivals'
import { Card } from '../components/Card'
import { HudStrip } from '../components/Hud'
import { CinematicOverlay } from '../components/Cinematic'
import { RulesModal } from '../components/RulesModal'
import { SettingsModal } from '../components/SettingsModal'
import { VolumeSlider } from '../components/VolumeSlider'
import { Portrait } from '../components/Portrait'
import { CrateDock, MoveDock, StageUnit } from '../components/Combat'
import { RoomChat } from '../components/RoomChat'
import { BATTLE_TRACK, audioEngine, useAudioSnapshot } from '../game/audio'
import { announcerEngine, useAnnouncerSnapshot } from '../game/announcer'
import { specialMoveForArtist } from '../game/moves'
import { focusGamepadElement, onGamepadCommand } from '../input/gamepad'
import {
  houseModifierById,
  houseRulesSummary,
  houseRulesTitle,
} from '../game/house-rules'

export interface TripleThreatControl {
  format: 'triple-threat' | 'fatal-4'
  seats: BattlePartySeat[]
  sides: Record<string, SideState>
  activeSeat: string | null
  targetSeat: string | null
  localSeat: string
  eliminated: string[]
  departed: string[]
  targetLocked: boolean
  onTarget: (seat: string) => void
}

export interface OnlineBattleControl {
  side: 'player' | 'rival'
  state: BattleState
  dispatch: (action: BattleAction) => void
  roomCode: string
  opponentName: string
  status: string
  /** False when another teammate owns the active turn. */
  canAct?: boolean
  activeName?: string
  chat?: RoomChatControl
  triple?: TripleThreatControl
}

export interface BattlePerformance {
  /** Artist IDs sent Backstage during the match, including the local career card. */
  backstage: string[]
  attacks: number
  actions: number
  damage: number
  kos: number
  features: number
  encores: number
  crateDraws: number
  responseMs: number
  responseSamples: number
  cards: Record<string, CardPerformance>
}

const HOUSE_GLYPHS: Record<string, string> = {
  'hype-surge': '▲',
  'crate-frenzy': '▦',
  'double-time-delivery': '⏱',
  'big-stage': '◉',
  'golden-hooks': '✦',
  'sharp-pen-showcase': '✒',
  'backstage-bounce': '↺',
  'encore-spotlight': '♫',
  'last-verse-standing': '☗',
  'crate-lockdown': '▣',
}

const RESPONSE_ACTIONS = new Set<BattleAction['type']>([
  'PLAY_CARD',
  'USE_MOVE',
  'DRAW_CRATE',
  'USE_SPECIAL',
  'ENCORE',
  'FEATURE',
  'BENCH',
  'REVIVE',
  'END_TURN',
])

interface CrowdImpact {
  side: 'player' | 'rival'
  value: number
  nonce: number
  heavy: boolean
}

interface BattleProps {
  settings: Settings
  onExit: () => void
  onRematch: () => void
  onDeck: () => void
  onResult: (
    winner: 'player' | 'rival' | 'draw',
    plays: Record<string, number>,
    objectives: ObjectiveSummary,
    performance: BattlePerformance,
  ) => void
  onTutorial?: () => void
  onUpdate: (patch: Partial<Settings>) => void
  online?: OnlineBattleControl
  circuit?: CircuitRun | null
  venue?: Venue
  forfeitNotice?: string
  festivalRun?: FestivalRun | null
  festivalReward?: FestivalRewardSummary | null
  careerMission?: CareerMission | null
  careerDifficulty?: Difficulty
}

export function Battle({
  settings,
  onExit,
  onRematch,
  onDeck,
  onResult,
  onTutorial,
  onUpdate,
  online,
  circuit = null,
  venue,
  forfeitNotice,
  festivalRun = null,
  festivalReward = null,
  careerMission = null,
  careerDifficulty,
}: BattleProps) {
  const [localState, localDispatch] = useReducer(
    battleReducer,
    { settings, circuit, venue, festivalRun, careerMission, careerDifficulty },
    (init) =>
      createBattle({
        deck: init.settings.deck,
        lineup: init.settings.lineup,
        difficulty: init.careerDifficulty
          ? init.careerDifficulty
          : init.careerMission?.difficulty ?? init.festivalRun?.difficulty ?? init.circuit?.difficulty ?? init.settings.difficulty,
        progress: init.settings.artistProgress,
        venue: init.careerMission?.venue ?? init.festivalRun?.venue ?? init.circuit?.venue ?? init.venue,
        circuit: init.circuit?.circuit ?? null,
        stageSlots: init.careerMission?.venue.stageSlots ?? init.festivalRun?.venue.stageSlots ?? init.circuit?.stageSlots ?? init.venue?.stageSlots,
        modifiers: init.circuit?.modifiers,
        objectives: init.festivalRun?.objectives ?? init.circuit?.objectives,
        rivalDeck: init.careerMission?.rivalDeck ?? init.festivalRun?.rivalDeck,
        rivalLineup: init.careerMission?.rivalLineup ?? init.festivalRun?.rivalLineup,
        rivalLevel: init.festivalRun?.rivalLevel,
        rivalName: init.careerMission?.opponentName ?? init.festivalRun?.stop.opponent,
        festival: init.festivalRun?.rule,
      }),
  )
  const rawState = online ? online.state : localState
  const state = useMemo(
    () => (online && online.side === 'rival' ? swapBattleState(rawState) : rawState),
    [online, rawState],
  )
  const triple = online?.triple
  const isFatal = triple?.format === 'fatal-4'
  const tripleSideFor = (seat: BattlePartySeat): SideState | null => {
    if (!triple) return null
    if (seat.seat === triple.activeSeat) return state.player
    if (seat.seat === triple.targetSeat) return state.rival
    return triple.sides[seat.seat] ?? null
  }
  const canPickTripleTarget = Boolean(
    triple &&
      triple.activeSeat === triple.localSeat &&
      !triple.targetLocked &&
      state.phase === 'player' &&
      !state.counterPrompt &&
      online?.canAct !== false,
  )
  const [started, setStarted] = useState(Boolean(online))
  const canAct = online?.canAct !== false
  const [houseIntro, setHouseIntro] = useState(Boolean(rawState.houseRules))
  const [houseToast, setHouseToast] = useState<{
    title: string
    detail: string
    nonce: number
  } | null>(null)
  const houseEventSeen = useRef(0)
  const responseStart = useRef(performance.now())
  const responseRecorded = useRef(false)
  const responseTotals = useRef({ ms: 0, samples: 0 })
  const dispatch = useCallback(
    (action: BattleAction) => {
      // A defensive window belongs to the defending team even when the
      // attacker still holds the turn; otherwise the prompt can never clear.
      // Cinematics are shared presentation and any seat may skip them.
      if (
        online &&
        !canAct &&
        action.type !== 'COUNTER' &&
        action.type !== 'DISMISS_CINEMATIC'
      ) {
        return
      }
      if (
        started &&
        state.phase === 'player' &&
        !responseRecorded.current &&
        RESPONSE_ACTIONS.has(action.type)
      ) {
        responseTotals.current.ms += Math.min(
          120_000,
          Math.max(0, performance.now() - responseStart.current),
        )
        responseTotals.current.samples += 1
        responseRecorded.current = true
      }
      if (online) online.dispatch(action)
      else localDispatch(action)
    },
    [online, localDispatch, started, state.phase, canAct],
  )
  const [pendingCard, setPendingCard] = useState<string | null>(null)
  const [peekId, setPeekId] = useState<string | null>(null)
  const [rulesOpen, setRulesOpen] = useState(false)
  const [logOpen, setLogOpen] = useState(false)
  const [exitOpen, setExitOpen] = useState(false)
  const [pauseOpen, setPauseOpen] = useState(false)
  const [pauseSettingsOpen, setPauseSettingsOpen] = useState(false)
  const [chatOpen, setChatOpen] = useState(false)
  const [targetUid, setTargetUid] = useState<string | null>(null)
  const [allyTargetUid, setAllyTargetUid] = useState<string | null>(null)
  const [selectedStageUid, setSelectedStageUid] = useState<string | null>(null)
  const [specialOpen, setSpecialOpen] = useState<CrateHandCard | null>(null)
  const [backstageOpen, setBackstageOpen] = useState(false)
  const [crateReveal, setCrateReveal] = useState<CrateHandCard | null>(null)
  const [defeatReveal, setDefeatReveal] = useState<{ artistId: string; nonce: number } | null>(null)
  const [moveFx, setMoveFx] = useState<LastMove | null>(null)
  const [crowdImpact, setCrowdImpact] = useState<CrowdImpact | null>(null)
  const [objectiveReveal, setObjectiveReveal] = useState<{ title: string; nonce: number } | null>(null)
  const recorded = useRef(false)
  const boardRef = useRef<HTMLDivElement>(null)
  const plays = useRef<Record<string, number>>({})
  const announcerSeen = useRef(0)
  const lastCrowdGap = useRef<number | null>(null)
  const [impactPlays, setImpactPlays] = useState(0)

  const cinematic = state.cinematics[0] ?? null
  const sound = useAudioSnapshot()
  const announcer = useAnnouncerSnapshot()
  const crowdGap = state.player.crowd - state.rival.crowd
  const readyStage = state.player.stage.filter((card) => !card.actedThisTurn)
  const nextReady = readyStage.find((card) => card.uid !== selectedStageUid) ?? null
  const nextReadyName = nextReady ? getArtist(nextReady.artistId).name : null
  const playerTurn =
    started && canAct && state.phase === 'player' && !cinematic && !state.counterPrompt && !pauseOpen
  const rivalLabel = online ? state.rival.name : 'THE HEADLINER'
  const showCounter =
    Boolean(state.counterPrompt) &&
    (!online || online.side === rawState.counterPrompt?.defender)
  const stageFull = state.player.stage.length >= state.stageSlots
  const playerCrews = availableCrews(state.player.stage)
  const selectedStage = state.player.stage.find((card) => card.uid === selectedStageUid) ?? null
  const selectedMoves = useMemo(
    () =>
      selectedStage
        ? selectedStage.moves
            .map((id) => moveById(id))
            .filter((move): move is Move => Boolean(move))
        : [],
    [selectedStage],
  )
  const selectedArtist = selectedStage ? getArtist(selectedStage.artistId) : null
  const selectedSpecial = useMemo(() => {
    if (!selectedStage || !selectedArtist) return null
    const special = specialMoveForArtist(selectedArtist.id)
    return special && selectedStage.level >= (special.unlockLevel ?? 5) ? special : null
  }, [selectedStage, selectedArtist])
  const targetArtist = targetUid
    ? state.rival.stage.find((card) => card.uid === targetUid)
    : state.rival.stage[0]
  const targetName = targetArtist ? getArtist(targetArtist.artistId).name : 'THE CROWD'
  const playerUidKey = state.player.stage.map((card) => card.uid).join('|')
  const rivalUidKey = state.rival.stage.map((card) => card.uid).join('|')

  const skipCinematic = useCallback(
    () => dispatch({ type: 'DISMISS_CINEMATIC' }),
    [dispatch],
  )

  const selectNextReady = useCallback(() => {
    if (!playerTurn) return
    const current = state.player.stage.findIndex((card) => card.uid === selectedStageUid)
    const ordered =
      current >= 0
        ? [...state.player.stage.slice(current + 1), ...state.player.stage.slice(0, current + 1)]
        : state.player.stage
    const next = ordered.find(
      (card) => !card.actedThisTurn && card.uid !== selectedStageUid,
    )
    if (!next) return
    audioEngine.playSfx('click')
    setSelectedStageUid(next.uid)
    setAllyTargetUid(next.uid)
  }, [playerTurn, selectedStageUid, state.player.stage])

  useEffect(() => {
    if (online) return
    if (!started || state.phase !== 'rival' || state.counterPrompt || cinematic || crateReveal || backstageOpen || pauseOpen) return
    const timer = window.setTimeout(() => dispatch({ type: 'RIVAL_TICK' }), 900)
    return () => window.clearTimeout(timer)
  }, [online, started, state.phase, state.tick, state.counterPrompt?.id, cinematic?.id, crateReveal, backstageOpen, pauseOpen])

  useEffect(() => {
    if (!rawState.counterPrompt || backstageOpen || pauseOpen) return
    if (online && online.side !== rawState.counterPrompt.defender) return
    const timer = window.setTimeout(() => dispatch({ type: 'COUNTER', mode: 'take' }), 6000)
    return () => window.clearTimeout(timer)
  }, [online, rawState.counterPrompt?.id, backstageOpen, pauseOpen, dispatch])

  useEffect(() => {
    if (!started || state.phase !== 'player') return
    responseStart.current = performance.now()
    responseRecorded.current = false
  }, [started, state.phase, state.round])

  useEffect(() => {
    if (state.phase === 'over' && state.winner && !recorded.current) {
      recorded.current = true
      audioEngine.playSfx(
        state.winner === 'player' ? 'win' : state.winner === 'rival' ? 'lose' : 'drawMatch',
      )
      if (state.winner === 'player' || state.winner === 'rival') {
        announcerEngine.triggerEvent('victory', state.winner)
      }
      const player = state.player
      onResult(state.winner, { ...plays.current }, objectiveSummary(state.objectives), {
        backstage: player.backstage.map((card) => card.artistId),
        attacks: player.attacksUsed,
        actions: player.movesUsed + player.features + player.encores + player.crateDraws,
        damage: player.dealt,
        kos: player.koes,
        features: player.features,
        encores: player.encores,
        crateDraws: player.crateDraws,
        responseMs: responseTotals.current.ms,
        responseSamples: responseTotals.current.samples,
        cards: player.cardStats,
      })
    }
  }, [state.phase, state.winner, state.objectives, state.player, onResult])

  useEffect(() => {
    const update = state.lastObjective
    if (!update) return
    setObjectiveReveal({ title: update.title, nonce: update.nonce })
    const timer = window.setTimeout(() => setObjectiveReveal(null), 2800)
    return () => window.clearTimeout(timer)
  }, [state.lastObjective])

  useEffect(() => {
    if (!started) return
    audioEngine.setScene('battle', true)
    audioEngine.playSfx('shuffle')
    announcerEngine.startMatch()
  }, [started])

  useEffect(() => {
    if (!houseIntro) return
    const timer = window.setTimeout(() => setHouseIntro(false), 5200)
    return () => window.clearTimeout(timer)
  }, [houseIntro])

  useEffect(() => {
    const event = state.lastHouseRuleEvent
    if (!event || event.nonce === houseEventSeen.current) return
    houseEventSeen.current = event.nonce
    setHouseToast({ title: event.title, detail: event.detail, nonce: event.nonce })
    const timer = window.setTimeout(() => setHouseToast(null), 2800)
    return () => window.clearTimeout(timer)
  }, [state.lastHouseRuleEvent])

  useEffect(() => {
    announcerEngine.setPaused(pauseOpen || pauseSettingsOpen)
  }, [pauseOpen, pauseSettingsOpen])

  useEffect(() => {
    const fresh = state.announcerCues.filter((cue) => cue.id > announcerSeen.current)
    if (fresh.length === 0) return
    announcerSeen.current = fresh[fresh.length - 1].id
    announcerEngine.triggerEvents(fresh)
  }, [state.announcerCues])

  useEffect(() => {
    if (!started || state.phase === 'over' || state.round < CURFEW_ROUND) return
    announcerEngine.triggerEvent('final_round')
  }, [started, state.phase, state.round])

  useEffect(() => {
    if (!started || state.phase === 'over' || state.round < 6) return
    const playerPressure = state.player.crowd / state.player.maxCrowd
    const rivalPressure = state.rival.crowd / state.rival.maxCrowd
    const bothLow = playerPressure <= 0.33 && rivalPressure <= 0.33
    const neckAndNeck = state.round >= 8 && Math.abs(crowdGap) <= 5
    if (bothLow || neckAndNeck) announcerEngine.triggerEvent('close_battle')
  }, [started, state.phase, state.round, state.player.crowd, state.player.maxCrowd, state.rival.crowd, state.rival.maxCrowd, crowdGap])

  useEffect(() => {
    if (!started || state.phase === 'over') {
      lastCrowdGap.current = crowdGap
      return
    }
    const previous = lastCrowdGap.current
    lastCrowdGap.current = crowdGap
    if (previous === null) return
    const playerComeback = previous <= -10 && crowdGap >= Math.min(-2, previous + 8)
    const rivalComeback = previous >= 10 && crowdGap <= Math.max(2, previous - 8)
    if (playerComeback || rivalComeback) announcerEngine.triggerEvent('comeback')
  }, [started, state.phase, crowdGap])

  useEffect(() => {
    return () => {
      announcerEngine.stop()
      audioEngine.setScene('menu')
    }
  }, [])

  useEffect(() => {
    setTargetUid((current) =>
      state.rival.stage.some((card) => card.uid === current)
        ? current
        : state.rival.stage[0]?.uid ?? null,
    )
  }, [rivalUidKey])

  useEffect(() => {
    setAllyTargetUid((current) =>
      state.player.stage.some((card) => card.uid === current)
        ? current
        : state.player.stage[0]?.uid ?? null,
    )
  }, [playerUidKey])

  useEffect(() => {
    if (selectedStageUid && !state.player.stage.some((card) => card.uid === selectedStageUid)) {
      setSelectedStageUid(null)
    }
  }, [playerUidKey, selectedStageUid])

  useEffect(() => {
    if (!state.lastCrateDraw) return
    audioEngine.playSfx('draw')
    setCrateReveal(state.lastCrateDraw.card)
    const timer = window.setTimeout(() => setCrateReveal(null), 3000)
    return () => window.clearTimeout(timer)
  }, [state.lastCrateDraw?.card.uid])

  useEffect(() => {
    if (!state.counterPrompt && state.cinematics.length === 0 && !state.lastDefeat) return
    setCrateReveal(null)
  }, [state.counterPrompt?.id, state.cinematics.length, state.lastDefeat?.nonce])

  useEffect(() => {
    if (!state.lastDefeat) return
    audioEngine.playSfx('ko')
    setDefeatReveal(state.lastDefeat)
    const timer = window.setTimeout(() => setDefeatReveal(null), 2200)
    return () => window.clearTimeout(timer)
  }, [state.lastDefeat?.nonce])

  useEffect(() => {
    if (!state.lastMove) return
    audioEngine.playSfx('ability', { element: state.lastMove.element })
    setMoveFx(state.lastMove)
    const timer = window.setTimeout(() => setMoveFx(null), 1150)
    return () => window.clearTimeout(timer)
  }, [state.lastMove?.nonce])

  useEffect(() => {
    if (!state.lastHit) return
    audioEngine.playSfx('hit')
  }, [state.lastHit?.nonce])

  useEffect(() => {
    const hit = state.lastHit
    if (!hit || hit.value < 4) {
      setCrowdImpact(null)
      return
    }
    setCrowdImpact({ ...hit, heavy: hit.value >= 6 })
    const board = boardRef.current
    if (board && !settings.reducedMotion) {
      board.classList.remove('is-impacting')
      void board.offsetWidth
      board.classList.add('is-impacting')
    }
    const clear = window.setTimeout(() => setCrowdImpact(null), 1000)
    const settle = window.setTimeout(() => board?.classList.remove('is-impacting'), 380)
    return () => {
      window.clearTimeout(clear)
      window.clearTimeout(settle)
      board?.classList.remove('is-impacting')
    }
  }, [state.lastHit?.nonce, settings.reducedMotion])

  const notePlay = (artistId: string) => {
    plays.current[artistId] = (plays.current[artistId] ?? 0) + 1
    setImpactPlays((count) => count + 1)
  }

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        if (chatOpen) {
          setChatOpen(false)
          return
        }
        if (pauseSettingsOpen || rulesOpen) return
        if (exitOpen) {
          setExitOpen(false)
          return
        }
        if (pendingCard) {
          setPendingCard(null)
          return
        }
        if (selectedStageUid) {
          setSelectedStageUid(null)
          return
        }
        if (specialOpen) {
          setSpecialOpen(null)
          return
        }
        if (backstageOpen) {
          setBackstageOpen(false)
          return
        }
        if (logOpen) {
          setLogOpen(false)
          return
        }
        if (!started) {
          onExit()
          return
        }
        if (state.phase === 'over') return
        const next = !pauseOpen
        setPauseOpen(next)
        audioEngine.playSfx(next ? 'pause' : 'resume')
        return
      }
      const target = event.target as HTMLElement | null
      if (
        target &&
        (target.tagName === 'INPUT' ||
          target.tagName === 'TEXTAREA' ||
          target.isContentEditable)
      ) {
        return
      }
      if (chatOpen) return
      if (
        event.key.toLowerCase() === 'n' &&
        playerTurn &&
        selectedStageUid &&
        !pendingCard &&
        !specialOpen &&
        !backstageOpen &&
        !logOpen &&
        !pauseOpen &&
        !pauseSettingsOpen &&
        !rulesOpen &&
        !exitOpen
      ) {
        event.preventDefault()
        selectNextReady()
        return
      }
      if (
        event.key === ' ' &&
        playerTurn &&
        !pendingCard &&
        !selectedStageUid &&
        !specialOpen &&
        !backstageOpen &&
        !logOpen &&
        !pauseOpen &&
        !pauseSettingsOpen &&
        !rulesOpen &&
        !exitOpen
      ) {
        event.preventDefault()
        dispatch({ type: 'END_TURN' })
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [
    playerTurn,
    pendingCard,
    specialOpen,
    backstageOpen,
    logOpen,
    pauseOpen,
    pauseSettingsOpen,
    rulesOpen,
    exitOpen,
    chatOpen,
    selectedStageUid,
    selectNextReady,
    started,
    state.phase,
    onExit,
  ])

  const handleCard = (artistId: string) => {
    if (!playerTurn) return
    const artist = getArtist(artistId)
    if (state.player.hype < artist.cost) return
    audioEngine.playSfx('card')
    if (stageFull) {
      setPendingCard((current) => (current === artistId ? null : artistId))
      return
    }
    notePlay(artistId)
    dispatch({
      type: 'PLAY_CARD',
      artistId,
      targetUid: targetUid ?? state.rival.stage[0]?.uid,
    })
  }

  const swapIn = (uid: string) => {
    if (!pendingCard) return
    audioEngine.playSfx('card')
    notePlay(pendingCard)
    dispatch({
      type: 'PLAY_CARD',
      artistId: pendingCard,
      replaceUid: uid,
      targetUid: targetUid ?? state.rival.stage[0]?.uid,
    })
    setPendingCard(null)
  }

  const selectStage = (uid: string) => {
    if (pendingCard) {
      swapIn(uid)
      return
    }
    setSelectedStageUid(uid)
    setAllyTargetUid(uid)
  }

  const playEncore = (uid: string) => {
    if (!playerTurn || state.player.encoreCharges < 1) return
    audioEngine.playSfx('encore')
    const staged = state.player.stage.find((card) => card.uid === uid)
    if (staged) notePlay(staged.artistId)
    dispatch({ type: 'ENCORE', uid, targetUid: targetUid ?? undefined })
  }

  const bench = (uid: string) => {
    if (!playerTurn) return
    dispatch({ type: 'BENCH', uid })
    if (selectedStageUid === uid) setSelectedStageUid(null)
  }

  const playFeature = (crew: Crew) => {
    if (!playerTurn || state.player.featureUsed) return
    audioEngine.playSfx('feature')
    dispatch({ type: 'FEATURE', crew, targetUid: targetUid ?? undefined })
  }

  const playMove = (move: Move) => {
    if (!selectedStage || !playerTurn) return
    notePlay(selectedStage.artistId)
    dispatch({
      type: 'USE_MOVE',
      uid: selectedStage.uid,
      moveId: move.id,
      targetUid:
        move.target === 'enemy'
          ? targetUid ?? undefined
          : move.target === 'ally'
            ? allyTargetUid ?? selectedStage.uid
            : undefined,
    })
    const next = state.player.stage.find(
      (card) => card.uid !== selectedStage.uid && !card.actedThisTurn,
    )
    setSelectedStageUid(next?.uid ?? null)
    if (next) setAllyTargetUid(next.uid)
  }

  const drawCrate = () => {
    if (!playerTurn || state.player.specialHand.length >= 6) return
    if (state.player.hype < CRATE_HYPE_COST) return
    setSelectedStageUid(null)
    setPendingCard(null)
    dispatch({ type: 'DRAW_CRATE' })
  }

  const useSpecial = (target?: string, artistId?: string) => {
    if (!specialOpen) return
    audioEngine.playSfx('ability')
    dispatch({ type: 'USE_SPECIAL', uid: specialOpen.uid, targetUid: target, artistId })
    setSpecialOpen(null)
  }

  const endTurn = () => {
    if (!playerTurn || state.counterPrompt) return
    audioEngine.playSfx('turn')
    setPendingCard(null)
    setSelectedStageUid(null)
    dispatch({ type: 'END_TURN' })
  }

  useEffect(() => {
    return onGamepadCommand((command) => {
      if (command === 'pause') {
        if (
          !started ||
          state.phase === 'over' ||
          cinematic ||
          state.counterPrompt ||
          pauseSettingsOpen ||
          rulesOpen ||
          exitOpen ||
          specialOpen ||
          backstageOpen ||
          logOpen
        ) {
          return
        }
        const next = !pauseOpen
        setPauseOpen(next)
        audioEngine.playSfx(next ? 'pause' : 'resume')
        return
      }

      if (!playerTurn) return
      if (command === 'end-turn') {
        if (pendingCard || specialOpen || backstageOpen || logOpen) return
        endTurn()
        return
      }
      if (command === 'next-ready') {
        if (!selectedStageUid || pendingCard || specialOpen || backstageOpen || logOpen) {
          return
        }
        selectNextReady()
        return
      }
      if (
        (command === 'target-prev' || command === 'target-next') &&
        selectedStageUid &&
        state.rival.stage.length > 0
      ) {
        const current = state.rival.stage.findIndex((card) => card.uid === targetUid)
        const offset = command === 'target-next' ? 1 : -1
        const index =
          current < 0
            ? 0
            : (current + offset + state.rival.stage.length) % state.rival.stage.length
        setTargetUid(state.rival.stage[index].uid)
      }
    })
  }, [
    started,
    state.phase,
    state.counterPrompt,
    state.rival.stage,
    cinematic,
    pauseSettingsOpen,
    rulesOpen,
    exitOpen,
    specialOpen,
    backstageOpen,
    logOpen,
    pauseOpen,
    playerTurn,
    pendingCard,
    selectedStageUid,
    targetUid,
    endTurn,
    selectNextReady,
  ])

  useEffect(() => {
    if (!selectedStageUid) return
    if (!document.body.classList.contains('is-controller')) return
    const frame = window.requestAnimationFrame(() => {
      const dock = document.querySelector<HTMLElement>('.move-dock')
      if (!dock) return
      const target =
        dock.querySelector<HTMLElement>('.move-card:not(:disabled)') ??
        dock.querySelector<HTMLElement>('.move-dock__action:not(:disabled)') ??
        dock.querySelector<HTMLElement>('.icon-btn:not(:disabled)')
      focusGamepadElement(target)
    })
    return () => window.cancelAnimationFrame(frame)
  }, [selectedStageUid])

  useEffect(() => {
    if (!started || !document.body.classList.contains('is-controller')) return
    let frame = 0
    let attempts = 0
    const focusStage = () => {
      const target =
        document.querySelector<HTMLElement>(
          '.stage--player .stage-unit[role="button"]:not(.is-down)',
        ) ??
        document.querySelector<HTMLElement>('.hand .card[role="button"]')
      if ((target && focusGamepadElement(target)) || attempts++ > 120) return
      frame = window.requestAnimationFrame(focusStage)
    }
    frame = window.requestAnimationFrame(focusStage)
    return () => window.cancelAnimationFrame(frame)
  }, [started])

  const crateLockdown = Boolean(state.houseRules?.modifiers.includes('crate-lockdown'))
  const canDraw =
    playerTurn &&
    !crateLockdown &&
    state.player.specialHand.length < 6 &&
    state.player.crate.length > 0 &&
    state.player.hype >= CRATE_HYPE_COST &&
    started
  const drawReason =
    !started
      ? 'START THE SHOW'
      : state.phase !== 'player'
        ? 'NOT YOUR TURN'
        : crateLockdown
          ? 'CRATE LOCKDOWN — CRATE DRAWS DISABLED'
          : state.player.specialHand.length >= 6
            ? 'SPECIAL HAND FULL — USE A CARD FIRST'
            : state.player.crate.length === 0
              ? 'THE CRATE IS EMPTY'
              : state.player.hype < CRATE_HYPE_COST
                ? `NEED ${CRATE_HYPE_COST} HYPE TO DRAW`
                : `${CRATE_HYPE_COST} HYPE · DOES NOT END TURN`

  const resultCopy = (() => {
    const base = battleResultCopy({
      phase: state.phase,
      round: state.round,
      winner: state.winner,
      playerCrowd: state.player.crowd,
      rivalCrowd: state.rival.crowd,
      online: Boolean(online),
      rivalLabel,
      forfeit: Boolean(forfeitNotice),
    })
    if (!triple || !state.party || forfeitNotice) return base
    const winnerSeat = state.party.winnerSeat ?? null
    const winner = state.party.seats.find((seat) => seat.seat === winnerSeat)
    const localWon = winnerSeat === triple.localSeat
    const curfew = state.round > CURFEW_ROUND && Boolean(winnerSeat)
    return {
      ...base,
      kicker: curfew ? 'THE HOUSE LIGHTS · CURFEW' : 'THE HOUSE LIGHTS · FINAL CROWD',
      verdict: winnerSeat
        ? localWon
          ? 'YOU OWN THE ROOM'
          : `${winner?.name ?? 'THE LAST MIC'} TAKES IT`
        : 'THE ROOM IS SPLIT',
      tone: localWon ? ('win' as const) : winnerSeat ? ('loss' as const) : ('draw' as const),
      title: winnerSeat ? (localWon ? 'SOLD OUT' : 'CROWD WALKED') : 'CURFEW DEAD HEAT',
      sub: winnerSeat
        ? localWon
          ? 'The room is yours. Every other corner walks.'
          : `${winner?.name ?? 'THE LAST MIC'} keeps the room. Run it back.`
        : 'The house lights catch a dead heat.',
    }
  })()

  const lastLog = state.log[0]
  const houseLabels = state.houseRules
    ? state.houseRules.modifiers.length > 0
      ? state.houseRules.modifiers.map((id) => houseModifierById(id).name)
      : ['OFFICIAL RULES', 'NO MODIFIERS', 'STANDARD BATTLE']
    : []

  const crateCandidates = useMemo(() => {
    const ids = [...state.player.deck, ...state.player.discard]
    return [...new Set(ids)].map(getArtist)
  }, [state.player.deck, state.player.discard])
  const mvpSummary = matchMvpSummary(state.player.cardStats)

  return (
    <div
      className={`battle battle--${settings.theme}${state.circuit ? ` battle--circuit-${state.circuit}` : ''}${state.festival ? ' battle--festival' : ''}`}
      style={{ '--venue-accent': state.venue.accent } as CSSProperties}
    >
      {houseIntro && state.houseRules && (
        <div
          className="house-intro"
          role="dialog"
          aria-modal="true"
          aria-label="House rules introduction"
          onClick={() => setHouseIntro(false)}
        >
          <div className="house-intro__card" onClick={(event) => event.stopPropagation()}>
            <span className="house-intro__kicker">DJ&apos;S HOUSE RULES · {state.houseRules.format.toUpperCase()}</span>
            <h2>{houseRulesTitle(state.houseRules)}</h2>
            <div className="house-intro__turntable" aria-hidden="true">
              <div className="house-intro__labels">
                {houseLabels.slice(0, 3).map((label) => (
                  <span key={label}>{label}</span>
                ))}
              </div>
            </div>
            <p className="house-intro__summary">{houseRulesSummary(state.houseRules)}</p>
            <button
              type="button"
              className="btn btn--primary btn--sm house-intro__dismiss"
              onClick={() => setHouseIntro(false)}
            >
              LET&apos;S GET IT
            </button>
          </div>
        </div>
      )}

      {houseToast && (
        <div className="house-toast" key={houseToast.nonce} role="status" aria-live="polite">
          <strong>{houseToast.title}</strong>
          <span>{houseToast.detail}</span>
        </div>
      )}

      <div className="battle__bg" aria-hidden="true">
        {settings.theme === 'a' && (
          <>
            <div className="deco deco--proscenium" />
            <div className="deco deco--curtain deco--curtain-l" />
            <div className="deco deco--curtain deco--curtain-r" />
            <div className="deco deco--spot deco--spot-a" />
            <div className="deco deco--spot deco--spot-b" />
          </>
        )}
        {settings.theme === 'b' && (
          <>
            <div className="deco deco--wall" />
            <div className="deco deco--chainlink" />
            <div className="deco deco--neon deco--neon-live">LIVE</div>
            <div className="deco deco--speaker deco--speaker-l" />
            <div className="deco deco--speaker deco--speaker-r" />
          </>
        )}
        {settings.theme === 'c' && (
          <>
            <div className="deco deco--gridfloor" />
            <div className="deco deco--orb deco--orb-stage" />
            <div className="deco deco--orbit deco--orbit-1" />
            <div className="deco deco--beam" />
            <div className="deco deco--holo-glow" />
          </>
        )}
        <div className="show-ambience">
          <div className="show-ambience__screen">
            <span>CIKI</span>
            <b>LIVE FROM {state.venue.name}</b>
            <i>{state.venue.tagline}</i>
          </div>
          <div className="show-ambience__beams">
            <i />
            <i />
            <i />
            <i />
          </div>
          <div className="show-ambience__eq" aria-hidden="true">
            {Array.from({ length: 20 }).map((_, index) => (
              <span key={index} style={{ '--bar': `${28 + ((index * 17) % 62)}%` } as CSSProperties} />
            ))}
          </div>
          <div className="show-ambience__crowd" aria-hidden="true">
            {Array.from({ length: 18 }).map((_, index) => (
              <i
                key={index}
                style={
                  {
                    '--x': `${(index * 5.8 + 1) % 100}%`,
                    '--h': `${0.8 + (index % 5) * 0.18}rem`,
                    '--delay': `${(index % 7) * -0.7}s`,
                  } as CSSProperties
                }
              />
            ))}
          </div>
          <div className="show-ambience__floor" />
        </div>
      </div>

      <div className="battle__exit">
        <button className="link-btn" onClick={() => setExitOpen(true)}>
          ← EXIT
        </button>
        <span className="battle__venue-tag">
          {state.venue.name} · {state.festival ? state.festival.eventName : circuit ? circuit.circuitName : 'NIGHT 01'}
        </span>
      </div>

      {state.festival && (
        <div className="festival-battle-strip">
          <span>{state.festival.eventType === 'single_player' ? 'SOLO TOUR' : 'ONLINE FESTIVAL'}</span>
          <b>{state.festival.eventName}</b>
          <i>{state.festival.stopName}</i>
          <em>{state.festival.title} · {state.festival.rule}</em>
          {state.festival.synergyActive && <strong>SETLIST SYNERGY ACTIVE</strong>}
        </div>
      )}

      <div className="battle__tools">
        <span className={`battle__audio ${sound.status === 'playing' ? 'is-live' : ''}`}>
          <i />
          <span>{sound.status === 'playing' ? 'LIVE SCORE' : sound.status === 'paused' ? 'SCORE PAUSED' : 'SCORE CUED'}</span>
          <b>{BATTLE_TRACK.title}</b>
        </span>
        {online && (
          <span
            className="battle__online-badge"
            title={`Private room ${online.roomCode} · ${online.status}`}
          >
            <i /> VS {online.opponentName || 'OPPONENT'} · ROOM {online.roomCode}
          </span>
        )}
        {state.party && (
          <span className="battle__party-badge">
            {state.party.format === 'triple-threat' || state.party.format === 'fatal-4'
              ? <>{state.party.format === 'fatal-4' ? 'FATAL 4' : 'TRIPLE THREAT'} · {state.party.seats.find((seat) => seat.seat === state.party?.activeSeat)?.name ?? 'OPEN MIC'}'S TURN</>
              : <>
                  2V2 · {state.party.seats.filter((seat) => seat.team === 'player').map((seat) => seat.name).join(' + ')}
                  {' '}VS{' '}
                  {state.party.seats.filter((seat) => seat.team === 'rival').map((seat) => seat.name).join(' + ')}
                </>}
            {online?.activeName && state.party.format === '2v2' ? ` · ${online.activeName}'S TURN` : ''}
          </span>
        )}
        {started && state.phase !== 'over' && (
          <button
            className="tool-btn"
            onClick={() => {
              setPauseOpen(true)
              audioEngine.playSfx('pause')
            }}
          >
            PAUSE
          </button>
        )}
        {onTutorial && (
          <button className="tool-btn tool-btn--tutorial" onClick={onTutorial}>
            TUTORIAL
          </button>
        )}
        <button className="tool-btn" onClick={() => setRulesOpen(true)}>
          RULEBOOK
        </button>
        <button className={`tool-btn ${logOpen ? 'is-on' : ''}`} onClick={() => setLogOpen(true)}>
          THE NIGHT
        </button>
        {online?.chat && (
          <button
            className={`tool-btn ${chatOpen ? 'is-on' : ''}`}
            onClick={() => setChatOpen((open) => !open)}
          >
            CHAT
          </button>
        )}
      </div>

      <div className="battle__hud">
        <HudStrip
          player={{
            ...state.player,
            maxHype: HYPE_CAP,
            attacksLeft:
              state.phase === 'player'
                ? Math.max(0, MAX_ATTACKS_PER_TURN - state.player.attacksThisTurn)
                : MAX_ATTACKS_PER_TURN,
            avatar: getArtist(
              state.player.stage[0]?.artistId ??
                state.player.hand[0] ??
                settings.deck[0],
            ),
          }}
          rival={{
            ...state.rival,
            maxHype: HYPE_CAP,
            avatar: getArtist(
              state.rival.stage[0]?.artistId ??
                state.rival.hand[0] ??
                settings.deck[0],
            ),
          }}
          round={state.round}
          era={state.era}
          lastHit={state.lastHit}
          difficulty={online ? `ONLINE · VS ${online.opponentName || 'OPPONENT'}` : `${difficultyLabel(state.difficulty)} · ${state.venue.name}`}
        />
      </div>

      {triple && (
        <section className={`triple-mics ${isFatal ? 'is-fatal' : ''}`} aria-label={`${isFatal ? 'Fatal 4' : 'Triple Threat'} mics`}>
          <div className="triple-mics__head">
            <span>{isFatal ? 'FATAL 4 · FOUR CORNERS, ONE CROWN' : 'TRIPLE THREAT · THREE MICS, ONE CROWN'}</span>
            <b>{triple.seats.find((seat) => seat.seat === triple.activeSeat)?.name ?? 'OPEN MIC'} ON THE MIC</b>
            <em>{canPickTripleTarget ? 'TAP A RIVAL TO CHANGE TARGET' : 'TARGET LOCKED FOR THIS TURN'}</em>
          </div>
          <div className={`triple-mics__grid ${isFatal ? 'is-four' : ''}`}>
            {triple.seats.map((seat) => {
              const side = tripleSideFor(seat)
              const isActive = seat.seat === triple.activeSeat
              const isTarget = seat.seat === triple.targetSeat
              const isLocal = seat.seat === triple.localSeat
              const isEliminated = triple.eliminated.includes(seat.seat) || (side?.crowd ?? 0) <= 0
              const isDeparted = triple.departed.includes(seat.seat)
              const pickable = canPickTripleTarget && !isLocal && !isActive && !isEliminated && !isTarget
              const pressure = side ? Math.max(0, Math.min(100, (side.crowd / Math.max(1, side.maxCrowd)) * 100)) : 0
              return (
                <button
                  key={seat.seat}
                  type="button"
                  className={`triple-mic ${isActive ? 'is-active' : ''} ${isTarget ? 'is-target' : ''} ${isLocal ? 'is-you' : ''} ${isEliminated ? 'is-out' : ''}`}
                  onClick={() => pickable && triple.onTarget(seat.seat)}
                  disabled={!pickable}
                  aria-label={`${seat.name}${isTarget ? ' target' : ''}${isActive ? ' on the mic' : ''}`}
                >
                  <span>{isDeparted ? 'LEFT' : isEliminated ? 'BOOED OFF' : isActive ? 'ON MIC' : isTarget ? 'TARGET' : isLocal ? 'YOU' : 'WAITING'}</span>
                  <b>{seat.name}</b>
                  <div className="triple-mic__crowd"><i style={{ width: `${pressure}%` }} /></div>
                  <em>{side?.crowd ?? 0} CROWD · {side?.stage.length ?? 0} ON STAGE</em>
                </button>
              )
            })}
          </div>
        </section>
      )}

      {state.houseRules && (
        <div className="house-hud" aria-label="Active house rules">
          <span className="house-hud__label">DJ&apos;S HOUSE RULES</span>
          {state.houseRules.modifiers.length === 0 ? (
            <span className="house-hud__chip"><i aria-hidden="true">◈</i> OFFICIAL RULES</span>
          ) : (
            state.houseRules.modifiers.map((id) => (
              <span className="house-hud__chip" key={id}>
                <i aria-hidden="true">{HOUSE_GLYPHS[id]}</i>
                {houseModifierById(id).shortName}
              </span>
            ))
          )}
        </div>
      )}

      {state.festival && (
        <div className="festival-rule-line" role="note">
          <span>OFFICIAL FESTIVAL RULE · {state.festival.title}</span>
          <b>{state.festival.rule}</b>
        </div>
      )}

      {state.objectives.length > 0 && (
        <section className="mission-strip" aria-label="Tonight's objectives">
          <div className="mission-strip__head">
            <span>TONIGHT’S LIST</span>
            <b>
              {state.objectives.filter((objective) => objective.done).length}/{state.objectives.length}
            </b>
          </div>
          <div className="mission-strip__items">
            {state.objectives.map((objective) => (
              <div
                key={objective.id}
                className={`mission-chip ${objective.done ? 'is-done' : ''}`}
                title={objective.detail}
              >
                <span>{objective.done ? '✓' : '○'}</span>
                <div>
                  <b>{objective.title}</b>
                  <i>
                    {Math.min(objective.progress, objective.target)}/{objective.target} · +{objective.rewardBuzz} BUZZ
                  </i>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      <div className="battle__board" ref={boardRef}>
        <section className="side side--rival" aria-label={online ? `${rivalLabel} stage` : "The Headliner's stage"}>
          <div className="side__head">
            <span className="side__name">
              <i className="side__dot" />
              {rivalLabel}
            </span>
            <span className="side__meta">
              LIVE SET · {state.rival.stage.length}/{state.stageSlots} · LOST {state.rival.koes}
            </span>
            <span className="side__meta side__meta--gold">
              HYPE {String(state.rival.hype).padStart(2, '0')}
            </span>
          </div>
          <div className="stage stage--rival">
            {state.rival.stage.map((card) => {
              const artist = getArtist(card.artistId)
              return (
                <StageUnit
                  key={card.uid}
                  artist={artist}
                  card={card}
                  era={state.era}
                  targetable={playerTurn}
                  targeted={targetUid === card.uid}
                  crewCount={
                    state.rival.stage.filter(
                      (mate) => getArtist(mate.artistId).crew === artist.crew,
                    ).length
                  }
                  disabled={!playerTurn}
                  onClick={() => playerTurn && setTargetUid(card.uid)}
                />
              )
            })}
            {Array.from({ length: state.stageSlots - state.rival.stage.length }).map((_, index) => (
              <div className="stage__empty" key={`rival-empty-${index}`}>
                <span>SLOT {state.rival.stage.length + index + 1}</span>
                <b>+</b>
                <i>EMPTY</i>
              </div>
            ))}
          </div>
          <div className="target-readout">
            <span>TARGET LOCK</span>
            <b>{targetName}</b>
            <i>{playerTurn ? (online ? `CLICK A ${rivalLabel} CARD TO CHANGE` : 'CLICK A HEADLINER CARD TO CHANGE') : 'WAITING FOR YOUR TURN'}</i>
          </div>
        </section>

        <div className={`clashline ${announcer.subtitle ? 'is-announcer' : ''}`}>
          <span className="clashline__tag">
            <i /> LIVE
          </span>
          <div className="clashline__copy">
            {announcer.subtitle ? (
              <div className="announcer-subtitle" role="status" aria-live="polite">
                <span>DJ KICKIT</span>
                <p>{announcer.subtitle.text}</p>
              </div>
            ) : (
              <p className={lastLog?.tone ? `is-${lastLog.tone}` : ''}>{lastLog?.text ?? 'THE SHOW IS LIVE.'}</p>
            )}
          </div>
          <span className="clashline__era">
            ERA {['I', 'II', 'III'][state.era - 1]} · {state.era === 1 ? 'OPENING ACT' : state.era === 2 ? 'MAIN STAGE' : 'HEADLINE'}
          </span>
        </div>

        <section className="side side--player" aria-label="Your stage">
          <div className="side__head">
            <span className="side__name">
              <i className="side__dot side__dot--you" />
              YOUR SET
            </span>
            <span className="side__meta">
              {state.player.stage.length}/{state.stageSlots} SLOTS · {state.player.hand.length} IN HAND · LOST {state.player.koes}
            </span>
            <span className="side__meta side__meta--gold">
              ENCORE {state.player.encoreCharges} · CLAPBACK {state.player.counters}
            </span>
          </div>
          <div className="stage stage--player">
            {state.player.stage.map((card) => {
              const artist = getArtist(card.artistId)
              return (
                <StageUnit
                  key={card.uid}
                  artist={artist}
                  card={card}
                  era={state.era}
                  selected={selectedStageUid === card.uid}
                  showTurnState
                  className={pendingCard ? 'is-swap-target' : ''}
                  crewCount={
                    state.player.stage.filter(
                      (mate) => getArtist(mate.artistId).crew === artist.crew,
                    ).length
                  }
                  disabled={!playerTurn}
                  onClick={() => playerTurn && selectStage(card.uid)}
                />
              )
            })}
            {Array.from({ length: state.stageSlots - state.player.stage.length }).map((_, index) => (
              <div className="stage__empty stage__empty--you" key={`player-empty-${index}`}>
                <span>LIVE SLOT {state.player.stage.length + index + 1}</span>
                <b>+</b>
                <i>OPEN</i>
              </div>
            ))}
          </div>

          {selectedStage && selectedArtist ? (
            <MoveDock
              artist={selectedArtist}
              card={selectedStage}
              moves={selectedMoves}
              hype={state.player.hype}
              attacksLeft={Math.max(0, MAX_ATTACKS_PER_TURN - state.player.attacksThisTurn)}
              enemyTargets={state.rival.stage}
              allyTargets={state.player.stage}
              targetUid={targetUid}
              allyTargetUid={allyTargetUid}
              onTarget={setTargetUid}
              onAllyTarget={setAllyTargetUid}
              onMove={playMove}
              onClose={() => setSelectedStageUid(null)}
              encoreCharges={state.player.encoreCharges}
              canEncore={!selectedStage.encore && state.player.encoreCharges > 0}
              onEncore={() => playEncore(selectedStage.uid)}
              onCut={() => bench(selectedStage.uid)}
              specialMove={selectedSpecial}
              specialCharge={selectedStage.specialCharge}
              specialUsed={selectedStage.specialUsed}
              onSpecial={() => selectedSpecial && playMove(selectedSpecial)}
              specialHand={state.player.specialHand}
              selectedHandUid={specialOpen?.uid ?? null}
              onHandSelect={setSpecialOpen}
              crateCount={state.player.crate.length}
              canDrawSpecial={canDraw}
              drawReasonSpecial={drawReason}
              onDrawSpecial={drawCrate}
              onNextReady={selectNextReady}
              nextReadyName={nextReadyName}
              readyCount={readyStage.length}
            />
          ) : (
            <div className="stage__under">
              <div className="feature-rail">
                <span className="feature-rail__label">FEATURE VERSES</span>
                {state.player.featureUsed ? (
                  <span className="feature-chip feature-chip--used">CALLED THIS ROUND — RESETS NEXT TURN</span>
                ) : playerCrews.length === 0 ? (
                  <span className="feature-chip feature-chip--idle">
                    STACK TWO ARTISTS FROM ONE CREW TO UNLOCK
                  </span>
                ) : (
                  playerCrews.map((crew) => {
                    const count = state.player.stage.filter(
                      (card) => getArtist(card.artistId).crew === crew,
                    ).length
                    return (
                      <button
                        key={crew}
                        className="feature-chip feature-chip--ready"
                        style={{ '--crew-tint': CREW_META[crew].tint } as CSSProperties}
                        onClick={() => playFeature(crew)}
                        disabled={!playerTurn}
                      >
                        <b>FEATURE VERSE</b>
                        <span>{crew}</span>
                        <i>×{count}</i>
                        <em>+{featureDamage(state.player.stage, crew, state.era)} DMG · {featureBars(state.player.stage, crew, state.era)} BARS · +1 HYPE</em>
                      </button>
                    )
                  })
                )}
              </div>
              <span className="stage__select-hint">CLICK AN ARTIST CARD TO OPEN THEIR THREE EQUIPPED MOVES, ENCORE AND CUT.</span>
            </div>
          )}
          {pendingCard && (
            <div className="swap-hint">
              <b>STAGE FULL</b>
              <span>Choose one of your live slots to swap out for {getArtist(pendingCard).name}.</span>
              <button className="link-btn" onClick={() => setPendingCard(null)}>
                CANCEL
              </button>
            </div>
          )}

          <CrateDock
            crateCount={state.player.crate.length}
            hand={state.player.specialHand}
            backstageCount={state.player.backstage.length}
            canDraw={canDraw}
            drawReason={drawReason}
            onDraw={drawCrate}
            onSelect={setSpecialOpen}
            onBackstage={() => setBackstageOpen(true)}
            selectedUid={specialOpen?.uid ?? null}
          />
        </section>

        <section className="handrow" aria-label="Your hand">
          <div className="hand">
            <div className="hand__label">
              <span>YOUR HAND</span>
              <i>
                {playerTurn
                  ? `TARGET: ${targetName} · CLICK TO PERFORM`
                  : state.phase === 'rival'
                    ? online
                      ? `${rivalLabel} ON STAGE`
                      : 'HEADLINER ON STAGE'
                    : 'STANDING BY'}
              </i>
            </div>
            <div className="hand__fan">
              {state.player.hand.map((artistId, index) => {
                const artist = getArtist(artistId)
                const affordable = state.player.hype >= artist.cost
                return (
                  <div
                    className="hand__slot"
                    key={`${artistId}-${index}`}
                    style={
                      {
                        '--rot': `${(index - (state.player.hand.length - 1) / 2) * 2.6}deg`,
                        '--lift': `${Math.abs(index - (state.player.hand.length - 1) / 2) * -2.5}px`,
                      } as CSSProperties
                    }
                    onMouseEnter={() => setPeekId(artistId)}
                    onMouseLeave={() => setPeekId(null)}
                  >
                    <Card
                      artist={artist}
                      era={state.era}
                      size="hand"
                      tilt={false}
                      disabled={!playerTurn || !affordable}
                      selected={pendingCard === artistId}
                      crewCount={
                        state.player.stage.filter(
                          (card) => getArtist(card.artistId).crew === artist.crew,
                        ).length
                      }
                      onClick={() => handleCard(artistId)}
                    />
                  </div>
                )
              })}
              {state.player.hand.length === 0 && (
                <div className="hand__empty">NO CARDS IN HAND — THE SHOW STILL MOVES.</div>
              )}
            </div>
          </div>
          {peekId && playerTurn && (
            <div className="peek">
              <Card artist={getArtist(peekId)} era={state.era} size="hero" tilt={false} />
              <div className="peek__info">
                <b>
                  {getArtist(peekId).battle.element} · {getArtist(peekId).battle.hp} HP
                </b>
                {abilityText(getArtist(peekId))}
                <br />
                <em>{getArtist(peekId).battle.passive.name} — {getArtist(peekId).battle.passive.description}</em>
              </div>
            </div>
          )}
          <div className="hand__side">
            <div className="turnbox">
              <span className="turnbox__label">{state.phase === 'rival' ? 'THE HEADLINER' : 'YOUR TURN'}</span>
              <b className="turnbox__hype">
                {state.player.hype}
                <i>/{HYPE_CAP} HYPE</i>
              </b>
              <span className="turnbox__attacks">
                ATTACKS {Math.max(0, MAX_ATTACKS_PER_TURN - state.player.attacksThisTurn)}/{MAX_ATTACKS_PER_TURN}
              </span>
              <span className="turnbox__hint">
                {state.phase === 'rival'
                  ? 'READING THE ROOM…'
                  : 'ATTACKS ARE FREE · BIG HITS CLOSE THE TURN'}
              </span>
            </div>
            <button
              className="btn btn--end"
              onClick={endTurn}
              disabled={!playerTurn || Boolean(state.counterPrompt)}
            >
              END TURN
              <i>SPACE</i>
            </button>
            <span className="hand__tip">Artists fight with 3 equipped moves. Defeated artists go Backstage.</span>
          </div>
        </section>
      </div>

      {state.phase === 'rival' && !state.counterPrompt && !cinematic && (
        <div className="thinking" aria-live="polite">
          <span className="thinking__bars">
            <i />
            <i />
            <i />
            <i />
          </span>
          {online ? `WAITING FOR ${rivalLabel}…` : 'THE HEADLINER IS CUEING THE NEXT RECORD'}
        </div>
      )}

      {state.counterPrompt && showCounter &&
        (() => {
          const promptArtist = getArtist(state.counterPrompt.artistId)
          const halved = Math.ceil(state.counterPrompt.damage / 2)
          const promptTarget = state.counterPrompt.targetUid
            ? state.player.stage.find((card) => card.uid === state.counterPrompt?.targetUid)
            : null
          return (
            <div className="counter" role="alertdialog" aria-label="Defensive window">
              <div className="counter__timer" key={state.counterPrompt.id}>
                <span />
              </div>
              <div className="counter__content">
                <div
                  className="counter__badge"
                  style={
                    {
                      '--deep': promptArtist.palette.deep,
                      '--base': promptArtist.palette.base,
                    } as CSSProperties
                  }
                >
                  {promptArtist.slot}
                </div>
                <div className="counter__copy">
                  <span className="kicker">DEFENSIVE WINDOW · {state.player.counters} CLAPBACKS LEFT</span>
                  <h3>
                    {promptArtist.name} IS COMING FOR {promptTarget ? getArtist(promptTarget.artistId).name : 'YOUR CROWD'}.
                  </h3>
                  <p>
                    Cut the hit in half and take <b>+1 HYPE</b>. Or take the whole hit on the chin.
                    {state.counterPrompt.canRewind ? ' Turntable Rewind can spin it back.' : ''}
                  </p>
                </div>
                <div className="counter__damage">
                  <strong>{state.counterPrompt.damage}</strong>
                  <span>INCOMING</span>
                </div>
                <div className="counter__actions">
                  {state.player.counters > 0 && (
                    <button
                      className="btn btn--primary"
                      onClick={() => {
                        audioEngine.playSfx('hit')
                        dispatch({ type: 'COUNTER', mode: 'clapback' })
                      }}
                    >
                      CLAPBACK → {halved}
                    </button>
                  )}
                  {state.counterPrompt.canRewind && (
                    <button
                      className="btn btn--ghost btn--sm"
                      onClick={() => {
                        audioEngine.playSfx('turn')
                        dispatch({ type: 'COUNTER', mode: 'rewind' })
                      }}
                    >
                      TURNTABLE REWIND
                    </button>
                  )}
                  <button
                    className="btn btn--ghost btn--sm"
                    onClick={() => {
                      audioEngine.playSfx('hit')
                      dispatch({ type: 'COUNTER', mode: 'take' })
                    }}
                  >
                    TAKE THE HIT
                  </button>
                </div>
              </div>
            </div>
          )
        })()}

      {cinematic && <CinematicOverlay cinematic={cinematic} era={state.era} onSkip={skipCinematic} />}

      {defeatReveal &&
        (() => {
          const artist = getArtist(defeatReveal.artistId)
          return (
            <div className="defeat-reveal" key={defeatReveal.nonce} role="status">
              <span>STAGE CLEARED</span>
              <b>{artist.name}</b>
              <i>DEFEATED · SENT TO BACKSTAGE</i>
            </div>
          )
        })()}

      {crowdImpact && (
        <div
          className={`crowd-impact crowd-impact--${crowdImpact.side} ${
            crowdImpact.heavy ? 'is-heavy' : ''
          }`}
          key={crowdImpact.nonce}
          role="status"
        >
          <span>{crowdImpact.side === 'rival' ? 'THE ROOM ROARS' : 'THE ROOM TURNS'}</span>
          <b>−{crowdImpact.value}</b>
          <i>{crowdImpact.side === 'rival' ? `${rivalLabel} CROWD` : 'YOUR CROWD'}</i>
          {crowdImpact.heavy && <em>HEAVY HIT</em>}
        </div>
      )}

      {moveFx &&
        (() => {
          const artist = getArtist(moveFx.artistId)
          const element = moveFx.element ? ELEMENT_META[moveFx.element] : null
          return (
            <div
              className={`move-fx move-fx--${moveFx.side}`}
              key={moveFx.nonce}
              role="status"
              style={{ '--cast': element?.color ?? artist.palette.accent } as CSSProperties}
            >
              <span className="move-fx__beam" aria-hidden="true" />
              <span className="move-fx__icon" aria-hidden="true">
                {element?.icon ?? '✦'}
              </span>
              <span className="move-fx__kicker">
                {moveFx.side === 'player' ? 'YOUR MOVE' : online ? `${state.rival.name} MOVE` : 'HEADLINER MOVE'}
              </span>
              <b className="move-fx__name">{moveFx.name}</b>
              <i className="move-fx__meta">
                {artist.name}
                {element ? ` · ${element.label}` : ' · SIGNATURE'}
              </i>
            </div>
          )
        })()}

      {crateReveal &&
        (() => {
          const def = crateCard(crateReveal.cardId)
          const rarity = RARITY_META[def.rarity]
          return (
            <div
              className="crate-reveal"
              role="dialog"
              aria-label={`Drew ${def.name}`}
              style={{ '--rarity': rarity.color } as CSSProperties}
            >
              <div className="crate-reveal__card">
                <span className="crate-reveal__kicker">
                  {(crateReveal.stacks ?? 1) > 1 ? 'STACKED IN THE CRATE' : 'THE CRATE OPENS'}
                </span>
                <span className="crate-reveal__rarity">{def.rarity}</span>
                <h3>{def.name}</h3>
                <p>{def.description}</p>
                {(crateReveal.stacks ?? 1) > 1 && (
                  <span className="crate-reveal__stack">×{crateReveal.stacks} STACKED</span>
                )}
                <small>{CATEGORY_LABEL[def.category]}</small>
              </div>
              <button className="link-btn crate-reveal__close" onClick={() => setCrateReveal(null)} data-gamepad-back>
                ADDED TO SPECIAL HAND
              </button>
            </div>
          )
        })()}

      <aside className={`logpanel ${logOpen ? 'is-open' : ''}`} aria-label="Battle log">
        <header className="logpanel__head">
          <div>
            <span className="kicker">THE NIGHT SO FAR</span>
            <h2>ROUND {String(state.round).padStart(2, '0')}</h2>
          </div>
          <button className="icon-btn" onClick={() => setLogOpen(false)} aria-label="Close log">
            ✕
          </button>
        </header>
        <div className="logpanel__legend">
          <span><i className="is-good" /> YOUR MOVE</span>
          <span><i className="is-bad" /> HEADLINER</span>
          <span><i className="is-gold" /> ENCORE / CRATE</span>
        </div>
        <div className="logpanel__list">
          {state.log.map((entry) => (
            <p key={entry.id} className={`log-entry is-${entry.tone}`}>
              <i>R{String(entry.round).padStart(2, '0')}</i>
              <span>{entry.text}</span>
            </p>
          ))}
        </div>
        <footer className="logpanel__foot">
          <span>ERA {['I', 'II', 'III'][state.era - 1]}</span>
          <span>DAMAGE {state.player.dealt}</span>
          <span>KOs {state.rival.koes}</span>
        </footer>
      </aside>
      {logOpen && <button className="logpanel__scrim" onClick={() => setLogOpen(false)} aria-label="Close log" />}

      {objectiveReveal && (
        <div className="objective-toast" role="status" aria-live="polite" key={objectiveReveal.nonce}>
          <span>LIST CHECK</span>
          <b>{objectiveReveal.title}</b>
          <i>OBJECTIVE CLEARED · BONUS BANKED</i>
        </div>
      )}

      {!started && (
        <div className="show-intro">
          <div className="show-intro__bg" aria-hidden="true" />
          <div className="show-intro__panel">
            <span className="kicker">
              {state.venue.name} · {circuit ? circuit.riskLabel ?? circuit.circuitName : 'SOLD OUT'}
            </span>
            <h1>
              CAN I
              <br />
              <em>KICK IT?</em>
            </h1>
            <p className="show-intro__sub">
              THE GAME · {state.festival ? state.festival.eventName : circuit ? circuit.circuitName : 'NIGHT 01'}
            </p>
            <p className="show-intro__lede">
              You have a 26-slot mixtape, {state.stageSlots} live slots and a room full of people who
              came to hear something. The Headliner has the same, and zero intention of sharing.
              Every artist has three equipped moves and a life bar. Break the room, not just the crowd.
            </p>
            {circuit && (
              <p className="show-intro__rule">
                <b>{CIRCUITS[circuit.circuit].ruleTitle}</b>
                {CIRCUITS[circuit.circuit].rule}
              </p>
            )}
            {state.festival && (
              <p className="show-intro__rule">
                <b>
                  {state.festival.title} · {state.festival.eventType === 'single_player' ? 'SOLO TOUR' : 'ONLINE FESTIVAL'}
                </b>
                {state.festival.rule}
              </p>
            )}
            <p className="show-intro__note">
              TWO OPENING ACTS ARE ALREADY LIVE ON STAGE. {state.stageSlots} SLOTS PER SIDE.
            </p>
            {state.objectives.length > 0 && (
              <div className="show-intro__objectives">
                <span>TONIGHT’S LIST</span>
                <div>
                  {state.objectives.map((objective) => (
                    <p key={objective.id}>
                      <b>{objective.title}</b>
                      {objective.detail}
                      <i>+{objective.rewardCredits} RC · +{objective.rewardBuzz} BUZZ</i>
                    </p>
                  ))}
                </div>
              </div>
            )}
            {circuit && (
              <div className="show-intro__contract">
                <div>
                  <span>CONTRACT</span>
                  <b>{circuit.venue.name}</b>
                  <i>{circuit.riskLabel ?? circuit.circuitName}</i>
                </div>
                <div>
                  <span>PURSE</span>
                  <b>{circuit.purseCredits} RC</b>
                  <i>+{circuit.purseBuzz} BUZZ · OBJECTIVES PAY EXTRA</i>
                </div>
              </div>
            )}
            <div className="show-intro__match">
              <div className="show-intro__side">
                <span>YOUR SET</span>
                <b>{state.player.maxCrowd}</b>
                <i>CROWD · 26 SLOTS</i>
              </div>
              <span className="show-intro__vs">VS</span>
              <div className="show-intro__side show-intro__side--them">
                <span>THE HEADLINER</span>
                <b>{rivalCrowdFor(state.difficulty)}</b>
                <i>CROWD · {difficultyLabel(state.difficulty)}</i>
              </div>
            </div>
            <div className="show-intro__chips">
              <span>HYPE 08 · CAP 24</span>
              <span>CRATE DRAW · 2 HYPE</span>
              <span>3 FREE ATTACKS / TURN</span>
              <span>ENCORE ×1</span>
              <span>{state.stageSlots} LIVE SLOTS</span>
              <span>{state.modifiers.noCounters ? 'NO CLAPBACKS' : 'CLAPBACK ×2'}</span>
              <span>{state.modifiers.crowdDamage > 0 ? `+${state.modifiers.crowdDamage} CROWD DMG` : 'CURFEW · ROUND 12'}</span>
            </div>
            <button className="btn btn--primary btn--xl" onClick={() => setStarted(true)} data-gamepad-primary>
              <span>START THE SHOW</span>
              <i className="btn__play">▶</i>
            </button>
            <div className="show-intro__foot">
              <button className="link-btn show-intro__back" onClick={onExit} data-gamepad-back>
                ← BACK TO MENU
              </button>
              <button className="link-btn" onClick={() => setRulesOpen(true)}>
                READ THE RULES
              </button>
              {onTutorial && (
                <button className="link-btn" onClick={onTutorial}>
                  LEARN IN THE INTERACTIVE TUTORIAL →
                </button>
              )}
              <span>CRATE · HP · BACKSTAGE</span>
            </div>
          </div>
        </div>
      )}

      {pauseOpen && state.phase !== 'over' && (
        <div className="battle-pause" role="dialog" aria-modal="true" aria-label="Show paused">
          <div className="battle-pause__panel">
            <span className="battle-pause__kicker">{state.venue.name} · HOUSE LIGHTS</span>
            <h2>SHOW PAUSED</h2>
            <p className="battle-pause__copy">
              The room is holding. Take a breath, tune the mix, or step out without losing your place.
            </p>
            <div className="battle-pause__score">
              <span><i /> BATTLE SCORE</span>
              <b>{BATTLE_TRACK.title} · {BATTLE_TRACK.artist}</b>
            </div>
            <div className="battle-pause__mix">
              <VolumeSlider
                label="MUSIC"
                value={settings.musicVolume}
                onChange={(musicVolume) => onUpdate({ musicVolume })}
                compact
              />
              <VolumeSlider
                label="FX"
                value={settings.sfxVolume}
                onChange={(sfxVolume) => onUpdate({ sfxVolume })}
                previewSfx
                compact
              />
              <VolumeSlider
                label="DJ KICKIT"
                value={settings.announcer.volume}
                onChange={(volume) =>
                  onUpdate({ announcer: { ...settings.announcer, volume } })
                }
                compact
              />
              <VolumeSlider
                label="CROWD"
                value={settings.announcer.crowdVolume}
                onChange={(crowdVolume) =>
                  onUpdate({ announcer: { ...settings.announcer, crowdVolume } })
                }
                compact
              />
            </div>
            <div className="battle-pause__actions">
              <button
                className="btn btn--primary"
                data-gamepad-primary
                onClick={() => {
                  setPauseOpen(false)
                  audioEngine.playSfx('resume')
                }}
              >
                RESUME SHOW
              </button>
              <button className="btn btn--ghost" onClick={() => setPauseSettingsOpen(true)}>
                FULL SETTINGS
              </button>
              <button
                className="link-btn"
                onClick={() => {
                  setPauseOpen(false)
                  setExitOpen(true)
                }}
              >
                LEAVE THE SHOW →
              </button>
            </div>
            <span className="battle-pause__note">{online ? `${rivalLabel} WAITS WHILE THE HOUSE LIGHTS ARE UP.` : 'THE HEADLINER WAITS WHILE THE HOUSE LIGHTS ARE UP.'}</span>
          </div>
        </div>
      )}

      {state.phase === 'over' && (
        <div className="result">
          <div className="result__panel">
            <span className="kicker">{resultCopy.kicker}</span>
            {forfeitNotice && (
              <p className="result__forfeit" role="status">
                {forfeitNotice}
              </p>
            )}
            <p className={`result__verdict ${resultCopy.tone === 'win' ? 'is-win' : resultCopy.tone === 'loss' ? 'is-loss' : ''}`}>
              {resultCopy.verdict}
            </p>
            <h2>{resultCopy.title}</h2>
            <p className="result__sub">{resultCopy.sub}</p>
            {triple && state.party ? (
              <div className="result__ff" aria-label="Final free-for-all crowds">
                {state.party.order.map((seat) => {
                  const party = state.party!
                  const side = party.sides?.[seat]
                  const isWinner = party.winnerSeat === seat
                  const isOut = party.eliminated?.includes(seat) || (side?.crowd ?? 0) <= 0
                  const isDeparted = party.departed?.includes(seat) ?? false
                  return (
                    <div
                      key={seat}
                      className={`result__ff-seat ${isWinner ? 'is-winner' : ''} ${isOut ? 'is-out' : ''}`}
                    >
                      <span>{isWinner ? 'WINNER' : isDeparted ? 'LEFT THE ROOM' : isOut ? 'BOOED OFF' : 'FINAL CROWD'}</span>
                      <b>{party.seats.find((entry) => entry.seat === seat)?.name ?? roomSeatName(seat as RoomSeat)}</b>
                      <em>{side?.crowd ?? 0} CROWD</em>
                    </div>
                  )
                })}
              </div>
            ) : (
              <div className="result__crowds">
                <div>
                  <span>YOUR CROWD</span>
                  <b>{state.player.crowd}</b>
                </div>
                <span className="result__dash">—</span>
                <div>
                  <span>THEIR CROWD</span>
                  <b>{state.rival.crowd}</b>
                </div>
              </div>
            )}
            {mvpSummary.mvp &&
              (() => {
                const mvp = mvpSummary.mvp
                const mvpArtist = getArtist(mvp.artistId)
                const leaders = [
                  {
                    label: 'MOST USED',
                    performance: mvpSummary.mostUsed,
                    value: mvpSummary.mostUsed?.uses ?? 0,
                    unit: 'ACTIONS',
                    empty: 'NO ACTIONS',
                  },
                  {
                    label: 'TOP DAMAGE',
                    performance: mvpSummary.topDamage,
                    value: mvpSummary.topDamage?.damage ?? 0,
                    unit: 'DMG',
                    empty: 'NO DAMAGE',
                  },
                  {
                    label: 'TOP HEALING',
                    performance: mvpSummary.topHealing,
                    value: mvpSummary.topHealing?.healing ?? 0,
                    unit: 'HP',
                    empty: 'NO HEALING',
                  },
                  {
                    label: 'TOP DEFENSE',
                    performance: mvpSummary.topDefense,
                    value: mvpSummary.topDefense?.prevented ?? 0,
                    unit: 'STOPPED',
                    empty: 'NO DEFENSE',
                  },
                ]
                return (
                  <section className="result__mvp" aria-label={`Match MVP: ${mvpArtist.name}`}>
                    <header className="result__mvp-head">
                      <span>MATCH MVP</span>
                      <b>IMPACT {mvpSummary.score}</b>
                    </header>
                    <div className="result__mvp-card">
                      <span
                        className="result__mvp-portrait"
                        style={{ background: mvpArtist.palette.deep }}
                      >
                        <Portrait artist={mvpArtist} crop="avatar" />
                        <i>MVP</i>
                      </span>
                      <div className="result__mvp-copy">
                        <span>
                          {mvpArtist.crew} · {mvpArtist.genre} · {mvp.uses} ACTION
                          {mvp.uses === 1 ? '' : 'S'}
                        </span>
                        <b>{mvpArtist.name}</b>
                        <p>
                          {mvp.damage} DAMAGE · {mvp.healing} HEALED · {mvp.prevented} STOPPED
                        </p>
                      </div>
                    </div>
                    <div className="result__leaders">
                      {leaders.map((leader) => {
                        const performance = leader.performance
                        const leaderArtist = performance ? getArtist(performance.artistId) : null
                        return (
                          <div className="result__leader" key={leader.label}>
                            <span>{leader.label}</span>
                            <div className="result__leader-card">
                              {performance && leaderArtist && (
                                <span className="result__leader-art">
                                  <Portrait artist={leaderArtist} crop="avatar" />
                                </span>
                              )}
                              <b>{leaderArtist?.name ?? '—'}</b>
                            </div>
                            <i>{performance ? `${leader.value} ${leader.unit}` : leader.empty}</i>
                          </div>
                        )
                      })}
                    </div>
                  </section>
                )
              })()}
            <div className="result__stats">
              <div>
                <span>ROUNDS</span>
                <b>{state.round}</b>
              </div>
              <div>
                <span>DAMAGE DEALT</span>
                <b>{state.player.dealt}</b>
              </div>
              <div>
                <span>CARDS KO’D</span>
                <b>{state.rival.koes}</b>
              </div>
              <div>
                <span>CRATE DRAWS</span>
                <b>{state.player.crateDraws}</b>
              </div>
              <div>
                <span>REVIVES</span>
                <b>{state.player.revives}</b>
              </div>
              <div>
                <span>FEATURES</span>
                <b>{state.player.features}</b>
              </div>
              <div>
                <span>ENCORES</span>
                <b>{state.player.encores}</b>
              </div>
              <div>
                <span>CHART PLAYS</span>
                <b>{impactPlays}</b>
              </div>
            </div>
            {state.objectives.length > 0 && (
              <div className="result__objectives">
                <span>TONIGHT’S LIST</span>
                <div>
                  {state.objectives.map((objective) => (
                    <p key={objective.id} className={objective.done ? 'is-done' : ''}>
                      <b>{objective.done ? '✓' : '○'} {objective.title}</b>
                      <i>
                        {Math.min(objective.progress, objective.target)}/{objective.target} · +
                        {objective.rewardCredits} RC · +{objective.rewardBuzz} BUZZ
                      </i>
                    </p>
                  ))}
                </div>
              </div>
            )}
            {circuit && !state.festival && (
              <p className="result__reward">
                CONTRACT PURSE · {circuit.purseCredits} RC · +{circuit.purseBuzz} BUZZ ·{' '}
                {state.winner === 'player' ? 'SECURED' : 'UNCLAIMED'}
              </p>
            )}
            {festivalReward && (
              <section className="festival-result" aria-label="Festival reward settlement">
                <div className="festival-result__head">
                  <span>{festivalReward.eventName}</span>
                  <b>{festivalReward.outcome === 'first-clear' ? 'FIRST CLEAR · OFFICIAL' : festivalReward.outcome === 'repeat-clear' ? 'REPEAT CLEAR · REDUCED' : festivalReward.outcome.startsWith('online') ? 'ONLINE FESTIVAL · RATED' : 'FESTIVAL SET'}</b>
                </div>
                <dl>
                  <div><dt>BASE XP</dt><dd>{festivalReward.baseXp}</dd></div>
                  <div><dt>FESTIVAL MULTIPLIER</dt><dd>{festivalReward.multiplier}×</dd></div>
                  <div><dt>FINAL XP</dt><dd>{festivalReward.finalXp}</dd></div>
                  <div><dt>CARD MASTERY BONUS</dt><dd>NOT ACTIVE</dd></div>
                  <div><dt>CIRCUIT POINTS</dt><dd>+{festivalReward.totalPoints}</dd></div>
                  <div><dt>REWARD PROGRESS</dt><dd>{festivalReward.totalAfter} CP</dd></div>
                </dl>
                {festivalReward.message && <p>{festivalReward.message}</p>}
              </section>
            )}
            <div className="result__actions">
              {!forfeitNotice && (
                <button className="btn btn--primary" onClick={onRematch}>
                  RUN IT BACK
                </button>
              )}
              <button className="btn btn--ghost" onClick={onDeck}>
                CHANGE MIXTAPE
              </button>
              <button className="link-btn" onClick={onExit}>
                {state.festival ? 'FESTIVAL CALENDAR' : circuit ? 'CIRCUIT BOARD' : 'MAIN MENU'}
              </button>
            </div>
            <span className="result__fine">BATTLE SCORE · SOUTHERN STEEL · SOUND FX LIVE</span>
          </div>
        </div>
      )}

      {online?.chat && chatOpen && (
        <div className="battle-chat-overlay" onClick={() => setChatOpen(false)}>
          <div
            className="battle-chat-panel"
            role="dialog"
            aria-modal="true"
            aria-label="Room chat"
            onClick={(event) => event.stopPropagation()}
          >
            <RoomChat
              control={online.chat}
              compact
              onClose={() => setChatOpen(false)}
            />
          </div>
        </div>
      )}

      {rulesOpen && <RulesModal onClose={() => setRulesOpen(false)} />}

      {pauseSettingsOpen && (
        <SettingsModal
          settings={settings}
          onUpdate={onUpdate}
          onClose={() => setPauseSettingsOpen(false)}
          desktopWindowModeLocked
        />
      )}

      {specialOpen &&
        (() => {
          const def = crateCard(specialOpen.cardId)
          const rarity = RARITY_META[def.rarity]
          const stacks = Math.max(1, specialOpen.stacks ?? 1)
          const canUse = specialOpen.drawnRound < state.round
          const isTargetingEnemy = def.target === 'enemy'
          const targetList = isTargetingEnemy ? state.rival.stage : state.player.stage
          return (
            <div className="modal special-modal" role="dialog" aria-modal="true" aria-label={def.name}>
              <button className="modal__scrim" onClick={() => setSpecialOpen(null)} aria-label="Close" />
              <div className="modal__panel special-panel" style={{ '--rarity': rarity.color } as CSSProperties}>
                <header className="modal__head">
                  <div>
                    <span className="kicker">THE CRATE · {def.rarity}</span>
                    <h2>{def.name}</h2>
                  </div>
                  <button className="icon-btn" onClick={() => setSpecialOpen(null)} aria-label="Close">
                    ✕
                  </button>
                </header>
                <p className="special-panel__desc">{def.description}</p>
                <div className="special-panel__meta">
                  <span>{CATEGORY_LABEL[def.category]}</span>
                  {stacks > 1 && <span>×{stacks} STACKED</span>}
                  <span>{canUse ? 'READY' : 'DRAWN THIS TURN — USE NEXT TURN'}</span>
                </div>
                {!canUse && <p className="special-panel__hint">This card is still cooling down. End the turn before using it.</p>}
                {canUse && def.category === 'spotlight' && (
                  <div className="special-targets">
                    {crateCandidates.length === 0 ? (
                      <p className="special-panel__hint">No eligible artists remain in your Mixtape.</p>
                    ) : (
                      crateCandidates.map((artist) => (
                        <button key={artist.id} className="target-chip" onClick={() => useSpecial(undefined, artist.id)}>
                          {artist.name} <i>{artist.genre}</i>
                        </button>
                      ))
                    )}
                  </div>
                )}
                {canUse && def.category === 'callback' && (
                  <div className="special-targets">
                    {state.player.backstage.length === 0 ? (
                      <p className="special-panel__hint">Backstage is empty.</p>
                    ) : (
                      state.player.backstage.map((card) => {
                        const artist = getArtist(card.artistId)
                        const disabled =
                          state.player.stage.length >= state.stageSlots ||
                          state.player.revives >= 1 ||
                          state.player.hype < 4
                        return (
                          <button
                            key={card.uid}
                            className="target-chip"
                            disabled={disabled}
                            onClick={() => useSpecial(card.uid)}
                          >
                            {artist.name}{' '}
                            <i>
                              {card.maxHp} HP · {card.moves.map((moveId) => moveById(moveId)?.name).filter(Boolean).join(' · ')}
                            </i>
                          </button>
                        )
                      })
                    )}
                    <p className="special-panel__hint">
                      Costs 4 Hype · one empty stage slot · one revival per match ({state.player.revives}/1 used).
                    </p>
                  </div>
                )}
                {canUse && (def.category === 'power' || def.category === 'shield' || def.category === 'untouchable' || def.category === 'heal' || (def.category === 'ability' && def.target === 'ally')) && specialOpen.cardId !== 'hype-3' && (
                  <div className="special-targets">
                    {state.player.stage.length === 0 ? (
                      <p className="special-panel__hint">No artist on stage to target.</p>
                    ) : (
                      state.player.stage.map((card) => (
                        <button key={card.uid} className="target-chip" onClick={() => useSpecial(card.uid)}>
                          {getArtist(card.artistId).name} <i>{card.hp} HP</i>
                        </button>
                      ))
                    )}
                  </div>
                )}
                {canUse && isTargetingEnemy && (
                  <div className="special-targets">
                    {targetList.length === 0 ? (
                      <button className="target-chip target-chip--crowd" onClick={() => useSpecial(undefined)}>
                        HIT THE CROWD
                      </button>
                    ) : (
                      targetList.map((card) => (
                        <button key={card.uid} className="target-chip" onClick={() => useSpecial(card.uid)}>
                          {getArtist(card.artistId).name} <i>{card.hp} HP</i>
                        </button>
                      ))
                    )}
                  </div>
                )}
                {canUse && def.category === 'skip' && (
                  <button className="btn btn--primary" onClick={() => useSpecial()}>
                    PLAY SKIP THE SET
                  </button>
                )}
                {canUse && specialOpen.cardId === 'hype-3' && (
                  <button className="btn btn--primary" onClick={() => useSpecial()}>
                    TAKE +3 HYPE
                  </button>
                )}
                {canUse && def.target === 'none' && def.category === 'ability' && (
                  <button className="btn btn--primary" onClick={() => useSpecial()}>
                    PLAY {def.name}
                  </button>
                )}
                {def.category === 'rewind' && (
                  <p className="special-panel__hint">
                    Hold this in your special hand. When the Headliner attacks an artist, the defensive
                    window will offer a Turntable Rewind.
                  </p>
                )}
                <button className="btn btn--ghost btn--sm special-panel__close" onClick={() => setSpecialOpen(null)}>
                  KEEP IT IN HAND
                </button>
              </div>
            </div>
          )
        })()}

      {backstageOpen && (
        <div className="modal backstage-modal" role="dialog" aria-modal="true" aria-label="Backstage">
          <button className="modal__scrim" onClick={() => setBackstageOpen(false)} aria-label="Close" />
          <div className="modal__panel backstage-panel">
            <header className="modal__head">
              <div>
                <span className="kicker">DEFEATED OR CUT ARTISTS · {state.player.revives} CALLED BACK</span>
                <h2>BACKSTAGE</h2>
              </div>
              <button className="icon-btn" onClick={() => setBackstageOpen(false)} aria-label="Close">
                ✕
              </button>
            </header>
            {state.player.backstage.length === 0 ? (
              <p className="special-panel__hint">Nobody is backstage. Your set is intact.</p>
            ) : (
              <div className="backstage-list">
                {state.player.backstage.map((card) => {
                  const artist = getArtist(card.artistId)
                  const recallCost = backstageRecallCost(card)
                  const reviveBlockedReason =
                    state.phase !== 'player'
                      ? 'WAIT FOR YOUR TURN'
                      : state.player.hype < recallCost
                        ? `NEED ${recallCost} HYPE`
                        : state.player.stage.length >= state.stageSlots
                          ? 'STAGE FULL'
                          : null
                  const canRevive = reviveBlockedReason === null
                  const restCount = artist.personal ? state.player.personalRests : null
                  const restHp = restCount === null
                    ? card.maxHp
                    : restCount < 3
                      ? Math.max(card.hp, Math.ceil(card.maxHp * 0.5))
                      : card.hp
                  return (
                    <div className="backstage-row" key={card.uid}>
                      <span className="backstage-row__slot" style={{ color: artist.palette.accent }}>
                        {artist.slot}
                      </span>                          <div>
                        <b>{artist.name}</b>
                        <i>
                          {card.hp} HP NOW · {card.maxHp} MAX HP · {card.encore ? 'ENCORE FORM' : 'BASE FORM'}
                        </i>
                        <span className="backstage-row__moves">
                          {card.moves
                            .map((moveId) => moveById(moveId)?.name)
                            .filter(Boolean)
                            .join(' · ')}
                        </span>
                      </div>
                      <button
                        className="btn btn--ghost btn--sm"
                        disabled={!canRevive}
                        onClick={() => {
                          audioEngine.playSfx('ability')
                          dispatch({ type: 'REVIVE', targetUid: card.uid })
                          setBackstageOpen(false)
                        }}
                      >
                        {reviveBlockedReason ?? (artist.personal
                          ? `REST & RETURN · ${restHp} HP · ${recallCost} HYPE`
                          : `CALL BACK · ${recallCost} HYPE`)}
                      </button>
                    </div>
                  )
                })}
              </div>
            )}
            <p className="special-panel__hint">
              Calling an artist back costs 10–15 Hype based on card strength and level, and uses a live
              stage slot. It does not attack on the turn it returns. Your personal artist can rest and
              return three times per battle, recovering to at least half HP. After rest 3/3, they return
              at the HP they had when last cut. Standard artists still return at full HP.
            </p>
            {state.player.backstage.some((card) => getArtist(card.artistId).personal) && (
              <p className="special-panel__hint backstage-rest-counter">
                PERSONAL RESTS USED · {state.player.personalRests}/3
              </p>
            )}
          </div>
        </div>
      )}

      {exitOpen && (
        <div className="modal" role="dialog" aria-modal="true" aria-label="Leave the show">
          <button className="modal__scrim" onClick={() => setExitOpen(false)} aria-label="Stay" />
          <div className="modal__panel confirm">
            <span className="kicker">LEAVE {state.venue.name}?</span>
            <h2>THE CROWD WILL NOT WAIT.</h2>
            <p>{online ? 'Leaving ends this online match for both players. Your mixtape and record are saved.' : 'Leaving forfeits the current show. Your mixtape and record are saved.'}</p>
            <div className="confirm__actions">
              <button className="btn btn--ghost" onClick={() => setExitOpen(false)}>
                KEEP PLAYING
              </button>
              <button className="btn btn--primary" onClick={onExit}>
                LEAVE THE SHOW
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
