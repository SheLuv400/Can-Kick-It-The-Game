import type { Settings, TeamProgress } from '../game/types'
import type { CircuitId } from '../game/circuits'
import { getArtist } from '../game/roster'
import { Card } from '../components/Card'
import { Portrait } from '../components/Portrait'
import { chartEntry, type ChartState } from '../game/charts'
import { roleInfo, type LabelState } from '../game/label'
import {
  BUZZ_TIERS,
  MISSIONS,
  buzzState,
  canClaimMission,
  missionProgress,
} from '../game/ultimate'

interface UltimateTeamProps {
  settings: Settings
  label: LabelState
  avatarArtistId: string | null
  charts: ChartState
  onBack: () => void
  onDeck: () => void
  onCollection: () => void
  onCircuit: (circuit: CircuitId) => void
  onClaim: (missionId: string) => void
  onTeamChange: (patch: Partial<TeamProgress>) => void
  onLabel: () => void
  onCharts: () => void
}

const CRESTS: { id: TeamProgress['crest']; label: string; glyph: string }[] = [
  { id: 'crown', label: 'Crown', glyph: '♛' },
  { id: 'bolt', label: 'Bolt', glyph: 'ϟ' },
  { id: 'star', label: 'Star', glyph: '★' },
]

const CIRCUIT_STOPS = ['OPENING ACT', 'BLOCK PARTY', 'LOCAL LEGENDS', 'REGIONAL RISE', 'HEADLINER']
const number = (value: number) => value.toLocaleString('en-US')

export function UltimateTeam({
  settings,
  label,
  avatarArtistId,
  charts,
  onBack,
  onDeck,
  onCollection,
  onCircuit,
  onClaim,
  onTeamChange,
  onLabel,
  onCharts,
}: UltimateTeamProps) {
  const team = settings.team
  const role = roleInfo(label)
  const bestRank = label.signed.reduce<number | null>((best, entry) => {
    const rank = chartEntry(charts, entry.id)?.rank
    if (!rank) return best
    return best === null ? rank : Math.min(best, rank)
  }, null)
  const rank = buzzState(team.buzz)
  const crest = CRESTS.find((item) => item.id === team.crest) ?? CRESTS[0]
  const labelArtist = avatarArtistId ? getArtist(avatarArtistId) : null
  const cleared = MISSIONS.filter((mission) => missionProgress(mission, settings) >= mission.target)
  const claimable = MISSIONS.filter((mission) => canClaimMission(mission, settings))
  const circuitComplete = team.circuitWins >= CIRCUIT_STOPS.length
  const circuitLabel = circuitComplete
    ? 'CIRCUIT COMPLETE'
    : CIRCUIT_STOPS[Math.min(team.circuitWins, CIRCUIT_STOPS.length - 1)]
  const circuitButton =
    team.circuitWins === 0 ? 'START CIRCUIT' : circuitComplete ? 'REPLAY CIRCUIT' : 'CONTINUE CIRCUIT'

  const deck = settings.deck.map(getArtist)
  const billIds = [...settings.deck, 'macko-deville', 'juno-maison', 'cipher-jones']
    .filter((artistId, index, all) => all.indexOf(artistId) === index)
    .slice(0, 3)
  const bill = billIds.map(getArtist)
  const avgHype = deck.length ? deck.reduce((sum, artist) => sum + artist.cost, 0) / deck.length : 0
  const avgBars = deck.length ? deck.reduce((sum, artist) => sum + artist.bars, 0) / deck.length : 0
  const defensive = deck.filter((artist) =>
    artist.effects.some((effect) => effect.kind === 'heal' || effect.kind === 'shield'),
  ).length
  const crewCount = deck.reduce<Record<string, number>>((counts, artist) => {
    counts[artist.crew] = (counts[artist.crew] ?? 0) + 1
    return counts
  }, {})
  const topCrew = Object.entries(crewCount).sort((a, b) => b[1] - a[1])[0]
  const synergy = deck.length && topCrew ? Math.round(50 + (topCrew[1] / deck.length) * 50) : 0
  const attack = Math.min(99, Math.round((avgBars / 8) * 100))
  const defense = Math.min(99, Math.round(40 + (defensive / Math.max(1, deck.length)) * 60))
  const hypeCurve = Math.max(0, Math.min(99, Math.round(100 - avgHype * 14)))

  const scrollTo = (id: string) => {
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  return (
    <main className="team">
      <header className="team__topbar">
        <button className="team__brand" onClick={onBack} aria-label="Can I Kick It? The Game — back to the show">
          <span className="team__brand-mark">CIKI</span>
          <span className="team__brand-copy">
            <b>CAN I KICK IT?</b>
            <i>THE GAME</i>
          </span>
        </button>

        <nav className="team__nav" aria-label="Ultimate Team">
          <button onClick={onBack}>THE SHOW</button>
          <button className="is-active" aria-current="page">
            ULTIMATE TEAM
          </button>
          <button onClick={onLabel}>LABEL OFFICE</button>
          <button onClick={onCharts}>THE CHARTS</button>
          <button onClick={onDeck}>MIXTAPE STUDIO</button>
          <button onClick={onCollection}>MY COLLECTION</button>
          <button onClick={() => scrollTo('team-circuit')}>MUSIC CIRCUIT</button>
          <button onClick={() => scrollTo('team-auction')}>AUCTION HOUSE</button>
        </nav>

        <div className="team__wallet">
          <span className="team__credits">
            <i>◉</i>
            <b>{number(team.credits)}</b>
            <em>RC</em>
          </span>
          <span className="team__buzz-chip">
            <i>BR</i>
            <span>
              <b>BUZZ REP</b>
              <em>
                {rank.tier} {rank.rank}
              </em>
            </span>
          </span>
        </div>
      </header>

      <section className="team__hero">
        <div className="team__hero-glow" aria-hidden="true" />
        <div className="team__hero-grid" aria-hidden="true" />          <div className="team__hero-crown" aria-hidden="true">
            <svg viewBox="0 0 240 180" role="presentation">
              <path d="M24 54 72 91 120 24l48 67 48-37-23 97H47Z" />
              <path d="M53 158h134" />
              <circle cx="24" cy="54" r="6" />
              <circle cx="216" cy="54" r="6" />
              <circle cx="120" cy="24" r="6" />
            </svg>
          </div>
          <div className="team__hero-stage" aria-hidden="true">
            <div className="team__hero-beams">
              <i />
              <i />
              <i />
            </div>
            <div className="team__hero-cards">
              {bill.map((artist, index) => (
                <div className={`team__hero-card team__hero-card--${index}`} key={artist.id}>
                  <Card artist={artist} size="hero" />
                </div>
              ))}
              <span className="team__hero-floor" />
            </div>
          </div>
        <div className="team__hero-heading">
          <p className="team__eyebrow">
            <span />
            ULTIMATE TEAM
          </p>
          <h1>
            RECORD
            <br />
            LABEL <em>HQ</em>
          </h1>
          <p className="team__hero-tagline">BUILD · COLLECT · COMPETE · TRADE</p>
        </div>

        <div className="team__hero-strip">
          <section className="team__label-card">
            {labelArtist ? (
              <div className="team__label-avatar" title={`Label profile artist — ${labelArtist.name}`}>
                <Portrait artist={labelArtist} crop="avatar" />
                <span className={`team__label-avatar-crest team__crest--${crest.id}`} aria-hidden="true">
                  {crest.glyph}
                </span>
              </div>
            ) : (
              <div className={`team__crest team__crest--${crest.id}`} aria-hidden="true">
                {crest.glyph}
              </div>
            )}
            <div className="team__label-copy">
              <span className="team__label-kicker">YOUR LABEL</span>
              <label className="team__name-field">
                <span>LABEL NAME</span>
                <input
                  className="team__label-input"
                  value={team.labelName}
                  maxLength={24}
                  aria-label="Record label name"
                  onChange={(event) => onTeamChange({ labelName: event.target.value.slice(0, 24) })}
                  onBlur={(event) => {
                    if (!event.currentTarget.value.trim()) onTeamChange({ labelName: 'CIKI RECORDS' })
                  }}
                />
              </label>
              <p>
                {role.name} · SEASON 01 · BEST CHART {bestRank ? `#${bestRank}` : '—'}
              </p>
              <div className="team__crests" role="group" aria-label="Label emblem">
                {CRESTS.map((item) => (
                  <button
                    key={item.id}
                    className={item.id === team.crest ? 'is-active' : ''}
                    onClick={() => onTeamChange({ crest: item.id })}
                    aria-pressed={item.id === team.crest}
                    aria-label={`${item.label} emblem`}
                  >
                    <b aria-hidden="true">{item.glyph}</b>
                  </button>
                ))}
              </div>
            </div>
          </section>

          <section className="team__stats" aria-label="Label statistics">
            <div className="team__stat">
              <span>RECORD CREDITS</span>
              <b>{number(team.credits)}</b>
              <i>RC</i>
            </div>
            <div className="team__stat">
              <span>BUZZ REP</span>
              <b>
                {rank.tier} {rank.rank}
              </b>
              <i>RANK {rank.rankNumber}/40</i>
            </div>
            <div className="team__stat">
              <span>CIRCUIT WINS</span>
              <b>{String(team.circuitWins).padStart(2, '0')}</b>
              <i>RUNS</i>
            </div>
            <div className="team__stat">
              <span>LABEL ROSTER</span>
              <b>{label.signed.length}</b>
              <i>/ 6 SIGNED</i>
            </div>
          </section>
        </div>
      </section>

      <section className="team__shortcuts" aria-label="Ultimate Team shortcuts">
        <button className="team__shortcut team__shortcut--circuit" data-index="01" onClick={() => onCircuit('music')}>
          <span className="team__shortcut-icon" aria-hidden="true">
            ♛
          </span>
          <b>PLAY MUSIC CIRCUIT</b>
          <em>COMPETE · EARN · PROGRESS</em>
        </button>
        <button className="team__shortcut team__shortcut--mixtape" data-index="02" onClick={onDeck}>
          <span className="team__shortcut-icon" aria-hidden="true">
            ▤
          </span>
          <b>MIXTAPE STUDIO</b>
          <em>BUILD &amp; EDIT YOUR DECKS</em>
        </button>
        <button className="team__shortcut team__shortcut--collection" data-index="03" onClick={onCollection}>
          <span className="team__shortcut-icon" aria-hidden="true">
            ▥
          </span>
          <b>MY COLLECTION</b>
          <em>ARTISTS · ERAS · GROUPS</em>
        </button>
        <button className="team__shortcut team__shortcut--missions" data-index="04" onClick={() => scrollTo('team-missions')}>
          <span className="team__shortcut-icon" aria-hidden="true">
            ✓
          </span>
          <b>MISSIONS</b>
          <em>FOUNDING · CIRCUIT · LEGACY</em>
        </button>
        <button className="team__shortcut team__shortcut--label" data-index="05" onClick={onLabel}>
          <span className="team__shortcut-icon" aria-hidden="true">
            ♛
          </span>
          <b>LABEL OFFICE</b>
          <em>SIGN · BUDGET · RELEASE</em>
        </button>
        <button className="team__shortcut team__shortcut--charts" data-index="06" onClick={onCharts}>
          <span className="team__shortcut-icon" aria-hidden="true">
            ≡
          </span>
          <b>THE CHARTS</b>
          <em>SPINS · RANK · MOVEMENT</em>
        </button>
      </section>

      <div className="team__row team__row--main">
        <article className="team__panel team__circuit" id="team-circuit">
          <header className="team__panel-head">
            <div>
              <span>♛ FEATURED CIRCUIT</span>
              <h2>THE UNDERGROUND CIRCUIT</h2>
            </div>
            <em>5 STAGES</em>
          </header>

          <div className="team__circuit-body">
            <div className="team__circuit-art">
              <span className="team__circuit-tag">START FROM THE STREETS</span>
              <h3>
                THE
                <br />
                <em>UNDERGROUND</em>
              </h3>
              <p>Every room is a step closer to the headline. Win, earn BUZZ and build the label.</p>
              <div className="team__circuit-reward">
                <span>WIN REWARD</span>
                <b>250 RC · 90 BUZZ</b>
              </div>
              <button className="btn btn--primary team__circuit-play" onClick={() => onCircuit('underground')}>
                {circuitButton}
                <i>→</i>
              </button>
            </div>

            <div className="team__circuit-list" aria-label="Circuit stages">
              {CIRCUIT_STOPS.map((stop, index) => {
                const isCleared = index < team.circuitWins
                const isCurrent = !circuitComplete && index === team.circuitWins
                return (
                  <div
                    className={`team__circuit-stop ${isCleared ? 'is-cleared' : ''} ${
                      isCurrent ? 'is-current' : ''
                    }`}
                    key={stop}
                  >
                    <span className="team__circuit-marker">{isCleared ? '✓' : String(index + 1).padStart(2, '0')}</span>
                    <span className="team__circuit-name">
                      <b>{stop}</b>
                      <i>
                        {isCleared
                          ? 'CLEARED'
                          : isCurrent
                            ? `NEXT · ${circuitLabel}`
                            : 'LOCKED'}
                      </i>
                    </span>
                    <span className="team__circuit-stars" aria-hidden="true">
                      {Array.from({ length: 3 }).map((_, star) => (
                        <i className={isCleared ? 'is-on' : ''} key={star}>
                          ★
                        </i>
                      ))}
                    </span>
                  </div>
                )
              })}
            </div>
          </div>
        </article>

        <article className="team__panel team__missions" id="team-missions">
          <header className="team__panel-head">
            <div>
              <span>✓ FOUNDING MISSIONS</span>
              <h2>MAKE THE ROOM BELIEVE</h2>
            </div>
            <em>
              {claimable.length} READY · {cleared.length}/{MISSIONS.length}
            </em>
          </header>

          <div className="team__mission-list">
            {MISSIONS.map((mission, index) => {
              const progress = missionProgress(mission, settings)
              const done = progress >= mission.target
              const claimed = team.claimedMissions.includes(mission.id)
              return (
                <article
                  className={`mission ${done ? 'is-done' : ''} ${claimed ? 'is-claimed' : ''}`}
                  key={mission.id}
                >
                  <span className="mission__number">{String(index + 1).padStart(2, '0')}</span>
                  <div className="mission__copy">
                    <h3>{mission.title}</h3>
                    <p>{mission.blurb}</p>
                    <div className="mission__progress">
                      <div aria-hidden="true">
                        <span style={{ width: `${(progress / mission.target) * 100}%` }} />
                      </div>
                      <span>
                        {progress}/{mission.target}
                      </span>
                    </div>
                  </div>
                  <div className="mission__reward">
                    <span>+{mission.rewardCredits} RC</span>
                    <span>+{mission.rewardBuzz} BUZZ</span>
                  </div>
                  <button
                    className={`mission__claim ${done && !claimed ? 'is-ready' : ''}`}
                    disabled={!done || claimed}
                    onClick={() => onClaim(mission.id)}
                  >
                    {claimed ? 'CLAIMED' : done ? 'CLAIM' : `${progress}/${mission.target}`}
                  </button>
                </article>
              )
            })}
          </div>
        </article>
      </div>

      <div className="team__row team__row--bottom">
        <article className="team__panel team__deck-overview">
          <header className="team__panel-head">
            <div>
              <span>▤ DECK OVERVIEW</span>
              <h2>THE CURRENT MIXTAPE</h2>
            </div>
            <em>{settings.deck.length}/26 SLOTS</em>
          </header>
          <div className="team__deck-overview-body">
            <div className="team__deck-stack" aria-hidden="true">
              <span>♛</span>
              <b>26</b>
              <i>SLOTS</i>
            </div>
            <div className="team__deck-bars">
              {[
                ['ATK POWER', attack],
                ['DEFENSE', defense],
                ['SYNERGY', synergy],
                ['HYPE CURVE', hypeCurve],
              ].map(([label, value]) => (
                <div className="team__meter" key={label}>
                  <span>{label}</span>
                  <b>{value}</b>
                  <div aria-hidden="true">
                    <i style={{ width: `${value}%` }} />
                  </div>
                </div>
              ))}
            </div>
          </div>
          <button className="team__text-action" onClick={onDeck}>
            EDIT MIXTAPE <i>→</i>
          </button>
        </article>

        <article className="team__panel team__label-progress">
          <header className="team__panel-head">
            <div>
              <span>BR LABEL PROGRESS</span>
              <h2>FOUNDER&apos;S SEASON</h2>
            </div>
            <em>{rank.rankNumber}/40</em>
          </header>
          <div className="team__progress-main">
            <span className="team__progress-tier">{rank.tier}</span>
            <b>{rank.rank}</b>
            <i>{rank.identity}</i>
          </div>
          <div className="team__progress-bar" aria-hidden="true">
            <span style={{ width: `${rank.progress * 100}%` }} />
          </div>
          <div className="team__progress-meta">
            <span>{number(team.buzz)} BUZZ</span>
            <span>{rank.maxed ? 'MAX REPUTATION' : `NEXT · ${rank.nextAt} BUZZ`}</span>
          </div>
          <div className="team__tier-pips" aria-label="BUZZ REP tiers">
            {BUZZ_TIERS.map((tier, index) => (
              <i
                key={tier.name}
                className={index === rank.tierIndex ? 'is-current' : index < rank.tierIndex ? 'is-past' : ''}
                title={tier.name}
              />
            ))}
          </div>
        </article>

        <article className="team__panel team__events">
          <header className="team__panel-head">
            <div>
              <span>✦ EVENTS &amp; DROPS</span>
              <h2>THE FOUNDING SEASON</h2>
            </div>
            <em>LOCAL SEASON</em>
          </header>
          <div className="team__events-art" aria-hidden="true">
            <span className="team__events-vinyl" />
            <span className="team__events-crown">♛</span>
          </div>
          <p>
            The founding profile: 50 fictional artists, five crews and one label. No live events or
            drops are being faked in this local build.
          </p>
          <div className="team__events-meta">
            <span>50 ARTISTS</span>
            <span>5 CREWS</span>
            <span>1 LABEL</span>
          </div>
        </article>
      </div>

      <article className="team__auction" id="team-auction">
        <div>
          <span>⚖ AUCTION HOUSE</span>
          <b>ONLINE · LATER</b>
        </div>
        <p>
          Buying and selling cards needs server-owned inventory, secure trades and fraud checks.
          This local build keeps the door locked instead of faking a marketplace.
        </p>
        <div className="team__auction-foot">
          <span>TRADABLE CARDS</span>
          <span>RECORD CREDITS</span>
          <span>NO PLAYER CASH</span>
        </div>
      </article>

      <footer className="team__footer">
        <span>CAN I KICK IT? — ULTIMATE TEAM · LOCAL PROFILE · SEASON 01</span>
        <button className="link-btn" onClick={onBack}>
          BACK TO THE SHOW
        </button>
      </footer>
    </main>
  )
}
