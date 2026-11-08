import type { CSSProperties } from 'react'
import { BADGE_BY_ID, BADGE_CATALOG } from '../game/badges'
import { careerArtist, careerBadgeCount, careerSummaryLine, careerXpSummary, type CareerState } from '../game/career'
import { ELEMENT_META } from '../game/moves'
import { CareerPresetArt } from './CareerPresetArt'

export function CareerCardPanel({ career }: { career: CareerState }) {
  const artist = careerArtist(career)
  const summary = careerXpSummary(career)
  const element = ELEMENT_META[artist.battle.element]
  const secondaryElement = career.secondaryElement ? ELEMENT_META[career.secondaryElement] : null

  return (
    <article
      className={`career-card career-card--${summary.reputation.id}`}
      data-reputation={summary.reputation.id}
      style={{
        '--career-accent': artist.palette.accent,
        '--tier-accent': summary.reputation.accent,
        '--rank-color': summary.color,
      } as CSSProperties}
    >
      <div className="career-card__art">
        <div className={`career-card__portrait ${career.encoreUnlocked ? 'is-encore' : ''}`}>
          <CareerPresetArt presetId={career.presetId} mode="card" />
          <span className="career-card__stamp">{career.genre}</span>
          <span className="career-card__ovr">{summary.ovr}<i>OVR</i></span>
        </div>
      </div>
      <div className="career-card__copy">
        <span className="career-card__label">CIKI · PERSONAL ARTIST CARD · {summary.reputation.title}</span>
        <h2>{career.stageName}</h2>
        <p>{careerSummaryLine(career)}</p>
        <span className={`career-card__legacy ${summary.title.animated ? 'is-animated' : ''}`}>{summary.title.label} · PRESTIGE {summary.prestige}</span>
        <div className="career-card__meta">
          <span>{summary.master ? 'MASTER LEVEL' : 'LEVEL'} <b>{summary.level}</b></span>
          <span>OVR <b>{summary.ovr}</b></span>
          <span>AP <b>{summary.apAvailable}</b></span>
          <span>BADGES <b>{careerBadgeCount(career)}/{BADGE_CATALOG.length}</b></span>
        </div>
        <div className="career-card__tags">
          <span className="career-card__element" style={{ '--element-color': element.color } as CSSProperties}>
            {element.icon} {element.label}
          </span>
          {secondaryElement && (
            <span className="career-card__element" style={{ '--element-color': secondaryElement.color } as CSSProperties}>
              {secondaryElement.icon} {secondaryElement.label}
            </span>
          )}
          {career.equippedBadges.length ? career.equippedBadges.map((badgeId) => {
            const badge = BADGE_BY_ID.get(badgeId)
            return badge ? <span key={badgeId}>{badge.name}</span> : null
          }) : <span>NO BADGES EQUIPPED</span>}
        </div>
      </div>
    </article>
  )
}
