import { ARTISTS } from '../src/game/roster'
import { DEFAULT_DECK, DEFAULT_SETTINGS, validDeck } from '../src/game/settings'
import {
  FESTIVAL_EVENTS,
  FESTIVAL_REWARDS,
  FESTIVAL_SEASON,
  claimFestivalReward,
  festivalById,
  festivalDeckLegal,
  festivalStatus,
  initialFestivalProgress,
  makeFestivalRun,
  rivalDeckFor,
  settleOnlineFestival,
  settleSoloFestival,
  setlistSynergy,
  type FestivalEvent,
  type FestivalProgress,
} from '../src/game/festivals'

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(`FAIL: ${message}`)
}

function liveNow(event: FestivalEvent): number {
  return Date.parse(event.start_time) + 60 * 60 * 1000
}

function legalDeckFor(event: FestivalEvent): string[] {
  const deck = [...DEFAULT_DECK]
  const requirements = setlistSynergy(deck, event).requirements
  for (const requirement of requirements) {
    let present = deck.filter((id) => {
      const artist = ARTISTS.find((item) => item.id === id)
      if (!artist) return false
      return requirement.kind === 'genre'
        ? artist.genre === requirement.value
        : requirement.kind === 'crew'
          ? artist.crew === requirement.value
          : artist.debut === requirement.value
    }).length
    for (const artist of ARTISTS) {
      if (present >= requirement.count) break
      const matches =
        requirement.kind === 'genre'
          ? artist.genre === requirement.value
          : requirement.kind === 'crew'
            ? artist.crew === requirement.value
            : artist.debut === requirement.value
      if (!matches) continue
      const copies = deck.filter((id) => id === artist.id).length
      if (copies >= 2) continue
      const replaceIndex = deck.findIndex((id) => {
        const current = ARTISTS.find((item) => item.id === id)
        if (!current) return false
        const stillNeeded = requirements.some((item) => {
          const count = deck.filter((deckId) => {
            const candidate = ARTISTS.find((entry) => entry.id === deckId)
            if (!candidate) return false
            return item.kind === 'genre'
              ? candidate.genre === item.value
              : item.kind === 'crew'
                ? candidate.crew === item.value
                : candidate.debut === item.value
          }).length
          return count <= item.count && candidateMatches(current, item)
        })
        return !stillNeeded
      })
      if (replaceIndex >= 0) deck[replaceIndex] = artist.id
      else deck.push(artist.id)
      present += 1
    }
  }
  while (deck.length < 26) {
    const next = ARTISTS.find((artist) => deck.filter((id) => id === artist.id).length === 0)
    if (!next) break
    deck.push(next.id)
  }
  return deck.slice(0, 26)
}

function candidateMatches(
  artist: (typeof ARTISTS)[number],
  requirement: ReturnType<typeof setlistSynergy>['requirements'][number],
) {
  return requirement.kind === 'genre'
    ? artist.genre === requirement.value
    : requirement.kind === 'crew'
      ? artist.crew === requirement.value
      : artist.debut === requirement.value
}

function withPoints(points: number): FestivalProgress {
  return { ...initialFestivalProgress(), points }
}

const uniqueEvents = new Set(FESTIVAL_EVENTS.map((event) => event.event_id))
assert(uniqueEvents.size === 6, 'six unique festival event IDs')
assert(FESTIVAL_EVENTS.filter((event) => event.event_type === 'single_player').length === 3, 'three solo festivals')
assert(FESTIVAL_EVENTS.filter((event) => event.event_type === 'private_online').length === 3, 'three online festivals')
assert(FESTIVAL_EVENTS.every((event) => event.stops.length === 5 || event.event_type === 'private_online'), 'solo events have five stops')
assert(FESTIVAL_EVENTS.every((event) => Date.parse(event.end_time) - Date.parse(event.start_time) === 72 * 60 * 60 * 1000), 'every event lasts 72 hours')
assert(FESTIVAL_REWARDS.map((reward) => reward.threshold).join(',') === '300,800,1600', 'Gold, Platinum and Diamond thresholds')
assert(validDeck(DEFAULT_DECK) && DEFAULT_DECK.length === 26, 'default deck remains exactly 26 cards')

for (const event of FESTIVAL_EVENTS) {
  const deck = legalDeckFor(event)
  assert(validDeck(deck), `${event.event_id}: legal 26-card test deck`)
  assert(festivalDeckLegal(deck, event), `${event.event_id}: requirements can be satisfied by the real roster`)
  assert(festivalStatus(event, liveNow(event)) === 'live', `${event.event_id}: live inside its window`)
  assert(festivalStatus(event, Date.parse(event.end_time) + 1) === 'ended', `${event.event_id}: ends after its window`)
  if (event.event_type === 'single_player') {
    for (const stop of event.stops) {
      const run = makeFestivalRun(event, stop, { ...DEFAULT_SETTINGS, deck }, liveNow(event), false)
      assert(run.rivalDeck.length === 26, `${event.event_id}/${stop.stop_id}: rival deck has 26 cards`)
      assert(validDeck(run.rivalDeck), `${event.event_id}/${stop.stop_id}: rival deck is legal`)
      assert(new Set(run.rivalDeck).size <= 26, `${event.event_id}/${stop.stop_id}: rival deck is real roster cards`)
      assert(run.rule.modifier === event.special_modifiers.id, `${event.event_id}/${stop.stop_id}: official rule attached`)
    }
    let progress = initialFestivalProgress()
    const now = liveNow(event)
    const first = settleSoloFestival({
      event,
      stop: event.stops[0],
      progress,
      won: true,
      plays: { 'krown-vandal': 2 },
      objectives: event.objectives.map((objective) => ({ ...objective, done: false })),
      synergyActive: true,
      official: true,
      now,
    })
    assert(first.summary.firstClear, `${event.event_id}: first stop is a first clear`)
    assert(first.summary.totalPoints >= event.circuit_rewards.stop, `${event.event_id}: first stop pays Circuit Points`)
    progress = first.progress
    const repeat = settleSoloFestival({
      event,
      stop: event.stops[0],
      progress,
      won: true,
      plays: { 'krown-vandal': 1 },
      objectives: event.objectives.map((objective) => ({ ...objective, done: false })),
      synergyActive: true,
      official: true,
      now,
    })
    assert(!repeat.summary.firstClear, `${event.event_id}: repeat is not a first clear`)
    assert(repeat.summary.circuitPoints === event.circuit_rewards.repeat, `${event.event_id}: repeat pays the reduced rate`)
    const headliner = settleSoloFestival({
      event,
      stop: event.stops[4],
      progress: repeat.progress,
      won: true,
      plays: { 'krown-vandal': 1 },
      objectives: event.objectives.map((objective) => ({ ...objective, done: false })),
      synergyActive: true,
      official: true,
      now,
    })
    assert(headliner.summary.circuitPoints === event.circuit_rewards.headliner, `${event.event_id}: headliner pays the headliner rate`)
  }
}

const progressAtGold = withPoints(300)
const firstClaim = claimFestivalReward(progressAtGold, 'gold')
assert(firstClaim, 'Gold reward can be claimed at 300 CP')
assert(!claimFestivalReward(firstClaim.progress, 'gold'), 'Gold reward cannot be claimed twice')
assert(claimFestivalReward(withPoints(800), 'platinum'), 'Platinum reward can be claimed at 800 CP')
assert(claimFestivalReward(withPoints(1600), 'diamond'), 'Diamond reward can be claimed at 1600 CP')

const onlineEvent = FESTIVAL_EVENTS.find((event) => event.event_type === 'private_online')!
const onlineNow = liveNow(onlineEvent)
const firstOnline = settleOnlineFestival({
  event: onlineEvent,
  progress: initialFestivalProgress(),
  won: true,
  draw: false,
  completed: true,
  opponentId: 'FRIEND-A',
  opponentStreak: 0,
  features: 1,
  plays: { 'krown-vandal': 2 },
  synergyActive: true,
  now: onlineNow,
})
assert(firstOnline.summary.outcome === 'online-win', 'online win settles')
assert(firstOnline.summary.totalPoints === 110, 'online win pays win + first feature points')
const rematch = settleOnlineFestival({
  event: onlineEvent,
  progress: firstOnline.progress,
  won: true,
  draw: false,
  completed: true,
  opponentId: 'FRIEND-A',
  opponentStreak: 0,
  features: 1,
  plays: { 'krown-vandal': 2 },
  synergyActive: true,
  now: onlineNow,
})
assert(rematch.summary.outcome === 'blocked', 'same-opponent daily rematch is blocked')
const bounty = settleOnlineFestival({
  event: onlineEvent,
  progress: firstOnline.progress,
  won: true,
  draw: false,
  completed: true,
  opponentId: 'FRIEND-B',
  opponentStreak: 5,
  features: 0,
  plays: { 'krown-vandal': 2 },
  synergyActive: false,
  now: onlineNow + 1000,
})
assert(bounty.summary.bountyPoints === 100, 'defeating a Streak Setter pays the bounty')
const loss = settleOnlineFestival({
  event: onlineEvent,
  progress: firstOnline.progress,
  won: false,
  draw: false,
  completed: true,
  opponentId: 'FRIEND-C',
  opponentStreak: 0,
  features: 0,
  plays: { 'krown-vandal': 1 },
  synergyActive: false,
  now: onlineNow + 2000,
})
assert(loss.summary.totalPoints === 40, 'completed online loss pays its configured points')
assert(!loss.progress.online.streakSetter, 'losing removes the temporary Streak Setter status')

const soloDeck = legalDeckFor(FESTIVAL_EVENTS[0])
assert(rivalDeckFor(FESTIVAL_EVENTS[0], FESTIVAL_EVENTS[0].stops[0]).length === 26, 'rival deck helper remains legal')
assert(Boolean(festivalById(FESTIVAL_SEASON.season_id) === null), 'season ID is not an event ID')
assert(soloDeck.length === 26, 'solo test deck remains 26 cards')

console.log(`PASS · ${FESTIVAL_EVENTS.length} festivals · ${FESTIVAL_EVENTS.filter((event) => event.event_type === 'single_player').reduce((sum, event) => sum + event.stops.length, 0)} solo stops · 26-card decks · 300/800/1600 reward track · idempotent claims · rematch cap · streak reset`)
