import type { Settings } from './types'

export type MissionMetric = 'wins' | 'circuit' | 'mixtape'

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
    id: 'the-26',
    title: 'The 26',
    blurb: 'Complete a legal 26-card Mixtape.',
    metric: 'mixtape',
    target: 26,
    rewardCredits: 150,
    rewardBuzz: 40,
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
