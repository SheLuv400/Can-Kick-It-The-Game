import {
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
} from 'react'
import type { Artist, Difficulty, Settings } from '../game/types'
import type { CircuitId } from '../game/circuits'
import type { AccountPublic } from '../account/account'
import { getArtist } from '../game/roster'
import { DIFFICULTIES, THEME_META } from '../game/themes'
import { buzzState } from '../game/ultimate'
import { chartLeader, type ChartState } from '../game/charts'
import { BrandLogo } from '../components/BrandLogo'
import { GameIcon, type GameIconName } from '../components/GameIcon'
import { Portrait } from '../components/Portrait'
import { audioEngine, useAudioSnapshot } from '../game/audio'
import { getDesktopWindow } from '../desktop/window'

const FEATURED_IDS = ['cipher-jones', 'amara-afterglow', 'ziggy-stereo', 'nikki-noize']
const PROFILE_ID = 'casso-royale'
const DUST = Array.from({ length: 20 }, (_, index) => ({
  left: `${6 + ((index * 37) % 88)}%`,
  top: `${8 + ((index * 53) % 76)}%`,
  delay: `${(index % 9) * -1.7}s`,
  duration: `${7 + (index % 6) * 2.2}s`,
  size: `${1 + (index % 3)}px`,
}))
const CROWD = Array.from({ length: 44 }, (_, index) => ({
  left: `${-1 + index * 2.38}%`,
  height: `${42 + ((index * 19) % 54)}px`,
  delay: `${(index % 7) * -0.8}s`,
  arms: index % 4 === 0,
}))

interface EventSlide {
  key: string
  kicker: string
  title: string
  note: string
  cta: string
  icon: GameIconName
  artist: Artist
  onClick: () => void
}

interface MainMenuProps {
  settings: Settings
  charts: ChartState
  onStart: () => void
  onDeck: () => void
  onCollection: () => void
  onDesign: () => void
  onRules: () => void
  onTeam: () => void
  onCharts: () => void
  onCircuit: (circuit: CircuitId) => void
  onFestival: () => void
  onDifficulty: (difficulty: Difficulty) => void
  onToggleMotion: () => void
  onTutorial: () => void
  onSettings: () => void
  onUpdates: () => void
  updatesUnread: boolean
  onOnline: () => void
  onCareer: () => void
  careerName?: string | null
  onLeaderboard: () => void
  account: AccountPublic | null
  onAccount: () => void
}

export function MainMenu({
  settings,
  charts,
  onStart,
  onDeck,
  onCollection,
  onDesign,
  onRules,
  onTeam,
  onCharts,
  onCircuit,
  onFestival,
  onDifficulty,
  onToggleMotion,
  onTutorial,
  onSettings,
  onUpdates,
  updatesUnread,
  onOnline,
  onCareer,
  careerName,
  onLeaderboard,
  account,
  onAccount,
}: MainMenuProps) {
  const theme = settings.theme
  const meta = THEME_META[theme]
  const team = settings.team
  const rank = buzzState(team.buzz)
  const featured = FEATURED_IDS.map(getArtist)
  const leader = chartLeader(charts)
  const accountArtist = account?.avatarArtistId ? getArtist(account.avatarArtistId) : null
  const profileArtist = accountArtist ?? getArtist(PROFILE_ID)

  const menuRef = useRef<HTMLElement | null>(null)
  const sound = useAudioSnapshot()
  const desktop = getDesktopWindow()
  const [eventIndex, setEventIndex] = useState(0)
  const [quitting, setQuitting] = useState(false)
  const [exitError, setExitError] = useState('')

  const eventSlides: EventSlide[] = [
    {
      key: 'circuit',
      kicker: 'FEATURED EVENT',
      title: 'THE HEADLINER\nCIRCUIT',
      note: 'NEW CIRCUIT · EXCLUSIVE REWARDS',
      cta: 'VIEW EVENT',
      icon: 'circuit',
      artist: getArtist('casso-royale'),
      onClick: () => onCircuit('headliner'),
    },
    {
      key: 'charts',
      kicker: 'WEEKLY CHART',
      title: 'THE CIKI 26',
      note: leader ? `#1 ${getArtist(leader.id).name} · THIS WEEK` : 'THE ROOM IS COUNTING',
      cta: 'SEE THE CHART',
      icon: 'charts',
      artist: getArtist('amara-afterglow'),
      onClick: onCharts,
    },
    {
      key: 'design',
      kicker: 'ART DIRECTION',
      title: 'THE DESIGN\nROOM',
      note: `STAGE ${meta.index} · ${meta.name}`,
      cta: 'OPEN THE ROOM',
      icon: 'design',
      artist: getArtist('ziggy-stereo'),
      onClick: onDesign,
    },
  ]
  const activeEvent = eventSlides[eventIndex]

  const cycleEvent = (step: number) => {
    setEventIndex((index) => (index + step + eventSlides.length) % eventSlides.length)
  }

  const toggleSound = () => {
    void audioEngine.toggleMusic()
  }

  const quitGame = async () => {
    if (!desktop || quitting) return
    setExitError('')
    setQuitting(true)
    try {
      await desktop.quit()
    } catch {
      setExitError('COULD NOT CLOSE THE GAME. USE ALT+F4.')
    } finally {
      setQuitting(false)
    }
  }

  const handlePointerMove = (event: ReactPointerEvent<HTMLElement>) => {
    if (settings.reducedMotion) return
    const element = menuRef.current
    if (!element) return
    const rect = element.getBoundingClientRect()
    const x = Math.min(1, Math.max(0, (event.clientX - rect.left) / rect.width))
    const y = Math.min(1, Math.max(0, (event.clientY - rect.top) / rect.height))
    element.style.setProperty('--pointer-x', `${x * 100}%`)
    element.style.setProperty('--pointer-y', `${y * 100}%`)
  }

  const resetPointer = () => {
    const element = menuRef.current
    if (!element) return
    element.style.setProperty('--pointer-x', '54%')
    element.style.setProperty('--pointer-y', '26%')
  }

  const radioStatus =
    sound.status === 'playing'
      ? 'ON AIR · THEME PLAYING'
      : sound.status === 'blocked'
        ? 'TAP TO START THE ROOM'
        : sound.status === 'paused'
          ? 'THEME PAUSED · TAP TO PLAY'
          : 'TUNING THE ROOM'

  return (
    <main
      className={`menu menu--arena menu--${theme} ${settings.reducedMotion ? 'is-still' : ''}`}
      ref={menuRef}
      onPointerMove={handlePointerMove}
      onPointerLeave={resetPointer}
    >
      <div className="arena-bg" aria-hidden="true">
        <div className="arena-bg__glow arena-bg__glow--gold" />
        <div className="arena-bg__glow arena-bg__glow--purple" />
        <div className="arena-bg__truss arena-bg__truss--left" />
        <div className="arena-bg__truss arena-bg__truss--right" />
        <div className="arena-bg__grid" />
        <div className="arena-bg__vignette" />
        <div className="arena-dust">
          {DUST.map((particle, index) => (
            <i
              key={index}
              style={{
                left: particle.left,
                top: particle.top,
                animationDelay: particle.delay,
                animationDuration: particle.duration,
                width: particle.size,
                height: particle.size,
              }}
            />
          ))}
        </div>
      </div>

      <div className="arena-shell">
        <header className="arena-topbar">
          <button
            className="arena-profile"
            onClick={onTeam}
            title={`Open ${team.labelName} — Record Label HQ`}
            aria-label={`Open Record Label HQ for ${team.labelName}`}
          >
            <span className="arena-profile__avatar">
              <Portrait artist={profileArtist} crop="avatar" />
            </span>
            <span className="arena-profile__copy">
              <span className="arena-profile__eyebrow">
                <b>CKI DIRECTOR</b>
                <i aria-hidden="true">♛</i>
              </span>
              <strong className="arena-profile__name">{team.labelName}</strong>
              <span className="arena-profile__level">
                LVL {String(rank.rankNumber).padStart(2, '0')}
                <i>
                  <b style={{ width: `${Math.round(rank.progress * 100)}%` }} />
                </i>
              </span>
            </span>
          </button>

          <div className="arena-currencies" aria-label="Your label resources">
            <button
              className="arena-currency arena-currency--credits"
              onClick={onTeam}
              aria-label={`${team.credits.toLocaleString('en-US')} record credits. Open label HQ`}
            >
              <span className="arena-currency__icon" aria-hidden="true">C</span>
              <span className="arena-currency__copy">
                <b>{team.credits.toLocaleString('en-US')}</b>
                <em>RC</em>
              </span>
              <span className="arena-currency__plus" aria-hidden="true">+</span>
            </button>
            <button
              className="arena-currency arena-currency--buzz"
              onClick={onCharts}
              aria-label={`${team.buzz.toLocaleString('en-US')} BUZZ REP, ${rank.tier} ${rank.rank}. Open the charts`}
            >
              <span className="arena-currency__icon" aria-hidden="true" />
              <span className="arena-currency__copy">
                <b>{team.buzz.toLocaleString('en-US')}</b>
                <em>BUZZ REP</em>
              </span>
              <span className="arena-currency__plus" aria-hidden="true">+</span>
            </button>
            <button
              className="arena-currency arena-currency--deck"
              onClick={onDeck}
              aria-label={`Mixtape has ${settings.deck.length} of 26 tracks. Open Mixtape Studio`}
            >
              <span className="arena-currency__icon" aria-hidden="true">
                <GameIcon name="mixtape" />
              </span>
              <span className="arena-currency__copy">
                <b>{String(settings.deck.length).padStart(2, '0')}</b>
                <em>MIXTAPE</em>
              </span>
            </button>
          </div>

          <div className="arena-top-actions">
          <button
            className={`arena-account ${account ? 'is-live' : ''}`}
            onClick={onAccount}
            aria-label={account ? `Account ${account.username}. Open profile` : 'Sign in or create an account'}
          >
            <span className="arena-account__avatar">
              {accountArtist ? (
                <Portrait artist={accountArtist} crop="avatar" />
              ) : account ? (
                account.username.slice(0, 2).toUpperCase()
              ) : (
                '?'
              )}
            </span>
            <span className="arena-account__copy">
              <b>{account ? account.username : 'SIGN IN'}</b>
              <em>{account ? 'FRIEND CODE READY' : 'SAVE YOUR PROFILE'}</em>
            </span>
            <i className="arena-account__dot" aria-hidden="true" />
          </button>

          {desktop && (
            <button
              type="button"
              className={`arena-exit ${quitting ? 'is-busy' : ''}`}
              onClick={() => void quitGame()}
              disabled={quitting}
              aria-label="Exit game"
              title="Exit game"
            >
              {quitting ? 'CLOSING…' : 'EXIT GAME'}
            </button>
          )}

          <div className="arena-tools" aria-label="Quick links">
            <button className="arena-icon" onClick={onCharts} aria-label="The Charts" title="The Charts">
              <GameIcon name="charts" />
              <span className="arena-icon__dot" aria-hidden="true" />
            </button>
            <button className="arena-icon" onClick={onDesign} aria-label="The Design Room" title="The Design Room">
              <GameIcon name="design" />
            </button>
            <button className="arena-icon" onClick={onRules} aria-label="Rulebook" title="Rulebook">
              <GameIcon name="rules" />
            </button>
            <button className="arena-icon" onClick={onLeaderboard} aria-label="Leaderboard" title="Leaderboard">
              <GameIcon name="star" />
            </button>
            <button
              className={`arena-icon ${updatesUnread ? 'has-update' : ''}`}
              onClick={onUpdates}
              aria-label={updatesUnread ? 'Updates — new version available' : 'Updates'}
              title={updatesUnread ? 'Updates — new version available' : 'Updates'}
            >
              <GameIcon name="spark" />
              {updatesUnread && <span className="arena-icon__dot arena-icon__dot--new" aria-hidden="true" />}
            </button>
            <button className="arena-icon" onClick={onSettings} aria-label="Settings" title="Settings">
              <GameIcon name="settings" />
            </button>
          </div>
          </div>
        </header>

        {exitError && (
          <p className="arena-exit-error" role="alert">
            {exitError}
          </p>
        )}

        <section className="arena-hero" aria-label="Can I Kick It? main stage">
          <div className="arena-stage" aria-hidden="true">
            <div className="arena-stage__screen">
              <span>CIKI</span>
              <i>LIVE FROM THE MIDNIGHT GARDEN</i>
            </div>
            <div className="arena-stage__crown">♛</div>
            <div className="arena-stage__beams">
              <i />
              <i />
              <i />
            </div>
            <div className="arena-stage__haze arena-stage__haze--left" />
            <div className="arena-stage__haze arena-stage__haze--right" />
            <div className="arena-stage__floor" />
            <div className="arena-crew">
              {featured.map((artist, index) => (
                <figure className={`arena-star arena-star--${index}`} key={artist.id}>
                  <span className="arena-star__halo" />
                  <Portrait artist={artist} crop="avatar" />
                </figure>
              ))}
            </div>
          </div>

          <div className="arena-hero__light" aria-hidden="true" />

          <div className="arena-logo-block">
            <h1 className="arena-logo">
              <BrandLogo />
            </h1>
            <p className="arena-tagline">A HIP-HOP · R&amp;B · POP MUSIC CARD BATTLER</p>
            <div className="arena-logo-meta">
              <div className="arena-difficulty" role="group" aria-label="Show difficulty">
                <span>SHOW</span>
                <div>
                  {DIFFICULTIES.map((difficulty) => (
                    <button
                      key={difficulty.id}
                      className={settings.difficulty === difficulty.id ? 'is-active' : ''}
                      onClick={() => onDifficulty(difficulty.id)}
                      title={difficulty.note}
                      aria-pressed={settings.difficulty === difficulty.id}
                    >
                      {difficulty.label}
                    </button>
                  ))}
                </div>
              </div>
              <span className="arena-record">
                W {String(settings.wins).padStart(2, '0')} · L {String(settings.losses).padStart(2, '0')}
              </span>
            </div>
          </div>

          <aside className={`arena-event arena-event--${activeEvent.key}`} aria-label="Featured event">
            <span className="arena-event__ghost" aria-hidden="true">
              <Portrait artist={activeEvent.artist} crop="avatar" />
            </span>
            <div className="arena-event__top">
              <span>{activeEvent.kicker}</span>
              <GameIcon name={activeEvent.icon} />
            </div>
            <h2 className="arena-event__title">
              {activeEvent.title.split('\n').map((line) => (
                <span key={line}>{line}</span>
              ))}
            </h2>
            <p className="arena-event__note">{activeEvent.note}</p>
            <button className="arena-event__cta" onClick={activeEvent.onClick}>
              {activeEvent.cta}
              <span aria-hidden="true">→</span>
            </button>
            <div className="arena-event__nav">
              <button type="button" onClick={() => cycleEvent(-1)} aria-label="Previous featured event">
                ‹
              </button>
              <div className="arena-event__dots">
                {eventSlides.map((slide, index) => (
                  <button
                    type="button"
                    key={slide.key}
                    className={index === eventIndex ? 'is-active' : ''}
                    onClick={() => setEventIndex(index)}
                    aria-label={`Show ${slide.kicker}: ${slide.title.replace('\n', ' ')}`}
                    aria-pressed={index === eventIndex}
                  />
                ))}
              </div>
              <button type="button" onClick={() => cycleEvent(1)} aria-label="Next featured event">
                ›
              </button>
            </div>
          </aside>
        </section>

        <section className="arena-modes" aria-label="Main game modes">
          <button className="arena-mode arena-mode--play" onClick={onStart} aria-label="PLAY — take the stage" data-gamepad-primary>
            <span className="arena-mode__scene mode-play" aria-hidden="true">
              <span className="mode-play__beam" />
              <span className="mode-play__mic">
                <i />
                <b />
              </span>
              <span className="mode-play__crowd" />
            </span>
            <span className="arena-mode__index">01 · LIVE</span>
            <strong className="arena-mode__name">PLAY</strong>
            <span className="arena-mode__meta">BATTLE · CIRCUIT · EVENTS</span>
            <GameIcon name="chevron" className="arena-mode__arrow" />
          </button>

          <button
            className="arena-mode arena-mode--festival"
            onClick={onFestival}
            aria-label="THE FESTIVAL & TOUR CIRCUIT — six events, solo tours and private online festivals"
          >
            <span className="arena-mode__scene mode-festival" aria-hidden="true">
              <span className="mode-festival__sun" />
              <span className="mode-festival__poster">
                <i>CIKI</i>
                <b>THE FESTIVAL<br />&amp; TOUR<br />CIRCUIT</b>
                <em>SIX STAGES · THREE WEEKENDS</em>
              </span>
              <span className="mode-festival__vinyl" />
              <span className="mode-festival__crowd" />
            </span>
            <span className="arena-mode__index">02 · FESTIVAL</span>
            <strong className="arena-mode__name">THE FESTIVAL &amp; TOUR CIRCUIT</strong>
            <span className="arena-mode__meta">SOLO TOUR · PRIVATE ONLINE · CIRCUIT POINTS</span>
            <GameIcon name="chevron" className="arena-mode__arrow" />
          </button>

          <button
            className="arena-mode arena-mode--team"
            onClick={onTeam}
            aria-label="ULTIMATE TEAM — Record Label HQ"
          >
            <span className="arena-mode__scene mode-venue" aria-hidden="true">
              <span className="mode-venue__glow" />
              <span className="mode-venue__building">
                <span className="mode-venue__sign">
                  <b>CKI</b>
                  <em>RECORDS</em>
                </span>
                <span className="mode-venue__windows">
                  <i />
                  <i />
                  <i />
                </span>
                <span className="mode-venue__door" />
              </span>
            </span>
            <span className="arena-mode__index">03 · CAREER</span>
            <strong className="arena-mode__name">ULTIMATE TEAM</strong>
            <span className="arena-mode__meta">BUILD · MANAGE · PROGRESS</span>
            <GameIcon name="chevron" className="arena-mode__arrow" />
          </button>

          <button
            className="arena-mode arena-mode--mixtape"
            onClick={onDeck}
            aria-label="MIXTAPE STUDIO — build the 26"
          >
            <span className="arena-mode__scene mode-studio" aria-hidden="true">
              <span className="mode-studio__cassette">
                <i />
                <i />
                <b>26</b>
              </span>
              <span className="mode-studio__console">
                <i />
                <i />
                <i />
                <i />
              </span>
              <span className="mode-studio__light" />
            </span>
            <span className="arena-mode__index">04 · STUDIO</span>
            <strong className="arena-mode__name">MIXTAPE STUDIO</strong>
            <span className="arena-mode__meta">CREATE DECKS · CRAFT STRATEGY</span>
            <GameIcon name="chevron" className="arena-mode__arrow" />
          </button>

          <button
            className="arena-mode arena-mode--collection"
            onClick={onCollection}
            aria-label="COLLECTION — all fifty artists"
          >
            <span className="arena-mode__scene mode-collection" aria-hidden="true">
              <span className="mode-collection__glow" />
              {featured.slice(1, 4).map((artist, index) => (
                <span className={`mode-minicard mode-minicard--${index}`} key={artist.id}>
                  <Portrait artist={artist} crop="avatar" />
                  <i>CIKI</i>
                  <b>{String(artist.number).padStart(2, '0')}</b>
                </span>
              ))}
            </span>
            <span className="arena-mode__index">05 · ARCHIVE</span>
            <strong className="arena-mode__name">COLLECTION</strong>
            <span className="arena-mode__meta">ARTISTS · CARDS · ERAS</span>
            <GameIcon name="chevron" className="arena-mode__arrow" />
          </button>

          <button
            className="arena-mode arena-mode--tutorial"
            onClick={onTutorial}
            aria-label="HOW TO PLAY — interactive tutorial"
          >
            <span className="arena-mode__scene mode-tutorial" aria-hidden="true">
              <span className="mode-tutorial__beam" />
              <span className="mode-clapper">
                <span className="mode-clapper__top" />
                <span className="mode-clapper__face">
                  <GameIcon name="tutorial" />
                  <b>
                    SOUND
                    <br />
                    CHECK
                  </b>
                </span>
              </span>
            </span>
            <span className="arena-mode__index">06 · TRAINING</span>
            <strong className="arena-mode__name">HOW TO PLAY</strong>
            <span className="arena-mode__meta">TUTORIAL · GUIDES · TIPS</span>
            <GameIcon name="chevron" className="arena-mode__arrow" />
          </button>

          <button
            className="arena-mode arena-mode--online"
            onClick={onOnline}
            aria-label="ONLINE VS — create or join a private room"
          >
            <span className="arena-mode__scene mode-online" aria-hidden="true">
              <span className="mode-online__pulse" />
              <span className="mode-online__seat mode-online__seat--l">YOU</span>
              <span className="mode-online__vs">VS</span>
              <span className="mode-online__seat mode-online__seat--r">??</span>
            </span>
            <span className="arena-mode__index">07 · ONLINE</span>
            <strong className="arena-mode__name">ONLINE VS</strong>
            <span className="arena-mode__meta">CASUAL · RANKED · FRIENDS</span>
            <GameIcon name="chevron" className="arena-mode__arrow" />
          </button>

          <button
            className="arena-mode arena-mode--career"
            onClick={onCareer}
            aria-label="MY ARTIST CAREER — create an artist and play from the basement to the billboard"
          >
            <span className="arena-mode__scene mode-career" aria-hidden="true">
              <span className="mode-career__spotlight" />
              <span className="mode-career__poster">
                <i>MY</i>
                <b>ARTIST<br />CAREER</b>
                <em>FROM THE BASEMENT TO THE BILLBOARD</em>
              </span>
              <span className="mode-career__mic" />
            </span>
            <span className="arena-mode__index">08 · MY ARTIST</span>
            <strong className="arena-mode__name">MY ARTIST CAREER</strong>
            <span className="arena-mode__meta">
              {careerName ? `${careerName} · CONTINUE` : 'CREATE · DEVELOP · HEADLINE'}
            </span>
            <GameIcon name="chevron" className="arena-mode__arrow" />
          </button>
        </section>

        <section className="arena-afterparty" aria-label="Radio and current event">
          <div className="arena-radio">
            <span className="arena-radio__disc" aria-hidden="true">
              <i />
            </span>
            <span className="arena-radio__copy">
              <em>NOW PLAYING</em>
              <b>CKI RADIO</b>
              <small>{radioStatus}</small>
            </span>
            <button
              className={`audio-chip arena-radio__toggle ${sound.status === 'playing' ? 'is-playing' : ''}`}
              onClick={toggleSound}
              aria-pressed={sound.status === 'playing'}
              aria-label={sound.status === 'playing' ? 'Pause main menu soundtrack' : 'Play main menu soundtrack'}
              title="Menu theme: Can I Kick It? The Game! — shepvontre"
            >
              <span className={`arena-radio__toggle-icon ${sound.status === 'playing' ? 'is-playing' : ''}`} aria-hidden="true">
                {sound.status === 'playing' ? (
                  <>
                    <i />
                    <i />
                  </>
                ) : (
                  <b />
                )}
              </span>
            </button>
          </div>

          <div className="arena-current">
            <span className="arena-current__tag">CURRENT EVENT</span>
            <span className="arena-current__copy">
              <b>THE UNDERGROUND CIRCUIT</b>
              <em>SHORT SETS · NO CLAPBACKS · COMBO LIST</em>
            </span>
            <div className="arena-current__actions">
              <button className="arena-current__cta" onClick={() => onCircuit('underground')}>
                VIEW EVENT
                <span aria-hidden="true">→</span>
              </button>
              <button className="arena-current__motion" onClick={onToggleMotion}>
                MOTION {settings.reducedMotion ? 'OFF' : 'ON'}
              </button>
            </div>
            <span className="arena-current__graffiti" aria-hidden="true">26</span>
          </div>
        </section>
      </div>

      <div className="arena-crowd" aria-hidden="true">
        <div className="arena-crowd__glow" />
        {CROWD.map((person, index) => (
          <span
            key={index}
            className={`arena-crowd__person ${person.arms ? 'has-arms' : ''}`}
            style={{ left: person.left, height: person.height, animationDelay: person.delay }}
          />
        ))}
      </div>
    </main>
  )
}
