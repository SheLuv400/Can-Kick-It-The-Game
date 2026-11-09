import { useRef, type CSSProperties, type PointerEvent as ReactPointerEvent, type ReactNode } from 'react'
import type { Artist } from '../game/types'
import { careerReputationForOvr } from '../game/career-data'
import { CORE_ARTIST_COUNT, CREW_META, abilityText, effectLabel } from '../game/roster'
import { Portrait } from './Portrait'
import { useGraphics } from '../graphics/GraphicsContext'

type CardSize = 'hand' | 'stage' | 'grid' | 'hero'

interface CardProps {
  artist: Artist
  era?: 1 | 2 | 3
  encore?: boolean
  size?: CardSize
  onClick?: () => void
  disabled?: boolean
  selected?: boolean
  className?: string
  footer?: ReactNode
  showQuote?: boolean
  tilt?: boolean
  crewCount?: number
}

export function Card({
  artist,
  era = 1,
  encore = false,
  size = 'grid',
  onClick,
  disabled = false,
  selected = false,
  className = '',
  footer,
  showQuote = false,
  tilt = true,
  crewCount,
}: CardProps) {
  const ref = useRef<HTMLDivElement>(null)
  const graphics = useGraphics()
  const canTilt = tilt && graphics.cardTilt
  const form = encore ? artist.encore : null
  const name = form ? form.name : artist.name
  const bars = (form ? form.bars : artist.bars) + (era - 1)
  const personalTier = artist.personal ? careerReputationForOvr(artist.personal.ovr) : null
  const ability = form
    ? form.effects.map((effect) => effectLabel(effect, artist)).join(' · ')
    : abilityText(artist)

  const style = {
    '--deep': artist.palette.deep,
    '--base': artist.palette.base,
    '--accent': artist.palette.accent,
    '--crew-tint': CREW_META[artist.crew].tint,
    '--tier-accent': personalTier?.accent ?? artist.palette.accent,
  } as CSSProperties

  const handleMove = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (!canTilt || !ref.current || disabled) return
    const rect = ref.current.getBoundingClientRect()
    const x = (event.clientX - rect.left) / rect.width
    const y = (event.clientY - rect.top) / rect.height
    ref.current.style.setProperty('--ry', `${(x - 0.5) * 13}deg`)
    ref.current.style.setProperty('--rx', `${(y - 0.5) * -13}deg`)
    ref.current.style.setProperty('--mx', `${x * 100}%`)
    ref.current.style.setProperty('--my', `${y * 100}%`)
  }

  const handleLeave = () => {
    if (!ref.current) return
    ref.current.style.setProperty('--ry', '0deg')
    ref.current.style.setProperty('--rx', '0deg')
    ref.current.style.setProperty('--mx', '50%')
    ref.current.style.setProperty('--my', '40%')
  }

  const interactive = Boolean(onClick) && !disabled

  return (
    <div
      className={`card-shell card-shell--${size} ${selected ? 'is-selected' : ''} ${
        disabled ? 'is-disabled' : ''
      } ${className}`}
      style={style}
    >
      <div
        ref={ref}
        className={`card card--${size} ${encore ? 'is-encore' : ''} ${interactive ? 'is-interactive' : ''} ${personalTier ? `is-personal is-career-${personalTier.id}` : ''}`}
        data-genre={artist.genre}
        data-crew={artist.crew}
        data-career-tier={personalTier?.id}
        style={style}
        onPointerMove={handleMove}
        onPointerLeave={handleLeave}
        onClick={interactive ? onClick : undefined}
        onKeyDown={
          interactive
            ? (event) => {
                if (event.key === 'Enter' || event.key === ' ') {
                  event.preventDefault()
                  onClick?.()
                }
              }
            : undefined
        }
        role={interactive ? 'button' : undefined}
        tabIndex={interactive ? 0 : undefined}
        aria-label={`${name}, ${artist.crew} crew, ${artist.genre}, ${bars} bars, cost ${artist.cost} hype`}
      >
        <div className="card__foil" aria-hidden="true" />
        <div className="card__frame">
          <div className="card__head">
            <span className="card__slot">{artist.personal ? 'MY' : artist.slot}</span>
            <span className="card__serial">{artist.personal ? `P${artist.personal.prestige ?? 0} · LVL ${artist.personal.cardLevel} · OVR ${artist.personal.ovr}` : `№${String(artist.number).padStart(2, '0')}`}</span>
            <span className="card__cost" title={`Costs ${artist.cost} Hype`}>
              <b>{artist.cost}</b>
              <i>HYPE</i>
            </span>
          </div>

          <div className="card__art">
            <span className="card__ghost" aria-hidden="true">
              {artist.slot}
            </span>
            <div className="card__art-glow" />
            <Portrait artist={artist} />
            <div className="card__holo" aria-hidden="true" />
            <div className="card__sheen" aria-hidden="true" />
            <div className="card__scan" aria-hidden="true" />
            <span className="card__chip card__chip--era">
              {artist.eraLabel} · {artist.debut}
            </span>
            <span className="card__chip card__chip--genre">{artist.genre}</span>
            {artist.personal && <span className="card__chip card__chip--personal">MY ARTIST · {personalTier?.short ?? 'LOCAL'}</span>}
            {encore && <span className="card__stamp">ENCORE</span>}
            {era > 1 && <span className="card__evo">EVO +{era - 1}</span>}
            {!encore && size !== 'hand' && (
              <span className="card__crew-tag">{artist.crew}</span>
            )}
            {(size === 'hand' || size === 'stage') && (
              <span
                className="card__crew-ribbon"
                title={`${artist.crew} crew${crewCount ? ` · ${crewCount} live on this stage` : ''}`}
              >
                <span className="card__crew-ribbon__name">
                  {artist.crew}
                  {size === 'stage' && crewCount && crewCount > 1 ? <em>×{crewCount}</em> : null}
                </span>
                <span className="card__crew-ribbon__meta" aria-hidden="true">
                  {artist.eraLabel} · {artist.debut}
                </span>
              </span>
            )}
          </div>

          <div className="card__body">
            <span className="card__watermark" aria-hidden="true">
              {CREW_META[artist.crew].short}
            </span>
            <div className="card__eyebrow">
              <span>{artist.city}</span>
              <span>{artist.crew}</span>
            </div>
            <h3 className="card__name">{name}</h3>
            {encore && form && <p className="card__line">“{form.line}”</p>}
            <div className="card__stats">
              <div className="card__bars" title={`${bars} BARS${era > 1 ? ` (incl. +${era - 1} era)` : ''}`}>
                <span>{bars}</span>
                <em>BARS</em>
              </div>
              <p className="card__ability">{ability}</p>
            </div>
            {showQuote && <p className="card__quote">“{artist.quote}”</p>}
            <div className="card__foot">
              <span>TRACK {String(artist.number).padStart(2, '0')}</span>
              <span className="card__barcode" aria-hidden="true" />
              <span>{artist.personal ? 'CIKI · MY ARTIST' : artist.number > CORE_ARTIST_COUNT ? 'CIKI · EXP' : 'CIKI · 26'}</span>
            </div>
          </div>
        </div>
        {footer && <div className="card-shell__footer">{footer}</div>}
      </div>
    </div>
  )
}
