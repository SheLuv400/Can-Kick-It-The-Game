import type { Settings } from './types'

export type MissionMetric = 'wins' | 'circuit' | 'mixtape' | 'buzz'

export interface MissionDefinition {
  id: string
  title: string
  blurb: string
  metric: MissionMetric
  target: number
  rewardCredits: number
  rewardBuzz: number
}

export const MISSIONS: MissionDefinition[] = [
  {
    id: 'first-night',
    title: 'First Night',
    blurb: 'Win your first battle and put the label on the map.',
    metric: 'wins',
    target: 1,
    rewardCredits: 200,
    rewardBuzz: 60,
  },
  {
    id: 'three-night',
    title: 'Three-Night Run',
    blurb: 'Take three battles to make the room believe.',
    metric: 'wins',
    target: 3,
    rewardCredits: 350,
    rewardBuzz: 100,
  },
  {
    id: 'circuit-initiate',
    title: 'Circuit Initiate',
    blurb: 'Win a Music Circuit battle.',
    metric: 'circuit',
    target: 1,
    rewardCredits: 300,
    rewardBuzz: 90,
  },
  {
    id: 'sold-out-residency',
    title: 'Sold-Out Residency',
    blurb: 'Win three Music Circuit battles in a row.',
    metric: 'circuit',
    target: 3,
    rewardCredits: 650,
    rewardBuzz: 220,
  },
  {
    id: 'five-night',
    title: 'Five-Night Run',
    blurb: 'Win five battles and turn a hot week into a residency.',
    metric: 'wins',
    target: 5,
    rewardCredits: 450,
    rewardBuzz: 130,
  },
  {
    id: 'ten-night',
    title: 'Ten Night Stand',
    blurb: 'Win ten battles. The city starts saying your name.',
    metric: 'wins',
    target: 10,
    rewardCredits: 800,
    rewardBuzz: 240,
  },
  {
    id: 'twenty-night',
    title: 'Twenty-Night Run',
    blurb: 'Win twenty battles. The residency becomes a legacy.',
    metric: 'wins',
    target: 20,
    rewardCredits: 1600,
    rewardBuzz: 500,
  },
  {
    id: 'circuit-headliner',
    title: 'Circuit Headliner',
    blurb: 'Win five Music Circuit battles and headline the tour.',
    metric: 'circuit',
    target: 5,
    rewardCredits: 800,
    rewardBuzz: 260,
  },
  {
    id: 'circuit-legend',
    title: 'Tour Legend',
    blurb: 'Win ten Music Circuit battles. Every stop knows the set.',
    metric: 'circuit',
    target: 10,
    rewardCredits: 1400,
    rewardBuzz: 450,
  },
  {
    id: 'the-26',
    title: 'The 26',
    blurb: 'Complete a legal 26-card Mixtape.',
    metric: 'mixtape',
    target: 26,
    rewardCredits: 150,
    rewardBuzz: 40,
  },
  {
    id: 'buzz-builder',
    title: 'Buzz Builder',
    blurb: 'Earn 500 BUZZ and make the label a conversation.',
    metric: 'buzz',
    target: 500,
    rewardCredits: 400,
    rewardBuzz: 80,
  },
  {
    id: 'city-on-notice',
    title: 'City on Notice',
    blurb: 'Reach 1,500 BUZZ. The whole city is watching the next move.',
    metric: 'buzz',
    target: 1500,
    rewardCredits: 900,
    rewardBuzz: 300,
  },
  {
    id: 'marquee-name',
    title: 'Marquee Name',
    blurb: 'Reach 3,000 BUZZ and put your name above the bill.',
    metric: 'buzz',
    target: 3000,
    rewardCredits: 1600,
    rewardBuzz: 500,
  },
]

export const BUZZ_TIERS = [
  { name: 'OPEN MIC', identity: 'Newcomer' },
  { name: 'LOCAL TALENT', identity: 'Neighborhood recognition' },
  { name: 'RISING BUZZ', identity: 'Regional attention' },
  { name: 'BREAKOUT ARTIST', identity: 'Growing fanbase' },
  { name: 'CHART CLIMBER', identity: 'National recognition' },
  { name: 'HEADLINER', identity: 'Major performances' },
  { name: 'ICON STATUS', identity: 'Established legend' },
  { name: 'HALL OF FAME', identity: 'Ultimate reputation' },
] as const

export const BUZZ_RANKS = ['V', 'IV', 'III', 'II', 'I'] as const
export const BUZZ_STEP = 100
export const TOTAL_RANKS = BUZZ_TIERS.length * BUZZ_RANKS.length

export interface BuzzState {
  index: number
  rankNumber: number
  tierIndex: number
  tier: string
  identity: string
  rank: string
  nextAt: number
  progress: number
  maxed: boolean
}

export function buzzState(rawBuzz: number): BuzzState {
  const buzz = Number.isFinite(rawBuzz) ? Math.max(0, rawBuzz) : 0
  const index = Math.min(TOTAL_RANKS - 1, Math.floor(buzz / BUZZ_STEP))
  const tierIndex = Math.floor(index / BUZZ_RANKS.length)
  const tier = BUZZ_TIERS[tierIndex]
  const maxed = buzz >= TOTAL_RANKS * BUZZ_STEP
  return {
    index,
    rankNumber: index + 1,
    tierIndex,
    tier: tier.name,
    identity: tier.identity,
    rank: BUZZ_RANKS[index % BUZZ_RANKS.length],
    nextAt: (index + 1) * BUZZ_STEP,
    progress: maxed ? 1 : Math.min(1, Math.max(0, (buzz - index * BUZZ_STEP) / BUZZ_STEP)),
    maxed,
  }
}

export function missionProgress(mission: MissionDefinition, settings: Settings): number {
  const raw =
    mission.metric === 'wins'
      ? settings.wins
      : mission.metric === 'circuit'
        ? settings.team.circuitWins
        : mission.metric === 'buzz'
          ? settings.team.buzz
          : settings.deck.length
  return Math.min(mission.target, Math.max(0, raw))
}

export function canClaimMission(mission: MissionDefinition, settings: Settings): boolean {
  return (
    !settings.team.claimedMissions.includes(mission.id) &&
    missionProgress(mission, settings) >= mission.target
  )
}

export function labelInitials(label: string): string {
  const words = label.trim().split(/\s+/).filter(Boolean)
  if (words.length > 1) return `${words[0][0]}${words[1][0]}`.toUpperCase()
  return (words[0]?.slice(0, 2) || 'CI').toUpperCase()
}
