import { useMemo, useState, type CSSProperties } from 'react'
import { audioEngine } from '../game/audio'
import { buzzState } from '../game/ultimate'
import {
  CIRCUIT_META,
  CIRCUIT_ORDER,
  VENUES,
  gigToRun,
  makeCircuitRun,
  makeGigOffers,
  type BattleObjectiveSpec,
  type CircuitGig,
  type CircuitId,
  type CircuitRun,
} from '../game/circuits'
import type { Settings } from '../game/types'
import { GAME_VERSION } from '../game/version'

interface CircuitProps {
  settings: Settings
  initialCircuit: CircuitId
  onBack: () => void
  onStart: (run: CircuitRun) => void
}

const ROMAN = ['I', 'II', 'III']

export function Circuit({ settings, initialCircuit, onBack, onStart }: CircuitProps) {
  const [tab, setTab] = useState<CircuitId>(initialCircuit)
  const [gigs, setGigs] = useState(() => makeGigOffers(settings))
  const rank = buzzState(settings.team.buzz)
  const rankLabel = rank.tier
  const meta = CIRCUIT_META[tab]
  const preview = useMemo(
    () => (tab === 'headliner' ? null : makeCircuitRun(tab, settings)),
    [tab, settings],
  )
  const listPreview: BattleObjectiveSpec[] =
    preview?.objectives ??
    meta.objectiveIds.map((id: string) => ({
      id,
      title: id.replaceAll('-', ' ').toUpperCase(),
      detail: 'Clear this task during the set.',
      kind: 'play-cards',
      target: 1,
      rewardCredits: 0,
      rewardBuzz: 0,
    }))

  const chooseCircuit = () => {
    if (tab === 'headliner' || !preview) return
    audioEngine.playSfx('click')
    onStart(preview)
  }

  const chooseGig = (gig: CircuitGig) => {
    audioEngine.playSfx('click')
    onStart(gigToRun(gig))
  }

  const reroll = () => {
    audioEngine.playSfx('shuffle')
    setGigs(makeGigOffers(settings))
  }

  return (
    <main className="circuit" style={{ '--circuit-accent': meta.accent } as CSSProperties}>
      <div className="circuit__noise" aria-hidden="true" />

      <header className="circuit__topbar">
        <button className="circuit__back" onClick={onBack}>
          ← BACK TO THE BLOCK
        </button>
        <div className="circuit__brand">
          <span>CIKI</span>
          <b>
            THE CIRCUIT BOARD <small>v{GAME_VERSION}</small>
          </b>
        </div>
        <div className="circuit__wallet">
          <span>
            <i>RC</i> {settings.team.credits.toLocaleString('en-US')}
          </span>
          <span>
            <i>BUZZ</i> {settings.team.buzz.toLocaleString('en-US')}
          </span>
          <b>{rankLabel}</b>
        </div>
      </header>

      <section className="circuit__hero">
        <div className="circuit__hero-copy">
          <span className="kicker">THE ROAD · THREE WAYS TO TAKE THE ROOM</span>
          <h1>
            PICK A CIRCUIT.
            <br />
            <em>CHANGE THE RULES.</em>
          </h1>
          <p>
            The Music Circuit builds the stage. The Underground Circuit cuts the safety net.
            The Headliner Circuit puts a price on your nerve. Same deck. Different night.
          </p>
        </div>
        <div className="circuit__hero-stamp">
          <span>SEASON</span>
          <b>01</b>
          <i>{settings.team.circuitWins} CIRCUIT WINS</i>
        </div>
      </section>

      <nav className="circuit__tabs" aria-label="Circuits">
        {CIRCUIT_ORDER.map((id, index) => {
          const item = CIRCUIT_META[id]
          const active = tab === id
          return (
            <button
              key={id}
              className={`circuit__tab ${active ? 'is-active' : ''}`}
              style={{ '--tab-accent': item.accent } as CSSProperties}
              onClick={() => {
                audioEngine.playSfx('click')
                setTab(id)
              }}
              aria-current={active ? 'page' : undefined}
            >
              <span>0{index + 1}</span>
              <b>{item.name.replace('THE ', '')}</b>
              <i>{item.focus}</i>
            </button>
          )
        })}
      </nav>

      <section className="circuit__stage">
        <aside className="circuit__rule">
          <div className="circuit__rule-head">
            <span className="kicker">{meta.kicker}</span>
            <b>{meta.ruleTitle}</b>
          </div>
          <p>{meta.blurb}</p>
          <div className="circuit__rule-card">
            <span>SPECIAL RULE</span>
            <b>{meta.rule}</b>
            <i>{meta.ruleDetail}</i>
          </div>
          <div className="circuit__rule-meta">
            <span>
              LIVE SLOTS <b>{meta.slots}</b>
            </span>
            <span>
              FOCUS <b>{meta.focus}</b>
            </span>
            <span>
              RISK <b>{meta.difficulty}</b>
            </span>
          </div>
          <div className="circuit__objectives">
            <span>THE LIST</span>
            {listPreview.map((objective) => (
              <div key={objective.id} className="circuit__objective">
                <i>○</i>
                <div>
                  <b>{objective.title}</b>
                  <span>{objective.detail}</span>
                </div>
              </div>
            ))}
          </div>
        </aside>

        {tab === 'headliner' ? (
          <div className="circuit__gigboard">
            <div className="circuit__gigboard-head">
              <div>
                <span className="kicker">THE GIG BOARD · {ROMAN[0]} OF {ROMAN.length}</span>
                <h2>THREE OFFERS. <em>ONE NIGHT.</em></h2>
                <p>
                  Risk changes the room. The purse changes every time the board refreshes.
                  Safe money pays. All-in pays better. Buzz stays on the line.
                </p>
              </div>
              <button className="btn btn--ghost btn--sm" onClick={reroll}>
                ↻ REROLL BOARD
              </button>
            </div>
            <div className="circuit__gigs">
              {gigs.map((gig) => (
                <article
                  key={gig.id}
                  className={`gig-card gig-card--${gig.risk.toLowerCase()}`}
                  style={{ '--gig-accent': gig.risk === 'HIGH' ? '#ff6a53' : gig.risk === 'STEADY' ? '#f3c768' : '#8fffc4' } as CSSProperties}
                >
                  <header className="gig-card__head">
                    <span>{gig.riskLabel}</span>
                    <b>{gig.risk}</b>
                  </header>
                  <div className="gig-card__venue">
                    <span>{gig.venue.city}</span>
                    <h3>{gig.venue.name}</h3>
                    <i>{gig.venue.tagline}</i>
                  </div>
                  <p className="gig-card__note">{gig.riskNote}</p>
                  <div className="gig-card__stats">
                    <span>
                      <i>LIVE SLOTS</i>
                      <b>{gig.stageSlots}</b>
                    </span>
                    <span>
                      <i>DIFFICULTY</i>
                      <b>{gig.difficulty}</b>
                    </span>
                    <span>
                      <i>PURSE</i>
                      <b>{gig.purseCredits} RC</b>
                    </span>
                    <span>
                      <i>BUZZ</i>
                      <b>+{gig.purseBuzz}</b>
                    </span>
                  </div>
                  <div className="gig-card__objectives">
                    <span>THE LIST</span>
                    {gig.objectives.map((objective) => (
                      <p key={objective.id}>
                        <b>{objective.title}</b>
                        <i>{objective.detail}</i>
                      </p>
                    ))}
                  </div>
                  <div className="gig-card__reward">
                    <span>RANDOM REWARD</span>
                    <b>{gig.reward.name}</b>
                    <i>{gig.reward.detail}</i>
                  </div>
                  <button className="btn btn--primary gig-card__cta" onClick={() => chooseGig(gig)}>
                    TAKE THE GIG
                  </button>
                </article>
              ))}
            </div>
            <p className="circuit__fine">
              {gigs.length} of 100 possible reward outcomes on the board · offers refresh on entry and rematch
            </p>
          </div>
        ) : (
          <div className="circuit__run">
            <div className="circuit__run-head">
              <span className="kicker">{meta.kicker} · {preview?.difficulty}</span>
              <h2>TONIGHT’S ROOM</h2>
              <p>{meta.blurb}</p>
            </div>
            {preview && (
              <>
                <div className="circuit__venue-card">
                  <div className="circuit__venue-light" style={{ background: preview.venue.accent }} />
                  <span>{preview.venue.city} · {preview.difficulty}</span>
                  <h3>{preview.venue.name}</h3>
                  <i>{preview.venue.tagline}</i>
                  <div className="circuit__venue-meta">
                    <span>
                      <b>{preview.stageSlots}</b> LIVE SLOTS
                    </span>
                    <span>
                      <b>{preview.purseCredits}</b> RC PURSE
                    </span>
                    <span>
                      <b>+{preview.purseBuzz}</b> BUZZ
                    </span>
                  </div>
                </div>
                <div className="circuit__run-objectives">
                  <span>TONIGHT’S LIST</span>
                  {preview.objectives.map((objective) => (
                    <div key={objective.id}>
                      <b>{objective.title}</b>
                      <p>{objective.detail}</p>
                      <i>+{objective.rewardCredits} RC · +{objective.rewardBuzz} BUZZ</i>
                    </div>
                  ))}
                </div>
                <button className="btn btn--primary btn--xl" onClick={chooseCircuit}>
                  <span>ENTER {preview.venue.name}</span>
                  <i className="btn__play">▶</i>
                </button>
                <p className="circuit__fine">
                  Every run draws a fresh room and a fresh list · win to bank the purse and Buzz
                </p>
              </>
            )}
          </div>
        )}
      </section>

      <section className="circuit__venues">
        <div>
          <span className="kicker">THE ROAD MAP</span>
          <h2>EIGHT ROOMS. <em>NO TWO NIGHTS ALIKE.</em></h2>
        </div>
        <div className="circuit__venue-list">
          {VENUES.map((venue, index) => (
            <span key={venue.id}>
              <i>{String(index + 1).padStart(2, '0')}</i>
              <b>{venue.name}</b>
              <em>{venue.city} · {venue.stageSlots} SLOTS</em>
            </span>
          ))}
        </div>
      </section>
    </main>
  )
}
