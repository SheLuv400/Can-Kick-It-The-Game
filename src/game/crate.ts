import type { Element } from './types'

export type CrateCategory =
  | 'spotlight'
  | 'power'
  | 'shield'
  | 'skip'
  | 'rewind'
  | 'untouchable'
  | 'callback'
  | 'elemental'

export type CrateRarity = 'COMMON' | 'UNCOMMON' | 'RARE' | 'EPIC' | 'LEGENDARY'

export interface CrateDefinition {
  id: string
  name: string
  category: CrateCategory
  rarity: CrateRarity
  description: string
  target: 'none' | 'enemy' | 'ally' | 'backstage' | 'artist'
  element?: Element
  power?: number
  shield?: number
  heal?: number
  turns?: number
}

export const CRATE_HAND_LIMIT = 6
export const CRATE_DRAW_COST = 'YOUR TURN'

/** Balance these without touching the draw logic. */
export const CRATE_WEIGHTS: Record<CrateRarity, number> = {
  COMMON: 46,
  UNCOMMON: 27,
  RARE: 16,
  EPIC: 8,
  LEGENDARY: 3,
}

export const RARITY_META: Record<CrateRarity, { label: string; color: string }> = {
  COMMON: { label: 'COMMON', color: '#b9b3a5' },
  UNCOMMON: { label: 'UNCOMMON', color: '#6fe3a8' },
  RARE: { label: 'RARE', color: '#67b7ff' },
  EPIC: { label: 'EPIC', color: '#c89bff' },
  LEGENDARY: { label: 'LEGENDARY', color: '#ffd166' },
}

export const CATEGORY_LABEL: Record<CrateCategory, string> = {
  spotlight: 'ARTIST SPOTLIGHT',
  power: 'POWER-UP',
  shield: 'SHIELD',
  skip: 'SKIP THE SET',
  rewind: 'TURNTABLE REWIND',
  untouchable: 'UNTOUCHABLE HEADLINER',
  callback: 'CALL BACK ON STAGE',
  elemental: 'ELEMENTAL POWER',
}

export const CRATE_CARDS: CrateDefinition[] = [
  {
    id: 'spotlight',
    name: 'ARTIST SPOTLIGHT',
    category: 'spotlight',
    rarity: 'RARE',
    description: 'Draw one eligible artist from your legal Mixtape into your hand.',
    target: 'artist',
  },
  {
    id: 'power-2',
    name: 'HOUSE MIC',
    category: 'power',
    rarity: 'COMMON',
    description: 'The next attack from one of your artists deals +2 damage.',
    target: 'ally',
    power: 2,
  },
  {
    id: 'power-4',
    name: 'MASTER BUS',
    category: 'power',
    rarity: 'UNCOMMON',
    description: 'The next attack from one of your artists deals +4 damage.',
    target: 'ally',
    power: 4,
  },
  {
    id: 'shield-3',
    name: 'SOUNDCHECK',
    category: 'shield',
    rarity: 'COMMON',
    description: 'Give one of your artists 3 temporary Shield HP.',
    target: 'ally',
    shield: 3,
  },
  {
    id: 'shield-6',
    name: 'ROAD CASE',
    category: 'shield',
    rarity: 'UNCOMMON',
    description: 'Give one of your artists 6 temporary Shield HP.',
    target: 'ally',
    shield: 6,
  },
  {
    id: 'hype-3',
    name: 'HOUSE LIGHTS',
    category: 'power',
    rarity: 'UNCOMMON',
    description: 'Gain 3 Hype immediately.',
    target: 'none',
  },
  {
    id: 'skip-set',
    name: 'SKIP THE SET',
    category: 'skip',
    rarity: 'RARE',
    description: 'The opponent loses their next standard performance action. They keep their turn resources.',
    target: 'none',
  },
  {
    id: 'rewind',
    name: 'TURNTABLE REWIND',
    category: 'rewind',
    rarity: 'EPIC',
    description: 'Hold this card. In a defensive window, redirect one single-target attack back at the attacker. No reflection chains.',
    target: 'none',
  },
  {
    id: 'untouchable',
    name: 'UNTOUCHABLE HEADLINER',
    category: 'untouchable',
    rarity: 'LEGENDARY',
    description: 'One artist cannot take direct damage until the end of the opponent’s next turn.',
    target: 'ally',
    turns: 1,
  },
  {
    id: 'callback',
    name: 'CALL BACK ON STAGE',
    category: 'callback',
    rarity: 'LEGENDARY',
    description: '“The crowd wants one more song!” Pay 4 Hype to return one defeated artist to an empty stage slot at full HP. Once per match.',
    target: 'backstage',
  },
  {
    id: 'element-fire',
    name: 'SHARP BARS',
    category: 'elemental',
    rarity: 'COMMON',
    description: 'Deal 3 damage and apply Burn for 2 turns.',
    target: 'enemy',
    element: 'FIRE',
    power: 3,
    turns: 2,
  },
  {
    id: 'element-poison',
    name: 'POISON HOOK',
    category: 'elemental',
    rarity: 'UNCOMMON',
    description: 'Deal 2 damage and apply Poison for 3 turns.',
    target: 'enemy',
    element: 'POISON',
    power: 2,
    turns: 3,
  },
  {
    id: 'element-ice',
    name: 'COLD NOTE',
    category: 'elemental',
    rarity: 'COMMON',
    description: 'Deal 2 damage and reduce the target’s next attack by 2.',
    target: 'enemy',
    element: 'ICE',
    power: 2,
  },
  {
    id: 'element-electricity',
    name: 'VOLTAGE VERSE',
    category: 'elemental',
    rarity: 'RARE',
    description: 'Deal 4 damage, drain 2 of the opponent’s Hype, and weaken their next attack.',
    target: 'enemy',
    element: 'ELECTRICITY',
    power: 4,
  },
  {
    id: 'element-wind',
    name: 'WHIRLWIND FLOW',
    category: 'elemental',
    rarity: 'UNCOMMON',
    description: 'Deal 2 damage to two enemy artists and add 1 crowd pressure.',
    target: 'enemy',
    element: 'WIND',
    power: 2,
  },
  {
    id: 'element-earth',
    name: 'GROUND SHAKE',
    category: 'elemental',
    rarity: 'COMMON',
    description: 'Deal 2 damage and give the performer 3 Shield HP and +1 Defense.',
    target: 'enemy',
    element: 'EARTH',
    power: 2,
  },
  {
    id: 'element-water',
    name: 'TIDAL FLOW',
    category: 'elemental',
    rarity: 'UNCOMMON',
    description: 'Deal 2 damage and restore 3 HP to the performer.',
    target: 'enemy',
    element: 'WATER',
    power: 2,
  },
  {
    id: 'element-light',
    name: 'HALO VERSE',
    category: 'elemental',
    rarity: 'RARE',
    description: 'Deal 3 damage and give the performer 2 Shield HP.',
    target: 'enemy',
    element: 'LIGHT',
    power: 3,
  },
]

export const CRATE_BY_ID: Record<string, CrateDefinition> = Object.fromEntries(
  CRATE_CARDS.map((card) => [card.id, card]),
)

export function crateCard(id: string): CrateDefinition {
  return CRATE_BY_ID[id] ?? CRATE_CARDS[0]
}

function shuffle<T>(items: T[]): T[] {
  const out = [...items]
  for (let i = out.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[out[i], out[j]] = [out[j], out[i]]
  }
  return out
}

export function createCrateDeck(): string[] {
  return shuffle(CRATE_CARDS.map((card) => card.id))
}

/** Weighted selection without replacement. The returned deck has the card removed. */
export function drawWeightedCrate(
  crate: string[],
  rng: () => number = Math.random,
): { cardId: string | null; crate: string[] } {
  if (crate.length === 0) return { cardId: null, crate }
  const weights = crate.map((id) => CRATE_WEIGHTS[crateCard(id).rarity])
  const total = weights.reduce((sum, value) => sum + value, 0)
  let roll = rng() * total
  let chosen = crate[crate.length - 1]
  for (let index = 0; index < crate.length; index += 1) {
    roll -= weights[index]
    if (roll <= 0) {
      chosen = crate[index]
      break
    }
  }
  return {
    cardId: chosen,
    crate: crate.filter((_, index) => crate[index] !== chosen),
  }
}
