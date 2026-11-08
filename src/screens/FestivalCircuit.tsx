import { useEffect, useMemo, useState } from 'react'
import type { Settings } from '../game/types'
import {
  FESTIVAL_EVENTS,
  FESTIVAL_ONLINE,
  FESTIVAL_REWARDS,
  FESTIVAL_SEASON,
  festivalById,
  festivalClaimed,
  festivalCountdown,
  festivalDeckLegal,
  festivalDeckTagSummary,
  festivalPairings,
  festivalRank,
  festivalRankProgress,
  festivalRoute,
  festivalRouteLabel,
  festivalStatus,
  festivalStatusLabel,
  festivalStopClears,
  festivalWindow,
  festivalWeekendLabel,
  makeFestivalRun,
  nextStopFor,
  setlistSynergy,
  stopKey,
  type FestivalEvent,
  type FestivalProgress,
  type FestivalRewardSummary,
  type FestivalRewardTier,
  type FestivalRun,
  type FestivalStatus,
} from '../game/festivals'
import { validDeck } from '../game/settings'

interface FestivalCircuitProps {
  settings: Settings
  progress: FestivalProgress
  lastResult: FestivalRewardSummary | null
  onBack: () => void
  onDeck: () => void
  onStartSolo: (run: FestivalRun) => void
  onOpenOnline: (eventId: string, intent: 'host' | 'join') => void
  onClaimReward: (tier: FestivalRewardTier['tier']) => void
}

type FestivalTab = 'calendar' | 'tour' | 'rewards'

function useFestivalClock() {
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 1000)
    return () => window.clearInterval(timer)
  }, [])
  return now
}

function statusClass(status: FestivalStatus) {
  return status === 'live' ? 'is-live' : status === 'coming' ? 'is-coming' : 'is-ended'
}

function motifName(event: FestivalEvent) {
  return `festival-art--${event.event_poster.motif}`
}

function EventPoster({ event, now, compact = false }: { event: FestivalEvent; now: number; compact?: boolean }) {
  const status = festivalStatus(event, now)
  return (
    <div
      className={`festival-poster ${motifName(event)} ${compact ? 'is-compact' : ''}`}
      style={
        {
          '--poster-a': event.event_poster.palette[0],
          '--poster-b': event.event_poster.palette[1],
          '--poster-c': event.event_poster.palette[2],
          '--poster-ink': event.event_poster.palette[3],
          '--poster-accent': event.venue.accent,
        } as React.CSSProperties
      }
    >
      <span className="festival-poster__rings" aria-hidden="true" />
      <span className="festival-poster__grain" aria-hidden="true" />
      <div className="festival-poster__head">
        <b>CIKI LIVE</b>
        <em>{festivalWeekendLabel(event.weekend)}</em>
      </div>
      <div className="festival-poster__body">
        <span className="festival-poster__eyebrow">{event.event_poster.eyebrow}</span>
        <h3>{event.event_name}</h3>
        <p>{event.tagline}</p>
      </div>
      <div className="festival-poster__foot">
        <span>{event.venue.name} · {event.venue.city}</span>
        <b>{event.event_poster.stamp}</b>
      </div>
      <span className={`festival-poster__status ${statusClass(status)}`}>
        <i /> {festivalStatusLabel(status)}
      </span>
    </div>
  )
}

function VenueArt({ event }: { event: FestivalEvent }) {
  return (
    <div className={`festival-venue ${motifName(event)}`} aria-hidden="true">
      <span className="festival-venue__sky" />
      <span className="festival-venue__building">
        <i />
        <i />
        <i />
      </span>
      <span className="festival-venue__marquee">
        <b>{event.venue.name}</b>
        <em>{event.venue.room}</em>
      </span>
      <span className="festival-venue__crowd" />
      <span className="festival-venue__lights" />
    </div>
  )
}

function RequirementMeter({
  event,
  deck,
}: {
  event: FestivalEvent
  deck: string[]
}) {
  const synergy = setlistSynergy(deck, event)
  return (
    <div className={`festival-synergy ${synergy.activated ? 'is-on' : ''}`}>
      <div className="festival-synergy__head">
        <span>SETLIST SYNERGY</span>
        <b>
          {synergy.activated
            ? 'ACTIVATED!'
            : synergy.requirements.map((item) => `${item.current}/${item.count}`).join(' · ')}
        </b>
      </div>
      {synergy.requirements.map((requirement) => (
        <div className="festival-synergy__row" key={`${requirement.kind}-${requirement.value}`}>
          <span>{requirement.label}</span>
          <div>
            <i style={{ width: `${Math.min(100, (requirement.current / requirement.count) * 100)}%` }} />
          </div>
          <b>{requirement.current}/{requirement.count}</b>
        </div>
      ))}
      <p>
        {synergy.activated
          ? `${event.progression_multiplier}× PROGRESSION XP · ${event.card_mastery_multiplier}× CARD MASTERY XP · CIRCUIT POINTS UNCHANGED`
          : `REQUIRED: ${festivalDeckTagSummary(event)}. DECK SIZE STAYS AT 26.`}
      </p>
    </div>
  )
}

function RewardTrack({
  progress,
  onClaim,
}: {
  progress: FestivalProgress
  onClaim: (tier: FestivalRewardTier['tier']) => void
}) {
  const rank = festivalRank(progress.points)
  const meter = festivalRankProgress(progress.points)
  return (
    <section className="festival-rewards" aria-label="Circuit reward track">
      <header className="festival-section-head">
        <div>
          <span className="festival-kicker">THE SHARED CIRCUIT REWARD TRACK</span>
          <h2>GOLD · PLATINUM · DIAMOND</h2>
        </div>
        <div className="festival-points">
          <span>CIRCUIT POINTS</span>
          <b>{progress.points.toLocaleString()}</b>
          <em>{rank}</em>
        </div>
      </header>
      <div className="festival-rank-meter">
        <i style={{ width: `${meter.percent}%` }} />
        <span>{meter.floor}</span>
        <b>{meter.ceiling === 1600 && progress.points >= 1600 ? 'DIAMOND' : `${meter.ceiling}`}</b>
      </div>
      <div className="festival-reward-grid">
        {FESTIVAL_REWARDS.map((reward) => {
          const unlocked = progress.points >= reward.threshold
          const claimed = festivalClaimed(progress, reward.tier)
          return (
            <article
              className={`festival-reward festival-reward--${reward.tier} ${unlocked ? 'is-unlocked' : ''} ${claimed ? 'is-claimed' : ''}`}
              key={reward.tier}
            >
              <span className="festival-reward__tier">{reward.name}</span>
              <b className="festival-reward__threshold">{reward.threshold.toLocaleString()} CP</b>
              <ul>
                {reward.items.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
              <button
                className="btn btn--sm"
                disabled={!unlocked || claimed}
                onClick={() => onClaim(reward.tier)}
              >
                {claimed ? 'IN YOUR COLLECTION' : unlocked ? 'CLAIM REWARD' : `LOCKED · ${reward.threshold - progress.points} TO GO`}
              </button>
            </article>
          )
        })}
      </div>
      <div className="festival-online-note">
        <span>ONLINE FESTIVAL POINTS</span>
        <b>WIN +{FESTIVAL_ONLINE.win}</b>
        <b>COMPLETED LOSS +{FESTIVAL_ONLINE.loss}</b>
        <b>FIRST FEATURE +{FESTIVAL_ONLINE.feature}</b>
        <b>STREAK BOUNTY +{FESTIVAL_ONLINE.bounty}</b>
        <i>
          P2P ROOMS ARE HOST-AUTHORITATIVE. REWARDS ARE VALIDATED AGAINST THE FINISHED MATCH AND
          ONE RATED MATCH PER OPPONENT, PER DAY. NO PUBLIC MATCHMAKING.
        </i>
      </div>
    </section>
  )
}

function ResultRibbon({ result }: { result: FestivalRewardSummary }) {
  return (
    <section className={`festival-result-ribbon is-${result.outcome}`} role="status">
      <div>
        <span>{result.eventName}</span>
        <b>{result.stopName ?? 'ONLINE FESTIVAL FINAL'}</b>
        <em>{result.message ?? (result.official ? 'OFFICIAL SET · SETTLEMENT COMPLETE' : 'PREVIEW SET')}</em>
      </div>
      <dl>
        <div><dt>BASE XP</dt><dd>{result.baseXp}</dd></div>
        <div><dt>MULTIPLIER</dt><dd>{result.multiplier}×</dd></div>
        <div><dt>FINAL XP</dt><dd>{result.finalXp}</dd></div>
        <div><dt>CIRCUIT POINTS</dt><dd>+{result.totalPoints}</dd></div>
        <div><dt>TOTAL CP</dt><dd>{result.totalAfter}</dd></div>
      </dl>
    </section>
  )
}

export function FestivalCircuit({
  settings,
  progress,
  lastResult,
  onBack,
  onDeck,
  onStartSolo,
  onOpenOnline,
  onClaimReward,
}: FestivalCircuitProps) {
  const now = useFestivalClock()
  const live = FESTIVAL_EVENTS.find((event) => festivalStatus(event, now) === 'live')
  const [selectedId, setSelectedId] = useState(() => live?.event_id ?? FESTIVAL_EVENTS[0].event_id)
  const [tab, setTab] = useState<FestivalTab>('calendar')
  const [route, setRoute] = useState<'all' | 'solo' | 'online'>('all')
  const selected = festivalById(selectedId) ?? FESTIVAL_EVENTS[0]
  const selectedStatus = festivalStatus(selected, now)
  const synergy = setlistSynergy(settings.deck, selected)
  const legalDeck = validDeck(settings.deck)
  const deckEligible = festivalDeckLegal(settings.deck, selected)
  const pairings = useMemo(() => festivalPairings(), [])
  const rank = festivalRank(progress.points)
  const rankMeter = festivalRankProgress(progress.points)
  const nextStop = nextStopFor(selected, progress)
  const clearedStops = festivalStopClears(progress, selected)

  const chooseEvent = (event: FestivalEvent) => {
    setSelectedId(event.event_id)
    setTab('tour')
  }

  return (
    <main className="festival">
      <div className="festival__bg" aria-hidden="true">
        <span className="festival__sun" />
        <span className="festival__grain" />
        <span className="festival__streak festival__streak--one" />
        <span className="festival__streak festival__streak--two" />
      </div>

      <div className="festival__shell">
        <header className="festival__top">
          <button className="link-btn" onClick={onBack}>← MAIN MENU</button>
          <span className="festival__crumb">THE FESTIVAL &amp; TOUR CIRCUIT · 2026 SEASON</span>
          <div className="festival__top-actions">
            <button className="btn btn--ghost btn--sm" onClick={onDeck}>BUILD THE 26</button>
            <span className="festival__points-chip">
              <i /> {progress.points.toLocaleString()} CP
            </span>
          </div>
        </header>

        <section className="festival-hero">
          <div className="festival-hero__copy">
            <span className="festival-kicker">SIX STAGES · THREE WEEKENDS · ONE SHARED TRACK</span>
            <h1>
              THE FESTIVAL <em>&amp;</em><br />
              TOUR <span>CIRCUIT</span>
            </h1>
            <p>
              A living 2003 festival calendar. Run the solo road, bring a private room to the
              big stage, and carry one Circuit Point total through both routes.
            </p>
            <div className="festival-hero__actions">
              <button
                className="btn btn--primary btn--xl"
                onClick={() => {
                  if (live) {
                    setSelectedId(live.event_id)
                    setTab('tour')
                  } else {
                    setTab('calendar')
                  }
                }}
              >
                {live ? `LIVE: ${live.event_name}` : 'VIEW THE CALENDAR'}
              </button>
              <button
                className="btn btn--ghost btn--xl"
                onClick={() => {
                  setSelectedId(FESTIVAL_EVENTS.find((event) => event.event_type === 'single_player')?.event_id ?? FESTIVAL_EVENTS[0].event_id)
                  setTab('tour')
                }}
              >
                SINGLE-PLAYER TOUR
              </button>
              <button
                className="btn btn--ghost btn--xl"
                onClick={() => {
                  setSelectedId(FESTIVAL_EVENTS.find((event) => event.event_type === 'private_online')?.event_id ?? FESTIVAL_EVENTS[0].event_id)
                  setTab('tour')
                }}
              >
                ONLINE FESTIVAL ROOMS
              </button>
            </div>
            <div className="festival-hero__meta">
              <span><b>{progress.stops ? Object.values(progress.stops).filter((stop) => stop.clears > 0).length : 0}</b> TOUR STOPS CLEARED</span>
              <span><b>{progress.online.streak}</b> ONLINE STREAK</span>
              <span className={progress.online.streakSetter ? 'is-hot' : ''}>
                <b>{progress.online.streakSetter ? 'STREAK SETTER' : rank}</b> CURRENT STATUS
              </span>
            </div>
          </div>

          <div className="festival-hero__poster">
            <EventPoster event={live ?? selected} now={now} />
            <div className="festival-hero__stamp">
              <b>{FESTIVAL_SEASON.tagline}</b>
              <span>{progress.points.toLocaleString()} / 1,600 TO DIAMOND</span>
            </div>
          </div>
        </section>

        <section className="festival-hero-track" aria-label="Current Circuit track progress">
          <div className="festival-hero-track__copy">
            <span>THE SHARED CIRCUIT</span>
            <b>{rank}</b>
            <i>{progress.points.toLocaleString()} CP · {rankMeter.percent}% TO {rank === 'DIAMOND' ? 'LEGEND' : 'NEXT STATUS'}</i>
          </div>
          <div className="festival-hero-track__bar"><i style={{ width: `${rankMeter.percent}%` }} /></div>
          <div className="festival-hero-track__tiers">
            {FESTIVAL_REWARDS.map((reward) => (
              <span key={reward.tier} className={progress.points >= reward.threshold ? 'is-on' : ''}>
                {reward.tier.toUpperCase()} · {reward.threshold}
              </span>
            ))}
          </div>
        </section>

        <nav className="festival-tabs" role="tablist" aria-label="The Festival & Tour Circuit sections">
          <button className={tab === 'calendar' ? 'is-active' : ''} onClick={() => setTab('calendar')} role="tab" aria-selected={tab === 'calendar'}>
            <b>01</b> CALENDAR
          </button>
          <button className={tab === 'tour' ? 'is-active' : ''} onClick={() => setTab('tour')} role="tab" aria-selected={tab === 'tour'}>
            <b>02</b> TOUR &amp; FESTIVAL
          </button>
          <button className={tab === 'rewards' ? 'is-active' : ''} onClick={() => setTab('rewards')} role="tab" aria-selected={tab === 'rewards'}>
            <b>03</b> REWARD TRACK
          </button>
          <span className="festival-tabs__deck">
            {legalDeck ? `${settings.deck.length}/26 CARDS LEGAL` : 'DECK NOT LEGAL'} · {deckEligible ? 'SETLIST READY' : 'SYNERGY INCOMPLETE'}
          </span>
        </nav>

        {lastResult && <ResultRibbon result={lastResult} />}

        {tab === 'calendar' && (
          <section className="festival-calendar" aria-label="Festival calendar">
            <header className="festival-section-head">
              <div>
                <span className="festival-kicker">THE WEEKEND PAIRINGS · CONFIGURABLE 72-HOUR WINDOWS</span>
                <h2>THE 2026 FESTIVAL CALENDAR</h2>
              </div>
              <div className="festival-filters">
                {(['all', 'solo', 'online'] as const).map((option) => (
                  <button key={option} className={route === option ? 'is-on' : ''} onClick={() => setRoute(option)}>
                    {option === 'all' ? 'ALL EVENTS' : option === 'solo' ? 'SOLO TOUR' : 'ONLINE FESTIVAL'}
                  </button>
                ))}
              </div>
            </header>

            {pairings.map((events) => (
              <section className="festival-weekend" key={events[0]?.weekend ?? 0}>
                <header>
                  <b>{festivalWeekendLabel(events[0]?.weekend ?? 1)}</b>
                  <span>{festivalWindow(events[0])}</span>
                  <i>{events.some((event) => festivalStatus(event, now) === 'live') ? 'DOORS OPEN' : 'ON THE POSTER'}</i>
                </header>
                <div className="festival-weekend__grid">
                  {events
                    .filter((event) => route === 'all' || festivalRoute(event) === route)
                    .map((event) => {
                      const status = festivalStatus(event, now)
                      const eventSynergy = setlistSynergy(settings.deck, event)
                      const stop = nextStopFor(event, progress)
                      return (
                        <article
                          className={`festival-event-card ${selectedId === event.event_id ? 'is-selected' : ''} ${statusClass(status)}`}
                          key={event.event_id}
                        >
                          <EventPoster event={event} now={now} compact />
                          <div className="festival-event-card__body">
                            <div className="festival-event-card__route">
                              <span className={`is-${festivalRoute(event)}`}>{festivalRouteLabel(event)}</span>
                              <b>{festivalCountdown(event, now)}</b>
                            </div>
                            <h3>{event.event_name}</h3>
                            <p>{event.tagline}</p>
                            <div className="festival-event-card__tags">
                              <span>{festivalDeckTagSummary(event)}</span>
                              <span>{event.event_type === 'single_player' ? `${festivalStopClears(progress, event)}/5 STOPS` : `${progress.online.matches} RATED`}</span>
                            </div>
                            <div className="festival-event-card__actions">
                              <button className="btn btn--primary btn--sm" onClick={() => chooseEvent(event)}>
                                OPEN EVENT
                              </button>
                              {event.event_type === 'single_player' ? (
                                <button
                                  className="link-btn"
                                  disabled={!eventSynergy.activated || !validDeck(settings.deck) || !stop}
                                  onClick={() => {
                                    if (!stop) return
                                    onStartSolo(makeFestivalRun(event, stop, settings, now, status !== 'live'))
                                  }}
                                >
                                  {stop ? `NEXT: ${stop.stop_name}` : 'TOUR COMPLETE'}
                                </button>
                              ) : (
                                <span className="festival-event-card__online">
                                  {status === 'live' ? 'INVITE-ONLY ROOMS OPEN' : festivalStatusLabel(status)}
                                </span>
                              )}
                            </div>
                          </div>
                        </article>
                      )
                    })}
                </div>
              </section>
            ))}
          </section>
        )}

        {tab === 'tour' && (
          <section className="festival-detail" aria-label={`${selected.event_name} event detail`}>
            <header className="festival-detail__head">
              <div className="festival-detail__identity">
                <EventPoster event={selected} now={now} compact />
                <div>
                  <span className="festival-kicker">
                    {festivalRouteLabel(selected)} · {festivalWeekendLabel(selected.weekend)}
                  </span>
                  <h2>{selected.event_name}</h2>
                  <p>{selected.tagline}</p>
                  <div className={`festival-status ${statusClass(selectedStatus)}`}>
                    <i /> {festivalStatusLabel(selectedStatus)}
                    <span>{festivalCountdown(selected, now)}</span>
                  </div>
                  <div className="festival-detail__meta">
                    <span><b>VENUE</b>{selected.venue.name} · {selected.venue.room}</span>
                    <span><b>DATES</b>{festivalWindow(selected)}</span>
                    <span><b>MUSIC</b>{selected.music_theme}</span>
                    <span><b>REWARD MULTIPLIER</b>{selected.reward_multiplier}×</span>
                  </div>
                </div>
              </div>
              <VenueArt event={selected} />
            </header>

            <div className="festival-detail__grid">
              <div className="festival-detail__main">
                <section className="festival-rule-card">
                  <span className="festival-kicker">OFFICIAL EVENT RULE · {selected.special_modifiers.title}</span>
                  <h3>{selected.special_modifiers.rule}</h3>
                  <p>{selected.special_modifiers.detail}</p>
                  <div className="festival-rule-card__fine">
                    <span>STAGE SLOTS {selected.venue.stage_slots}</span>
                    <span>26-CARD SETLIST</span>
                    <span>5 CREWS · 3 ERAS</span>
                    <span>NO PUBLIC MATCHMAKING</span>
                  </div>
                </section>

                {selected.event_type === 'single_player' ? (
                  <section className="festival-tour">
                    <header className="festival-section-head">
                      <div>
                        <span className="festival-kicker">THE ROAD · FIVE STOPS · ONE HEADLINER</span>
                        <h3>TOUR ROUTE</h3>
                      </div>
                      <span className="festival-tour__count">{clearedStops}/5 CLEARED</span>
                    </header>
                    <div className="festival-route">
                      {selected.stops.map((stop, index) => {
                        const done = Boolean(progress.stops[stopKey(selected, stop)]?.clears)
                        const previous = index === 0 ? null : selected.stops[index - 1]
                        const unlocked = !previous || Boolean(progress.stops[stopKey(selected, previous)]?.clears)
                        const isNext = nextStop?.stop_id === stop.stop_id
                        return (
                          <article
                            className={`festival-stop ${done ? 'is-cleared' : ''} ${unlocked ? 'is-unlocked' : 'is-locked'} ${isNext ? 'is-next' : ''} ${stop.headliner ? 'is-headliner' : ''}`}
                            key={stop.stop_id}
                          >
                            <div className="festival-stop__rail">
                              <span>{String(index + 1).padStart(2, '0')}</span>
                              <i />
                            </div>
                            <div className="festival-stop__body">
                              <div className="festival-stop__top">
                                <span>{stop.venue_room}</span>
                                <b>{stop.difficulty}{stop.headliner ? ' · HEADLINER' : ''}</b>
                              </div>
                              <h4>{stop.stop_name}</h4>
                              <p>{stop.dialogue}</p>
                              <div className="festival-stop__meta">
                                <span>OPPONENT <b>{stop.opponent}</b></span>
                                <span>STRATEGY <b>{stop.strategy.label}</b></span>
                                <span>REWARD <b>{stop.headliner ? selected.circuit_rewards.headliner : selected.circuit_rewards.stop} CP</b></span>
                              </div>
                              <div className="festival-stop__objectives">
                                {stop.objectives.map((id) => {
                                  const objective = selected.objectives.find((item) => item.id === id)
                                  if (!objective) return null
                                  return <span key={id}>○ {objective.title}</span>
                                })}
                              </div>
                              <div className="festival-stop__actions">
                                <button
                                  className={`btn ${done ? 'btn--ghost' : 'btn--primary'} btn--sm`}
                                  disabled={!unlocked || !deckEligible}
                                  onClick={() => onStartSolo(makeFestivalRun(selected, stop, settings, now, selectedStatus !== 'live'))}
                                >
                                  {done ? 'REPLAY STOP · 20 CP' : unlocked ? (selectedStatus === 'live' ? 'PLAY STOP' : 'PLAY PREVIEW') : 'CLEAR PREVIOUS STOP'}
                                </button>
                                {!deckEligible && <span className="festival-stop__warn">SETLIST REQUIREMENTS NOT MET</span>}
                                {done && <span className="festival-stop__done">CLEARED</span>}
                              </div>
                            </div>
                          </article>
                        )
                      })}
                    </div>
                    <div className="festival-venue-break">
                      <VenueArt event={selected} />
                      <div>
                        <span className="festival-kicker">TOUR NOTE</span>
                        <b>THE FINAL STOP IS THE HEADLINER BATTLE.</b>
                        <p>
                          Clear a stop to unlock the next. Replays pay the reduced repeat rate.
                          The 26-card limit, Encore transformations and legal battle rules stay unchanged.
                        </p>
                      </div>
                    </div>
                  </section>
                ) : (
                  <section className="festival-online-room">
                    <header className="festival-section-head">
                      <div>
                        <span className="festival-kicker">PRIVATE ONLINE FESTIVAL · HOST OR JOIN</span>
                        <h3>THE COMPETITION ROOM</h3>
                      </div>
                      <span className={`festival-status ${statusClass(selectedStatus)}`}><i /> {festivalStatusLabel(selectedStatus)}</span>
                    </header>
                    <div className="festival-online-room__cards">
                      <article>
                        <span>HOST FESTIVAL ROOM</span>
                        <b>OPEN THE STAGE</b>
                        <p>Create the private room, share the five-character code or invite a friend. The host starts only when both 26-card decks pass the official setlist check.</p>
                        <button
                          className="btn btn--primary"
                          disabled={!deckEligible || selectedStatus !== 'live'}
                          onClick={() => onOpenOnline(selected.event_id, 'host')}
                        >
                          HOST FESTIVAL ROOM
                        </button>
                      </article>
                      <article>
                        <span>JOIN FESTIVAL ROOM</span>
                        <b>BRING YOUR SETLIST</b>
                        <p>Enter a friend's code, review the locked event rules, confirm your 26-card deck is legal, then wait for the host to launch the show.</p>
                        <button
                          className="btn btn--ghost"
                          disabled={!deckEligible || selectedStatus !== 'live'}
                          onClick={() => onOpenOnline(selected.event_id, 'join')}
                        >
                          JOIN FESTIVAL ROOM
                        </button>
                      </article>
                    </div>
                    <div className="festival-online-room__rules">
                      <span><b>LOCKED RULE:</b> {selected.special_modifiers.title}</span>
                      <span><b>DECK CHECK:</b> BOTH PLAYERS · 26 CARDS · {festivalDeckTagSummary(selected)}</span>
                      <span><b>BOTH SIDES:</b> IDENTICAL EVENT MODIFIER · HOST-AUTHORITATIVE P2P</span>
                      <span><b>REWARDS:</b> {FESTIVAL_ONLINE.win} CP WIN · {FESTIVAL_ONLINE.loss} CP COMPLETED LOSS · FIRST FEATURE +{FESTIVAL_ONLINE.feature}</span>
                    </div>
                    <div className="festival-honors">
                      <span className="festival-kicker">FESTIVAL HONORS</span>
                      {selected.honors.map((honor) => (
                        <b key={honor}>{honor}</b>
                      ))}
                    </div>
                    {selectedStatus !== 'live' && (
                      <p className="festival-event-card__online">
                        OFFICIAL ONLINE POINTS OPEN {selectedStatus === 'coming' ? 'WHEN THE EVENT GOES LIVE' : 'DURING THE LIVE WINDOW ONLY'}.
                      </p>
                    )}
                  </section>
                )}
              </div>

              <aside className="festival-detail__side">
                <RequirementMeter event={selected} deck={settings.deck} />
                <section className="festival-side-card">
                  <span className="festival-kicker">EVENT REWARDS</span>
                  <h4>{selected.event_type === 'single_player' ? 'TOUR STOP PAYOUTS' : 'ONLINE CIRCUIT PAYOUTS'}</h4>
                  <ul>
                    {selected.event_type === 'single_player' ? (
                      <>
                        <li><span>FIRST TOUR STOP</span><b>{selected.circuit_rewards.stop} CP</b></li>
                        <li><span>REPEAT STOP</span><b>{selected.circuit_rewards.repeat} CP</b></li>
                        <li><span>HEADLINER VICTORY</span><b>{selected.circuit_rewards.headliner} CP</b></li>
                        <li><span>OBJECTIVE BONUS</span><b>+{selected.circuit_rewards.objective} CP</b></li>
                      </>
                    ) : (
                      <>
                        <li><span>VERIFIED WIN</span><b>{FESTIVAL_ONLINE.win} CP</b></li>
                        <li><span>COMPLETED LOSS</span><b>{FESTIVAL_ONLINE.loss} CP</b></li>
                        <li><span>FIRST FEATURE VERSE</span><b>+{FESTIVAL_ONLINE.feature} CP</b></li>
                        <li><span>WIN STREAK BONUS</span><b>+{FESTIVAL_ONLINE.streak_bonus} CP / WIN</b></li>
                      </>
                    )}
                  </ul>
                  <div className="festival-side-card__stamp">
                    <b>{selected.reward_multiplier}×</b>
                    <span>EVENT REWARD MULTIPLIER</span>
                  </div>
                </section>
                <section className="festival-side-card">
                  <span className="festival-kicker">HOST / JOIN STATUS</span>
                  <h4>{selectedStatus === 'live' ? 'THE ROOM IS OPEN' : 'THE ROOM IS WAITING'}</h4>
                  <p>
                    Festival rooms use the existing invite-only room code system. No public
                    matchmaking. When both decks qualify, the official modifier is locked into
                    the host's battle state and mirrored to both players.
                  </p>
                  <div className="festival-side-card__actions">
                    <button className="btn btn--ghost btn--sm" onClick={onDeck}>BUILD LEGAL MIXTAPE</button>
                  </div>
                </section>
                <section className="festival-side-card">
                  <span className="festival-kicker">SETLIST ELIGIBILITY</span>
                  <div className={`festival-deck-readout ${deckEligible ? 'is-on' : ''}`}>
                    <b>{deckEligible ? 'LEGAL · SYNERGY READY' : 'NOT ELIGIBLE YET'}</b>
                    <span>{settings.deck.length}/26 CARDS · MAX 2 COPIES</span>
                    <span>{synergy.metCount}/{synergy.requiredCount} REQUIREMENTS MET</span>
                  </div>
                </section>
              </aside>
            </div>
          </section>
        )}

        {tab === 'rewards' && <RewardTrack progress={progress} onClaim={onClaimReward} />}
      </div>
    </main>
  )
}
