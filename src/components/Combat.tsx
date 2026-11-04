import type { CSSProperties, ReactNode } from 'react'
import type { Artist, Move } from '../game/types'
import type { CrateHandCard, StageCard } from '../game/battle'
import { battleStatsFor, ELEMENT_META } from '../game/moves'
import { CATEGORY_LABEL, crateCard, RARITY_META } from '../game/crate'
import { getArtist } from '../game/roster'
import { Card } from './Card'

interface StageUnitProps {
  artist: Artist
  card: StageCard
  era: 1 | 2 | 3
  targeted?: boolean
  targetable?: boolean
  selected?: boolean
  onClick?: () => void
  footer?: ReactNode
  className?: string
  tutorialTarget?: string
}

export function StageUnit({
  artist,
  card,
  era,
  targeted = false,
  targetable = false,
  selected = false,
  onClick,
  footer,
  className = '',
  tutorialTarget,
}: StageUnitProps) {
  const stats = battleStatsFor(artist, card.level)
  const pct = Math.max(0, Math.min(100, (card.hp / Math.max(1, card.maxHp)) * 100))
  return (
    <div
      className={`stage-unit ${targeted ? 'is-targeted' : ''} ${targetable ? 'is-targetable' : ''} ${
        selected ? 'is-selected' : ''
      } ${card.hp <= 0 ? 'is-down' : ''} ${className}`}
      onClick={onClick}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
      onKeyDown={
        onClick
          ? (event) => {
              if (event.key === 'Enter' || event.key === ' ') {
                event.preventDefault()
                onClick()
              }
            }
          : undefined
      }
      aria-label={`${artist.name}, ${card.hp} of ${card.maxHp} HP`}
      data-tutorial-target={tutorialTarget}
    >
      <Card
        artist={artist}
        era={era}
        encore={card.encore}
        size="stage"
        tilt={false}
        footer={
          <div className="stage-unit__footer">
            <div className="stage-unit__vitals">
              <span className="unit-hp">
                <i style={{ width: `${pct}%` }} />
                <b>{card.hp}</b>
                <em>/{card.maxHp}</em>
              </span>
              <span className="unit-def" title="Defense reduces incoming attack damage">
                DEF {stats.defense + card.defenseBonus}
              </span>
              {card.shield > 0 && (
                <span className="unit-shield" title="Temporary Shield HP">
                  ◈ {card.shield}
                </span>
              )}
            </div>
            {(card.statuses.length > 0 || card.nextAttackBonus > 0) && (
              <div className="unit-statuses">
                {card.statuses.map((status) => (
                  <span key={status.kind} className={`status status--${status.kind}`}>
                    {status.kind.toUpperCase()} {status.turns}
                  </span>
                ))}
                {card.nextAttackBonus > 0 && <span className="status status--buff">+{card.nextAttackBonus} NEXT</span>}
              </div>
            )}
            {footer && (
              <div className="stage-unit__actions" onClick={(event) => event.stopPropagation()}>
                {footer}
              </div>
            )}
          </div>
        }
      />
      {targetable && <span className="unit-reticle" aria-hidden="true">⊕</span>}
      {targeted && <span className="unit-targeted-tag">TARGET</span>}
    </div>
  )
}

interface CrateDockProps {
  crateCount: number
  hand: CrateHandCard[]
  backstageCount: number
  canDraw: boolean
  drawReason: string
  onDraw: () => void
  onSelect: (card: CrateHandCard) => void
  onBackstage: () => void
  selectedUid?: string | null
}

export function CrateDock({
  crateCount,
  hand,
  backstageCount,
  canDraw,
  drawReason,
  onDraw,
  onSelect,
  onBackstage,
  selectedUid,
}: CrateDockProps) {
  return (
    <section className="crate-dock" aria-label="The Crate">
      <div className="crate-dock__head">
        <span className="crate-dock__label">
          <i className="crate-dock__needle" />
          THE CRATE
        </span>
        <span className="crate-dock__count">{String(crateCount).padStart(2, '0')} IN STACK</span>
      </div>
      <div className="crate-dock__body">
        <button
          className="crate-stack"
          onClick={onDraw}
          disabled={!canDraw}
          title={canDraw ? 'Draw a special card. Your turn ends immediately.' : drawReason}
        >
          <span className="crate-stack__disc crate-stack__disc--3" />
          <span className="crate-stack__disc crate-stack__disc--2" />
          <span className="crate-stack__disc crate-stack__disc--1">
            <b>{crateCount}</b>
            <i>CARDS</i>
          </span>
          <span className="crate-stack__label">DRAW FROM THE CRATE</span>
          <em>ENDS TURN</em>
        </button>

        <div className="crate-hand">
          <span className="crate-hand__label">
            SPECIAL HAND · {hand.length}/6
          </span>
          <div className="crate-hand__cards">
            {hand.map((card) => {
              const def = crateCard(card.cardId)
              const rarity = RARITY_META[def.rarity]
              return (
                <button
                  key={card.uid}
                  className={`crate-mini ${selectedUid === card.uid ? 'is-selected' : ''}`}
                  style={{ '--rarity': rarity.color } as CSSProperties}
                  onClick={() => onSelect(card)}
                  title={`${def.name} — ${def.description}`}
                >
                  <span className="crate-mini__rarity">{def.rarity}</span>
                  <b>{def.name}</b>
                  <i>{CATEGORY_LABEL[def.category]}</i>
                  {card.cardId === 'rewind' && <em>DEFENSIVE</em>}
                </button>
              )
            })}
            {hand.length === 0 && <span className="crate-hand__empty">NO SPECIALS HELD</span>}
          </div>
        </div>

        <button className="backstage-pile" onClick={onBackstage} title="Defeated artists wait in Backstage">
          <b>{backstageCount}</b>
          <span>BACKSTAGE</span>
          <i>VIEW</i>
        </button>
      </div>
      {!canDraw && <span className="crate-dock__reason">{drawReason}</span>}
    </section>
  )
}

interface MoveDockProps {
  artist: Artist
  card: StageCard
  moves: Move[]
  hype: number
  enemyTargets: StageCard[]
  allyTargets: StageCard[]
  targetUid: string | null
  allyTargetUid: string | null
  onTarget: (uid: string) => void
  onAllyTarget: (uid: string) => void
  onMove: (move: Move) => void
  onClose: () => void
  encoreCharges: number
  canEncore: boolean
  onEncore: () => void
  onCut: () => void
}

export function MoveDock({
  artist,
  card,
  moves,
  hype,
  enemyTargets,
  allyTargets,
  targetUid,
  allyTargetUid,
  onTarget,
  onAllyTarget,
  onMove,
  onClose,
  encoreCharges,
  canEncore,
  onEncore,
  onCut,
}: MoveDockProps) {
  const element = ELEMENT_META[artist.battle.element]
  return (
    <section className="move-dock" aria-label={`${artist.name} moves`}>
      <header className="move-dock__head">
        <div className="move-dock__who">
          <span className="move-dock__avatar" style={{ '--base': artist.palette.base, '--accent': artist.palette.accent } as CSSProperties}>
            {artist.slot}
          </span>
          <div>
            <span className="kicker">
              {artist.name} · {card.actedThisTurn ? 'ACTION SPENT' : 'READY'}
            </span>
            <b>
              {card.hp}/{card.maxHp} HP · {hype} HYPE AVAILABLE
            </b>
          </div>
        </div>
        <span className="move-dock__element" style={{ color: element.color }}>
          {element.icon} {element.label}
        </span>
        <div className="move-dock__actions">
          <button className="move-dock__action" onClick={onEncore} disabled={!canEncore}>
            ENCORE <b>{encoreCharges}</b>
          </button>
          <button className="move-dock__action move-dock__action--cut" onClick={onCut}>
            CUT FROM SET
          </button>
        </div>
        <button className="icon-btn" onClick={onClose} aria-label="Close moves">
          ✕
        </button>
      </header>

      <div className="move-dock__moves">
        {moves.map((move, index) => {
          const moveElement = move.element ? ELEMENT_META[move.element] : null
          const disabled = card.actedThisTurn || hype < move.cost
          return (
            <button
              key={move.id}
              className={`move-card ${move.element ? `move-card--${move.element.toLowerCase()}` : ''}`}
              onClick={() => onMove(move)}
              disabled={disabled}
              title={disabled ? (card.actedThisTurn ? 'This artist already moved this turn' : 'Not enough Hype') : move.description}
            >
              <span className="move-card__slot">MOVE {index + 1}</span>
              <span className="move-card__type" style={moveElement ? { color: moveElement.color } : undefined}>
                {moveElement ? `${moveElement.icon} ${move.type.toUpperCase()}` : move.type.toUpperCase()}
              </span>
              <b>{move.name}</b>
              <p>{move.description}</p>
              <span className="move-card__cost">{move.cost} HYPE</span>
            </button>
          )
        })}
      </div>

      <div className="move-dock__targets">
        <span className="move-dock__target-label">ATTACK TARGET</span>
        <div className="target-chips">
          {enemyTargets.length === 0 ? (
            <span className="target-chip target-chip--crowd">CROWD · OPEN ROOM</span>
          ) : (
            enemyTargets.map((target) => {
              const targetArtist = getArtist(target.artistId)
              return (
                <button
                  key={target.uid}
                  className={`target-chip ${targetUid === target.uid ? 'is-on' : ''}`}
                  onClick={() => onTarget(target.uid)}
                >
                  {targetArtist.name} <i>{target.hp} HP</i>
                </button>
              )
            })
          )}
        </div>
        <span className="move-dock__target-label">ALLY TARGET</span>
        <div className="target-chips">
          {allyTargets.map((target) => {
            const targetArtist = getArtist(target.artistId)
            return (
              <button
                key={target.uid}
                className={`target-chip ${allyTargetUid === target.uid ? 'is-on' : ''}`}
                onClick={() => onAllyTarget(target.uid)}
              >
                {targetArtist.name} <i>{target.hp} HP</i>
              </button>
            )
          })}
        </div>
      </div>
    </section>
  )
}

