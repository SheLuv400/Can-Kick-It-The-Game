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
  createBattle,
  difficultyLabel,
  featureDamage,
  rivalCrowdFor,
  STAGE_SLOTS,
  type CrateHandCard,
  type LastMove,
} from '../game/battle'
import { CREW_META, abilityText, getArtist } from '../game/roster'
import { CATEGORY_LABEL, crateCard, RARITY_META } from '../game/crate'
import { ELEMENT_META, moveById } from '../game/moves'
import type { Crew, Move, Settings } from '../game/types'
import { Card } from '../components/Card'
import { HudStrip } from '../components/Hud'
import { CinematicOverlay } from '../components/Cinematic'
import { RulesModal } from '../components/RulesModal'
import { CrateDock, MoveDock, StageUnit } from '../components/Combat'

interface BattleProps {
  settings: Settings
  onExit: () => void
  onRematch: () => void
  onDeck: () => void
  onResult: (winner: 'player' | 'rival' | 'draw', plays: Record<string, number>) => void
  onTutorial?: () => void
}

export function Battle({ settings, onExit, onRematch, onDeck, onResult, onTutorial }: BattleProps) {
  const [state, dispatch] = useReducer(battleReducer, settings, (config) =>
    createBattle({
      deck: config.deck,
      difficulty: config.difficulty,
      progress: config.artistProgress,
    }),
  )
  const [started, setStarted] = useState(false)
  const [pendingCard, setPendingCard] = useState<string | null>(null)
  const [peekId, setPeekId] = useState<string | null>(null)
  const [rulesOpen, setRulesOpen] = useState(false)
  const [logOpen, setLogOpen] = useState(false)
  const [exitOpen, setExitOpen] = useState(false)
  const [targetUid, setTargetUid] = useState<string | null>(null)
  const [allyTargetUid, setAllyTargetUid] = useState<string | null>(null)
  const [selectedStageUid, setSelectedStageUid] = useState<string | null>(null)
  const [specialOpen, setSpecialOpen] = useState<CrateHandCard | null>(null)
  const [backstageOpen, setBackstageOpen] = useState(false)
  const [crateReveal, setCrateReveal] = useState<CrateHandCard | null>(null)
  const [defeatReveal, setDefeatReveal] = useState<{ artistId: string; nonce: number } | null>(null)
  const [moveFx, setMoveFx] = useState<LastMove | null>(null)
  const recorded = useRef(false)
  const plays = useRef<Record<string, number>>({})
  const [impactPlays, setImpactPlays] = useState(0)

  const cinematic = state.cinematics[0] ?? null
  const playerTurn =
    started && state.phase === 'player' && !cinematic && !state.counterPrompt
  const stageFull = state.player.stage.length >= STAGE_SLOTS
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
  const targetArtist = targetUid
    ? state.rival.stage.find((card) => card.uid === targetUid)
    : state.rival.stage[0]
  const targetName = targetArtist ? getArtist(targetArtist.artistId).name : 'THE CROWD'
  const callbackCard = state.player.specialHand.find((card) => card.cardId === 'callback')
  const playerUidKey = state.player.stage.map((card) => card.uid).join('|')
  const rivalUidKey = state.rival.stage.map((card) => card.uid).join('|')

  const skipCinematic = useCallback(() => dispatch({ type: 'DISMISS_CINEMATIC' }), [])

  useEffect(() => {
    if (!started || state.phase !== 'rival' || state.counterPrompt || cinematic || crateReveal || backstageOpen) return
    const timer = window.setTimeout(() => dispatch({ type: 'RIVAL_TICK' }), 900)
    return () => window.clearTimeout(timer)
  }, [started, state.phase, state.tick, state.counterPrompt?.id, cinematic?.id, crateReveal, backstageOpen])

  useEffect(() => {
    if (!state.counterPrompt || backstageOpen) return
    const timer = window.setTimeout(() => dispatch({ type: 'COUNTER', mode: 'take' }), 6000)
    return () => window.clearTimeout(timer)
  }, [state.counterPrompt?.id, backstageOpen])

  useEffect(() => {
    if (state.phase === 'over' && state.winner && !recorded.current) {
      recorded.current = true
      onResult(state.winner, { ...plays.current })
    }
  }, [state.phase, state.winner, onResult])

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
    setDefeatReveal(state.lastDefeat)
    const timer = window.setTimeout(() => setDefeatReveal(null), 2200)
    return () => window.clearTimeout(timer)
  }, [state.lastDefeat?.nonce])

  useEffect(() => {
    if (!state.lastMove) return
    setMoveFx(state.lastMove)
    const timer = window.setTimeout(() => setMoveFx(null), 1150)
    return () => window.clearTimeout(timer)
  }, [state.lastMove?.nonce])

  const notePlay = (artistId: string) => {
    plays.current[artistId] = (plays.current[artistId] ?? 0) + 1
    setImpactPlays((count) => count + 1)
  }

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setPendingCard(null)
        setLogOpen(false)
        setSpecialOpen(null)
        setBackstageOpen(false)
      }
      if (event.key === ' ' && playerTurn && !pendingCard && !specialOpen && !backstageOpen) {
        event.preventDefault()
        dispatch({ type: 'END_TURN' })
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [playerTurn, pendingCard, specialOpen, backstageOpen])

  const handleCard = (artistId: string) => {
    if (!playerTurn) return
    const artist = getArtist(artistId)
    if (state.player.hype < artist.cost) return
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
    setSelectedStageUid(null)
  }

  const drawCrate = () => {
    if (!playerTurn || state.player.specialHand.length >= 6) return
    setSelectedStageUid(null)
    setPendingCard(null)
    dispatch({ type: 'DRAW_CRATE' })
  }

  const useSpecial = (target?: string, artistId?: string) => {
    if (!specialOpen) return
    dispatch({ type: 'USE_SPECIAL', uid: specialOpen.uid, targetUid: target, artistId })
    setSpecialOpen(null)
  }

  const endTurn = () => {
    if (!playerTurn) return
    setPendingCard(null)
    setSelectedStageUid(null)
    dispatch({ type: 'END_TURN' })
  }

  const canDraw =
    playerTurn &&
    state.player.specialHand.length < 6 &&
    state.player.crate.length > 0 &&
    started
  const drawReason =
    !started
      ? 'START THE SHOW'
      : state.phase !== 'player'
        ? 'NOT YOUR TURN'
        : state.player.specialHand.length >= 6
          ? 'SPECIAL HAND FULL — USE A CARD FIRST'
          : state.player.crate.length === 0
            ? 'THE CRATE IS EMPTY'
            : 'DRAWING ENDS YOUR TURN'

  const winnerTitle =
    state.winner === 'player'
      ? 'SOLD OUT'
      : state.winner === 'rival'
        ? 'CROWD WALKED'
        : 'CURFEW DEAD HEAT'
  const winnerSub =
    state.winner === 'player'
      ? 'The room is yours. The Headliner walks.'
      : state.winner === 'rival'
        ? 'The Headliner keeps the room. Run it back.'
        : 'Neither room blinked. The house lights win.'

  const lastLog = state.log[0]

  const crateCandidates = useMemo(() => {
    const ids = [...state.player.deck, ...state.player.discard]
    return [...new Set(ids)].map(getArtist)
  }, [state.player.deck, state.player.discard])

  return (
    <div className={`battle battle--${settings.theme}`}>
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
            <b>LIVE FROM THE MIDNIGHT GARDEN</b>
            <i>NIGHT 01 · SOLD OUT</i>
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
        <span className="battle__venue-tag">THE MIDNIGHT GARDEN · NIGHT 01</span>
      </div>

      <div className="battle__tools">
        <span className="battle__audio">
          <i />
          AUDIO LATER
        </span>
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
      </div>

      <div className="battle__hud">
        <HudStrip
          player={{
            ...state.player,
            avatar: getArtist(
              state.player.stage[0]?.artistId ??
                state.player.hand[0] ??
                settings.deck[0],
            ),
          }}
          rival={{
            ...state.rival,
            avatar: getArtist(
              state.rival.stage[0]?.artistId ??
                state.rival.hand[0] ??
                settings.deck[0],
            ),
          }}
          round={state.round}
          era={state.era}
          lastHit={state.lastHit}
          difficulty={`${difficultyLabel(state.difficulty)} · THE MIDNIGHT GARDEN`}
        />
      </div>

      <div className="battle__board">
        <section className="side side--rival" aria-label="The Headliner's stage">
          <div className="side__head">
            <span className="side__name">
              <i className="side__dot" />
              THE HEADLINER
            </span>
            <span className="side__meta">
              LIVE SET · {state.rival.stage.length}/{STAGE_SLOTS} · LOST {state.rival.koes}
            </span>
            <span className="side__meta side__meta--gold">
              HYPE {String(state.rival.hype).padStart(2, '0')}
            </span>
          </div>
          <div className="stage stage--rival">
            {state.rival.stage.map((card) => (
              <StageUnit
                key={card.uid}
                artist={getArtist(card.artistId)}
                card={card}
                era={state.era}
                targetable={playerTurn}
                targeted={targetUid === card.uid}
                onClick={() => playerTurn && setTargetUid(card.uid)}
              />
            ))}
            {Array.from({ length: STAGE_SLOTS - state.rival.stage.length }).map((_, index) => (
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
            <i>{playerTurn ? 'CLICK A HEADLINER CARD TO CHANGE' : 'WAITING FOR YOUR TURN'}</i>
          </div>
        </section>

        <div className="clashline">
          <span className="clashline__tag">
            <i /> LIVE
          </span>
          <p className={lastLog?.tone ? `is-${lastLog.tone}` : ''}>{lastLog?.text ?? 'THE SHOW IS LIVE.'}</p>
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
              {state.player.stage.length}/{STAGE_SLOTS} SLOTS · {state.player.hand.length} IN HAND · LOST {state.player.koes}
            </span>
            <span className="side__meta side__meta--gold">
              ENCORE {state.player.encoreCharges} · CLAPBACK {state.player.counters}
            </span>
          </div>
          <div className="stage stage--player">
            {state.player.stage.map((card) => (
              <StageUnit
                key={card.uid}
                artist={getArtist(card.artistId)}
                card={card}
                era={state.era}
                selected={selectedStageUid === card.uid}
                className={pendingCard ? 'is-swap-target' : ''}
                onClick={() => playerTurn && selectStage(card.uid)}
              />
            ))}
            {Array.from({ length: STAGE_SLOTS - state.player.stage.length }).map((_, index) => (
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
                        <em>+{featureDamage(state.player.stage, crew, state.era)} BARS · +1 HYPE</em>
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
                    ? 'HEADLINER ON STAGE'
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
                      disabled={!playerTurn || !affordable}
                      selected={pendingCard === artistId}
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
                <i>HYPE</i>
              </b>
              <span className="turnbox__hint">
                {state.phase === 'rival'
                  ? 'READING THE ROOM…'
                  : 'CARDS SUMMON. MOVES COST HYPE.'}
              </span>
            </div>
            <button className="btn btn--end" onClick={endTurn} disabled={!playerTurn}>
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
          THE HEADLINER IS CUEING THE NEXT RECORD
        </div>
      )}

      {state.counterPrompt &&
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
                      onClick={() => dispatch({ type: 'COUNTER', mode: 'clapback' })}
                    >
                      CLAPBACK → {halved}
                    </button>
                  )}
                  {state.counterPrompt.canRewind && (
                    <button
                      className="btn btn--ghost btn--sm"
                      onClick={() => dispatch({ type: 'COUNTER', mode: 'rewind' })}
                    >
                      TURNTABLE REWIND
                    </button>
                  )}
                  <button
                    className="btn btn--ghost btn--sm"
                    onClick={() => dispatch({ type: 'COUNTER', mode: 'take' })}
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
                {moveFx.side === 'player' ? 'YOUR MOVE' : 'HEADLINER MOVE'}
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
                <span className="crate-reveal__kicker">THE CRATE OPENS</span>
                <span className="crate-reveal__rarity">{def.rarity}</span>
                <h3>{def.name}</h3>
                <p>{def.description}</p>
                <small>{CATEGORY_LABEL[def.category]}</small>
              </div>
              <button className="link-btn crate-reveal__close" onClick={() => setCrateReveal(null)}>
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

      {!started && (
        <div className="show-intro">
          <div className="show-intro__bg" aria-hidden="true" />
          <div className="show-intro__panel">
            <span className="kicker">THE MIDNIGHT GARDEN · SOLD OUT</span>
            <h1>
              CAN I
              <br />
              <em>KICK IT?</em>
            </h1>
            <p className="show-intro__sub">THE GAME · NIGHT 01</p>
            <p className="show-intro__lede">
              You have a 26-slot mixtape, five live slots and a room full of people who came to hear
              something. The Headliner has the same, and zero intention of sharing.
              Every artist has three equipped moves and a life bar. Break the room, not just the crowd.
            </p>
            <p className="show-intro__note">TWO OPENING ACTS ARE ALREADY LIVE ON STAGE.</p>
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
              <span>HYPE 04</span>
              <span>CRATE DRAW ×1</span>
              <span>3 MOVES / ARTIST</span>
              <span>ENCORE ×1</span>
              <span>CLAPBACK ×2</span>
              <span>CURFEW · ROUND 12</span>
            </div>
            <button className="btn btn--primary btn--xl" onClick={() => setStarted(true)}>
              <span>START THE SHOW</span>
              <i className="btn__play">▶</i>
            </button>
            <div className="show-intro__foot">
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

      {state.phase === 'over' && (
        <div className="result">
          <div className="result__panel">
            <span className="kicker">THE HOUSE LIGHTS · FINAL CROWD</span>
            <p className={`result__verdict ${state.winner === 'player' ? 'is-win' : state.winner === 'rival' ? 'is-loss' : ''}`}>
              {state.winner === 'player' ? 'YOU OWN THE ROOM' : state.winner === 'rival' ? 'THE HEADLINER TAKES IT' : 'THE ROOM IS SPLIT'}
            </p>
            <h2>{winnerTitle}</h2>
            <p className="result__sub">{winnerSub}</p>
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
            <div className="result__actions">
              <button className="btn btn--primary" onClick={onRematch}>
                RUN IT BACK
              </button>
              <button className="btn btn--ghost" onClick={onDeck}>
                CHANGE MIXTAPE
              </button>
              <button className="link-btn" onClick={onExit}>
                MAIN MENU
              </button>
            </div>
            <span className="result__fine">AUDIO DEFERRED · VISUAL SHOW ONLY</span>
          </div>
        </div>
      )}

      {rulesOpen && <RulesModal onClose={() => setRulesOpen(false)} />}

      {specialOpen &&
        (() => {
          const def = crateCard(specialOpen.cardId)
          const rarity = RARITY_META[def.rarity]
          const canUse = specialOpen.drawnRound < state.round
          const isTargetingEnemy = def.category === 'elemental'
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
                          state.player.stage.length >= STAGE_SLOTS ||
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
                {canUse && (def.category === 'power' || def.category === 'shield' || def.category === 'untouchable') && specialOpen.cardId !== 'hype-3' && (
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
                <span className="kicker">DEFEATED ARTISTS · {state.player.revives}/1 REVIVED</span>
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
                  const canRevive =
                    Boolean(callbackCard) &&
                    state.player.stage.length < STAGE_SLOTS &&
                    state.player.revives < 1 &&
                    state.player.hype >= 4
                  return (
                    <div className="backstage-row" key={card.uid}>
                      <span className="backstage-row__slot" style={{ color: artist.palette.accent }}>
                        {artist.slot}
                      </span>                          <div>
                        <b>{artist.name}</b>
                        <i>
                          {card.maxHp} MAX HP · {card.encore ? 'ENCORE FORM' : 'BASE FORM'}
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
                          if (!callbackCard) return
                          setSpecialOpen(callbackCard)
                          setBackstageOpen(false)
                        }}
                      >
                        {callbackCard ? 'CALL BACK' : 'NO CALL BACK'}
                      </button>
                    </div>
                  )
                })}
              </div>
            )}
            <p className="special-panel__hint">
              Call Back on Stage costs 4 Hype, restores full HP and cannot attack immediately. It is one
              revival per match.
            </p>
          </div>
        </div>
      )}

      {exitOpen && (
        <div className="modal" role="dialog" aria-modal="true" aria-label="Leave the show">
          <button className="modal__scrim" onClick={() => setExitOpen(false)} aria-label="Stay" />
          <div className="modal__panel confirm">
            <span className="kicker">LEAVE THE MIDNIGHT GARDEN?</span>
            <h2>THE CROWD WILL NOT WAIT.</h2>
            <p>Leaving forfeits the current show. Your mixtape and record are saved.</p>
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
