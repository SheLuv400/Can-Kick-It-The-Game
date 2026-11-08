import { useState } from 'react'
import type { ThemeId } from '../game/types'
import { THEME_META, THEME_ORDER } from '../game/themes'
import { getArtist } from '../game/roster'
import { Card } from '../components/Card'
import { HudStrip } from '../components/Hud'

interface DesignLabProps {
  currentTheme: ThemeId
  selectedDirection: ThemeId | null
  onSelect: (theme: ThemeId) => void
  onBack: () => void
}

const PREVIEW_MENU_CARDS = ['krown-vandal', 'cipher-jones', 'amara-afterglow'].map(getArtist)
const PREVIEW_RIVAL = ['vexa-volt', 'nikki-noize', 'pixel-cherry'].map(getArtist)
const PREVIEW_PLAYER = ['krown-vandal', 'amara-afterglow', 'tangerine-lux'].map(getArtist)
const PREVIEW_CARDS = ['amara-afterglow', 'kyro-silk', 'tangerine-lux'].map(getArtist)

export function DesignLab({ currentTheme, selectedDirection, onSelect, onBack }: DesignLabProps) {
  const [view, setView] = useState<ThemeId>(currentTheme)
  const meta = THEME_META[view]

  return (
    <main className="lab">
      <header className="lab__top">
        <button className="link-btn" onClick={onBack}>
          ← BACK TO THE SHOW
        </button>
        <span className="lab__crumb">THE DESIGN ROOM · ART DIRECTION REVIEW</span>
        <span className="lab__audio">AUDIO · ARENA MIX</span>
      </header>

      <section className="lab__intro">
        <div>
          <p className="kicker">
            <span className="kicker__rule" />
            THREE DIRECTIONS · ONE STAGE
          </p>
          <h1>
            CHOOSE THE
            <br />
            <em>VISUAL WORLD</em>
          </h1>
        </div>
        <div className="lab__intro-copy">
          <p>
            Three complete art directions for the main menu, battlefield, collectible cards and HUD.
            Every preview below is live UI — switch directions, study the room, then lock the world
            you want the show to live in.
          </p>
          <p className="lab__note">
            Mechanics are identical in all three: 26 slots, Hype, Crowd Meters, Encore Transformations,
            Era Evolutions, Feature Verses and Counters.
          </p>
        </div>
      </section>

      <div className="lab__tabs" role="tablist" aria-label="Art directions">
        {THEME_ORDER.map((id) => {
          const item = THEME_META[id]
          const isCurrent = currentTheme === id
          const isSelected = selectedDirection === id
          return (
            <button
              key={id}
              role="tab"
              aria-selected={view === id}
              className={`lab-tab theme-${id} ${view === id ? 'is-viewing' : ''}`}
              onClick={() => setView(id)}
            >
              <span className="lab-tab__index">{item.index}</span>
              <span className="lab-tab__name">{item.name}</span>
              <span className="lab-tab__mood">{item.mood}</span>
              <span className="lab-tab__swatches">
                {item.palette.map((color) => (
                  <i key={color} style={{ background: color }} />
                ))}
              </span>
              <span className="lab-tab__meta">
                <span>{item.type}</span>
                <span>{item.keywords.join(' · ')}</span>
              </span>
              <span className="lab-tab__badges">
                {isSelected && <b className="lab-tab__badge lab-tab__badge--selected">SELECTED</b>}
                {isCurrent && !isSelected && <b className="lab-tab__badge">LIVE NOW</b>}
                {view === id && <b className="lab-tab__badge lab-tab__badge--view">VIEWING</b>}
              </span>
            </button>
          )
        })}
      </div>

      <div className={`lab__stage theme-${view}`}>
        <div className="lab__stage-bar">
          <div>
            <span className="lab__stage-index">DIRECTION {meta.index}</span>
            <h2>{meta.name}</h2>
            <p>{meta.tagline}</p>
          </div>
          <div className="lab__stage-actions">
            <span className="lab__palette">
              {meta.palette.map((color) => (
                <i key={color} style={{ background: color }} />
              ))}
            </span>
            <button className="btn btn--primary" onClick={() => onSelect(view)}>
              {selectedDirection === view ? 'LOCKED AS THE SHOW' : 'USE THIS DIRECTION'}
            </button>
          </div>
        </div>

        <div className="lab__grid">
          <figure className="lab__panel lab__panel--menu">
            <figcaption>
              <span>01</span> MAIN MENU
            </figcaption>
            <div className="preview-menu">
              <div className="preview-menu__deco" aria-hidden="true">
                {view === 'a' && (
                  <>
                    <span className="pm-vinyl" />
                    <span className="pm-gilt" />
                  </>
                )}
                {view === 'b' && (
                  <>
                    <span className="pm-tape pm-tape--1" />
                    <span className="pm-tape pm-tape--2" />
                    <span className="pm-sticker">NO SKIPS</span>
                  </>
                )}
                {view === 'c' && (
                  <>
                    <span className="pm-orb" />
                    <span className="pm-orbit" />
                    <span className="pm-chip">HOLO / 26</span>
                  </>
                )}
              </div>
              <div className="preview-menu__nav">
                <span className="pm-logo">CIKI</span>
                <span className="pm-links">THE 26 · MIXTAPE · DESIGN</span>
                <span className="pm-audio">AUDIO LIVE</span>
              </div>
              <div className="preview-menu__body">
                <span className="pm-kicker">A CONCERT CARD BATTLER</span>
                <h3>
                  CAN I<br />
                  <em>KICK IT?</em>
                </h3>
                <span className="pm-sub">THE GAME</span>
                <p>50 artists. 5 live slots. One room to own.</p>
                <div className="pm-buttons">
                  <span className="pm-btn pm-btn--primary">TAKE THE STAGE</span>
                  <span className="pm-btn">MIXTAPE</span>
                </div>
              </div>
              <div className="preview-menu__cards">
                {PREVIEW_MENU_CARDS.slice(0, 2).map((artist, index) => (
                  <div className={`preview-menu__card preview-menu__card--${index}`} key={artist.id}>
                    <Card artist={artist} size="stage" tilt={false} />
                  </div>
                ))}
              </div>
              <div className="preview-menu__foot">
                <span>26-SLOT MIXTAPE</span>
                <span>SOLD OUT · NIGHT 01</span>
              </div>
            </div>
          </figure>

          <figure className="lab__panel lab__panel--cards">
            <figcaption>
              <span>03</span> COLLECTIBLE CARDS
            </figcaption>
            <div className="preview-cards">
              <div className="preview-cards__glow" aria-hidden="true" />
              <span className="preview-cards__note">HOLOGRAPHIC FOIL · 50 CARD SET</span>
              <div className="preview-cards__row">
                {PREVIEW_CARDS.map((artist, index) => (
                  <div className={`preview-cards__card preview-cards__card--${index}`} key={artist.id}>
                    <Card artist={artist} size="grid" encore={index === 2} />
                  </div>
                ))}
              </div>
              <div className="preview-cards__legend">
                <span>BASE</span>
                <span>HOLO</span>
                <span>ENCORE</span>
              </div>
            </div>
          </figure>

          <figure className="lab__panel lab__panel--battle">
            <figcaption>
              <span>02</span> BATTLEFIELD
            </figcaption>
            <div className="preview-battle">
              <div className="preview-battle__hud">
                <HudStrip
                  player={{ name: 'YOU', crowd: 72, maxCrowd: 72, hype: 7, shield: 0, counters: 2, encoreCharges: 1, avatar: PREVIEW_PLAYER[0] }}
                  rival={{ name: 'THE HEADLINER', crowd: 41, maxCrowd: 72, hype: 4, shield: 3, counters: 1, encoreCharges: 2, avatar: PREVIEW_RIVAL[0] }}
                  round={5}
                  era={2}
                  lastHit={{ side: 'rival', value: 9, nonce: 1 }}
                  difficulty="THE MIDNIGHT GARDEN"
                  showLevels={false}
                />
              </div>
              <div className="preview-battle__room">
                <div className="preview-battle__side preview-battle__side--rival">
                  <span className="preview-battle__label">THE HEADLINER · LIVE</span>
                  <div className="preview-battle__stage">
                    {PREVIEW_RIVAL.map((artist) => (
                      <div className="preview-battle__card" key={artist.id}>
                        <Card artist={artist} size="hand" era={2} tilt={false} />
                      </div>
                    ))}
                  </div>
                </div>
                <div className="preview-battle__line">
                  <span>ERA II · MAIN STAGE</span>
                  <b>FEATURE VERSE — VELVET COURT</b>
                  <span>+9 BARS</span>
                </div>
                <div className="preview-battle__side preview-battle__side--player">
                  <span className="preview-battle__label">YOUR SET · 5 SLOTS</span>
                  <div className="preview-battle__stage">
                    {PREVIEW_PLAYER.map((artist) => (
                      <div className="preview-battle__card" key={artist.id}>
                        <Card artist={artist} size="hand" era={2} tilt={false} />
                      </div>
                    ))}
                  </div>
                  <div className="preview-battle__controls">
                    <span className="fake-btn fake-btn--glow">FEATURE VERSE</span>
                    <span className="fake-btn">ENCORE ×1</span>
                    <span className="fake-btn fake-btn--end">END TURN</span>
                  </div>
                </div>
              </div>
            </div>
          </figure>

          <figure className="lab__panel lab__panel--hud">
            <figcaption>
              <span>04</span> HUD &amp; CONTROLS
            </figcaption>
            <div className="preview-hud">
              <HudStrip
                player={{ name: 'YOU', crowd: 72, maxCrowd: 72, hype: 8, shield: 4, counters: 2, encoreCharges: 1, avatar: PREVIEW_PLAYER[0] }}
                rival={{ name: 'THE HEADLINER', crowd: 38, maxCrowd: 72, hype: 5, shield: 0, counters: 2, encoreCharges: 2, avatar: PREVIEW_RIVAL[0] }}
                round={8}
                era={3}
                lastHit={{ side: 'rival', value: 12, nonce: 2 }}
                difficulty="HEADLINER · NIGHT 01"
              />
              <div className="preview-hud__controls">
                <div className="preview-hud__group">
                  <span className="preview-hud__label">CARD ACTIONS</span>
                  <span className="fake-btn fake-btn--glow">ENCORE READY</span>
                  <span className="fake-btn">FEATURE VERSE</span>
                  <span className="fake-btn fake-btn--danger">CLAPBACK ×2</span>
                </div>
                <div className="preview-hud__group">
                  <span className="preview-hud__label">TURN</span>
                  <span className="fake-btn fake-btn--end">END TURN</span>
                  <span className="preview-hud__hint">HYPE 08 · 26-SLOT MIXTAPE · ERA III</span>
                </div>
              </div>
            </div>
          </figure>
        </div>

        <div className="lab__verdict">
          <div>
            <span className="kicker">DIRECTION {meta.index} OF 03</span>
            <h3>{meta.name}</h3>
            <p>{meta.tagline}</p>
          </div>
          <div className="lab__verdict-actions">
            {selectedDirection && (
              <span className="lab__locked">
                CURRENT SHOW: {THEME_META[selectedDirection].name}
              </span>
            )}
            <button className="btn btn--primary" onClick={() => onSelect(view)}>
              {selectedDirection === view ? 'THIS IS THE SHOW' : `LOCK ${meta.name}`}
            </button>
            <button className="link-btn" onClick={onBack}>
              BACK TO MENU
            </button>
          </div>
        </div>
      </div>
    </main>
  )
}
