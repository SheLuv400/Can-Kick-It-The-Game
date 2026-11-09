import { useEffect, useMemo, useState, type CSSProperties } from 'react'
import type { ArtistProgress, Crew, Genre, ThemeId } from '../game/types'
import {
  ARTISTS,
  CORE_ARTIST_COUNT,
  CREW_META,
  GENRES,
  abilityText,
  effectLabel,
  getArtist,
} from '../game/roster'
import {
  battleStatsFor,
  ELEMENT_META,
  loadoutFor,
  MAX_CARD_LEVEL,
  moveById,
  moveTypeLabel,
  progressFor,
} from '../game/moves'
import { Card } from '../components/Card'
import { MoveLoadout } from '../components/MoveLoadout'
import { BadgeLoadout } from '../components/BadgeLoadout'
import { BADGE_CATALOG, BADGE_TIER_META, equippedBadgeRecords } from '../game/badges'
import { PortraitUploader } from '../components/PortraitUploader'
import { TrackPlayer } from '../components/TrackPlayer'
import { trackFor } from '../game/tracks'
import { applyArtFit, readArtFit, type ArtFit } from '../game/art-fit'
import type { FestivalProgress } from '../game/festivals'

interface CollectionProps {
  theme: ThemeId
  progress: Record<string, ArtistProgress>
  onLoadoutChange: (artistId: string, loadout: string[]) => void
  onBadgeLoadoutChange: (artistId: string, badgeLoadout: string[]) => void
  festivalProgress?: FestivalProgress | null
  onBack: () => void
  onDeck: () => void
}

export function Collection({ progress, onLoadoutChange, onBadgeLoadoutChange, festivalProgress, onBack, onDeck }: CollectionProps) {
  const [genre, setGenre] = useState<Genre | 'ALL'>('ALL')
  const [crew, setCrew] = useState<Crew | 'ALL'>('ALL')
  const [activeId, setActiveId] = useState<string | null>(null)
  const [encore, setEncore] = useState(false)
  const [trackOpen, setTrackOpen] = useState(false)
  const [loadoutOpen, setLoadoutOpen] = useState(false)
  const [badgeOpen, setBadgeOpen] = useState(false)
  const [artFit, setArtFit] = useState<ArtFit>(readArtFit)
  const [uploaderOpen, setUploaderOpen] = useState(false)

  const chooseFit = (fit: ArtFit) => {
    setArtFit(fit)
    applyArtFit(fit)
  }

  const filtered = useMemo(
    () =>
      ARTISTS.filter((artist) => {
        if (genre !== 'ALL' && artist.genre !== genre) return false
        if (crew !== 'ALL' && artist.crew !== crew) return false
        return true
      }),
    [genre, crew],
  )

  const artist = activeId ? getArtist(activeId) : null
  const track = artist ? trackFor(artist.id) : undefined
  const crewMates = artist ? ARTISTS.filter((item) => item.crew === artist.crew) : []
  const artistProgress = artist ? progressFor(progress, artist.id) : { xp: 0, level: 1 }
  const artistStats = artist ? battleStatsFor(artist, artistProgress.level) : null
  const artistMoves = artist
    ? loadoutFor(progress, artist.id)
        .map(moveById)
        .filter((move) => Boolean(move))
    : []
  const artistBadges = artist ? equippedBadgeRecords(progress, artist.id) : []
  const unlockedBadges = artist
    ? BADGE_CATALOG.filter(
        (badge) => (progress[artist.id]?.badges?.[badge.id]?.tier ?? 'locked') !== 'locked',
      ).length
    : 0

  useEffect(() => {
    setTrackOpen(false)
    setBadgeOpen(false)
  }, [activeId])

  useEffect(() => {
    if (!activeId) return
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setActiveId(null)
      if (event.key === 'ArrowRight' || event.key === 'ArrowLeft') {
        const currentIndex = ARTISTS.findIndex((item) => item.id === activeId)
        const delta = event.key === 'ArrowRight' ? 1 : -1
        const nextIndex = (currentIndex + delta + ARTISTS.length) % ARTISTS.length
        setActiveId(ARTISTS[nextIndex].id)
        setEncore(false)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [activeId])

  return (
    <main className="subscreen collection">
      <header className="subpage__top">
        <button className="link-btn" onClick={onBack}>
          ← THE SHOW
        </button>
        <span className="subpage__crumb">THE 26 + EXPANSIONS · COLLECTIBLE ARTIST SERIES</span>
        <div className="subpage__actions">
          {import.meta.env.DEV && (
            <button
              className="btn btn--ghost btn--sm"
              onClick={() => setUploaderOpen(true)}
              title="Development-only source portrait uploader"
            >
              UPLOAD PORTRAITS
            </button>
          )}
          <button className="btn btn--primary btn--sm" onClick={onDeck}>
            BUILD THE MIXTAPE
          </button>
        </div>
      </header>

      <section className="collection__hero">
        <div>
          <p className="kicker">
            <span className="kicker__rule" />
            CORE 26 + EXPANSIONS 01–03 · {ARTISTS.length} CARDS
          </p>
          <h1>
            THE <em>26</em>
          </h1>
          <p className="collection__lede">
            The original alphabet of headline acts, plus twenty-four new voices from the City Limits, R&B and Pop
            expansions. Hip-Hop, R&amp;B and Pop identities across five crews and three eras — every
            artist carries a base performance and an Encore transformation.
          </p>
        </div>
        <div className="collection__stats">
          <div>
            <b>{ARTISTS.length}</b>
            <span>ARTISTS</span>
          </div>
          <div>
            <b>05</b>
            <span>CREWS</span>
          </div>
          <div>
            <b>03</b>
            <span>ERAS</span>
          </div>
          <div>
            <b>{ARTISTS.length}</b>
            <span>ENCORES</span>
          </div>
        </div>
      </section>

      <div className="collection__filters">
        <div className="filter-row">
          <span className="filter-label">GENRE</span>
          <button className={`chip ${genre === 'ALL' ? 'is-on' : ''}`} onClick={() => setGenre('ALL')}>
            ALL
          </button>
          {GENRES.map((item) => (
            <button key={item} className={`chip ${genre === item ? 'is-on' : ''}`} onClick={() => setGenre(item)}>
              {item}
            </button>
          ))}
        </div>
        <div className="filter-row">
          <span className="filter-label">CREW</span>
          <button className={`chip ${crew === 'ALL' ? 'is-on' : ''}`} onClick={() => setCrew('ALL')}>
            ALL
          </button>
          {(Object.keys(CREW_META) as Crew[]).map((item) => (
            <button key={item} className={`chip ${crew === item ? 'is-on' : ''}`} onClick={() => setCrew(item)}>
              {CREW_META[item].short}
            </button>
          ))}
        </div>
        <span className="collection__count">
          {String(filtered.length).padStart(2, '0')} / {ARTISTS.length} SHOWN
        </span>
        <span className="collection__art-fit">
          <span className="filter-label">ART FIT</span>
          <button className={`chip ${artFit === 'full' ? 'is-on' : ''}`} onClick={() => chooseFit('full')}>
            FULL
          </button>
          <button className={`chip ${artFit === 'fill' ? 'is-on' : ''}`} onClick={() => chooseFit('fill')}>
            FILL
          </button>
        </span>
        <span className="collection__art-hint">
          <b>LOCKED</b> {ARTISTS.length} OFFICIAL PORTRAITS · SERIES ONE + EXP
        </span>
      </div>

      <section className="collection__grid">
        {filtered.map((item) => {
          const festivalFrame = festivalProgress?.claimedRewards.includes('gold')
            ? 'is-festival-gold'
            : festivalProgress?.claimedRewards.includes('platinum')
              ? 'is-festival-platinum'
              : ''
          return (
            <div className={`collection__card ${festivalFrame}`} key={item.id}>
              <Card
                artist={item}
                size="grid"
                showQuote
                onClick={() => {
                  setActiveId(item.id)
                  setEncore(false)
                }}
              />
            </div>
          )
        })}
      </section>

      {festivalProgress && festivalProgress.claimedRewards.length > 0 && (
        <section className="collection-festival-locker" aria-label="The Festival & Tour Circuit rewards">
          <div>
            <span className="kicker">THE FESTIVAL &amp; TOUR CIRCUIT · REWARD LOCKER</span>
            <h2>EARNED ON THE ROAD.</h2>
            <p>
              These rewards persist on this device after the event window closes. The Diamond
              alternate art keeps the original Casso Royale stats.
            </p>
            <div className="collection-festival-locker__badges">
              {festivalProgress.claimedRewards.map((tier) => (
                <span key={tier} className={`festival-locker-badge is-${tier}`}>
                  <b>{tier.toUpperCase()}</b>
                  {tier === 'diamond' ? 'ANIMATED DIAMOND MIC · FESTIVAL HEADLINER' : tier === 'platinum' ? 'PLATINUM SLEEVES · FESTIVAL BANNER' : 'GOLDEN MICROPHONE BORDER'}
                </span>
              ))}
            </div>
          </div>
          {festivalProgress.claimedRewards.includes('diamond') && (
            <div className="collection-festival-locker__alt">
              <Card artist={getArtist('casso-royale')} size="grid" showQuote />
              <span>ALTERNATE ART · SAME GAMEPLAY STATS</span>
            </div>
          )}
        </section>
      )}

      {artist && (
        <div className="modal showcase" role="dialog" aria-modal="true" aria-label={`${artist.name} card`}>
          <button className="modal__scrim" onClick={() => setActiveId(null)} aria-label="Close card" />
          <div className="showcase__panel">
            <button className="showcase__close icon-btn" onClick={() => setActiveId(null)} aria-label="Close">
              ✕
            </button>
            <div className="showcase__left">
              <div className="showcase__card">
                <Card artist={artist} era={1} encore={encore} size="hero" showQuote />
              </div>
              <div className="showcase__toggle">
                <button className={!encore ? 'is-on' : ''} onClick={() => setEncore(false)}>
                  BASE FORM
                </button>
                <button className={encore ? 'is-on' : ''} onClick={() => setEncore(true)}>
                  ENCORE FORM
                </button>
              </div>
              <div className="showcase__arrows">
                <button
                  className="icon-btn"
                  onClick={() => {
                    const index = ARTISTS.findIndex((item) => item.id === artist.id)
                    setActiveId(ARTISTS[(index - 1 + ARTISTS.length) % ARTISTS.length].id)
                    setEncore(false)
                  }}
                  aria-label="Previous card"
                >
                  ←
                </button>
                <span>
                  {String(artist.number).padStart(2, '0')} / {ARTISTS.length}
                </span>
                <button
                  className="icon-btn"
                  onClick={() => {
                    const index = ARTISTS.findIndex((item) => item.id === artist.id)
                    setActiveId(ARTISTS[(index + 1) % ARTISTS.length].id)
                    setEncore(false)
                  }}
                  aria-label="Next card"
                >
                  →
                </button>
              </div>
            </div>

            <div className="showcase__info">
              <p className="kicker">
                {artist.number > CORE_ARTIST_COUNT
                  ? `${artist.genre === 'POP' ? 'POP EXPANSION' : artist.genre === 'R&B' ? 'R&B EXPANSION' : 'CITY LIMITS EXPANSION'} · `
                  : ''}
                SLOT {artist.slot} · No. {String(artist.number).padStart(2, '0')} / {ARTISTS.length} ·{' '}
                {artist.debut}
              </p>
              <h2>{artist.name}</h2>
              <p className="showcase__quote">“{artist.quote}”</p>
              <div className="showcase__pills">
                <span data-genre={artist.genre}>{artist.genre}</span>
                {track && <span className="is-track">♪ {track.title.toUpperCase()}</span>}
                <span>{artist.crew}</span>
                <span>{artist.eraLabel}</span>
                <span>{artist.city}</span>
                {artist.heritage && <span>{artist.heritage}</span>}
                {artist.debutAlbum && <span>DEBUT · {artist.debutAlbum}</span>}
              </div>

              <div className="showcase__grid">
                <div className="showcase__stat">
                  <span>BASE BARS</span>
                  <b>{artist.bars}</b>
                  <i>{encore ? 'ENCORE ACTIVE' : 'ERA I'}</i>
                </div>
                <div className="showcase__stat">
                  <span>ENCORE BARS</span>
                  <b>{artist.encore.bars}</b>
                  <i>+{artist.encore.bars - artist.bars} OVER BASE</i>
                </div>
                <div className="showcase__stat">
                  <span>HYPE COST</span>
                  <b>{artist.cost}</b>
                  <i>TO PERFORM</i>
                </div>
                <div className="showcase__stat">
                  <span>ERA SCALING</span>
                  <b>+2</b>
                  <i>AT HEADLINE</i>
                </div>
              </div>

              {artistStats && artist.battle && (
                <div className="showcase__combat">
                  <div className="showcase__combat-head">
                    <span className="kicker">BATTLE PROFILE · LEVEL {artistProgress.level} / {MAX_CARD_LEVEL}</span>
                    <span
                      className="showcase__element"
                      style={{ color: ELEMENT_META[artist.battle.element].color }}
                    >
                      {ELEMENT_META[artist.battle.element].icon}{' '}
                      {ELEMENT_META[artist.battle.element].label}
                    </span>
                  </div>
                  <div className="showcase__combat-stats">
                    <div>
                      <span>MAX HP</span>
                      <b>{artistStats.hp}</b>
                    </div>
                    <div>
                      <span>ATTACK</span>
                      <b>{artistStats.attack}</b>
                    </div>
                    <div>
                      <span>DEFENSE</span>
                      <b>{artistStats.defense}</b>
                    </div>
                    <div>
                      <span>PASSIVE</span>
                      <b>{artist.battle.passive.name}</b>
                      <i>{artist.battle.passive.description}</i>
                    </div>
                  </div>
                  <div className="showcase__moves-head">
                    <span className="kicker">EQUIPPED MOVES · {artistMoves.length}/3</span>
                    <button className="btn btn--ghost btn--sm" onClick={() => setLoadoutOpen(true)}>
                      EDIT LOADOUT · 15-MOVE POOL
                    </button>
                  </div>
                  <div className="showcase__moves">
                    {artistMoves.map((move, index) => {
                      if (!move) return null
                      const element = move.element ? ELEMENT_META[move.element] : null
                      return (
                        <div className="showcase__move" key={move.id}>
                          <span className="showcase__move-slot">MOVE {index + 1}</span>
                          <b>{move.name}</b>
                          <i style={element ? { color: element.color } : undefined}>
                            {element ? `${element.icon} ` : ''}
                            {moveTypeLabel(move.type)} · {move.cost} HYPE
                          </i>
                          <p>{move.description}</p>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}

              <div className="showcase__badges">
                <div className="showcase__badges-head">
                  <span className="kicker">BADGE PROGRAM · {artistBadges.length}/5 EQUIPPED</span>
                  <button className="btn btn--ghost btn--sm" onClick={() => setBadgeOpen(true)}>
                    EQUIP BADGES · {unlockedBadges}/10
                  </button>
                </div>
                <div className="showcase__badge-row">
                  {artistBadges.length > 0 ? (
                    artistBadges.map(({ id, record }) => {
                      const badge = BADGE_CATALOG.find((entry) => entry.id === id)
                      if (!badge) return null
                      return (
                        <span
                          className="showcase__badge-chip"
                          key={id}
                          style={
                            {
                              '--badge-accent': badge.accent,
                              '--tier-color': BADGE_TIER_META[record.tier].color,
                            } as CSSProperties
                          }
                        >
                          <i>{badge.icon}</i>
                          <b>{badge.name}</b>
                          <em>{BADGE_TIER_META[record.tier].label}</em>
                        </span>
                      )
                    })
                  ) : (
                    <p className="showcase__badge-empty">
                      NO BADGES EQUIPPED · OPEN EQUIP BADGES AND BUILD A FIVE.
                    </p>
                  )}
                </div>
                <p className="showcase__badge-note">
                  Tap a badge in Equip Badges to add it to your five. Each tier is ground separately
                  with matching actions.
                </p>
              </div>

              <div className="showcase__ability">
                <span className="kicker">{encore ? 'ENCORE ABILITY' : 'ABILITY'}</span>
                <p>
                  {encore
                    ? artist.encore.effects.map((effect) => effectLabel(effect, artist)).join(' · ')
                    : abilityText(artist)}
                </p>
                {encore && <em>“{artist.encore.line}”</em>}
              </div>

              <div className="showcase__crew">
                <div className="showcase__crew-head">
                  <span className="kicker">CREW CHEMISTRY · {artist.crew}</span>
                  <i>{CREW_META[artist.crew].motto}</i>
                </div>
                <div className="showcase__crew-list">
                  {crewMates.map((mate) => (
                    <button
                      key={mate.id}
                      className={`crew-pill ${mate.id === artist.id ? 'is-current' : ''}`}
                      onClick={() => {
                        setActiveId(mate.id)
                        setEncore(false)
                      }}
                    >
                      <span style={{ color: mate.palette.accent }}>{mate.slot}</span>
                      {mate.name}
                    </button>
                  ))}
                </div>
                <p className="showcase__crew-note">
                  Two or more of these artists on stage unlocks a Feature Verse — once per round.
                </p>
              </div>

              <div className="showcase__actions">
                <button className="btn btn--primary" onClick={onDeck}>
                  BUILD AROUND THIS
                </button>
                {track?.embedUrl && (
                  <button className="btn btn--ghost btn--sm" onClick={() => setTrackOpen(true)}>
                    ▶ PLAY “{track.title.toUpperCase()}”
                  </button>
                )}
                <button className="btn btn--ghost btn--sm" onClick={() => setActiveId(null)}>
                  CLOSE
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {artist && track?.embedUrl && trackOpen && (
        <TrackPlayer
          title={track.title}
          artist={artist.name}
          mood={track.mood}
          embedUrl={track.embedUrl}
          onClose={() => setTrackOpen(false)}
        />
      )}

      {import.meta.env.DEV && uploaderOpen && (
        <PortraitUploader onClose={() => setUploaderOpen(false)} />
      )}

      {artist && loadoutOpen && (
        <MoveLoadout
          artist={artist}
          level={artistProgress.level}
          xp={artistProgress.xp}
          loadout={artistMoves.map((move) => move?.id ?? '')}
          onChange={(loadout) => onLoadoutChange(artist.id, loadout)}
          onClose={() => setLoadoutOpen(false)}
        />
      )}

      {artist && badgeOpen && (
        <BadgeLoadout
          artist={artist}
          progress={artistProgress}
          onChange={(badgeLoadout) => onBadgeLoadoutChange(artist.id, badgeLoadout)}
          onClose={() => setBadgeOpen(false)}
        />
      )}

    </main>
  )
}
