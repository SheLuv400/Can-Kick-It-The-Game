import { useEffect, useMemo, useRef, useState } from 'react'
import type { BattleState } from '../game/battle'
import { ADVISOR_MAX_CHARGES } from '../game/battle'
import { getArtist } from '../game/roster'
import {
  buildAdvisorGamePlan,
  describeAdvisorAction,
  evaluateAdvisorMove,
  listAdvisorActions,
  recommendAdvisorMove,
  retargetAdvisorAction,
  visibleAdvisorStateKey,
  type AdvisorAction,
  type AdvisorResponse,
} from '../game/advisor'
import { AdvisorVinyls } from './AdvisorVinyls'

interface AskDjKickitProps {
  state: BattleState
  charges: number
  onSpend: () => void
  onClose: () => void
  onAdvice: (response: AdvisorResponse) => void
}

type PanelMode = 'menu' | 'choose' | 'result'

const GROUPS: Array<{ title: string; kinds: AdvisorAction['kind'][] }> = [
  { title: 'YOUR MOVES', kinds: ['move', 'special'] },
  { title: 'YOUR HAND', kinds: ['play'] },
  { title: 'MATCH ACTIONS', kinds: ['encore', 'feature', 'revive', 'draw'] },
  { title: 'RESET', kinds: ['end'] },
]

export function AskDjKickit({
  state,
  charges,
  onSpend,
  onClose,
  onAdvice,
}: AskDjKickitProps) {
  const [mode, setMode] = useState<PanelMode>('menu')
  const [response, setResponse] = useState<AdvisorResponse | null>(null)
  const [selected, setSelected] = useState<AdvisorAction | null>(null)
  const [error, setError] = useState<string | null>(null)
  const locked = useRef(false)
  const stateKey = visibleAdvisorStateKey(state)
  const actions = useMemo(() => listAdvisorActions(state), [state])

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return
      event.preventDefault()
      event.stopPropagation()
      onClose()
    }
    window.addEventListener('keydown', onKey, true)
    return () => window.removeEventListener('keydown', onKey, true)
  }, [onClose])

  // A response is only true for the room it was generated in. The charge is
  // already spent, but the advice must not point at a stale board.
  useEffect(() => {
    if (!response || response.stateKey === stateKey) return
    setResponse(null)
    setMode('menu')
    setError('The room changed before I could finish that read. Pick up the mic and ask me again.')
    locked.current = false
  }, [response, stateKey])

  const commit = (result: AdvisorResponse | null) => {
    if (locked.current) return
    if (!result) {
      setError("I couldn't read a clean legal action from that board. No spin spent—run it back.")
      return
    }
    locked.current = true
    onSpend()
    setResponse(result)
    setMode('result')
    setError(null)
    onAdvice(result)
  }

  const askRecommendation = () => {
    if (charges <= 0) return
    commit(recommendAdvisorMove(state))
  }

  const askPlan = () => {
    if (charges <= 0) return
    commit(buildAdvisorGamePlan(state))
  }

  const askEvaluation = () => {
    if (!selected || charges <= 0) return
    commit(evaluateAdvisorMove(state, selected))
  }

  const resetToMenu = () => {
    setMode('menu')
    setSelected(null)
    setResponse(null)
    setError(null)
    locked.current = false
  }

  const choose = (action: AdvisorAction) => {
    setSelected(action)
    setError(null)
  }

  const chooseTarget = (uid: string) => {
    if (!selected) return
    setSelected(retargetAdvisorAction(selected, uid))
  }

  const selectedTargets = selected
    ? selected.targetSide === 'enemy'
      ? state.rival.stage
      : selected.targetSide === 'ally'
        ? state.player.stage
        : []
    : []
  const selectedTargetUid =
    selected?.targetSide === 'ally' ? selected.allyTargetUid : selected?.targetUid

  const optionButtons = (
    <div className="dj-options">
      <button className="dj-option dj-option--hot" onClick={askRecommendation} disabled={charges <= 0}>
        <span className="dj-option__index">01</span>
        <span className="dj-option__copy">
          <b>RECOMMEND MY NEXT MOVE</b>
          <i>I read every legal action and call the strongest play.</i>
        </span>
        <span className="dj-option__arrow">→</span>
      </button>
      <button
        className="dj-option"
        onClick={() => {
          setMode('choose')
          setError(null)
          setSelected(null)
        }}
        disabled={charges <= 0 || actions.length === 0}
      >
        <span className="dj-option__index">02</span>
        <span className="dj-option__copy">
          <b>IS THIS A GOOD MOVE?</b>
          <i>Pick a legal action. Nothing gets played until you say so.</i>
        </span>
        <span className="dj-option__arrow">→</span>
      </button>
      <button className="dj-option" onClick={askPlan} disabled={charges <= 0}>
        <span className="dj-option__index">03</span>
        <span className="dj-option__copy">
          <b>WHAT&apos;S MY GAME PLAN?</b>
          <i>Short read on the room, plus one action I would run.</i>
        </span>
        <span className="dj-option__arrow">→</span>
      </button>
    </div>
  )

  return (
    <section
      className={`dj-panel dj-panel--${mode}`}
      role="dialog"
      aria-modal="false"
      aria-labelledby="dj-panel-title"
    >
      <header className="dj-panel__head">
        <span className="dj-panel__avatar" aria-hidden="true">
          <span className="dj-panel__record">
            <i />
            <b />
          </span>
          <em>ON AIR</em>
        </span>
        <div className="dj-panel__identity">
          <span className="kicker">THE CORNER · LOCAL ADVICE</span>
          <h2 id="dj-panel-title">ASK DJ KICKIT</h2>
          <p>{mode === 'choose' ? 'CALL THE PLAY. KEEP THE MOVE.' : 'TWO SPINS. NO SAFETY NET.'}</p>
        </div>
        <div className="dj-panel__charge">
          <AdvisorVinyls charges={charges} max={ADVISOR_MAX_CHARGES} />
          <b>{charges}/{ADVISOR_MAX_CHARGES}</b>
        </div>
        <button className="dj-panel__close" onClick={onClose} aria-label="Close Ask DJ Kickit">
          ✕
        </button>
      </header>

      <div className="dj-panel__body">
        {error && (
          <p className="dj-panel__error" role="alert">
            {error}
          </p>
        )}

        {mode === 'menu' && (
          <>
            <p className="dj-panel__intro">
              {charges <= 0
                ? "I'm off the clock, family. You already got both of my reads this match."
                : "You bring the set. I bring the read. Pick your question—opening and closing this panel is free."}
            </p>
            {optionButtons}
            <p className="dj-panel__fineprint">
              Only a completed read costs one spin. I never play the card for you.
            </p>
          </>
        )}

        {mode === 'choose' && (
          <div className="dj-picker">
            <div className="dj-picker__head">
              <span className="kicker">LEGAL ACTIONS ONLY</span>
              <b>Pick one. I&apos;ll grade it before you commit.</b>
            </div>
            {actions.length === 0 ? (
              <p className="dj-panel__error" role="alert">
                No legal action found. No spin spent.
              </p>
            ) : (
              <div className="dj-action-groups">
                {GROUPS.map((group) => {
                  const entries = actions.filter((action) => group.kinds.includes(action.kind))
                  if (entries.length === 0) return null
                  return (
                    <div className="dj-action-group" key={group.title}>
                      <span className="dj-action-group__title">{group.title}</span>
                      <div className="dj-action-list">
                        {entries.map((action) => (
                          <button
                            key={action.id}
                            className={`dj-action ${selected?.id === action.id ? 'is-on' : ''}`}
                            onClick={() => choose(action)}
                          >
                            <span>
                              <b>{action.label}</b>
                              <i>{action.detail}</i>
                            </span>
                            <em>{action.cost > 0 ? `${action.cost} HYPE` : action.attack ? 'FREE' : ''}</em>
                          </button>
                        ))}
                      </div>
                    </div>
                  )
                })}
              </div>
            )}

            {selected && selectedTargets.length > 0 && (
              <div className="dj-targets">
                <span className="dj-targets__label">
                  {selected.targetSide === 'ally' ? 'ALLY TARGET' : 'TARGET'}
                </span>
                <div className="dj-targets__row">
                  {selectedTargets.map((card) => (
                    <button
                      key={card.uid}
                      className={`dj-target ${selectedTargetUid === card.uid ? 'is-on' : ''}`}
                      onClick={() => chooseTarget(card.uid)}
                    >
                      {getArtist(card.artistId).name}
                      <i>{card.hp} HP</i>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {selected && (
              <div className="dj-picker__call">
                <span>
                  <b>{describeAdvisorAction(state, selected)}</b>
                  <i>This will not be executed by the advisor.</i>
                </span>
                <button className="dj-primary" onClick={askEvaluation} disabled={charges <= 0}>
                  GET THE VERDICT <i>−1 SPIN</i>
                </button>
              </div>
            )}

            <div className="dj-panel__footer-row">
              <button className="dj-quiet" onClick={resetToMenu}>
                ← BACK
              </button>
              <button className="dj-quiet" onClick={onClose}>
                CANCEL
              </button>
            </div>
          </div>
        )}

        {mode === 'result' && response && (
          <div className="dj-response">
            <div className={`dj-verdict dj-verdict--${response.verdict ? response.verdict.split(' ')[0].toLowerCase() : 'read'}`}>
              <span>{response.kind === 'evaluate' ? "DJ KICKIT'S VERDICT" : 'THE READ'}</span>
              <b>{response.kind === 'evaluate' ? response.verdict : 'STRATEGY CALL'}</b>
            </div>
            <p className="dj-response__intro">{response.intro}</p>

            {response.kind === 'plan' && response.plan.length > 0 && (
              <div className="dj-response__block">
                <span>THE PLAN</span>
                <ul>
                  {response.plan.map((line) => (
                    <li key={line}>{line}</li>
                  ))}
                </ul>
              </div>
            )}

            <div className="dj-response__block">
              <span>RECOMMENDED ACTION</span>
              <b>{response.recommendation}</b>
            </div>
            <div className="dj-response__block">
              <span>WHY</span>
              <p>{response.reason}</p>
            </div>
            {response.uncertainty && (
              <p className="dj-response__uncertainty">
                <span>ESTIMATE</span> {response.uncertainty}
              </p>
            )}
            <p className="dj-response__freedom">
              You still make the call. I will never play the move, spend your Hype or block a legal choice.
            </p>
            <div className="dj-response__footer">
              <span className="dj-response__spent">
                {charges > 0 ? `SPIN SPENT · ${charges}/${ADVISOR_MAX_CHARGES} LEFT` : 'DJ KICKIT IS OFF THE CLOCK — 0/2'}
              </span>
              <div>
                {charges > 0 && (
                  <button className="dj-quiet" onClick={resetToMenu}>
                    ASK ANOTHER
                  </button>
                )}
                <button className="dj-primary" onClick={onClose}>
                  BACK TO THE BATTLE
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </section>
  )
}
