import {
  useEffect,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
} from 'react'
import type { Artist, Difficulty, Settings } from '../game/types'
import { getArtist } from '../game/roster'
import { DIFFICULTIES, THEME_META } from '../game/themes'
import { buzzState, labelInitials } from '../game/ultimate'
import { chartLeader, type ChartState } from '../game/charts'
import { Card } from '../components/Card'
import { GameIcon } from '../components/GameIcon'

type SoundState = 'loading' | 'playing' | 'blocked' | 'paused'

import { BrandLogo } from '../components/BrandLogo'

const MENU_THEME_SRC = `${import.meta.env.BASE_URL}audio/ciki-main-theme.webm`
const FEATURED_IDS = ['cipher-jones', 'amara-afterglow', 'ziggy-stereo']
const DUST = Array.from({ length: 18 }, (_, index) => ({
  left: `${8 + ((index * 37) % 84)}%`,
  top: `${12 + ((index * 53) % 70)}%`,
  delay: `${(index % 9) * -1.7}s`,
  duration: `${7 + (index % 6) * 2.2}s`,
  size: `${1 + (index % 3)}px`,
}))

function overallOf(artist: Artist) {
  return Math.min(99, Math.round(69 + artist.bars * 2.1 + artist.cost * 1.3 + artist.encore.bars * 0.4))
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
  onCircuit: () => void
  onDifficulty: (difficulty: Difficulty) => void
  onToggleMotion: () => void
  onTutorial: () => void
  onSettings: () => void
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
  onDifficulty,
  onToggleMotion,
  onTutorial,
  onSettings,
}: MainMenuProps) {
  const theme = settings.theme
  const meta = THEME_META[theme]
  const team = settings.team
  const rank = buzzState(team.buzz)
  const initials = labelInitials(team.labelName)
  const featured = FEATURED_IDS.map(getArtist)
  const leader = chartLeader(charts)

  const menuRef = useRef<HTMLElement | null>(null)
  const [soundState, setSoundState] = useState<SoundState>('loading')
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const wantsSound = useRef(true)


  useEffect(() => {
    let cancelled = false
    const audio = new Audio(MENU_THEME_SRC)
    audio.loop = true
    audio.volume = 0.32
    audio.preload = 'auto'
    audioRef.current = audio

    const tryPlay = async () => {
      if (cancelled || !wantsSound.current) return
      try {
        await audio.play()
        if (!cancelled) setSoundState('playing')
      } catch {
        if (!cancelled) setSoundState('blocked')
      }
    }

    const unlock = (event: PointerEvent) => {
      const target = event.target
      if (target instanceof Element && target.closest('.audio-chip')) return
      if (wantsSound.current && audio.paused) void tryPlay()
    }

    void tryPlay()
    window.addEventListener('pointerdown', unlock)

    return () => {
      cancelled = true
      window.removeEventListener('pointerdown', unlock)
      audio.pause()
      audio.src = ''
      if (audioRef.current === audio) audioRef.current = null
    }
  }, [])

  const toggleSound = async () => {
    const audio = audioRef.current
    if (!audio) return
    if (!audio.paused) {
      wantsSound.current = false
      audio.pause()
      setSoundState('paused')
      return
    }
    wantsSound.current = true
    try {
      await audio.play()
      setSoundState('playing')
    } catch {
      setSoundState('blocked')
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
    element.style.setProperty('--shift-x', `${(x - 0.5) * 30}px`)
    element.style.setProperty('--shift-y', `${(y - 0.5) * 20}px`)
  }

  const resetPointer = () => {
    const element = menuRef.current
    if (!element) return
    element.style.setProperty('--pointer-x', '50%')
    element.style.setProperty('--pointer-y', '28%')
    element.style.setProperty('--shift-x', '0px')
    element.style.setProperty('--shift-y', '0px')
  }

  const soundLabel =
    soundState === 'playing'
      ? 'THEME · ON'
      : soundState === 'blocked'
        ? 'THEME · TAP'
        : soundState === 'paused'
          ? 'THEME · OFF'
          : 'THEME · READY'

  return (
    <main
      className={`menu menu--${theme} ${settings.reducedMotion ? 'is-still' : ''}`}
      ref={menuRef}
      onPointerMove={handlePointerMove}
      onPointerLeave={resetPointer}
    >
      <div className="menu-atmosphere" aria-hidden="true">
        <div className="menu-atmosphere__brick" />
        <div className="menu-atmosphere__vignette" />
        <div className="menu-beam menu-beam--one" />
        <div className="menu-beam menu-beam--two" />
        <div className="menu-pointer-light" />
        <div className="menu-smoke menu-smoke--one" />
        <div className="menu-smoke menu-smoke--two" />
        <div className="menu-graffiti">26</div>
        <div className="menu-particles">
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

      <header className="menu-topbar">
        <button
          className="menu-brand"
          onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
          aria-label="Can I Kick It? The Game — home"
        >
          <span className="menu-brand__mark">CIKI</span>
          <span className="menu-brand__copy">
            <b>CAN I KICK IT?</b>
            <i>THE GAME</i>
          </span>
        </button>

        <nav className="topnav menu-nav" aria-label="Main">
          <button
            className="is-active"
            aria-current="page"
            onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
          >
            <GameIcon name="home" />
            <span>HOME</span>
          </button>
          <button onClick={onCollection}>
            <GameIcon name="collection" />
            <span>THE 26</span>
          </button>
          <button onClick={onCharts}>
            <GameIcon name="charts" />
            <span>CHARTS</span>
          </button>
          <button onClick={onDeck}>
            <GameIcon name="mixtape" />
            <span>MIXTAPE</span>
          </button>
          <button onClick={onDesign}>
            <GameIcon name="design" />
            <span>DESIGN ROOM</span>
          </button>
          <button onClick={onTutorial}>
            <GameIcon name="tutorial" />
            <span>HOW TO PLAY</span>
          </button>
        </nav>

        <div className="menu-topbar__right">
          <span className="menu-credits" title="Record Credits">
            <i aria-hidden="true">◉</i>
            <b>{team.credits.toLocaleString('en-US')}</b>
            <em>RC</em>
          </span>
          <span className="menu-buzz" title="BUZZ REP">
            <i>BR</i>
            <span>
              <b>BUZZ REP</b>
              <em>
                {rank.tier} {rank.rank}
              </em>
            </span>
          </span>
          <button
            className={`audio-chip ${soundState === 'playing' ? 'is-playing' : ''}`}
            onClick={toggleSound}
            aria-pressed={soundState === 'playing'}
            aria-label={soundState === 'playing' ? 'Pause main menu soundtrack' : 'Play main menu soundtrack'}
            title="Menu theme: Can I Kick It? The Game! — shepvontre"
          >
            <i />
            {soundLabel}
          </button>
          <button className="menu-icon-btn" onClick={onSettings} aria-label="Open settings" title="Settings">
            <GameIcon name="settings" />
          </button>
          <button className="menu-profile" onClick={onTeam} title="Open Record Label HQ" aria-label="Open Record Label HQ">
            <span>{initials}</span>
            <i>HQ</i>
          </button>
        </div>
      </header>

      <section className="menu-hero">
        <div className="menu-hero__light" aria-hidden="true" />
        <div className="menu-copy">
          <p className="menu-kicker">
            <i aria-hidden="true">✦</i>
            A CONCERT CARD BATTLER · 26 SLOTS
          </p>
          <h1 className="menu-title menu-title--logo">
            <BrandLogo />
          </h1>
          <p className="menu-lede">FIFTY ARTISTS. FIVE LIVE SLOTS. ONE ROOM TO OWN.</p>
          <p className="menu-desc">
            Build the mixtape, read the crowd and out-perform <b>THE HEADLINER</b> across three eras.
            Hype the room, flip encores, call feature verses, and leave with the whole building.
          </p>

          <div className="menu-meta">
            <div className="menu-difficulty" role="group" aria-label="Difficulty">
              <span>DIFFICULTY</span>
              <div>
                {DIFFICULTIES.map((difficulty) => (
                  <button
                    key={difficulty.id}
                    className={settings.difficulty === difficulty.id ? 'is-active' : ''}
                    onClick={() => onDifficulty(difficulty.id)}
                    title={difficulty.note}
                  >
                    {difficulty.label}
                  </button>
                ))}
              </div>
            </div>
            <span className="menu-mixtape">
              <i className={settings.deck.length === 26 ? 'is-ready' : ''} />
              MIXTAPE {String(settings.deck.length).padStart(2, '0')}/26
            </span>
            <span className="menu-record">
              W {String(settings.wins).padStart(2, '0')} · L {String(settings.losses).padStart(2, '0')}
            </span>
            <button className="menu-chart" onClick={onCharts} title="Open the weekly chart">
              <i>#1</i>
              <span>{leader ? getArtist(leader.id).name : 'THE CIKI 26'}</span>
              <em>CHARTS →</em>
            </button>
          </div>
        </div>

        <div className="menu-stage" aria-label="Featured artists in the Midnight Garden">
          <div className="menu-stage__wall" aria-hidden="true" />
          <div className="menu-stage__crown" aria-hidden="true">
            ♛
          </div>
          <div className="menu-stage__speakers" aria-hidden="true">
            <span />
            <span />
          </div>
          <div className="menu-stage__beams" aria-hidden="true">
            <i />
            <i />
            <i />
          </div>

          <div className="menu-cassette" aria-hidden="true">
            <span className="menu-cassette__label">
              MIXTAPE 26 <b>♛</b>
            </span>
            <div className="menu-cassette__reels">
              <i />
              <i />
            </div>
            <span className="menu-cassette__side">SIDE A · 33:26</span>
          </div>

          <div className="menu-headphones" aria-hidden="true">
            <span className="menu-headphones__band" />
            <i />
            <i />
          </div>

          <div className="menu-ticket" aria-hidden="true">
            <span>THE MIDNIGHT GARDEN</span>
            <b>LIVE TONIGHT</b>
            <i>SEC 102 · ROW H · SEAT 26</i>
          </div>

          <div className="menu-stage__cards">
            {featured.map((artist, index) => (
              <div className={`menu-artist-card menu-artist-card--${index}`} key={artist.id}>
                <span className="menu-artist-card__ovr">
                  <i>♛</i>
                  {overallOf(artist)}
                </span>
                <Card artist={artist} size="hero" />
              </div>
            ))}
          </div>

          <div className="menu-turntable" aria-hidden="true">
            <div className="menu-vinyl">
              <span />
              <i />
            </div>
            <div className="menu-tonearm" />
            <span className="menu-turntable__caption">CIKI · 33⅓</span>
          </div>

          <div className="menu-eq" aria-hidden="true">
            {Array.from({ length: 9 }).map((_, index) => (
              <i key={index} />
            ))}
          </div>

          <div className="menu-stage__caption">
            <span>{meta.name}</span>
            <i>ART DIRECTION {meta.index} / 03</i>
          </div>
        </div>
      </section>

      <section className="menu-shortcuts" aria-label="Main game modes">
        <button className="menu-shortcut menu-shortcut--play" onClick={onStart} aria-label="PLAY — take the stage">
          <span className="menu-shortcut__art" aria-hidden="true">
            <GameIcon name="play" />
            <span className="menu-shortcut__crowd" />
            <span className="menu-shortcut__light" />
          </span>
          <span className="menu-shortcut__copy">
            <span className="menu-shortcut__index">01 · LIVE</span>
            <b>PLAY</b>
            <em>TAKE THE STAGE · VERSUS THE HEADLINER</em>
          </span>
          <GameIcon name="chevron" className="menu-shortcut__arrow" />
        </button>

        <button className="menu-shortcut menu-shortcut--team" onClick={onTeam} aria-label="ULTIMATE TEAM — Record Label HQ">
          <span className="menu-shortcut__art" aria-hidden="true">
            <GameIcon name="team" />
            <span className="menu-shortcut__crest">CIKI</span>
          </span>
          <span className="menu-shortcut__copy">
            <span className="menu-shortcut__index">02 · CAREER</span>
            <b>ULTIMATE TEAM</b>
            <em>LABEL HQ · MISSIONS · MUSIC CIRCUIT</em>
          </span>
          <GameIcon name="chevron" className="menu-shortcut__arrow" />
        </button>

        <button className="menu-shortcut menu-shortcut--mixtape" onClick={onDeck} aria-label="MIXTAPE STUDIO — build the 26">
          <span className="menu-shortcut__art" aria-hidden="true">
            <GameIcon name="mixtape" />
            <span className="menu-shortcut__cassette-label">MIXTAPE</span>
          </span>
          <span className="menu-shortcut__copy">
            <span className="menu-shortcut__index">03 · STUDIO</span>
            <b>MIXTAPE STUDIO</b>
            <em>BUILD · EQUIP MOVES · ANALYZE</em>
          </span>
          <GameIcon name="chevron" className="menu-shortcut__arrow" />
        </button>

        <button
          className="menu-shortcut menu-shortcut--collection"
          onClick={onCollection}
          aria-label="COLLECTION — all fifty artists"
        >
          <span className="menu-shortcut__art" aria-hidden="true">
            <GameIcon name="collection" />
            <span className="menu-shortcut__record" />
          </span>
          <span className="menu-shortcut__copy">
            <span className="menu-shortcut__index">04 · ARCHIVE</span>
            <b>COLLECTION</b>
            <em>50 ARTISTS · ERAS · CREW CHEMISTRY</em>
          </span>
          <GameIcon name="chevron" className="menu-shortcut__arrow" />
        </button>

        <button
          className="menu-shortcut menu-shortcut--tutorial"
          onClick={onTutorial}
          aria-label="HOW TO PLAY — interactive tutorial"
        >
          <span className="menu-shortcut__art" aria-hidden="true">
            <GameIcon name="tutorial" />
            <span className="menu-shortcut__light" />
          </span>
          <span className="menu-shortcut__copy">
            <span className="menu-shortcut__index">05 · TRAINING</span>
            <b>HOW TO PLAY</b>
            <em>GUIDED MATCH · 10 CHAPTERS · WIN THE ROOM</em>
          </span>
          <GameIcon name="chevron" className="menu-shortcut__arrow" />
        </button>

        <button
          className="menu-shortcut menu-shortcut--settings"
          onClick={onSettings}
          aria-label="SETTINGS"
        >
          <span className="menu-shortcut__art" aria-hidden="true">
            <GameIcon name="settings" />
          </span>
          <span className="menu-shortcut__copy">
            <span className="menu-shortcut__index">06 · CONTROL</span>
            <b>SETTINGS</b>
            <em>THEMES · DIFFICULTY · MOTION</em>
          </span>
          <GameIcon name="chevron" className="menu-shortcut__arrow" />
        </button>
      </section>

      <nav className="menu-quicklinks" aria-label="More game modes">
        <button onClick={onCircuit}>
          <GameIcon name="circuit" />
          <span><b>MUSIC CIRCUIT</b><em>CAMPAIGN · REWARDS</em></span>
        </button>
        <button onClick={onCharts}>
          <GameIcon name="charts" />
          <span><b>THE CHARTS</b><em>WEEKLY · SPINS</em></span>
        </button>
        <button onClick={onDesign}>
          <GameIcon name="design" />
          <span><b>DESIGN ROOM</b><em>3 ART DIRECTIONS</em></span>
        </button>
        <button onClick={onRules}>
          <GameIcon name="rules" />
          <span><b>RULEBOOK</b><em>QUICK REFERENCE</em></span>
        </button>
      </nav>

      <footer className="menu-footer">
        <div className="menu-features">
          {[
            ['∞', 'FEATURE VERSES'],
            ['◇', 'COUNTERS'],
            ['◉', 'CROWD METER'],
            ['✦', 'HYPE'],
            ['↻', 'ENCORE TRANSFORMATIONS'],
            ['≡', 'ERA EVOLUTIONS'],
            ['★', 'THE 26'],
          ].map(([icon, label]) => (
            <span key={label}>
              <i aria-hidden="true">{icon}</i>
              {label}
            </span>
          ))}
        </div>
        <div className="menu-footer__row">
          <button className="menu-footer__link" onClick={onToggleMotion}>
            MOTION {settings.reducedMotion ? 'OFF' : 'ON'}
          </button>
          <button className="menu-footer__link" onClick={onDesign}>
            VIEW 3 ART DIRECTIONS
          </button>
          <button className="menu-footer__link" onClick={onTutorial}>
            HOW TO PLAY
          </button>
          <button className="menu-footer__link" onClick={onRules}>
            RULEBOOK
          </button>
          <a
            className="menu-footer__credit"
            href="https://suno.com/s/s8qIX9hLnJBbkcfl"
            target="_blank"
            rel="noreferrer"
            title="Open the Suno share page"
          >
            MAIN THEME · “CAN I KICK IT? THE GAME!” · SHEPVONTRE
          </a>
        </div>
      </footer>

    </main>
  )
}
