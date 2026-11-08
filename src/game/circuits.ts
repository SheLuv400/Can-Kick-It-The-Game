import type { Difficulty, Settings } from './types'

export type CircuitId = 'music' | 'underground' | 'headliner'

export type ObjectiveKind =
  | 'play-cards'
  | 'crew-max'
  | 'moves'
  | 'feature'
  | 'crate'
  | 'combo'
  | 'encore'
  | 'ko'
  | 'era-3'
  | 'no-loss'

export interface BattleObjectiveSpec {
  id: string
  title: string
  detail: string
  kind: ObjectiveKind
  target: number
  rewardCredits: number
  rewardBuzz: number
}

export interface Venue {
  id: string
  name: string
  city: string
  tagline: string
  stageSlots: number
  accent: string
  circuits: CircuitId[]
}

export interface CircuitModifiers {
  /** Extra Hype at the start of each turn. */
  hypeRegen: number
  /** Extra Hype whenever a Feature Verse is called. */
  featureHype: number
  /** Crowd restored by an Encore transformation. */
  encoreCrowd: number
  /** Extra crowd damage applied by both sides. */
  crowdDamage: number
  /** Removes the Clapback defensive window entirely. */
  noCounters: boolean
}

export const DEFAULT_CIRCUIT_MODIFIERS: CircuitModifiers = {
  hypeRegen: 0,
  featureHype: 0,
  encoreCrowd: 0,
  crowdDamage: 0,
  noCounters: false,
}

export interface CircuitMeta {
  id: CircuitId
  name: string
  kicker: string
  blurb: string
  ruleTitle: string
  rule: string
  ruleDetail: string
  accent: string
  focus: string
  difficulty: Difficulty
  slots: string
  objectiveIds: string[]
}

export interface RewardVariant {
  id: string
  name: string
  detail: string
  credits: number
  buzz: number
}

export interface CircuitGig {
  id: string
  risk: 'LOW' | 'STEADY' | 'HIGH'
  riskLabel: string
  riskNote: string
  venue: Venue
  difficulty: Difficulty
  stageSlots: number
  objectives: BattleObjectiveSpec[]
  reward: RewardVariant
  modifiers: CircuitModifiers
  purseCredits: number
  purseBuzz: number
}

export interface CircuitRun {
  id: string
  circuit: CircuitId
  circuitName: string
  venue: Venue
  difficulty: Difficulty
  stageSlots: number
  objectives: BattleObjectiveSpec[]
  modifiers: CircuitModifiers
  purseCredits: number
  purseBuzz: number
  riskLabel?: string
  rewardName?: string
  gigId?: string
}

export interface ObjectiveSummary {
  completed: number
  total: number
  credits: number
  buzz: number
}

export const VENUES: Venue[] = [
  {
    id: 'midnight-garden',
    name: 'THE MIDNIGHT GARDEN',
    city: 'DOWNTOWN',
    tagline: 'NIGHT 01 · SOLD OUT',
    stageSlots: 5,
    accent: '#f2c14e',
    circuits: ['music', 'underground', 'headliner'],
  },
  {
    id: 'basement',
    name: 'THE BASEMENT',
    city: 'UNDER THE BLOCK',
    tagline: 'NO GUEST LIST · LOW CEILING',
    stageSlots: 3,
    accent: '#ff6a53',
    circuits: ['underground', 'headliner'],
  },
  {
    id: 'rooftop-radio',
    name: 'ROOFTOP RADIO',
    city: 'ABOVE THE CITY',
    tagline: 'CITY SIGNAL · OPEN AIR',
    stageSlots: 4,
    accent: '#8fffc4',
    circuits: ['music', 'headliner'],
  },
  {
    id: 'chrome-chapel',
    name: 'THE CHROME CHAPEL',
    city: 'EAST SIDE',
    tagline: 'CHOIR OF LIGHTS · ONE NIGHT',
    stageSlots: 4,
    accent: '#9bd4ff',
    circuits: ['music', 'headliner'],
  },
  {
    id: 'pier-26',
    name: 'PIER 26',
    city: 'HARBOR DISTRICT',
    tagline: 'WAREHOUSE SESSION · SOLD OUT',
    stageSlots: 5,
    accent: '#ff9b6b',
    circuits: ['underground', 'headliner'],
  },
  {
    id: 'velvet-ballroom',
    name: 'THE VELVET BALLROOM',
    city: 'UPTOWN',
    tagline: 'BLACK TIE · NO REQUESTS',
    stageSlots: 5,
    accent: '#e6a8ff',
    circuits: ['music', 'headliner'],
  },
  {
    id: 'neon-arcade',
    name: 'NEON ARCADE',
    city: 'OLD QUARTER',
    tagline: 'AFTER HOURS · TOKENS ONLY',
    stageSlots: 3,
    accent: '#ffe14d',
    circuits: ['underground', 'headliner'],
  },
  {
    id: 'crown-coliseum',
    name: 'CROWN COLISEUM',
    city: 'CENTER CITY',
    tagline: 'HEADLINE NIGHT · 12,000 DEEP',
    stageSlots: 5,
    accent: '#f3c768',
    circuits: ['music', 'underground', 'headliner'],
  },
]

export const MIDNIGHT_GARDEN = VENUES[0]

const objective = (
  id: string,
  title: string,
  detail: string,
  kind: ObjectiveKind,
  target: number,
  rewardCredits: number,
  rewardBuzz: number,
): BattleObjectiveSpec => ({ id, title, detail, kind, target, rewardCredits, rewardBuzz })

export const OBJECTIVE_LIBRARY: BattleObjectiveSpec[] = [
  objective('pack-stage', 'PACK THE STAGE', 'Play 4 artists into your live set.', 'play-cards', 4, 30, 8),
  objective('crew-law', 'CREW LAW', 'Get 3 artists from one crew on stage.', 'crew-max', 3, 45, 12),
  objective('feature-verse', 'FEATURE PRESENTATION', 'Call one Feature Verse.', 'feature', 1, 40, 15),
  objective('move-five', 'NO SKIPS', 'Use 5 equipped moves.', 'moves', 5, 35, 10),
  objective('crate-digger', 'CRATE DIGGER', 'Draw 2 cards from the Crate.', 'crate', 2, 35, 12),
  objective('combo-line', 'COMBO LINE', 'Land 3 damaging moves in one turn.', 'combo', 3, 55, 18),
  objective('encore-one', 'ONE MORE TIME', 'Trigger one Encore.', 'encore', 1, 45, 15),
  objective('body-the-beat', 'BODY THE BEAT', 'Defeat 2 rival artists.', 'ko', 2, 50, 16),
  objective('era-three', 'HEADLINE READY', 'Reach Era III.', 'era-3', 1, 40, 12),
  objective('no-loss', 'CLEAN SWEEP', 'Win without losing an artist.', 'no-loss', 1, 60, 25),
]

export const objectiveById = (id: string) =>
  OBJECTIVE_LIBRARY.find((item) => item.id === id) ?? OBJECTIVE_LIBRARY[0]

const MUSIC_OBJECTIVE_IDS = ['pack-stage', 'crew-law', 'feature-verse']
const UNDERGROUND_OBJECTIVE_IDS = ['combo-line', 'crate-digger', 'body-the-beat']

export const CIRCUITS: Record<CircuitId, CircuitMeta> = {
  music: {
    id: 'music',
    name: 'THE MUSIC CIRCUIT',
    kicker: 'CHART RUN',
    blurb: 'Build a wider stage, stack a crew and turn every Feature Verse into a moment.',
    ruleTitle: 'RADIO EDIT',
    rule: '+1 Hype every turn. Encores restore 1 Crowd.',
    ruleDetail: 'A longer set rewards casting a wide stage and keeping the room on your side.',
    accent: '#8fffc4',
    focus: 'STAGE BUILDING',
    difficulty: 'HEADLINER',
    slots: '4–5 LIVE SLOTS',
    objectiveIds: MUSIC_OBJECTIVE_IDS,
  },
  underground: {
    id: 'underground',
    name: 'THE UNDERGROUND CIRCUIT',
    kicker: 'NO GUEST LIST',
    blurb: 'Short sets, no safety net and a crowd that can smell hesitation.',
    ruleTitle: 'RAW FLOOR',
    rule: 'No Clapbacks. Both sides deal +1 crowd damage. Features give +1 Hype.',
    ruleDetail: 'Three-to-four live slots. Land a combo before the room turns on you.',
    accent: '#ff6a53',
    focus: 'PRESSURE & COMBOS',
    difficulty: 'LEGEND',
    slots: '3–4 LIVE SLOTS',
    objectiveIds: UNDERGROUND_OBJECTIVE_IDS,
  },
  headliner: {
    id: 'headliner',
    name: 'THE HEADLINER CIRCUIT',
    kicker: 'THE GIG BOARD',
    blurb: 'Pick the room, pick the risk and make the Buzz Rep follow you home.',
    ruleTitle: 'HEADLINE CLAUSE',
    rule: 'Every cleared objective pays bonus Buzz Rep.',
    ruleDetail: 'Three offers rotate every time you open the board. The purse is random. The risk is not.',
    accent: '#f3c768',
    focus: 'RISK · BUZZ · LEGACY',
    difficulty: 'HEADLINER',
    slots: '3–5 LIVE SLOTS',
    objectiveIds: ['feature-verse', 'encore-one', 'era-three', 'no-loss'],
  },
}

export const CIRCUIT_ORDER: CircuitId[] = ['music', 'underground', 'headliner']
export const CIRCUIT_META = CIRCUITS

const REWARD_HOUSES = [
  { label: 'MIDNIGHT ROYALTY', detail: 'A late cut of the door.', credits: 45, buzz: 8 },
  { label: 'CROWD SURGE', detail: 'The floor came ready to spend.', credits: 30, buzz: 14 },
  { label: 'VINYL PRESS', detail: 'A limited run moves fast.', credits: 60, buzz: 4 },
  { label: 'RADIO WAVE', detail: 'The city signal stays on you.', credits: 20, buzz: 18 },
  { label: 'CREW BONUS', detail: 'The whole bill ate tonight.', credits: 40, buzz: 10 },
  { label: 'ENCORE PURSE', detail: 'They would not let the lights up.', credits: 55, buzz: 6 },
  { label: 'MERCH TABLE', detail: 'The line wrapped the block.', credits: 35, buzz: 12 },
  { label: 'LABEL LOOK', detail: 'A scout stayed after the set.', credits: 25, buzz: 16 },
  { label: 'HOUSE CUT', detail: 'The venue wants you back.', credits: 50, buzz: 9 },
  { label: 'HEADLINE BONUS', detail: 'The marquee had your name on it.', credits: 70, buzz: 20 },
]

const REWARD_CROWDS = [
  { label: 'PACKED FLOOR', detail: 'Every corner was moving.', credits: 15, buzz: 5 },
  { label: 'SOLD OUT', detail: 'The sign went up before doors.', credits: 25, buzz: 7 },
  { label: 'WORD OF MOUTH', detail: 'The room brought the room.', credits: 10, buzz: 11 },
  { label: 'CROWD WAVE', detail: 'The balcony answered the floor.', credits: 20, buzz: 8 },
  { label: 'STAGE RUSH', detail: 'The front row would not let go.', credits: 12, buzz: 10 },
  { label: 'AFTERGLOW', detail: 'The night kept going after the set.', credits: 18, buzz: 9 },
  { label: 'LOCAL LEGEND', detail: 'The block claims you now.', credits: 8, buzz: 14 },
  { label: 'INDUSTRY NIGHT', detail: 'A&Rs in the back booth.', credits: 30, buzz: 6 },
  { label: 'CROWD CHOICE', detail: 'They chanted the encore.', credits: 16, buzz: 12 },
  { label: 'MIDNIGHT MIRACLE', detail: 'The room would not leave.', credits: 35, buzz: 15 },
]

/** 10 house bonuses × 10 crowd bonuses = 100 named reward outcomes. */
export const REWARD_VARIANTS: RewardVariant[] = REWARD_HOUSES.flatMap((house, houseIndex) =>
  REWARD_CROWDS.map((crowd, crowdIndex) => ({
    id: `reward-${houseIndex}-${crowdIndex}`,
    name: `${house.label} · ${crowd.label}`,
    detail: `${house.detail} ${crowd.detail}`,
    credits: house.credits + crowd.credits,
    buzz: house.buzz + crowd.buzz,
  })),
)

function shuffle<T>(items: T[]): T[] {
  const out = [...items]
  for (let i = out.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[out[i], out[j]] = [out[j], out[i]]
  }
  return out
}

function pick<T>(items: T[]): T {
  return items[Math.floor(Math.random() * items.length)]
}

export function pickVenue(circuit: CircuitId, exclude: string[] = []): Venue {
  const pool = VENUES.filter(
    (venue) => venue.circuits.includes(circuit) && !exclude.includes(venue.id),
  )
  return pick(pool.length > 0 ? pool : VENUES.filter((venue) => venue.circuits.includes(circuit)))
}

export function pickObjectiveSet(ids: string[]): BattleObjectiveSpec[] {
  return ids.map(objectiveById)
}

export function makeCircuitRun(circuit: Exclude<CircuitId, 'headliner'>, settings: Settings): CircuitRun {
  const meta = CIRCUITS[circuit]
  const venuePool = VENUES.filter(
    (item) => item.circuits.includes(circuit) && (circuit === 'music' || item.stageSlots <= 4),
  )
  const venue = pick(venuePool.length > 0 ? venuePool : VENUES.filter((item) => item.circuits.includes(circuit)))
  const difficulty: Difficulty =
    circuit === 'music'
      ? settings.team.circuitWins < 1
        ? 'OPENING'
        : settings.team.circuitWins < 3
          ? 'HEADLINER'
          : 'LEGEND'
      : settings.team.circuitWins < 2
        ? 'HEADLINER'
        : 'LEGEND'
  const objectives = pickObjectiveSet(meta.objectiveIds)
  return {
    id: `${circuit}-${venue.id}-${Date.now()}`,
    circuit,
    circuitName: meta.name,
    venue,
    difficulty,
    stageSlots: venue.stageSlots,
    objectives,
    modifiers: {
      ...DEFAULT_CIRCUIT_MODIFIERS,
      hypeRegen: 1,
      encoreCrowd: circuit === 'music' ? 1 : 0,
      featureHype: circuit === 'underground' ? 1 : 0,
      crowdDamage: circuit === 'underground' ? 1 : 0,
      noCounters: circuit === 'underground',
    },
    purseCredits: circuit === 'music' ? 240 : 320,
    purseBuzz: circuit === 'music' ? 60 : 85,
  }
}

const RISK_CONFIG = [
  {
    risk: 'LOW' as const,
    riskLabel: 'SAFE MONEY',
    riskNote: 'A short set and a clean payday. Less Buzz, less bite.',
    difficulty: 'OPENING' as Difficulty,
    stageSlots: 3,
    credits: 140,
    buzz: 35,
    objectives: 2,
  },
  {
    risk: 'STEADY' as const,
    riskLabel: 'HOUSE MONEY',
    riskNote: 'The room is full, the odds are fair and the Buzz is real.',
    difficulty: 'HEADLINER' as Difficulty,
    stageSlots: 4,
    credits: 240,
    buzz: 65,
    objectives: 2,
  },
  {
    risk: 'HIGH' as const,
    riskLabel: 'ALL IN',
    riskNote: 'Five slots, a Legend room and a purse that can change the season.',
    difficulty: 'LEGEND' as Difficulty,
    stageSlots: 5,
    credits: 420,
    buzz: 120,
    objectives: 3,
  },
]

export function makeGigOffers(settings: Settings): CircuitGig[] {
  const seasonOffset = settings.team.circuitWins % REWARD_VARIANTS.length
  const rotation = [
    ...REWARD_VARIANTS.slice(seasonOffset),
    ...REWARD_VARIANTS.slice(0, seasonOffset),
  ]
  const rewards = shuffle(rotation).slice(0, RISK_CONFIG.length)
  const objectivePool = shuffle(OBJECTIVE_LIBRARY)
  const usedVenues = new Set<string>()
  let objectiveCursor = 0

  return RISK_CONFIG.map((risk, index) => {
    const available = VENUES.filter(
      (venue) => venue.circuits.includes('headliner') && !usedVenues.has(venue.id),
    )
    const preferred = available.filter((venue) => {
      if (risk.risk === 'HIGH') return venue.stageSlots === 5
      if (risk.risk === 'LOW') return venue.stageSlots <= 4
      return venue.stageSlots >= 4
    })
    const venue = pick(preferred.length > 0 ? preferred : available)
    usedVenues.add(venue.id)
    const reward = rewards[index]
    const objectiveCount = risk.objectives
    const objectives = objectivePool
      .slice(objectiveCursor, objectiveCursor + objectiveCount)
    objectiveCursor += objectiveCount

    return {
      id: `gig-${risk.risk}-${venue.id}-${reward.id}`,
      risk: risk.risk,
      riskLabel: risk.riskLabel,
      riskNote: risk.riskNote,
      venue,
      difficulty: risk.difficulty,
      stageSlots: venue.stageSlots,
      objectives: objectives.length >= objectiveCount
        ? objectives
        : objectivePool.slice(0, objectiveCount),
      reward,
      modifiers: { ...DEFAULT_CIRCUIT_MODIFIERS },
      purseCredits: risk.credits + reward.credits,
      purseBuzz: risk.buzz + reward.buzz,
    }
  })
}

export function gigToRun(gig: CircuitGig): CircuitRun {
  return {
    id: gig.id,
    circuit: 'headliner',
    circuitName: CIRCUITS.headliner.name,
    venue: gig.venue,
    difficulty: gig.difficulty,
    stageSlots: gig.stageSlots,
    objectives: gig.objectives,
    modifiers: gig.modifiers,
    purseCredits: gig.purseCredits,
    purseBuzz: gig.purseBuzz,
    riskLabel: gig.riskLabel,
    rewardName: gig.reward.name,
    gigId: gig.id,
  }
}

export function objectiveSummary(
  objectives: Array<BattleObjectiveSpec & { done: boolean }>,
): ObjectiveSummary {
  return objectives.reduce(
    (summary, objective) => {
      summary.total += 1
      if (objective.done) {
        summary.completed += 1
        summary.credits += objective.rewardCredits
        summary.buzz += objective.rewardBuzz
      }
      return summary
    },
    { completed: 0, total: 0, credits: 0, buzz: 0 },
  )
}

export function venueSlots(venue: Venue): number {
  return Math.max(3, Math.min(5, venue.stageSlots))
}
