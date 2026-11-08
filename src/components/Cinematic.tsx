import { useEffect } from 'react'
import type { Cinematic } from '../game/battle'
import { getArtist } from '../game/roster'
import { Card } from './Card'

interface CinematicProps {
  cinematic: Cinematic
  era: 1 | 2 | 3
  onSkip: () => void
  autoMs?: number
}

const KIND_LABEL: Record<Cinematic['kind'], string> = {
  era: 'ERA EVOLUTION',
  encore: 'ENCORE TRANSFORMATION',
  feature: 'FEATURE VERSE',
  'rival-feature': 'HEADLINER FEATURE',
  'rival-encore': 'HEADLINER ENCORE',
  victory: 'SOLD OUT',
  defeat: 'CROWD WALKED',
  curfew: 'CURFEW',
}

export function CinematicOverlay({ cinematic, era, onSkip, autoMs = 3600 }: CinematicProps) {
  useEffect(() => {
    const timer = window.setTimeout(onSkip, autoMs)
    return () => window.clearTimeout(timer)
  }, [cinematic.id, onSkip, autoMs])

  const artists = (cinematic.artistIds ?? []).slice(0, 3).map(getArtist)
  const isEra = cinematic.kind === 'era'

  return (
    <div className={`cine cine--${cinematic.kind} ${isEra ? 'cine--wide' : ''}`} key={cinematic.id}>
      <div className="cine__bg" aria-hidden="true" />
      <div className="cine__grain" aria-hidden="true" />
      <div className="cine__bar cine__bar--top" aria-hidden="true" />
      <div className="cine__bar cine__bar--bottom" aria-hidden="true" />
      <button className="cine__skip" onClick={onSkip} aria-label="Skip cinematic" data-gamepad-back>
        SKIP <span>▸</span>
      </button>

      <div className="cine__content">
        <p className="cine__kicker">
          <span /> {KIND_LABEL[cinematic.kind]}
        </p>

        {isEra ? (
          <div className="cine__era">
            <div className="cine__era-numeral">{['I', 'II', 'III'][(cinematic.value ?? 2) - 1]}</div>
            <div className="cine__era-orbit" aria-hidden="true">
              <span />
              <span />
              <span />
            </div>
            <h2>{cinematic.title}</h2>
            <p>{cinematic.subtitle}</p>
          </div>
        ) : (
          <h2 className="cine__title">{cinematic.title}</h2>
        )}

        {!isEra && <p className="cine__sub">{cinematic.subtitle}</p>}

        {artists.length > 0 && (
          <div className={`cine__cards cine__cards--${artists.length}`}>
            {artists.map((artist, index) => (
              <div className={`cine__card cine__card--${index}`} key={`${artist.id}-${index}`}>
                <Card
                  artist={artist}
                  era={era}
                  encore={cinematic.kind === 'encore' || cinematic.kind === 'rival-encore'}
                  size="hero"
                  tilt={false}
                />
              </div>
            ))}
          </div>
        )}

        {cinematic.value !== undefined && !isEra && (
          <div className="cine__value">
            <span className="cine__plus">+</span>
            <strong>{cinematic.value}</strong>
            <em>BARS</em>
          </div>
        )}

        {cinematic.detail && <p className="cine__detail">{cinematic.detail}</p>}
      </div>
    </div>
  )
}
