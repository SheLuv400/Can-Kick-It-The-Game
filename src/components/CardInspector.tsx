import { useEffect, type CSSProperties } from 'react'
import type { Artist, Move } from '../game/types'
import type { StageCard } from '../game/battle'
import {
  ELEMENT_META,
  SPECIAL_CHARGE_MAX,
  battleStatsFor,
  moveById,
  specialMoveForArtist,
} from '../game/moves'
import { abilityText } from '../game/roster'
import { Card } from './Card'

interface CardInspectorProps {
  artist: Artist
  card: StageCard | null
  onClose: () => void
}

function moveList(card: StageCard | null): Move[] {
  if (!card) return []
  return card.moves
    .map((moveId) => moveById(moveId))
    .filter((move): move is Move => Boolean(move))
}

export function CardInspector({ artist, card, onClose }: CardInspectorProps) {
  const stats = battleStatsFor(artist, card?.level ?? 1)
  const moves = moveList(card)
  const special = specialMoveForArtist(artist.id)
  const element = ELEMENT_META[artist.battle.element]

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  return (
    <div
      className="card-inspector"
      role="dialog"
      aria-modal="true"
      aria-label={`${artist.name} card details`}
    >
      <button
        className="card-inspector__scrim"
        onClick={onClose}
        aria-label="Close card details"
        data-gamepad-back
      />
      <div className="card-inspector__panel">
        <header className="card-inspector__head">
          <div>
            <span className="kicker">
              CARD INSPECTION · {card ? 'LIVE ON STAGE' : 'YOUR HAND'}
            </span>
            <h2>{artist.name}</h2>
            <p>
              {artist.crew} · {artist.genre} · {artist.eraLabel}
            </p>
          </div>
          <button
            className="icon-btn"
            onClick={onClose}
            aria-label="Close card details"
            data-gamepad-back
            data-gamepad-primary
          >
            ✕
          </button>
        </header>

        <div className="card-inspector__body">
          <div className="card-inspector__art">
            <Card
              artist={artist}
              era={1}
              encore={card?.encore}
              size="hero"
              tilt={false}
              showQuote
            />
          </div>

          <div className="card-inspector__detail">
            <div className="card-inspector__stats">
              <span>
                <b>{card ? card.hp : stats.hp}</b>
                <em>HP{card ? ` / ${card.maxHp}` : ''}</em>
              </span>
              <span>
                <b>{stats.attack}</b>
                <em>ATTACK</em>
              </span>
              <span>
                <b>{stats.defense + (card?.defenseBonus ?? 0)}</b>
                <em>DEFENSE</em>
              </span>
              <span style={{ '--element': element.color } as CSSProperties}>
                <b>{element.icon}</b>
                <em>{element.label}</em>
              </span>
            </div>

            <section className="card-inspector__section">
              <h3>PASSIVE</h3>
              <b>{artist.battle.passive.name}</b>
              <p>{artist.battle.passive.description}</p>
            </section>

            <section className="card-inspector__section">
              <h3>ABILITY</h3>
              <p>{abilityText(artist)}</p>
            </section>

            {card && (
              <section className="card-inspector__section">
                <h3>SIGNATURE SPECIAL</h3>
                {special ? (
                  <>
                    <b>{special.name}</b>
                    <p>{special.description}</p>
                    <span className="card-inspector__charge">
                      CHARGE {card.specialUsed ? 'USED' : `${card.specialCharge}/${SPECIAL_CHARGE_MAX}`}
                    </span>
                  </>
                ) : (
                  <p>No signature move is assigned to this card.</p>
                )}
              </section>
            )}

            <section className="card-inspector__section">
              <h3>{card ? 'EQUIPPED MOVES' : 'ON-STAGE MOVESET'}</h3>
              {card ? (
                moves.length > 0 ? (
                  <div className="card-inspector__moves">
                    {moves.map((move) => (
                      <div key={move.id}>
                        <b>{move.name}</b>
                        <span>
                          {move.element ? `${ELEMENT_META[move.element].label} · ` : ''}
                          {move.type.toUpperCase()} · {move.power} POWER
                        </span>
                        <p>{move.description}</p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p>No moves are equipped.</p>
                )
              ) : (
                <p>
                  This Artist opens their three equipped moves after they hit
                  the stage. Play them from your hand to inspect the live version.
                </p>
              )}
            </section>

            {card && card.statuses.length > 0 && (
              <section className="card-inspector__section">
                <h3>STATUS</h3>
                <div className="card-inspector__statuses">
                  {card.statuses.map((status) => (
                    <span key={status.kind} className={`status status--${status.kind}`}>
                      {status.kind.toUpperCase()} {status.turns}
                    </span>
                  ))}
                </div>
              </section>
            )}

            <p className="card-inspector__note">
              READ-ONLY INSPECTION · THIS DOES NOT SPEND AN ACTION OR CHANGE COMBAT.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
